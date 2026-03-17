'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import './AppHeader.css'

export default function AppHeader({ user }) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navItems = [
    { label: 'Consulta',  labelMobile: 'Consulta',  href: '/consulta' },
    { label: 'Historial', labelMobile: 'Historial', href: '/historial' },
    { label: 'Mi cuenta', labelMobile: 'Cuenta',    href: '/cuenta' },
  ]

  return (
    <header className="app-header">
      <div className="app-header-inner">
        {/* Logo */}
        <a href="/" className="app-logo">
          <span className="app-logo-trade">trade</span>
          <span className="app-logo-dot">.</span>
          <span className="app-logo-ai">ai</span>
          <span className="app-logo-badge">Beta</span>
        </a>

        {/* Nav */}
        <nav className="app-nav">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`app-nav-link ${pathname === item.href ? 'active' : ''}`}
            >
              <span className="app-nav-label-full">{item.label}</span>
              <span className="app-nav-label-mobile">{item.labelMobile}</span>
            </a>
          ))}
        </nav>

        {/* Right */}
        <div className="app-header-right">
          <span className="app-user-email">{user?.email}</span>
          <button className="app-btn-logout" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  )
}
