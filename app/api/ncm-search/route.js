import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { verificarLimite, registrarUso } from '@/lib/usage-limiter'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''

  if (q.length < 2) {
    return NextResponse.json([])
  }

  // Verificar autenticación y límite de plan
  const authSupabase = await createAuthClient()
  const { data: { user }, error: authError } = await authSupabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { permitido, motivo, limitAlcanzado } = await verificarLimite(authSupabase, user.id, 'nomenclador')
  if (!permitido) {
    return NextResponse.json({ error: motivo, limitAlcanzado }, { status: 429 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const isNum = /^\d/.test(q)

    let query = supabase
      .from('ncm')
      .select('codigo_ncm, descripcion')
      .order('codigo_ncm')
      .limit(5)

    if (isNum) {
      // codigo_ncm es columna numérica — pasar Number para evitar ambigüedad con ceros líderes
      const digits = q.replace(/\D/g, '')
      if (digits.length > 0) {
        const desde = Number(digits.padEnd(11, '0'))
        const hasta = Number(digits.padEnd(11, '9')) + 1
        query = query.gte('codigo_ncm', desde).lt('codigo_ncm', hasta)
      }
    } else {
      query = query.ilike('descripcion', `%${q}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('[api/ncm-search] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const formatted = (data ?? []).map(row => ({
      ncm_code: formatNCMDisplay(row.codigo_ncm),
      description: row.descripcion,
    }))

    await registrarUso(authSupabase, user.id, 'nomenclador')
    return NextResponse.json(formatted)
  } catch (err) {
    console.error('[api/ncm-search] Exception:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function formatNCMDisplay(codigo) {
  if (!codigo || codigo.length < 4) return codigo
  if (codigo.length === 11) {
    return `${codigo.slice(0,4)}.${codigo.slice(4,6)}.${codigo.slice(6,8)}.${codigo.slice(8)}`
  }
  if (codigo.length === 8) {
    return `${codigo.slice(0,4)}.${codigo.slice(4,6)}.${codigo.slice(6)}`
  }
  return codigo
}