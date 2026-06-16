import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizarCodigoNCM } from '@/lib/ncm-lookup'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan variables de entorno de Supabase')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const ncm = searchParams.get('ncm')

  if (!ncm) return NextResponse.json({ error: 'Parámetro ncm requerido' }, { status: 400 })

  const normalizado = normalizarCodigoNCM(ncm)
  if (!normalizado) return NextResponse.json({ error: 'Código NCM inválido' }, { status: 400 })

  try {
    const supabase = getServiceClient()
    const codigoNCM = normalizado.codigoNCM

    const { data: impoData } = await supabase
      .from('aranceles_importacion')
      .select('aec, die, dii, te, iva, iva_ad, gan, iibb')
      .eq('codigo_ncm', codigoNCM)
      .single()

    return NextResponse.json({
      codigo_ncm: codigoNCM,
      importacion: impoData ?? {},
    })
  } catch (err) {
    console.error('[api/nomenclador/aranceles] Error:', err.message)
    return NextResponse.json({ error: 'Error al buscar aranceles' }, { status: 500 })
  }
}
