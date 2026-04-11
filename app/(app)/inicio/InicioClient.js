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

function TickerItem({ label, value, sub, change }) {
  const pos = change > 0
  const neg = change < 0
  return (
    <div className="flex-none min-w-[80px]">
      <div className="font-body text-[10px] uppercase tracking-widest text-on-surface-variant/50 mb-0.5 whitespace-nowrap">
        {label}
      </div>
      <div className="font-mono text-sm text-on-surface whitespace-nowrap">{value}</div>
      {sub && <div className="font-mono text-[10px] text-on-surface-variant whitespace-nowrap">{sub}</div>}
      {change != null && (
        <div className={`font-mono text-[10px] whitespace-nowrap ${pos ? 'text-emerald-400' : neg ? 'text-red-400' : 'text-on-surface-variant'}`}>
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
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl px-5 py-3.5 overflow-x-auto">
      {loading
        ? <TickerSkeleton />
        : items.length > 0
          ? (
            <div className="flex gap-6 divide-x divide-white/[0.06]">
              {items.map((item, i) => (
                <div key={i} className={i > 0 ? 'pl-6' : ''}>
                  <TickerItem {...item} />
                </div>
              ))}
            </div>
          )
          : <span className="font-body text-sm text-on-surface-variant">Datos de mercado no disponibles</span>
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
    <Link
      href={href}
      className="group bg-white/[0.03] border border-white/[0.04] rounded-2xl p-5
                 hover:bg-white/[0.06] hover:border-white/[0.08]
                 transition-all duration-150 flex flex-col gap-3"
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
    </Link>
  )
}

// ── Actividad reciente ────────────────────────────────────────────────────────

function ActividadReciente({ consultas }) {
  if (!consultas?.length) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.04] rounded-2xl p-6">
        <h2 className="font-body text-sm font-semibold text-on-surface mb-4">Empezá tu primera operación</h2>
        <div className="space-y-3">
          {[
            { n: 1, label: 'Clasificá tu producto', href: '/nomenclador' },
            { n: 2, label: 'Calculá los costos', href: '/calculadora' },
            { n: 3, label: 'Simulá la operación', href: '/simulador' },
          ].map(step => (
            <Link
              key={step.n}
              href={step.href}
              className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/[0.04] transition-colors"
            >
              <span className="w-6 h-6 rounded-full bg-primary/[0.12] flex items-center justify-center
                               font-mono text-[11px] text-primary font-semibold flex-none">
                {step.n}
              </span>
              <span className="font-body text-sm text-on-surface-variant">{step.label} →</span>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.04] rounded-2xl p-6">
      <h2 className="font-body text-sm font-semibold text-on-surface mb-4">Actividad reciente</h2>
      <div className="space-y-1">
        {consultas.map(c => (
          <Link
            key={c.id}
            href="/historial"
            className="flex items-start gap-3 py-2.5 px-3 rounded-xl hover:bg-white/[0.04] transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-white/[0.05] flex items-center justify-center flex-none mt-0.5">
              <MessageSquare size={11} strokeWidth={1.5} className="text-on-surface-variant" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm text-on-surface truncate">
                {c.query_text?.slice(0, 80) || 'Consulta'}
              </p>
              <span className="font-mono text-[10px] text-on-surface-variant">
                {fechaRelativa(c.created_at)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Mi negocio ────────────────────────────────────────────────────────────────

function MiNegocio({ cantProductos, ultimaOperacion }) {
  if (!cantProductos && !ultimaOperacion) return null

  return (
    <div className="bg-white/[0.03] border border-white/[0.04] rounded-2xl p-5">
      <h2 className="font-body text-sm font-semibold text-on-surface mb-3">Mi negocio</h2>
      <div className="flex flex-wrap gap-3">
        {cantProductos > 0 && (
          <Link
            href="/catalogo"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07]
                       transition-colors border border-white/[0.04]"
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
                       transition-colors border border-white/[0.04]"
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

export default function InicioClient({ nombre, ultimasConsultas, cantProductos, ultimaOperacion, perfil }) {
  const planConfig = getPlanConfig(perfil?.plan_type)
  const limite = planConfig?.limits?.consulta?.monthly
  const usadas = perfil?.queries_this_month ?? 0

  const tituloSaludo = nombre
    ? `${saludo()}, ${nombre.split(' ')[0]}`
    : 'Bienvenido a trade.ai'

  return (
    <PageLayout title="INICIO">
      <div className="space-y-6">

        {/* Bloque 1: Saludo + plan */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-body text-xl font-semibold text-on-surface">{tituloSaludo}</h2>
          <div className="flex items-center gap-2">
            <Badge variant={perfil?.plan_type === 'free' ? 'neutral' : 'primary'}>
              {planConfig?.name ?? 'Gratuito'}
            </Badge>
            {limite != null && (
              <span className="font-mono text-[11px] text-on-surface-variant">
                {usadas}/{limite} consultas
              </span>
            )}
          </div>
        </div>

        {/* Bloque 2: Ticker de mercado */}
        <MarketTicker />

        {/* Bloque 3: Grid de herramientas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HERRAMIENTAS.map(h => <ToolCard key={h.href} {...h} />)}
        </div>

        {/* Bloque 4: Actividad reciente / Onboarding */}
        <ActividadReciente consultas={ultimasConsultas} />

        {/* Bloque 5: Mi negocio (solo si tiene datos) */}
        <MiNegocio cantProductos={cantProductos} ultimaOperacion={ultimaOperacion} />

      </div>
    </PageLayout>
  )
}
