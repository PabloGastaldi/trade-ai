'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  MessageSquare, Calculator, Ship,
  Package, Globe, Clock, User, Star, BookOpen, BarChart3,
} from 'lucide-react'
import './MobileNav.css'

const MOBILE_BREAKPOINT = 768

const DRAWER_ITEMS = [
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
      <div className="mobile-header">
        <span className="mobile-header-title font-logo">
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
        <div className="mobile-drawer-header">
          <span className="mobile-drawer-title font-logo">
            <span className="text-on-surface">trade</span>
            <span className="text-primary">.ai</span>
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
                <span className="mobile-drawer-item-icon">
                  <item.Icon size={18} strokeWidth={1.5} />
                </span>
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
