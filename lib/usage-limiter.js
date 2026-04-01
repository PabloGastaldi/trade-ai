// lib/usage-limiter.js
//
// Verifica y registra el uso mensual de features con límite por plan.
// Usa columnas en users_profile (mismo patrón que queries_this_month y calcs_this_month).
// El reset mensual se delega a la columna queries_reset_date (compartida).
//
// Features soportadas: 'simulador' | 'comparador' | 'nomenclador' | 'operaciones'
// (consulta y calculadora tienen su propio módulo legado)

import { getPlanConfig } from './plans-config'

// Mapeo feature → columna en users_profile y RPC de incremento
const FEATURE_MAP = {
  simulador:   { column: 'simulador_this_month',   rpc: 'increment_simulador' },
  comparador:  { column: 'comparador_this_month',  rpc: 'increment_comparador' },
  nomenclador: { column: 'nomenclador_this_month', rpc: 'increment_nomenclador' },
  operaciones: { column: 'operaciones_this_month', rpc: 'increment_operaciones' },
}

/**
 * Verifica si el usuario puede usar una feature.
 * Aplica reset mensual on-the-fly si queries_reset_date ya pasó.
 *
 * @param {object} supabase — cliente Supabase con sesión del usuario
 * @param {string} userId
 * @param {'simulador'|'comparador'|'nomenclador'|'operaciones'} feature
 * @returns {{ permitido: boolean, motivo?: string, usado: number, limite: number|null, limitAlcanzado?: boolean }}
 */
export async function verificarLimite(supabase, userId, feature) {
  const featureInfo = FEATURE_MAP[feature]
  if (!featureInfo) {
    // Feature desconocida — dejar pasar
    return { permitido: true, usado: 0, limite: null }
  }

  const { data: perfil, error } = await supabase
    .from('users_profile')
    .select(`plan_type, ${featureInfo.column}, queries_reset_date`)
    .eq('id', userId)
    .single()

  if (error || !perfil) {
    // No bloquear por error técnico
    return { permitido: true, usado: 0, limite: null }
  }

  const planId = perfil.plan_type ?? 'free'
  const planConfig = getPlanConfig(planId)
  const featureLimits = planConfig.limits[feature]
  const limite = featureLimits?.monthly ?? null

  // Sin límite para este plan
  if (limite === null) {
    return { permitido: true, usado: perfil[featureInfo.column] ?? 0, limite: null }
  }

  const ahora = new Date()
  const fechaReset = perfil.queries_reset_date ? new Date(perfil.queries_reset_date) : null

  let usado = perfil[featureInfo.column] ?? 0

  // Reset on-the-fly si el ciclo mensual venció
  if (fechaReset && ahora >= fechaReset) {
    const proximoReset = new Date(fechaReset)
    while (proximoReset <= ahora) {
      proximoReset.setMonth(proximoReset.getMonth() + 1)
    }
    await supabase
      .from('users_profile')
      .update({
        queries_this_month:     0,
        calcs_this_month:       0,
        simulador_this_month:   0,
        comparador_this_month:  0,
        nomenclador_this_month: 0,
        operaciones_this_month: 0,
        queries_reset_date: proximoReset.toISOString(),
      })
      .eq('id', userId)
    usado = 0
  }

  if (usado >= limite) {
    const planLabel = planId === 'free' ? 'gratuito' : planId
    return {
      permitido: false,
      motivo: `Alcanzaste el límite de ${limite} ${featureLimits.label} del plan ${planLabel}. Actualizá a Pro para acceso ilimitado.`,
      usado,
      limite,
      limitAlcanzado: true,
    }
  }

  return { permitido: true, usado, limite }
}

/**
 * Registra un uso. Llamar DESPUÉS de que la operación se ejecutó exitosamente.
 * Usa RPC para incremento atómico.
 *
 * @param {object} supabase
 * @param {string} userId
 * @param {'simulador'|'comparador'|'nomenclador'|'operaciones'} feature
 */
export async function registrarUso(supabase, userId, feature) {
  const featureInfo = FEATURE_MAP[feature]
  if (!featureInfo) return

  await supabase.rpc(featureInfo.rpc, { user_id: userId })
}
