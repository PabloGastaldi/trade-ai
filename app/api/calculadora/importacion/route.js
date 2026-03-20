import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcularImportacion } from '@/lib/calculadora/calc-importacion'
import { verificarLimiteCalc, registrarCalc } from '@/lib/calc-limit'

// POST /api/calculadora/importacion
// Ejecuta el cálculo server-side (tiene acceso a SUPABASE_SERVICE_ROLE_KEY)
// y devuelve los resultados para los 4 regímenes en paralelo.

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { permitido, motivo, limitAlcanzado } = await verificarLimiteCalc(supabase, user.id)
  if (!permitido) {
    return NextResponse.json({ error: motivo, limitAlcanzado }, { status: 403 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const {
    ncm_code,
    valor_fob,
    flete_internacional = 0,
    seguro_internacional = null,
    pais_origen = null,
    condicion_iva = 'responsable_inscripto',
  } = body

  if (!ncm_code) return NextResponse.json({ error: 'ncm_code requerido' }, { status: 400 })
  if (typeof valor_fob !== 'number' || valor_fob <= 0) {
    return NextResponse.json({ error: 'valor_fob debe ser mayor a 0' }, { status: 400 })
  }

  const regimenes = ['general', 'courier', 'pef', 'correo_upu']

  // Calcular los 4 regímenes en paralelo
  const resultados = await Promise.allSettled(
    regimenes.map(regimen =>
      calcularImportacion({
        ncm_code,
        valor_fob,
        flete_internacional,
        seguro_internacional,
        pais_origen,
        regimen,
        condicion_iva,
      })
    )
  )

  const respuesta = {}
  for (let i = 0; i < regimenes.length; i++) {
    const r = resultados[i]
    respuesta[regimenes[i]] = r.status === 'fulfilled'
      ? { ok: true, data: r.value }
      : { ok: false, error: r.reason?.message ?? 'Error de cálculo' }
  }

  // Registrar uso solo si al menos el régimen general calculó bien
  if (respuesta.general?.ok) {
    await registrarCalc(supabase, user.id)
  }

  return NextResponse.json(respuesta)
}
