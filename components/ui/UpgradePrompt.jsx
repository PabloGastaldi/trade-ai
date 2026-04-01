'use client'

import Link from 'next/link'
import { Zap } from 'lucide-react'

const FEATURE_LABELS = {
  consulta:    'consultas IA',
  simulador:   'simulaciones',
  calculadora: 'cálculos',
  comparador:  'comparaciones',
  operaciones: 'operaciones',
  nomenclador: 'búsquedas en el nomenclador',
  catalogo:    'productos en el catálogo',
}

/**
 * Banner que se muestra cuando el usuario alcanza el límite de su plan.
 *
 * @param {{ feature: string, limit: number, used: number }} props
 */
export default function UpgradePrompt({ feature, limit, used }) {
  const featureLabel = FEATURE_LABELS[feature] ?? feature
  const isTotalLimit = feature === 'catalogo'

  return (
    <div className="rounded-2xl p-5 bg-primary/5 border border-primary/30">
      <div className="flex items-start gap-3">
        <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-body font-semibold text-on-surface text-sm">
            Alcanzaste el límite de tu plan
          </p>
          <p className="font-body text-sm text-on-surface-variant mt-1">
            {isTotalLimit
              ? `Tenés ${used} de ${limit} ${featureLabel} en tu plan gratuito.`
              : `Usaste ${used}/${limit} ${featureLabel} este mes.`
            }
            {' '}Pasate a Pro para acceso ilimitado.
          </p>
          <div className="mt-3">
            <Link
              href="/planes"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-body font-semibold text-sm hover:bg-primary-intense transition-colors"
            >
              Ver planes
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
