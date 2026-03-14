import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────
// CLIENTE SUPABASE CON SERVICE ROLE
// Necesario para bypasear RLS desde el servidor.
// NUNCA importar en Client Components.
// ─────────────────────────────────────────────
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ─────────────────────────────────────────────
// NORMALIZACIÓN DE CÓDIGO NCM
//
// Convierte cualquier formato de entrada al formato
// estándar de la tabla ncm: XXXX.XX.XX (ej: "0402.10.10")
//
// Soporta:
//   "0402.10.10"   → con puntos (ya correcto)
//   "04021010"     → 8 dígitos sin puntos
//   "0402101000"   → NALADISA 10 dígitos (toma los primeros 8)
//   "0402.10"      → subpartida (6 dígitos)
//   "0402"         → partida (4 dígitos)
//   "04"           → capítulo (2 dígitos)
//
// Devuelve { ncmCode, esParcial, digitosOriginales } o null.
// ─────────────────────────────────────────────
export function normalizarCodigoNCM(entrada) {
  if (!entrada) return null

  // Eliminar puntos y espacios para trabajar solo con dígitos
  const digits = String(entrada).replace(/[.\s]/g, '').replace(/\D/g, '')

  if (digits.length < 2) return null

  // Validar capítulo 01–99
  const capitulo = parseInt(digits.slice(0, 2), 10)
  if (capitulo < 1 || capitulo > 99) return null

  // Tomar como máximo 8 dígitos (descartar dígitos extra del NALADISA)
  const ocho = digits.slice(0, 8).padEnd(8, '0')
  const ncmCode = `${ocho.slice(0,4)}.${ocho.slice(4,6)}.${ocho.slice(6,8)}`

  return {
    ncmCode,          // "0402.10.10" — para query en tabla ncm
    prefijo: digits.slice(0, Math.min(digits.length, 8)), // para búsqueda parcial
    esParcial: digits.length < 8,
    esNaladisa: digits.length >= 10,
  }
}

// ─────────────────────────────────────────────
// DETECCIÓN DE CÓDIGO NCM EN TEXTO LIBRE
//
// Busca en el texto del usuario un código que parezca NCM.
// Devuelve el resultado de normalizarCodigoNCM o null.
// ─────────────────────────────────────────────
const REGEX_NCM = /\b\d{2}(?:[.\s]?\d{2}){1,4}\b/g

export function extraerCodigoNCM(texto) {
  const matches = texto.match(REGEX_NCM)
  if (!matches) return null

  // Tomar el match más largo (más específico)
  const candidato = matches.sort((a, b) => b.length - a.length)[0]
  return normalizarCodigoNCM(candidato)
}

// ─────────────────────────────────────────────
// BÚSQUEDA POR CÓDIGO NCM
// ─────────────────────────────────────────────
async function buscarPorCodigo(supabase, normalizado) {
  const { ncmCode, prefijo, esParcial } = normalizado

  if (!esParcial) {
    // Código completo: búsqueda exacta
    const { data, error } = await supabase
      .from('ncm')
      .select('*')
      .eq('ncm_code', ncmCode)
      .limit(1)

    if (error) throw error
    return data ?? []
  }

  // Código parcial (capítulo, partida, subpartida): búsqueda por prefijo
  // Construir prefijo con puntos para que coincida con el formato almacenado
  const prefijoPuntos = normalizarCodigoNCM(prefijo)?.ncmCode?.slice(0, prefijo.length + Math.floor(prefijo.length / 2))
    ?? prefijo

  const { data, error } = await supabase
    .from('ncm')
    .select('*')
    .like('ncm_code', `${prefijoPuntos.slice(0, 4)}%`)
    .limit(5)

  if (error) throw error
  return data ?? []
}

// ─────────────────────────────────────────────
// BÚSQUEDA POR TEXTO — FULL-TEXT SEARCH
// ─────────────────────────────────────────────
async function buscarPorFTS(supabase, texto) {
  const terminoFTS = texto
    .replace(/['"\\;:!?()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!terminoFTS) return []

  const { data, error } = await supabase
    .from('ncm')
    .select('*')
    .textSearch('description', terminoFTS, {
      type: 'websearch',
      config: 'spanish',
    })
    .limit(5)

  if (error) {
    console.warn('[ncm-lookup] FTS falló, usando ILIKE:', error.message)
    return null // señal para usar fallback
  }

  return data ?? []
}

// ─────────────────────────────────────────────
// BÚSQUEDA POR TEXTO — ILIKE (fallback)
// ─────────────────────────────────────────────
async function buscarPorILIKE(supabase, texto) {
  const palabras = texto
    .toLowerCase()
    .replace(/[^a-záéíóúüñ\s]/gi, ' ')
    .split(/\s+/)
    .filter((p) => p.length > 3)
    .sort((a, b) => b.length - a.length)

  if (palabras.length === 0) return []

  const { data, error } = await supabase
    .from('ncm')
    .select('*')
    .ilike('description', `%${palabras[0]}%`)
    .limit(5)

  if (error) throw error
  return data ?? []
}

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL EXPORTADA
//
// Recibe el texto de la consulta del usuario y devuelve
// hasta 5 posiciones NCM de la tabla ncm.
//
// Estrategia:
//   1. Detectar código NCM/NALADISA explícito → búsqueda exacta
//   2. Sin código → FTS en español
//   3. FTS falla o vacío → ILIKE fallback
//
// Retorna array de objetos con todos los campos de ncm,
// más el campo sintético _fuenteBusqueda para trazabilidad.
// ─────────────────────────────────────────────
export async function buscarNCM(textoPregunta) {
  if (!textoPregunta || typeof textoPregunta !== 'string') return []

  const supabase = getServiceClient()

  // ── Estrategia 1: código explícito ──────────
  const codigoDetectado = extraerCodigoNCM(textoPregunta)

  if (codigoDetectado) {
    try {
      const resultados = await buscarPorCodigo(supabase, codigoDetectado)
      if (resultados.length > 0) {
        return resultados.map(r => ({ ...r, _fuenteBusqueda: 'codigo' }))
      }
    } catch (err) {
      console.error('[ncm-lookup] Error en búsqueda por código:', err)
    }
  }

  // ── Estrategia 2: full-text search ──────────
  try {
    const resultadosFTS = await buscarPorFTS(supabase, textoPregunta)

    if (resultadosFTS !== null && resultadosFTS.length > 0) {
      return resultadosFTS.map(r => ({ ...r, _fuenteBusqueda: 'fts' }))
    }
  } catch (err) {
    console.error('[ncm-lookup] Error en FTS:', err)
  }

  // ── Estrategia 3: ILIKE fallback ─────────────
  try {
    const resultados = await buscarPorILIKE(supabase, textoPregunta)
    return resultados.map(r => ({ ...r, _fuenteBusqueda: 'ilike' }))
  } catch (err) {
    console.error('[ncm-lookup] Error en ILIKE fallback:', err)
    return []
  }
}

// ─────────────────────────────────────────────
// FORMATEADOR DE RESULTADOS NCM
//
// Convierte resultados de la tabla ncm en un bloque de texto
// listo para inyectar en el prompt del agente.
//
// Parámetros:
//   resultados  — array de filas de la tabla ncm
//   opciones.esNaladisa — bool: etiquetar código como NALADISA en vez de NCM
//                         (para cuando el código viene de preferencias_arancelarias
//                          pero no existe en la tabla ncm actual)
// ─────────────────────────────────────────────
export function formatearResultadosNCM(resultados, { esNaladisa = false } = {}) {
  if (!resultados || resultados.length === 0) return ''

  const etiquetaCodigo = esNaladisa ? 'NALADISA' : 'NCM'
  const notaNaladisa = esNaladisa
    ? '\n⚠️  Nota: este código figura como NALADISA en el acuerdo comercial. ' +
      'Puede diferir del NCM argentino vigente — verificar con un despachante.'
    : ''

  const filas = resultados.map((r) => {
    const lineas = [
      `${etiquetaCodigo} ${r.ncm_code}: ${r.description}`,
      `  Arancel extrazona (AEC): ${r.arancel_extrazona ?? '-'}% | Arancel intrazona: ${r.arancel_intrazona ?? '-'}%`,
      `  Der. exportación: ${r.derecho_exportacion ?? '-'}% | IVA importación: ${r.iva_importacion ?? '-'}% | Tasa estadística: ${r.tasa_estadistica ?? '-'}%`,
    ]

    if (r.unidad_medida) {
      lineas.push(`  Unidad: ${r.unidad_medida}`)
    }
    if (r.organismos_imp) {
      lineas.push(`  Organismos importación: ${r.organismos_imp}`)
    }
    if (r.organismos_exp) {
      lineas.push(`  Organismos exportación: ${r.organismos_exp}`)
    }

    return lineas.join('\n')
  })

  return (
    '[NCM_DATA]\n' +
    '(Fuente: Nomenclatura NCM — AFIP/Aduana Argentina)\n' +
    notaNaladisa + '\n\n' +
    filas.join('\n\n')
  )
}

// ─────────────────────────────────────────────
// FORMATEADOR PARA PREFERENCIAS SIN NCM MATCH
//
// Cuando una preferencia arancelaria existe en la tabla
// preferencias_arancelarias con un código NALADISA que
// NO tiene match en la tabla ncm (versión de nomenclatura
// diferente), este formateador genera el bloque de texto
// para el agente sin datos de arancel base.
// ─────────────────────────────────────────────
export function formatearPreferenciaSinNcm({ ncm_naladisa, acuerdo_id, pais, tipo }) {
  return (
    `[NALADISA_SIN_DATOS_ARANCEL]\n` +
    `NALADISA ${ncm_naladisa} — código de versión anterior de nomenclatura.\n` +
    `No tiene equivalente en el NCM argentino vigente.\n` +
    `Acuerdo: ${acuerdo_id} | País: ${pais} | Tipo: ${tipo}\n` +
    `⚠️  Para conocer el arancel base de este producto, consultá la nomenclatura ` +
    `actualizada con un despachante de aduana.`
  )
}
