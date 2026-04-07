'use client'

import { useState } from 'react'
import { getMedioPago } from '@/lib/data/medios-pago'

function IconCheckSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function IconXSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function IconChevronDownSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function IconChevronUpSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  )
}

export default function PanelMedioPagoDetalle({ medioId }) {
  const [expandir, setExpandir] = useState(false)
  const medio = getMedioPago(medioId)
  if (!medio) return null

  const badgeColors = {
    'muy bajo': 'bg-emerald-500/10 text-emerald-400',
    'bajo': 'bg-emerald-500/10 text-emerald-400',
    'medio': 'bg-amber-500/10 text-amber-400',
    'alto': 'bg-red-500/10 text-red-400',
  }
  const riesgoCls = (r) => badgeColors[r?.toLowerCase()] ?? 'bg-white/[0.06] text-on-surface-variant'

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.04]">
      <div className="flex items-center justify-between">
        <span className="font-body text-xs text-on-surface-variant">
          Riesgo: <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium ml-1 ${riesgoCls(medio.riesgo_exportador)}`}>Exp: {medio.riesgo_exportador}</span>
          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium ml-1 ${riesgoCls(medio.riesgo_importador)}`}>Imp: {medio.riesgo_importador}</span>
        </span>
        <button
          className="flex items-center gap-1.5 text-primary text-xs font-body hover:underline cursor-pointer"
          onClick={() => setExpandir(v => !v)}
        >
          {expandir ? 'Ocultar' : 'Ver detalle'}
          {expandir ? <IconChevronUpSmall /> : <IconChevronDownSmall />}
        </button>
      </div>

      {expandir && (
        <div className="mt-4 space-y-4">
          <p className="font-body text-sm text-on-surface-variant">{medio.descripcion}</p>

          <div>
            <p className="font-body text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Cómo funciona</p>
            <ol className="space-y-1.5">
              {medio.como_funciona.map((paso, i) => (
                <li key={i} className="flex gap-2 text-sm font-body text-on-surface-variant">
                  <span className="text-primary font-mono text-xs mt-0.5 shrink-0">{i + 1}.</span>
                  <span>{paso}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-body text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Ventajas</p>
              <ul className="space-y-1">
                {medio.ventajas.map((v, i) => (
                  <li key={i} className="flex gap-2 text-sm font-body text-on-surface-variant">
                    <span className="text-emerald-400 mt-0.5 shrink-0"><IconCheckSmall /></span>
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-body text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Desventajas</p>
              <ul className="space-y-1">
                {medio.desventajas.map((d, i) => (
                  <li key={i} className="flex gap-2 text-sm font-body text-on-surface-variant">
                    <span className="text-red-400 mt-0.5 shrink-0"><IconXSmall /></span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <p className="font-body text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Documentos bancarios</p>
            <ul className="space-y-1">
              {medio.documentos_bancarios.map((doc, i) => (
                <li key={i} className="flex gap-2 text-sm font-body text-on-surface-variant">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-2 border-t border-white/[0.04]">
            <p className="font-body text-xs text-on-surface-variant/60">Recomendado para: {medio.recomendado_para}</p>
            <p className="font-mono text-[10px] text-on-surface-variant/40 mt-1">Normativa: {medio.normativa}</p>
          </div>
        </div>
      )}
    </div>
  )
}
