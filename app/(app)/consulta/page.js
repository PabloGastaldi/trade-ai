'use client'

import { useState, useRef, useEffect } from 'react'
import ChatMessage from '@/components/chat/ChatMessage'
import ChatInput from '@/components/chat/ChatInput'
import styles from './consulta.module.css'

const EJEMPLOS = [
  '¿Cuánto paga de arancel el aceite de oliva a Brasil?',
  '¿Qué documentos necesito para exportar vino a Estados Unidos?',
  '¿Cómo clasifico una máquina empacadora en el NCM?',
  '¿Cuáles son los requisitos SENASA para exportar carne a China?',
  '¿Qué es el Incoterm FOB y cuándo conviene usarlo?',
]

export default function ConsultaPage() {
  const [mensajes, setMensajes] = useState([])
  const [cargando, setCargando] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  async function enviarConsulta(texto) {
    if (!texto.trim() || cargando) return

    // Agregar mensaje del usuario
    const idUsuario = Date.now()
    setMensajes(prev => [...prev, { id: idUsuario, tipo: 'usuario', texto }])
    setCargando(true)

    // Agregar mensaje del sistema vacío para streaming
    const idSistema = Date.now() + 1
    setMensajes(prev => [...prev, { id: idSistema, tipo: 'sistema', texto: '', streaming: true }])

    try {
      const res = await fetch('/api/consulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta: texto }),
      })

      if (!res.ok) throw new Error('Error en la respuesta')

      // Intentar streaming si el servidor lo soporta
      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
        // Modo streaming
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let acumulado = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          acumulado += decoder.decode(value, { stream: true })
          const texto = acumulado
          setMensajes(prev =>
            prev.map(m => m.id === idSistema ? { ...m, texto, streaming: true } : m)
          )
        }

        // Finalizar streaming
        setMensajes(prev =>
          prev.map(m => m.id === idSistema ? { ...m, streaming: false } : m)
        )
      } else {
        // Modo JSON normal (fallback)
        const data = await res.json()
        setMensajes(prev =>
          prev.map(m =>
            m.id === idSistema
              ? { ...m, texto: data.respuesta, streaming: false, consultaId: data.id }
              : m
          )
        )
      }
    } catch (e) {
      setMensajes(prev =>
        prev.map(m =>
          m.id === idSistema
            ? { ...m, tipo: 'error', texto: 'Hubo un error al procesar tu consulta. Intentá de nuevo.', streaming: false }
            : m
        )
      )
    } finally {
      setCargando(false)
    }
  }

  const sinMensajes = mensajes.length === 0

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        {sinMensajes ? (
          <div className={styles.hero}>
            <div className={styles.heroEyebrow}>Inteligencia para el comercio exterior</div>
            <h1 className={styles.heroTitle}>
              ¿En qué puedo<br />
              <span className={styles.heroAccent}>ayudarte hoy?</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Preguntá sobre aranceles, clasificación NCM, documentación,
              requisitos de organismos o normativa aduanera argentina.
            </p>
            <div className={styles.ejemplosGrid}>
              {EJEMPLOS.map((ej, i) => (
                <button
                  key={i}
                  className={styles.ejemploChip}
                  onClick={() => enviarConsulta(ej)}
                >
                  {ej}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.mensajes}>
            {mensajes.map(msg => (
              <ChatMessage key={msg.id} mensaje={msg} />
            ))}
            {cargando && mensajes[mensajes.length - 1]?.streaming === false && (
              <div className={styles.typing}>
                <div className={styles.typingDot} />
                <div className={styles.typingDot} />
                <div className={styles.typingDot} />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <ChatInput onEnviar={enviarConsulta} cargando={cargando} />
    </div>
  )
}
