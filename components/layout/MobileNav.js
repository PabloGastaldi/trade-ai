'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  MessageSquare, Calculator, Ship,
  Package, Globe, Clock, User, Star, BookOpen, BarChart3, FileSearch, LogOut,
} from 'lucide-react'
import './MobileNav.css'

const MOBILE_BREAKPOINT = 768

const DRAWER_ITEMS = [
  { label: 'Simulador',   Icon: FileSearch,    href: '/simulador' },
  { label: 'Chat',        Icon: MessageSquare,  href: '/consulta' },
  { label: 'Calculadora', Icon: Calculator,    href: '/calculadora' },
  { label: 'Operaciones', Icon: Ship,          href: '/operaciones' },
  { label: 'Catálogo',    Icon: Package,       href: '/catalogo' },
  { label: 'Comparador',  Icon: Globe,        href: '/comparador' },
  { label: 'Mercados',    Icon: BarChart3,    href: '/mercados' },
  { label: 'Historial',   Icon: Clock,        href: '/historial' },
  { label: 'Mi cuenta',   Icon: User,         href: '/cuenta' },
  { label: 'Planes',      Icon: Star,         href: '/planes' },
  { label: 'Nomenclador', Icon: BookOpen,     href: '/nomenclador', soon: true },
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
  const [drawerOpen, setDrawerOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setDrawerOpen(false)
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <div className="mobile-header">
        <span className="font-logo text-lg">
          <span className="text-on-surface">trade</span>
          <span className="text-primary">.ai</span>
        </span>
        <button
          className="mobile-header-menu"
          onClick={() => setDrawerOpen(v => !v)}
          aria-label="Abrir menú"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {drawerOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setDrawerOpen(false)} />
      )}

      <div className={`mobile-drawer ${drawerOpen ? 'mobile-drawer--open' : ''}`}>
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
                <span className="mobile-drawer-item-icon">
                  <item.Icon size={18} strokeWidth={1.5} />
                </span>
                <span className="mobile-drawer-item-label">{item.label}</span>
                {item.soon && <span className="mobile-soon-badge">Pronto</span>}
              </Link>
            )
          })}
        </div>

        <Link href="/login" className="mobile-drawer-item" onClick={() => setDrawerOpen(false)}>
          <span className="mobile-drawer-item-icon"><LogOut size={18} strokeWidth={1.5} /></span>
          <span className="mobile-drawer-item-label">Cerrar sesión</span>
        </Link>
      </div>
    </>
  )
}
