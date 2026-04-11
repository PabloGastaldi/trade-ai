'use client'

import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

const REGIMENES_EXPORTACION = [
  { key: 'general',        label: 'Régimen General',  desc: 'Exportación formal' },
  { key: 'exporta_simple', label: 'Exporta Simple',   desc: 'MiPyMEs · sin derechos · hasta USD 15.000' },
]

function usd(n) {
  if (n === null || n === undefined) return '—'
  return 'USD ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pct(n) {
  if (n === null || n === undefined) return '—'
  return (Number(n)).toFixed(1) + '%'
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

/**
 * Sección de resultados de exportación: precio calculado, construcción del precio,
 * conversión de incoterms y arancel en destino.
 * Props:
 *   resultado — objeto devuelto por /api/calculadora/exportacion
 */
export default function ResultadosExpo({ resultado: r }) {
  const incotermsMostrar = ['EXW', 'FOB', 'CFR', 'CIF', 'DDP']
  const regimenInfo = REGIMENES_EXPORTACION.find(rx => rx.key === r.regimen)

  return (
    <div className="space-y-4">
      {r.warnings?.length > 0 && (
        <div className="bg-amber-500/10 rounded-2xl border border-amber-500/20 p-4">
          <p className="font-body text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">Advertencias</p>
          {r.warnings.map((w, i) => (
            <p key={i} className="font-body text-xs text-amber-300/80 leading-relaxed">{w}</p>
          ))}
        </div>
      )}

      <Card>
        <div className="text-center py-4">
          {regimenInfo && regimenInfo.key !== 'general' && (
            <div className="flex justify-center mb-3">
              <Badge variant="primary">{regimenInfo.label}</Badge>
            </div>
          )}
          <p className="font-body text-xs font-semibold tracking-widest text-on-surface-variant uppercase">
            Precio {r.precio_calculado?.incoterm}
          </p>
          <p className="font-mono text-3xl text-on-surface font-semibold mt-2">
            {r.precio_calculado?.valor !== null ? usd(r.precio_calculado?.valor) : '—'}
          </p>
          {r.precio_calculado?.valor === null && (
            <p className="font-body text-xs text-on-surface-variant/60 mt-2">Datos insuficientes para este incoterm</p>
          )}
          <p className="font-body text-[11px] text-on-surface-variant/50 mt-3">
            {r.ncm_code} · {r.ncm_descripcion}
          </p>
        </div>
      </Card>

      <Card>
        <p className="font-body text-sm font-semibold tracking-widest text-on-surface-variant uppercase mb-4">Construcción del precio</p>

        <div className="space-y-1.5">
          <LineaDesglose
            label={`Precio base (${r.precio_base?.incoterm})`}
            monto={r.precio_base?.valor}
          />
          {r.costos_exportacion?.flete_interno > 0 && (
            <LineaDesglose label="+ Flete interno" monto={r.costos_exportacion.flete_interno} />
          )}
          {r.costos_exportacion?.gastos_portuarios > 0 && (
            <LineaDesglose label="+ Gastos portuarios" monto={r.costos_exportacion.gastos_portuarios} />
          )}
          {r.costos_exportacion?.gastos_aduana_exportacion > 0 && (
            <LineaDesglose label="+ Gastos de despacho" monto={r.costos_exportacion.gastos_aduana_exportacion} />
          )}
          <LineaDesglose label="= Precio FOB" monto={r.precio_fob} />

          {r.costos_exportacion?.derecho_exportacion?.monto > 0 && (
            <LineaDesglose
              label={`− Der. exportación (${pct(r.costos_exportacion.derecho_exportacion.alicuota * 100)})`}
              monto={r.costos_exportacion.derecho_exportacion.monto}
            />
          )}
          <LineaDesglose label="− Registro SIM" monto={r.costos_exportacion?.registro_sim} />

          <div className="h-px bg-white/[0.04] my-2" />
          <LineaDesglose label="Costo neto de exportación" monto={r.costo_neto_exportacion} />

          <div className="flex justify-between items-center py-1.5 mt-1">
            <span className="font-body text-xs text-on-surface font-semibold">Margen neto estimado</span>
            <span className={`font-mono text-sm font-semibold ${r.margen_neto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {usd(r.margen_neto)}
            </span>
          </div>

          {r.reintegro?.alicuota !== null && r.reintegro?.monto > 0 && (
            <LineaDesglose
              label={`+ Reintegro (${pct(r.reintegro.alicuota)}${r.reintegro.bonus_aplicado ? ' + bonus' : ''})`}
              monto={-r.reintegro.monto}
              className="text-emerald-400"
            />
          )}

          {r.percepcion_ganancias_expo?.aplica && (
            <LineaDesglose
              label={`− Percepción Ganancias expo (${pct(r.percepcion_ganancias_expo.alicuota)}): ${r.percepcion_ganancias_expo.motivo}`}
              monto={r.percepcion_ganancias_expo.monto}
              className="text-amber-400"
            />
          )}
        </div>
      </Card>

      <Card>
        <p className="font-body text-sm font-semibold tracking-widest text-on-surface-variant uppercase mb-4">Conversión de incoterms</p>
        <div className="grid grid-cols-2 gap-2">
          {incotermsMostrar.map(inc => {
            const valor = r.conversion_incoterms?.[inc]
            return (
              <div key={inc} className="flex justify-between items-center py-2 px-3 bg-white/[0.02] rounded-xl">
                <span className="font-body text-xs font-semibold tracking-wide text-on-surface-variant">{inc}</span>
                <span className={`font-mono text-xs ${valor === null ? 'text-on-surface-variant/40' : 'text-on-surface'}`}>
                  {valor !== null ? usd(valor) : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {r.arancel_destino && (
        <Card>
          <p className="font-body text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-2">Arancel en destino</p>
          <div className="flex items-center gap-3">
            <Badge variant="accent">
              {r.arancel_destino.ave_rate}% AVE
            </Badge>
            <span className="font-body text-xs text-on-surface-variant">
              {r.pais_destino} · HS {r.arancel_destino.hs_code} · {r.arancel_destino.fuente} {r.arancel_destino.year}
            </span>
          </div>
        </Card>
      )}

      {r.notas?.length > 0 && (
        <div className="bg-white/[0.02] rounded-2xl border border-white/[0.04] p-4 space-y-2">
          {r.notas.map((n, i) => (
            <p key={i} className="font-body text-[11px] text-on-surface-variant/70 leading-relaxed">{n}</p>
          ))}
        </div>
      )}

      <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
        <p className="font-body text-[11px] text-primary/80 leading-relaxed">
          Esta información es orientativa y está respaldada por fuentes oficiales. Para operaciones concretas, consultá con un despachante de aduana matriculado o un profesional de comercio exterior.
        </p>
      </div>

      {r.ncm_code && (
        <div>
          <a
            href={`/simulador?ncm=${encodeURIComponent(r.ncm_code)}${r.pais_destino_iso3 ? `&pais=${encodeURIComponent(r.pais_destino_iso3)}` : ''}&tipo=exportacion`}
            className="flex items-center justify-center gap-2 w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-xl px-4 py-3 font-body text-sm text-on-surface transition-all"
          >
            Simular operación completa con estos datos →
          </a>
        </div>
      )}
    </div>
  )
}
