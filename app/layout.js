import { Bebas_Neue, Inter, Space_Grotesk } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

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
    <html lang="es" className={`${bebasNeue.variable} ${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
