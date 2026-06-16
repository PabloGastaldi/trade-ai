'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageLayout from '@/components/ui/PageLayout'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const PLANES = {
  free:     { label: 'GRATUITO', limite: 15,       variant: 'neutral' },
  pro:      { label: 'PRO',      limite: 200,      variant: 'primary' },
  empresa:  { label: 'EMPRESA',  limite: Infinity, variant: 'primary' },
}

function PlanBadge({ tipo }) {
  const plan = PLANES[tipo] ?? PLANES.free
  return (
    <Badge variant={plan.variant} className="tracking-widest">
      {plan.label}
    </Badge>
  )
}

function BarraProgreso({ usadas, limite }) {
  if (limite === Infinity) {
    return (
      <div>
        <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full w-full bg-primary rounded-full" />
        </div>
        <p className="font-mono text-[10px] text-ink-tertiary mt-1.5">Ilimitado</p>
      </div>
    )
  }
  const pct = Math.min((usadas / limite) * 100, 100)
  const color = pct >= 90 ? 'bg-red-500' : 'bg-primary'
  return (
    <div>
      <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="font-mono text-[10px] text-ink-tertiary mt-1.5">
        {pct >= 90 ? 'Límite alcanzado' : `${Math.round(pct)}% usado`}
      </p>
    </div>
  )
}

function StatCard({ valor, label }) {
  return (
    <div className="bg-surface border border-hairline rounded-lg p-4 text-center">
      <p className="font-mono text-2xl text-on-surface">{valor}</p>
      <p className="font-body text-[10px] text-ink-subtle mt-1 uppercase tracking-wider">{label}</p>
    </div>
  )
}

export default function CuentaClient({ user, perfil }) {
  const router = useRouter()
  const [nombre, setNombre] = useState(perfil?.full_name ?? '')
  const [empresa, setEmpresa] = useState(perfil?.company_name ?? '')
  const [guardando, setGuardando] = useState(false)
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  const [stats, setStats] = useState({ consultas: 0, operaciones: 0, productos: 0, calculos: 0 })
  const [statsLoading, setStatsLoading] = useState(true)

  const plan = PLANES[perfil?.plan_type] ?? PLANES.free
  const usadas = perfil?.queries_this_month ?? 0
  const limite = plan.limite
  const pct = limite !== Infinity ? Math.min((usadas / limite) * 100, 100) : 100

  const fechaReset = perfil?.queries_reset_date
    ? new Date(perfil.queries_reset_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'long' })
    : null

  const dirty = nombre !== (perfil?.full_name ?? '') || empresa !== (perfil?.company_name ?? '')

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient()
      const inicioMes = new Date()
      inicioMes.setDate(1)
      inicioMes.setHours(0, 0, 0, 0)

      const [q, ops, prods] = await Promise.all([
        supabase
          .from('queries_log')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', inicioMes.toISOString()),
        supabase
          .from('operations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .not('status', 'ilike', '%cerrada%'),
        supabase
          .from('user_products')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_active', true),
      ])

      setStats({
        consultas: q.count ?? 0,
        operaciones: ops.count ?? 0,
        productos: prods.count ?? 0,
        calculos: perfil?.calcs_this_month ?? 0,
      })
      setStatsLoading(false)
    }
    loadStats()
  }, [user.id, perfil])

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
    <PageLayout title="MI CUENTA" subtitle="Configuración y datos de tu cuenta">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">

        {/* Card 1 — Datos personales */}
        <Card className="lg:col-span-2">
          <h2 className="font-body text-sm font-semibold tracking-widest uppercase text-on-surface-variant mb-6">
            DATOS PERSONALES
          </h2>

          <form onSubmit={handleGuardar} className="space-y-4">
            <Input
              label="Nombre completo"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre completo"
              autoComplete="name"
            />

            <Input
              label="Empresa (opcional)"
              value={empresa}
              onChange={e => setEmpresa(e.target.value)}
              placeholder="Nombre de tu empresa"
              autoComplete="organization"
            />

            <div>
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">Email</label>
              <input
                className="w-full bg-surface rounded-md px-4 py-3 font-mono text-sm text-on-surface border border-hairline cursor-not-allowed opacity-60"
                type="email"
                value={user.email}
                readOnly
                tabIndex={-1}
              />
              <p className="mt-1 font-body text-[10px] text-ink-subtle">El email no se puede modificar.</p>
            </div>

            {errorGuardado && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-md">
                <p className="font-body text-xs text-red-600">{errorGuardado}</p>
              </div>
            )}

            {guardadoOk && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-md flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <p className="font-body text-xs text-emerald-600">Cambios guardados correctamente.</p>
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <Button
                type="submit"
                loading={guardando}
                disabled={!dirty}
              >
                {guardadoOk ? 'Guardado' : 'Guardar cambios'}
              </Button>
            </div>
          </form>

          <div className="h-px bg-hairline my-6" />

          <div className="space-y-2">
            <a
              href="/cuenta/password"
              className="flex items-center gap-2 font-body text-sm text-on-surface hover:text-primary transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Cambiar contraseña →
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 font-body text-sm text-red-600 hover:text-red-700 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        </Card>

        {/* Card 2 — Plan actual */}
        <Card>
          <p className="font-body text-[10px] font-semibold tracking-widest uppercase text-on-surface-variant mb-3">
            TU PLAN
          </p>

          <p className={`font-body text-2xl font-semibold mb-1 ${
            perfil?.plan_type === 'pro' ? 'text-primary' : 'text-on-surface'
          }`}>
            {plan.label}
          </p>

          {perfil?.plan_type === 'pro' && (
            <Badge variant="primary" className="mb-4">RECOMENDADO</Badge>
          )}

          <div className="mt-5">
            <div className="flex justify-between items-baseline mb-2">
              <span className="font-body text-xs text-on-surface-variant">
                Consultas este mes
              </span>
              <span className="font-mono text-xs text-on-surface">
                {usadas}
                <span className="text-on-surface-variant">
                  {limite === Infinity ? ' / ilimitadas' : ` / ${limite}`}
                </span>
              </span>
            </div>
            <BarraProgreso usadas={usadas} limite={limite} />
            {fechaReset && limite !== Infinity && (
              <p className="font-mono text-[10px] text-ink-tertiary mt-2">
                Se renueva el {fechaReset}
              </p>
            )}
          </div>

          {perfil?.plan_type !== 'empresa' && (
            <div className="mt-5 pt-5 border-t border-hairline">
              {perfil?.plan_type === 'free' ? (
                <a href="/planes" className="flex items-center gap-1.5 font-body text-sm text-primary hover:underline">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                  Mejorar a Pro →
                </a>
              ) : (
                <p className="font-body text-xs text-ink-subtle">
                  Tu suscripción se renueva el {fechaReset}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Card 3 — Estadísticas */}
        <Card className="lg:col-span-3">
          <p className="font-body text-[10px] font-semibold tracking-widest uppercase text-on-surface-variant mb-4">
            ACTIVIDAD
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statsLoading ? (
              <>
                {[0,1,2,3].map(i => (
                  <div key={i} className="bg-surface border border-hairline rounded-lg p-4 animate-pulse">
                    <div className="h-6 w-12 bg-surface-2 rounded mb-2" />
                    <div className="h-3 w-20 bg-surface-2 rounded" />
                  </div>
                ))}
              </>
            ) : (
              <>
                <StatCard valor={stats.consultas} label="Consultas este mes" />
                <StatCard valor={stats.operaciones} label="Operaciones activas" />
                <StatCard valor={stats.productos} label="Productos en catálogo" />
                <StatCard valor={stats.calculos} label="Cálculos realizados" />
              </>
            )}
          </div>
        </Card>
      </div>
    </PageLayout>
  )
}
