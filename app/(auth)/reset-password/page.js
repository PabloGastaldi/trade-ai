'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function LeftBrandingCard() {
  return (
    <div className="hidden md:flex w-[460px] h-[560px] rounded-xl bg-on-surface text-on-primary flex-col justify-between p-10 relative overflow-hidden shrink-0">
      <div className="relative z-10">
        <Link href="/" className="no-underline"><span className="font-logo font-semibold"><span className="text-on-primary">trade</span><span className="text-primary">.ai</span></span></Link>
      </div>
      <div className="relative z-10">
        <h2 className="font-display font-medium text-4xl tracking-[-1px] leading-tight text-on-primary">
          Establecé tu nueva contraseña.
        </h2>
      </div>
      <div className="relative z-10">
        <p className="font-mono text-xs text-white/40">
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
          <Link href="/" className="no-underline"><span className="font-logo text-2xl font-semibold"><span className="text-on-surface">trade</span><span className="text-primary">.ai</span></span></Link>
        </div>
        <h1 className="font-display font-medium text-3xl tracking-[-0.8px] text-on-surface mb-2">
          Nueva contraseña
        </h1>
        <p className="font-body text-base text-on-surface-variant mb-8">
          Elegí una contraseña nueva para tu cuenta
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">
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
              className="w-full py-3 px-4 rounded-md bg-surface-1 border border-hairline text-sm text-on-surface placeholder:text-ink-tertiary focus:outline-none focus:border-on-surface"
            />
            <p className="font-mono text-[11px] text-ink-subtle mt-1.5">Mínimo 6 caracteres</p>
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
              className="w-full py-3 px-4 rounded-md bg-surface-1 border border-hairline text-sm text-on-surface placeholder:text-ink-tertiary focus:outline-none focus:border-on-surface"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-md bg-primary text-on-primary font-body font-medium text-sm hover:bg-primary-intense transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
