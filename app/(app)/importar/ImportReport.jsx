'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertTriangle, FileText, Building2, TrendingDown, Plus, ArrowRight, Loader2, Copy, Wallet, Clock, Ship, Plane, Truck, Receipt } from 'lucide-react'
import { formatearNCMDisplay } from '@/lib/ncm-lookup'
import CopilotRail from './CopilotRail'

const DISCLAIMER =
  'Esta información es orientativa y está respaldada por fuentes oficiales. Para operaciones concretas, ' +
  'consultá con un despachante de aduana matriculado o un profesional de comercio exterior.'

const LABEL_REGIMEN = {
  courier_personal:  'Courier — uso personal',
  courier_comercial: 'Courier — empresa',
  puerta_a_puerta:   'Courier — puerta a puerta',
  general:           'Despacho formal (Régimen General)',
}

// Formatea un número como "USD X.XXX" redondeado al entero más cercano.
function usd(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return `USD ${Math.round(Number(n)).toLocaleString('es-AR')}`
}

// Descarta valores vacíos o el string literal "nan" que llega de la DB.
function valido(texto) {
  return typeof texto === 'string' && texto.trim() !== '' && texto.trim().toLowerCase() !== 'nan'
}

// Plazos de recupero estimados por tributo — "plazo típico", no garantía.
const PLAZOS_RECUPERO = {
  iva: '1-3 meses',
  iva_adicional: '2-6 meses',
  percepcion_ganancias: '12-24 meses',
  ingresos_brutos: '6-18 meses',
}

const LABELS_TRIBUTO = {
  iva: 'IVA',
  iva_adicional: 'IVA Adicional',
  percepcion_ganancias: 'Percepción Ganancias',
  ingresos_brutos: 'Percepción IIBB',
}

/**
 * EntendeTusCostos — separa el costo total en tres baldes: producto (FOB),
 * costo de importación no recuperable (DI + TE + flete + seguro + logística), y
 * crédito fiscal recuperable (IVA + IVA Ad. + Ganancias + IIBB) con plazo estimado.
 *
 * La logística estimada (gastos portuarios, despachante, flete interno, bancarios)
 * es costo real hundido — entra en el balde no recuperable.
 *
 * Se oculta sin romper si falta `desglose` (ej. resultado de régimen courier).
 */
function EntendeTusCostos({ desglose, valoresBase, logistica, esCourier }) {
  if (!desglose || !valoresBase) return null

  const fob = Number(valoresBase.fob) || 0
  const flete = Number(valoresBase.flete) || 0
  const seguro = Number(valoresBase.seguro) || 0
  const logisticaTotal = Number(logistica?.total) || 0

  const derecho = desglose.derecho_importacion?.monto ?? 0
  const tasaEst = desglose.tasa_estadistica?.monto ?? 0
  const costoNoRecuperable = derecho + tasaEst + flete + seguro + logisticaTotal

  const tributosRecuperables = ['iva', 'iva_adicional', 'percepcion_ganancias', 'ingresos_brutos']
    .map(key => ({ key, monto: desglose[key]?.monto ?? 0 }))
    .filter(t => t.monto > 0)
  const creditoFiscal = tributosRecuperables.reduce((acc, t) => acc + t.monto, 0)

  const costoReal = fob + costoNoRecuperable

  return (
    <div className="report-card report-card-1b bg-surface-1 border border-hairline rounded-lg p-6 mb-3">
      <p className="font-body text-sm font-medium text-on-surface mb-4 flex items-center gap-2">
        <Wallet size={16} className="text-on-surface-variant" /> Entendé tus costos
      </p>

      {/* Costo real — resaltado, es lo que no vuelve */}
      <div className="px-4 py-3 bg-surface-2 rounded-md mb-3">
        <p className="font-body text-xs text-on-surface-variant mb-1">Costo real (no recuperable)</p>
        <p className="font-mono text-2xl text-on-surface tabular">{usd(costoReal)}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 font-body text-xs text-on-surface-variant">
          <span>Producto (FOB) <span className="font-mono text-on-surface">{usd(fob)}</span></span>
          <span>Importación + logística <span className="font-mono text-on-surface">{usd(costoNoRecuperable)}</span></span>
        </div>
      </div>

      {/* Crédito fiscal recuperable — desglosado por tributo con plazo */}
      {tributosRecuperables.length > 0 && (
        <div>
          <p className="font-body text-xs text-on-surface-variant mb-2">
            Crédito fiscal recuperable <span className="font-mono text-on-surface">{usd(creditoFiscal)}</span>
          </p>
          <ul className="space-y-1.5">
            {tributosRecuperables.map(t => (
              <li key={t.key} className="flex items-center justify-between gap-3 font-body text-sm text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <Clock size={12} className="text-ink-tertiary shrink-0" />
                  {LABELS_TRIBUTO[t.key]}
                  <span className="text-ink-subtle">· plazo típico estimado {PLAZOS_RECUPERO[t.key]}</span>
                </span>
                <span className="font-mono text-on-surface shrink-0">{usd(t.monto)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="font-body text-[11px] text-ink-subtle leading-relaxed mt-4">
        {logistica
          ? 'Incluye gastos portuarios, despachante, flete interno y gastos bancarios estimados — ver el desglose de logística más abajo.'
          : esCourier
            ? 'El courier es puerta a puerta: la tarifa del operador ya cubre el transporte. No hay despachante ni gastos portuarios.'
            : 'No incluye gastos portuarios ni de despachante — los sumamos en una mejora siguiente.'}
      </p>
    </div>
  )
}

/**
 * LogisticaCard — desglose de costos logísticos post-CIF: flete + seguro internacional
 * (ya parte del CIF) más los ítems estimados (portuarios, despachante, flete interno,
 * bancarios). Estimación de plaza — un proveedor podrá cotizarla en vivo a futuro.
 *
 * Se oculta sin romper si no llega `logistica` (ej. la API no la calculó).
 */
function LogisticaCard({ logistica, fleteSeguro, fleteEstimado }) {
  if (!logistica || !Array.isArray(logistica.items)) return null

  return (
    <div className="report-card report-card-1c bg-surface-1 border border-hairline rounded-lg p-6 mb-3">
      <p className="font-body text-sm font-medium text-on-surface mb-4 flex items-center gap-2">
        <Truck size={16} className="text-on-surface-variant" /> + Logística
      </p>

      <ul className="space-y-1.5 mb-3">
        {fleteSeguro !== null && (
          <li className="flex items-center justify-between gap-3 font-body text-sm text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              Flete + seguro internacional
              {fleteEstimado && (
                <span className="inline-flex items-center rounded-sm bg-surface-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-subtle">
                  estimado
                </span>
              )}
            </span>
            <span className="font-mono text-on-surface shrink-0">{usd(fleteSeguro)}</span>
          </li>
        )}
        {logistica.items.map(item => (
          <li key={item.key} className="flex items-start justify-between gap-3 font-body text-sm text-on-surface-variant">
            <span>
              {item.label}
              <span className="ml-1.5 inline-flex items-center rounded-sm bg-surface-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-subtle">
                estimado
              </span>
              {item.detalle && <span className="block text-ink-subtle mt-0.5">{item.detalle}</span>}
            </span>
            <span className="font-mono text-on-surface shrink-0">{usd(item.monto)}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-2 rounded-md">
        <span className="font-body text-xs text-on-surface-variant">Total logística (estimado)</span>
        <span className="font-mono text-sm text-on-surface">{usd(logistica.total)}</span>
      </div>

      <p className="font-body text-[11px] text-ink-subtle leading-relaxed mt-3">
        Logística estimada — un proveedor podrá cotizarla en vivo.
      </p>
    </div>
  )
}

// Filas del desglose de tributos, en orden de presentación.
const FILAS_TRIBUTOS = [
  ['derecho_importacion', 'Derecho de importación (DI)'],
  ['tasa_estadistica', 'Tasa estadística (TE)'],
  ['iva', 'IVA'],
  ['iva_adicional', 'IVA adicional'],
  ['percepcion_ganancias', 'Percepción Ganancias'],
  ['ingresos_brutos', 'Percepción IIBB'],
]

/**
 * TributosCard — desglose por tributo (alícuota + monto) en filas legibles.
 * Lee calc.regimenes.general.desglose. Se oculta sin romper si no hay datos.
 */
function TributosCard({ desglose, total }) {
  if (!desglose) return null
  const filas = FILAS_TRIBUTOS
    .map(([key, label]) => ({ label, alicuota: desglose[key]?.alicuota, monto: desglose[key]?.monto ?? 0 }))
    .filter(f => f.monto > 0)
  if (filas.length === 0) return null

  return (
    <div className="report-card report-card-1d bg-surface-1 border border-hairline rounded-lg p-6 mb-3">
      <p className="font-body text-sm font-medium text-on-surface mb-4 flex items-center gap-2">
        <Receipt size={16} className="text-on-surface-variant" /> Impuestos y tasas
      </p>
      <ul className="divide-y divide-hairline-soft">
        {filas.map(f => (
          <li key={f.label} className="flex items-center justify-between gap-3 py-2.5 font-body text-sm text-on-surface">
            <span>
              {f.label}
              {f.alicuota != null && <span className="text-ink-tertiary"> · {f.alicuota}%</span>}
            </span>
            <span className="font-mono text-sm text-on-surface shrink-0">{usd(f.monto)}</span>
          </li>
        ))}
      </ul>
      {total != null && (
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-hairline">
          <span className="font-body text-sm font-medium text-on-surface">Total impuestos</span>
          <span className="font-mono text-sm font-medium text-on-surface">{usd(total)}</span>
        </div>
      )}
    </div>
  )
}

/**
 * CostHero — número grande animado con requestAnimationFrame.
 *
 * El counter sube desde 0 al valor final en ~600ms con easing cúbico.
 * Si prefers-reduced-motion está activo, muestra el valor final directo.
 * Usa font-display (Inter 500) para el número hero y font-mono para el detalle.
 */
function CostHero({ costoTotal, fob, fleteSeguro, tributos, esCourier }) {
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
      {/* Número hero: Inter 500 con tracking negativo, tinta carbón — el naranja se reserva para acción */}
      <p className="font-display text-5xl font-medium tracking-[-1.5px] text-on-surface leading-none mb-4 tabular">
        {displayStr}
      </p>
      {/* Desglose: font-mono para los valores, font-body para las etiquetas */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 font-body text-xs text-on-surface-variant">
        <span>Mercadería <span className="font-mono text-on-surface">{usd(fob)}</span></span>
        {fleteSeguro !== null && (
          <span>{esCourier ? 'Envío (courier)' : 'Flete + seguro'} <span className="font-mono text-on-surface">{usd(fleteSeguro)}</span></span>
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
    params.set('regimen', meta.regimen ?? 'courier_personal')
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

  // Support both regimen_unico (single-regime flow) and the legacy multi-regime shape
  // (comparador / origin comparison depend on calc.regimenes.general — never change that path).
  const resultado = calc?.regimen_unico ? calc.resultado : (calc?.regimenes?.general ?? null)
  const regimenActivo = calc?.regimen ?? null
  const esCourier = ['courier_comercial', 'courier_personal', 'puerta_a_puerta'].includes(regimenActivo)

  const base = calc?.valores_base ?? {}
  const logistica = calc?.logistica ?? null
  const fleteEstimado = base.flete_estimado ?? false
  const costoSinLogistica = resultado?.costo_total ?? null
  // Costo total puesto en Argentina = CIF + tributos + logística estimada.
  const costoTotal = costoSinLogistica !== null
    ? costoSinLogistica + (Number(logistica?.total) || 0)
    : null
  const tributos = resultado?.total_tributos ?? null
  const fob = base.fob ?? Number(meta.valor) ?? 0
  const cif = base.cif ?? null
  const fleteSeguro = cif !== null ? Math.max(0, cif - fob) : null

  const organismos = sim?.organismos?.obligatorios ?? []
  const restricciones = (sim?.restricciones ?? []).filter(r => r.valor && r.valor !== 'nan')
  const docsCriticos = sim?.documentos?.criticos ?? []
  const docsImportantes = sim?.documentos?.importantes ?? []
  const prefs = sim?.preferencias ?? {}
  const desglose = resultado?.desglose ?? null

  return (
    /*
     * Layout: columna única en mobile, dos columnas en desktop (lg+).
     * El riel del copiloto ocupa un ancho fijo de 320px en desktop.
     */
    <div className="lg:flex lg:items-start lg:gap-6 lg:max-w-5xl lg:mx-auto px-4 py-10">

      {/* ─── Columna principal: el informe ─── */}
      <div className="flex-1 max-w-2xl mx-auto lg:mx-0">

        {/* Encabezado — sin naranja, es contexto no acción */}
        <p className="font-body text-xs text-on-surface-variant mb-1">Tu importación</p>
        <h1 className="font-body text-lg font-medium text-on-surface mb-2">{meta.ncmDescripcion}</h1>
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-on-surface bg-surface-2 rounded-sm px-2.5 py-1">
            <span className="text-ink-subtle">NCM</span> {formatearNCMDisplay(meta.ncm)}
          </span>
          <span className="font-body text-sm text-on-surface-variant">
            desde {meta.origenNombre} · <span className="font-mono">{`USD ${Number(meta.valor).toLocaleString('es-AR')}`}</span>
          </span>
          {regimenActivo && LABEL_REGIMEN[regimenActivo] && (
            <span className="inline-flex items-center font-body text-xs text-on-surface-variant bg-surface-2 rounded-sm px-2.5 py-1">
              {LABEL_REGIMEN[regimenActivo]}
            </span>
          )}
        </div>

        {/* Referencia de tránsito — estático, el flujo todavía no captura el modo */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-6 font-body text-xs text-ink-subtle">
          <span className="flex items-center gap-1.5"><Ship size={13} /> Marítimo <span className="font-mono">30-45 días</span></span>
          <span className="flex items-center gap-1.5"><Plane size={13} /> Aéreo <span className="font-mono">7-12 días</span></span>
          <span className="text-ink-tertiary">· referencia de tránsito, no calculada para esta importación</span>
        </div>

        {/* 1. ¿Cuánto me sale? — tarjeta con revelado escalonado */}
        <div className="report-card report-card-1 bg-surface-1 border border-hairline rounded-lg p-6 mb-3">
          <CostHero
            costoTotal={costoTotal}
            fob={fob}
            fleteSeguro={fleteSeguro}
            tributos={tributos}
            esCourier={esCourier}
          />
          {esCourier && base.flete_usd_kg && (
            <p className="font-body text-[11px] text-ink-subtle leading-relaxed mt-4">
              Envío estimado a USD {base.flete_usd_kg}/kg (tarifa de consolidador puerta a puerta). El valor real lo define el operador (DHL, FedEx, etc.).
            </p>
          )}
        </div>

        {/* 1b. Entendé tus costos — separa costo real de crédito fiscal recuperable */}
        <EntendeTusCostos desglose={desglose} valoresBase={base} logistica={logistica} esCourier={esCourier} />

        {/* 1c. + Logística — flete/seguro internacional + ítems estimados post-CIF */}
        <LogisticaCard logistica={logistica} fleteSeguro={fleteSeguro} fleteEstimado={fleteEstimado} />

        {/* 1d. Impuestos y tasas — desglose por tributo, legible */}
        <TributosCard desglose={desglose} total={tributos} />

        {/* 2. ¿Qué necesito? */}
        <div className="report-card report-card-2 bg-surface-1 border border-hairline rounded-lg p-6 mb-3">
          <p className="font-body text-sm font-medium text-on-surface mb-4 flex items-center gap-2">
            <FileText size={16} className="text-on-surface-variant" /> ¿Qué necesito?
          </p>

          <div className="space-y-2 mb-4">
            <p className="flex items-center gap-2 font-body text-sm text-emerald-600">
              <CheckCircle2 size={15} /> Podés importar este producto
            </p>
            {organismos.length > 0 && (
              <div className="flex items-start gap-2 font-body text-sm text-amber-600">
                <Building2 size={15} className="mt-0.5 shrink-0" />
                <span>
                  Interviene {organismos.map(o => o.organismo).join(', ')}
                  {organismos.some(o => valido(o.base_legal) || valido(o.notas)) && (
                    <span className="block mt-1 font-body text-xs text-ink-subtle">
                      {organismos.filter(o => valido(o.base_legal) || valido(o.notas)).map((o, i) => (
                        <span key={i} className="block">
                          {o.organismo}
                          {valido(o.notas) && <> — {o.notas}</>}
                          {valido(o.base_legal) && <> (<span className="font-mono">{o.base_legal}</span>)</>}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </div>
            )}
            {restricciones.map((r, i) => (
              <p key={i} className="flex items-start gap-2 font-body text-sm text-red-600">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                {r.restriccion}: {r.valor}
              </p>
            ))}
          </div>

          {(docsCriticos.length > 0 || docsImportantes.length > 0) && (
            <div>
              <p className="font-body text-[11px] uppercase tracking-widest text-ink-subtle mb-2">Documentación</p>
              <ul className="space-y-1.5">
                {docsCriticos.map((d, i) => (
                  <li key={`c${i}`} className="font-body text-xs text-on-surface-variant">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500/60 shrink-0" /> {d.documento_nombre}
                    </span>
                    {(valido(d.notas) || valido(d.base_legal)) && (
                      <span className="block ml-3.5 mt-0.5 text-ink-subtle">
                        {valido(d.notas) && <>{d.notas}</>}
                        {valido(d.base_legal) && <> (<span className="font-mono">{d.base_legal}</span>)</>}
                      </span>
                    )}
                  </li>
                ))}
                {docsImportantes.map((d, i) => (
                  <li key={`i${i}`} className="font-body text-xs text-on-surface-variant">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-ink-tertiary/40 shrink-0" /> {d.documento_nombre}
                    </span>
                    {(valido(d.notas) || valido(d.base_legal)) && (
                      <span className="block ml-3.5 mt-0.5 text-ink-subtle">
                        {valido(d.notas) && <>{d.notas}</>}
                        {valido(d.base_legal) && <> (<span className="font-mono">{d.base_legal}</span>)</>}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 3. ¿Conviene? */}
        <div className="report-card report-card-3 bg-surface-1 border border-hairline rounded-lg p-6 mb-3">
          <p className="font-body text-sm font-medium text-on-surface mb-3 flex items-center gap-2">
            <TrendingDown size={16} className="text-on-surface-variant" /> ¿Conviene desde {meta.origenNombre}?
          </p>
          {prefs.tiene_preferencia ? (
            <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-md">
              <p className="font-body text-sm text-emerald-700">
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
            <p className="font-body text-sm text-on-surface-variant">
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
              <p className="font-body text-[11px] uppercase tracking-widest text-ink-subtle mb-1">Costo por origen</p>
              {comparacion.slice(0, 5).map((f, i) => (
                <div
                  key={f.iso3}
                  className={`flex justify-between items-center px-3 py-2 rounded-md ${i === 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-surface'}`}
                >
                  <span className="font-body text-xs text-on-surface">
                    {nombrePais(f.iso3)}
                    {f.iso3 === meta.origen && <span className="text-ink-subtle"> · tu elección</span>}
                    {i === 0 && <span className="text-emerald-700"> · más barato</span>}
                  </span>
                  <span className={`font-mono text-xs ${i === 0 ? 'text-emerald-700' : 'text-on-surface'}`}>{usd(f.costo)}</span>
                </div>
              ))}
            </div>
          )}

          {comparacion && comparacion.length === 0 && (
            <p className="mt-4 font-body text-xs text-ink-subtle">No pudimos comparar orígenes en este momento.</p>
          )}
        </div>

        {/* Disclaimer */}
        <p className="font-body text-[11px] text-ink-subtle leading-relaxed mb-6">{DISCLAIMER}</p>

        {/* Acciones — revelado final con ligero delay */}
        <div className="report-card report-card-actions flex flex-col sm:flex-row gap-3">
          {/* Acción primaria: carbón (button-primary) — el naranja queda reservado al copiloto IA */}
          <Link
            href={`/operaciones?ncm=${encodeURIComponent(meta.ncm)}&pais=${encodeURIComponent(meta.origen)}&tipo=importacion${meta.ncmDescripcion ? `&desc=${encodeURIComponent(meta.ncmDescripcion)}` : ''}`}
            className="flex-1 py-3 rounded-md bg-on-surface text-on-primary font-body text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          >
            Gestionar esta importación <ArrowRight size={16} />
          </Link>
          <button
            onClick={onReset}
            className="py-3 px-5 rounded-md bg-surface-1 border border-hairline text-on-surface font-body text-sm font-medium flex items-center justify-center gap-2 hover:border-on-surface transition-colors cursor-pointer"
          >
            <Plus size={16} /> Nueva importación
          </button>
          <button
            onClick={copiarLink}
            className="py-3 px-5 rounded-md bg-surface-1 border border-hairline text-on-surface font-body text-sm font-medium flex items-center justify-center gap-2 hover:border-on-surface transition-colors cursor-pointer"
          >
            {copiado
              ? <><CheckCircle2 size={16} className="text-emerald-600" /> Copiado</>
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
