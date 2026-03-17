import { Space_Grotesk, Outfit } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata = {
  icons: { icon: '/favicon.png' },
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
    <html lang="es" className={`${spaceGrotesk.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  )
}
