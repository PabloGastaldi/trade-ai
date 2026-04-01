import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await supabase
    .from('granos_bcr')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(5)

  return NextResponse.json({ data, error })
}