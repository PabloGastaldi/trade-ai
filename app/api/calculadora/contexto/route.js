import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { normalizarCodigoNCM } from '@/lib/ncm-lookup'

// GET /api/calculadora/contexto?tipo=expo|impo&ncm=&pais=
// Devuelve acuerdos comerciales + barreras NTM para enriquecer el resultado
// de la calculadora. El parámetro `tipo` selecciona la dirección:
//   expo → acuerdos_exportacion + ntm_measures_affecting_argentina
//   impo → acuerdos_importacion + ntm_measures_applied_by_argentina

export async function GET(request) {
  try {
  const supabaseUser = await createClient()
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  const ncmRaw = searchParams.get('ncm')
  const paisISO3 = searchParams.get('pais')

  if (tipo !== 'expo' && tipo !== 'impo') {
    return NextResponse.json({ error: 'Parámetro tipo inválido. Usar expo o impo.' }, { status: 400 })
  }

  const vacio = tipo === 'expo'
    ? { acuerdos: [], ntm_destino: [] }
    : { acuerdos: [], ntm: [] }

  if (!ncmRaw || !paisISO3) return NextResponse.json(vacio)

  const normalizado = normalizarCodigoNCM(ncmRaw)
  if (!normalizado) return NextResponse.json(vacio)

  const ncm11 = normalizado.codigoNCM
  const hs6 = ncm11.slice(0, 6)
  const paisUpper = paisISO3.toUpperCase()

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const ntmTable = tipo === 'expo' ? 'ntm_measures_affecting_argentina' : 'ntm_measures_applied_by_argentina'
  const ntmFilter = tipo === 'expo' ? 'pais_que_aplica' : 'pais_afectado'
  const acuerdosTable = tipo === 'expo' ? 'acuerdos_exportacion' : 'acuerdos_importacion'

  const [countryRes, ntmRes] = await Promise.all([
    supabase.from('country_codes').select('name_es').eq('iso3', paisUpper).single(),
    supabase
      .from(ntmTable)
      .select('ntm_code, tipo_medida, cobertura')
      .eq('hs_code', hs6)
      .eq(ntmFilter, paisUpper)
      .limit(20),
  ])

  let acuerdos = []
  if (countryRes.data) {
    const { data } = await supabase
      .from(acuerdosTable)
      .select('bloque, pais, codigo_acuerdo, porcentaje')
      .eq('codigo_ncm', ncm11)
      .ilike('pais', `%${countryRes.data.name_es}%`)
      .order('porcentaje', { ascending: false })
      .limit(5)
    acuerdos = data ?? []
  }

  if (tipo === 'expo') {
    return NextResponse.json({ acuerdos, ntm_destino: ntmRes.data ?? [] })
  }
  return NextResponse.json({ acuerdos, ntm: ntmRes.data ?? [] })
  } catch (err) {
    console.error('[calculadora/contexto] Error inesperado:', err?.message)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
