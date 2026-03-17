'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import '../auth.css'

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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
    })

    // Siempre mostrar éxito para no revelar si el email existe
    setEnviado(true)
    setLoading(false)
    if (error) console.error('[recuperar-password]', error.message)
  }

  if (enviado) {
    return (
      <div className="auth-wrapper">
        <div className="auth-logo">
          trade<span className="dot">.</span><span className="ai">ai</span>
        </div>
        <div className="success-card">
          <div className="success-icon">📬</div>
          <h1 className="success-title">Revisá tu email</h1>
          <p className="success-text">
            Si existe una cuenta con ese email, te enviamos un link para
            restablecer tu contraseña. Revisá también la carpeta de spam.
          </p>
          <a href="/login" className="btn-back">← Volver al login</a>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-logo">
        trade<span className="dot">.</span><span className="ai">ai</span>
      </div>

      <div className="auth-card">
        <h1 className="auth-title">Recuperar contraseña</h1>
        <p className="auth-subtitle">
          Ingresá tu email y te enviamos un link para crear una nueva contraseña
        </p>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar link de recuperación'}
          </button>
        </form>

        <div className="auth-footer">
          <a href="/login" className="btn-back">← Volver al login</a>
        </div>
      </div>
    </div>
  )
}
