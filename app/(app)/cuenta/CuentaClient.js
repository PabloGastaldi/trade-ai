'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './cuenta.module.css'

const PLANES = {
  free:     { label: 'Gratuito', limite: 15,       color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)' },
  pro:      { label: 'Pro',      limite: 200,      color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)'   },
  empresa:  { label: 'Empresa',  limite: Infinity, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)'   },
}

function PlanBadge({ tipo }) {
  const plan = PLANES[tipo] ?? PLANES.free
  return (
    <span
      className={styles.planBadge}
      style={{ color: plan.color, background: plan.bg, border: `1px solid ${plan.border}` }}
    >
      {plan.label}
    </span>
  )
}

function BarraUso({ usadas, limite }) {
  if (limite === Infinity) {
    return (
      <div className={styles.usoBarra}>
        <div className={styles.usoBarraFill} style={{ width: '100%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
      </div>
    )
  }
  const pct = Math.min((usadas / limite) * 100, 100)
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#3b82f6'
  return (
    <div className={styles.usoBarra}>
      <div
        className={styles.usoBarraFill}
        style={{ width: `${pct}%`, background: color, transition: 'width 0.6s ease' }}
      />
    </div>
  )
}

export default function CuentaClient({ user, perfil }) {
  const router = useRouter()
  const [nombre, setNombre] = useState(perfil.full_name ?? '')
  const [empresa, setEmpresa] = useState(perfil.company_name ?? '')
  const [guardando, setGuardando] = useState(false)
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  const plan = PLANES[perfil.plan_type] ?? PLANES.free
  const usadas = perfil.queries_this_month ?? 0
  const limite = plan.limite

  // Fecha de reset
  const fechaReset = perfil.queries_reset_date
    ? new Date(perfil.queries_reset_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'long' })
    : null

  async function handleGuardar(e) {
    e.preventDefault()
    setGuardando(true)
    setGuardadoOk(false)
    setErrorGuardado('')

    const supabase = createClient()
    const { error } = await supabase
      .from('users_profile')
      .update({
        full_name: nombre.trim(),
        company_name: empresa.trim(),
      })
      .eq('id', user.id)

    if (error) {
      setErrorGuardado('No se pudo guardar. Intentá de nuevo.')
    } else {
      setGuardadoOk(true)
      setTimeout(() => setGuardadoOk(false), 3000)
    }
    setGuardando(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        {/* Título */}
        <div className={styles.pageHeader}>
          <h1 className={styles.titulo}>Mi cuenta</h1>
          <p className={styles.subtitulo}>{user.email}</p>
        </div>

        {/* Card: Plan y uso */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitulo}>Plan actual</h2>
            <PlanBadge tipo={perfil.plan_type} />
          </div>

          <div className={styles.usoSection}>
            <div className={styles.usoHeader}>
              <span className={styles.usoLabel}>Consultas este mes</span>
              <span className={styles.usoCount}>
                {usadas}
                <span className={styles.usoLimite}>
                  {limite === Infinity ? ' / ilimitadas' : ` / ${limite}`}
                </span>
              </span>
            </div>
            <BarraUso usadas={usadas} limite={limite} />
            {fechaReset && limite !== Infinity && (
              <p className={styles.usoReset}>Se renueva el {fechaReset}</p>
            )}
            {limite !== Infinity && usadas >= limite && (
              <p className={styles.usoAgotado}>
                ⚠ Alcanzaste el límite mensual. Mejorá tu plan para seguir consultando.
              </p>
            )}
          </div>

          {perfil.plan_type !== 'empresa' && (
            <div className={styles.cardFooter}>
              <a href="/planes" className={styles.btnMejorar}>
                ✦ Mejorar plan
              </a>
              <p className={styles.btnMejorarHint}>
                {perfil.plan_type === 'free'
                  ? 'Plan Pro: 200 consultas/mes · Historial completo'
                  : 'Plan Empresa: consultas ilimitadas · Soporte prioritario'}
              </p>
            </div>
          )}
        </section>

        {/* Card: Datos de la cuenta */}
        <section className={styles.card}>
          <h2 className={styles.cardTitulo}>Datos de la cuenta</h2>

          <form onSubmit={handleGuardar} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Nombre completo</label>
              <input
                className={styles.fieldInput}
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Empresa / Organización</label>
              <input
                className={styles.fieldInput}
                type="text"
                value={empresa}
                onChange={e => setEmpresa(e.target.value)}
                placeholder="Nombre de tu empresa (opcional)"
                autoComplete="organization"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Email</label>
              <input
                className={`${styles.fieldInput} ${styles.fieldInputReadonly}`}
                type="email"
                value={user.email}
                readOnly
                tabIndex={-1}
              />
              <p className={styles.fieldHint}>El email no se puede modificar desde acá.</p>
            </div>

            {errorGuardado && (
              <div className={styles.errorMsg}>{errorGuardado}</div>
            )}

            <div className={styles.formFooter}>
              <button
                type="submit"
                className={styles.btnGuardar}
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : guardadoOk ? '✓ Guardado' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </section>

        {/* Card: Sesión */}
        <section className={`${styles.card} ${styles.cardDanger}`}>
          <h2 className={styles.cardTitulo}>Sesión</h2>
          <p className={styles.dangerText}>
            Al cerrar sesión vas a tener que volver a ingresar con tu email y contraseña o Google.
          </p>
          <button className={styles.btnLogout} onClick={handleLogout}>
            Cerrar sesión
          </button>
        </section>

      </div>
    </div>
  )
}
