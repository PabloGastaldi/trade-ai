'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import styles from './ChatMessage.module.css'

const DISCLAIMER =
  'La información es orientativa y está respaldada por documentos oficiales públicos. No reemplaza el asesoramiento de un despachante de aduana habilitado.'

export default function ChatMessage({ mensaje, onReintentar }) {
  const esUsuario = mensaje.tipo === 'usuario'
  const esError = mensaje.tipo === 'error'
  const esLimite = mensaje.tipo === 'limite'

  return (
    <div className={`${styles.wrapper} ${esUsuario ? styles.wrapperUsuario : ''}`}>
      {/* Avatar */}
      <div className={`${styles.avatar} ${esUsuario ? styles.avatarUsuario : styles.avatarSistema}`}>
        {esUsuario ? 'Vos' : 'AI'}
      </div>

      {/* Contenido */}
      <div className={styles.content}>
        <div className={styles.label}>
          {esUsuario ? 'Tu consulta' : 'trade.ai'}
        </div>

        {esLimite ? (
          <div className={styles.limiteBox}>
            <span className={styles.limiteIcon}>🔒</span>
            <span>{mensaje.texto}</span>
          </div>
        ) : (
          <div className={`${styles.texto} ${esError ? styles.textoError : ''} ${mensaje.streaming ? styles.textoStreaming : ''}`}>
            {esUsuario || esError ? (
              mensaje.texto
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {mensaje.texto}
              </ReactMarkdown>
            )}
            {mensaje.streaming && <span className={styles.cursor}>▌</span>}
          </div>
        )}

        {/* Botón reintentar en errores */}
        {esError && onReintentar && (
          <button className={styles.retryBtn} onClick={onReintentar}>
            ↻ Reintentar consulta
          </button>
        )}

        {/* Disclaimer solo en respuestas completas del sistema */}
        {!esUsuario && !esError && !esLimite && !mensaje.streaming && mensaje.texto && (
          <div className={styles.disclaimer}>
            <span className={styles.disclaimerIcon}>⚠</span>
            <span>{DISCLAIMER}</span>
          </div>
        )}
      </div>
    </div>
  )
}
