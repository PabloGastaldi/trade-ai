'use client'

import { useState } from 'react'
import styles from './detalle.module.css'

function formatFecha(fecha, conHora = false) {
  if (!fecha) return '—'
  const d = new Date(fecha)
  const base = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
  return conHora ? `${base} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` : base
}

function IconCheck() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function IconNota() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

export default function DocItem({ doc, onToggle, onNotaChange }) {
  const [editandoNota, setEditandoNota] = useState(false)
  const [notaTemp, setNotaTemp] = useState(doc.notes ?? '')
  const [guardando, setGuardando] = useState(false)

  async function guardarNota() {
    setGuardando(true)
    await onNotaChange(doc, notaTemp)
    setGuardando(false)
    setEditandoNota(false)
  }

  return (
    <div className={`${styles.docItem} ${!doc.is_completed && doc.document_category === 'critico' ? styles.docItemCriticoPendiente : ''}`}>
      <div className={styles.docItemMain}>
        <button
          className={`${styles.docCheckbox} ${doc.is_completed ? styles.docCheckboxMarcado : ''}`}
          onClick={() => onToggle(doc)}
          aria-label={doc.is_completed ? 'Marcar como incompleto' : 'Marcar como completado'}
        >
          {doc.is_completed && <IconCheck />}
        </button>
        <div className={styles.docInfo}>
          <span className={`${styles.docNombre} ${doc.is_completed ? styles.docNombreCompleto : ''}`}>
            {doc.document_name}
          </span>
          {doc.is_completed && doc.completed_at && (
            <span className={styles.docFechaCompleto}>
              Completado el {formatFecha(doc.completed_at, false)}
            </span>
          )}
          {doc.due_date && !doc.is_completed && (
            <span className={styles.docVencimiento}>
              Vence: {formatFecha(doc.due_date)}
            </span>
          )}
        </div>
        <button
          className={styles.docNotaBtn}
          onClick={() => { setNotaTemp(doc.notes ?? ''); setEditandoNota(v => !v) }}
          title="Agregar nota"
        >
          <IconNota />
        </button>
      </div>

      {(doc.notes && !editandoNota) && (
        <p className={styles.docNotaTexto} onClick={() => { setNotaTemp(doc.notes); setEditandoNota(true) }}>
          {doc.notes}
        </p>
      )}
      {editandoNota && (
        <div className={styles.docNotaEdit}>
          <input
            className={styles.docNotaInput}
            type="text"
            placeholder="Ej: Solicitado a SENASA el 15/03…"
            value={notaTemp}
            onChange={e => setNotaTemp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && guardarNota()}
            autoFocus
          />
          <div className={styles.docNotaAcciones}>
            <button className={styles.docNotaBtnCancel} onClick={() => setEditandoNota(false)} disabled={guardando}>
              Cancelar
            </button>
            <button className={styles.docNotaBtnGuardar} onClick={guardarNota} disabled={guardando}>
              {guardando ? '…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
