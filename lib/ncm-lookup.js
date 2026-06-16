import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────
// CLIENTE SUPABASE CON SERVICE ROLE
// NUNCA importar en Client Components.
// ─────────────────────────────────────────────
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

// ─────────────────────────────────────────────
// NORMALIZACIÓN DE CÓDIGO NCM
//
// Nuevo schema: codigo_ncm = 11 dígitos sin puntos (ej: "29339141000")
//
// Soporta entrada en cualquier formato:
//   "2933.91.41.000"  → nuevo display con puntos
//   "29339141000"     → 11 dígitos directo
//   "2933.91.41"      → 8 dígitos viejo formato → padear a 11
//   "29331410"        → 8 dígitos sin puntos    → padear a 11
//   "2933.91"         → parcial
//   "2933"            → partida
//   "29"              → capítulo
// ─────────────────────────────────────────────
/**
 * Normaliza cualquier formato de código NCM a 11 dígitos sin puntos.
 * @param {string|number} entrada — código en cualquier formato (con/sin puntos, 8 u 11 dígitos)
 * @returns {{ codigoNCM: string, prefijo: string, esParcial: boolean, ncmCode: string, esNaladisa: boolean }|null}
 */
export function normalizarCodigoNCM(entrada) {
  if (!entrada) return null

  const digits = String(entrada).replace(/[.\s]/g, '').replace(/\D/g, '')
  if (digits.length < 2) return null

  const capitulo = parseInt(digits.slice(0, 2), 10)
  if (capitulo < 1 || capitulo > 99) return null

  const esParcial = digits.length < 8

  // Padear a 11 dígitos para el nuevo schema
  const once = digits.slice(0, 11).padEnd(11, '0')

  return {
    codigoNCM:   once,          // PK del nuevo schema
    prefijo:     digits.slice(0, Math.min(digits.length, 11)),
    esParcial,
    // alias para compatibilidad con código viejo (XXXX.XX.XX)
    ncmCode:     `${once.slice(0,4)}.${once.slice(4,6)}.${once.slice(6,8)}`,
    esNaladisa:  digits.length >= 10,
  }
}

/**
 * Formatea un código NCM de 11 dígitos al display XXXX.XX.XX.XXX.
 * @param {string} codigo — 11 dígitos sin puntos
 * @returns {string}
 */
export function formatearNCMDisplay(codigo) {
  if (!codigo || codigo.length !== 11) return codigo ?? ''
  return `${codigo.slice(0,4)}.${codigo.slice(4,6)}.${codigo.slice(6,8)}.${codigo.slice(8,11)}`
}

// ─────────────────────────────────────────────
// DETECCIÓN DE CÓDIGO NCM EN TEXTO LIBRE
// ─────────────────────────────────────────────
const REGEX_NCM = /\b\d{2}(?:[.\s]?\d{2}){1,5}\b/g

/**
 * Detecta el primer código NCM en texto libre y lo normaliza.
 * @param {string} texto
 * @returns {ReturnType<typeof normalizarCodigoNCM>|null}
 */
export function extraerCodigoNCM(texto) {
  const matches = texto.match(REGEX_NCM)
  if (!matches) return null
  const candidato = matches.sort((a, b) => b.length - a.length)[0]
  return normalizarCodigoNCM(candidato)
}

// ─────────────────────────────────────────────
// ENRIQUECEDOR: nuevo schema → formato unificado
// Aplana el join de aranceles_importacion
// y agrega aliases de compatibilidad con el código viejo.
// ─────────────────────────────────────────────
function enriquecerRow(r) {
  const ai = Array.isArray(r.aranceles_importacion)
    ? (r.aranceles_importacion[0] ?? {})
    : (r.aranceles_importacion ?? {})

  return {
    // campos nuevos
    codigo_ncm:            r.codigo_ncm,
    descripcion:           r.descripcion,
    seccion:               r.seccion,
    capitulo:              r.capitulo,
    partida:               r.partida,
    // aliases de compatibilidad
    ncm_code:              formatearNCMDisplay(r.codigo_ncm),
    description:           r.descripcion,
    // aranceles importación aplanados
    arancel_extrazona:     ai.die  ?? ai.aec ?? 0,   // extrazona = DIE (o AEC si no hay DIE)
    arancel_intrazona:     ai.dii  ?? 0,
    iva_importacion:       ai.iva  ?? 21,
    tasa_estadistica:      ai.te   ?? 0,
    iva_adicional:         ai.iva_ad ?? 0,
    percepcion_ganancias:  ai.gan  ?? 0,
    ingresos_brutos:       ai.iibb ?? 0,
  }
}

const NCM_SELECT = `
  codigo_ncm, seccion, capitulo, partida, descripcion,
  aranceles_importacion (aec, die, dii, te, iva, iva_ad, gan, iibb)
`

// ─────────────────────────────────────────────
// BÚSQUEDA POR CÓDIGO
// ─────────────────────────────────────────────
async function buscarPorCodigo(supabase, normalizado) {
  const { codigoNCM, prefijo, esParcial } = normalizado

  if (!esParcial) {
    const { data, error } = await supabase
      .from('ncm')
      .select(NCM_SELECT)
      .eq('codigo_ncm', codigoNCM)
      .limit(1)
    if (error) throw error
    return (data ?? []).map(enriquecerRow)
  }

  const { data, error } = await supabase
    .from('ncm')
    .select(NCM_SELECT)
    .like('codigo_ncm', `${prefijo}%`)
    .limit(5)
  if (error) throw error
  return (data ?? []).map(enriquecerRow)
}

// ─────────────────────────────────────────────
// STOP WORDS
// ─────────────────────────────────────────────
const STOP_WORDS_COMERCIO = new Set([
  'exportar','importar','exporto','importo','enviar','envio','envío',
  'quiero','necesito','tengo','busco','buscar','hacer','realizar',
  'conseguir','obtener','tramitar','vender','comprar','traer','llevar',
  'poder','saber','conocer','entender','explicar','decir','indicar',
  'argentina','argentino','brasil','brasileno','china','chino','chile',
  'chileno','mexico','mexicano','peru','peruano','colombia','colombiano',
  'eeuu','estados','unidos','europa','europeo','union','japon','japones',
  'india','indio','paraguay','uruguayo','uruguay','bolivia','boliviano',
  'venezuela','venezolano','ecuador','ecuatoriano','alemania','espana',
  'italia','francia','portugal',
  'arancel','arancelario','ncm','naladisa','incoterm','fob','cif','cfr',
  'exw','dap','ddu','ddp','documentacion','documento','despacho',
  'aduana','aduanero','despachante','certificado','licencia','permiso',
  'registro','habilitacion','vuce','senasa','anmat','inal','anac',
  'requerimiento','requisito','tramite','procedimiento','proceso',
  'impuesto','tasa','derecho','gravamen','tributo','alicuota',
  'preferencia','acuerdo','mercosur','tratado','tlc','ace',
  'exportacion','importacion','operacion','comercio','exterior',
  'internacional','embarque','carga','flete','seguro','transporte',
  'factura','invoice','packing','lista','bill','lading',
  'para','desde','hacia','hasta','entre','sobre','bajo','ante',
  'con','sin','por','del','los','las','una','unos','unas',
  'este','esta','estos','estas','ese','esa','esos','esas',
  'cual','cuales','como','cuando','donde','porque','pero','sino',
  'que','quien','quienes','cuanto','cuanta',
  'informacion','info','datos','detalle','detalles',
])

function quitarTildes(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/**
 * Extrae términos de producto significativos de una pregunta en lenguaje natural,
 * removiendo stop words de comercio exterior.
 * @param {string} textoPregunta
 * @returns {string} — términos relevantes separados por espacios
 */
export function extraerTerminosProducto(textoPregunta) {
  if (!textoPregunta) return ''
  const palabrasOriginales = textoPregunta.trim().split(/\s+/)
  if (palabrasOriginales.length <= 4) return textoPregunta
  const palabras = quitarTildes(textoPregunta)
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .split(/\s+/)
    .filter((p) => p.length > 2 && !STOP_WORDS_COMERCIO.has(p))
  if (palabras.length === 0) return textoPregunta
  return palabras.join(' ')
}

// ─────────────────────────────────────────────
// FTS — columna "descripcion" (nuevo schema)
// ─────────────────────────────────────────────
async function buscarPorFTS(supabase, texto) {
  const terminosLimpios = extraerTerminosProducto(texto)
  const terminoFTS = terminosLimpios.replace(/['"\\;:!?()]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!terminoFTS) return []

  const { data, error } = await supabase
    .from('ncm')
    .select(NCM_SELECT)
    .textSearch('descripcion', terminoFTS, { type: 'websearch', config: 'spanish' })
    .limit(5)

  if (error) {
    console.warn('[ncm-lookup] FTS falló, usando ILIKE:', error.message)
    return null
  }
  return (data ?? []).map(enriquecerRow)
}

async function buscarPorILIKE(supabase, texto) {
  const terminosLimpios = extraerTerminosProducto(texto)
  const palabras = terminosLimpios
    .toLowerCase()
    .replace(/[^a-záéíóúüñ\s]/gi, ' ')
    .split(/\s+/)
    .filter((p) => p.length > 3)
    .sort((a, b) => b.length - a.length)
    .slice(0, 3)

  if (palabras.length === 0) return []

  const busquedas = palabras.map((palabra) =>
    supabase.from('ncm').select(NCM_SELECT).ilike('descripcion', `%${palabra}%`).limit(5)
  )

  const resultados = await Promise.all(busquedas)
  const vistos = new Set()
  const combinados = []
  for (const { data, error } of resultados) {
    if (error) continue
    for (const fila of data ?? []) {
      if (!vistos.has(fila.codigo_ncm)) {
        vistos.add(fila.codigo_ncm)
        combinados.push(enriquecerRow(fila))
      }
    }
  }
  return combinados.slice(0, 5)
}

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────
/**
 * Busca posiciones NCM a partir de texto libre o código.
 * Estrategia: código exacto → FTS → ILIKE fallback.
 * @param {string} textoPregunta — texto libre o código NCM
 * @returns {Promise<Array<{codigo_ncm: string, descripcion: string, arancel_extrazona: number, _fuenteBusqueda: string}>>}
 */
export async function buscarNCM(textoPregunta) {
  if (!textoPregunta || typeof textoPregunta !== 'string') return []

  const supabase = getServiceClient()

  const codigoDetectado = extraerCodigoNCM(textoPregunta)
  if (codigoDetectado) {
    try {
      const resultados = await buscarPorCodigo(supabase, codigoDetectado)
      if (resultados.length > 0) return resultados.map(r => ({ ...r, _fuenteBusqueda: 'codigo' }))
    } catch (err) {
      console.error('[ncm-lookup] Error en búsqueda por código:', err)
    }
  }

  try {
    const resultadosFTS = await buscarPorFTS(supabase, textoPregunta)
    if (resultadosFTS !== null && resultadosFTS.length > 0)
      return resultadosFTS.map(r => ({ ...r, _fuenteBusqueda: 'fts' }))
  } catch (err) {
    console.error('[ncm-lookup] Error en FTS:', err)
  }

  try {
    const resultados = await buscarPorILIKE(supabase, textoPregunta)
    return resultados.map(r => ({ ...r, _fuenteBusqueda: 'ilike' }))
  } catch (err) {
    console.error('[ncm-lookup] Error en ILIKE fallback:', err)
    return []
  }
}

// ─────────────────────────────────────────────
// FORMATEADORES PARA PROMPT DEL AGENTE
// ─────────────────────────────────────────────
/**
 * Formatea resultados de búsqueda NCM como bloque de texto para inyectar en prompt de Claude.
 * @param {Array} resultados — output de buscarNCM()
 * @param {{ esNaladisa?: boolean }} options
 * @returns {string}
 */
export function formatearResultadosNCM(resultados, { esNaladisa = false } = {}) {
  if (!resultados || resultados.length === 0) return ''

  const etiquetaCodigo = esNaladisa ? 'NALADISA' : 'NCM'
  const notaNaladisa = esNaladisa
    ? '\n⚠️  Nota: este código figura como NALADISA en el acuerdo comercial. Puede diferir del NCM argentino vigente — verificar con un despachante.'
    : ''

  const filas = resultados.map((r) => {
    const display = r.ncm_code || formatearNCMDisplay(r.codigo_ncm)
    const desc = r.description || r.descripcion
    const lineas = [
      `${etiquetaCodigo} ${display}: ${desc}`,
      `  Arancel extrazona (DIE): ${r.arancel_extrazona ?? '-'}% | Arancel intrazona (DII): ${r.arancel_intrazona ?? '-'}%`,
      `  IVA importación: ${r.iva_importacion ?? '-'}% | Tasa estadística: ${r.tasa_estadistica ?? '-'}%`,
    ]
    return lineas.join('\n')
  })

  return (
    '[NCM_DATA]\n' +
    '(Fuente: Nomenclatura Común MERCOSUR — ARCA/Aduana Argentina)\n' +
    notaNaladisa + '\n\n' +
    filas.join('\n\n')
  )
}

export function formatearPreferenciaSinNcm({ ncm_naladisa, acuerdo_id, pais, tipo }) {
  return (
    `[NALADISA_SIN_DATOS_ARANCEL]\n` +
    `NALADISA ${ncm_naladisa} — código de versión anterior de nomenclatura.\n` +
    `No tiene equivalente en el NCM argentino vigente.\n` +
    `Acuerdo: ${acuerdo_id} | País: ${pais} | Tipo: ${tipo}\n` +
    `⚠️  Para conocer el arancel base de este producto, consultá la nomenclatura actualizada con un despachante de aduana.`
  )
}
