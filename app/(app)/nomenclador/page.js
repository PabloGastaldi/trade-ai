'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageLayout from '@/components/ui/PageLayout'
import Badge from '@/components/ui/Badge'

const CHIP_BUSQUEDAS = [
  { label: '0902 — Té', query: '0902' },
  { label: '1905 — Galletas', query: '1905' },
  { label: '8422 — Maquinaria', query: '8422' },
  { label: '2204 — Vino', query: '2204' },
]

function formatearNCM(codigo) {
  if (!codigo || codigo.length !== 11) return codigo ?? ''
  return `${codigo.slice(0,4)}.${codigo.slice(4,6)}.${codigo.slice(6,8)}.${codigo.slice(8)}`
}

function normalizarNCM(input) {
  return input.replace(/[.\s]/g, '').replace(/\D/g, '')
}

function InfoCelda({ label, value, highlight }) {
  return (
    <div className="bg-white/[0.02] rounded-xl p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/50">{label}</p>
      <p className={`font-mono text-lg text-on-surface mt-1 ${highlight ?? ''}`}>{value}</p>
    </div>
  )
}

function arancelColor(rate) {
  if (rate === 0 || rate == null) return 'text-emerald-400'
  if (rate > 15) return 'text-primary'
  return 'text-on-surface'
}

function PanelDetalle({ ncm, onClose }) {
  const [aranceles, setAranceles] = useState(null)
  const [preferencias, setPreferencias] = useState([])
  const [ntm, setNtm] = useState([])
  const [tariffDest, setTariffDest] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ncm) return
    setLoading(true)
    const supabase = createClient()
    const hs6 = ncm.codigo_ncm.substring(0, 6)

    async function fetchAll() {
      const [arancRes, prefRes, ntmRes, tariffRes] = await Promise.all([
        // Aranceles impo + expo en una query via API route (server-side, tablas grandes)
        fetch(`/api/nomenclador/aranceles?ncm=${encodeURIComponent(ncm.codigo_ncm)}`).then(r => r.json()),
        // Preferencias via API route (acuerdos_importacion tiene 1.1M filas)
        fetch(`/api/nomenclador/preferencias?ncm=${encodeURIComponent(ncm.codigo_ncm)}`).then(r => r.json()),
        supabase
          .from('ntm_measures')
          .select('reporter, ntm_code, ntm_non_h')
          .eq('hs_code', hs6)
          .limit(100),
        supabase
          .from('destination_tariffs')
          .select('reporting_country, ave_rate, year')
          .eq('hs_code', hs6)
          .order('ave_rate', { ascending: false })
          .limit(10),
      ])

      setAranceles(arancRes.error ? null : arancRes)
      const prefs = prefRes.error ? [] : [
        ...(prefRes.preferencias_especificas ?? []),
        ...(prefRes.acuerdos_cobertura_total ?? []).map(a => ({
          acuerdo: a.acuerdo,
          pais: a.pais,
          porcentaje: 100,
          tipo: a.tipo,
          esCoberturaTotal: true,
        })),
      ]
      setPreferencias(prefs)
      setNtm(ntmRes.data ?? [])
      setTariffDest(tariffRes.data ?? [])
      setLoading(false)
    }

    fetchAll()
  }, [ncm])

  if (!ncm) return null

  const ai = aranceles?.importacion ?? {}
  const ae = aranceles?.exportacion ?? {}

  const ntmPorPais = {}
  ntm.forEach(m => {
    if (!ntmPorPais[m.reporter]) ntmPorPais[m.reporter] = []
    if (m.ntm_code) ntmPorPais[m.reporter].push(m.ntm_code)
  })
  const ntmTop = Object.entries(ntmPorPais)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5)

  function mapNtmCode(code) {
    if (!code) return null
    const map = { A: 'SPS', B: 'TBT', C: 'INS', E: 'LIC', P: 'EXP' }
    return map[code.charAt(0)] ?? code.substring(0, 3)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-surface-low border-l border-white/[0.04] z-50 overflow-y-auto">
        <div className="p-8">
          <button
            className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
            onClick={onClose}
          >
            <svg className="w-4 h-4 text-on-surface-variant" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <p className="font-mono text-2xl text-primary tracking-wide">{formatearNCM(ncm.codigo_ncm)}</p>
          <p className="font-body text-base text-on-surface mt-2 leading-relaxed">{ncm.descripcion}</p>
          {ncm.seccion && (
            <p className="font-body text-xs text-on-surface-variant mt-1">
              {ncm.seccion}{ncm.capitulo ? ` — Capítulo ${ncm.capitulo}` : ''}
            </p>
          )}

          <div className="h-px bg-white/[0.04] my-6" />

          {/* Aranceles de importación */}
          <p className="font-body text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-3">Aranceles de importación</p>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[0,1,2,3,4,5].map(i => <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <InfoCelda label="AEC (Extrazona)" value={ai.aec != null ? `${ai.aec}%` : '—'} />
              <InfoCelda label="DIE (Extrazona)" value={ai.die != null ? `${ai.die}%` : '—'} />
              <InfoCelda label="DII (Intrazona)" value={ai.dii != null ? `${ai.dii}%` : '—'} />
              <InfoCelda label="Tasa Estadística" value={ai.te != null ? `${ai.te}%` : '—'} />
              <InfoCelda label="IVA" value={ai.iva != null ? `${ai.iva}%` : '—'} />
              <InfoCelda label="IVA Adicional" value={ai.iva_ad != null ? `${ai.iva_ad}%` : '—'} />
              <InfoCelda label="Ganancias" value={ai.gan != null ? `${ai.gan}%` : '—'} />
              <InfoCelda label="Ing. Brutos" value={ai.iibb != null ? `${ai.iibb}%` : '—'} />
            </div>
          )}

          <div className="h-px bg-white/[0.04] my-6" />

          {/* Aranceles de exportación */}
          <p className="font-body text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-3">Aranceles de exportación</p>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[0,1].map(i => <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <InfoCelda label="D. Exportación" value={ae.derecho_exportacion != null ? `${ae.derecho_exportacion}%` : '—'} />
              <InfoCelda label="Reintegro" value={ae.reintegro != null ? `${ae.reintegro}%` : '—'} highlight={ae.reintegro > 0 ? 'text-emerald-400' : ''} />
            </div>
          )}

          <div className="h-px bg-white/[0.04] my-6" />

          {/* Acuerdos y preferencias */}
          <p className="font-body text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-3">Acuerdos con preferencia</p>
          {loading ? (
            <div className="space-y-2">
              {[0,1,2].map(i => <div key={i} className="h-10 bg-white/[0.03] rounded-xl animate-pulse" />)}
            </div>
          ) : preferencias.length > 0 ? (
            <div className="space-y-2">
              {preferencias.slice(0, 10).map((p, i) => (
                <div key={i} className="flex justify-between items-center py-2 px-3 bg-white/[0.02] rounded-xl">
                  <div>
                    <p className="font-body text-sm text-on-surface">{p.acuerdo ?? 'Acuerdo'}</p>
                    <p className="font-body text-[10px] text-on-surface-variant/60">
                      {p.pais}{p.bloque ? ` · ${p.bloque}` : ''}{p.esCoberturaTotal ? ' · Libre comercio' : ''}
                    </p>
                  </div>
                  <span className={`font-mono text-sm ${p.porcentaje === 100 || p.esCoberturaTotal ? 'text-emerald-400' : 'text-primary'}`}>
                    {p.esCoberturaTotal ? 'TLC' : `${p.porcentaje ?? 0}% pref.`}
                  </span>
                </div>
              ))}
              {preferencias.length > 10 && (
                <p className="font-body text-[10px] text-on-surface-variant/50 text-center pt-1">
                  +{preferencias.length - 10} más
                </p>
              )}
            </div>
          ) : (
            <p className="font-body text-sm text-on-surface-variant/50 italic">Sin preferencias arancelarias para esta posición</p>
          )}

          <div className="h-px bg-white/[0.04] my-6" />

          {/* Barreras no arancelarias */}
          <p className="font-body text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-3">Barreras no arancelarias por destino</p>
          {loading ? (
            <div className="space-y-2">
              {[0,1,2].map(i => <div key={i} className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />)}
            </div>
          ) : ntmTop.length > 0 ? (
            <div className="space-y-2">
              {ntmTop.map(([pais, codigos]) => {
                const tipos = [...new Set(codigos.map(mapNtmCode).filter(Boolean))]
                return (
                  <div key={pais} className="flex justify-between items-center py-2 px-3 bg-white/[0.02] rounded-xl">
                    <div>
                      <p className="font-body text-sm text-on-surface">{pais}</p>
                      <div className="flex gap-1 mt-1">
                        {tipos.slice(0, 4).map(t => (
                          <Badge key={t} variant="accent" className="text-[9px]">{t}</Badge>
                        ))}
                      </div>
                    </div>
                    <span className="font-body text-[11px] text-on-surface-variant">{codigos.length} medida{codigos.length !== 1 ? 's' : ''}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="font-body text-sm text-on-surface-variant/50 italic">Sin datos NTM para esta posición</p>
          )}

          <div className="h-px bg-white/[0.04] my-6" />

          {/* Aranceles en destinos */}
          <p className="font-body text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-3">Aranceles en destinos</p>
          {loading ? (
            <div className="space-y-2">
              {[0,1,2,3].map(i => <div key={i} className="h-9 bg-white/[0.03] rounded-xl animate-pulse" />)}
            </div>
          ) : tariffDest.length > 0 ? (
            <div className="space-y-1">
              <div className="flex justify-between px-3 py-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/50">País</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/50">Arancel</span>
              </div>
              {tariffDest.map((t, i) => (
                <div key={i} className="flex justify-between items-center px-3 py-2 hover:bg-white/[0.02] rounded-lg transition-colors">
                  <span className="font-body text-sm text-on-surface">{t.reporting_country}</span>
                  <span className={`font-mono text-sm ${arancelColor(t.ave_rate)}`}>
                    {t.ave_rate != null ? `${t.ave_rate}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-body text-sm text-on-surface-variant/50 italic">Aranceles de destino no disponibles</p>
          )}

          <div className="h-px bg-white/[0.04] my-6" />
          <div className="space-y-3 pb-4">
            <a
              href={`/calculadora?ncm=${encodeURIComponent(formatearNCM(ncm.codigo_ncm))}`}
              className="flex items-center gap-2 font-body text-sm text-primary hover:underline"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="8" y1="6" x2="16" y2="6" />
                <line x1="8" y1="10" x2="16" y2="10" />
                <line x1="8" y1="14" x2="12" y2="14" />
              </svg>
              Calcular costos de importación →
            </a>
            <a
              href={`/catalogo?add=${encodeURIComponent(formatearNCM(ncm.codigo_ncm))}`}
              className="flex items-center gap-2 font-body text-sm text-primary hover:underline"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Agregar al catálogo →
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

export default function NomencladorPage() {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState(null)
  const [selectedNcm, setSelectedNcm] = useState(null)
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const debounceRef = useRef(null)
  const supabase = createClient()
  const PAGE_SIZE = 50

  const buscar = useCallback(async (q, pageNum = 0) => {
    if (!q || q.trim().length < 2) {
      setResultados(null)
      setTotalCount(null)
      return
    }

    setLoading(true)
    const trimmed = q.trim()
    const digits = normalizarNCM(trimmed)
    const esCodigo = digits.length >= 2 && /^\d+$/.test(digits)

    let query_sb = supabase
      .from('ncm')
      .select('codigo_ncm, descripcion, capitulo, seccion', { count: 'exact' })
      .order('codigo_ncm')
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    if (esCodigo) {
      query_sb = query_sb.like('codigo_ncm', `${digits}%`)
    } else {
      query_sb = query_sb.ilike('descripcion', `%${trimmed}%`)
    }

    const { data, error, count } = await query_sb
    setLoading(false)
    if (error) return

    if (pageNum === 0) {
      setResultados(data ?? [])
    } else {
      setResultados(prev => [...(prev ?? []), ...(data ?? [])])
    }
    setTotalCount(count)
    setHasMore((data?.length ?? 0) === PAGE_SIZE && ((pageNum + 1) * PAGE_SIZE) < count)
    setPage(pageNum)
  }, [supabase])

  function handleInput(val) {
    setQuery(val)
    setPage(0)
    clearTimeout(debounceRef.current)
    if (val.trim().length < 2) {
      setResultados(null)
      setTotalCount(null)
      return
    }
    debounceRef.current = setTimeout(() => buscar(val), 300)
  }

  function handleChip(q) {
    setQuery(q)
    buscar(q, 0)
    setPage(0)
  }

  const columns = [
    {
      key: 'codigo_ncm',
      label: 'NCM',
      render: (val) => <span className="font-mono text-sm text-primary">{formatearNCM(val)}</span>,
    },
    {
      key: 'descripcion',
      label: 'DESCRIPCIÓN',
      render: (val) => <span className="font-body text-sm text-on-surface line-clamp-1">{val}</span>,
    },
    {
      key: 'capitulo',
      label: 'CAP.',
      render: (val) => <span className="font-mono text-sm text-on-surface-variant">{val ?? '—'}</span>,
    },
    {
      key: 'seccion',
      label: 'SECCIÓN',
      render: (val) => <span className="font-body text-xs text-on-surface-variant">{val ?? '—'}</span>,
    },
  ]

  return (
    <PageLayout title="NOMENCLADOR" subtitle="26.000+ posiciones arancelarias">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <svg
              className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/30 pointer-events-none"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="w-full bg-surface-highest rounded-2xl pl-14 pr-6 py-4 text-base font-body text-on-surface placeholder:text-on-surface-variant/40 border border-transparent outline-none focus:border-primary/30 transition-all"
              type="text"
              placeholder="Buscá por código NCM o descripción del producto..."
              value={query}
              onChange={e => handleInput(e.target.value)}
              autoComplete="off"
            />
          </div>
          <p className="font-body text-xs text-on-surface-variant/40 text-center mt-2">
            Escribí un código (ej: 0902.30) o un producto (ej: galletas de chocolate)
          </p>
        </div>

        {!resultados && !loading && (
          <div className="text-center py-16">
            <p className="font-display text-4xl tracking-widest text-on-surface/[0.05] uppercase mb-8 select-none pointer-events-none">
              Buscá un NCM
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {CHIP_BUSQUEDAS.map(c => (
                <button
                  key={c.query}
                  className="bg-white/[0.03] rounded-full px-5 py-2.5 text-sm font-body text-on-surface-variant hover:text-on-surface hover:bg-white/[0.06] transition-all cursor-pointer"
                  onClick={() => handleChip(c.query)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && resultados === null && (
          <div className="space-y-2">
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className="h-14 bg-white/[0.02] rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {resultados && resultados.length === 0 && (
          <div className="text-center py-16">
            <p className="font-body text-sm text-on-surface-variant">
              No se encontraron posiciones para "{query}"
            </p>
            <p className="font-body text-xs text-on-surface-variant/50 mt-1">
              Probá con otro término o un código NCM más corto
            </p>
          </div>
        )}

        {resultados && resultados.length > 0 && (
          <>
            <div className="rounded-xl border border-white/[0.04] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-high">
                    {columns.map(col => (
                      <th key={col.key} className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-medium">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((row, i) => (
                    <tr
                      key={row.codigo_ncm + i}
                      className="border-t border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer"
                      onClick={() => setSelectedNcm(row)}
                    >
                      {columns.map(col => (
                        <td key={col.key} className="px-4 py-3">
                          {col.render ? col.render(row[col.key], row) : row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalCount !== null && (
              <p className="font-body text-xs text-on-surface-variant/50 text-center mt-4">
                Mostrando {resultados.length} de {totalCount.toLocaleString('es-AR')} resultados
              </p>
            )}

            {hasMore && (
              <div className="flex justify-center mt-4">
                <button
                  className="bg-white/[0.03] border border-white/[0.04] rounded-xl px-6 py-2.5 font-body text-sm text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
                  onClick={() => buscar(query, page + 1)}
                  disabled={loading}
                >
                  {loading ? 'Cargando…' : 'Cargar más'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedNcm && (
        <PanelDetalle ncm={selectedNcm} onClose={() => setSelectedNcm(null)} />
      )}
    </PageLayout>
  )
}
