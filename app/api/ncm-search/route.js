import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''

  if (q.length < 2) {
    return NextResponse.json([])
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const isNum = /^\d/.test(q)

    let query = supabase
      .from('ncm')
      .select('ncm_code, description')
      .order('ncm_code')
      .limit(5)

    if (isNum) {
      query = query.like('ncm_code', `${q}%`)
    } else {
      query = query.like('description', `%${q}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('[api/ncm-search] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[api/ncm-search] Exception:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}