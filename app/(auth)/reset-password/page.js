'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function LeftBrandingCard() {
  return (
    <div className="hidden md:flex w-[500px] h-[600px] rounded-3xl bg-surface-low flex-col justify-between p-10 relative overflow-hidden shrink-0">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(221,217,42,0.06) 0%, rgba(221,217,42,0.02) 40%, transparent 70%)',
        }} />
      </div>
      <div className="relative z-10">
        <Link href="/" className="no-underline"><span className="font-logo"><span className="text-on-surface">trade</span><span className="text-primary">.ai</span></span></Link>
      </div>
      <div className="relative z-10">
        <h2 className="font-display text-6xl tracking-wider leading-tight text-on-surface">
          ESTABLECÉ TU NUEVA CONTRASEÑA.
        </h2>
      </div>
      <div className="relative z-10">
        <p className="font-mono text-xs text-on-surface-variant/40">
          © {new Date().getFullYear()} trade.ai
        </p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('No se pudo actualizar la contraseña. El link puede haber expirado.')
      setLoading(false)
      return
    }

    router.push('/importar')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center gap-12 px-4 sm:px-8 bg-surface">
      <LeftBrandingCard />

      <div className="w-full max-w-[400px]">
        <div className="md:hidden mb-8">
          <Link href="/" className="no-underline"><span className="font-logo text-2xl"><span className="text-on-surface">trade</span><span className="text-primary">.ai</span></span></Link>
        </div>
        <h1 className="font-display text-4xl tracking-wider text-on-surface mb-2">
          NUEVA CONTRASEÑA
        </h1>
        <p className="font-body text-base text-on-surface-variant mb-8">
          Elegí una contraseña nueva para tu cuenta
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block font-body text-sm text-on-surface-variant mb-1.5">Nueva contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full py-3 px-4 rounded-xl bg-surface-highest border-0 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <p className="font-mono text-[11px] text-on-surface-variant/50 mt-1.5">Mínimo 6 caracteres</p>
          </div>

          <div>
            <label className="block font-body text-sm text-on-surface-variant mb-1.5">Confirmá la contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full py-3 px-4 rounded-xl bg-surface-highest border-0 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-body font-semibold text-sm hover:bg-primary-intense hover:shadow-[0_0_20px_rgba(221,217,42,0.2)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
