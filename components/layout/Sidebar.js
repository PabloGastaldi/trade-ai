'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  MessageSquare, BookOpen, Calculator, Globe,
  Package, Ship, BarChart3, FileSearch, Home,
} from 'lucide-react'
import './Sidebar.css'

const NAV_SECTIONS = [
  {
    items: [
      { label: 'Inicio',  Icon: Home,          href: '/inicio' },
      { label: 'Chat IA', Icon: MessageSquare,  href: '/consulta' },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { label: 'Calculadora', Icon: Calculator, href: '/calculadora' },
      { label: 'Nomenclador', Icon: BookOpen,   href: '/nomenclador' },
      { label: 'Simulador',   Icon: FileSearch, href: '/simulador' },
      { label: 'Comparador',  Icon: Globe,      href: '/comparador' },
      { label: 'Mercados',    Icon: BarChart3,  href: '/mercados' },
    ],
  },
  {
    label: 'Mi negocio',
    items: [
      { label: 'Catálogo',    Icon: Package, href: '/catalogo' },
      { label: 'Operaciones', Icon: Ship,    href: '/operaciones' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [userInfo, setUserInfo] = useState({ name: '', plan: '', initial: '?' })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || ''
      const initial = name.charAt(0).toUpperCase() || '?'
      setUserInfo({ name, plan: '', initial })

      supabase.from('users_profile').select('plan_type').eq('id', user.id).single()
        .then(({ data }) => {
          const planLabels = { free: 'Free', pro: 'Pro', empresa: 'Empresa' }
          setUserInfo(prev => ({ ...prev, plan: planLabels[data?.plan_type] || 'Free' }))
        })
    })
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px) and (min-width: 768px)')
    if (mq.matches) setCollapsed(true)
    const handler = (e) => setCollapsed(e.matches)
    mq.addEventListener('change', handler)
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

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <Link href="/" className="sidebar-logo-link">
          <span className="font-logo text-on-surface">trade</span>
          <span className="font-logo text-primary">.ai</span>
          {!collapsed && <span className="sidebar-logo-badge">Beta</span>}
        </Link>
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <svg className="sidebar-collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points={collapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6'} />
          </svg>
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
              const Icon = item.Icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${isActive ? 'sidebar-link--active' : ''} ${item.soon ? 'sidebar-link--soon' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="sidebar-link-icon">
                    <Icon size={16} strokeWidth={1.5} className={isActive ? 'text-primary' : 'text-on-surface-variant'} />
                  </span>
                  {!collapsed && (
                    <span className="sidebar-link-label">
                      {item.label}
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
        {/* User info */}
        <div className="sidebar-user-info">
          <Link href="/cuenta" className="sidebar-user-link" title={collapsed ? 'Mi cuenta' : undefined}>
            <div className="sidebar-user-avatar">
              {userInfo.initial}
            </div>
            {!collapsed && (
              <div className="sidebar-user-details">
                <span className="sidebar-user-name">{userInfo.name}</span>
                <span className="sidebar-user-plan">{userInfo.plan}</span>
              </div>
            )}
          </Link>
        </div>
        <button
          className="sidebar-logout-btn"
          onClick={handleLogout}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <svg className="sidebar-logout-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )
}
