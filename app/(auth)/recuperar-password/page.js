'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function LeftBrandingCard({ title }) {
  return (
    <div className="hidden md:flex w-[460px] h-[560px] rounded-xl bg-on-surface text-on-primary flex-col justify-between p-10 relative overflow-hidden shrink-0">
      <div className="relative z-10">
        <Link href="/" className="no-underline"><span className="font-logo font-semibold"><span className="text-on-primary">trade</span><span className="text-primary">.ai</span></span></Link>
      </div>
      <div className="relative z-10">
        <h2 className="font-display font-medium text-4xl tracking-[-1px] leading-tight text-on-primary">
          {title}
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

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (authError) {
      setError('No se pudo enviar el email. Verificá que el email sea correcto.')
      setLoading(false)
      return
    }

    setEnviado(true)
    setLoading(false)
  }

  const brandingTitle = 'Recuperá tu acceso.'

  if (enviado) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-12 px-4 sm:px-8 bg-surface">
        <LeftBrandingCard title={brandingTitle} />
        <div className="w-full max-w-[400px]">
          <div className="md:hidden mb-8">
            <Link href="/" className="no-underline"><span className="font-logo text-2xl font-semibold"><span className="text-on-surface">trade</span><span className="text-primary">.ai</span></span></Link>
          </div>
          <div className="mb-6">
            <svg className="w-14 h-14 mx-auto text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="font-display font-medium text-3xl tracking-[-0.8px] text-on-surface mb-3">Revisá tu email</h1>
          <p className="font-body text-base text-on-surface-variant leading-relaxed mb-8">
            Si existe una cuenta con ese email, te enviamos un link para restablecer tu contraseña. Revisá también la carpeta de spam.
          </p>
          <Link href="/login" className="font-body text-sm text-primary hover:underline transition-colors no-underline">
            ← Volver al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center gap-12 px-8 bg-surface">
      <LeftBrandingCard title={brandingTitle} />

      <div className="w-[400px] shrink-0">
        <div className="md:hidden mb-8">
          <Link href="/" className="no-underline"><span className="font-logo text-2xl font-semibold"><span className="text-on-surface">trade</span><span className="text-primary">.ai</span></span></Link>
        </div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="font-display font-medium text-3xl tracking-[-0.8px] text-on-surface">
            Recuperar
          </h1>
        </div>

        <p className="font-body text-base text-on-surface-variant mb-8">
          Ingresá tu email y te enviamos un link para crear una nueva contraseña
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block font-body text-sm text-on-surface-variant mb-1.5">Email</label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full py-3 px-4 rounded-md bg-surface-1 border border-hairline text-sm text-on-surface placeholder:text-ink-tertiary focus:outline-none focus:border-on-surface"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-md bg-primary text-on-primary font-body font-medium text-sm hover:bg-primary-intense transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading ? 'Enviando...' : 'Enviar link de recuperación'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="font-body text-sm text-on-surface-variant hover:text-on-surface transition-colors no-underline"
          >
            ← Volver al login
          </Link>
        </div>
      </div>
    </div>
  )
}
