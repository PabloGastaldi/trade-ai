'use client'

import { useState } from 'react'
import PageLayout from '@/components/ui/PageLayout'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

const PLANES = [
  {
    id: 'free',
    nombre: 'GRATUITO',
    precio: '$0',
    sub: '/mes',
    precioRaw: 'Gratis para siempre',
    destacado: false,
    features: [
      '15 consultas IA/mes',
      '5 cálculos de costos',
      '5 productos en catálogo',
      '2 operaciones activas',
    ],
    cta: null,
  },
  {
    id: 'pro',
    nombre: 'PRO',
    precio: '$15.000',
    sub: '/mes',
    precioRaw: null,
    destacado: true,
    features: [
      '200 consultas IA/mes',
      'Calculadora ilimitada',
      '50 productos en catálogo',
      '20 operaciones activas',
      'Comparador por país',
      'Exportar a PDF',
      'Nomenclador completo',
    ],
    cta: 'Suscribirme',
  },
  {
    id: 'empresa',
    nombre: 'EMPRESA',
    precio: 'A MEDIDA',
    sub: null,
    precioRaw: 'Consultanos',
    destacado: false,
    features: [
      'Todo ilimitado',
      'Múltiples usuarios',
      'Dashboard estadísticas',
      'Alertas normativas',
      'Soporte prioritario',
    ],
    cta: 'Contactar',
    contacto: true,
  },
]

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function PlanCard({ plan, esActual, onSuscribirse, cargando }) {
  return (
    <div className={`relative rounded-2xl p-6 flex flex-col h-full ${
      plan.destacado
        ? 'bg-white/[0.03] border border-primary/20'
        : 'bg-white/[0.03] border border-white/[0.04]'
    }`}>
      {plan.destacado && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="primary" className="tracking-widest">RECOMENDADO</Badge>
        </div>
      )}

      <div className="text-center mb-6 mt-2">
        <p className={`font-mono text-sm tracking-widest uppercase ${
          plan.destacado ? 'text-primary' : 'text-on-surface-variant'
        }`}>
          {plan.nombre}
        </p>

        <div className="mt-4">
          <span className={`font-mono text-5xl font-bold ${
            plan.id === 'free' ? 'text-on-surface' : ''
          }`}>
            {plan.precio}
          </span>
          {plan.sub && (
            <span className="font-body text-sm text-on-surface-variant ml-1">{plan.sub}</span>
          )}
        </div>

        {plan.precioRaw && (
          <p className="font-body text-xs text-on-surface-variant/60 mt-1">{plan.precioRaw}</p>
        )}
      </div>

      <ul className="space-y-2.5 mb-6 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckIcon />
            <span className="font-body text-sm text-on-surface-variant leading-snug">{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        {esActual ? (
          <button
            disabled
            className="w-full py-3 rounded-xl font-body font-semibold text-sm bg-white/[0.04] text-on-surface-variant/40 cursor-not-allowed"
          >
            Plan actual
          </button>
        ) : plan.contacto ? (
          <a
            href="mailto:tradeaicomex@gmail.com?subject=Consulta%20Plan%20Empresa%20%E2%80%94%20trade.ai"
            className="block w-full py-3 rounded-xl font-body font-semibold text-sm text-center bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-on-surface transition-all"
          >
            {plan.cta}
          </a>
        ) : (
          <Button
            variant={plan.destacado ? 'primary' : 'secondary'}
            className="w-full"
            loading={cargando === plan.id}
            onClick={() => onSuscribirse(plan.id)}
          >
            {plan.cta}
          </Button>
        )}
      </div>
    </div>
  )
}

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
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANES.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              esActual={plan.id === planActual}
              onSuscribirse={handleSuscribirse}
              cargando={cargando}
            />
          ))}
        </div>

        <div className="mt-8 p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl text-center">
          <p className="font-body text-xs text-on-surface-variant/40 leading-relaxed">
            Los precios incluyen IVA. Podés cancelar tu suscripción en cualquier momento desde Mi Cuenta.
            Esta información es orientativa y está respaldada por fuentes oficiales.
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
