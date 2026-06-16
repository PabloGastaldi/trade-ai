import { describe, it, expect, vi } from 'vitest'
import { aplicarResetMensual, RESET_CONTADORES } from '@/lib/monthly-reset.js'

// Mock mínimo de Supabase: captura el payload del .update() y simula la cadena
// from(...).update(payload).eq(...). Devuelve también lo que se intentó escribir.
function makeSupabaseMock() {
  const captured: { payload: any | null } = { payload: null }
  const eq = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn((payload: any) => {
    captured.payload = payload
    return { eq }
  })
  const from = vi.fn(() => ({ update }))
  return { supabase: { from } as any, captured, update, eq }
}

describe('aplicarResetMensual', () => {
  it('no resetea si el ciclo sigue vigente (fecha futura)', async () => {
    const { supabase, update } = makeSupabaseMock()
    const futuro = new Date()
    futuro.setMonth(futuro.getMonth() + 1)

    const reseteo = await aplicarResetMensual(supabase, 'user-1', futuro.toISOString())

    expect(reseteo).toBe(false)
    expect(update).not.toHaveBeenCalled()
  })

  it('inicializa el ciclo para usuario nuevo (sin fecha de reset)', async () => {
    const { supabase, captured, update } = makeSupabaseMock()

    const reseteo = await aplicarResetMensual(supabase, 'user-2', null)

    expect(reseteo).toBe(true)
    expect(update).toHaveBeenCalledTimes(1)
    // Todos los contadores quedan en 0
    for (const col of Object.keys(RESET_CONTADORES)) {
      expect(captured.payload[col]).toBe(0)
    }
    // La nueva fecha de reset queda en el futuro
    expect(new Date(captured.payload.queries_reset_date).getTime()).toBeGreaterThan(Date.now())
  })

  it('resetea y avanza la fecha si el ciclo venció hace poco', async () => {
    const { supabase, captured } = makeSupabaseMock()
    const ayer = new Date()
    ayer.setDate(ayer.getDate() - 1)

    const reseteo = await aplicarResetMensual(supabase, 'user-3', ayer.toISOString())

    expect(reseteo).toBe(true)
    expect(new Date(captured.payload.queries_reset_date).getTime()).toBeGreaterThan(Date.now())
  })

  it('avanza la fecha MÁS ALLÁ de hoy tras varios meses inactivo (regresión del bug de uso gratis)', async () => {
    const { supabase, captured } = makeSupabaseMock()
    // Fecha de reset de hace 3 meses: con el avance de +1 mes (bug viejo) quedaría
    // todavía en el pasado y permitiría resets repetidos. El while debe superarla.
    const haceTresMeses = new Date()
    haceTresMeses.setMonth(haceTresMeses.getMonth() - 3)

    const reseteo = await aplicarResetMensual(supabase, 'user-4', haceTresMeses.toISOString())

    expect(reseteo).toBe(true)
    const nuevaFecha = new Date(captured.payload.queries_reset_date)
    expect(nuevaFecha.getTime()).toBeGreaterThan(Date.now())
  })
})
