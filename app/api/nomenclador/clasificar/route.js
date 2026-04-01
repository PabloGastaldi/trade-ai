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

export async function POST(request) {
  try {
    const body = await request.json()
    const { producto, material, uso, estado, presentacion, detalles } = body

    if (!producto || !producto.trim()) {
      return NextResponse.json({ error: 'El campo "producto" es obligatorio.' }, { status: 400 })
    }

    if (!estado || !estado.trim()) {
      return NextResponse.json({ error: 'El campo "estado" es obligatorio.' }, { status: 400 })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const systemPrompt = `Sos un clasificador arancelario experto en el sistema NCM (Nomenclatura Común del Mercosur) argentino. 

Tu tarea es sugerir entre 1 y 3 posiciones arancelarias NCM candidatas para un producto, ordenadas de más probable a menos probable.

REGLAS:
- Respondé SOLO con JSON válido, sin texto adicional
- Cada candidato tiene: codigo_ncm (11 dígitos sin puntos), confianza (alta/media/baja), razonamiento (1-2 oraciones explicando por qué esa posición)
- Si no tenés suficiente información para clasificar, devolvé un array vacío
- Los códigos NCM son de 11 dígitos. Si solo podés determinar hasta partida (4 dígitos) o subpartida (6-8 dígitos), completá con ceros
- Priorizá precisión sobre cantidad: si solo tenés 1 candidato claro, devolvé solo 1

Formato de respuesta:
{
  "candidatos": [
    {
      "codigo_ncm": "04090000000",
      "confianza": "alta",
      "razonamiento": "Miel natural se clasifica en la partida 04.09, sin procesamiento adicional corresponde a la subpartida 0409.00"
    }
  ],
  "nota": "texto opcional si necesitás aclarar algo o pedir más info"
}
`

    const userPrompt = `Clasificá este producto:

Producto: ${producto}
Material/materia prima: ${material || 'No especificado'}
Uso/destino: ${uso || 'No especificado'}
Estado/procesamiento: ${estado}
Presentación: ${presentacion || 'No especificada'}
Detalles adicionales: ${detalles || 'Ninguno'}
`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20241022',
      max_tokens: 800,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0]?.text ?? ''
    let parsed = { candidatos: [], nota: null }

    try {
      const jsonStr = text.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(jsonStr)
    } catch (parseErr) {
      console.error('[nomenclador/clasificar] Parse error:', parseErr.message, text)
      return NextResponse.json({ error: 'Error al parsear respuesta de IA' }, { status: 500 })
    }

    const candidatosRaw = parsed.candidatos ?? []
    if (candidatosRaw.length === 0) {
      return NextResponse.json({ candidatos: [], nota: parsed.nota })
    }

    const supabase = getServiceClient()
    const candidatos = []

    for (const candidato of candidatosRaw) {
      const codigo = candidato.codigo_ncm?.replace(/\D/g, '') ?? ''
      if (codigo.length < 4) continue

      const codigoFormateado = codigo.padEnd(11, '0').slice(0, 11)

      const { data: ncmReal } = await supabase
        .from('ncm')
        .select('codigo_ncm, descripcion, seccion, capitulo, partida')
        .eq('codigo_ncm', codigoFormateado)
        .single()

      let similares = null
      if (!ncmReal && codigo.length >= 4) {
        const prefijo = codigo.slice(0, 6)
        const { data: sim } = await supabase
          .from('ncm')
          .select('codigo_ncm, descripcion, seccion, capitulo, partida')
          .like('codigo_ncm', `${prefijo}%`)
          .limit(5)
        similares = sim ?? []
      }

      let arancImpo = null
      let arancExpo = null
      if (ncmReal || similares?.length > 0) {
        const ncmToQuery = ncmReal?.codigo_ncm ?? (similares?.[0]?.codigo_ncm ?? '')
        if (ncmToQuery) {
          const [impo, expo] = await Promise.all([
            supabase.from('aranceles_importacion')
              .select('die, te, iva')
              .eq('codigo_ncm', ncmToQuery)
              .single(),
            supabase.from('aranceles_exportacion')
              .select('derecho_exportacion, reintegro')
              .eq('codigo_ncm', ncmToQuery)
              .single(),
          ])
          arancImpo = impo.data
          arancExpo = expo.data
        }
      }

      candidatos.push({
        codigo_ncm: codigoFormateado,
        confianza: candidato.confianza ?? 'media',
        razonamiento: candidato.razonamiento ?? '',
        ncm_exacto: ncmReal,
        similares: similares?.length > 0 ? similares : null,
        aranceles_impo: arancImpo,
        aranceles_expo: arancExpo,
      })
    }

    return NextResponse.json({ candidatos, nota: parsed.nota })
  } catch (err) {
    console.error('[nomenclador/clasificar] Error:', err)
    return NextResponse.json({ error: 'Error al clasificar el producto' }, { status: 500 })
  }
}