'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertTriangle, FileText, Building2, TrendingDown, Plus, ArrowRight, Loader2, Copy } from 'lucide-react'
import CopilotRail from './CopilotRail'

const DISCLAIMER =
  'Esta información es orientativa y está respaldada por fuentes oficiales. Para operaciones concretas, ' +
  'consultá con un despachante de aduana matriculado o un profesional de comercio exterior.'

// Formatea un número como "USD X.XXX" redondeado al entero más cercano.
function usd(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return `USD ${Math.round(Number(n)).toLocaleString('es-AR')}`
}

/**
 * CostHero — número grande animado con requestAnimationFrame.
 *
 * El counter sube desde 0 al valor final en ~600ms con easing cúbico.
 * Si prefers-reduced-motion está activo, muestra el valor final directo.
 * Usa font-display (Bebas Neue) para el número hero y font-mono para el detalle.
 */
function CostHero({ costoTotal, fob, fleteSeguro, tributos }) {
  const [displayed, setDisplayed] = useState(null)
  const rafRef = useRef(null)
  const prefersReduced = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    if (costoTotal === null || costoTotal === undefined) {
      setDisplayed(null)
      return
    }

    const target = Math.round(Number(costoTotal))

    if (prefersReduced.current) {
      setDisplayed(target)
      return
    }

    const DURATION = 600 // ms
    const start = performance.now()

    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / DURATION, 1)
      // easing: ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [costoTotal])

  const displayStr = displayed !== null
    ? `USD ${displayed.toLocaleString('es-AR')}`
    : '—'

  return (
    <div>
      <p className="font-body text-xs text-on-surface-variant mb-2">Costo total puesto en Argentina</p>
      {/* Número hero: Bebas Neue para impacto editorial; amarillo primario como dato clave */}
      <p className="font-display text-5xl text-primary leading-none mb-4 tabular">
        {displayStr}
      </p>
      {/* Desglose: font-mono para los valores, font-body para las etiquetas */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 font-body text-xs text-on-surface-variant">
        <span>Mercadería <span className="font-mono text-on-surface">{usd(fob)}</span></span>
        {fleteSeguro !== null && (
          <span>Flete + seguro <span className="font-mono text-on-surface">{usd(fleteSeguro)}</span></span>
        )}
        <span>Impuestos <span className="font-mono text-on-surface">{usd(tributos)}</span></span>
      </div>
    </div>
  )
}

export default function ImportReport({ report, paises = [], onReset }) {
  const { sim, calc, meta } = report

  const [comparacion, setComparacion] = useState(null)
  const [comparando, setComparando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const nombrePais = (iso3) => paises.find(p => p.iso3 === iso3)?.name_es ?? iso3

  function copiarLink() {
    const params = new URLSearchParams({ ncm: meta.ncm, pais: meta.origen, valor: String(meta.valor) })
    if (meta.flete) params.set('flete', String(meta.flete))
    const url = `${window.location.origin}/importar?${params.toString()}`
    navigator.clipboard?.writeText(url)
      .then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000) })
      .catch(() => {})
  }

  async function compararOrigenes() {
    setComparando(true)
    try {
      const candidatos = [...new Set(['CHN', 'BRA', 'USA', 'DEU', 'IND', 'MEX', 'URY', meta.origen])].slice(0, 7)
      const res = await fetch('/api/comparador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ncm_code: meta.ncm,
          valor_fob: Number(meta.valor),
          flete_impo: Number(meta.flete) || 0,
          paises: candidatos,
        }),
      })
      const json = await res.json()
      const filas = (json.resultados ?? [])
        .filter(r => r.ok && r.data?.regimenes?.general?.costo_total != null)
        .map(r => ({ iso3: r.pais_iso3, costo: r.data.regimenes.general.costo_total }))
        .sort((a, b) => a.costo - b.costo)
      setComparacion(filas)
    } catch {
      setComparacion([])
    } finally {
      setComparando(false)
    }
  }

  const general = calc?.regimenes?.general ?? null
  const base = calc?.valores_base ?? {}
  const costoTotal = general?.costo_total ?? null
  const tributos = general?.total_tributos ?? null
  const fob = base.fob ?? Number(meta.valor) ?? 0
  const cif = base.cif ?? null
  const fleteSeguro = cif !== null ? Math.max(0, cif - fob) : null

  const organismos = sim?.organismos?.obligatorios ?? []
  const restricciones = (sim?.restricciones ?? []).filter(r => r.valor && r.valor !== 'nan')
  const docsCriticos = sim?.documentos?.criticos ?? []
  const docsImportantes = sim?.documentos?.importantes ?? []
  const prefs = sim?.preferencias ?? {}

  return (
    /*
     * Layout: columna única en mobile, dos columnas en desktop (lg+).
     * El riel del copiloto ocupa un ancho fijo de 320px en desktop.
     */
    <div className="lg:flex lg:items-start lg:gap-6 lg:max-w-5xl lg:mx-auto px-4 py-10">

      {/* ─── Columna principal: el informe ─── */}
      <div className="flex-1 max-w-2xl mx-auto lg:mx-0">

        {/* Encabezado — sin amarillo, es contexto no acción */}
        <p className="font-body text-xs text-on-surface-variant mb-1">Tu importación</p>
        <h1 className="font-body text-lg font-medium text-on-surface mb-1">{meta.ncmDescripcion}</h1>
        <p className="font-body text-sm text-on-surface-variant mb-8">
          desde {meta.origenNombre} · <span className="font-mono">{`USD ${Number(meta.valor).toLocaleString('es-AR')}`}</span>
        </p>

        {/* 1. ¿Cuánto me sale? — tarjeta con revelado escalonado */}
        <div className="report-card report-card-1 bg-white/[0.03] border border-white/[0.04] rounded-2xl p-6 mb-3">
          <CostHero
            costoTotal={costoTotal}
            fob={fob}
            fleteSeguro={fleteSeguro}
            tributos={tributos}
          />
        </div>

        {/* 2. ¿Qué necesito? */}
        <div className="report-card report-card-2 bg-white/[0.03] border border-white/[0.04] rounded-2xl p-6 mb-3">
          <p className="font-body text-sm font-medium text-on-surface mb-4 flex items-center gap-2">
            <FileText size={16} className="text-on-surface-variant" /> ¿Qué necesito?
          </p>

          <div className="space-y-2 mb-4">
            <p className="flex items-center gap-2 font-body text-sm text-emerald-400">
              <CheckCircle2 size={15} /> Podés importar este producto
            </p>
            {organismos.length > 0 && (
              <p className="flex items-start gap-2 font-body text-sm text-amber-400">
                <Building2 size={15} className="mt-0.5 shrink-0" />
                Interviene {organismos.map(o => o.organismo).join(', ')}
              </p>
            )}
            {restricciones.map((r, i) => (
              <p key={i} className="flex items-start gap-2 font-body text-sm text-red-400">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                {r.restriccion}: {r.valor}
              </p>
            ))}
          </div>

          {(docsCriticos.length > 0 || docsImportantes.length > 0) && (
            <div>
              <p className="font-body text-[11px] uppercase tracking-widest text-on-surface-variant/50 mb-2">Documentación</p>
              <ul className="space-y-1.5">
                {docsCriticos.map((d, i) => (
                  <li key={`c${i}`} className="flex items-center gap-2 font-body text-xs text-on-surface-variant">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400/60 shrink-0" /> {d.documento_nombre}
                  </li>
                ))}
                {docsImportantes.map((d, i) => (
                  <li key={`i${i}`} className="flex items-center gap-2 font-body text-xs text-on-surface-variant">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" /> {d.documento_nombre}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 3. ¿Conviene? */}
        <div className="report-card report-card-3 bg-white/[0.03] border border-white/[0.04] rounded-2xl p-6 mb-3">
          <p className="font-body text-sm font-medium text-on-surface mb-3 flex items-center gap-2">
            <TrendingDown size={16} className="text-on-surface-variant" /> ¿Conviene desde {meta.origenNombre}?
          </p>
          {prefs.tiene_preferencia ? (
            <div className="px-4 py-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
              <p className="font-body text-sm text-emerald-400">
                Tiene preferencia arancelaria{prefs.acuerdos?.[0]?.bloque ? ` (${prefs.acuerdos[0].bloque})` : ''}
                {prefs.arancel_efectivo !== null && prefs.arancel_efectivo !== undefined
                  ? ` — arancel efectivo `
                  : ''}
                {prefs.arancel_efectivo !== null && prefs.arancel_efectivo !== undefined && (
                  <span className="font-mono">{prefs.arancel_efectivo}%</span>
                )}
              </p>
            </div>
          ) : (
            <p className="font-body text-sm text-on-surface-variant/70">
              No hay preferencia arancelaria para este origen. Otros orígenes con acuerdo podrían bajar el costo.
            </p>
          )}

          {!comparacion && (
            <button
              onClick={compararOrigenes}
              disabled={comparando}
              className="mt-4 flex items-center gap-2 font-body text-xs text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50 cursor-pointer"
            >
              {comparando && <Loader2 size={13} className="animate-spin" />}
              Ver de qué países conviene traerlo
            </button>
          )}

          {comparacion && comparacion.length > 0 && (
            <div className="mt-4 space-y-1">
              <p className="font-body text-[11px] uppercase tracking-widest text-on-surface-variant/50 mb-1">Costo por origen</p>
              {comparacion.slice(0, 5).map((f, i) => (
                <div
                  key={f.iso3}
                  className={`flex justify-between items-center px-3 py-2 rounded-lg ${i === 0 ? 'bg-emerald-500/5 border border-emerald-500/15' : 'bg-white/[0.02]'}`}
                >
                  <span className="font-body text-xs text-on-surface">
                    {nombrePais(f.iso3)}
                    {f.iso3 === meta.origen && <span className="text-on-surface-variant/50"> · tu elección</span>}
                    {i === 0 && <span className="text-emerald-400"> · más barato</span>}
                  </span>
                  <span className={`font-mono text-xs ${i === 0 ? 'text-emerald-400' : 'text-on-surface'}`}>{usd(f.costo)}</span>
                </div>
              ))}
            </div>
          )}

          {comparacion && comparacion.length === 0 && (
            <p className="mt-4 font-body text-xs text-on-surface-variant/60">No pudimos comparar orígenes en este momento.</p>
          )}
        </div>

        {/* Disclaimer */}
        <p className="font-body text-[11px] text-on-surface-variant/50 leading-relaxed mb-6">{DISCLAIMER}</p>

        {/* Acciones — revelado final con ligero delay */}
        <div className="report-card report-card-actions flex flex-col sm:flex-row gap-3">
          {/* Acción primaria: el único uso del amarillo en el informe */}
          <Link
            href={`/operaciones?ncm=${encodeURIComponent(meta.ncm)}&pais=${encodeURIComponent(meta.origen)}&tipo=importacion${meta.ncmDescripcion ? `&desc=${encodeURIComponent(meta.ncmDescripcion)}` : ''}`}
            className="flex-1 py-3 rounded-xl bg-primary-intense text-on-primary font-body text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          >
            Gestionar esta importación <ArrowRight size={16} />
          </Link>
          <button
            onClick={onReset}
            className="py-3 px-5 rounded-xl bg-white/[0.04] text-on-surface font-body text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/[0.07] transition-colors cursor-pointer"
          >
            <Plus size={16} /> Nueva importación
          </button>
          <button
            onClick={copiarLink}
            className="py-3 px-5 rounded-xl bg-white/[0.04] text-on-surface font-body text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/[0.07] transition-colors cursor-pointer"
          >
            {copiado
              ? <><CheckCircle2 size={16} className="text-emerald-400" /> Copiado</>
              : <><Copy size={16} /> Copiar link</>}
          </button>
        </div>
      </div>

      {/* ─── Columna del copiloto (desktop) + botón flotante + bottom-sheet (mobile) ─── */}
      <div className="lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-6">
        <CopilotRail meta={meta} costoTotal={costoTotal} />
      </div>
    </div>
  )
}
