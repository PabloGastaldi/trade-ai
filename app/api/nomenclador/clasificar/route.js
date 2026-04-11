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

    // ── FASE 1: Haiku identifica partidas probables (4 dígitos) ──────────────
    const systemFase1 = `Sos un clasificador arancelario experto en el Sistema Armonizado y la NCM del Mercosur. Dado un producto, identificá las 2 a 4 PARTIDAS (4 dígitos) del Sistema Armonizado donde probablemente se clasifica. NO devuelvas códigos NCM completos, SOLO partidas de 4 dígitos. También devolvé 3-5 palabras clave en español para búsqueda textual como backup. Respondé SOLO con JSON válido sin texto adicional.

Formato:
{
  "partidas": ["2204", "2205"],
  "palabras_clave": ["vino", "tinto", "no espumoso"],
  "nota": null
}`

    const userFase1 = `Producto a clasificar:
- Nombre: ${producto}
- Material/materia prima: ${material || 'No especificado'}
- Uso/destino: ${uso || 'No especificado'}
- Estado/procesamiento: ${estado}
- Presentación: ${presentacion || 'No especificada'}
- Detalles adicionales: ${detalles || 'Ninguno'}`

    const respFase1 = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      temperature: 0,
      system: systemFase1,
      messages: [{ role: 'user', content: userFase1 }],
    })

    let fase1 = { partidas: [], palabras_clave: [], nota: null }
    try {
      fase1 = JSON.parse(respFase1.content[0]?.text?.replace(/```json|```/g, '').trim() ?? '{}')
    } catch {
      // Continuar con fallback
    }

    const partidas = Array.isArray(fase1.partidas)
      ? fase1.partidas.filter(p => /^\d{4}$/.test(String(p)))
      : []
    const palabrasClave = Array.isArray(fase1.palabras_clave)
      ? fase1.palabras_clave.filter(Boolean)
      : []

    // ── FASE 2: Traer TODAS las posiciones de esas partidas desde la DB ───────
    const vistos = new Set()
    let candidatosDB = []

    if (partidas.length > 0) {
      const partidaSets = await Promise.all(
        partidas.map(p => {
          const desde = p.padEnd(11, '0')
          const hasta = String(Number(p) + 1).padStart(4, '0').padEnd(11, '0')
          return supabase
            .from('ncm')
            .select('codigo_ncm, descripcion, capitulo, seccion')
            .gte('codigo_ncm', desde)
            .lt('codigo_ncm', hasta)
        })
      )

      for (const { data } of partidaSets) {
        for (const row of data ?? []) {
          if (!vistos.has(row.codigo_ncm)) {
            vistos.add(row.codigo_ncm)
            candidatosDB.push(row)
          }
        }
      }
    }

    // Backup: palabras_clave con ilike para cubrir posiciones fuera de las partidas
    if (palabrasClave.length > 0) {
      const keywordSets = await Promise.all(
        palabrasClave.map(term =>
          supabase
            .from('ncm')
            .select('codigo_ncm, descripcion, capitulo, seccion')
            .ilike('descripcion', `%${term}%`)
            .limit(15)
        )
      )

      for (const { data } of keywordSets) {
        for (const row of data ?? []) {
          if (!vistos.has(row.codigo_ncm)) {
            vistos.add(row.codigo_ncm)
            candidatosDB.push(row)
          }
        }
      }
    }

    // Fallback final: búsqueda textual directa si no hay resultados
    if (candidatosDB.length === 0) {
      candidatosDB = await buscarCandidatosDB(supabase, producto, material, uso)
    }

    if (candidatosDB.length === 0) {
      return NextResponse.json({
        candidatos: [],
        nota: fase1.nota ?? 'No se encontraron posiciones NCM en la base de datos para los términos ingresados. Intentá con palabras más específicas o en español.',
      })
    }

    // ── FASE 3: Haiku rankea entre candidatos reales ──────────────────────────
    const listaNCM = candidatosDB
      .map(c => `${c.codigo_ncm} — ${c.descripcion}`)
      .join('\n')

    const systemFase3 = `Sos un clasificador arancelario experto. Te doy una descripción de producto y una lista de posiciones NCM reales de la base de datos argentina. Elegí las 3 posiciones que mejor clasifiquen el producto. SOLO podés elegir códigos que estén en la lista proporcionada. No inventes ni modifiques códigos. Prestá especial atención a las palabras de la descripción NCM que distinguen subcategorías (espumoso vs no espumoso, crudo vs procesado, envase retail vs granel, etc). No te quedes con la primera coincidencia general — buscá la posición más específica. Respondé SOLO con JSON válido.

Formato:
{
  "candidatos": [
    { "codigo_ncm": "22042211000", "confianza": "alta", "razonamiento": "..." }
  ]
}`

    const userFase3 = `Clasificá este producto:
- Nombre: ${producto}
- Material: ${material || 'No especificado'}
- Uso: ${uso || 'No especificado'}
- Estado: ${estado}
- Presentación: ${presentacion || 'No especificada'}
- Detalles: ${detalles || 'Ninguno'}

Posiciones NCM disponibles:
${listaNCM}`

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

    // ── FASE 4: Enriquecer con aranceles ─────────────────────────────────────
    const dbMap = new Map(candidatosDB.map(r => [r.codigo_ncm, r]))

    const candidatosFinales = await Promise.all(
      elegidos.slice(0, 3).map(async (c) => {
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
