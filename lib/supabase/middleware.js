import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

/**
 * Cliente Supabase para el middleware de Next.js.
 * Refresca la sesión del usuario en cada request
 * y la propaga via cookies a Server Components y Route Handlers.
 *
 * Usar SOLO en middleware.js (raíz del proyecto).
 */
export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Primero actualizamos las cookies en el request
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Luego en el response para que el browser las reciba
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: no agregues lógica entre createServerClient y getUser().
  // Un error aquí puede dejar al usuario sin sesión inesperadamente.
  const { data: { user } } = await supabase.auth.getUser()

  // Rutas protegidas — redirigir a login si no hay sesión
  const protectedPaths = ['/consulta', '/historial', '/cuenta']
  const isProtected = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Redirigir a /consulta si usuario autenticado intenta ir a /login o /registro
  const authPaths = ['/login', '/registro']
  const isAuthPage = authPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isAuthPage && user) {
    const consultaUrl = request.nextUrl.clone()
    consultaUrl.pathname = '/consulta'
    return NextResponse.redirect(consultaUrl)
  }

  return supabaseResponse
}
