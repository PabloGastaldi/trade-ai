/**
 * lib/destination-tariffs-lookup.js
 *
 * Helper centralizado para consultar destination_tariffs.
 * Normaliza las columnas ave_pct/partner_iso3 y ave_rate/reporting_country
 * en un objeto uniforme para todos los consumidores.
 */

/**
 * Busca el arancel en destino para un HS6 y país específico.
 *
 * @param {object} supabase - cliente Supabase
 * @param {string} hs6 - código HS a 6 dígitos
 * @param {string} paisISO3 - código ISO3 del país destino
 * @returns {Promise<object|null>}
 */
export async function buscarArancelDestino(supabase, hs6, paisISO3) {
  const { data, error } = await supabase
    .from('destination_tariffs')
    .select('*')
    .eq('hs_code', hs6)
    .eq('partner_iso3', paisISO3)
    .order('year', { ascending: false })
    .limit(1)

  if (error) {
    console.warn('[destination-tariffs] Error consultando:', error.message)
    return null
  }
  if (!data?.length) return null

  const row = data[0]
  return {
    hs_code: row.hs_code,
    pais_iso3: row.partner_iso3,
    pais_nombre: row.reporting_country,
    arancel_pct: row.ave_pct ?? row.ave_rate ?? 0,
    lineas_arancelarias: row.num_tariff_lines,
    anio: row.year,
    fuente: row.source,
  }
}

/**
 * Busca aranceles en destino para múltiples países (usado por comparador).
 * Devuelve un registro por país (el más reciente disponible).
 *
 * @param {object} supabase - cliente Supabase
 * @param {string} hs6 - código HS a 6 dígitos
 * @param {string[]} paisesISO3 - array de códigos ISO3
 * @returns {Promise<Array>}
 */
export async function buscarArancelesMultiplesPaises(supabase, hs6, paisesISO3) {
  if (!paisesISO3?.length) return []

  const { data, error } = await supabase
    .from('destination_tariffs')
    .select('*')
    .eq('hs_code', hs6)
    .in('partner_iso3', paisesISO3)

  if (error) {
    console.warn('[destination-tariffs] Error consultando múltiples países:', error.message)
    return []
  }

  // Agrupar por país, quedarse con el año más reciente
  const porPais = {}
  for (const row of data || []) {
    const key = row.partner_iso3
    if (!porPais[key] || row.year > porPais[key].year) {
      porPais[key] = row
    }
  }

  return Object.values(porPais).map((row) => ({
    hs_code: row.hs_code,
    pais_iso3: row.partner_iso3,
    pais_nombre: row.reporting_country,
    arancel_pct: row.ave_pct ?? row.ave_rate ?? 0,
    lineas_arancelarias: row.num_tariff_lines,
    anio: row.year,
    fuente: row.source,
  }))
}
