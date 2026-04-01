import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { normalizarCodigoNCM } from '@/lib/ncm-lookup'

// GET /api/calculadora/contexto-expo?ncm=&pais=
// Devuelve acuerdos de exportación + barreras NTM en destino para enriquecer
// el resultado de la calculadora de exportación.

export async function GET(request) {
  const supabaseUser = await createClient()
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const ncmRaw = searchParams.get('ncm')
  const paisISO3 = searchParams.get('pais')

  if (!ncmRaw || !paisISO3) {
    return NextResponse.json({ acuerdos: [], ntm_destino: [] })
  }

  const normalizado = normalizarCodigoNCM(ncmRaw)
  if (!normalizado) return NextResponse.json({ acuerdos: [], ntm_destino: [] })

  const ncm11 = normalizado.codigoNCM
  const hs6 = ncm11.slice(0, 6)

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const [countryRes, ntmRes] = await Promise.all([
    supabase.from('country_codes').select('name_es').eq('iso3', paisISO3.toUpperCase()).single(),
    supabase
      .from('ntm_measures_affecting_argentina')
      .select('ntm_code, tipo_medida, cobertura')
      .eq('hs_code', hs6)
      .eq('pais_que_aplica', paisISO3.toUpperCase())
      .limit(20),
  ])

  let acuerdos = []
  if (countryRes.data) {
    const { data } = await supabase
      .from('acuerdos_exportacion')
      .select('bloque, pais, codigo_acuerdo, porcentaje')
      .eq('codigo_ncm', ncm11)
      .ilike('pais', `%${countryRes.data.name_es}%`)
      .order('porcentaje', { ascending: false })
      .limit(5)
    acuerdos = data ?? []
  }

  return NextResponse.json({
    acuerdos,
    ntm_destino: ntmRes.data ?? [],
  })
}
