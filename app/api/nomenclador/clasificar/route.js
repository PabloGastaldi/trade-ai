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

// Fallback: búsqueda textual en la DB cuando la fase 1 no produce resultados
async function buscarCandidatosDB(supabase, producto, material, uso) {
  const fraseProducto = producto?.toLowerCase().trim()
  const palabrasSueltas = [producto, material, uso]
    .filter(Boolean)
    .flatMap(t => t.toLowerCase().split(/[\s,\/]+/))
    .filter(t => t.length >= 4)

  const terminos = [...new Set([fraseProducto, ...palabrasSueltas].filter(Boolean))].slice(0, 5)
  if (terminos.length === 0) return []

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
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // ── FASE 1: Haiku genera palabras clave de búsqueda (NO códigos NCM) ──────
    const systemFase1 = `Sos un experto en comercio exterior argentino. Tu tarea es generar términos de búsqueda para encontrar posiciones arancelarias NCM en una base de datos.

Dado un producto, devolvé SOLO JSON válido con:
- "palabras_clave": array de 5-10 términos en español para buscar en descripciones de la nomenclatura arancelaria (sinónimos, nombres técnicos, variaciones, nombres en singular y plural). Incluí el término más general y los más específicos.
- "capitulos_probables": array de 1-3 números de capítulo del Sistema Armonizado donde probablemente cae el producto (solo números enteros, ej: [73, 83]).
- "nota": texto opcional si necesitás más información del usuario para clasificar mejor.

NO devuelvas ningún código NCM. Solo palabras clave y capítulos.
Respondé SOLO con JSON válido, sin texto adicional.`

    const userFase1 = `Producto a clasificar:
- Nombre: ${producto}
- Material/materia prima: ${material || 'No especificado'}
- Uso/destino: ${uso || 'No especificado'}
- Estado/procesamiento: ${estado}
- Presentación: ${presentacion || 'No especificada'}
- Detalles adicionales: ${detalles || 'Ninguno'}

Generá palabras clave para buscar este producto en la nomenclatura arancelaria argentina.`

    const respFase1 = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      temperature: 0,
      system: systemFase1,
      messages: [{ role: 'user', content: userFase1 }],
    })

    let fase1 = { palabras_clave: [], capitulos_probables: [], nota: null }
    try {
      fase1 = JSON.parse(respFase1.content[0]?.text?.replace(/```json|```/g, '').trim() ?? '{}')
    } catch {
      // Continuar con fallback
    }

    const palabrasClave = Array.isArray(fase1.palabras_clave) ? fase1.palabras_clave.filter(Boolean) : []
    const capitulosProbables = Array.isArray(fase1.capitulos_probables) ? fase1.capitulos_probables : []

    // ── FASE 2: Buscar candidatos reales en la DB ─────────────────────────────
    let candidatosDB = []

    if (palabrasClave.length > 0) {
      const sets = await Promise.all(
        palabrasClave.map(term =>
          supabase
            .from('ncm')
            .select('codigo_ncm, descripcion, capitulo, seccion')
            .ilike('descripcion', `%${term}%`)
            .limit(20)
        )
      )

      const vistos = new Set()
      const todos = []
      for (const { data } of sets) {
        for (const row of data ?? []) {
          if (!vistos.has(row.codigo_ncm)) {
            vistos.add(row.codigo_ncm)
            todos.push(row)
          }
        }
      }

      // Priorizar los que coinciden con capitulos_probables (sin excluir el resto)
      if (capitulosProbables.length > 0) {
        const capStrings = capitulosProbables.map(n => String(n).padStart(2, '0'))
        const enCapitulo = todos.filter(r => capStrings.includes(String(r.capitulo).padStart(2, '0')))
        const fuera = todos.filter(r => !capStrings.includes(String(r.capitulo).padStart(2, '0')))
        candidatosDB = [...enCapitulo, ...fuera].slice(0, 50)
      } else {
        candidatosDB = todos.slice(0, 50)
      }
    }

    // Fallback: si las palabras clave no produjeron resultados, búsqueda textual directa
    if (candidatosDB.length === 0) {
      candidatosDB = await buscarCandidatosDB(supabase, producto, material, uso)
    }

    if (candidatosDB.length === 0) {
      return NextResponse.json({
        candidatos: [],
        nota: fase1.nota ?? 'No se encontraron posiciones NCM en la base de datos para los términos ingresados. Intentá con palabras más específicas o en español.',
      })
    }

    // ── FASE 3: Haiku rankea candidatos reales ────────────────────────────────
    const listaNCM = candidatosDB
      .map(r => `${r.codigo_ncm} — ${r.descripcion}`)
      .join('\n')

    const systemFase3 = `Sos un clasificador arancelario experto. Te doy una descripción de producto y una lista de posiciones NCM reales de la base de datos argentina. Elegí las 3 posiciones que mejor clasifiquen el producto.

IMPORTANTE: solo podés elegir códigos que estén en la lista. No inventes ni modifiques códigos. Copiá el codigo_ncm exactamente como aparece en la lista.

Respondé SOLO con JSON válido:
{
  "candidatos": [
    {
      "codigo_ncm": "código exacto de la lista",
      "confianza": "alta|media|baja",
      "razonamiento": "2-3 oraciones explicando por qué este NCM clasifica el producto."
    }
  ]
}`

    const userFase3 = `Producto:
- Nombre: ${producto}
- Material/materia prima: ${material || 'No especificado'}
- Uso/destino: ${uso || 'No especificado'}
- Estado/procesamiento: ${estado}
- Presentación: ${presentacion || 'No especificada'}
- Detalles adicionales: ${detalles || 'Ninguno'}

Posiciones NCM disponibles en la base de datos:
${listaNCM}

Elegí las 3 mejores posiciones para este producto.`

    const respFase3 = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      temperature: 0,
      system: systemFase3,
      messages: [{ role: 'user', content: userFase3 }],
    })

    let fase3 = { candidatos: [] }
    try {
      fase3 = JSON.parse(respFase3.content[0]?.text?.replace(/```json|```/g, '').trim() ?? '{}')
    } catch {
      // Fallback: usar los primeros 3 de la DB
    }

    const elegidos = Array.isArray(fase3.candidatos) && fase3.candidatos.length > 0
      ? fase3.candidatos
      : candidatosDB.slice(0, 3).map(r => ({ codigo_ncm: r.codigo_ncm, confianza: 'baja', razonamiento: 'Resultado de búsqueda textual — no clasificado por IA.' }))

    // ── FASE 4: Enriquecer con datos de la DB y aranceles ────────────────────
    // Mapear candidatosDB para lookup rápido
    const dbMap = new Map(candidatosDB.map(r => [r.codigo_ncm, r]))

    const candidatosFinales = await Promise.all(
      elegidos.slice(0, 3).map(async (c) => {
        // Validar que el código viene de la lista real
        const ncm_exacto = dbMap.get(c.codigo_ncm) ?? null

        const codigoAranceles = ncm_exacto?.codigo_ncm ?? null
        let aranceles_impo = null
        let aranceles_expo = null

        if (codigoAranceles) {
          const [impo, expo] = await Promise.all([
            supabase.from('aranceles_importacion').select('die, te, iva').eq('codigo_ncm', codigoAranceles).single(),
            supabase.from('aranceles_exportacion').select('derecho_exportacion, reintegro').eq('codigo_ncm', codigoAranceles).single(),
          ])
          aranceles_impo = impo.data ?? null
          aranceles_expo = expo.data ?? null
        }

        return {
          codigo_ncm: c.codigo_ncm,
          confianza: c.confianza ?? 'media',
          razonamiento: c.razonamiento ?? '',
          ncm_exacto,
          similares: null,
          aranceles_impo,
          aranceles_expo,
        }
      })
    )

    return NextResponse.json({ candidatos: candidatosFinales, nota: fase1.nota ?? null })
  } catch (err) {
    console.error('[nomenclador/clasificar] Error:', err)
    return NextResponse.json({ error: 'Error al clasificar el producto' }, { status: 500 })
  }
}
