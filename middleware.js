import { NextResponse }  from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { RateLimiter, getClientIp } from '@/lib/rate-limit'

// ─────────────────────────────────────────────────────────────
// RATE LIMITING POR IP — configuración por prefijo de ruta
//
// Dos capas de protección:
//  1. Aquí (middleware): límite por IP — detiene bots y floods
//  2. En /api/consulta: límite por usuario — controla uso del plan
//
// Los límites son por ventana de 1 minuto.
// Orden: el prefijo más largo matchea primero.
// ─────────────────────────────────────────────────────────────

const REGLAS = [
  // Auth: protección anti brute-force (el más restrictivo)
  { prefijo: '/api/auth',      limite: 10,  ventanaMs: 60_000 },
  // Checkout: evitar spam de preferencias de pago
  { prefijo: '/api/checkout',  limite: 10,  ventanaMs: 60_000 },
  // Consulta IA: complementa el rate limit por usuario del route handler
  { prefijo: '/api/consulta',  limite: 30,  ventanaMs: 60_000 },
  // Webhooks de MP: pueden venir en ráfagas, pero no demasiados
  { prefijo: '/api/webhooks',  limite: 60,  ventanaMs: 60_000 },
  // Resto de rutas API: default permisivo
  { prefijo: '/api',           limite: 100, ventanaMs: 60_000 },
]

// Un RateLimiter por regla (instancias persistentes mientras vive el proceso)
const limiters = REGLAS.map(r => ({
  prefijo:  r.prefijo,
  limiter:  new RateLimiter({ limite: r.limite, ventanaMs: r.ventanaMs }),
  limite:   r.limite,
  ventanaMs: r.ventanaMs,
}))

/**
 * Busca la regla más específica que aplica a la ruta dada.
 * El array REGLAS ya está ordenado de más a menos específico.
 */
function reglaPara(pathname) {
  return limiters.find(r => pathname.startsWith(r.prefijo)) ?? null
}

/**
 * Middleware principal de trade.ai.
 *  1. Rate limiting por IP para rutas /api/*
 *  2. Manejo de sesión Supabase + redirecciones
 */
export async function middleware(request) {
  const { pathname } = request.nextUrl

  // ── Rate limiting (solo rutas API) ──────────────────────────
  if (pathname.startsWith('/api/')) {
    const regla = reglaPara(pathname)

    if (regla) {
      const ip     = getClientIp(request)
      const clave  = `${regla.prefijo}:${ip}`
      const result = regla.limiter.check(clave)

      if (!result.permitido) {
        const resetEnSeg = Math.ceil((result.resetAt - Date.now()) / 1000)

        return new NextResponse(
          JSON.stringify({ error: 'Demasiadas solicitudes. Esperá un momento e intentá de nuevo.' }),
          {
            status: 429,
            headers: {
              'Content-Type':  'application/json',
              'Retry-After':   String(resetEnSeg),
              'X-RateLimit-Limit':     String(regla.limite),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset':     String(Math.ceil(result.resetAt / 1000)),
            },
          }
        )
      }

      // Headers informativos para el cliente (cuántas requests le quedan)
      const supabaseResponse = await updateSession(request)
      supabaseResponse.headers.set('X-RateLimit-Limit',     String(regla.limite))
      supabaseResponse.headers.set('X-RateLimit-Remaining', String(result.restante))
      supabaseResponse.headers.set('X-RateLimit-Reset',     String(Math.ceil(result.resetAt / 1000)))
      return supabaseResponse
    }
  }

  // ── Sesión Supabase + redirecciones ─────────────────────────
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
