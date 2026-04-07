'use client'

import { getMedioPago } from '@/lib/data/medios-pago'
import styles from './detalle.module.css'

const LABEL_ESTADOS = {
  expo_preparacion:     'Preparación',
  expo_documentacion:   'Documentación',
  expo_docs_completos:  'Docs completos',
  expo_oficializado:    'Oficializado',
  expo_verificacion:    'Verificación',
  expo_embarcado:       'Embarcado',
  expo_cobro_pendiente: 'Cobro pendiente',
  expo_cerrada:         'Cerrada',
  impo_orden_compra:    'Orden de compra',
  impo_en_transito:     'En tránsito',
  impo_arribada:        'Arribada',
  impo_despacho_proceso:'Despacho en proceso',
  impo_oficializado:    'Oficializado',
  impo_verificacion:    'Verificación',
  impo_librada:         'Librada',
  impo_pago_pendiente:  'Pago pendiente',
  impo_cerrada:         'Cerrada',
}

function formatFecha(fecha, conHora = false) {
  if (!fecha) return '—'
  const d = new Date(fecha)
  const base = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
  return conHora ? `${base} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` : base
}

export default function PrintView({ op, documentos, pais, timeline }) {
  const docsCompletos = documentos.filter(d => d.is_completed).length

  return (
    <div className={styles.printOnly}>
      <h1>trade.ai — Detalle de operación</h1>
      <p><strong>Tipo:</strong> {op.operation_type === 'exportacion' ? 'Exportación' : 'Importación'}</p>
      <p><strong>Producto:</strong> {op.product_description ?? '—'} | NCM: {op.ncm_code ?? '—'}</p>
      <p><strong>País:</strong> {pais?.name_es ?? op.counterpart_country ?? '—'}</p>
      <p><strong>Incoterm:</strong> {op.incoterm ?? '—'} | <strong>Valor:</strong> {op.total_value ? `${op.currency} ${op.total_value}` : '—'}</p>
      {op.payment_method && <p><strong>Medio de pago:</strong> {getMedioPago(op.payment_method)?.nombre_corto ?? op.payment_method}</p>}
      <p><strong>Estado:</strong> {LABEL_ESTADOS[op.status] ?? op.status}</p>
      <p><strong>Documentos:</strong> {docsCompletos}/{documentos.length} completos</p>
      <hr />
      <h2>Checklist de documentos</h2>
      {documentos.map(d => (
        <p key={d.id}>
          [{d.is_completed ? 'X' : ' '}] {d.document_name} ({d.document_category})
          {d.notes ? ` — ${d.notes}` : ''}
        </p>
      ))}
      <hr />
      <h2>Historial de estados</h2>
      {[...timeline].reverse().map(ev => (
        <p key={ev.id}>
          {formatFecha(ev.changed_at, true)}: {LABEL_ESTADOS[ev.from_status] ?? ev.from_status} → {LABEL_ESTADOS[ev.to_status] ?? ev.to_status}
        </p>
      ))}
      <p style={{ marginTop: '2rem', fontSize: '0.8em', color: '#666' }}>
        Esta información es orientativa y está respaldada por fuentes oficiales.
        Para operaciones concretas, consultá con un despachante de aduana matriculado.
      </p>
    </div>
  )
}
