'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const DISCLAIMER =
  'La información es orientativa y respaldada por documentos oficiales públicos. No reemplaza el asesoramiento de un despachante de aduana habilitado.'

const EJEMPLOS = [
  'Aranceles de importación de electrónica',
  'Cómo exportar alimentos a Chile',
  'Requisitos SENASA para carne vacuna',
  'Qué es FOB y cuándo usarlo',
]

function normalizarTexto(texto) {
  return texto
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

function ChatBubble({ mensaje, onReintentar }) {
  const esUsuario = mensaje.tipo === 'usuario'
  const esError = mensaje.tipo === 'error'
  const esLimite = mensaje.tipo === 'limite'
  const esStreaming = mensaje.streaming

  const textoNormalizado = normalizarTexto(mensaje.texto)

  return (
    <div className={`flex gap-3 py-3 animate-[fadeIn_0.3s_ease-out] ${esUsuario ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-body font-bold ${
        esUsuario
          ? 'bg-surface-highest text-on-surface-variant/50'
          : 'bg-primary text-on-primary'
      }`}>
        {esUsuario ? 'V' : 'AI'}
      </div>

      <div className={`flex flex-col max-w-[80%] ${esUsuario ? 'items-end' : 'items-start'}`}>
        {!esUsuario && (
          <span className="font-mono text-[10px] tracking-widest uppercase text-primary mb-1.5">
            trade.ai
          </span>
        )}

        {esLimite ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-high border border-white/[0.06] text-sm text-on-surface-variant">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            <span>{mensaje.texto}</span>
          </div>
        ) : esError ? (
          <div className="px-4 py-3 rounded-2xl rounded-br-sm bg-white/[0.06] text-sm text-red-400">
            {mensaje.texto}
          </div>
        ) : esUsuario ? (
          <div className="px-4 py-3 rounded-2xl rounded-br-sm bg-white/[0.06] text-sm text-on-surface leading-relaxed">
            {mensaje.texto}
          </div>
        ) : (
          <div className="px-4 py-3 rounded-2xl rounded-bl-sm text-sm text-on-surface">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2 rounded-xl border border-white/[0.06]">
                    <table className="w-full text-sm">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-surface-high">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="text-left px-3 py-2 text-xs font-semibold text-primary uppercase tracking-wide border-b border-white/[0.06]">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-2 border-b border-white/[0.04] text-on-surface-variant last:border-b-0">
                    {children}
                  </td>
                ),
                code: ({ children }) => (
                  <code className="px-1.5 py-0.5 rounded bg-surface-high text-primary text-xs font-mono">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-surface-high rounded-xl p-4 my-2 overflow-x-auto text-xs font-mono text-on-surface-variant border border-white/[0.06]">
                    {children}
                  </pre>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-on-surface">{children}</strong>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-body font-semibold text-on-surface mt-3 mb-1 pb-1 border-b border-white/[0.06] tracking-tight">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold text-on-surface mt-3 mb-1">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-sm font-semibold text-on-surface mt-2 mb-1">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="mb-1.5 last:mb-0 text-on-surface leading-relaxed">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-1.5 pl-5 space-y-0.5">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-1.5 pl-5 space-y-0.5 list-decimal">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-on-surface-variant leading-relaxed">{children}</li>
                ),
                hr: () => <hr className="border-surface-high my-3" />,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-primary/30 pl-3 my-1.5 text-on-surface-variant/80 italic">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {textoNormalizado}
            </ReactMarkdown>
            {esStreaming && (
              <span className="inline-block w-0.5 h-3.5 bg-primary ml-0.5 animate-pulse align-middle">▌</span>
            )}
          </div>
        )}

        {esError && onReintentar && (
          <button
            onClick={onReintentar}
            className="mt-2 px-3 py-1.5 rounded-lg border border-white/[0.08] text-xs text-on-surface-variant hover:text-on-surface hover:border-white/[0.15] transition-all duration-150"
          >
            ↻ Reintentar
          </button>
        )}

        {!esUsuario && !esError && !esLimite && !esStreaming && mensaje.texto && (
          <div className="mt-3 pt-3 border-t border-white/[0.05] px-1">
            <p className="text-[11px] text-on-surface-variant/40 leading-relaxed">
              {DISCLAIMER}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ConsultaPage() {
  const [mensajes, setMensajes] = useState([])
  const [cargando, setCargando] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const [inputTexto, setInputTexto] = useState('')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [inputTexto])

  async function enviarConsulta(texto) {
    if (!texto.trim() || cargando) return

    const historial = mensajes
      .filter(m => m.tipo === 'usuario' || (m.tipo === 'sistema' && m.texto && !m.streaming))
      .slice(-10)
      .map(m => ({
        role: m.tipo === 'usuario' ? 'user' : 'assistant',
        content: m.texto,
      }))

    const idUsuario = Date.now()
    setMensajes(prev => [...prev, { id: idUsuario, tipo: 'usuario', texto }])
    setCargando(true)
    setInputTexto('')

    const idSistema = Date.now() + 1
    setMensajes(prev => [...prev, { id: idSistema, tipo: 'sistema', texto: '', streaming: true }])

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const res = await fetch('/api/consulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta: texto, historial }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const errorMsg = errorData.error || 'Hubo un error. Intentá de nuevo.'
        setMensajes(prev =>
          prev.map(m => m.id === idSistema ? { ...m, tipo: 'limite', texto: errorMsg, streaming: false } : m)
        )
        setCargando(false)
        return
      }

      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let textoCompleto = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lineas = buffer.split('\n')
          buffer = lineas.pop()

          for (const linea of lineas) {
            if (!linea.startsWith('data: ')) continue
            const payload = linea.slice(6).trim()
            if (payload === '[DONE]') break
            try {
              const { texto: chunk, error } = JSON.parse(payload)
              if (error) throw new Error(error)
              if (chunk) {
                textoCompleto += chunk
                setMensajes(prev =>
                  prev.map(m => m.id === idSistema ? { ...m, texto: textoCompleto, streaming: true } : m)
                )
              }
            } catch { /* ignore malformed */ }
          }
        }

        setMensajes(prev =>
          prev.map(m => m.id === idSistema ? { ...m, streaming: false } : m)
        )
      } else {
        const data = await res.json()
        setMensajes(prev =>
          prev.map(m =>
            m.id === idSistema ? { ...m, texto: data.respuesta, streaming: false } : m
          )
        )
      }
    } catch {
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

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (inputTexto.trim() && !cargando) {
        enviarConsulta(inputTexto.trim())
      }
    }
  }

  const sinMensajes = mensajes.length === 0
  const puedeEnviar = inputTexto.trim().length > 0 && !cargando

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4">
          {sinMensajes ? (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-220px)] text-center">
              <p className="font-logo text-6xl md:text-8xl text-on-surface/[0.04] select-none pointer-events-none mb-6">
                trade.ai
              </p>

              <p className="font-body text-xl text-on-surface-variant mb-8">
                ¿Qué querés consultar?
              </p>

              <div className="flex flex-wrap justify-center gap-2 max-w-lg px-4">
                {EJEMPLOS.map((ej, i) => (
                  <button
                    key={i}
                    onClick={() => enviarConsulta(ej)}
                    className="px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.05] text-sm text-on-surface-variant hover:bg-white/[0.08] hover:text-on-surface transition-all duration-150 cursor-pointer"
                  >
                    {ej}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6 space-y-0.5">
              {mensajes.map((msg, idx) => (
                <ChatBubble
                  key={msg.id}
                  mensaje={msg}
                  onReintentar={msg.tipo === 'error' ? () => {
                    const prevUsuario = [...mensajes].slice(0, idx).reverse().find(m => m.tipo === 'usuario')
                    if (prevUsuario) {
                      setMensajes(prev => prev.filter(m => m.id !== msg.id))
                      enviarConsulta(prevUsuario.texto)
                    }
                  } : undefined}
                />
              ))}

              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 px-4 pb-[80px] md:pb-6 pt-2">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-surface-low/80 backdrop-blur-xl border-t border-white/[0.04] rounded-2xl p-2 px-3">
            <textarea
              ref={textareaRef}
              placeholder="Escribí tu consulta sobre comercio exterior..."
              value={inputTexto}
              onChange={(e) => setInputTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={cargando}
              className="flex-1 bg-transparent border-0 resize-none outline-none text-sm text-on-surface placeholder:text-on-surface-variant/40 py-2 max-h-40 overflow-y-auto leading-relaxed"
              style={{ minHeight: '24px' }}
            />
            <button
              onClick={() => {
                if (puedeEnviar) {
                  enviarConsulta(inputTexto.trim())
                }
              }}
              disabled={!puedeEnviar}
              aria-label="Enviar consulta"
              className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
                puedeEnviar
                  ? 'bg-primary-intense text-on-primary hover:bg-primary cursor-pointer'
                  : 'bg-surface-high text-on-surface-variant/30 cursor-not-allowed'
              }`}
            >
              {cargando ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3 6l3-6 3 6-3 6Zm3 0h12M9 6v12" />
                </svg>
              )}
            </button>
          </div>

          <p className="text-center font-mono text-[10px] text-on-surface-variant/30 mt-2">
            Enter para enviar · Shift+Enter para nueva línea
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
