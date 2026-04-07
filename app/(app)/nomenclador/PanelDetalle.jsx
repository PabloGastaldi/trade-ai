'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Badge from '@/components/ui/Badge'
import {
  limpiarDescripcion,
  esValorVacio,
  agruparAcuerdos,
  traducirNTM,
  resolverNombrePais,
  traducirNombrePais,
} from '@/lib/utils/formato-datos'

export const LABEL_ARANCEL_IMPO = {
  aec: { corto: 'AEC', largo: 'Arancel Externo Común' },
  die: { corto: 'DIE', largo: 'Der. Importación Extrazona' },
  dii: { corto: 'DII', largo: 'Der. Importación Intrazona' },
  te:  { corto: 'TE',  largo: 'Tasa de Estadística' },
  iva: { corto: 'IVA', largo: 'IVA' },
  iva_ad: { corto: 'IVA Ad.', largo: 'IVA Adicional' },
  gan: { corto: 'Gan.', largo: 'Perc. Ganancias' },
  iibb: { corto: 'IIBB', largo: 'Perc. Ing. Brutos' },
}

export function formatearNCM(codigo) {
  if (!codigo || codigo.length !== 11) return codigo ?? ''
  return `${codigo.slice(0,4)}.${codigo.slice(4,6)}.${codigo.slice(6,8)}.${codigo.slice(8)}`
}

export function normalizarNCM(input) {
  return input.replace(/[.\s]/g, '').replace(/\D/g, '')
}

export function arancelColor(rate) {
  if (rate === 0 || rate == null) return 'text-emerald-400'
  if (rate > 15) return 'text-primary'
  return 'text-on-surface'
}

export function InfoCelda({ labelCorto, labelLargo, value, highlight }) {
  return (
    <div className="bg-white/[0.02] rounded-xl p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/50">{labelCorto}</p>
      <p className="font-body text-[11px] text-on-surface-variant/70 mt-0.5">{labelLargo}</p>
      <p className={`font-mono text-lg text-on-surface mt-1 ${highlight ?? ''}`}>{value}</p>
    </div>
  )
}

export default function PanelDetalle({ ncm, onClose }) {
  const [aranceles, setAranceles] = useState(null)
  const [preferencias, setPreferencias] = useState([])
  const [ntm, setNtm] = useState([])
  const [tariffDest, setTariffDest] = useState([])
  const [loading, setLoading] = useState(true)
  const [tabOperacion, setTabOperacion] = useState('importacion')
  const [documentos, setDocumentos] = useState({ importacion: [], exportacion: [] })
  const [intervenciones, setIntervenciones] = useState({ importacion: [], exportacion: [] })
  const [restricciones, setRestricciones] = useState([])
  const [ntmGlobal, setNtmGlobal] = useState({ paisesCount: 0, tiposFreq: [] })
  const [acuerdosExpandidos, setAcuerdosExpandidos] = useState(false)

  useEffect(() => {
    if (!ncm) return
    setLoading(true)
    setAcuerdosExpandidos(false)
    const supabase = createClient()
    const hs6 = ncm.codigo_ncm.substring(0, 6)
    const ncm11 = ncm.codigo_ncm.replace(/\./g, '')

    async function fetchAll() {
      const [
        arancRes, prefRes, ntmRes, tariffRes,
        docsImpoRes, docsExpoRes,
        interImpoRes, interExpoRes,
        restRes,
        ntmAffectingRes,
      ] = await Promise.all([
        fetch(`/api/nomenclador/aranceles?ncm=${encodeURIComponent(ncm.codigo_ncm)}`).then(r => r.json()),
        fetch(`/api/nomenclador/preferencias?ncm=${encodeURIComponent(ncm.codigo_ncm)}`).then(r => r.json()),
        supabase.from('ntm_measures').select('reporter, ntm_code, ntm_non_h').eq('hs_code', hs6).limit(100),
        supabase.from('destination_tariffs').select('reporting_country, ave_rate, year').eq('hs_code', hs6).order('ave_rate', { ascending: true }).limit(30),
        supabase.rpc('documentos_por_operacion', { p_tipo: 'importacion', p_regimen: 'general', p_ncm: ncm11 }),
        supabase.rpc('documentos_por_operacion', { p_tipo: 'exportacion', p_regimen: 'general', p_ncm: ncm11 }),
        supabase.rpc('intervenciones_por_operacion', { p_operacion: 'importacion', p_regimen: 'general', p_ncm: ncm11 }),
        supabase.rpc('intervenciones_por_operacion', { p_operacion: 'exportacion', p_regimen: 'general', p_ncm: ncm11 }),
        supabase.rpc('restricciones_por_regimen', { p_regimen: 'general' }),
        supabase.from('ntm_measures_affecting_argentina').select('pais_que_aplica, tipo_medida').eq('hs_code', hs6).limit(200),
      ])

      setAranceles(arancRes.error ? null : arancRes)

      const prefs = prefRes.error ? [] : [
        ...(prefRes.preferencias_especificas ?? []),
        ...(prefRes.acuerdos_cobertura_total ?? []).map(a => ({
          acuerdo: a.acuerdo, pais: a.pais, porcentaje: 100, tipo: a.tipo, esCoberturaTotal: true,
        })),
      ]
      setPreferencias(agruparAcuerdos(prefs))

      setNtm(ntmRes.data ?? [])

      const tariffs = (tariffRes.data ?? [])
        .filter(t => t.ave_rate != null && t.ave_rate <= 200)
        .sort((a, b) => a.ave_rate - b.ave_rate)
      setTariffDest(tariffs)

      setDocumentos({
        importacion: docsImpoRes.data ?? [],
        exportacion: docsExpoRes.data ?? [],
      })
      setIntervenciones({
        importacion: interImpoRes.data ?? [],
        exportacion: interExpoRes.data ?? [],
      })
      setRestricciones(restRes.data ?? [])

      const affRows = ntmAffectingRes.data ?? []
      const paisesUnicos = new Set(affRows.map(r => r.pais_que_aplica).filter(Boolean))
      const tiposCount = {}
      affRows.forEach(r => { if (r.tipo_medida) tiposCount[r.tipo_medida] = (tiposCount[r.tipo_medida] ?? 0) + 1 })
      const tiposFreq = Object.entries(tiposCount).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([tipo]) => tipo)
      setNtmGlobal({ paisesCount: paisesUnicos.size, tiposFreq })

      setLoading(false)
    }

    fetchAll()
  }, [ncm])

  if (!ncm) return null

  const ai = aranceles?.importacion ?? {}
  const ae = aranceles?.exportacion ?? {}

  const ntmPorPais = {}
  ntm.forEach(m => {
    const nombrePais = resolverNombrePais(m.reporter) || m.reporter
    if (!ntmPorPais[nombrePais]) ntmPorPais[nombrePais] = new Set()
    if (m.ntm_code) ntmPorPais[nombrePais].add(m.ntm_code[0])
  })
  const ntmTop = Object.entries(ntmPorPais)
    .map(([pais, codsSet]) => [pais, Array.from(codsSet)])
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5)

  const ACUERDOS_VISIBLE = 10
  const acuerdosVisibles = acuerdosExpandidos ? preferencias : preferencias.slice(0, ACUERDOS_VISIBLE)
  const hayMasAcuerdos = preferencias.length > ACUERDOS_VISIBLE

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-surface-low border-l border-white/[0.04] z-50 overflow-y-auto">
        <div className="p-8">
          <button className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer" onClick={onClose}>
            <svg className="w-4 h-4 text-on-surface-variant" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          <p className="font-mono text-2xl text-primary tracking-wide">{formatearNCM(ncm.codigo_ncm)}</p>
          <p className="font-body text-base text-on-surface mt-2 leading-relaxed">{limpiarDescripcion(ncm.descripcion)}</p>
          {ncm.seccion && <p className="font-body text-xs text-on-surface-variant mt-1">{ncm.seccion}{ncm.capitulo ? ` — Capítulo ${ncm.capitulo}` : ''}</p>}

          {/* ── Aranceles de importación ── */}
          <div className="h-px bg-white/[0.04] my-6" />
          <p className="font-body text-xs font-semibold tracking-widests text-on-surface-variant uppercase mb-3">Aranceles de importación</p>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">{[0,1,2,3,4,5].map(i => <div key={i} className="h-20 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(LABEL_ARANCEL_IMPO).map(([campo, { corto, largo }]) => (
                <InfoCelda key={campo} labelCorto={corto} labelLargo={largo} value={ai[campo] != null ? `${ai[campo]}%` : '—'} />
              ))}
            </div>
          )}

          {/* ── Aranceles de exportación ── */}
          <div className="h-px bg-white/[0.04] my-6" />
          <p className="font-body text-xs font-semibold tracking-widests text-on-surface-variant uppercase mb-3">Aranceles de exportación</p>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">{[0,1].map(i => <div key={i} className="h-20 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <InfoCelda labelCorto="DE" labelLargo="Derecho de Exportación" value={ae.derecho_exportacion != null ? `${ae.derecho_exportacion}%` : '—'} />
              <InfoCelda labelCorto="Reintegro" labelLargo="Reintegro" value={ae.reintegro != null ? `${ae.reintegro}%` : '—'} highlight={ae.reintegro > 0 ? 'text-emerald-400' : ''} />
            </div>
          )}

          {/* ── Acuerdos con preferencia ── */}
          <div className="h-px bg-white/[0.04] my-6" />
          <p className="font-body text-xs font-semibold tracking-widests text-on-surface-variant uppercase mb-3">Acuerdos con preferencia</p>
          {loading ? (
            <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-10 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
          ) : preferencias.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-3 py-1">
                <span className="font-mono text-[10px] uppercase tracking-widests text-on-surface-variant/50">País</span>
                <span className="font-mono text-[10px] uppercase tracking-widests text-on-surface-variant/50">Acuerdo</span>
                <span className="font-mono text-[10px] uppercase tracking-widests text-on-surface-variant/50">Bloque</span>
                <span className="font-mono text-[10px] uppercase tracking-widests text-on-surface-variant/50 text-right">Preferencia</span>
              </div>
              {acuerdosVisibles.map((p, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center py-2 px-3 bg-white/[0.02] rounded-xl">
                  <p className="font-body text-sm text-on-surface truncate">{p.pais}</p>
                  <p className="font-mono text-xs text-on-surface-variant">{p.codigo_acuerdo ?? '—'}</p>
                  <p className="font-body text-xs text-on-surface-variant/60">{p.bloque ?? '—'}</p>
                  <span className={`font-mono text-sm text-right ${p.porcentaje === 100 || p.esCoberturaTotal ? 'text-emerald-400' : 'text-primary'}`}>
                    {p.esCoberturaTotal ? 'TLC' : `${p.porcentaje ?? 0}%`}
                    {(p.porcentaje === 100 || p.esCoberturaTotal) && ' ✓'}
                  </span>
                </div>
              ))}
              {hayMasAcuerdos && (
                <button
                  className="w-full text-center font-body text-xs text-on-surface-variant/60 hover:text-on-surface-variant py-2 transition-colors cursor-pointer"
                  onClick={() => setAcuerdosExpandidos(v => !v)}
                >
                  {acuerdosExpandidos
                    ? 'Ver menos'
                    : `Ver todos (${preferencias.length} acuerdos)`}
                </button>
              )}
            </div>
          ) : (
            <p className="font-body text-sm text-on-surface-variant/50 italic">Sin preferencias arancelarias para esta posición</p>
          )}

          {/* ── Barreras no arancelarias ── */}
          <div className="h-px bg-white/[0.04] my-6" />
          <p className="font-body text-xs font-semibold tracking-widests text-on-surface-variant uppercase mb-3">Barreras no arancelarias por destino</p>
          {loading ? (
            <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
          ) : ntmTop.length > 0 ? (
            <div className="space-y-2">
              {ntmTop.map(([pais, categorias]) => (
                <div key={pais} className="py-2 px-3 bg-white/[0.02] rounded-xl">
                  <div className="flex justify-between items-start">
                    <p className="font-body text-sm text-on-surface">{pais}</p>
                    <span className="font-body text-[11px] text-on-surface-variant ml-2 shrink-0">{categorias.length} tipo{categorias.length !== 1 ? 's' : ''}</span>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {categorias.map(cat => (
                      <li key={cat} className="font-body text-[11px] text-on-surface-variant/80">
                        • {traducirNTM(cat)} <span className="text-on-surface-variant/40">({cat})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-body text-sm text-on-surface-variant/50 italic">Sin datos NTM para esta posición</p>
          )}
          {!loading && ntmGlobal.paisesCount > 0 && (
            <div className="mt-3 px-3 py-2.5 bg-amber-500/[0.06] border border-amber-500/20 rounded-xl">
              <p className="font-body text-xs text-amber-400 font-semibold mb-1">
                {ntmGlobal.paisesCount} país{ntmGlobal.paisesCount !== 1 ? 'es' : ''} aplica{ntmGlobal.paisesCount === 1 ? '' : 'n'} barreras a exportaciones argentinas
              </p>
              {ntmGlobal.tiposFreq.length > 0 && (
                <ul className="space-y-0.5">
                  {ntmGlobal.tiposFreq.map(t => (
                    <li key={t} className="font-body text-[11px] text-amber-300">
                      • {traducirNTM(t)} <span className="text-amber-400/50">({t})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ── Aranceles en destino ── */}
          <div className="h-px bg-white/[0.04] my-6" />
          <p className="font-body text-xs font-semibold tracking-widests text-on-surface-variant uppercase mb-3">Aranceles en destinos</p>
          {loading ? (
            <div className="space-y-2">{[0,1,2,3].map(i => <div key={i} className="h-9 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
          ) : tariffDest.length > 0 ? (
            <div className="space-y-1">
              <div className="flex justify-between px-3 py-2">
                <span className="font-mono text-[10px] uppercase tracking-widests text-on-surface-variant/50">País</span>
                <span className="font-mono text-[10px] uppercase tracking-widests text-on-surface-variant/50">Arancel</span>
              </div>
              {tariffDest.slice(0, 15).map((t, i) => {
                const nombrePais = traducirNombrePais(t.reporting_country)
                const esAlto = t.ave_rate > 100
                return (
                  <div key={i} className="flex justify-between items-center px-3 py-2 hover:bg-white/[0.02] rounded-lg transition-colors">
                    <span className="font-body text-sm text-on-surface">{nombrePais}</span>
                    <span className={`font-mono text-sm ${arancelColor(t.ave_rate)}`}>
                      {t.ave_rate != null ? `${t.ave_rate}%` : '—'}
                      {esAlto && <span className="ml-1 text-amber-400 text-[10px]">⚠</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="font-body text-sm text-on-surface-variant/50 italic">Aranceles de destino no disponibles</p>
          )}

          {/* ── Documentos e intervenciones ── */}
          <div className="h-px bg-white/[0.04] my-6" />
          <p className="font-body text-xs font-semibold tracking-widests text-on-surface-variant uppercase mb-3">Documentos e intervenciones</p>
          <div className="flex gap-1 mb-4">
            {['importacion', 'exportacion'].map(t => (
              <button
                key={t}
                onClick={() => setTabOperacion(t)}
                className={`px-3 py-1 rounded-lg font-body text-xs transition-colors cursor-pointer ${tabOperacion === t ? 'bg-primary text-on-primary font-semibold' : 'text-on-surface-variant hover:bg-white/[0.05]'}`}
              >
                {t === 'importacion' ? 'Importación' : 'Exportación'}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-10 bg-white/[0.03] rounded-xl animate-pulse" />)}</div>
          ) : (() => {
            const docs = documentos[tabOperacion]
            const inters = intervenciones[tabOperacion]
            const interObligatorios = inters.filter(o => o.estado === 'obligatorio')

            if (docs.length === 0 && inters.length === 0) {
              return <p className="font-body text-sm text-on-surface-variant/50 italic">Sin datos para régimen general</p>
            }

            const porCategoria = {}
            for (const doc of docs) {
              const cat = doc.documento_categoria ?? 'general'
              if (!porCategoria[cat]) porCategoria[cat] = []
              porCategoria[cat].push(doc)
            }

            const catColors = { critico: 'text-red-400', recomendado: 'text-primary', condicional: 'text-on-surface-variant', general: 'text-on-surface-variant' }

            return (
              <div className="space-y-4">
                {interObligatorios.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {interObligatorios.map((org, i) => (
                      <Badge key={i} variant="error">{org.organismo}</Badge>
                    ))}
                  </div>
                )}
                {Object.entries(porCategoria).map(([cat, items]) => (
                  <div key={cat}>
                    <p className={`font-body text-[10px] uppercase tracking-widests mb-1 ${catColors[cat] ?? 'text-on-surface-variant'}`}>{cat}</p>
                    <div className="space-y-1">
                      {items.map((doc, i) => (
                        <div key={i} className="py-1.5 px-3 bg-white/[0.02] rounded-lg">
                          <p className="font-body text-sm text-on-surface">{doc.documento_nombre}</p>
                          {!esValorVacio(doc.condicion) && <p className="font-body text-[11px] text-on-surface-variant/60 mt-0.5">{doc.condicion}</p>}
                          {!esValorVacio(doc.notas) && <p className="font-body text-[11px] text-on-surface-variant/60 mt-0.5">{doc.notas}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {inters.filter(o => o.estado !== 'obligatorio').length > 0 && (
                  <div>
                    <p className="font-body text-[10px] uppercase tracking-widests text-on-surface-variant mb-1">Organismos opcionales</p>
                    <div className="space-y-1">
                      {inters.filter(o => o.estado !== 'obligatorio').map((org, i) => (
                        <div key={i} className="py-1.5 px-3 bg-white/[0.02] rounded-lg flex items-center justify-between">
                          <p className="font-body text-sm text-on-surface">{org.organismo}</p>
                          {!esValorVacio(org.notas) && <p className="font-body text-[11px] text-on-surface-variant/60">{org.notas}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {restricciones.length > 0 && (
            <>
              <div className="h-px bg-white/[0.04] my-6" />
              <p className="font-body text-xs font-semibold tracking-widests text-on-surface-variant uppercase mb-3">Restricciones régimen general</p>
              <div className="space-y-1">
                {restricciones.map((r, i) => (
                  <div key={i} className="py-1.5 px-3 bg-white/[0.02] rounded-lg">
                    <p className="font-body text-sm text-on-surface">{r.restriccion}{!esValorVacio(r.valor) ? `: ${r.valor}` : ''}</p>
                    {!esValorVacio(r.notas) && <p className="font-body text-[11px] text-on-surface-variant/60 mt-0.5">{r.notas}</p>}
                  </div>
                ))}
              </div>
            </>
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
