'use client'

import styles from './ChatMessage.module.css'

const DISCLAIMER =
  'La información es orientativa y está respaldada por documentos oficiales públicos. No reemplaza el asesoramiento de un despachante de aduana habilitado.'

export default function ChatMessage({ mensaje }) {
  const esUsuario = mensaje.tipo === 'usuario'
  const esError = mensaje.tipo === 'error'

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

        <div className={`${styles.texto} ${esError ? styles.textoError : ''}`}>
          {mensaje.texto}
          {mensaje.streaming && <span className={styles.cursor}>▌</span>}
        </div>

        {/* Disclaimer solo en respuestas del sistema, no en errores ni en streaming */}
        {!esUsuario && !esError && !mensaje.streaming && mensaje.texto && (
          <div className={styles.disclaimer}>
            <span className={styles.disclaimerIcon}>⚠</span>
            <span>{DISCLAIMER}</span>
          </div>
        )}
      </div>
    </div>
  )
}
