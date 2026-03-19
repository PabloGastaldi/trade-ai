import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────
// MAPEO NOMBRE DE PAÍS (en español coloquial) → ISO3
//
// Usado para convertir el campo `destino` que devuelve Haiku
// ("China", "Estados Unidos") al código ISO3 que usa ntm_measures.
// ─────────────────────────────────────────────
const PAIS_A_ISO3 = {
  // América del Sur
  argentina: 'ARG', brasil: 'BRA', chile: 'CHL', uruguay: 'URY',
  paraguay: 'PRY', bolivia: 'BOL', peru: 'PER', colombia: 'COL',
  ecuador: 'ECU', venezuela: 'VEN', panama: 'PAN',
  // América del Norte
  'estados unidos': 'USA', 'eeuu': 'USA', 'usa': 'USA',
  mexico: 'MEX', canada: 'CAN',
  // Europa
  'union europea': 'EUN', 'ue': 'EUN', europa: 'EUN',
  alemania: 'DEU', francia: 'FRA', italia: 'ITA', españa: 'ESP',
  'reino unido': 'GBR', 'gran bretana': 'GBR',
  portugal: 'PRT', suecia: 'SWE', noruega: 'NOR', suiza: 'CHE',
  // Asia
  china: 'CHN', japon: 'JPN', 'corea del sur': 'KOR', corea: 'KOR',
  india: 'IND', tailandia: 'THA', vietnam: 'VNM',
  // Oceanía
  australia: 'AUS', 'nueva zelanda': 'NZL',
  // Otros
  rusia: 'RUS', turquia: 'TUR', israel: 'ISR',
  'sudafrica': 'ZAF', marruecos: 'MAR', egipto: 'EGY',
}

export function resolverISO3(nombrePais) {
  if (!nombrePais) return null
  const normalizado = nombrePais
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .trim()
  return PAIS_A_ISO3[normalizado] ?? null
}

// ─────────────────────────────────────────────
// CLIENTE SUPABASE CON SERVICE ROLE
// ─────────────────────────────────────────────
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ─────────────────────────────────────────────
// MAPEO DE CÓDIGOS NTM A NOMBRES LEGIBLES
//
// Se mapea por la primera letra del código.
// Ej: "A11" → "Sanitaria/Fitosanitaria (SPS)"
//     "B7"  → "Barrera técnica (TBT)"
// ─────────────────────────────────────────────
const NTM_CATEGORIAS = {
  A: 'Sanitaria/Fitosanitaria (SPS)',
  B: 'Barrera técnica (TBT)',
  C: 'Inspección previa al embarque',
  D: 'Medidas contingentes de comercio',
  E: 'Licencias, cuotas, prohibiciones',
  F: 'Control de precios',
  G: 'Medidas financieras',
  H: 'Medidas anticompetitivas',
  I: 'Medidas de inversión',
  J: 'Restricciones de distribución',
  K: 'Restricciones post-venta',
  L: 'Subsidios',
  M: 'Obstáculos de gobierno',
  N: 'Propiedad intelectual',
  O: 'Reglas de origen',
  P: 'Medida de exportación',
}

function resolverCategoria(ntmCode) {
  if (!ntmCode) return 'Sin clasificar'
  const letra = ntmCode.charAt(0).toUpperCase()
  return NTM_CATEGORIAS[letra] ?? `Categoría ${letra}`
}

function resolverCobertura(row) {
  if (row.ntm_full_coverage === 1) return 'total'
  if (row.ntm_partial_coverage === 1) return 'parcial'
  return 'específica'
}

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL EXPORTADA: buscarBarrerasNTM
//
// Busca barreras no arancelarias para un producto (hs_code)
// agrupadas por país y tipo de medida.
//
// Parámetros:
//   hs_code   — código HS de 6 dígitos (ej: "060290")
//   reporter  — código ISO3 del país que aplica (ej: "USA").
//               Si es null/undefined, devuelve todos los países.
//   direction — "export": barreras que otros le ponen a Argentina
//               "import": barreras que Argentina pone a otros
//
// Retorna array de objetos:
//   [{ pais, iso3, medidas: [{ codigo, tipo, cobertura }] }]
// ─────────────────────────────────────────────
export async function buscarBarrerasNTM(hs_code, { reporter = null, direction = 'export' } = {}) {
  if (!hs_code || typeof hs_code !== 'string') return []

  const codigo = hs_code.trim().replace(/\./g, '')
  if (codigo.length !== 6) return []

  const supabase = getServiceClient()

  let query = supabase
    .from('ntm_measures')
    .select('reporter, partner, ntm_code, ntm_full_coverage, ntm_partial_coverage')
    .eq('hs_code', codigo)
    .eq('ntm_all', 1) // solo filas con al menos una medida activa

  if (direction === 'export') {
    // Barreras que otros países le ponen a Argentina
    query = query.eq('partner', 'ARG')
    if (reporter) query = query.eq('reporter', reporter.toUpperCase())
  } else {
    // Barreras que Argentina pone a otros países
    query = query.eq('reporter', 'ARG')
    if (reporter) query = query.eq('partner', reporter.toUpperCase())
  }

  const { data, error } = await query.limit(500)

  if (error) {
    console.error('[ntm-lookup] Error consultando ntm_measures:', error.message)
    return []
  }

  if (!data || data.length === 0) return []

  // Obtener nombres de países en español para los códigos encontrados
  const codigosPais = direction === 'export'
    ? [...new Set(data.map((r) => r.reporter))]
    : [...new Set(data.map((r) => r.partner))]

  const { data: paises, error: paisesError } = await supabase
    .from('country_codes')
    .select('iso3, name_es')
    .in('iso3', codigosPais)

  if (paisesError) {
    console.warn('[ntm-lookup] Error obteniendo nombres de países:', paisesError.message)
  }

  const nombrePorIso3 = {}
  for (const p of paises ?? []) {
    nombrePorIso3[p.iso3] = p.name_es
  }

  // Agrupar por país
  const porPais = {}

  for (const row of data) {
    const iso3 = direction === 'export' ? row.reporter : row.partner
    const nombre = nombrePorIso3[iso3] ?? iso3 // fallback al código si no está en country_codes

    if (!porPais[iso3]) {
      porPais[iso3] = { pais: nombre, iso3, medidas: [] }
    }

    // Deduplicar por código NTM dentro del mismo país
    const yaExiste = porPais[iso3].medidas.some((m) => m.codigo === row.ntm_code)
    if (!yaExiste) {
      porPais[iso3].medidas.push({
        codigo:    row.ntm_code ?? 'N/D',
        tipo:      resolverCategoria(row.ntm_code),
        cobertura: resolverCobertura(row),
      })
    }
  }

  // Ordenar medidas por código dentro de cada país
  return Object.values(porPais).map((entrada) => ({
    ...entrada,
    medidas: entrada.medidas.sort((a, b) => a.codigo.localeCompare(b.codigo)),
  }))
}

// ─────────────────────────────────────────────
// FORMATEADOR PARA PROMPT DEL AGENTE
//
// Convierte el resultado de buscarBarrerasNTM en un bloque
// de texto listo para inyectar en el prompt de Claude.
// ─────────────────────────────────────────────
export function formatearBarrerasNTM(resultados, { hs_code, direction } = {}) {
  if (!resultados || resultados.length === 0) return ''

  const titulo = direction === 'export'
    ? `[BARRERAS_NO_ARANCELARIAS_EXPORTACION]\n(Medidas que otros países aplican a productos argentinos — HS ${hs_code})`
    : `[BARRERAS_NO_ARANCELARIAS_IMPORTACION]\n(Medidas que Argentina aplica — HS ${hs_code})`

  const lineas = [titulo, '']

  for (const entrada of resultados) {
    lineas.push(`${entrada.pais} (${entrada.iso3}):`)
    for (const m of entrada.medidas) {
      lineas.push(`  • ${m.codigo} — ${m.tipo} [cobertura ${m.cobertura}]`)
    }
    lineas.push('')
  }

  return lineas.join('\n').trim()
}
