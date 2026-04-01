'use client'

import { useState, Fragment } from 'react'
import Link from 'next/link'
import PageLayout from '@/components/ui/PageLayout'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { PLANS } from '@/lib/plans-config'

// ────────────────────────────────────────────
// Íconos
// ────────────────────────────────────────────
function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function DashIcon() {
  return (
    <svg className="w-4 h-4 text-on-surface-variant/30 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

// ────────────────────────────────────────────
// Filas de la tabla comparativa
// ────────────────────────────────────────────
const TABLA_FILAS = [
  { grupo: 'IA Consultiva', feature: 'consulta',    label: 'Consultas IA' },
  { grupo: 'Herramientas operativas', feature: 'simulador',   label: 'Simulador' },
  { grupo: 'Herramientas operativas', feature: 'calculadora', label: 'Calculadora' },
  { grupo: 'Herramientas operativas', feature: 'comparador',  label: 'Comparador' },
  { grupo: 'Herramientas operativas', feature: 'operaciones', label: 'Operaciones' },
  { grupo: 'Herramientas operativas', feature: 'nomenclador', label: 'Nomenclador' },
  { grupo: 'Herramientas operativas', feature: 'catalogo',    label: 'Catálogo' },
  { grupo: 'Datos de mercado',        feature: 'mercados',    label: 'Mercados' },
]

const GRUPOS = ['IA Consultiva', 'Herramientas operativas', 'Datos de mercado']

const EMPRESA_EXTRAS = [
  'Soporte prioritario',
  'Usuarios múltiples',
  'Integraciones personalizadas',
]

const PLANES_ORDER = ['free', 'pro', 'empresa']

const PLAN_META = {
  free:    { nombre: 'Gratuito',  precio: '$0',       sub: '/mes',  precioNote: 'Gratis para siempre' },
  pro:     { nombre: 'Pro',       precio: '$15.000',  sub: '/mes',  precioNote: null },
  empresa: { nombre: 'Empresa',   precio: 'A MEDIDA', sub: null,    precioNote: 'Consultanos' },
}

function getLimitLabel(planId, feature) {
  const limit = PLANS[planId]?.limits[feature]
  if (!limit) return null
  // catalogo usa 'total', el resto usa 'monthly'
  const value = limit.monthly !== undefined ? limit.monthly : limit.total
  if (value === null) return limit.label
  return limit.label
}

// ────────────────────────────────────────────
// Columna de plan
// ────────────────────────────────────────────
function PlanHeader({ planId, esActual, onSuscribirse, cargando }) {
  const meta = PLAN_META[planId]
  const isPro = planId === 'pro'
  const isEmpresa = planId === 'empresa'

  return (
    <div className={`relative rounded-2xl p-5 flex flex-col h-full ${
      isPro
        ? 'bg-white/[0.04] border border-primary/25'
        : 'bg-white/[0.02] border border-white/[0.06]'
    }`}>
      {isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="primary" className="tracking-widest text-xs">RECOMENDADO</Badge>
        </div>
      )}

      <div className="text-center mt-2 mb-5">
        <p className={`font-mono text-xs tracking-widest uppercase ${isPro ? 'text-primary' : 'text-on-surface-variant'}`}>
          {meta.nombre}
        </p>
        <div className="mt-3">
          <span className="font-mono text-4xl font-bold text-on-surface">{meta.precio}</span>
          {meta.sub && <span className="font-body text-xs text-on-surface-variant ml-1">{meta.sub}</span>}
        </div>
        {meta.precioNote && (
          <p className="font-body text-xs text-on-surface-variant/50 mt-1">{meta.precioNote}</p>
        )}
      </div>

      {esActual ? (
        <button
          disabled
          className="w-full py-2.5 rounded-xl font-body font-semibold text-sm bg-white/[0.04] text-on-surface-variant/40 cursor-not-allowed"
        >
          Plan actual
        </button>
      ) : isEmpresa ? (
        <a
          href="mailto:tradeaicomex@gmail.com?subject=Consulta%20Plan%20Empresa%20%E2%80%94%20trade.ai"
          className="block w-full py-2.5 rounded-xl font-body font-semibold text-sm text-center bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-on-surface transition-all"
        >
          Contactar
        </a>
      ) : (
        <Button
          variant={isPro ? 'primary' : 'secondary'}
          className="w-full"
          loading={cargando === planId}
          onClick={() => onSuscribirse(planId)}
        >
          Suscribirme
        </Button>
      )}
    </div>
  )
}

// ────────────────────────────────────────────
// Tabla comparativa
// ────────────────────────────────────────────
function TablaComparativa() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left py-3 px-4 font-body text-on-surface-variant/60 font-normal w-40">Funcionalidad</th>
            {PLANES_ORDER.map(planId => (
              <th key={planId} className={`text-center py-3 px-4 font-body font-semibold text-xs tracking-widest uppercase ${planId === 'pro' ? 'text-primary' : 'text-on-surface-variant'}`}>
                {PLAN_META[planId].nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GRUPOS.map(grupo => {
            const filas = TABLA_FILAS.filter(f => f.grupo === grupo)
            return (
              <Fragment key={grupo}>
                <tr>
                  <td colSpan={4} className="pt-5 pb-1 px-4">
                    <span className="font-body text-xs font-semibold tracking-wider uppercase text-on-surface-variant/50">
                      {grupo}
                    </span>
                  </td>
                </tr>
                {filas.map((fila, i) => (
                  <tr
                    key={fila.feature}
                    className={`${i % 2 === 0 ? 'bg-white/[0.015]' : ''} hover:bg-white/[0.025] transition-colors`}
                  >
                    <td className="py-3 px-4 font-body text-on-surface-variant">{fila.label}</td>
                    {PLANES_ORDER.map(planId => {
                      const label = getLimitLabel(planId, fila.feature)
                      const isUnlimited = PLANS[planId]?.limits[fila.feature]?.monthly === null
                        || PLANS[planId]?.limits[fila.feature]?.total === null
                      return (
                        <td key={planId} className="py-3 px-4 text-center">
                          {isUnlimited ? (
                            <span className="inline-flex items-center justify-center gap-1">
                              <CheckIcon />
                              <span className="font-body text-on-surface-variant text-xs">{label}</span>
                            </span>
                          ) : label ? (
                            <span className="font-body text-on-surface-variant text-xs">{label}</span>
                          ) : (
                            <span className="inline-flex justify-center"><DashIcon /></span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </Fragment>
            )
          })}

          {/* Extras Empresa */}
          <tr>
            <td colSpan={4} className="pt-5 pb-1 px-4">
              <span className="font-body text-xs font-semibold tracking-wider uppercase text-on-surface-variant/50">
                Solo Empresa
              </span>
            </td>
          </tr>
          {EMPRESA_EXTRAS.map((extra, i) => (
            <tr key={extra} className={i % 2 === 0 ? 'bg-white/[0.015]' : ''}>
              <td className="py-3 px-4 font-body text-on-surface-variant">{extra}</td>
              <td className="py-3 px-4 text-center"><span className="inline-flex justify-center"><DashIcon /></span></td>
              <td className="py-3 px-4 text-center"><span className="inline-flex justify-center"><DashIcon /></span></td>
              <td className="py-3 px-4 text-center"><span className="inline-flex items-center justify-center"><CheckIcon /></span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────
export default function PlanesClient({ planActual }) {
  const [cargando, setCargando] = useState(null)

  async function handleSuscribirse(planId) {
    if (planId === 'free') return
    setCargando(planId)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Error al crear el checkout. Intentá de nuevo.')
        return
      }

      const { init_point } = await res.json()
      window.location.href = init_point
    } catch {
      alert('Error de conexión. Intentá de nuevo.')
    } finally {
      setCargando(null)
    }
  }

  return (
    <PageLayout title="PLANES" subtitle="Elegí el plan que mejor se adapte">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Cards de plan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANES_ORDER.map(planId => (
            <PlanHeader
              key={planId}
              planId={planId}
              esActual={planId === planActual}
              onSuscribirse={handleSuscribirse}
              cargando={cargando}
            />
          ))}
        </div>

        {/* Tabla comparativa */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden">
          <TablaComparativa />
        </div>

        <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl text-center">
          <p className="font-body text-xs text-on-surface-variant/40 leading-relaxed">
            Los precios incluyen IVA. Podés cancelar tu suscripción en cualquier momento desde Mi Cuenta.
            Esta información es orientativa y está respaldada por fuentes oficiales.
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
