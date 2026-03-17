'use client'

import { useState } from 'react'
import styles from './planes.module.css'

const PLANES = [
  {
    id: 'free',
    nombre: 'Gratuito',
    precio: null,
    precioLabel: '$0',
    periodo: '/mes',
    consultas: '15 consultas/mes',
    features: [
      'Consultas de aranceles y NCM',
      'Búsqueda en normativa aduanera',
      'Historial de consultas',
    ],
    cta: null, // sin botón — es el plan actual por defecto
    actual: true,
  },
  {
    id: 'pro',
    nombre: 'Pro',
    precio: 15000,
    precioLabel: '$15.000',
    periodo: '/mes',
    consultas: '200 consultas/mes',
    features: [
      'Todo lo del plan Gratuito',
      'Mayor volumen de consultas',
      'Soporte prioritario',
      'Acceso anticipado a nuevas funciones',
    ],
    cta: 'Suscribirme',
    destacado: true,
  },
  {
    id: 'empresa',
    nombre: 'Empresa',
    precio: null,
    precioLabel: 'A medida',
    periodo: '',
    consultas: 'Consultas ilimitadas',
    features: [
      'Todo lo del plan Pro',
      'Consultas ilimitadas',
      'Usuarios múltiples',
      'Integración vía API',
      'Soporte dedicado',
    ],
    cta: 'Contactar',
    contacto: true,
  },
]

export default function PlanesPage() {
  const [cargando, setCargando] = useState(null)

  async function handleSuscribirse(planId) {
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
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Elegí tu plan</h1>
        <p className={styles.subtitle}>
          Potenciá tus consultas de comercio exterior con el plan que mejor se adapte a tu operación.
        </p>
      </div>

      <div className={styles.grid}>
        {PLANES.map((plan) => (
          <div
            key={plan.id}
            className={`${styles.card} ${plan.destacado ? styles.cardDestacado : ''}`}
          >
            {plan.destacado && <div className={styles.badge}>Recomendado</div>}

            <div className={styles.cardHeader}>
              <h2 className={styles.planNombre}>{plan.nombre}</h2>
              <div className={styles.precioWrap}>
                <span className={styles.precio}>{plan.precioLabel}</span>
                {plan.periodo && <span className={styles.periodo}>{plan.periodo}</span>}
              </div>
              <p className={styles.consultas}>{plan.consultas}</p>
            </div>

            <ul className={styles.features}>
              {plan.features.map((f, i) => (
                <li key={i} className={styles.feature}>
                  <span className={styles.check}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <div className={styles.cardFooter}>
              {plan.actual && (
                <div className={styles.planActual}>Tu plan actual</div>
              )}
              {plan.cta && !plan.contacto && (
                <button
                  className={styles.btnPrimary}
                  onClick={() => handleSuscribirse(plan.id)}
                  disabled={cargando === plan.id}
                >
                  {cargando === plan.id ? 'Redirigiendo...' : plan.cta}
                </button>
              )}
              {plan.contacto && (
                <a
                  href="mailto:contacto@trade-ai.com.ar?subject=Plan Empresa — trade.ai"
                  className={styles.btnSecondary}
                >
                  {plan.cta}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
