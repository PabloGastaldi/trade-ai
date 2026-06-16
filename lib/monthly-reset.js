// lib/monthly-reset.js
//
// Fuente única de verdad para el reset mensual de contadores de uso.
// Antes esta lógica estaba triplicada (consulta route, usage-limiter, calc-limit)
// y la copia inline de /api/consulta avanzaba la fecha un solo mes, lo que dejaba
// la fecha de reset en el pasado tras varios meses de inactividad y permitía
// resets repetidos (uso gratis ilimitado). Este módulo unifica el comportamiento.
//
// El ciclo se ancla en la columna compartida users_profile.queries_reset_date.

// Todos los contadores mensuales se resetean juntos.
export const RESET_CONTADORES = {
  queries_this_month:     0,
  calcs_this_month:       0,
  simulador_this_month:   0,
  comparador_this_month:  0,
  nomenclador_this_month: 0,
  operaciones_this_month: 0,
}

/**
 * Aplica el reset mensual on-the-fly si corresponde.
 *
 * - Sin fecha de reset (usuario nuevo): inicializa el ciclo a 1 mes desde hoy.
 * - Ciclo vencido: pone los contadores en 0 y avanza la fecha al próximo ciclo
 *   estrictamente futuro (soporta inactividad de varios meses con un while).
 * - Ciclo vigente: no hace nada.
 *
 * @param {object} supabase — cliente Supabase con permiso de update sobre el perfil
 * @param {string} userId
 * @param {string|null|undefined} queriesResetDate — valor actual de queries_reset_date
 * @returns {Promise<boolean>} true si los contadores quedaron en 0 (reset o init)
 */
export async function aplicarResetMensual(supabase, userId, queriesResetDate) {
  const ahora = new Date()
  const fechaReset = queriesResetDate ? new Date(queriesResetDate) : null

  let proximoReset
  if (!fechaReset) {
    // Usuario nuevo — anclar el ciclo desde hoy
    proximoReset = new Date(ahora)
    proximoReset.setMonth(proximoReset.getMonth() + 1)
  } else if (ahora >= fechaReset) {
    // Ciclo vencido — avanzar hasta el próximo corte futuro
    proximoReset = new Date(fechaReset)
    while (proximoReset <= ahora) {
      proximoReset.setMonth(proximoReset.getMonth() + 1)
    }
  } else {
    // Ciclo vigente — nada que resetear
    return false
  }

  await supabase
    .from('users_profile')
    .update({ ...RESET_CONTADORES, queries_reset_date: proximoReset.toISOString() })
    .eq('id', userId)

  return true
}
