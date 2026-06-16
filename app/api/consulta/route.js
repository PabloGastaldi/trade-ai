import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buscarNCM, formatearResultadosNCM } from '@/lib/ncm-lookup'
import { buscarPreferencias, formatearPreferencias } from '@/lib/preferencias-lookup'
import { buscarBarrerasNTM, formatearBarrerasNTM, resolverISO3 } from '@/lib/ntm-lookup'
import { resumenNTMCompleto } from '@/lib/ntm-extended-lookup'
import { buscarEnPinecone } from '@/lib/pinecone-search'
import { sanitizarPregunta } from '@/lib/utils/sanitize'
import { RateLimiter } from '@/lib/rate-limit'
import { SYSTEM_PROMPT } from '@/lib/prompts/system-prompt'
import { GUIA_IMPORTACION } from '@/lib/prompts/guia-importacion'
import { getPlanConfig } from '@/lib/plans-config'
import { aplicarResetMensual } from '@/lib/monthly-reset'

// ─────────────────────────────────────────────
// RATE LIMITING POR USUARIO (2da capa)
// El middleware ya limita por IP. Este limita por userId
// para que un usuario autenticado no acapare el cupo.
// Máximo 10 consultas por minuto por cuenta.
// ─────────────────────────────────────────────
const userRateLimiter = new RateLimiter({ limite: 10, ventanaMs: 60_000 })

function verificarRateLimit(userId) {
  return userRateLimiter.check(userId).permitido
}

// ─────────────────────────────────────────────
// TOKEN BUDGET POR COMPLEJIDAD
// ─────────────────────────────────────────────
// Límites de tokens por complejidad.
// El modelo NO debe usar el máximo siempre — son techos, no objetivos.
// simple: respuestas de un dato puntual (NCM, arancel, definición)
// media:  operación con producto y destino (lo más común)
// compleja: análisis multi-producto, multi-destino o normativa cruzada — excepcional
const TOKEN_BUDGET = {
  simple:   800,
  media:    2000,
  compleja: 3000,
}

// ─────────────────────────────────────────────
// DETECCIÓN DE TIPO DE OPERACIÓN
// Usa la clasificación de Haiku si está disponible.
// Fallback: palabras clave en la pregunta.
// ─────────────────────────────────────────────
function detectarTipoOperacion(pregunta, clasificacion) {
  if (clasificacion?.tipo_operacion === 'exportacion') return 'exportacion'
  if (clasificacion?.tipo_operacion === 'importacion') return 'importacion'

  const texto = pregunta.toLowerCase()
  const esExpo = /export|vender al exterior|enviar a|mandar a|despacho de expo/i.test(texto)
  const esImpo = /import|traer de|comprar de|ingresar al pa[ií]s|despacho de impo/i.test(texto)

  if (esExpo && !esImpo) return 'exportacion'
  if (esImpo && !esExpo) return 'importacion'
  return 'general'
}

// ─────────────────────────────────────────────
// HANDLER PRINCIPAL
// (SYSTEM PROMPT movido a lib/prompts/system-prompt.js)
// ─────────────────────────────────────────────
export async function POST(request) {
  // ── 1. Parsear y validar el body ────────────
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'El cuerpo de la solicitud no es JSON válido.' },
      { status: 400 }
    )
  }

  const { pregunta, historial: historialRaw } = body

  if (!pregunta || typeof pregunta !== 'string') {
    return NextResponse.json(
      { error: 'El campo "pregunta" es requerido.' },
      { status: 400 }
    )
  }

  if (pregunta.length > 2000) {
    return NextResponse.json(
      { error: 'La consulta no puede superar los 2000 caracteres.' },
      { status: 400 }
    )
  }

  const preguntaSanitizada = sanitizarPregunta(pregunta)

  // ── 2. Verificar autenticación ───────────────
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'No autorizado. Iniciá sesión para consultar.' },
      { status: 401 }
    )
  }

  const userId = user.id

  // ── 3. Rate limiting ─────────────────────────
  if (!verificarRateLimit(userId)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Esperá un minuto antes de volver a consultar.' },
      { status: 429 }
    )
  }

  // ── 4. Verificar límite mensual del plan ──────
  // Usa la tabla users_profile que tiene plan_type y queries_this_month.
  let planUsuario = 'free'
  let perfilUsuario = null
  let seReinicio = false

  try {
    const { data: perfil, error: perfilError } = await supabase
      .from('users_profile')
      .select('plan_type, queries_this_month, queries_reset_date')
      .eq('id', userId)
      .single()

    if (perfilError) throw perfilError

    perfilUsuario  = perfil
    planUsuario    = perfil?.plan_type ?? 'free'

    // Reset on-the-fly si el ciclo mensual venció (fuente única de verdad)
    seReinicio = await aplicarResetMensual(supabase, userId, perfil?.queries_reset_date)
    const consultasEsteMes = seReinicio ? 0 : (perfil?.queries_this_month ?? 0)

    const planConfig = getPlanConfig(planUsuario)
    const limiteConsulta = planConfig.limits.consulta.monthly
    const limite = limiteConsulta ?? Infinity

    if (limite !== Infinity && consultasEsteMes >= limite) {
      return NextResponse.json(
        {
          error: `Alcanzaste el límite de ${limite} consultas mensuales de tu plan ${planUsuario === 'free' ? 'gratuito' : planUsuario}. Actualizá tu plan para continuar.`,
          limitAlcanzado: true,
        },
        { status: 429 }
      )
    }
  } catch (err) {
    console.error('[consulta] Error verificando límite de plan:', err)
    return NextResponse.json(
      { error: 'Error al verificar tu cuenta. Intentá de nuevo.' },
      { status: 500 }
    )
  }

  // ── 5. Clasificar la consulta con Haiku ──────
  // Llamada barata (~$0.0006) que extrae producto, destino y complejidad
  // para mejorar la búsqueda en Supabase y Pinecone, y ajustar el token budget.
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let clasificacion = {
    producto:              null,
    terminos_ncm:          null,
    destino:               null,
    tipo_operacion:        null,
    requiere_ncm:          true,
    complejidad:           'media', // fallback seguro
    needs_documentos:      false,
    needs_intervenciones:  false,
    needs_restricciones:   false,
    regimen:               null,
  }

  try {
    const respuestaHaiku = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `Sos un clasificador de consultas de comercio exterior argentino.
Analizá la consulta y respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown.
Campos requeridos:
- producto: string | null
- terminos_ncm: string | null — 1-3 términos técnicos para buscar en nomenclatura arancelaria
- destino: string | null
- tipo_operacion: "exportacion" | "importacion" | "consulta_general"
- requiere_ncm: boolean — false si es consulta sobre Incoterms, normativa general, conceptos
- complejidad: "simple" | "media" | "compleja"
- needs_documentos: boolean — true si pregunta por documentación, requisitos, trámites, habilitaciones, permisos, certificados
- needs_intervenciones: boolean — true si pregunta por organismos (SENASA, ANMAT, INAL, SRT), certificaciones obligatorias, quién interviene
- needs_restricciones: boolean — true si pregunta por límites de régimen, montos máximos, condiciones, courier, correo
- regimen: "general" | "courier" | "pef" | "correo_upu" | null — régimen mencionado explícitamente, null si no se menciona

Criterios ESTRICTOS de complejidad — el tope de tokens es real, no malgastes:
  simple   = dato puntual SIN destino específico: "qué significa FOB", "qué arancel tiene el NCM 0902.10.00"
             SOLO si la respuesta es un dato o una tabla corta sin contexto operativo.
             Si hay destino identificado → nunca es simple, aunque la pregunta sea corta.
             "¿Qué NCM uso para exportar té a España?" tiene destino → es media.
  media    = cualquier consulta con producto Y/O destino: "exportar vino a USA", "importar notebooks",
             "¿qué NCM tiene el té para exportar a Europa?". Es la categoría por defecto.
  compleja = EXCEPCIONAL: múltiples productos distintos a comparar, múltiples destinos,
             análisis normativo cruzado entre varios organismos. No usar solo porque
             hay barreras NTM o documentación — eso cabe en media.

Ejemplos:
  "¿Qué documentos necesito para exportar miel a la UE?" →
    needs_documentos: true, needs_intervenciones: true, tipo_operacion: "exportacion"
  "¿SENASA interviene en la importación de quesos?" →
    needs_intervenciones: true, tipo_operacion: "importacion"
  "¿Cuál es el límite del régimen courier?" →
    needs_restricciones: true, regimen: "courier"
  "¿Qué arancel tiene el vino para exportar a Brasil?" →
    needs_documentos: false, needs_intervenciones: false, needs_restricciones: false`,
      messages: [{ role: 'user', content: preguntaSanitizada }],
    })
    const texto = respuestaHaiku.content[0]?.text ?? ''
    const json  = texto.replace(/```json|```/g, '').trim()
    clasificacion = { ...clasificacion, ...JSON.parse(json) }
  } catch (err) {
    console.warn('[consulta] Clasificación Haiku falló, usando fallback:', err.message)
    // No crítico — el flujo continúa con los defaults
  }

  // ── 6. Buscar NCM, preferencias y barreras NTM ─
  // Se omite si la consulta no requiere NCM (Incoterms, normativa general, etc.)
  // Preferencias y NTM se buscan en paralelo para no agregar latencia.
  let contextoNCM          = ''
  let contextoPreferencias = ''
  let contextoNTM          = ''
  let contextoDocumentos   = ''
  let contextoIntervenciones = ''
  let contextoRestricciones  = ''
  let ncmCodesEncontrados  = []

  if (clasificacion.requiere_ncm !== false) {
    try {
      const terminosRaw = clasificacion.terminos_ncm
      const textoBusqueda = Array.isArray(terminosRaw)
        ? terminosRaw.join(' ')
        : (terminosRaw ?? preguntaSanitizada)
      const resultadosNCM = await buscarNCM(textoBusqueda)

      if (resultadosNCM.length > 0) {
        contextoNCM         = formatearResultadosNCM(resultadosNCM)
        ncmCodesEncontrados = resultadosNCM.map((r) => r.ncm_code)

        // Derivar HS6 del primer NCM (quitar puntos, tomar primeros 6 dígitos)
        const hs6 = resultadosNCM[0].ncm_code.replace(/\./g, '').slice(0, 6)
        // NCM normalizado para RPCs (sin puntos, 11 dígitos)
        const ncm11 = resultadosNCM[0].ncm_code.replace(/\./g, '')

        // Resolver ISO3 del destino si está disponible
        const destinoISO3 = resolverISO3(clasificacion.destino)
        const direction   = clasificacion.tipo_operacion === 'importacion' ? 'import' : 'export'
        const tipoOp      = clasificacion.tipo_operacion === 'exportacion' ? 'exportacion' : 'importacion'
        const regimen     = clasificacion.regimen ?? 'general'

        // Buscar en paralelo: preferencias, NTM, NTM extendido, documentos, intervenciones, restricciones
        const ncmsParaPref = resultadosNCM.slice(0, 3).map((r) => r.ncm_code)
        const [
          todasPref,
          barrerasNTM,
          ntmExtendido,
          docsResult,
          interResult,
          restResult,
        ] = await Promise.all([
          Promise.all(ncmsParaPref.map(buscarPreferencias)),
          // NTM solo si hay destino específico
          destinoISO3
            ? buscarBarrerasNTM(hs6, { reporter: destinoISO3, direction })
            : Promise.resolve([]),
          // NTM extendido solo si hay destino y es operación concreta
          destinoISO3 && clasificacion.tipo_operacion !== 'consulta_general'
            ? resumenNTMCompleto(supabase, hs6, destinoISO3, tipoOp)
            : Promise.resolve(null),
          // Documentos requeridos (solo si la consulta los necesita)
          clasificacion.needs_documentos
            ? supabase.rpc('documentos_por_operacion', {
                p_tipo: tipoOp,
                p_regimen: regimen,
                p_ncm: ncm11,
              })
            : Promise.resolve(null),
          // Organismos intervinientes
          clasificacion.needs_intervenciones
            ? supabase.rpc('intervenciones_por_operacion', {
                p_operacion: tipoOp,
                p_regimen: regimen,
                p_ncm: ncm11,
              })
            : Promise.resolve(null),
          // Restricciones del régimen
          clasificacion.needs_restricciones
            ? supabase.rpc('restricciones_por_regimen', { p_regimen: regimen })
            : Promise.resolve(null),
        ])

        const prefCombinadas = todasPref.filter(Boolean)
        if (prefCombinadas.length > 0) {
          contextoPreferencias = prefCombinadas.map(formatearPreferencias).filter(Boolean).join('\n\n')
        }

        if (barrerasNTM.length > 0) {
          contextoNTM = formatearBarrerasNTM(barrerasNTM, { hs_code: hs6, direction })
        }

        // NTM extendido
        if (ntmExtendido?.total > 0) {
          const barreras = ntmExtendido.barreras_en_destino.length > 0
            ? ntmExtendido.barreras_en_destino
            : ntmExtendido.barreras_argentinas
          const etiqueta = ntmExtendido.barreras_en_destino.length > 0
            ? '[BARRERAS_EN_DESTINO]'
            : '[BARRERAS_ARGENTINAS_A_IMPORTACION]'
          contextoNTM += `\n\n${etiqueta}\n` +
            barreras.map((b) => `• ${b.ntm_code} — ${b.tipo_medida} [${b.cobertura}]`).join('\n')
        }

        // Documentos requeridos
        if (docsResult?.data?.length > 0) {
          const porCategoria = {}
          for (const doc of docsResult.data) {
            const cat = doc.documento_categoria ?? 'general'
            if (!porCategoria[cat]) porCategoria[cat] = []
            porCategoria[cat].push(doc.documento_nombre + (doc.notas ? ` (${doc.notas})` : ''))
          }
          const lineas = ['[DOCUMENTOS_REQUERIDOS]']
          for (const [cat, docs] of Object.entries(porCategoria)) {
            lineas.push(`${cat}:`)
            docs.forEach((d) => lineas.push(`  • ${d}`))
          }
          contextoDocumentos = lineas.join('\n')
        }

        // Organismos intervinientes
        if (interResult?.data?.length > 0) {
          const lineas = ['[ORGANISMOS_INTERVINIENTES]']
          for (const org of interResult.data) {
            lineas.push(`• ${org.organismo} [${org.estado}]${org.notas ? ` — ${org.notas}` : ''}`)
          }
          contextoIntervenciones = lineas.join('\n')
        }

        // Restricciones del régimen
        if (restResult?.data?.length > 0) {
          const lineas = [`[RESTRICCIONES_REGIMEN_${regimen.toUpperCase()}]`]
          for (const r of restResult.data) {
            lineas.push(`• ${r.restriccion}${r.valor ? `: ${r.valor}` : ''}${r.notas ? ` — ${r.notas}` : ''}`)
          }
          contextoRestricciones = lineas.join('\n')
        }
      }
    } catch (err) {
      console.error('[consulta] Error buscando NCM, preferencias o NTM:', err)
    }
  }

  // ── 7. Buscar fragmentos en Pinecone ──────────
  // topK dinámico según tipo de consulta:
  //   - consulta_general (cómo se exporta, qué es X): máximo contexto normativo
  //   - sin NCM (Incoterms, conceptos): Pinecone ES la única fuente, subir más
  //   - operación con producto: contexto mixto arancelario + operativo
  let contextoPinecone = ''

  try {
    const queryPinecone = [
      clasificacion.producto,
      clasificacion.destino,
      clasificacion.tipo_operacion === 'exportacion' ? 'exportación' : null,
      clasificacion.tipo_operacion === 'importacion' ? 'importación' : null,
    ].filter(Boolean).join(' ') || preguntaSanitizada

    const topKPorTipo = {
      consulta_general: 8,
      exportacion:      6,
      importacion:      6,
    }
    let topK = topKPorTipo[clasificacion.tipo_operacion] ?? 4

    // Si la consulta no requiere NCM, Pinecone es la única fuente de contexto
    if (clasificacion.requiere_ncm === false) {
      topK = 10
    }

    const fragmentos = await buscarEnPinecone(queryPinecone, { topK })


    if (fragmentos.length > 0) {
      contextoPinecone =
        '[NORMATIVA]\n' +
        fragmentos
          .map((f) => `(Fuente: ${f.fuente})\n${f.texto}`)
          .join('\n\n')
    }
  } catch (err) {
    console.error('[consulta] Error buscando en Pinecone:', err)
  }

  // Token budget dinámico según complejidad clasificada por Haiku
  const maxTokens = TOKEN_BUDGET[clasificacion.complejidad] ?? TOKEN_BUDGET.media

  // ── 8. Detectar tipo de operación e inyectar guía operativa ──
  const tipoOperacion = detectarTipoOperacion(preguntaSanitizada, clasificacion)

  // La guía se inyecta solo si la consulta es operativa (no para clasificaciones simples de NCM).
  // Criterio: complejidad != simple Y la pregunta contiene palabras operativas.
  const esOperativa = clasificacion.complejidad !== 'simple' &&
    /c[oó]mo|pasos?|qu[eé] necesito|proceso|requisitos?|tramit|documentos?|habilitaci[oó]n|despacho|operaci[oó]n/i.test(preguntaSanitizada)

  let guiaOperativa = ''
  if (esOperativa && tipoOperacion === 'importacion') {
    guiaOperativa = `\n\n[GUIA_OPERATIVA_IMPORTACION]\n${GUIA_IMPORTACION}`
  }

  const palabrasGuia = guiaOperativa
    ? guiaOperativa.trim().split(/\s+/).length
    : 0
  console.log(
    `[guia] Tipo detectado: ${tipoOperacion} | Guía inyectada: ${guiaOperativa ? `SI (${palabrasGuia} palabras)` : 'NO'}`
  )

  // ── Armar contexto y mensajes para Claude ──
  const seccionesContexto = [
    contextoNCM,
    contextoPreferencias,
    contextoNTM,
    contextoDocumentos,
    contextoIntervenciones,
    contextoRestricciones,
    contextoPinecone,
    guiaOperativa,
  ]
    .filter(Boolean)
    .join('\n\n')

  // Incluir metadatos de clasificación si hay producto identificado
  const metadatosClasificacion = clasificacion.producto
    ? `[CLASIFICACION_CONSULTA]\nProducto: ${clasificacion.producto} | Destino: ${clasificacion.destino ?? 'no especificado'} | Operación: ${clasificacion.tipo_operacion ?? 'no especificada'}\n\n`
    : ''

  const notaPresupuesto = `[PRESUPUESTO]\nTokens disponibles para esta respuesta: ${maxTokens}. Respondé al scope exacto de la pregunta. Si el tema es amplio, cubrí lo esencial y ofrecé profundizar.\n\n`

  const mensajeUsuario = seccionesContexto
    ? `${notaPresupuesto}${metadatosClasificacion}${seccionesContexto}\n\n[CONSULTA]\n${preguntaSanitizada}`
    : `${notaPresupuesto}[CONSULTA]\n${preguntaSanitizada}`

  // Armar historial de conversación (validar formato)
  const historial = Array.isArray(historialRaw)
    ? historialRaw
        .filter(m => m && typeof m.content === 'string' && ['user', 'assistant'].includes(m.role))
        .slice(-10)
    : []

  const mensajesParaClaude = [
    ...historial,
    { role: 'user', content: mensajeUsuario },
  ]

  // ── 9. Llamar a Claude Sonnet con streaming ───
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let respuestaCompleta = ''

      try {
        const anthropicStream = anthropic.messages.stream({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: maxTokens,
          system:     SYSTEM_PROMPT,
          messages:   mensajesParaClaude,
        })

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta?.type === 'text_delta'
          ) {
            const texto = chunk.delta.text
            respuestaCompleta += texto

            const evento = `data: ${JSON.stringify({ texto })}\n\n`
            controller.enqueue(encoder.encode(evento))
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        console.error('[consulta] Error en stream de Claude:', err)
        const errorEvento = `data: ${JSON.stringify({ error: 'Error al generar la respuesta.' })}\n\n`
        controller.enqueue(encoder.encode(errorEvento))
        controller.close()
        return
      }

      // ── 10. Guardar en queries_log ───────────────
      try {
        await supabase.from('queries_log').insert({
          user_id:              userId,
          query_text:           preguntaSanitizada,
          response_text:        respuestaCompleta,
          ncm_codes_referenced: ncmCodesEncontrados,
          sources_cited:        seccionesContexto ? ['ncm', 'preferencias'] : [],
          tokens_used:          null, // TODO: capturar de usage.output_tokens
        })
      } catch (dbErr) {
        console.error('[consulta] Error guardando en queries_log:', dbErr)
      }

      // ── 11. Incrementar contador de consultas ────
      // Si el mes se reinició durante este request, la base ya tiene 0 → incrementar desde 0
      try {
        const baseContador = seReinicio ? 0 : (perfilUsuario?.queries_this_month ?? 0)
        await supabase
          .from('users_profile')
          .update({ queries_this_month: baseContador + 1 })
          .eq('id', userId)
      } catch (dbErr) {
        console.error('[consulta] Error incrementando queries_this_month:', dbErr)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection:      'keep-alive',
    },
  })
}
