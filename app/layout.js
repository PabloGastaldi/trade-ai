import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

export const metadata = {
  icons: { icon: '/favicon.ico' },
  title: 'trade.ai — Inteligencia para el comercio exterior',
  description:
    'Consultá aranceles, normativa y documentos de comercio exterior argentino con inteligencia artificial. Respuestas respaldadas por fuentes oficiales.',
  keywords: 'comercio exterior, aranceles, NCM, exportación, importación, Argentina, aduana',
  openGraph: {
    title: 'trade.ai',
    description: 'Inteligencia para el comercio exterior argentino',
    type: 'website',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
