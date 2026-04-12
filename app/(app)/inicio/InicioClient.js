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
          <div className="h-2.5 w-14 bg-white/[0.06] rounded animate-pulse" />
          <div className="h-3 w-16 bg-white/[0.06] rounded animate-pulse" />
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
    <div className="bg-white/[0.02] rounded-2xl px-6 py-4 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar">
        {/* Badge live */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-bold tracking-widest text-on-surface-variant/40 uppercase">Market</span>
        </div>
        <div className="w-px h-4 bg-white/[0.06] shrink-0" />

        {loading
          ? <TickerSkeleton />
          : items.map((item, i) => (
            <div key={i} className="flex items-center gap-6 shrink-0">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-[10px] text-on-surface-variant/40 font-medium">{item.label}</span>
                <span className="font-mono text-sm font-semibold text-on-surface">{item.value}</span>
                {item.change != null && (
                  <span className={`text-[10px] ${item.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
                  </span>
                )}
              </div>
              {i < items.length - 1 && <div className="w-px h-4 bg-white/[0.06] shrink-0" />}
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function InicioClient({ nombre, ultimasConsultas, cantProductos, perfil }) {
  const router = useRouter()
  const [query, setQuery] = useState('')


  function handleSubmit(e) {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return
    router.push(`/consulta?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="relative min-h-[calc(100vh-52px)] flex flex-col justify-center px-6 py-12">

      {/* Orbes ambientales */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/[0.05] rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-primary/[0.03] rounded-full blur-[100px]" />
      </div>

      {/* SECCIÓN 1: Hero */}
      <div
        className="relative max-w-4xl mx-auto w-full"
        style={{ animation: 'fadeInUp 0.6s ease-out forwards', animationDelay: '0ms', opacity: 0 }}
      >

        {/* Título hero */}
        <h1 className="font-body text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] text-center max-w-3xl mx-auto mb-8">
          <span className="text-on-surface">¿Cómo podemos ayudarte con tu </span>
          <span style={{ background: 'linear-gradient(90deg, #DDD92A, rgba(245,245,245,0.6))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            operación hoy?
          </span>
        </h1>

        {/* Barra de chat */}
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
          <div
            className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-1.5 flex items-center transition-all duration-300 focus-within:border-primary/30"
            style={{ focusWithinBoxShadow: '0 0 40px -10px rgba(221,217,42,0.12)' }}
          >
            <Sparkles size={18} className="ml-3 text-primary/60 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Preguntale a la IA: ¿Cuál es el arancel para...?"
              className="bg-transparent border-none outline-none flex-1 px-3 py-3 text-sm font-body text-on-surface placeholder:text-on-surface-variant/30"
            />
            <button
              type="submit"
              className="bg-primary text-on-primary p-2.5 rounded-xl hover:scale-105 active:scale-95 transition-transform shrink-0"
              aria-label="Enviar consulta"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* SECCIÓN 2: Grid de herramientas */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-12 gap-x-10 max-w-4xl mx-auto mt-16 px-4 w-full"
        style={{ animation: 'fadeInUp 0.6s ease-out forwards', animationDelay: '150ms', opacity: 0 }}
      >
        {HERRAMIENTAS.map(tool => (
          <Link key={tool.href} href={tool.href} className="group flex items-start gap-4 relative">
            {/* Línea decorativa izquierda */}
            <div className="absolute -left-4 top-0 w-px h-full bg-gradient-to-b from-primary/20 to-transparent group-hover:from-primary/60 transition-all duration-500" />

            <tool.Icon
              size={28}
              strokeWidth={1.5}
              className="text-on-surface-variant/30 group-hover:text-primary group-hover:scale-110 transition-all duration-300 shrink-0 mt-0.5"
            />

            <div>
              <h3 className="text-lg font-semibold tracking-tight text-on-surface mb-1">{tool.name}</h3>
              <p className="text-sm text-on-surface-variant/60 leading-snug max-w-[220px]">{tool.description}</p>
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
        className="mt-20 w-full"
        style={{ animation: 'fadeInUp 0.6s ease-out forwards', animationDelay: '300ms', opacity: 0 }}
      >
        <MarketTicker />
      </div>


    </div>
  )
}
