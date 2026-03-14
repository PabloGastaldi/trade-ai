import { Nunito, DM_Sans } from 'next/font/google'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata = {
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
    <html lang="es" className={`${nunito.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
