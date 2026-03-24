'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import PageLayout from '@/components/ui/PageLayout'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

function formatFecha(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function stripMarkdown(texto) {
  if (!texto) return ''
  return texto
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\|.+\|/g, '')
    .replace(/[-]{3,}/g, '')
    .replace(/\n+/g, ' ')
    .trim()
}

function truncar(texto, max = 120) {
  if (!texto) return ''
  const limpio = stripMarkdown(texto)
  return limpio.length > max ? limpio.slice(0, max).trimEnd() + '…' : limpio
}

function ConsultasSkeleton() {
  return (
    <div className="space-y-3">
      {[0,1,2,3,4].map(i => (
        <div key={i} className="bg-white/[0.03] border border-white/[0.04] rounded-2xl p-5">
          <div className="flex justify-between items-start mb-3">
            <div className="h-3 w-36 bg-white/[0.04] rounded animate-pulse" />
            <div className="h-3 w-6 bg-white/[0.04] rounded animate-pulse" />
          </div>
          <div className="h-4 w-4/5 bg-white/[0.04] rounded animate-pulse mb-2" />
          <div className="h-3 w-3/5 bg-white/[0.04] rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function EstadoVacio({ busqueda }) {
  return (
    <div className="text-center py-20">
      <div className="mx-auto w-12 h-12 mb-4 text-on-surface-variant/[0.15]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <p className="font-body text-base font-semibold text-on-surface-variant/40 uppercase mb-2">
        {busqueda ? 'Sin resultados' : 'Sin consultas aún'}
      </p>
      <p className="font-body text-sm text-on-surface-variant/30">
        {busqueda
          ? `No encontramos consultas para "${busqueda}"`
          : 'Tus consultas aparecerán acá una vez que las realices'
        }
      </p>
      {!busqueda && (
        <a href="/consulta" className="inline-block mt-4 font-body text-sm text-primary hover:underline">
          Ir al chat →
        </a>
      )}
    </div>
  )
}

function ConsultaItem({ consulta, expandido, onToggle, onBorrar, borrando }) {
  const [copiado, setCopiado] = useState(false)
  const fecha = formatFecha(consulta.created_at)
  const previewTexto = truncar(consulta.response_text, 100)

  async function handleCopiar(e) {
    e.stopPropagation()
    await navigator.clipboard.writeText(consulta.response_text)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:bg-white/[0.05] ${
        expandido ? 'border-white/[0.08]' : ''
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[10px] text-on-surface-variant/40">
              {fecha}
            </span>
          </div>
          <p className={`font-body text-sm text-on-surface font-medium leading-snug ${
            expandido ? '' : 'line-clamp-2'
          }`}>
            {consulta.query_text}
          </p>
          {!expandido && previewTexto && (
            <p className="font-body text-xs text-on-surface-variant mt-2 line-clamp-3">
              {previewTexto}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer text-on-surface-variant/40 hover:text-on-surface"
            onClick={(e) => handleBorrar(e, consulta.id)}
            disabled={borrando === consulta.id}
            title="Eliminar consulta"
          >
            {borrando === consulta.id ? (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </button>
          <svg
            className={`w-4 h-4 text-on-surface-variant/40 transition-transform duration-200 ${expandido ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {expandido && (
        <div className="mt-4 pt-4 border-t border-white/[0.04]" onClick={e => e.stopPropagation()}>
          <div className="font-body text-sm text-on-surface leading-relaxed [&_h1]:font-display [&_h1]:text-lg [&_h1]:tracking-wider [&_h1]:uppercase [&_h2]:font-body [&_h2]:text-base [&_h2]:tracking-wider [&_table]:w-full [&_table]:text-sm [&_th]:text-left [&_th]:font-mono [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-on-surface-variant/50 [&_th]:pb-2 [&_td]:py-1.5 [&_tr]:border-t [&_tr]:border-white/[0.04] [&_code]:font-mono [&_code]:text-xs [&_code]:bg-white/[0.06] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_ul]:space-y-1 [&_ul]:pl-4 [&_li]:text-on-surface-variant [&_p]:mb-3 [&_p:last-child]:mb-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {consulta.response_text}
            </ReactMarkdown>
          </div>

          {consulta.ncm_codes_referenced && consulta.ncm_codes_referenced.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {consulta.ncm_codes_referenced.map(ncm => (
                <Badge key={ncm} variant="neutral">{ncm}</Badge>
              ))}
            </div>
          )}

          {consulta.sources_cited && consulta.sources_cited.length > 0 && (
            <p className="font-mono text-[10px] text-primary/60 mt-3">
              Fuentes: {consulta.sources_cited.join(', ')}
            </p>
          )}

          <div className="flex items-center gap-3 mt-4">
            <Button variant="ghost" size="sm" onClick={handleCopiar}>
              {copiado ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copiado
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copiar respuesta
                </>
              )}
            </Button>
            <a
              href={`/consulta?followup=${encodeURIComponent(consulta.query_text)}`}
              className="font-body text-xs text-primary hover:underline flex items-center gap-1"
            >
              Continuar en chat →
            </a>
          </div>

          <div className="mt-4 p-3 bg-primary/5 border border-primary/10 rounded-xl">
            <p className="font-body text-[10px] text-on-surface-variant/50 leading-relaxed">
              Esta información es orientativa y está respaldada por fuentes oficiales.
              Para operaciones concretas, consultá con un despachante de aduana matriculado
              o un profesional de comercio exterior.
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}

export default function HistorialClient({ consultasIniciales, totalInicial, porPagina }) {
  const [consultas, setConsultas] = useState(consultasIniciales)
  const [total, setTotal] = useState(totalInicial)
  const [pagina, setPagina] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [buscandoDebounce, setBuscandoDebounce] = useState('')
  const [expandido, setExpandido] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [borrando, setBorrando] = useState(null)
  const debounceRef = useRef(null)

  const totalPaginas = Math.ceil(total / porPagina)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setBuscandoDebounce(busqueda), 350)
    return () => clearTimeout(debounceRef.current)
  }, [busqueda])

  const fetchConsultas = useCallback(async () => {
    setCargando(true)
    const supabase = createClient()

    let query = supabase
      .from('queries_log')
      .select('id, query_text, response_text, created_at, ncm_codes_referenced, sources_cited', { count: 'exact' })
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .range(pagina * porPagina, (pagina + 1) * porPagina - 1)

    if (buscandoDebounce.trim()) {
      query = query.ilike('query_text', `%${buscandoDebounce.trim()}%`)
    }

    const { data, count, error } = await query

    if (!error) {
      setConsultas(data ?? [])
      setTotal(count ?? 0)
    }
    setCargando(false)
  }, [pagina, buscandoDebounce, porPagina])

  const [montado, setMontado] = useState(false)
  useEffect(() => {
    if (!montado) { setMontado(true); return }
    fetchConsultas()
  }, [fetchConsultas, montado])

  useEffect(() => {
    setPagina(0)
    setExpandido(null)
  }, [buscandoDebounce])

  async function handleBorrar(e, id) {
    e.stopPropagation()
    if (!confirm('¿Borrar esta consulta del historial?')) return
    setBorrando(id)
    try {
      const res = await fetch(`/api/historial/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConsultas(prev => prev.filter(c => c.id !== id))
        setTotal(prev => prev - 1)
        if (expandido === id) setExpandido(null)
      }
    } finally {
      setBorrando(null)
    }
  }

  return (
    <PageLayout title="HISTORIAL" subtitle="Tus consultas anteriores">
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/30 pointer-events-none"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="w-full bg-surface-highest rounded-xl pl-10 pr-4 py-2.5 text-sm font-body text-on-surface placeholder:text-on-surface-variant/40 outline-none border border-transparent focus:border-primary/30 transition-all"
              type="text"
              placeholder="Buscar en tus consultas..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          {total > 0 && (
            <span className="font-mono text-xs text-on-surface-variant/40 shrink-0">
              {total.toLocaleString('es-AR')} consultas
            </span>
          )}
        </div>

        {cargando && consultas.length === 0 ? (
          <ConsultasSkeleton />
        ) : consultas.length === 0 ? (
          <EstadoVacio busqueda={buscandoDebounce} />
        ) : (
          <div className="space-y-3">
            {consultas.map(c => (
              <ConsultaItem
                key={c.id}
                consulta={c}
                expandido={expandido === c.id}
                onToggle={() => setExpandido(prev => prev === c.id ? null : c.id)}
                onBorrar={handleBorrar}
                borrando={borrando}
              />
            ))}
          </div>
        )}

        {consultas.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <span className="font-body text-xs text-on-surface-variant/40">
              Mostrando {consultas.length} de {total.toLocaleString('es-AR')} consultas
            </span>
            <button
              className="bg-white/[0.03] border border-white/[0.04] rounded-xl px-6 py-2.5 font-body text-sm text-on-surface-variant hover:text-on-surface hover:bg-white/[0.06] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setPagina(p => p + 1)}
              disabled={cargando || consultas.length === 0 || (pagina + 1) * porPagina >= total}
            >
              {cargando ? 'Cargando…' : 'Cargar más'}
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
