'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PasswordPage() {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const nuevaMinima = nueva.length >= 6
  const coincide = nueva === confirmar && nueva.length > 0
  const puedeEnviar = actual.length > 0 && nuevaMinima && coincide && !guardando

  async function handleSubmit(e) {
    e.preventDefault()
    if (!puedeEnviar) return

    setGuardando(true)
    setError('')
    setSuccess(false)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password: nueva })

    if (updateError) {
      setError(updateError.message.includes('weak')
        ? 'La contraseña es muy débil. Usá al menos 6 caracteres.'
        : 'No se pudo actualizar la contraseña. Verificá que la actual sea correcta.'
      )
    } else {
      setSuccess(true)
      setActual('')
      setNueva('')
      setConfirmar('')
    }
    setGuardando(false)
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-body text-xl font-semibold text-on-surface text-center">
          Cambiar contraseña
        </h1>
        <p className="font-body text-sm text-on-surface-variant mt-2 mb-8 text-center">
          Ingresá tu nueva contraseña
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-body text-xs text-on-surface-variant mb-1.5">
              Contraseña actual
            </label>
            <input
              className="w-full bg-surface-1 rounded-md px-4 py-3 font-mono text-sm text-on-surface placeholder:text-ink-tertiary border border-hairline focus:border-on-surface outline-none transition-colors"
              type="password"
              value={actual}
              onChange={e => setActual(e.target.value)}
              placeholder="Tu contraseña actual"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block font-body text-xs text-on-surface-variant mb-1.5">
              Nueva contraseña
            </label>
            <input
              className={`w-full bg-surface-1 rounded-md px-4 py-3 font-mono text-sm text-on-surface placeholder:text-ink-tertiary border outline-none transition-colors ${
                nueva.length > 0 && !nuevaMinima
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-hairline focus:border-on-surface'
              }`}
              type="password"
              value={nueva}
              onChange={e => setNueva(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
            {nueva.length > 0 && !nuevaMinima && (
              <p className="mt-1 font-body text-[10px] text-red-600">Mínimo 6 caracteres requeridos</p>
            )}
          </div>

          <div>
            <label className="block font-body text-xs text-on-surface-variant mb-1.5">
              Confirmar nueva contraseña
            </label>
            <input
              className={`w-full bg-surface-1 rounded-md px-4 py-3 font-mono text-sm text-on-surface placeholder:text-ink-tertiary border outline-none transition-colors ${
                confirmar.length > 0 && !coincide
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-hairline focus:border-on-surface'
              }`}
              type="password"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              placeholder="Repetí la nueva contraseña"
              autoComplete="new-password"
            />
            {confirmar.length > 0 && !coincide && (
              <p className="mt-1 font-body text-[10px] text-red-600">Las contraseñas no coinciden</p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-md">
              <p className="font-body text-xs text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-md flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <p className="font-body text-xs text-emerald-600">Contraseña actualizada correctamente.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!puedeEnviar}
            className="w-full bg-primary text-on-primary py-3 rounded-md font-body font-semibold text-sm hover:bg-primary-intense transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {guardando ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Actualizando…
              </>
            ) : (
              'Actualizar contraseña'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/cuenta" className="font-body text-sm text-primary hover:underline flex items-center justify-center gap-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Volver a mi cuenta
          </a>
        </div>
      </div>
    </div>
  )
}
