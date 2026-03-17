/** @type {import('next').NextConfig} */

// ─────────────────────────────────────────────────────────────
// SECURITY HEADERS
// Aplicados a todas las rutas. Revisión recomendada en cada
// actualización de dependencias (especialmente MercadoPago).
// ─────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

const securityHeaders = [
  // Previene que la página se embeba en iframes (clickjacking)
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Previene MIME-type sniffing (evita que browsers ejecuten archivos
  // con content-type incorrecto como scripts)
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Controla qué información de referrer se envía en requests entre páginas
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Deshabilita features del browser que no se usan
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://www.mercadopago.com")',
  },
  // Fuerza HTTPS por 1 año, incluye subdominios
  // Solo efectivo en producción (Vercel ya lo maneja, pero es buena práctica)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  // Content Security Policy
  // Estrategia: restrictiva pero funcional con Next.js + Supabase + MercadoPago
  // 'unsafe-inline' en script-src es necesario para el runtime de Next.js App Router.
  // Considerar migrar a nonce-based CSP cuando el tráfico escale.
  {
    key: 'Content-Security-Policy',
    value: [
      // Solo cargar recursos del propio dominio por defecto
      "default-src 'self'",
      // Scripts: propio dominio + inline (Next.js lo necesita) + MP SDK
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com",
      // Estilos: propio dominio + inline (CSS-in-JS, Tailwind)
      "style-src 'self' 'unsafe-inline'",
      // Imágenes: propio dominio + data URIs + https genérico (avatares, etc.)
      "img-src 'self' data: https:",
      // Fuentes: propio dominio + data URIs
      "font-src 'self' data:",
      // Conexiones de red: API propia + Supabase + MercadoPago
      `connect-src 'self' ${SUPABASE_URL} wss://*.supabase.co https://api.mercadopago.com`,
      // Iframes: solo MercadoPago Checkout (para el modal de pago)
      "frame-src https://www.mercadopago.com.ar https://www.mercadopago.com",
      // Formularios: solo propio dominio
      "form-action 'self'",
      // Upgrade HTTP a HTTPS
      "upgrade-insecure-requests",
    ].join('; '),
  },
]

const nextConfig = {
  // ESLint: deshabilitar durante el build de Next.js.
  // La regla @typescript-eslint/no-deprecated varía entre versiones de
  // eslint-config-next y causa falsos positivos en Vercel.
  // Correr lint por separado con: npm run lint
  eslint: {
    ignoreDuringBuilds: true,
  },

  async headers() {
    return [
      {
        // Aplicar a TODAS las rutas
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  // Optimización de imágenes — dominios externos permitidos
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // Suprimir el indicador de build de Next.js en producción
  // (no afecta funcionalidad, solo UI)
  devIndicators: {
    buildActivity: false,
  },

  // Logging reducido en producción
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
}

export default nextConfig
