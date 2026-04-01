// lib/plans-config.js
// Fuente de verdad para límites de plan en todo trade.ai.
// null = sin límite.

export const PLANS = {
  free: {
    name: 'Gratuito',
    price: 0,
    limits: {
      consulta:    { monthly: 3,    label: '3 consultas/mes' },
      simulador:   { monthly: 1,    label: '1 simulación de prueba' },
      calculadora: { monthly: 1,    label: '1 cálculo de prueba' },
      comparador:  { monthly: 1,    label: '1 comparación de prueba' },
      operaciones: { monthly: 1,    label: '1 operación de prueba' },
      nomenclador: { monthly: 5,    label: '5 búsquedas/mes' },
      catalogo:    { total: 3,      label: '3 productos' },   // total, no mensual
      mercados:    { monthly: null, label: 'Acceso completo' },
    },
  },
  pro: {
    name: 'Pro',
    price: 15000,
    limits: {
      consulta:    { monthly: null, label: 'Ilimitadas' },
      simulador:   { monthly: null, label: 'Ilimitado' },
      calculadora: { monthly: null, label: 'Ilimitada' },
      comparador:  { monthly: null, label: 'Ilimitado' },
      operaciones: { monthly: null, label: 'Ilimitadas' },
      nomenclador: { monthly: null, label: 'Ilimitado' },
      catalogo:    { total: null,   label: 'Ilimitado' },
      mercados:    { monthly: null, label: 'Acceso completo' },
    },
  },
  empresa: {
    name: 'Empresa',
    price: null,
    limits: {
      consulta:    { monthly: null, label: 'Ilimitadas + prioridad' },
      simulador:   { monthly: null, label: 'Ilimitado' },
      calculadora: { monthly: null, label: 'Ilimitada' },
      comparador:  { monthly: null, label: 'Ilimitado' },
      operaciones: { monthly: null, label: 'Ilimitadas' },
      nomenclador: { monthly: null, label: 'Ilimitado' },
      catalogo:    { total: null,   label: 'Ilimitado' },
      mercados:    { monthly: null, label: 'Acceso completo' },
    },
  },
}

/**
 * Retorna la config del plan. Fallback: free.
 * @param {string} planId — 'free' | 'pro' | 'empresa'
 */
export function getPlanConfig(planId) {
  return PLANS[planId] ?? PLANS.free
}

/**
 * Retorna el límite mensual de una feature para un plan.
 * @returns {number|null} null = sin límite
 */
export function getMonthlyLimit(planId, feature) {
  const plan = getPlanConfig(planId)
  return plan.limits[feature]?.monthly ?? null
}

/**
 * Retorna el límite total (no mensual) de una feature para un plan.
 * Aplica solo a 'catalogo'.
 * @returns {number|null} null = sin límite
 */
export function getTotalLimit(planId, feature) {
  const plan = getPlanConfig(planId)
  return plan.limits[feature]?.total ?? null
}
