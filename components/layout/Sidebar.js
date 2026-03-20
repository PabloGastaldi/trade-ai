'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import './Sidebar.css'

const NAV_SECTIONS = [
  {
    items: [
      { label: 'Chat IA',     icon: '💬', href: '/consulta' },
      { label: 'Nomenclador', icon: '📦', href: '/nomenclador', soon: true },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { label: 'Calculadora', icon: '🧮', href: '/calculadora' },
      { label: 'Comparador',  icon: '🌎', href: '/comparador' },
    ],
  },
  {
    label: 'Mi negocio',
    items: [
      { label: 'Catálogo',    icon: '📋', href: '/catalogo' },
      { label: 'Operaciones', icon: '🚢', href: '/operaciones' },
      { label: 'Historial',   icon: '📄', href: '/historial' },
    ],
  },
  {
    label: 'Cuenta',
    items: [
      { label: 'Mi cuenta', icon: '👤', href: '/cuenta' },
      { label: 'Planes',    icon: '⭐', href: '/planes', isPlan: true },
    ],
  },
]

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [email, setEmail] = useState('')
  const [planType, setPlanType] = useState('free')

  useEffect(() => {
    // Colapsar en tablet por defecto
    const mq = window.matchMedia('(max-width: 1024px) and (min-width: 768px)')
    if (mq.matches) setCollapsed(true)
    const handler = (e) => setCollapsed(e.matches)
    mq.addEventListener('change', handler)

    // Cargar datos del usuario
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

    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-sidebar',
      collapsed ? 'collapsed' : 'expanded'
    )
  }, [collapsed])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const planLabel = { free: 'Free', pro: 'Pro', empresa: 'Empresa' }[planType] ?? 'Free'

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <Link href="/consulta" className="sidebar-logo-link">
          <span className="sidebar-logo-trade">trade</span>
          <span className="sidebar-logo-dot">.</span>
          <span className="sidebar-logo-ai">ai</span>
          {!collapsed && <span className="sidebar-logo-badge">Beta</span>}
        </Link>
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <span className="sidebar-collapse-icon">{collapsed ? '›' : '‹'}</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className="sidebar-section">
            {section.label && !collapsed && (
              <span className="sidebar-section-label">{section.label}</span>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${isActive ? 'sidebar-link--active' : ''} ${item.soon ? 'sidebar-link--soon' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  {!collapsed && (
                    <span className="sidebar-link-label">
                      {item.label}
                      {item.isPlan && (
                        <span className={`sidebar-plan-badge sidebar-plan-badge--${planType}`}>
                          {planLabel}
                        </span>
                      )}
                      {item.soon && (
                        <span className="sidebar-soon-badge">Pronto</span>
                      )}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {!collapsed && email && (
          <span className="sidebar-user-email">{email}</span>
        )}
        <button
          className="sidebar-logout-btn"
          onClick={handleLogout}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <span className="sidebar-logout-icon">→</span>
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )
}
