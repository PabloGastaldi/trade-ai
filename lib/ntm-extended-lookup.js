/**
 * lib/ntm-extended-lookup.js
 *
 * Lookups para las tablas NTM extendidas:
 *   - ntm_measures_affecting_argentina: barreras que terceros países aplican a productos argentinos
 *   - ntm_measures_applied_by_argentina: barreras que Argentina aplica a importaciones
 *
 * Esquema de ambas tablas: year, hs_code, ntm_code, tipo_medida, cobertura
 * + pais_que_aplica (affecting) / pais_afectado (applied_by)
 */

/**
 * Barreras que otros países aplican a productos argentinos (relevante para exportación).
 *
 * @param {object} supabase - cliente Supabase
 * @param {string} hs6 - código HS a 6 dígitos
 * @param {string} [paisDestino] - ISO3 del país destino (opcional, filtra por país)
 * @returns {Promise<Array>}
 */
export async function buscarBarrerasEnDestino(supabase, hs6, paisDestino) {
  let query = supabase
    .from('ntm_measures_affecting_argentina')
    .select('*')
    .eq('hs_code', hs6)

  if (paisDestino) {
    query = query.eq('pais_que_aplica', paisDestino.toUpperCase())
  }

  const { data, error } = await query.limit(50)
  if (error) {
    console.warn('[ntm-extended] Error en ntm_measures_affecting_argentina:', error.message)
    return []
  }
  return data || []
}

/**
 * Barreras que Argentina aplica a importaciones de cierto origen (relevante para importación).
 *
 * @param {object} supabase - cliente Supabase
 * @param {string} hs6 - código HS a 6 dígitos
 * @param {string} [paisOrigen] - ISO3 del país origen (opcional, filtra por país)
 * @returns {Promise<Array>}
 */
export async function buscarBarrerasArgentinas(supabase, hs6, paisOrigen) {
  let query = supabase
    .from('ntm_measures_applied_by_argentina')
    .select('*')
    .eq('hs_code', hs6)

  if (paisOrigen) {
    query = query.eq('pais_afectado', paisOrigen.toUpperCase())
  }

  const { data, error } = await query.limit(50)
  if (error) {
    console.warn('[ntm-extended] Error en ntm_measures_applied_by_argentina:', error.message)
    return []
  }
  return data || []
}

/**
 * Resumen NTM completo para un producto y país contraparte.
 * Combina ambas tablas según el tipo de operación.
 *
 * @param {object} supabase - cliente Supabase
 * @param {string} hs6 - código HS a 6 dígitos
 * @param {string} paisISO3 - ISO3 del país contraparte
 * @param {'exportacion'|'importacion'} tipoOp
 * @returns {Promise<{ barreras_en_destino: Array, barreras_argentinas: Array, total: number }>}
 */
export async function resumenNTMCompleto(supabase, hs6, paisISO3, tipoOp) {
  const [enDestino, argentinas] = await Promise.all([
    tipoOp === 'exportacion'
      ? buscarBarrerasEnDestino(supabase, hs6, paisISO3)
      : Promise.resolve([]),
    tipoOp === 'importacion'
      ? buscarBarrerasArgentinas(supabase, hs6, paisISO3)
      : Promise.resolve([]),
  ])

  return {
    barreras_en_destino: enDestino,
    barreras_argentinas: argentinas,
    total: enDestino.length + argentinas.length,
  }
}
