'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import PageLayout from '@/components/ui/PageLayout'
import Badge from '@/components/ui/Badge'
import {
  MessageSquare, Calculator, BookOpen, FileSearch,
  Globe, BarChart3, Package, Ship,
} from 'lucide-react'
import { getPlanConfig } from '@/lib/plans-config'

// ── Helpers ─────────────────────────────────────────────────────────────────

function saludo() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Buenos días'
  if (h >= 12 && h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

function fechaRelativa(iso) {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  if (diff < 172800) return 'ayer'
  return `hace ${Math.floor(diff / 86400)} días`
}

function fmtARS(v) {
  if (v == null) return '—'
  return `$${Number(v).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// ── Ticker ───────────────────────────────────────────────────────────────────

function TickerSkeleton() {
  return (
    <div className="flex gap-6 overflow-x-auto">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex-none min-w-[80px] space-y-1.5">
          <div className="h-2 w-16 bg-white/[0.06] rounded animate-pulse" />
          <div className="h-4 w-20 bg-white/[0.06] rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function TickerItem({ label, value, sub, change, highlight }) {
  const pos = change > 0
  const neg = change < 0
  return (
    <div className={`flex-none min-w-[80px] px-3 py-2 rounded-xl transition-colors duration-200 hover:bg-white/[0.04] ${highlight ? 'border-l-2 border-primary/40 pl-3' : ''}`}>
      <div className="font-body text-[10px] uppercase tracking-widest text-on-surface-variant/50 mb-0.5 whitespace-nowrap">
        {label}
      </div>
      <div className="font-mono text-sm text-on-surface whitespace-nowrap">{value}</div>
      {sub && <div className="font-mono text-[10px] text-on-surface-variant whitespace-nowrap">{sub}</div>}
      {change != null && (
        <div className={`font-mono text-[10px] whitespace-nowrap ${pos ? 'text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.4)]' : neg ? 'text-red-400 drop-shadow-[0_0_4px_rgba(248,113,113,0.4)]' : 'text-on-surface-variant'}`}>
          {pos ? '▲' : neg ? '▼' : '—'} {Math.abs(change).toFixed(2)}%
        </div>
      )}
    </div>
  )
}

function MarketTicker() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/market-data')
      if (!res.ok) return
      setData(await res.json())
    } catch {
      // silencioso — no romper la página si falla
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const d = data?.dolares
  const granos = data?.granos?.granos ?? []
  const rp = data?.riesgoPais

  const items = [
    d?.blue && {
      label: 'Dólar Blue',
      value: `$${d.blue.venta?.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`,
      sub: `Compra $${d.blue.compra?.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`,
      highlight: true,
    },
    d?.mep && {
      label: 'Dólar MEP',
      value: `$${d.mep.venta?.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`,
    },
    d?.ccl && {
      label: 'Dólar CCL',
      value: `$${d.ccl.venta?.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`,
    },
    rp && {
      label: 'Riesgo País',
      value: rp.valor?.toLocaleString('es-AR'),
      sub: 'puntos básicos',
    },
    ...granos.slice(0, 2).map(g => ({
      label: g.name,
      value: fmtARS(g.price),
      sub: g.unit,
      change: g.changePercent,
    })),
  ].filter(Boolean)

  return (
    <div
      className="border border-white/[0.06] rounded-2xl px-2 py-2 overflow-x-auto"
      style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      {loading
        ? <div className="px-3 py-1.5"><TickerSkeleton /></div>
        : items.length > 0
          ? (
            <div className="flex gap-1">
              {items.map((item, i) => (
                <div key={i} className="flex items-stretch">
                  <TickerItem {...item} />
                  {i < items.length - 1 && (
                    <div className="w-px self-stretch bg-white/[0.06] my-2" />
                  )}
                </div>
              ))}
            </div>
          )
          : <span className="font-body text-sm text-on-surface-variant px-3">Datos de mercado no disponibles</span>
      }
    </div>
  )
}

// ── Herramientas ─────────────────────────────────────────────────────────────

const HERRAMIENTAS = [
  {
    href: '/consulta',
    Icon: MessageSquare,
    nombre: 'Chat IA',
    desc: 'Consultá cualquier duda de comercio exterior con IA',
    cta: 'Hacer una consulta →',
  },
  {
    href: '/calculadora',
    Icon: Calculator,
    nombre: 'Calculadora',
    desc: 'Calculá costos de importación y exportación',
    cta: 'Calcular costos →',
  },
  {
    href: '/nomenclador',
    Icon: BookOpen,
    nombre: 'Nomenclador',
    desc: 'Encontrá la posición arancelaria de tu producto',
    cta: 'Clasificar producto →',
  },
  {
    href: '/simulador',
    Icon: FileSearch,
    nombre: 'Simulador',
    desc: 'Simulá una operación completa de COMEX',
    cta: 'Simular operación →',
  },
  {
    href: '/comparador',
    Icon: Globe,
    nombre: 'Comparador',
    desc: 'Compará condiciones arancelarias entre países',
    cta: 'Comparar países →',
  },
  {
    href: '/mercados',
    Icon: BarChart3,
    nombre: 'Mercados',
    desc: 'Cotizaciones, tipo de cambio y commodities en vivo',
    cta: 'Ver mercados →',
  },
]

function ToolCard({ href, Icon, nombre, desc, cta }) {
  return (
    <Link href={href} className="group relative block">
      {/* Glow on hover */}
      <div className="absolute -inset-px rounded-2xl bg-primary/[0.08] opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 pointer-events-none" />

      <div
        className="relative rounded-2xl p-5 flex flex-col gap-3 transition-all duration-300"
        style={{
          background: 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/[0.08] flex items-center justify-center flex-none">
            <Icon size={16} strokeWidth={1.5} className="text-primary" />
          </div>
          <span className="font-body text-sm font-semibold text-on-surface">{nombre}</span>
        </div>
        <p className="font-body text-sm text-on-surface-variant leading-snug">{desc}</p>
        <span className="font-body text-xs text-primary group-hover:text-primary-intense transition-colors">
          {cta}
        </span>
      </div>
    </Link>
  )
}

// ── Actividad reciente ────────────────────────────────────────────────────────

function ActividadReciente({ consultas }) {
  if (!consultas?.length) {
    return (
      <div
        className="rounded-2xl p-6"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h2 className="font-body text-sm font-semibold text-on-surface mb-4">Empezá tu primera operación</h2>
        <div className="space-y-1">
          {[
            { n: 1, label: 'Clasificá tu producto', href: '/nomenclador' },
            { n: 2, label: 'Calculá los costos', href: '/calculadora' },
            { n: 3, label: 'Simulá la operación', href: '/simulador' },
          ].map((step, idx) => (
            <div key={step.n} className="flex items-stretch gap-3">
              {/* Timeline */}
              <div className="flex flex-col items-center flex-none" style={{ width: 24 }}>
                <div className={`w-2 h-2 rounded-full flex-none mt-3.5 ${idx === 0 ? 'bg-primary' : 'bg-white/[0.1]'}`} />
                {idx < 2 && <div className="w-px flex-1 bg-white/[0.06] mt-1" />}
              </div>
              <Link
                href={step.href}
                className="flex-1 flex items-center gap-2 py-2.5 px-3 rounded-xl hover:bg-white/[0.04] transition-colors mb-1"
              >
                <span className="font-body text-sm text-on-surface-variant">{step.label} →</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <h2 className="font-body text-sm font-semibold text-on-surface mb-4">Actividad reciente</h2>
      <div className="space-y-1">
        {consultas.map((c, idx) => (
          <div key={c.id} className="flex items-stretch gap-3">
            {/* Timeline */}
            <div className="flex flex-col items-center flex-none" style={{ width: 24 }}>
              <div className={`w-2 h-2 rounded-full flex-none mt-3.5 ${idx === 0 ? 'bg-primary' : 'bg-white/[0.1]'}`} />
              {idx < consultas.length - 1 && <div className="w-px flex-1 bg-white/[0.06] mt-1" />}
            </div>
            <Link
              href="/historial"
              className="flex-1 flex items-start gap-3 py-2.5 px-3 rounded-xl hover:bg-white/[0.04] transition-colors mb-1"
            >
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm text-on-surface truncate">
                  {c.query_text?.slice(0, 80) || 'Consulta'}
                </p>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  {fechaRelativa(c.created_at)}
                </span>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Mi negocio ────────────────────────────────────────────────────────────────

function MiNegocio({ cantProductos, ultimaOperacion }) {
  if (!cantProductos && !ultimaOperacion) return null

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <h2 className="font-body text-sm font-semibold text-on-surface mb-3">Mi negocio</h2>
      <div className="flex flex-wrap gap-3">
        {cantProductos > 0 && (
          <Link
            href="/catalogo"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07]
                       transition-colors border border-white/[0.06]"
          >
            <Package size={13} strokeWidth={1.5} className="text-primary" />
            <span className="font-body text-sm text-on-surface">
              {cantProductos} producto{cantProductos !== 1 ? 's' : ''} en catálogo
            </span>
            <span className="font-mono text-[10px] text-on-surface-variant">→</span>
          </Link>
        )}
        {ultimaOperacion && (
          <Link
            href={`/operaciones/${ultimaOperacion.id}`}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07]
                       transition-colors border border-white/[0.06]"
          >
            <Ship size={13} strokeWidth={1.5} className="text-on-surface-variant" />
            <span className="font-body text-sm text-on-surface">
              {ultimaOperacion.operation_type === 'importacion' ? 'Importación' : 'Exportación'}
              {ultimaOperacion.country ? ` — ${ultimaOperacion.country}` : ''}
            </span>
            <span className="font-mono text-[10px] text-on-surface-variant">→</span>
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

const FADE_DELAYS = ['0ms', '80ms', '160ms', '240ms', '320ms']

function FadeIn({ delay, children }) {
  return (
    <div style={{ animation: 'fadeInUp 0.5s ease-out forwards', animationDelay: delay, opacity: 0 }}>
      {children}
    </div>
  )
}

export default function InicioClient({ nombre, ultimasConsultas, cantProductos, ultimaOperacion, perfil }) {
  const planConfig = getPlanConfig(perfil?.plan_type)
  const limite = planConfig?.limits?.consulta?.monthly
  const usadas = perfil?.queries_this_month ?? 0

  const firstName = nombre?.split(' ')[0]
  const saludoTexto = saludo()

  return (
    <PageLayout title="INICIO">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[120px]"
          style={{ background: 'rgba(221,217,42,0.07)' }} />
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ background: 'rgba(221,217,42,0.04)' }} />
        <div className="absolute -bottom-20 right-1/3 w-72 h-72 rounded-full blur-[80px]"
          style={{ background: 'rgba(255,255,255,0.02)' }} />
      </div>

      <div className="space-y-6">

        {/* Bloque 1: Saludo + plan */}
        <FadeIn delay={FADE_DELAYS[0]}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="font-body text-xl font-semibold text-on-surface">
              {saludoTexto},{' '}
              {firstName
                ? <span style={{ background: 'linear-gradient(90deg, #F5F5F5, #DDD92A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{firstName}</span>
                : <span>bienvenido a trade.ai</span>
              }
            </h2>
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 text-[10px] font-bold tracking-widest rounded-md border"
                style={{
                  background: 'rgba(221,217,42,0.15)',
                  color: '#DDD92A',
                  borderColor: 'rgba(221,217,42,0.25)',
                  boxShadow: '0 0 8px rgba(221,217,42,0.1)',
                }}
              >
                {(planConfig?.name ?? 'Free').toUpperCase()}
              </span>
              {limite != null && (
                <span className="font-mono text-[11px] text-on-surface-variant">
                  {usadas}/{limite} consultas
                </span>
              )}
            </div>
          </div>
        </FadeIn>

        {/* Bloque 2: Ticker de mercado */}
        <FadeIn delay={FADE_DELAYS[1]}>
          <MarketTicker />
        </FadeIn>

        {/* Bloque 3: Grid de herramientas */}
        <FadeIn delay={FADE_DELAYS[2]}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {HERRAMIENTAS.map(h => <ToolCard key={h.href} {...h} />)}
          </div>
        </FadeIn>

        {/* Bloque 4: Actividad reciente / Onboarding */}
        <FadeIn delay={FADE_DELAYS[3]}>
          <ActividadReciente consultas={ultimasConsultas} />
        </FadeIn>

        {/* Bloque 5: Mi negocio (solo si tiene datos) */}
        {(cantProductos > 0 || ultimaOperacion) && (
          <FadeIn delay={FADE_DELAYS[4]}>
            <MiNegocio cantProductos={cantProductos} ultimaOperacion={ultimaOperacion} />
          </FadeIn>
        )}

      </div>
    </PageLayout>
  )
}
