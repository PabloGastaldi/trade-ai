/**
 * Límites de operaciones activas por plan.
 * "Activa" = cualquier operación que NO esté en estado cerrado.
 */

const LIMITES_OPERACIONES = {
  free:    1,
  pro:     20,
  empresa: Infinity,
}

const ESTADOS_CERRADOS = ['expo_cerrada', 'impo_cerrada']

/**
 * Verifica si el usuario puede crear una nueva operación.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {{ permitido: boolean, activas: number, limite: number | null }}
 */
export async function verificarLimiteOperaciones(supabase, userId) {
  const { data: perfil } = await supabase
    .from('users_profile')
    .select('plan_type')
    .eq('id', userId)
    .single()

  const plan = perfil?.plan_type ?? 'free'
  const limite = LIMITES_OPERACIONES[plan] ?? 1

  if (limite === Infinity) {
    return { permitido: true, activas: 0, limite: null }
  }

  const { count } = await supabase
    .from('operations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('status', 'in', `(${ESTADOS_CERRADOS.map(s => `"${s}"`).join(',')})`)

  const activas = count ?? 0
  return {
    permitido: activas < limite,
    activas,
    limite,
  }
}
