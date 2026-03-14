import { updateSession } from '@/lib/supabase/middleware'

/**
 * Middleware principal de trade.ai.
 * Delega el manejo de sesión y redirecciones a updateSession()
 * que ya contiene toda la lógica de rutas protegidas/públicas.
 */
export async function middleware(request) {
  return await updateSession(request)
}

/**
 * Matcher — define en qué rutas corre el middleware.
 * Excluye assets estáticos para no agregar latencia innecesaria.
 */
export const config = {
  matcher: [
    /*
     * Correr en todas las rutas EXCEPTO:
     * - _next/static  (archivos estáticos de Next.js)
     * - _next/image   (optimización de imágenes)
     * - favicon.ico   (ícono del sitio)
     * - archivos con extensión (png, jpg, svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
