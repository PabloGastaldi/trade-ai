'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ERROR_MAP = {
  'Invalid login credentials': 'Email o contraseña incorrectos. Revisá tus datos.',
  'Email not confirmed': 'Email no confirmado. Revisá tu bandeja de entrada.',
  'Invalid email': 'El email no es válido.',
  'User already registered': 'Ya existe una cuenta con este email.',
}

function mapError(msg) {
  return ERROR_MAP[msg] || 'Ocurrió un error. Intentá de nuevo.'
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(mapError(authError.message))
      setLoading(false)
      return
    }

    router.refresh()
    router.push('/importar')
  }

  async function handleGoogle() {
    setError('')
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (authError) setError('No se pudo iniciar sesión con Google. Intentá de nuevo.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center gap-12 px-4 sm:px-8 bg-surface">
      <div className="hidden md:flex w-[460px] h-[560px] rounded-xl bg-on-surface text-on-primary flex-col justify-between p-10 relative overflow-hidden shrink-0">
        <div className="relative z-10">
          <Link href="/" className="no-underline"><span className="font-logo font-semibold"><span className="text-on-primary">trade</span><span className="text-primary">.ai</span></span></Link>
        </div>
        <div className="relative z-10">
          <h2 className="font-display font-medium text-4xl tracking-[-1px] leading-tight text-on-primary">Donde el comercio se vuelve inteligente.</h2>
        </div>
        <div className="relative z-10">
          <p className="font-mono text-xs text-white/40">© {new Date().getFullYear()} trade.ai</p>
        </div>
      </div>

      <div className="w-full max-w-[400px]">
        <div className="md:hidden mb-8">
          <Link href="/" className="no-underline"><span className="font-logo text-2xl font-semibold"><span className="text-on-surface">trade</span><span className="text-primary">.ai</span></span></Link>
        </div>
        <h1 className="font-display font-medium text-3xl tracking-[-0.8px] text-on-surface">Bienvenido de vuelta</h1>
        <p className="font-body text-base text-on-surface-variant mt-2 mb-8">Ingresá a tu cuenta para continuar</p>

        <button onClick={handleGoogle} disabled={loading} className="w-full flex items-center justify-center gap-3 py-3.5 rounded-md bg-surface-1 border border-hairline text-on-surface font-body text-sm font-medium hover:bg-surface-high transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed mb-6">
          <GoogleIcon />
          Iniciar sesión con Google
        </button>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-hairline" />
          <span className="font-body text-xs text-on-surface-variant px-2">o con email</span>
          <div className="flex-1 h-px bg-hairline" />
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
          )}

          <div>
            <label className="block font-body text-sm text-on-surface-variant mb-1.5">Email</label>
            <input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="w-full py-3 px-4 rounded-md bg-surface-1 border border-hairline text-sm text-on-surface placeholder:text-ink-tertiary focus:outline-none focus:border-on-surface" />
          </div>

          <div>
            <label className="block font-body text-sm text-on-surface-variant mb-1.5">Contraseña</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="w-full py-3 px-4 pr-12 rounded-md bg-surface-1 border border-hairline text-sm text-on-surface placeholder:text-ink-tertiary focus:outline-none focus:border-on-surface" />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-tertiary hover:text-on-surface-variant transition-colors" tabIndex={-1} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-3.5 rounded-md bg-primary text-on-primary font-body font-medium text-sm hover:bg-primary-intense transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-1">
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <Link href="/recuperar-password" className="block font-body text-sm text-on-surface-variant hover:text-on-surface transition-colors no-underline">¿Olvidaste tu contraseña?</Link>
          <p className="font-body text-sm text-on-surface-variant">¿No tenés cuenta? <Link href="/registro" className="text-primary hover:underline font-medium transition-colors no-underline">Registrate</Link></p>
        </div>
      </div>
    </div>
  )
}
