import { Nunito, DM_Sans } from 'next/font/google'

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
  title: 'trade.ai — Acceso',
}

export default function AuthLayout({ children }) {
  return (
    <div
      className={`${nunito.variable} ${dmSans.variable}`}
      style={{
        fontFamily: 'var(--font-body), sans-serif',
        background: 'var(--bg, #0d0d0d)',
        color: 'var(--text, #f0f0f0)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  )
}
