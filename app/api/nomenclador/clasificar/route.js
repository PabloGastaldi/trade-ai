import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

// Busca candidatos reales en la DB usando palabras clave
async function buscarCandidatosDB(supabase, producto, material, uso) {
  const terminos = [producto, material, uso]
    .filter(Boolean)
    .flatMap(t => t.toLowerCase().split(/[\s,\/]+/))
    .filter(t => t.length >= 3)
    .slice(0, 4) // máximo 4 términos para no sobrecargar

  if (terminos.length === 0) return []

  // Buscar con cada término y unir resultados únicos
  const sets = await Promise.all(
    terminos.map(t =>
      supabase
        .from('ncm')
        .select('codigo_ncm, descripcion, capitulo, seccion')
        .ilike('descripcion', `%${t}%`)
        .limit(15)
    )
  )

  const vistos = new Set()
  const candidatos = []
  for (const { data } of sets) {
    for (const row of data ?? []) {
      if (!vistos.has(row.codigo_ncm)) {
        vistos.add(row.codigo_ncm)
        candidatos.push(row)
      }
    }
  }

  return candidatos.slice(0, 40)
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { producto, material, uso, estado, presentacion, detalles } = body

    if (!producto?.trim()) {
      return NextResponse.json({ error: 'El campo "producto" es obligatorio.' }, { status: 400 })
    }
    if (!estado?.trim()) {
      return NextResponse.json({ error: 'El campo "estado" es obligatorio.' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // PASO 1: buscar candidatos reales en la DB
    const candidatosDB = await buscarCandidatosDB(supabase, producto, material, uso)

    if (candidatosDB.length === 0) {
      return NextResponse.json({
        candidatos: [],
        nota: 'No se encontraron posiciones NCM en la base de datos para los términos ingresados. Intentá con palabras más específicas o en español.',
      })
    }

    // PASO 2: pasar los candidatos reales a la IA para que elija
    const listaParaIA = candidatosDB
      .map(r => `${r.codigo_ncm} | ${r.descripcion}`)
      .join('\n')

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const systemPrompt = `Sos un clasificador arancelario experto en NCM (Nomenclatura Común del Mercosur) argentino.

Se te proporciona una lista de posiciones NCM reales extraídas de la base de datos oficial. Tu única tarea es elegir las 1 a 3 más adecuadas para el producto descripto, en orden de relevancia.

REGLAS ESTRICTAS:
- Solo podés elegir códigos de la lista provista. NUNCA inventes ni modifiques un código.
- Respondé SOLO con JSON válido, sin texto adicional.
- Si ninguna posición de la lista es adecuada, devolvés candidatos vacío con una nota explicando qué información falta.

Formato:
{
  "candidatos": [
    {
      "codigo_ncm": "04090000000",
      "confianza": "alta",
      "razonamiento": "1-2 oraciones explicando por qué esta posición es la correcta para el producto."
    }
  ],
  "nota": "opcional — aclaración o pedido de más información"
}`

    const userPrompt = `Producto a clasificar:
- Nombre: ${producto}
- Material/materia prima: ${material || 'No especificado'}
- Uso/destino: ${uso || 'No especificado'}
- Estado/procesamiento: ${estado}
- Presentación: ${presentacion || 'No especificada'}
- Detalles: ${detalles || 'Ninguno'}

Posiciones NCM disponibles en la base de datos (codigo_ncm | descripcion):
${listaParaIA}

Elegí las más adecuadas de esta lista.`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0]?.text ?? ''
    let parsed = { candidatos: [], nota: null }
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {
      return NextResponse.json({ error: 'Error al parsear respuesta de IA' }, { status: 500 })
    }

    const candidatosRaw = parsed.candidatos ?? []
    if (candidatosRaw.length === 0) {
      return NextResponse.json({ candidatos: [], nota: parsed.nota })
    }

    // PASO 3: enriquecer con aranceles — solo códigos que existen en candidatosDB
    const codigosValidos = new Set(candidatosDB.map(r => r.codigo_ncm))
    const candidatos = []

    for (const candidato of candidatosRaw) {
      const codigo = candidato.codigo_ncm?.replace(/\D/g, '').padEnd(11, '0').slice(0, 11) ?? ''
      if (!codigosValidos.has(codigo)) continue // ignorar si la IA inventó algo

      const ncmReal = candidatosDB.find(r => r.codigo_ncm === codigo)

      const [impo, expo] = await Promise.all([
        supabase.from('aranceles_importacion').select('die, te, iva').eq('codigo_ncm', codigo).single(),
        supabase.from('aranceles_exportacion').select('derecho_exportacion, reintegro').eq('codigo_ncm', codigo).single(),
      ])

      candidatos.push({
        codigo_ncm: codigo,
        confianza: candidato.confianza ?? 'media',
        razonamiento: candidato.razonamiento ?? '',
        ncm_exacto: ncmReal ?? null,
        similares: null,
        aranceles_impo: impo.data ?? null,
        aranceles_expo: expo.data ?? null,
      })
    }

    return NextResponse.json({ candidatos, nota: parsed.nota })
  } catch (err) {
    console.error('[nomenclador/clasificar] Error:', err)
    return NextResponse.json({ error: 'Error al clasificar el producto' }, { status: 500 })
  }
}
