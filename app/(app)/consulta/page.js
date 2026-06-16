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
      <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-body font-bold ${
        esUsuario
          ? 'bg-surface-2 text-ink-subtle'
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
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-surface-high border border-hairline text-sm text-on-surface-variant">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            <span>{mensaje.texto}</span>
          </div>
        ) : esError ? (
          <div className="px-4 py-3 rounded-lg rounded-br-sm bg-red-50 text-sm text-red-600">
            {mensaje.texto}
          </div>
        ) : esUsuario ? (
          <div className="px-4 py-3 rounded-lg rounded-br-sm bg-surface-2 text-sm text-on-surface leading-relaxed">
            {mensaje.texto}
          </div>
        ) : (
          <div className="px-4 py-3 rounded-lg rounded-bl-sm text-sm text-on-surface">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2 rounded-lg border border-hairline">
                    <table className="w-full text-sm">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-surface-high">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="text-left px-3 py-2 text-xs font-semibold text-primary uppercase tracking-wide border-b border-hairline">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-2 border-b border-hairline-soft text-on-surface-variant last:border-b-0">
                    {children}
                  </td>
                ),
                code: ({ children }) => (
                  <code className="px-1.5 py-0.5 rounded bg-surface-high text-primary text-xs font-mono">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-surface-high rounded-lg p-4 my-2 overflow-x-auto text-xs font-mono text-on-surface-variant border border-hairline">
                    {children}
                  </pre>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-on-surface">{children}</strong>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-body font-semibold text-on-surface mt-3 mb-1 pb-1 border-b border-hairline tracking-tight">
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
                hr: () => <hr className="border-hairline my-3" />,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-primary/30 pl-3 my-1.5 text-ink-subtle italic">
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
            className="mt-2 px-3 py-1.5 rounded-md border border-hairline text-xs text-on-surface-variant hover:text-on-surface hover:border-on-surface/30 transition-colors duration-150"
          >
            ↻ Reintentar
          </button>
        )}

        {!esUsuario && !esError && !esLimite && !esStreaming && mensaje.texto && (
          <div className="mt-3 pt-3 border-t border-hairline-soft px-1">
            <p className="text-[11px] text-ink-tertiary leading-relaxed">
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initialQuery = params.get('q')
    if (!initialQuery) return
    window.history.replaceState({}, '', '/consulta')
    setTimeout(() => {
      enviarConsulta(initialQuery.trim())
    }, 100)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
              <p className="font-body font-semibold text-6xl md:text-8xl text-on-surface/[0.04] select-none pointer-events-none mb-6 tracking-tight">
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
                    className="px-4 py-2 rounded-full bg-surface-1 border border-hairline text-sm text-on-surface-variant hover:bg-surface-high hover:text-on-surface transition-colors duration-150 cursor-pointer"
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
          <div className="flex items-end gap-2 bg-surface-1 border border-hairline rounded-lg p-2 px-3">
            <textarea
              ref={textareaRef}
              placeholder="Escribí tu consulta sobre comercio exterior..."
              value={inputTexto}
              onChange={(e) => setInputTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={cargando}
              className="flex-1 bg-transparent border-0 resize-none outline-none text-sm text-on-surface placeholder:text-ink-tertiary py-2 max-h-40 overflow-y-auto leading-relaxed"
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
              className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-150 ${
                puedeEnviar
                  ? 'bg-primary text-on-primary hover:bg-primary-intense cursor-pointer'
                  : 'bg-surface-2 text-ink-tertiary cursor-not-allowed'
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

          <div className="flex gap-2 mt-2 opacity-60 hover:opacity-100 transition-opacity">
            <a href="/calculadora" className="text-[10px] font-body text-on-surface-variant bg-surface-1 border border-hairline rounded-md px-2.5 py-1 hover:bg-surface-high transition-colors">
              Calculadora
            </a>
            <a href="/nomenclador" className="text-[10px] font-body text-on-surface-variant bg-surface-1 border border-hairline rounded-md px-2.5 py-1 hover:bg-surface-high transition-colors">
              Nomenclador
            </a>
            <a href="/simulador" className="text-[10px] font-body text-on-surface-variant bg-surface-1 border border-hairline rounded-md px-2.5 py-1 hover:bg-surface-high transition-colors">
              Simulador
            </a>
          </div>

          <p className="text-center font-mono text-[10px] text-ink-tertiary mt-1">
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
