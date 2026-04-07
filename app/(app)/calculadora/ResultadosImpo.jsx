'use client'

import { useState } from 'react'
import Badge from '@/components/ui/Badge'

const REGIMENES_IMPORTACION = [
  { key: 'general',           label: 'Régimen General',    desc: 'Despacho formal a plaza' },
  { key: 'courier_comercial', label: 'Courier Comercial',  desc: 'E-commerce · hasta USD 3.000 FOB' },
  { key: 'courier_personal',  label: 'Courier Personal',   desc: 'Franquicia USD 400 · hasta USD 3.000 FOB' },
  { key: 'puerta_a_puerta',   label: 'Puerta a Puerta',    desc: 'Franquicia USD 400 · hasta USD 3.000 FOB' },
]

// Todos los regímenes para el selector de desglose (orden de visualización)
const REGIMENES_ORDEN = [
  { key: 'general',    label: 'Régimen General', desc: 'Despacho formal a plaza' },
  { key: 'courier',    label: 'Courier',          desc: 'Hasta USD 3.000 FOB' },
  { key: 'pef',        label: 'PEF Personal',     desc: 'Prestadores especiales' },
  { key: 'correo_upu', label: 'Correo UPU',        desc: 'Correo Argentino' },
]

function usd(n) {
  if (n === null || n === undefined) return '—'
  return 'USD ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pct(n) {
  if (n === null || n === undefined) return '—'
  return (Number(n)).toFixed(1) + '%'
}

function formatAlicuota(n) {
  if (!n || n === 0) return null
  return pct(n)
}

function LineaDesglose({ label, alicuota, monto, className = '' }) {
  if (!monto && monto !== 0) return null
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className={`font-body text-xs text-on-surface-variant ${className}`}>
        {label}
        {alicuota ? <span className="ml-1 text-[10px] text-on-surface-variant/50">({pct(alicuota)})</span> : null}
      </span>
      <span className={`font-mono text-xs text-on-surface ${className}`}>{usd(monto)}</span>
    </div>
  )
}

function DesgloseImportacion({ data }) {
  const [expandido, setExpandido] = useState(false)

  return (
    <div className="mt-4 bg-white/[0.02] rounded-xl border border-white/[0.04] overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpandido(p => !p)}
      >
        <span className="font-body text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Desglose completo</span>
        <svg
          className={`w-4 h-4 text-on-surface-variant transition-transform duration-200 ${expandido ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expandido && (
        <div className="px-5 pb-5 border-t border-white/[0.04]">
          <div className="pt-4 space-y-0">
            <p className="font-body text-[10px] font-semibold tracking-widest text-on-surface-variant/60 uppercase mb-2">Base imponible</p>
            <LineaDesglose label="FOB" monto={data.valores_base?.fob} />
            <LineaDesglose label="Flete" monto={data.valores_base?.flete} />
            <LineaDesglose label="Seguro" monto={data.valores_base?.seguro} />
            <LineaDesglose label="CIF" monto={data.valores_base?.cif} />

            {data.regimenes?.general?.desglose && (
              <>
                <div className="h-px bg-white/[0.04] my-3" />
                <p className="font-body text-[10px] font-semibold tracking-widest text-on-surface-variant/60 uppercase mb-2">Tributos</p>
                {Object.entries(data.regimenes?.general?.desglose ?? {}).map(([key, v]) => {
                  if (!v || v.monto === 0) return null
                  const labels = {
                    derecho_importacion: 'Derecho de importación',
                    tasa_estadistica: 'Tasa estadística',
                    iva: 'IVA importación',
                    iva_adicional: 'Perc. IVA adicional',
                    percepcion_ganancias: 'Perc. Ganancias',
                    ingresos_brutos: 'Ingresos brutos',
                  }
                  return <LineaDesglose key={key} label={labels[key] ?? key} alicuota={v.alicuota} monto={v.monto} />
                })}
              </>
            )}

            <div className="h-px bg-white/[0.04] my-3" />
            <div className="flex justify-between items-center py-1.5">
              <span className="font-body text-xs text-on-surface font-semibold">Total tributos</span>
              <span className="font-mono text-xs text-on-surface font-semibold">{usd(data.regimenes?.general?.total_tributos)}</span>
            </div>
          </div>

          {data.preferencia_aplicada && (
            <div className="mt-4 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
              <p className="font-body text-[11px] text-emerald-400">
                Preferencia arancelaria: {data.preferencia_aplicada.acuerdo}
              </p>
            </div>
          )}

          {data.notas?.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {data.notas.map((n, i) => (
                <p key={i} className="font-body text-[10px] text-on-surface-variant/60 leading-relaxed">{n}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResultadoRegimenUnico({ resultado }) {
  const { resultado: res, regimen, valores_base, preferencia_aplicada, notas, warnings } = resultado
  const regimenInfo = REGIMENES_IMPORTACION.find(r => r.key === regimen) ?? { label: regimen, desc: '' }

  if (!res.disponible) {
    return (
      <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/[0.04] text-center">
        <p className="font-body text-sm font-semibold text-on-surface-variant mb-1">{regimenInfo.label}</p>
        <p className="font-body text-xs text-red-400">{res.motivo_no_disponible}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {warnings?.length > 0 && (
        <div className="bg-amber-500/10 rounded-2xl border border-amber-500/20 p-4">
          <p className="font-body text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">Advertencias</p>
          {warnings.map((w, i) => (
            <p key={i} className="font-body text-xs text-amber-300/80 leading-relaxed">{w}</p>
          ))}
        </div>
      )}

      <div className="bg-white/[0.03] rounded-2xl border border-primary/20 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-body text-sm font-semibold tracking-wide text-on-surface uppercase">{regimenInfo.label}</p>
            <p className="font-body text-[10px] text-on-surface-variant mt-0.5">{regimenInfo.desc}</p>
          </div>
          <Badge variant="primary">{regimen.replace(/_/g, ' ')}</Badge>
        </div>

        <p className="font-mono text-2xl text-on-surface font-semibold">{usd(res.costo_total)}</p>
        <p className="font-body text-[10px] text-on-surface-variant/50 mt-0.5">Costo total (CIF + tributos)</p>

        <div className="mt-4 pt-4 border-t border-white/[0.04] space-y-2">
          <div className="flex justify-between">
            <span className="font-body text-xs text-on-surface-variant">CIF base</span>
            <span className="font-mono text-xs text-on-surface">{usd(valores_base?.cif)}</span>
          </div>
          {Object.entries(res.desglose ?? {}).map(([key, v]) => {
            if (!v || (v.monto === 0 && key !== 'franquicia')) return null
            const labels = {
              franquicia:          'Franquicia exenta',
              derecho_importacion: 'Derecho de importación',
              tasa_estadistica:    'Tasa estadística',
              iva:                 'IVA importación',
            }
            return (
              <div key={key} className="flex justify-between items-start">
                <span className="font-body text-xs text-on-surface-variant">
                  {labels[key] ?? key}
                  {v.alicuota ? <span className="ml-1 text-[10px] text-on-surface-variant/50">({pct(v.alicuota)})</span> : null}
                  {v.nota ? <span className="ml-1 text-[10px] text-on-surface-variant/40"> · {v.nota}</span> : null}
                </span>
                <span className="font-mono text-xs text-on-surface ml-4 shrink-0">{usd(v.monto)}</span>
              </div>
            )
          })}
          <div className="pt-2 border-t border-white/[0.04] flex justify-between">
            <span className="font-body text-xs text-on-surface font-semibold">Total tributos</span>
            <span className="font-mono text-xs text-on-surface font-semibold">{usd(res.total_tributos)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-body text-[10px] text-on-surface-variant">Effective rate</span>
            <span className="font-mono text-[11px] text-primary">{pct(res.effective_rate)}</span>
          </div>
        </div>

        {preferencia_aplicada && (
          <div className="mt-4 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
            <p className="font-body text-[11px] text-emerald-400">
              Preferencia arancelaria: {preferencia_aplicada.acuerdo} ({preferencia_aplicada.porcentaje_preferencia}% pref.)
            </p>
          </div>
        )}
      </div>

      {notas?.length > 0 && (
        <div className="bg-white/[0.02] rounded-2xl border border-white/[0.04] p-4 space-y-1.5">
          {notas.map((n, i) => (
            <p key={i} className="font-body text-[10px] text-on-surface-variant/60 leading-relaxed">{n}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function CardRegimenImportacion({ regimen, info, data, esMejor, seleccionado, onClick }) {
  if (!data.disponible) {
    return (
      <div
        className={`bg-white/[0.03] rounded-2xl p-5 border border-white/[0.04] cursor-not-allowed opacity-50 ${seleccionado ? 'ring-1 ring-primary/30' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-body text-sm font-semibold tracking-wide text-on-surface uppercase">{info.label}</p>
            <p className="font-body text-[10px] text-on-surface-variant mt-0.5">{info.desc}</p>
          </div>
          <Badge variant="neutral">No disponible</Badge>
        </div>
        <p className="font-body text-xs text-on-surface-variant/60 mt-2">{data.motivo_no_disponible}</p>
      </div>
    )
  }

  const esGeneral = regimen === 'general'
  const desglose = data.desglose

  return (
    <div
      className={`bg-white/[0.03] rounded-2xl p-5 border transition-all duration-150 cursor-pointer ${
        seleccionado
          ? 'border-primary/30 ring-1 ring-primary/10'
          : 'border-white/[0.04] hover:border-white/[0.08]'
      } ${esMejor ? 'bg-primary/[0.03]' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-body text-sm font-semibold tracking-wide text-on-surface uppercase">{info.label}</p>
            {esMejor && <Badge variant="success">Mejor opción</Badge>}
          </div>
          <p className="font-body text-[10px] text-on-surface-variant mt-0.5">{info.desc}</p>
        </div>
        {seleccionado && (
          <svg className="w-4 h-4 text-primary mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      <p className="font-mono text-xl text-on-surface font-semibold mt-3">{usd(data.costo_total)}</p>
      <p className="font-body text-[10px] text-on-surface-variant/50 mt-0.5">Costo total</p>

      <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-1.5">
        <div className="flex justify-between">
          <span className="font-body text-[11px] text-on-surface-variant">FOB</span>
          <span className="font-mono text-[11px] text-on-surface">{usd(data.costo_total - data.total_tributos)}</span>
        </div>
        {desglose && (
          <>
            {esGeneral && desglose.derecho_importacion?.monto > 0 && (
              <div className="flex justify-between">
                <span className="font-body text-[11px] text-on-surface-variant">
                  DI ({formatAlicuota(desglose.derecho_importacion.alicuota)})
                </span>
                <span className="font-mono text-[11px] text-on-surface">{usd(desglose.derecho_importacion.monto)}</span>
              </div>
            )}
            {esGeneral && desglose.iva?.monto > 0 && (
              <div className="flex justify-between">
                <span className="font-body text-[11px] text-on-surface-variant">
                  IVA ({formatAlicuota(desglose.iva.alicuota)})
                </span>
                <span className="font-mono text-[11px] text-on-surface">{usd(desglose.iva.monto)}</span>
              </div>
            )}
            {esGeneral && desglose.iva_adicional?.monto > 0 && (
              <div className="flex justify-between">
                <span className="font-body text-[11px] text-on-surface-variant">
                  Perc. IVA ({formatAlicuota(desglose.iva_adicional.alicuota)})
                </span>
                <span className="font-mono text-[11px] text-on-surface">{usd(desglose.iva_adicional.monto)}</span>
              </div>
            )}
            {esGeneral && desglose.percepcion_ganancias?.monto > 0 && (
              <div className="flex justify-between">
                <span className="font-body text-[11px] text-on-surface-variant">
                  Ganancias ({formatAlicuota(desglose.percepcion_ganancias.alicuota)})
                </span>
                <span className="font-mono text-[11px] text-on-surface">{usd(desglose.percepcion_ganancias.monto)}</span>
              </div>
            )}
            {esGeneral && desglose.ingresos_brutos?.monto > 0 && (
              <div className="flex justify-between">
                <span className="font-body text-[11px] text-on-surface-variant">
                  Ing. Brutos ({formatAlicuota(desglose.ingresos_brutos.alicuota)})
                </span>
                <span className="font-mono text-[11px] text-on-surface">{usd(desglose.ingresos_brutos.monto)}</span>
              </div>
            )}
            {!esGeneral && desglose.tributo_unico && (
              <div className="flex justify-between">
                <span className="font-body text-[11px] text-on-surface-variant">Tributo 50%</span>
                <span className="font-mono text-[11px] text-on-surface">{usd(desglose.tributo_unico.monto)}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-white/[0.04] flex justify-between items-center">
        <span className="font-body text-[10px] text-on-surface-variant">Effective rate</span>
        <span className="font-mono text-[11px] text-primary">{pct(data.effective_rate)}</span>
      </div>
    </div>
  )
}

/**
 * Sección de resultados de importación: cards de régimen + desglose.
 * Props:
 *   resultado        — objeto devuelto por /api/calculadora/importacion
 *   regSeleccionado  — key del régimen activo
 *   setRegSeleccionado — setter
 */
export default function ResultadosImpo({ resultado, regSeleccionado, setRegSeleccionado }) {
  const mejorOpcion = resultado?.mejor_opcion ?? null

  if (resultado.regimen_unico) {
    return <ResultadoRegimenUnico resultado={resultado} />
  }

  return (
    <>
      <div className="space-y-4">
        {REGIMENES_ORDEN.map(r => {
          const data = resultado.regimenes?.[r.key]
          if (!data) return null
          return (
            <CardRegimenImportacion
              key={r.key}
              regimen={r.key}
              info={r}
              data={data}
              esMejor={r.key === mejorOpcion}
              seleccionado={regSeleccionado === r.key}
              onClick={() => data.disponible && setRegSeleccionado(r.key)}
            />
          )
        })}
      </div>
      {resultado.regimenes[regSeleccionado]?.disponible && (
        <DesgloseImportacion data={resultado} />
      )}
    </>
  )
}
