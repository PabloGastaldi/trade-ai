import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPlanConfig } from '@/lib/plans-config'

// Whitelists de validación
const VALID_CURRENCIES = ['USD', 'EUR', 'ARS']
const VALID_INCOTERMS  = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CIP', 'DAP', 'DPU', 'DDP']

// POST /api/catalogo — inserta un producto validando el límite del plan
export async function POST(request) {
  const supabase = await createClient()

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Leer perfil para saber el plan
  const { data: perfil, error: perfilError } = await supabase
    .from('users_profile')
    .select('plan_type')
    .eq('id', user.id)
    .single()

  if (perfilError || !perfil) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  const plan = perfil.plan_type ?? 'free'
  const planConfig = getPlanConfig(plan)
  const limiteTotal = planConfig.limits.catalogo.total
  const limite = limiteTotal ?? Infinity

  // Contar productos activos del usuario
  const { count, error: countError } = await supabase
    .from('user_products')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (countError) {
    return NextResponse.json({ error: 'Error al verificar límite' }, { status: 500 })
  }

  if (limite !== Infinity && count >= limite) {
    const label = planConfig.limits.catalogo.label
    const mensajes = {
      free: `El plan gratuito permite hasta ${label}. Actualizá a Pro para acceso ilimitado.`,
      pro:  `El plan Pro no tiene límite de productos. Contactanos para el plan Empresa.`,
    }
    return NextResponse.json(
      { error: mensajes[plan] ?? `Límite de ${label} alcanzado`, limitAlcanzado: true },
      { status: 429 }
    )
  }

  // Parsear y validar body
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { name, operation_type, ncm_code, unit_price, currency, incoterm,
          weight_kg, default_origin, default_destination, description } = body

  if (!name?.trim()) return NextResponse.json({ error: 'name requerido' }, { status: 400 })
  if (!ncm_code?.trim()) return NextResponse.json({ error: 'ncm_code requerido' }, { status: 400 })
  if (!unit_price || Number(unit_price) <= 0) return NextResponse.json({ error: 'unit_price inválido' }, { status: 400 })
  if (!incoterm) return NextResponse.json({ error: 'incoterm requerido' }, { status: 400 })
  if (!['exportacion', 'importacion'].includes(operation_type)) {
    return NextResponse.json({ error: 'operation_type inválido' }, { status: 400 })
  }
  if (currency && !VALID_CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: 'Moneda no válida' }, { status: 400 })
  }
  if (!VALID_INCOTERMS.includes(incoterm)) {
    return NextResponse.json({ error: 'Incoterm no válido' }, { status: 400 })
  }

  // Verificar que el NCM existe en la tabla ncm
  const { data: ncmRow, error: ncmError } = await supabase
    .from('ncm')
    .select('ncm_code')
    .eq('ncm_code', ncm_code.trim())
    .single()

  if (ncmError || !ncmRow) {
    return NextResponse.json({ error: `NCM "${ncm_code}" no encontrado en la nomenclatura` }, { status: 400 })
  }

  // Insertar — user_id se fuerza desde el servidor (nunca del body)
  const { data, error: insertError } = await supabase
    .from('user_products')
    .insert({
      user_id:             user.id,
      name:                name.trim(),
      operation_type,
      ncm_code:            ncm_code.trim(),
      unit_price:          Number(unit_price),
      currency:            currency ?? 'USD',
      incoterm,
      weight_kg:           weight_kg ? Number(weight_kg) : null,
      default_origin:      default_origin || null,
      default_destination: default_destination || null,
      description:         description?.trim() || null,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[catalogo] Error al insertar producto:', insertError.message)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }

  return NextResponse.json({ producto: data }, { status: 201 })
}
