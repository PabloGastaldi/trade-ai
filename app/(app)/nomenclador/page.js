'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageLayout from '@/components/ui/PageLayout'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { limpiarDescripcion } from '@/lib/utils/formato-datos'
import PanelDetalle, { formatearNCM, normalizarNCM } from './PanelDetalle'

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

  const router = useRouter()
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
      const desde = digits.padEnd(11, '0')
      const hasta = String(parseInt(digits, 10) + 1).padStart(digits.length, '0').padEnd(11, '0')
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
    { key: 'descripcion', label: 'DESCRIPCIÓN', render: (val) => <span className="font-body text-sm text-on-surface line-clamp-1">{limpiarDescripcion(val)}</span> },
    { key: 'capitulo', label: 'CAP.', render: (val) => <span className="font-mono text-sm text-on-surface-variant">{val ?? '—'}</span> },
    { key: 'seccion', label: 'SECCIÓN', render: (val) => <span className="font-body text-xs text-on-surface-variant">{val ?? '—'}</span> },
  ]

  const confianzaVariant = { alta: 'success', media: 'accent', baja: 'error' }

  return (
    <PageLayout title="NOMENCLADOR" subtitle="10.000+ posiciones arancelarias">
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
                    {c.ncm_exacto && <p className="font-body text-sm text-on-surface mt-1">{limpiarDescripcion(c.ncm_exacto.descripcion)}</p>}
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
                        <div className="space-y-1">{c.similares.map((s) => (<button key={s.codigo_ncm} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors" onClick={() => verDetalle(s)}><span className="font-mono text-xs text-primary">{formatearNCM(s.codigo_ncm)}</span><span className="font-body text-xs text-on-surface-variant ml-2">— {limpiarDescripcion(s.descripcion)?.slice(0, 50)}</span></button>))}</div>
                      </div>
                    )}
                    {(c.ncm_exacto || c.similares?.[0]) && (
                      <div className="mt-4 flex flex-col gap-2">
                        <button className="w-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl px-4 py-2.5 font-body text-sm text-on-surface transition-all cursor-pointer" onClick={() => verDetalle(c.ncm_exacto || c.similares[0])}>Ver detalle completo →</button>
                        <button className="w-full bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl px-4 py-2.5 font-body text-sm text-primary transition-all cursor-pointer" onClick={() => router.push(`/calculadora?ncm=${c.codigo_ncm}`)}>Calcular costos con este NCM →</button>
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
