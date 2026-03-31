import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcularExportacion } from '@/lib/calculadora/calc-exportacion'
import { verificarLimiteCalc, registrarCalc } from '@/lib/calc-limit'

// POST /api/calculadora/exportacion
// Ejecuta el cálculo server-side y devuelve el resultado estructurado.

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
    precio_producto,
    incoterm_base = 'FOB',
    incoterm_deseado = 'FOB',
    pais_destino = null,
    cantidad = 1,
    flete_interno = null,
    flete_internacional = null,
    seguro_internacional = null,
    gastos_portuarios = null,
    gastos_aduana_exportacion = null,
    bonus_reintegro = false,
    pais_facturacion_diferente = false,
  } = body

  if (!ncm_code) return NextResponse.json({ error: 'ncm_code requerido' }, { status: 400 })
  if (typeof precio_producto !== 'number' || precio_producto <= 0) {
    return NextResponse.json({ error: 'precio_producto debe ser mayor a 0' }, { status: 400 })
  }

  try {
    const resultado = await calcularExportacion({
      ncm_code,
      precio_producto,
      incoterm_base,
      incoterm_deseado,
      pais_destino,
      cantidad,
      flete_interno,
      flete_internacional,
      seguro_internacional,
      gastos_portuarios,
      gastos_aduana_exportacion,
      bonus_reintegro,
      pais_facturacion_diferente,
    })
    await registrarCalc(supabase, user.id)
    return NextResponse.json({ ok: true, data: resultado })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 })
  }
}
