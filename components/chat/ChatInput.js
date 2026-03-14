'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './ChatInput.module.css'

export default function ChatInput({ onEnviar, cargando }) {
  const [texto, setTexto] = useState('')
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef(null)

  // Auto-resize del textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [texto])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  function handleEnviar() {
    if (!texto.trim() || cargando) return
    onEnviar(texto.trim())
    setTexto('')
    // Reset altura
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const puedeEnviar = texto.trim().length > 0 && !cargando

  return (
    <div className={styles.area}>
      <div className={styles.container}>
        <div className={`${styles.box} ${focused ? styles.boxFocused : ''} ${cargando ? styles.boxLoading : ''}`}>
          <textarea
            ref={textareaRef}
            className={styles.input}
            placeholder="Escribí tu consulta sobre comercio exterior..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            rows={1}
            disabled={cargando}
          />
          <button
            className={`${styles.btnSend} ${puedeEnviar ? styles.btnSendActive : ''}`}
            onClick={handleEnviar}
            disabled={!puedeEnviar}
            aria-label="Enviar consulta"
          >
            {cargando ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="31.4" strokeDashoffset="10">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                </circle>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
        <div className={styles.hint}>
          Presioná <kbd>Enter</kbd> para enviar · <kbd>Shift+Enter</kbd> para nueva línea
        </div>
      </div>
    </div>
  )
}
