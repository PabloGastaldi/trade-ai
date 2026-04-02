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

// Fallback: búsqueda textual en la DB cuando Haiku no devuelve candidatos válidos
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

// Normaliza un código NCM a 11 dígitos rellenando con ceros
function normalizarCodigo(codigo) {
  if (!codigo) return null
  const digits = String(codigo).replace(/\D/g, '')
  if (digits.length < 4) return null
  return digits.padEnd(11, '0').slice(0, 11)
}

// Fase 2: valida un código sugerido por Haiku contra la DB.
// Devuelve { ncm_exacto, similares }
async function validarCodigoDB(supabase, codigoRaw) {
  const codigo = normalizarCodigo(codigoRaw)
  if (!codigo) return { ncm_exacto: null, similares: [] }

  // Búsqueda exacta
  const { data: exacto } = await supabase
    .from('ncm')
    .select('codigo_ncm, descripcion, capitulo, seccion')
    .eq('codigo_ncm', codigo)
    .single()

  if (exacto) return { ncm_exacto: exacto, similares: [] }

  // Búsqueda por prefijo: usa entre 6 y 8 dígitos según lo que tenga el código
  const prefijo = codigo.replace(/0+$/, '').slice(0, 8) || codigo.slice(0, 6)
  const { data: similares } = await supabase
    .from('ncm')
    .select('codigo_ncm, descripcion, capitulo, seccion')
    .like('codigo_ncm', `${prefijo}%`)
    .limit(5)

  return { ncm_exacto: null, similares: similares ?? [] }
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

    // ── FASE 1: Haiku clasifica libremente ──────────────────────────────────
    const systemPrompt = `Sos un clasificador arancelario experto en NCM (Nomenclatura Común del Mercosur) argentino.

Dado un producto, sugerí entre 1 y 3 posiciones NCM candidatas usando tu conocimiento del Sistema Armonizado y la NCM del Mercosur.

REGLAS:
- Los códigos NCM tienen entre 8 y 11 dígitos (sin puntos ni espacios).
- Si solo podés determinar hasta partida (4 dígitos) o subpartida (6 dígitos), completá con ceros hasta 11.
- Ordenar de mayor a menor confianza.
- Respondé SOLO con JSON válido, sin texto adicional.

Formato de respuesta:
{
  "candidatos": [
    {
      "codigo_ncm": "6403990000000",
      "confianza": "alta",
      "razonamiento": "1-2 oraciones explicando la clasificación."
    }
  ],
  "nota": "opcional — aclaración o pedido de más información"
}`

    const userPrompt = `Clasificá este producto en la NCM:
- Nombre: ${producto}
- Material/materia prima: ${material || 'No especificado'}
- Uso/destino: ${uso || 'No especificado'}
- Estado/procesamiento: ${estado}
- Presentación: ${presentacion || 'No especificada'}
- Detalles adicionales: ${detalles || 'Ninguno'}`

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

    const candidatosIA = parsed.candidatos ?? []

    // ── FASE 2: Validar cada candidato contra la DB ─────────────────────────
    const candidatos = []

    for (const candidato of candidatosIA) {
      const { ncm_exacto, similares } = await validarCodigoDB(supabase, candidato.codigo_ncm)

      // Enriquecer con aranceles si hay NCM exacto o al menos un similar
      const codigoParaAranceles = ncm_exacto?.codigo_ncm ?? similares[0]?.codigo_ncm ?? null
      let aranceles_impo = null
      let aranceles_expo = null

      if (codigoParaAranceles) {
        const [impo, expo] = await Promise.all([
          supabase.from('aranceles_importacion').select('die, te, iva').eq('codigo_ncm', codigoParaAranceles).single(),
          supabase.from('aranceles_exportacion').select('derecho_exportacion, reintegro').eq('codigo_ncm', codigoParaAranceles).single(),
        ])
        aranceles_impo = impo.data ?? null
        aranceles_expo = expo.data ?? null
      }

      candidatos.push({
        codigo_ncm: normalizarCodigo(candidato.codigo_ncm) ?? candidato.codigo_ncm,
        confianza: candidato.confianza ?? 'media',
        razonamiento: candidato.razonamiento ?? '',
        ncm_exacto: ncm_exacto ?? null,
        similares: ncm_exacto ? null : similares,
        aranceles_impo,
        aranceles_expo,
      })
    }

    // ── FALLBACK: si Haiku no devolvió candidatos con resultados en DB ──────
    // (todos sin ncm_exacto Y sin similares) → búsqueda textual clásica
    const hayResultadosDB = candidatos.some(c => c.ncm_exacto || c.similares?.length > 0)

    if (!hayResultadosDB && candidatos.length === 0) {
      const candidatosDB = await buscarCandidatosDB(supabase, producto, material, uso)
      if (candidatosDB.length === 0) {
        return NextResponse.json({
          candidatos: [],
          nota: parsed.nota ?? 'No se encontraron posiciones NCM en la base de datos para los términos ingresados. Intentá con palabras más específicas o en español.',
        })
      }
      // Devolver los primeros 3 como candidatos sin clasificación IA
      const fallbackCandidatos = candidatosDB.slice(0, 3).map(r => ({
        codigo_ncm: r.codigo_ncm,
        confianza: 'baja',
        razonamiento: 'Resultado de búsqueda textual — no clasificado por IA.',
        ncm_exacto: r,
        similares: null,
        aranceles_impo: null,
        aranceles_expo: null,
      }))
      return NextResponse.json({ candidatos: fallbackCandidatos, nota: parsed.nota })
    }

    return NextResponse.json({ candidatos, nota: parsed.nota })
  } catch (err) {
    console.error('[nomenclador/clasificar] Error:', err)
    return NextResponse.json({ error: 'Error al clasificar el producto' }, { status: 500 })
  }
}
