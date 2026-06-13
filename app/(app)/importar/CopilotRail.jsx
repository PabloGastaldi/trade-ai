'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MessageCircle, Send, X, Loader2 } from 'lucide-react'

// Disclaimer breve para las respuestas del copiloto
const DISCLAIMER_SHORT =
  'Información orientativa. Consultá con un despachante matriculado para operaciones concretas.'

/**
 * Construye el prefijo de contexto del informe que se inyecta en cada pregunta
 * antes de enviarla a /api/consulta.
 * El texto resultante debe quedar bien dentro del límite de 2000 chars de `pregunta`.
 */
function buildContextPrefix(meta, costoTotal) {
  const costo = costoTotal !== null && costoTotal !== undefined
    ? `USD ${Math.round(Number(costoTotal)).toLocaleString('es-AR')}`
    : 'no disponible'

  const flete = meta.flete ? ` Flete declarado: USD ${Number(meta.flete).toLocaleString('es-AR')}.` : ''

  return (
    `[Contexto del informe] Producto: ${meta.ncmDescripcion}. ` +
    `NCM: ${meta.ncm}. ` +
    `Origen: ${meta.origenNombre}. ` +
    `Valor FOB: USD ${Number(meta.valor).toLocaleString('es-AR')}.` +
    flete +
    ` Costo total estimado puesto en Argentina: ${costo}. ` +
    `Régimen general de importación. ` +
    `Pregunta del usuario: `
  )
}

/**
 * Burbuja de mensaje individual del copiloto.
 * Reusa el mismo sistema de render Markdown que la página de consulta.
 */
function Bubble({ mensaje }) {
  const esUsuario = mensaje.tipo === 'usuario'
  const esError = mensaje.tipo === 'error'

  const texto = mensaje.texto
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()

  return (
    <div className={`flex gap-2 ${esUsuario ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-[9px] font-body font-bold mt-0.5 ${
          esUsuario ? 'bg-surface-highest text-on-surface-variant/50' : 'bg-primary text-on-primary'
        }`}
      >
        {esUsuario ? 'V' : 'AI'}
      </div>

      <div className={`flex flex-col max-w-[85%] ${esUsuario ? 'items-end' : 'items-start'}`}>
        {esError ? (
          <p className="px-3 py-2 rounded-xl text-xs text-red-400 bg-red-500/5">
            {mensaje.texto}
          </p>
        ) : esUsuario ? (
          <p className="px-3 py-2 rounded-xl rounded-br-sm bg-white/[0.06] text-xs text-on-surface leading-relaxed">
            {mensaje.texto}
          </p>
        ) : (
          <div className="text-xs text-on-surface leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="mb-1.5 last:mb-0 text-on-surface leading-relaxed">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-on-surface">{children}</strong>
                ),
                ul: ({ children }) => <ul className="mb-1.5 pl-4 space-y-0.5">{children}</ul>,
                ol: ({ children }) => (
                  <ol className="mb-1.5 pl-4 space-y-0.5 list-decimal">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-on-surface-variant leading-relaxed">{children}</li>
                ),
                code: ({ children }) => (
                  <code className="px-1 py-0.5 rounded bg-surface-high text-primary text-[11px] font-mono">
                    {children}
                  </code>
                ),
                h2: ({ children }) => (
                  <h2 className="text-sm font-semibold text-on-surface mt-2 mb-0.5">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xs font-semibold text-on-surface mt-2 mb-0.5">{children}</h3>
                ),
              }}
            >
              {texto}
            </ReactMarkdown>
            {mensaje.streaming && (
              <span className="inline-block w-0.5 h-3 bg-primary ml-0.5 animate-pulse align-middle" />
            )}
            {!mensaje.streaming && mensaje.texto && (
              <p className="mt-2 pt-2 border-t border-white/[0.05] text-[10px] text-on-surface-variant/40 leading-relaxed">
                {DISCLAIMER_SHORT}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Área de input compartida entre el rail y la bottom-sheet.
 */
function InputArea({ value, onChange, onSend, cargando, placeholder }) {
  const textareaRef = useRef(null)
  const puedeEnviar = value.trim().length > 0 && !cargando

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 100) + 'px'
  }, [value])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (puedeEnviar) onSend()
    }
  }

  return (
    <div className="flex items-end gap-2 bg-surface-low/80 backdrop-blur-xl border-t border-white/[0.04] rounded-2xl p-2 px-3">
      <textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={cargando}
        className="flex-1 bg-transparent border-0 resize-none outline-none text-xs text-on-surface placeholder:text-on-surface-variant/40 py-1.5 max-h-24 overflow-y-auto leading-relaxed"
        style={{ minHeight: '20px' }}
      />
      <button
        onClick={onSend}
        disabled={!puedeEnviar}
        aria-label="Enviar pregunta"
        className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
          puedeEnviar
            ? 'bg-primary-intense text-on-primary hover:bg-primary cursor-pointer'
            : 'bg-surface-high text-on-surface-variant/30 cursor-not-allowed'
        }`}
      >
        {cargando
          ? <Loader2 size={13} className="animate-spin" />
          : <Send size={13} />
        }
      </button>
    </div>
  )
}

/**
 * Lógica de chat compartida entre el rail y la hoja inferior.
 * Recibe `contextPrefix` ya construido y envía a /api/consulta.
 */
function useCopilotChat(contextPrefix) {
  const [mensajes, setMensajes] = useState([])
  const [inputTexto, setInputTexto] = useState('')
  const [cargando, setCargando] = useState(false)

  async function enviar() {
    const texto = inputTexto.trim()
    if (!texto || cargando) return

    // Límite: el prefix + la pregunta deben quedar en 2000 chars.
    const MAX_PREGUNTA = 2000
    const prefix = contextPrefix
    const preguntaFinal = (prefix + texto).slice(0, MAX_PREGUNTA)

    const historial = mensajes
      .filter(m => (m.tipo === 'usuario' || m.tipo === 'sistema') && m.texto && !m.streaming)
      .slice(-6)
      .map(m => ({ role: m.tipo === 'usuario' ? 'user' : 'assistant', content: m.texto }))

    const idUsuario = Date.now()
    setMensajes(prev => [...prev, { id: idUsuario, tipo: 'usuario', texto }])
    setInputTexto('')
    setCargando(true)

    const idSistema = Date.now() + 1
    setMensajes(prev => [...prev, { id: idSistema, tipo: 'sistema', texto: '', streaming: true }])

    try {
      const res = await fetch('/api/consulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta: preguntaFinal, historial }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setMensajes(prev =>
          prev.map(m =>
            m.id === idSistema
              ? { ...m, tipo: 'error', texto: err.error ?? 'Hubo un error. Intentá de nuevo.', streaming: false }
              : m
          )
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
            } catch { /* ignorar chunks malformados */ }
          }
        }
        setMensajes(prev =>
          prev.map(m => m.id === idSistema ? { ...m, streaming: false } : m)
        )
      } else {
        const data = await res.json()
        setMensajes(prev =>
          prev.map(m => m.id === idSistema ? { ...m, texto: data.respuesta, streaming: false } : m)
        )
      }
    } catch {
      setMensajes(prev =>
        prev.map(m =>
          m.id === idSistema
            ? { ...m, tipo: 'error', texto: 'Error de conexión. Intentá de nuevo.', streaming: false }
            : m
        )
      )
    } finally {
      setCargando(false)
    }
  }

  return { mensajes, inputTexto, setInputTexto, cargando, enviar }
}

/**
 * Contenido del chat (lista de burbujas + input).
 * Compartido entre el rail y la bottom-sheet.
 */
function ChatContent({ mensajes, inputTexto, setInputTexto, cargando, enviar, placeholder, emptyText }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  return (
    <div className="flex flex-col h-full">
      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {mensajes.length === 0 ? (
          <p className="text-xs text-on-surface-variant/50 text-center mt-4 leading-relaxed px-2">
            {emptyText}
          </p>
        ) : (
          mensajes.map(m => <Bubble key={m.id} mensaje={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-1 flex-shrink-0">
        <InputArea
          value={inputTexto}
          onChange={setInputTexto}
          onSend={enviar}
          cargando={cargando}
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}

/**
 * CopilotRail — componente principal exportado.
 *
 * - Desktop: riel lateral fijo a la derecha del informe
 * - Mobile: botón flotante que abre una hoja inferior (bottom-sheet)
 *
 * Props:
 *   meta         — { ncm, ncmDescripcion, origen, origenNombre, valor, flete }
 *   costoTotal   — número o null; el costo total calculado del régimen general
 */
export default function CopilotRail({ meta, costoTotal }) {
  const contextPrefix = buildContextPrefix(meta, costoTotal)
  const chat = useCopilotChat(contextPrefix)

  // Estado de la bottom-sheet en mobile
  const [sheetAbierto, setSheetAbierto] = useState(false)

  const PLACEHOLDER = '¿Qué querés saber sobre tu importación?'
  const EMPTY_TEXT = 'Preguntame lo que quieras sobre este informe. Por ejemplo: «¿por qué pago tanto IVA?» o «¿qué es la tasa estadística?»'

  return (
    <>
      {/* ─── RAIL DESKTOP (lg+) ─── */}
      <div
        className="hidden lg:flex flex-col bg-surface-low rounded-2xl overflow-hidden"
        style={{ height: 'fit-content', minHeight: '420px', maxHeight: '680px' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.04] flex-shrink-0">
          <MessageCircle size={14} className="text-primary" />
          <span className="font-body text-xs font-semibold text-on-surface">Copiloto IA</span>
        </div>

        {/* Chat */}
        <ChatContent
          {...chat}
          placeholder={PLACEHOLDER}
          emptyText={EMPTY_TEXT}
        />
      </div>

      {/* ─── BOTÓN FLOTANTE MOBILE (hasta lg) ─── */}
      <button
        onClick={() => setSheetAbierto(true)}
        aria-label="Abrir copiloto de IA"
        className="lg:hidden fixed bottom-[76px] right-4 z-40 w-12 h-12 rounded-full bg-primary-intense text-on-primary flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
      >
        <MessageCircle size={20} />
      </button>

      {/* ─── BOTTOM SHEET MOBILE ─── */}
      {sheetAbierto && (
        <>
          {/* Overlay */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setSheetAbierto(false)}
          />

          {/* Sheet */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-surface-low rounded-t-2xl overflow-hidden"
            style={{ height: '65vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Handle + header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle size={14} className="text-primary" />
                <span className="font-body text-xs font-semibold text-on-surface">Copiloto IA</span>
              </div>
              <button
                onClick={() => setSheetAbierto(false)}
                aria-label="Cerrar copiloto"
                className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <X size={14} className="text-on-surface-variant" />
              </button>
            </div>
            <div className="h-px bg-white/[0.04] flex-shrink-0" />

            {/* Chat */}
            <div className="flex-1 min-h-0">
              <ChatContent
                {...chat}
                placeholder={PLACEHOLDER}
                emptyText={EMPTY_TEXT}
              />
            </div>
          </div>
        </>
      )}
    </>
  )
}
