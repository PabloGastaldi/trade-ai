// lib/calc-limit.js
//
// Verifica y registra el uso de la calculadora por usuario.
// Comparte el ciclo de reset mensual con queries_this_month
// (columna queries_reset_date en users_profile).
//
// Uso:
//   const { permitido, motivo } = await verificarLimiteCalc(supabase, userId)
//   if (!permitido) return NextResponse.json({ error: motivo }, { status: 403 })
//   // ... hacer el cálculo ...
//   await registrarCalc(supabase, userId)

// Límites de cálculos por plan
const LIMITES_CALC = {
  free:    5,
  pro:     Infinity,
  empresa: Infinity,
}

/**
 * Verifica si el usuario puede hacer un cálculo.
 * Aplica el reset mensual on-the-fly si la fecha de reset ya pasó.
 *
 * @param {object} supabase — cliente Supabase con contexto de sesión del usuario
 * @param {string} userId
 * @returns {{ permitido: boolean, motivo?: string, calcsEsteMes: number, limite: number }}
 */
export async function verificarLimiteCalc(supabase, userId) {
  const { data: perfil, error } = await supabase
    .from('users_profile')
    .select('plan_type, calcs_this_month, queries_reset_date')
    .eq('id', userId)
    .single()

  if (error || !perfil) {
    // Si no se puede leer el perfil, dejar pasar (no bloquear por error técnico)
    return { permitido: true, calcsEsteMes: 0, limite: LIMITES_CALC.free }
  }

  const plan   = perfil.plan_type ?? 'free'
  const limite = LIMITES_CALC[plan] ?? LIMITES_CALC.free
  const ahora  = new Date()
  const fechaReset = perfil.queries_reset_date ? new Date(perfil.queries_reset_date) : null

  let calcsEsteMes = perfil.calcs_this_month ?? 0

  // Reset on-the-fly si el ciclo mensual venció
  if (fechaReset && ahora >= fechaReset) {
    const proximoReset = new Date(fechaReset)
    while (proximoReset <= ahora) {
      proximoReset.setMonth(proximoReset.getMonth() + 1)
    }
    await supabase
      .from('users_profile')
      .update({ calcs_this_month: 0, queries_reset_date: proximoReset.toISOString() })
      .eq('id', userId)
    calcsEsteMes = 0
  }

  if (limite !== Infinity && calcsEsteMes >= limite) {
    return {
      permitido: false,
      motivo: `Alcanzaste el límite de ${limite} cálculos mensuales del plan ${plan === 'free' ? 'gratuito' : plan}. Actualizá a Pro para cálculos ilimitados.`,
      calcsEsteMes,
      limite,
      limitAlcanzado: true,
    }
  }

  return { permitido: true, calcsEsteMes, limite }
}

/**
 * Incrementa el contador de cálculos del usuario en 1.
 * Llamar DESPUÉS de que el cálculo se ejecutó exitosamente.
 */
export async function registrarCalc(supabase, userId) {
  await supabase.rpc('increment_calcs', { user_id: userId })
}
