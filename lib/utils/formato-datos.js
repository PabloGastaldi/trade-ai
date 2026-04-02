/**
 * Limpia descripciones NCM que vienen del scraper con caracteres rotos.
 */
export function limpiarDescripcion(desc) {
  if (!desc) return ''
  return desc
    .replace(/\+/g, ' ')
    .replace(/\?/g, '')
    .replace(/;+/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-,]+/, '')
    .replace(/[\s,]+$/, '')
    .trim()
}

/**
 * Devuelve true si el valor es null/undefined/vacío/nan/null string.
 */
export function esValorVacio(val) {
  if (!val && val !== 0) return true
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase()
    return lower === '' || lower === 'nan' || lower === 'null' || lower === 'undefined'
  }
  return false
}

/**
 * Agrupa acuerdos por país + código, quedándose con el mayor porcentaje.
 * Ordena de mayor a menor preferencia.
 */
export function agruparAcuerdos(acuerdos) {
  if (!acuerdos?.length) return []

  const agrupados = new Map()

  for (const ac of acuerdos) {
    const key = `${ac.pais}-${ac.codigo_acuerdo ?? ac.acuerdo ?? ac.tipo}`
    if (!agrupados.has(key)) {
      agrupados.set(key, {
        pais: ac.pais,
        bloque: ac.bloque,
        codigo_acuerdo: ac.codigo_acuerdo ?? ac.acuerdo ?? ac.tipo,
        porcentaje: ac.porcentaje ?? (ac.esCoberturaTotal ? 100 : 0),
        esCoberturaTotal: ac.esCoberturaTotal ?? false,
      })
    } else {
      const existing = agrupados.get(key)
      const pct = ac.porcentaje ?? (ac.esCoberturaTotal ? 100 : 0)
      if (pct > existing.porcentaje) {
        existing.porcentaje = pct
      }
    }
  }

  return Array.from(agrupados.values())
    .sort((a, b) => b.porcentaje - a.porcentaje || a.pais.localeCompare(b.pais))
}

/**
 * Mapeo de códigos NTM UNCTAD a descripciones en español.
 */
const NTM_TIPOS = {
  // Letras (categorías principales)
  'A': 'Sanitarias y fitosanitarias (SPS)',
  'B': 'Obstáculos técnicos al comercio (TBT)',
  'C': 'Inspección previa a expedición',
  'D': 'Medidas antidumping / compensatorias',
  'E': 'Licencias no automáticas / cuotas',
  'F': 'Cargas y medidas fiscales',
  'G': 'Medidas financieras',
  'H': 'Medidas anticompetitivas',
  'I': 'Medidas de inversión (TRIM)',
  'J': 'Distribución y restricciones de posventas',
  'K': 'Restricciones a la competencia',
  'L': 'Subsidios e incentivos exportación',
  'M': 'Restricciones a exportaciones',
  'N': 'Impuestos / cargas a exportaciones',
  'O': 'Prohibiciones de exportación',
  'P': 'Medidas de exportación',
  // Subcódigos comunes
  'F12': 'Cargas adicionales (impuestos internos)',
  'F61': 'Depósito previo de importación',
  'G4':  'Requisitos de financiamiento',
  // Siglas legacy
  'SPS': 'Medidas sanitarias y fitosanitarias',
  'TBT': 'Obstáculos técnicos al comercio',
  'PSI': 'Inspección previa a la expedición',
  'QR':  'Restricciones cuantitativas',
  'PC':  'Control de precios',
  'OTH': 'Otras medidas',
  'EXP': 'Medidas relacionadas con exportaciones',
  'INS': 'Medidas de inspección',
  'LIC': 'Licencias de importación',
}

export function traducirNTM(codigo) {
  if (!codigo) return codigo
  return NTM_TIPOS[codigo] || NTM_TIPOS[codigo[0]] || codigo
}

/**
 * Mapeo ISO3 → nombre en español para los países más comunes.
 * Se usa como fallback cuando no tenemos country_codes disponible.
 */
const ISO3_A_ESPAÑOL = {
  ARG: 'Argentina',
  BRA: 'Brasil',
  CHL: 'Chile',
  PRY: 'Paraguay',
  URY: 'Uruguay',
  BOL: 'Bolivia',
  PER: 'Perú',
  COL: 'Colombia',
  ECU: 'Ecuador',
  VEN: 'Venezuela',
  MEX: 'México',
  USA: 'Estados Unidos',
  CAN: 'Canadá',
  CHN: 'China',
  JPN: 'Japón',
  KOR: 'Corea del Sur',
  IND: 'India',
  AUS: 'Australia',
  NZL: 'Nueva Zelanda',
  GBR: 'Reino Unido',
  DEU: 'Alemania',
  FRA: 'Francia',
  ITA: 'Italia',
  ESP: 'España',
  PRT: 'Portugal',
  NLD: 'Países Bajos',
  BEL: 'Bélgica',
  CHE: 'Suiza',
  AUT: 'Austria',
  SWE: 'Suecia',
  NOR: 'Noruega',
  DNK: 'Dinamarca',
  FIN: 'Finlandia',
  POL: 'Polonia',
  RUS: 'Rusia',
  TUR: 'Turquía',
  SAU: 'Arabia Saudita',
  ARE: 'Emiratos Árabes',
  ZAF: 'Sudáfrica',
  NGA: 'Nigeria',
  EGY: 'Egipto',
  MAR: 'Marruecos',
  VNM: 'Vietnam',
  THA: 'Tailandia',
  MYS: 'Malasia',
  IDN: 'Indonesia',
  SGP: 'Singapur',
  PHL: 'Filipinas',
  TWN: 'Taiwán',
  HKG: 'Hong Kong',
  PAK: 'Pakistán',
  BGD: 'Bangladesh',
  EU:  'Unión Europea',
  EUN: 'Unión Europea',
}

export function resolverNombrePais(iso3) {
  if (!iso3) return iso3
  return ISO3_A_ESPAÑOL[iso3.toUpperCase()] || iso3
}

/**
 * Traduce nombres de países en inglés a español.
 * Para los casos que llegan como strings largos desde destination_tariffs.
 */
const NOMBRE_EN_A_ES = {
  'Korea, Republic of': 'Corea del Sur',
  'Korea, Dem. Rep.': 'Corea del Norte',
  'Russian Federation': 'Rusia',
  'United States': 'Estados Unidos',
  'United Kingdom': 'Reino Unido',
  'United Arab Emirates': 'Emiratos Árabes',
  'Saudi Arabia': 'Arabia Saudita',
  'South Africa': 'Sudáfrica',
  'New Zealand': 'Nueva Zelanda',
  'Czech Republic': 'República Checa',
  "Côte d'Ivoire": 'Costa de Marfil',
  'Trinidad and Tobago': 'Trinidad y Tobago',
  'Dominican Republic': 'República Dominicana',
  'Papua New Guinea': 'Papúa Nueva Guinea',
  'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
  'North Macedonia': 'Macedonia del Norte',
  'Moldova, Republic of': 'Moldavia',
  'Iran, Islamic Rep.': 'Irán',
  'Syrian Arab Republic': 'Siria',
  'Viet Nam': 'Vietnam',
  'Hong Kong, China': 'Hong Kong',
  'Macao, China': 'Macao',
  'Lao PDR': 'Laos',
  'Myanmar': 'Myanmar',
  'Tanzania, United Rep.': 'Tanzania',
  'Congo, Dem. Rep.': 'Congo (Rep. Dem.)',
  'Egypt, Arab Rep.': 'Egipto',
  'Venezuela, RB': 'Venezuela',
  'Bahamas, The': 'Bahamas',
  'Gambia, The': 'Gambia',
}

export function traducirNombrePais(nombre) {
  if (!nombre) return nombre
  return NOMBRE_EN_A_ES[nombre] || nombre
}
