'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Home, MessageSquare, Calculator, BarChart3, Menu,
  BookOpen, FileSearch, Globe, Package, Ship, LogOut,
} from 'lucide-react'
import './MobileNav.css'

const MOBILE_BREAKPOINT = 768

// Bottom tab bar — 4 accesos directos + Más
const TAB_ITEMS = [
  { label: 'Inicio',      Icon: Home,          href: '/inicio' },
  { label: 'Chat IA',     Icon: MessageSquare, href: '/consulta' },
  { label: 'Calculadora', Icon: Calculator,    href: '/calculadora' },
  { label: 'Mercados',    Icon: BarChart3,     href: '/mercados' },
]

// Misma estructura que el Sidebar
const NAV_SECTIONS = [
  {
    items: [
      { label: 'Inicio',  Icon: Home,          href: '/inicio' },
      { label: 'Chat IA', Icon: MessageSquare, href: '/consulta' },
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

export default function MobileNav() {
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!mounted || !isMobile) return null

  return <MobileShell />
}

function MobileShell() {
  const pathname = usePathname()
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
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

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setSheetOpen(false)
    router.push('/login')
    router.refresh()
  }

  const tabHrefs = TAB_ITEMS.map(t => t.href)
  const moreActive = !tabHrefs.includes(pathname)

  return (
    <>
      {/* Header superior */}
      <div className="mobile-header">
        <Link href="/" className="mobile-header-logo" onClick={() => setSheetOpen(false)}>
          <span className="font-logo text-lg">
            <span className="text-on-surface">trade</span>
            <span className="text-primary">.ai</span>
          </span>
        </Link>
      </div>

      {/* Bottom tab bar */}
      <nav className="mobile-tab-bar">
        {TAB_ITEMS.map(({ label, Icon, href }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`mobile-tab-item ${isActive ? 'mobile-tab-item--active' : ''}`}
              onClick={() => setSheetOpen(false)}
            >
              <Icon size={20} strokeWidth={1.5} />
              <span className="mobile-tab-label">{label}</span>
            </Link>
          )
        })}
        <button
          className={`mobile-tab-item ${moreActive || sheetOpen ? 'mobile-tab-item--active' : ''}`}
          onClick={() => setSheetOpen(v => !v)}
          aria-label="Más opciones"
        >
          <Menu size={20} strokeWidth={1.5} />
          <span className="mobile-tab-label">Más</span>
        </button>
      </nav>

      {/* Overlay */}
      {sheetOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setSheetOpen(false)} />
      )}

      {/* Sheet — replica el sidebar */}
      <div className={`mobile-more-sheet ${sheetOpen ? 'mobile-more-sheet--open' : ''}`}>
        <div className="mobile-more-handle" />

        <div className="mobile-drawer-items">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si} className="mobile-drawer-section">
              {section.label && (
                <span className="mobile-drawer-section-label">{section.label}</span>
              )}
              {section.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`mobile-drawer-item ${isActive ? 'mobile-drawer-item--active' : ''}`}
                    onClick={() => setSheetOpen(false)}
                  >
                    <span className="mobile-drawer-item-icon">
                      <item.Icon size={16} strokeWidth={1.5} />
                    </span>
                    <span className="mobile-drawer-item-label">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer igual al sidebar: avatar + nombre + plan + logout */}
        <div className="mobile-more-footer">
          <Link
            href="/cuenta"
            className="mobile-sheet-user"
            onClick={() => setSheetOpen(false)}
          >
            <div className="mobile-sheet-avatar">{userInfo.initial}</div>
            <div className="mobile-sheet-user-info">
              <span className="mobile-sheet-user-name">{userInfo.name}</span>
              <span className="mobile-sheet-user-plan">{userInfo.plan}</span>
            </div>
          </Link>
          <button className="mobile-logout-btn" onClick={handleLogout}>
            <LogOut size={14} strokeWidth={1.5} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  )
}
