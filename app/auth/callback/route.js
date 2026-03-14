import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Route Handler para el callback de OAuth y magic links.
 * Supabase redirige acá después de que el usuario autoriza con Google.
 * Intercambia el `code` por una sesión activa y redirige a /consulta.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/consulta'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Si algo falla, redirigir al login con mensaje de error
  return NextResponse.redirect(`${origin}/login?error=callback_failed`)
}
