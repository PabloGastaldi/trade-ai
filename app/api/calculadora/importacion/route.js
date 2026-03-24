import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { calcularImportacion } from '@/lib/calculadora/calc-importacion'
import { verificarLimiteCalc, registrarCalc } from '@/lib/calc-limit'

export async function POST(request) {
  const supabaseUser = await createClient()
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { permitido, motivo, limitAlcanzado } = await verificarLimiteCalc(supabaseUser, user.id)
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

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  try {
    const resultado = await calcularImportacion(serviceClient, {
      ncm_code,
      valor_fob,
      flete_internacional,
      seguro_internacional,
      pais_origen_iso3: pais_origen,
      condicion_iva,
    })
    if (resultado.error) {
      return NextResponse.json({ ok: false, error: resultado.error }, { status: 400 })
    }
    await registrarCalc(supabaseUser, user.id)
    return NextResponse.json({ ok: true, data: resultado })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message ?? 'Error de cálculo' }, { status: 400 })
  }
}
