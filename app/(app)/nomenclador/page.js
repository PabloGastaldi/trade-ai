'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageLayout from '@/components/ui/PageLayout'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const CHIP_BUSQUEDAS = [
  { label: '0902 — Té', query: '0902' },
  { label: '1905 — Galletas', query: '1905' },
  { label: '8422 — Maquinaria', query: '8422' },
  { label: '2204 — Vino', query: '2204' },
]

const ESTADOS_PROCESAMIENTO = [
  { value: 'natural', label: 'Natural / sin procesar' },
  { value: 'semi-procesado', label: 'Semi-procesado / semi-elaborado' },
  { value: 'procesado', label: 'Procesado / elaborado / manufacturado' },
  { value: 'terminado', label: 'Producto terminado / listo para uso' },
]

const PRESENTACIONES = [
  { value: 'granel', label: 'A granel' },
  { value: 'fraccionado', label: 'Fraccionado / envasado para venta minorista' },
  { value: 'industrial', label: 'En envases industriales (tambores, bolsones, etc.)' },
  { value: 'sin_presentacion', label: 'Sin presentación específica' },
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
        fetch(`/api/nomenclador/aranceles?ncm=${encodeURIComponent(ncm.codigo_ncm)}`).then(r => r.json()),
        fetch(`/api/nomenclador/preferencias?ncm=${encodeURIComponent(ncm.codigo_ncm)}`).then(r => r.json()),
        supabase.from('ntm_measures').select('reporter, ntm_code, ntm_non_h').eq('hs_code', hs6).limit(100),
        supabase.from('destination_tariffs').select('reporting_country, ave_rate, year').eq('hs_code', hs6).order('ave_rate', { ascending: false }).limit(10),
      ])

      setAranceles(arancRes.error ? null : arancRes)
      const prefs = prefRes.error ? [] : [
        ...(prefRes.preferencias_especificas ?? []),
        ...(prefRes.acuerdos_cobertura_total ?? []).map(a => ({
          acuerdo: a.acuerdo, pais: a.pais, porcentaje: 100, tipo: a.tipo, esCoberturaTotal: true,
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
  const ntmTop = Object.entries(ntmPorPais).sort((a, b) => b[1].length - a[1].length).slice(0, 5)

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
          <button className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer" onClick={onClose}>
            <svg className="w-4 h-4 text-on-surface-variant" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          <p className="font-mono text-2xl text-primary tracking-wide">{formatearNCM(ncm.codigo_ncm)}</p>
          <p className="font-body text-base text-on-surface mt-2 leading-relaxed">{ncm.descripcion}</p>
          {ncm.seccion && <p className="font-body text-xs text-on-surface-variant mt-1">{ncm.seccion}{ncm.capitulo ? ` — Capítulo ${ncm.capitulo}` : ''}</p>}
          <div className="h-px bg-white/[0.04] my-6" />
          <p className="font-body text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-3">Aranceles de importación</p>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">{[0,1,2,3,4,5].map(i => <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
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
          <p className="font-body text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-3">Aranceles de exportación</p>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">{[0,1].map(i => <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <InfoCelda label="D. Exportación" value={ae.derecho_exportacion != null ? `${ae.derecho_exportacion}%` : '—'} />
              <InfoCelda label="Reintegro" value={ae.reintegro != null ? `${ae.reintegro}%` : '—'} highlight={ae.reintegro > 0 ? 'text-emerald-400' : ''} />
            </div>
          )}
          <div className="h-px bg-white/[0.04] my-6" />
          <p className="font-body text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-3">Acuerdos con preferencia</p>
          {loading ? (
            <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-10 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
          ) : preferencias.length > 0 ? (
            <div className="space-y-2">
              {preferencias.slice(0, 10).map((p, i) => (
                <div key={i} className="flex justify-between items-center py-2 px-3 bg-white/[0.02] rounded-xl">
                  <div><p className="font-body text-sm text-on-surface">{p.acuerdo ?? 'Acuerdo'}</p><p className="font-body text-[10px] text-on-surface-variant/60">{p.pais}{p.bloque ? ` · ${p.bloque}` : ''}{p.esCoberturaTotal ? ' · Libre comercio' : ''}</p></div>
                  <span className={`font-mono text-sm ${p.porcentaje === 100 || p.esCoberturaTotal ? 'text-emerald-400' : 'text-primary'}`}>{p.esCoberturaTotal ? 'TLC' : `${p.porcentaje ?? 0}% pref.`}</span>
                </div>
              ))}
              {preferencias.length > 10 && <p className="font-body text-[10px] text-on-surface-variant/50 text-center pt-1">+{preferencias.length - 10} más</p>}
            </div>
          ) : (
            <p className="font-body text-sm text-on-surface-variant/50 italic">Sin preferencias arancelarias para esta posición</p>
          )}
          <div className="h-px bg-white/[0.04] my-6" />
          <p className="font-body text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-3">Barreras no arancelarias por destino</p>
          {loading ? (
            <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
          ) : ntmTop.length > 0 ? (
            <div className="space-y-2">
              {ntmTop.map(([pais, codigos]) => {
                const tipos = [...new Set(codigos.map(mapNtmCode).filter(Boolean))]
                return (
                  <div key={pais} className="flex justify-between items-center py-2 px-3 bg-white/[0.02] rounded-xl">
                    <div><p className="font-body text-sm text-on-surface">{pais}</p><div className="flex gap-1 mt-1">{tipos.slice(0, 4).map(t => <Badge key={t} variant="accent" className="text-[9px]">{t}</Badge>)}</div></div>
                    <span className="font-body text-[11px] text-on-surface-variant">{codigos.length} medida{codigos.length !== 1 ? 's' : ''}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="font-body text-sm text-on-surface-variant/50 italic">Sin datos NTM para esta posición</p>
          )}
          <div className="h-px bg-white/[0.04] my-6" />
          <p className="font-body text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-3">Aranceles en destinos</p>
          {loading ? (
            <div className="space-y-2">{[0,1,2,3].map(i => <div key={i} className="h-9 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
          ) : tariffDest.length > 0 ? (
            <div className="space-y-1">
              <div className="flex justify-between px-3 py-2"><span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/50">País</span><span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/50">Arancel</span></div>
              {tariffDest.map((t, i) => (
                <div key={i} className="flex justify-between items-center px-3 py-2 hover:bg-white/[0.02] rounded-lg transition-colors">
                  <span className="font-body text-sm text-on-surface">{t.reporting_country}</span>
                  <span className={`font-mono text-sm ${arancelColor(t.ave_rate)}`}>{t.ave_rate != null ? `${t.ave_rate}%` : '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-body text-sm text-on-surface-variant/50 italic">Aranceles de destino no disponibles</p>
          )}
          <div className="h-px bg-white/[0.04] my-6" />
          <div className="space-y-3 pb-4">
            <a href={`/calculadora?ncm=${encodeURIComponent(formatearNCM(ncm.codigo_ncm))}&tipo=importacion`} className="flex items-center gap-2 font-body text-sm text-primary hover:underline">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="12" y2="14" /></svg>
              Calcular costos de importación →
            </a>
            <a href={`/calculadora?ncm=${encodeURIComponent(formatearNCM(ncm.codigo_ncm))}&tipo=exportacion`} className="flex items-center gap-2 font-body text-sm text-primary hover:underline">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="12" y2="14" /></svg>
              Calcular costos de exportación →
            </a>
            <a href={`/catalogo?add=${encodeURIComponent(formatearNCM(ncm.codigo_ncm))}`} className="flex items-center gap-2 font-body text-sm text-primary hover:underline">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Agregar al catálogo →
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

export default function NomencladorPage() {
  const [tab, setTab] = useState('clasificar')
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState(null)
  const [selectedNcm, setSelectedNcm] = useState(null)
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const debounceRef = useRef(null)
  const supabase = createClient()
  const searchParams = useSearchParams()
  const PAGE_SIZE = 50

  const [clasificarForm, setClasificarForm] = useState({ producto: '', material: '', uso: '', estado: '', presentacion: '', detalles: '' })
  const [clasificando, setClasificando] = useState(false)
  const [candidatos, setCandidatos] = useState(null)
  const [notaHaiku, setNotaHaiku] = useState(null)
  const [clasificarError, setClasificarError] = useState(null)

  useEffect(() => {
    const ncmParam = searchParams.get('ncm')
    if (ncmParam) {
      const digits = normalizarNCM(ncmParam)
      if (digits.length >= 2) {
        setQuery(ncmParam)
        setTab('buscar')
        buscar(ncmParam, 0)
      }
    }
  }, [])

  const buscar = useCallback(async (q, pageNum = 0) => {
    if (!q || q.trim().length < 2) { setResultados(null); setTotalCount(null); return }
    setLoading(true)
    const trimmed = q.trim()
    const digits = normalizarNCM(trimmed)
    const esCodigo = digits.length >= 2 && /^\d+$/.test(digits)
    let query_sb = supabase.from('ncm').select('codigo_ncm, descripcion, capitulo, seccion', { count: 'exact' }).order('codigo_ncm').range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)
    if (esCodigo) {
      // codigo_ncm es numérico en Supabase — pasar como Number, no string con ceros
      const desde = Number(digits.padEnd(11, '0'))
      const hasta = Number(digits.padEnd(11, '9')) + 1
      query_sb = query_sb.gte('codigo_ncm', desde).lt('codigo_ncm', hasta)
    } else { query_sb = query_sb.ilike('descripcion', `%${trimmed}%`) }
    const { data, error, count } = await query_sb
    setLoading(false)
    if (error) return
    if (pageNum === 0) { setResultados(data ?? []) }
    else { setResultados(prev => [...(prev ?? []), ...(data ?? [])]) }
    setTotalCount(count)
    setHasMore((data?.length ?? 0) === PAGE_SIZE && ((pageNum + 1) * PAGE_SIZE) < count)
    setPage(pageNum)
  }, [supabase])

  function handleInput(val) {
    setQuery(val); setPage(0)
    clearTimeout(debounceRef.current)
    if (val.trim().length < 2) { setResultados(null); setTotalCount(null); return }
    debounceRef.current = setTimeout(() => buscar(val), 300)
  }

  function handleChip(q) { setQuery(q); buscar(q, 0); setPage(0) }

  function setClasificarCampo(campo, valor) { setClasificarForm(prev => ({ ...prev, [campo]: valor })) }

  async function handleClasificar(e) {
    e.preventDefault()
    if (!clasificarForm.producto.trim()) { setClasificarError('El producto es obligatorio'); return }
    if (!clasificarForm.estado) { setClasificarError('El estado de procesamiento es obligatorio'); return }
    setClasificando(true)
    setClasificarError(null)
    setCandidatos(null)
    setNotaHaiku(null)
    setSelectedNcm(null)
    try {
      const res = await fetch('/api/nomenclador/clasificar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto: clasificarForm.producto.trim(),
          material: clasificarForm.material.trim() || null,
          uso: clasificarForm.uso.trim() || null,
          estado: clasificarForm.estado,
          presentacion: clasificarForm.presentacion || null,
          detalles: clasificarForm.detalles.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error de clasificación')
      setCandidatos(json.candidatos ?? [])
      setNotaHaiku(json.nota ?? null)
    } catch (err) { setClasificarError(err.message) }
    finally { setClasificando(false) }
  }

  function verDetalle(ncm) { setSelectedNcm(ncm) }

  const columns = [
    { key: 'codigo_ncm', label: 'NCM', render: (val) => <span className="font-mono text-sm text-primary">{formatearNCM(val)}</span> },
    { key: 'descripcion', label: 'DESCRIPCIÓN', render: (val) => <span className="font-body text-sm text-on-surface line-clamp-1">{val}</span> },
    { key: 'capitulo', label: 'CAP.', render: (val) => <span className="font-mono text-sm text-on-surface-variant">{val ?? '—'}</span> },
    { key: 'seccion', label: 'SECCIÓN', render: (val) => <span className="font-body text-xs text-on-surface-variant">{val ?? '—'}</span> },
  ]

  const confianzaVariant = { alta: 'success', media: 'accent', baja: 'error' }

  return (
    <PageLayout title="NOMENCLADOR" subtitle="26.000+ posiciones arancelarias">
      <div className="max-w-5xl mx-auto">
        <div className="flex bg-white/[0.02] rounded-xl p-1 w-fit mb-8">
          {[
            { key: 'buscar', label: 'BUSCAR POR CÓDIGO' },
            { key: 'clasificar', label: 'CLASIFICAR MI PRODUCTO' },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSelectedNcm(null); setCandidatos(null); }}
              className={`px-6 py-2.5 font-body text-sm font-semibold tracking-wide rounded-lg transition-all duration-150 ${tab === t.key ? 'bg-white/[0.06] text-on-surface' : 'text-on-surface-variant hover:text-on-surface cursor-pointer'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'buscar' && (
          <div>
            <div className="mb-8">
              <div className="relative max-w-2xl mx-auto">
                <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/30 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input className="w-full bg-surface-highest rounded-2xl pl-14 pr-6 py-4 text-base font-body text-on-surface placeholder:text-on-surface-variant/40 border border-transparent outline-none focus:border-primary/30 transition-all"
                  type="text" placeholder="Buscá por código NCM o descripción del producto..." value={query} onChange={e => handleInput(e.target.value)} autoComplete="off" />
              </div>
              <p className="font-body text-xs text-on-surface-variant/40 text-center mt-2">Escribí un código (ej: 0902.30) o un producto (ej: galletas de chocolate)</p>
            </div>
            {!resultados && !loading && (
              <div className="flex flex-wrap justify-center gap-3 py-8">
                {CHIP_BUSQUEDAS.map(c => (<button key={c.query} className="bg-white/[0.03] rounded-full px-5 py-2.5 text-sm font-body text-on-surface-variant hover:text-on-surface hover:bg-white/[0.06] transition-all cursor-pointer" onClick={() => handleChip(c.query)}>{c.label}</button>))}
              </div>
            )}
            {loading && resultados === null && (<div className="space-y-2">{[0,1,2,3,4,5].map(i => <div key={i} className="h-14 bg-white/[0.02] rounded-xl animate-pulse" />)}</div>)}
            {resultados && resultados.length === 0 && (<div className="text-center py-16"><p className="font-body text-sm text-on-surface-variant">No se encontraron posiciones para "{query}"</p><p className="font-body text-xs text-on-surface-variant/50 mt-1">Probá con otro término o un código NCM más corto</p></div>)}
            {resultados && resultados.length > 0 && (
              <div>
                <div className="rounded-xl border border-white/[0.04] overflow-hidden">
                  <table className="w-full">
                    <thead><tr className="bg-surface-high">{columns.map(col => <th key={col.key} className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-medium">{col.label}</th>)}</tr></thead>
                    <tbody>
                      {resultados.map((row, i) => (<tr key={row.codigo_ncm + i} className="border-t border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => setSelectedNcm(row)}>{columns.map(col => <td key={col.key} className="px-4 py-3">{col.render ? col.render(row[col.key], row) : row[col.key]}</td>)}</tr>))}
                    </tbody>
                  </table>
                </div>
                {totalCount !== null && <p className="font-body text-xs text-on-surface-variant/50 text-center mt-4">Mostrando {resultados.length} de {totalCount.toLocaleString('es-AR')} resultados</p>}
                {hasMore && <div className="flex justify-center mt-4"><button className="bg-white/[0.03] border border-white/[0.04] rounded-xl px-6 py-2.5 font-body text-sm text-on-surface-variant hover:text-on-surface transition-all cursor-pointer" onClick={() => buscar(query, page + 1)} disabled={loading}>{loading ? 'Cargando…' : 'Cargar más'}</button></div>}
              </div>
            )}
          </div>
        )}

        {tab === 'clasificar' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/[0.02] rounded-2xl border border-white/[0.04] p-6 mb-6">
              <p className="font-body text-sm font-semibold tracking-widest text-on-surface-variant uppercase mb-6">Descripción del producto</p>
              <div className="space-y-5">
                <Input label="¿Qué es tu producto?" placeholder="ej: Miel, Tornillos de acero, Vino tinto" hint="Nombre comercial o genérico del producto" value={clasificarForm.producto} onChange={e => setClasificarCampo('producto', e.target.value)} required />
                <Input label="¿De qué material o materia prima está hecho?" placeholder="ej: Acero inoxidable, Algodón 100%, Plástico PET" hint="Material principal y secundarios si tiene" value={clasificarForm.material} onChange={e => setClasificarCampo('material', e.target.value)} />
                <Input label="¿Para qué se usa?" placeholder="ej: Consumo humano, Uso industrial, Construcción" hint="Uso final o destino del producto" value={clasificarForm.uso} onChange={e => setClasificarCampo('uso', e.target.value)} />
                <div>
                  <label className="block font-body text-xs text-on-surface-variant mb-1.5">¿Cuál es su estado o procesamiento? <span className="text-red-400">*</span></label>
                  <select className="w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface border border-transparent outline-none focus:border-primary/40 transition-all cursor-pointer" value={clasificarForm.estado} onChange={e => setClasificarCampo('estado', e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {ESTADOS_PROCESAMIENTO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-body text-xs text-on-surface-variant mb-1.5">¿Cómo está presentado?</label>
                  <select className="w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface border border-transparent outline-none focus:border-primary/40 transition-all cursor-pointer" value={clasificarForm.presentacion} onChange={e => setClasificarCampo('presentacion', e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {PRESENTACIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-body text-xs text-on-surface-variant mb-1.5">Detalles adicionales</label>
                  <textarea className="w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-transparent outline-none focus:border-primary/40 transition-all resize-none" rows={2} placeholder="Peso, concentración, variedad, norma técnica, o cualquier otro dato que ayude a clasificar" value={clasificarForm.detalles} onChange={e => setClasificarCampo('detalles', e.target.value)} />
                  <p className="font-body text-[10px] text-on-surface-variant/50 mt-1">Cuanta más info, mejor la clasificación</p>
                </div>
                {clasificarError && <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/10"><p className="font-body text-xs text-red-400">{clasificarError}</p></div>}
                <Button type="submit" className="w-full" loading={clasificando} onClick={handleClasificar}>{clasificando ? 'Clasificando…' : 'CLASIFICAR'}</Button>
              </div>
            </div>

            {notaHaiku && <div className="mb-6 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20"><p className="font-body text-sm text-amber-400">{notaHaiku}</p></div>}

            {candidatos && candidatos.length > 0 && (
              <div className="space-y-4 mb-6">
                {candidatos.map((c, i) => (
                  <div key={c.codigo_ncm} className={`bg-white/[0.03] rounded-2xl p-5 border ${!c.ncm_exacto ? 'border-dashed border-white/[0.1]' : 'border-white/[0.04]'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2"><span className="font-body text-xs text-on-surface-variant">CANDIDATO {i + 1}</span><Badge variant={confianzaVariant[c.confianza] || 'neutral'}>{c.confianza?.toUpperCase()}</Badge></div>
                    </div>
                    <p className="font-mono text-xl text-primary tracking-wide">{formatearNCM(c.codigo_ncm)}</p>
                    {c.ncm_exacto && <p className="font-body text-sm text-on-surface mt-1">{c.ncm_exacto.descripcion}</p>}
                    {c.ncm_exacto?.seccion && <p className="font-body text-xs text-on-surface-variant/60 mt-1">{c.ncm_exacto.seccion}{c.ncm_exacto.capitulo ? ` — Capítulo ${c.ncm_exacto.capitulo}` : ''}</p>}
                    <p className="font-body text-sm text-on-surface-variant/70 mt-3 italic">"{c.razonamiento}"</p>
                    {(c.aranceles_impo || c.aranceles_expo) && (
                      <div className="flex flex-wrap gap-2 mt-4 p-3 bg-white/[0.02] rounded-xl">
                        {c.aranceles_impo && (<><div className="text-center"><span className="font-mono text-[10px] text-on-surface-variant/50 block">DIE</span><span className="font-mono text-sm text-on-surface">{c.aranceles_impo.die ?? '—'}%</span></div><div className="text-center"><span className="font-mono text-[10px] text-on-surface-variant/50 block">TE</span><span className="font-mono text-sm text-on-surface">{c.aranceles_impo.te ?? '—'}%</span></div><div className="text-center"><span className="font-mono text-[10px] text-on-surface-variant/50 block">IVA</span><span className="font-mono text-sm text-on-surface">{c.aranceles_impo.iva ?? '—'}%</span></div></>)}
                        {c.aranceles_expo && (<><div className="text-center"><span className="font-mono text-[10px] text-on-surface-variant/50 block">DE</span><span className="font-mono text-sm text-on-surface">{c.aranceles_expo.derecho_exportacion ?? '—'}%</span></div><div className="text-center"><span className="font-mono text-[10px] text-on-surface-variant/50 block">Reintegro</span><span className="font-mono text-sm text-emerald-400">{c.aranceles_expo.reintegro ?? '—'}%</span></div></>)}
                      </div>
                    )}
                    {!c.ncm_exacto && c.similares && c.similares.length > 0 && (
                      <div className="mt-4 p-3 bg-white/[0.02] rounded-xl">
                        <p className="font-body text-xs text-on-surface-variant mb-2">El NCM exacto sugerido no existe. Posibles posiciones similares:</p>
                        <div className="space-y-1">{c.similares.map((s) => (<button key={s.codigo_ncm} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors" onClick={() => verDetalle(s)}><span className="font-mono text-xs text-primary">{formatearNCM(s.codigo_ncm)}</span><span className="font-body text-xs text-on-surface-variant ml-2">— {s.descripcion?.slice(0, 50)}</span></button>))}</div>
                      </div>
                    )}
                    {(c.ncm_exacto || c.similares?.[0]) && (
                      <div className="mt-4">
                        <button className="w-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl px-4 py-2.5 font-body text-sm text-on-surface transition-all cursor-pointer" onClick={() => verDetalle(c.ncm_exacto || c.similares[0])}>Ver detalle completo →</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {candidatos && candidatos.length === 0 && !notaHaiku && <div className="text-center py-8"><p className="font-body text-sm text-on-surface-variant">No se encontraron candidatos para este producto.</p><p className="font-body text-xs text-on-surface-variant/50 mt-1">Probá describir mejor el producto o agregar más detalles.</p></div>}
            <div className="mt-8 p-4 bg-surface-high rounded-xl border border-white/[0.04]">
              <p className="font-body text-sm text-on-surface-variant">Esta clasificación es una sugerencia orientativa generada por inteligencia artificial. La clasificación arancelaria oficial debe ser realizada por un despachante de aduana matriculado. Para operaciones concretas, consultá con un profesional de comercio exterior.</p>
            </div>
          </div>
        )}
      </div>
      {selectedNcm && <PanelDetalle ncm={selectedNcm} onClose={() => setSelectedNcm(null)} />}
    </PageLayout>
  )
}