'use client'

import { useState, useRef, useEffect } from 'react'

const ejemplos = [
  '¿Cuánto paga de arancel el aceite de oliva a Brasil?',
  '¿Qué documentos necesito para exportar vino a Estados Unidos?',
  '¿Cómo clasifico una máquina empacadora en el NCM?',
  '¿Cuáles son los requisitos SENASA para exportar carne a China?',
  '¿Qué es el Incoterm FOB y cuándo conviene usarlo?',
]

export default function Home() {
  const [pregunta, setPregunta] = useState('')
  const [mensajes, setMensajes] = useState([])
  const [cargando, setCargando] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  async function enviarConsulta(textoPregunta) {
    const texto = textoPregunta || pregunta
    if (!texto.trim() || cargando) return

    const nuevaMsj = { tipo: 'usuario', texto, id: Date.now() }
    setMensajes(prev => [...prev, nuevaMsj])
    setPregunta('')
    setCargando(true)

    try {
      const res = await fetch('/api/consulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta: texto }),
      })
      const data = await res.json()
      setMensajes(prev => [...prev, {
        tipo: 'sistema',
        texto: data.respuesta,
        id: Date.now() + 1,
        consultaId: data.id,
      }])
    } catch (e) {
      setMensajes(prev => [...prev, {
        tipo: 'error',
        texto: 'Hubo un error al procesar tu consulta. Intentá de nuevo.',
        id: Date.now() + 1,
      }])
    } finally {
      setCargando(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarConsulta()
    }
  }

  const sinMensajes = mensajes.length === 0

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0a0e1a;
          --surface: #111827;
          --surface2: #1a2235;
          --border: #1f2d47;
          --border-light: #2a3a58;
          --accent: #2563eb;
          --accent-glow: rgba(37, 99, 235, 0.3);
          --accent-light: #3b82f6;
          --gold: #f59e0b;
          --gold-light: #fbbf24;
          --text: #e8edf5;
          --text-muted: #64748b;
          --text-dim: #94a3b8;
          --success: #10b981;
          --error: #ef4444;
          --font-display: 'Syne', sans-serif;
          --font-body: 'DM Sans', sans-serif;
        }

        html, body { height: 100%; }

        body {
          font-family: var(--font-body);
          background: var(--bg);
          color: var(--text);
          height: 100vh;
          overflow: hidden;
          position: relative;
        }

        /* Atmospheric background */
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 50% at 20% -10%, rgba(37,99,235,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 110%, rgba(245,158,11,0.06) 0%, transparent 50%),
            radial-gradient(ellipse 40% 60% at 50% 50%, rgba(37,99,235,0.04) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .app {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          height: 100vh;
        }

        /* ── HEADER ── */
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          height: 64px;
          border-bottom: 1px solid var(--border);
          background: rgba(10,14,26,0.8);
          backdrop-filter: blur(12px);
          flex-shrink: 0;
        }

        .logo {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .logo-trade { color: var(--text); }
        .logo-dot { color: var(--accent-light); }
        .logo-ai { color: var(--accent-light); }

        .logo-badge {
          margin-left: 10px;
          font-family: var(--font-body);
          font-size: 0.6rem;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gold);
          background: rgba(245,158,11,0.1);
          border: 1px solid rgba(245,158,11,0.2);
          padding: 2px 8px;
          border-radius: 20px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-tag {
          font-size: 0.75rem;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        .btn-login {
          font-family: var(--font-body);
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-dim);
          background: transparent;
          border: 1px solid var(--border-light);
          padding: 6px 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.02em;
        }

        .btn-login:hover {
          color: var(--text);
          border-color: var(--accent);
          background: rgba(37,99,235,0.08);
        }

        /* ── MAIN CONTENT ── */
        .main {
          flex: 1;
          overflow-y: auto;
          scroll-behavior: smooth;
          padding: 0;
        }

        .main::-webkit-scrollbar { width: 4px; }
        .main::-webkit-scrollbar-track { background: transparent; }
        .main::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 2px; }

        /* ── HERO (estado vacío) ── */
        .hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 64px - 120px);
          padding: 2rem;
          text-align: center;
        }

        .hero-eyebrow {
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--accent-light);
          margin-bottom: 1.5rem;
          opacity: 0;
          animation: fadeUp 0.6s 0.1s forwards;
        }

        .hero-title {
          font-family: var(--font-display);
          font-size: clamp(2.2rem, 5vw, 3.8rem);
          font-weight: 700;
          line-height: 1.15;
          letter-spacing: -0.01em;
          margin-bottom: 1.25rem;
          opacity: 0;
          animation: fadeUp 0.6s 0.2s forwards;
        }

        .hero-title-line2 {
          color: transparent;
          background: linear-gradient(135deg, var(--accent-light) 0%, var(--gold-light) 100%);
          -webkit-background-clip: text;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 1rem;
          color: var(--text-dim);
          max-width: 480px;
          line-height: 1.65;
          margin-bottom: 2.5rem;
          font-weight: 300;
          opacity: 0;
          animation: fadeUp 0.6s 0.3s forwards;
        }

        .hero-stats {
          display: flex;
          gap: 2.5rem;
          margin-bottom: 3rem;
          opacity: 0;
          animation: fadeUp 0.6s 0.4s forwards;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .stat-num {
          font-family: var(--font-display);
          font-size: 1.4rem;
          font-weight: 600;
          color: var(--text);
        }

        .stat-label {
          font-size: 0.65rem;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .stat-divider {
          width: 1px;
          background: var(--border);
          align-self: stretch;
        }

        /* Ejemplos */
        .ejemplos-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          justify-content: center;
          max-width: 680px;
          opacity: 0;
          animation: fadeUp 0.6s 0.5s forwards;
        }

        .ejemplo-chip {
          font-size: 0.78rem;
          color: var(--text-dim);
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 7px 14px;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          font-family: var(--font-body);
        }

        .ejemplo-chip:hover {
          color: var(--text);
          border-color: var(--accent);
          background: rgba(37,99,235,0.08);
          transform: translateY(-1px);
        }

        /* ── MENSAJES ── */
        .mensajes {
          padding: 1.5rem 0 1rem;
          display: flex;
          flex-direction: column;
          gap: 0;
          max-width: 780px;
          margin: 0 auto;
          width: 100%;
          padding-left: 1.5rem;
          padding-right: 1.5rem;
        }

        .mensaje {
          padding: 1.25rem 0;
          opacity: 0;
          animation: fadeUp 0.3s forwards;
        }

        .mensaje-usuario {
          border-bottom: 1px solid var(--border);
        }

        .mensaje-header {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 0.6rem;
        }

        .avatar {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 700;
          flex-shrink: 0;
          font-family: var(--font-display);
        }

        .avatar-usuario {
          background: rgba(37,99,235,0.2);
          border: 1px solid rgba(37,99,235,0.3);
          color: var(--accent-light);
        }

        .avatar-sistema {
          background: rgba(245,158,11,0.15);
          border: 1px solid rgba(245,158,11,0.25);
          color: var(--gold);
        }

        .avatar-label {
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .mensaje-texto {
          font-size: 0.95rem;
          line-height: 1.7;
          color: var(--text);
          padding-left: 36px;
        }

        .mensaje-usuario .mensaje-texto {
          color: var(--text-dim);
        }

        .disclaimer {
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          background: rgba(245,158,11,0.06);
          border: 1px solid rgba(245,158,11,0.15);
          border-radius: 8px;
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.5;
          display: flex;
          gap: 0.5rem;
          align-items: flex-start;
        }

        .disclaimer-icon { color: var(--gold); flex-shrink: 0; margin-top: 1px; }

        /* Typing indicator */
        .typing {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 1.25rem 0;
        }

        .typing-dots {
          display: flex;
          gap: 4px;
          padding-left: 36px;
        }

        .typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent-light);
          animation: pulse 1.2s infinite;
        }

        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }

        /* ── INPUT AREA ── */
        .input-area {
          flex-shrink: 0;
          padding: 1rem 1.5rem 1.25rem;
          background: rgba(10,14,26,0.9);
          backdrop-filter: blur(12px);
          border-top: 1px solid var(--border);
        }

        .input-container {
          max-width: 780px;
          margin: 0 auto;
          position: relative;
        }

        .input-box {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--surface);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          padding: 0.75rem 0.75rem 0.75rem 1.25rem;
          transition: all 0.2s;
        }

        .input-box.focused {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .input-field {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-family: var(--font-body);
          font-size: 0.95rem;
          color: var(--text);
          resize: none;
          line-height: 1.5;
          max-height: 120px;
          min-height: 24px;
        }

        .input-field::placeholder { color: var(--text-muted); }

        .btn-send {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: var(--accent);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
          color: white;
        }

        .btn-send:hover:not(:disabled) {
          background: var(--accent-light);
          transform: scale(1.05);
        }

        .btn-send:disabled {
          background: var(--border-light);
          cursor: not-allowed;
          opacity: 0.5;
        }

        .input-footer {
          display: flex;
          justify-content: center;
          margin-top: 0.6rem;
        }

        .input-hint {
          font-size: 0.68rem;
          color: var(--text-muted);
          letter-spacing: 0.03em;
        }

        .input-hint span { color: var(--text-dim); }

        /* ── ANIMATIONS ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* ── SCROLLBAR ── */
        .main::-webkit-scrollbar { width: 4px; }
        .main::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 2px; }
      `}</style>

      <div className="app">
        {/* HEADER */}
        <header className="header">
          <div className="logo">
            <span className="logo-trade">trade</span>
            <span className="logo-dot">.</span>
            <span className="logo-ai">ai</span>
            <span className="logo-badge">Beta</span>
          </div>
          <div className="header-right">
            <span className="header-tag">Comercio Exterior Argentino</span>
            <button className="btn-login">Iniciar sesión</button>
          </div>
        </header>

        {/* MAIN */}
        <div className="main">
          {sinMensajes ? (
            <div className="hero">
              <div className="hero-eyebrow">Inteligencia para el comercio exterior</div>
              <h1 className="hero-title">
                Consultá aranceles,<br />
                <span className="hero-title-line2">normativa y documentos</span>
              </h1>
              <p className="hero-subtitle">
                Hacé preguntas en lenguaje natural sobre exportaciones, importaciones,
                acuerdos comerciales y normativa aduanera argentina.
                Respuestas respaldadas por fuentes oficiales.
              </p>

              <div className="hero-stats">
                <div className="stat">
                  <span className="stat-num">10.000+</span>
                  <span className="stat-label">Posiciones NCM</span>
                </div>
                <div className="stat-divider" />
                <div className="stat">
                  <span className="stat-num">100+</span>
                  <span className="stat-label">Fuentes oficiales</span>
                </div>
                <div className="stat-divider" />
                <div className="stat">
                  <span className="stat-num">Global</span>
                  <span className="stat-label">Cobertura</span>
                </div>
              </div>

              <div className="ejemplos-grid">
                {ejemplos.map((ej, i) => (
                  <button
                    key={i}
                    className="ejemplo-chip"
                    onClick={() => enviarConsulta(ej)}
                  >
                    {ej}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mensajes">
              {mensajes.map((msg) => (
                <div
                  key={msg.id}
                  className={`mensaje ${msg.tipo === 'usuario' ? 'mensaje-usuario' : ''}`}
                >
                  <div className="mensaje-header">
                    <div className={`avatar ${msg.tipo === 'usuario' ? 'avatar-usuario' : 'avatar-sistema'}`}>
                      {msg.tipo === 'usuario' ? 'Vos' : 'AI'}
                    </div>
                    <span className="avatar-label">
                      {msg.tipo === 'usuario' ? 'Tu consulta' : 'trade.ai'}
                    </span>
                  </div>
                  <div className="mensaje-texto">{msg.texto}</div>
                  {msg.tipo === 'sistema' && (
                    <div className="disclaimer" style={{ marginLeft: '36px' }}>
                      <span className="disclaimer-icon">⚠</span>
                      <span>
                        La información es orientativa y está respaldada por documentos oficiales públicos.
                        No reemplaza el asesoramiento de un despachante de aduana habilitado.
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {cargando && (
                <div className="typing">
                  <div className="avatar avatar-sistema" style={{ marginLeft: 0 }}>AI</div>
                  <div className="typing-dots">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* INPUT */}
        <div className="input-area">
          <div className="input-container">
            <div className={`input-box ${inputFocused ? 'focused' : ''}`}>
              <textarea
                ref={inputRef}
                className="input-field"
                placeholder="Escribí tu consulta sobre comercio exterior..."
                value={pregunta}
                onChange={(e) => setPregunta(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                rows={1}
              />
              <button
                className="btn-send"
                onClick={() => enviarConsulta()}
                disabled={!pregunta.trim() || cargando}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <div className="input-footer">
              <span className="input-hint">
                Presioná <span>Enter</span> para enviar · <span>Shift+Enter</span> para nueva línea
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}