'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Badge from '@/components/ui/Badge'
import {
  limpiarDescripcion,
  esValorVacio,
  agruparAcuerdos,
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
  if (rate === 0 || rate == null) return 'text-emerald-600'
  if (rate > 15) return 'text-primary'
  return 'text-on-surface'
}

export function InfoCelda({ labelCorto, labelLargo, value, highlight }) {
  return (
    <div className="bg-surface rounded-md p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">{labelCorto}</p>
      <p className="font-body text-[11px] text-ink-subtle mt-0.5">{labelLargo}</p>
      <p className={`font-mono text-lg text-on-surface mt-1 ${highlight ?? ''}`}>{value}</p>
    </div>
  )
}

export default function PanelDetalle({ ncm, onClose }) {
  const [aranceles, setAranceles] = useState(null)
  const [preferencias, setPreferencias] = useState([])
  const [loading, setLoading] = useState(true)
  const [documentos, setDocumentos] = useState([])
  const [intervenciones, setIntervenciones] = useState([])
  const [restricciones, setRestricciones] = useState([])
  const [acuerdosExpandidos, setAcuerdosExpandidos] = useState(false)

  useEffect(() => {
    if (!ncm) return
    setLoading(true)
    setAcuerdosExpandidos(false)
    const supabase = createClient()
    const ncm11 = ncm.codigo_ncm.replace(/\./g, '')

    async function fetchAll() {
      const [
        arancRes, prefRes,
        docsRes, interRes,
        restRes,
      ] = await Promise.all([
        fetch(`/api/nomenclador/aranceles?ncm=${encodeURIComponent(ncm.codigo_ncm)}`).then(r => r.json()),
        fetch(`/api/nomenclador/preferencias?ncm=${encodeURIComponent(ncm.codigo_ncm)}`).then(r => r.json()),
        supabase.rpc('documentos_por_operacion', { p_tipo: 'importacion', p_regimen: 'general', p_ncm: ncm11 }),
        supabase.rpc('intervenciones_por_operacion', { p_operacion: 'importacion', p_regimen: 'general', p_ncm: ncm11 }),
        supabase.rpc('restricciones_por_regimen', { p_regimen: 'general' }),
      ])

      setAranceles(arancRes.error ? null : arancRes)

      const prefs = prefRes.error ? [] : [
        ...(prefRes.preferencias_especificas ?? []),
        ...(prefRes.acuerdos_cobertura_total ?? []).map(a => ({
          acuerdo: a.acuerdo, pais: a.pais, porcentaje: 100, tipo: a.tipo, esCoberturaTotal: true,
        })),
      ]
      setPreferencias(agruparAcuerdos(prefs))

      setDocumentos(docsRes.data ?? [])
      setIntervenciones(interRes.data ?? [])
      setRestricciones(restRes.data ?? [])

      setLoading(false)
    }

    fetchAll()
  }, [ncm])

  if (!ncm) return null

  const ai = aranceles?.importacion ?? {}

  const ACUERDOS_VISIBLE = 10
  const acuerdosVisibles = acuerdosExpandidos ? preferencias : preferencias.slice(0, ACUERDOS_VISIBLE)
  const hayMasAcuerdos = preferencias.length > ACUERDOS_VISIBLE

  const interObligatorios = intervenciones.filter(o => o.estado === 'obligatorio')

  const porCategoria = {}
  for (const doc of documentos) {
    const cat = doc.documento_categoria ?? 'general'
    if (!porCategoria[cat]) porCategoria[cat] = []
    porCategoria[cat].push(doc)
  }
  const catColors = { critico: 'text-red-600', recomendado: 'text-primary', condicional: 'text-on-surface-variant', general: 'text-on-surface-variant' }

  return (
    <>
      <div className="fixed inset-0 bg-on-surface/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-surface-1 border-l border-hairline z-50 overflow-y-auto">
        <div className="p-8">
          <button className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface-high transition-colors cursor-pointer" onClick={onClose}>
            <svg className="w-4 h-4 text-on-surface-variant" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          <p className="font-mono text-2xl text-primary tracking-wide">{formatearNCM(ncm.codigo_ncm)}</p>
          <p className="font-body text-base text-on-surface mt-2 leading-relaxed">{limpiarDescripcion(ncm.descripcion)}</p>
          {ncm.seccion && <p className="font-body text-xs text-on-surface-variant mt-1">{ncm.seccion}{ncm.capitulo ? ` — Capítulo ${ncm.capitulo}` : ''}</p>}

          {/* ── Aranceles de importación ── */}
          <div className="h-px bg-hairline my-6" />
          <p className="font-body text-xs font-semibold tracking-widests text-on-surface-variant uppercase mb-3">Aranceles de importación</p>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">{[0,1,2,3,4,5].map(i => <div key={i} className="h-20 bg-surface-high rounded-lg animate-pulse" />)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(LABEL_ARANCEL_IMPO).map(([campo, { corto, largo }]) => (
                <InfoCelda key={campo} labelCorto={corto} labelLargo={largo} value={ai[campo] != null ? `${ai[campo]}%` : '—'} />
              ))}
            </div>
          )}

          {/* ── Acuerdos con preferencia ── */}
          <div className="h-px bg-hairline my-6" />
          <p className="font-body text-xs font-semibold tracking-widests text-on-surface-variant uppercase mb-3">Acuerdos con preferencia</p>
          {loading ? (
            <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-10 bg-surface-high rounded-lg animate-pulse" />)}</div>
          ) : preferencias.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-3 py-1">
                <span className="font-mono text-[10px] uppercase tracking-widests text-ink-subtle">País</span>
                <span className="font-mono text-[10px] uppercase tracking-widests text-ink-subtle">Acuerdo</span>
                <span className="font-mono text-[10px] uppercase tracking-widests text-ink-subtle">Bloque</span>
                <span className="font-mono text-[10px] uppercase tracking-widests text-ink-subtle text-right">Preferencia</span>
              </div>
              {acuerdosVisibles.map((p, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center py-2 px-3 bg-surface rounded-md">
                  <p className="font-body text-sm text-on-surface truncate">{p.pais}</p>
                  <p className="font-mono text-xs text-on-surface-variant">{p.codigo_acuerdo ?? '—'}</p>
                  <p className="font-body text-xs text-ink-subtle">{p.bloque ?? '—'}</p>
                  <span className={`font-mono text-sm text-right ${p.porcentaje === 100 || p.esCoberturaTotal ? 'text-emerald-600' : 'text-primary'}`}>
                    {p.esCoberturaTotal ? 'TLC' : `${p.porcentaje ?? 0}%`}
                    {(p.porcentaje === 100 || p.esCoberturaTotal) && ' ✓'}
                  </span>
                </div>
              ))}
              {hayMasAcuerdos && (
                <button
                  className="w-full text-center font-body text-xs text-ink-subtle hover:text-on-surface-variant py-2 transition-colors cursor-pointer"
                  onClick={() => setAcuerdosExpandidos(v => !v)}
                >
                  {acuerdosExpandidos
                    ? 'Ver menos'
                    : `Ver todos (${preferencias.length} acuerdos)`}
                </button>
              )}
            </div>
          ) : (
            <p className="font-body text-sm text-ink-subtle italic">Sin preferencias arancelarias para esta posición</p>
          )}

          {/* ── Documentos e intervenciones de importación ── */}
          <div className="h-px bg-hairline my-6" />
          <p className="font-body text-xs font-semibold tracking-widests text-on-surface-variant uppercase mb-3">Documentos e intervenciones</p>
          {loading ? (
            <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-10 bg-surface-high rounded-lg animate-pulse" />)}</div>
          ) : documentos.length === 0 && intervenciones.length === 0 ? (
            <p className="font-body text-sm text-ink-subtle italic">Sin datos para régimen general</p>
          ) : (
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
                      <div key={i} className="py-1.5 px-3 bg-surface rounded-md">
                        <p className="font-body text-sm text-on-surface">{doc.documento_nombre}</p>
                        {!esValorVacio(doc.condicion) && <p className="font-body text-[11px] text-ink-subtle mt-0.5">{doc.condicion}</p>}
                        {!esValorVacio(doc.notas) && <p className="font-body text-[11px] text-ink-subtle mt-0.5">{doc.notas}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {intervenciones.filter(o => o.estado !== 'obligatorio').length > 0 && (
                <div>
                  <p className="font-body text-[10px] uppercase tracking-widests text-on-surface-variant mb-1">Organismos opcionales</p>
                  <div className="space-y-1">
                    {intervenciones.filter(o => o.estado !== 'obligatorio').map((org, i) => (
                      <div key={i} className="py-1.5 px-3 bg-surface rounded-md flex items-center justify-between">
                        <p className="font-body text-sm text-on-surface">{org.organismo}</p>
                        {!esValorVacio(org.notas) && <p className="font-body text-[11px] text-ink-subtle">{org.notas}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {restricciones.length > 0 && (
            <>
              <div className="h-px bg-hairline my-6" />
              <p className="font-body text-xs font-semibold tracking-widests text-on-surface-variant uppercase mb-3">Restricciones régimen general</p>
              <div className="space-y-1">
                {restricciones.map((r, i) => (
                  <div key={i} className="py-1.5 px-3 bg-surface rounded-md">
                    <p className="font-body text-sm text-on-surface">{r.restriccion}{!esValorVacio(r.valor) ? `: ${r.valor}` : ''}</p>
                    {!esValorVacio(r.notas) && <p className="font-body text-[11px] text-ink-subtle mt-0.5">{r.notas}</p>}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="h-px bg-hairline my-6" />
          <div className="space-y-3 pb-4">
            <a href={`/calculadora?ncm=${encodeURIComponent(formatearNCM(ncm.codigo_ncm))}`} className="flex items-center gap-2 font-body text-sm text-primary hover:underline">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="12" y2="14" /></svg>
              Calcular costos de importación →
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
