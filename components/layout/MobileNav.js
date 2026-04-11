'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Home, MessageSquare, Calculator, BarChart3, Menu,
  BookOpen, FileSearch, Globe, Package, Ship, User, LogOut,
} from 'lucide-react'
import './MobileNav.css'

const MOBILE_BREAKPOINT = 768

// Ítems del bottom tab bar
const TAB_ITEMS = [
  { label: 'Inicio',       Icon: Home,          href: '/' },
  { label: 'Chat IA',      Icon: MessageSquare, href: '/consulta' },
  { label: 'Calculadora',  Icon: Calculator,    href: '/calculadora' },
  { label: 'Mercados',     Icon: BarChart3,     href: '/mercados' },
]

// Ítems del sheet "Más"
const MORE_SECTIONS = [
  {
    label: 'Herramientas',
    items: [
      { label: 'Nomenclador',  Icon: BookOpen,   href: '/nomenclador' },
      { label: 'Simulador',    Icon: FileSearch, href: '/simulador' },
      { label: 'Comparador',   Icon: Globe,      href: '/comparador' },
    ],
  },
  {
    label: 'Mi negocio',
    items: [
      { label: 'Catálogo',    Icon: Package, href: '/catalogo' },
      { label: 'Operaciones', Icon: Ship,    href: '/operaciones' },
    ],
  },
  {
    label: 'Cuenta',
    items: [
      { label: 'Mi cuenta', Icon: User, href: '/cuenta' },
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

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setSheetOpen(false)
    router.push('/login')
    router.refresh()
  }

  // "Más" está activo si la ruta actual no es ninguno de los tabs principales
  const tabHrefs = TAB_ITEMS.map(t => t.href)
  const moreActive = !tabHrefs.includes(pathname)

  return (
    <>
      {/* Header superior — logo + nombre de página */}
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

      {/* Overlay del sheet */}
      {sheetOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setSheetOpen(false)} />
      )}

      {/* Sheet "Más" — sube desde abajo */}
      <div className={`mobile-more-sheet ${sheetOpen ? 'mobile-more-sheet--open' : ''}`}>
        <div className="mobile-more-handle" />
        <div className="mobile-drawer-items">
          {MORE_SECTIONS.map((section, si) => (
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
                      <item.Icon size={18} strokeWidth={1.5} />
                    </span>
                    <span className="mobile-drawer-item-label">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
        <div className="mobile-more-footer">
          <button className="mobile-logout-btn" onClick={handleLogout}>
            <LogOut size={14} strokeWidth={1.5} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  )
}
