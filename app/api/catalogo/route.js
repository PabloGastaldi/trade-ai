import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Límites de productos por plan — FUENTE DE VERDAD SERVER-SIDE
const LIMITES_PRODUCTOS = {
  free:    2,
  pro:     30,
  empresa: Infinity,
}

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
  const limite = LIMITES_PRODUCTOS[plan] ?? LIMITES_PRODUCTOS.free

  // Contar productos activos del usuario
  const { count, error: countError } = await supabase
    .from('user_products')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (countError) {
    return NextResponse.json({ error: 'Error al verificar límite' }, { status: 500 })
  }

  if (count >= limite) {
    const mensajes = {
      free: `El plan gratuito permite hasta ${limite} productos. Actualizá a Pro para agregar hasta 30.`,
      pro:  `El plan Pro permite hasta ${limite} productos. Contactanos para el plan Empresa.`,
    }
    return NextResponse.json(
      { error: mensajes[plan] ?? `Límite de ${limite} productos alcanzado`, limitAlcanzado: true },
      { status: 403 }
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
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ producto: data }, { status: 201 })
}
