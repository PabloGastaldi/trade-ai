'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen, Calculator, FileSearch, Globe, Package, BarChart3,
  Sparkles, ArrowRight, ChevronRight,
} from 'lucide-react'
// ── Helpers ──────────────────────────────────────────────────────────────────


function fmtARS(v) {
  if (v == null) return '—'
  return `$${Number(v).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// ── Herramientas ─────────────────────────────────────────────────────────────

const HERRAMIENTAS = [
  { Icon: BookOpen,   name: 'Nomenclador', description: 'Clasificá tu producto y encontrá su posición arancelaria.',           cta: 'Clasificar',   href: '/nomenclador' },
  { Icon: Calculator, name: 'Calculadora', description: 'Calculá costos, aranceles y tributos de importación y exportación.',  cta: 'Calcular',     href: '/calculadora' },
  { Icon: FileSearch, name: 'Simulador',   description: 'Simulá una operación completa de comercio exterior.',                 cta: 'Simular',      href: '/simulador'   },
  { Icon: Globe,      name: 'Comparador',  description: 'Compará condiciones arancelarias entre países.',                      cta: 'Comparar',     href: '/comparador'  },
  { Icon: Package,    name: 'Catálogo',    description: 'Gestioná los productos de tu negocio.',                               cta: 'Ver catálogo', href: '/catalogo'    },
  { Icon: BarChart3,  name: 'Mercados',    description: 'Cotizaciones, tipo de cambio y commodities en vivo.',                 cta: 'Ver mercados', href: '/mercados'    },
]

// ── Ticker ───────────────────────────────────────────────────────────────────

function TickerSkeleton() {
  return (
    <div className="flex items-center gap-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2.5 w-14 bg-surface-high rounded animate-pulse" />
          <div className="h-3 w-16 bg-surface-high rounded animate-pulse" />
        </div>
      ))}
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
      // silencioso
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const d = data?.dolares
  const granos = data?.granos?.granos ?? []
  const rp = data?.riesgoPais

  const soja = granos.find(g => g.name === 'Soja')
  const trigo = granos.find(g => g.name === 'Trigo')

  const items = [
    d?.blue  && { label: 'Dólar Blue', value: fmtARS(d.blue.venta),  change: null },
    d?.mep   && { label: 'Dólar MEP',  value: fmtARS(d.mep.venta),   change: null },
    d?.ccl   && { label: 'Dólar CCL',  value: fmtARS(d.ccl.venta),   change: null },
    rp       && { label: 'Riesgo País',value: rp.valor?.toLocaleString('es-AR'), change: null },
    soja     && { label: 'Soja BCR',   value: fmtARS(soja.price),    change: soja.changePercent ?? null },
    trigo    && { label: 'Trigo BCR',  value: fmtARS(trigo.price),   change: trigo.changePercent ?? null },
  ].filter(Boolean)

  return (
    <div className="bg-surface-1 border border-hairline rounded-lg px-6 py-4 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar">
        {/* Badge live */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-body font-medium text-ink-tertiary uppercase tracking-widest">Market</span>
        </div>
        <div className="w-px h-4 bg-hairline shrink-0" />

        {loading
          ? <TickerSkeleton />
          : items.map((item, i) => (
            <div key={i} className="flex items-center gap-6 shrink-0">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-[10px] text-ink-tertiary font-body font-medium">{item.label}</span>
                <span className="font-body text-sm font-semibold text-on-surface">{item.value}</span>
                {item.change != null && (
                  <span className={`text-[10px] font-body ${item.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
                  </span>
                )}
              </div>
              {i < items.length - 1 && <div className="w-px h-4 bg-hairline shrink-0" />}
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function InicioClient({ nombre }) {
  const router = useRouter()
  const [query, setQuery] = useState('')


  function handleSubmit(e) {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return
    router.push(`/consulta?q=${encodeURIComponent(q)}`)
  }

  const firstName = nombre?.split(' ')[0]

  return (
    <div className="relative min-h-[calc(100vh-52px)] flex flex-col justify-center px-6 py-12">

      {/* SECCIÓN 1: Hero */}
      <div
        className="relative max-w-4xl mx-auto w-full"
        style={{ animation: 'fadeInUp 0.6s ease-out forwards', animationDelay: '0ms', opacity: 0 }}
      >

        {/* Bienvenida decorativa */}
        <p className="text-center font-body text-sm text-ink-tertiary mb-4">
          {firstName ? `Bienvenido al centro de operaciones, ${firstName}` : 'Bienvenido al centro de operaciones'}
        </p>

        {/* Título hero */}
        <h1 className="font-body text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] text-center max-w-3xl mx-auto mb-10">
          <span className="text-on-surface">¿Cómo podemos ayudarte con tu </span>
          <span className="text-primary">
            operación hoy?
          </span>
        </h1>

        {/* Barra de chat */}
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div
            className="bg-surface-1 border border-hairline rounded-lg p-1.5 flex items-center transition-all duration-300 focus-within:border-primary/30"
          >
            <Sparkles size={18} className="ml-3 text-primary/60 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Preguntale a la IA: ¿Cuál es el arancel para...?"
              className="bg-transparent border-none outline-none flex-1 px-3 py-3 text-sm font-body text-on-surface placeholder:text-ink-tertiary"
            />
            <button
              type="submit"
              className="bg-primary text-on-primary p-2.5 rounded-md hover:scale-105 active:scale-95 transition-transform shrink-0"
              aria-label="Enviar consulta"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* SECCIÓN 2: Grid de herramientas */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-14 gap-x-14 max-w-5xl mx-auto mt-20 px-8 w-full"
        style={{ animation: 'fadeInUp 0.6s ease-out forwards', animationDelay: '150ms', opacity: 0 }}
      >
        {HERRAMIENTAS.map(tool => (
          <Link key={tool.href} href={tool.href} className="group flex items-start gap-4 relative">
            {/* Línea decorativa izquierda */}
            <div className="absolute -left-4 top-0 w-px h-full bg-gradient-to-b from-primary/20 to-transparent group-hover:from-primary/60 transition-all duration-500" />

            <tool.Icon
              size={32}
              strokeWidth={1.5}
              className="text-ink-tertiary group-hover:text-primary group-hover:scale-110 transition-all duration-300 shrink-0 mt-0.5"
            />

            <div>
              <h3 className="text-xl font-semibold tracking-tight text-on-surface mb-1.5">{tool.name}</h3>
              <p className="text-sm text-ink-subtle leading-snug max-w-[240px]">{tool.description}</p>
              <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-bold text-primary tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {tool.cta}
                <ChevronRight size={12} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* SECCIÓN 3: Ticker */}
      <div
        className="mt-24 w-full"
        style={{ animation: 'fadeInUp 0.6s ease-out forwards', animationDelay: '300ms', opacity: 0 }}
      >
        <MarketTicker />
      </div>


    </div>
  )
}
