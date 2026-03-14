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
        background: '#0a0e1a',
        color: '#e8edf5',
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
