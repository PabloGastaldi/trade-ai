'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import './MobileNav.css'

const BOTTOM_TABS = [
  { label: 'Chat',        icon: '💬', href: '/consulta' },
  { label: 'Calculadora', icon: '🧮', href: '/calculadora' },
  { label: 'Operaciones', icon: '🚢', href: '/operaciones' },
  { label: 'Más',         icon: '☰',  href: null, isMore: true },
]

const DRAWER_ITEMS = [
  { label: 'Catálogo',    icon: '📋', href: '/catalogo' },
  { label: 'Comparador',  icon: '🌎', href: '/comparador' },
  { label: 'Historial',   icon: '📄', href: '/historial' },
  { label: 'Mi cuenta',   icon: '👤', href: '/cuenta' },
  { label: 'Planes',      icon: '⭐', href: '/planes' },
  { label: 'Nomenclador', icon: '📦', href: '/nomenclador', soon: true },
]

export default function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [planType, setPlanType] = useState('free')

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')
      const { data: profile } = await supabase
        .from('users_profile')
        .select('plan_type')
        .eq('id', user.id)
        .single()
      if (profile?.plan_type) setPlanType(profile.plan_type)
    }
    loadUser()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setDrawerOpen(false)
    router.push('/')
    router.refresh()
  }

  const planLabel = { free: 'Free', pro: 'Pro', empresa: 'Empresa' }[planType] ?? 'Free'

  return (
    <>
      <nav className="mobile-nav">
        {BOTTOM_TABS.map((tab) => {
          if (tab.isMore) {
            return (
              <button
                key="more"
                className={`mobile-nav-tab ${drawerOpen ? 'mobile-nav-tab--active' : ''}`}
                onClick={() => setDrawerOpen((v) => !v)}
              >
                <span className="mobile-nav-tab-icon">{tab.icon}</span>
                <span className="mobile-nav-tab-label">{tab.label}</span>
              </button>
            )
          }
          const isActive = pathname === tab.href && !drawerOpen
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`mobile-nav-tab ${isActive ? 'mobile-nav-tab--active' : ''}`}
              onClick={() => setDrawerOpen(false)}
            >
              <span className="mobile-nav-tab-icon">{tab.icon}</span>
              <span className="mobile-nav-tab-label">{tab.label}</span>
            </Link>
          )
        })}
      </nav>

      {drawerOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setDrawerOpen(false)} />
      )}

      <div className={`mobile-drawer ${drawerOpen ? 'mobile-drawer--open' : ''}`}>
        <div className="mobile-drawer-header">
          <span className="mobile-drawer-title">
            <span style={{color:'var(--text)'}}>trade</span>
            <span style={{color:'var(--accent)'}}>.</span>
            <span style={{color:'var(--accent)'}}>ai</span>
          </span>
          <div className="mobile-drawer-user">
            {email && <span className="mobile-drawer-email">{email}</span>}
            <span className={`mobile-drawer-plan mobile-drawer-plan--${planType}`}>{planLabel}</span>
          </div>
        </div>

        <div className="mobile-drawer-items">
          {DRAWER_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-drawer-item ${isActive ? 'mobile-drawer-item--active' : ''} ${item.soon ? 'mobile-drawer-item--soon' : ''}`}
                onClick={() => !item.soon && setDrawerOpen(false)}
              >
                <span className="mobile-drawer-item-icon">{item.icon}</span>
                <span className="mobile-drawer-item-label">{item.label}</span>
                {item.soon && <span className="mobile-soon-badge">Pronto</span>}
              </Link>
            )
          })}
        </div>

        <div className="mobile-drawer-footer">
          <button className="mobile-logout-btn" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  )
}
