'use client'

import { useDroppable, useDraggable } from '@dnd-kit/core'
import Badge from '@/components/ui/Badge'

const ESTADOS_EXPO = [
  { key: 'expo_preparacion',    label: 'Preparación' },
  { key: 'expo_documentacion',  label: 'Documentación' },
  { key: 'expo_docs_completos', label: 'Docs completos' },
  { key: 'expo_oficializado',   label: 'Oficializado' },
  { key: 'expo_verificacion',   label: 'Verificación' },
  { key: 'expo_embarcado',      label: 'Embarcado' },
  { key: 'expo_cobro_pendiente',label: 'Cobro pendiente' },
  { key: 'expo_cerrada',        label: 'Cerrada' },
]

const ESTADOS_IMPO = [
  { key: 'impo_orden_compra',    label: 'Orden de compra' },
  { key: 'impo_en_transito',     label: 'En tránsito' },
  { key: 'impo_arribada',        label: 'Arribada' },
  { key: 'impo_despacho_proceso',label: 'Despacho en proceso' },
  { key: 'impo_oficializado',   label: 'Oficializado' },
  { key: 'impo_verificacion',   label: 'Verificación' },
  { key: 'impo_librada',        label: 'Librada' },
  { key: 'impo_pago_pendiente', label: 'Pago pendiente' },
  { key: 'impo_cerrada',        label: 'Cerrada' },
]

const BADGE_ESTADO = {
  expo_preparacion:     { variant: 'neutral',  label: 'En preparación' },
  expo_documentacion:   { variant: 'accent',    label: 'Documentación' },
  expo_docs_completos:   { variant: 'accent',    label: 'Docs completos' },
  expo_oficializado:     { variant: 'primary',   label: 'Oficializado' },
  expo_verificacion:     { variant: 'accent',    label: 'Verificación' },
  expo_embarcado:        { variant: 'success',   label: 'Embarcado' },
  expo_cobro_pendiente: { variant: 'accent',    label: 'Cobro pendiente' },
  expo_cerrada:         { variant: 'neutral',   label: 'Cerrada' },
  impo_orden_compra:     { variant: 'neutral',  label: 'Orden de compra' },
  impo_en_transito:      { variant: 'accent',   label: 'En tránsito' },
  impo_arribada:         { variant: 'accent',   label: 'Arribada' },
  impo_despacho_proceso: { variant: 'accent',   label: 'Despacho' },
  impo_oficializado:     { variant: 'primary',  label: 'Oficializado' },
  impo_verificacion:     { variant: 'accent',   label: 'Verificación' },
  impo_librada:          { variant: 'success',  label: 'Librada' },
  impo_pago_pendiente:   { variant: 'accent',  label: 'Pago pendiente' },
  impo_cerrada:          { variant: 'neutral',  label: 'Cerrada' },
}

function usd(n) {
  if (n == null) return '—'
  return `${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`
}

function DocsProgress({ total, completos }) {
  if (total === 0) return <span className="font-mono text-xs text-on-surface-variant/30">—</span>
  const pct = Math.round((completos / total) * 100)
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-primary' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-10 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-on-surface-variant">{completos}/{total}</span>
    </div>
  )
}

function KanbanCard({ op, paises, onClickCard, overlay }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: op.id })
  const pais = paises.find(p => p.iso3 === op.counterpart_country)
  const badge = BADGE_ESTADO[op.status] ?? { variant: 'neutral', label: op.status }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bg-white/[0.03] rounded-xl p-4 border border-white/[0.04] transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${overlay ? 'shadow-2xl rotate-2 border-primary/30' : 'hover:border-white/[0.08] cursor-pointer'}`}
      onClick={e => { if (!overlay && onClickCard) onClickCard(op) }}
    >
      <div className="flex items-start justify-between mb-2">
        <Badge variant={op.operation_type === 'exportacion' ? 'primary' : 'accent'} className="text-[10px]">
          {op.operation_type === 'exportacion' ? 'EXPO' : 'IMPO'}
        </Badge>
        <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
      </div>
      <p className="font-body text-sm text-on-surface font-medium mt-2 leading-snug">
        {op.product_description ?? op.ncm_code ?? 'Sin descripción'}
      </p>
      {op.ncm_code && <p className="font-mono text-xs text-primary mt-1">{op.ncm_code}</p>}
      <div className="flex items-center justify-between mt-3">
        <span className="font-body text-xs text-on-surface-variant">{pais?.name_es ?? op.counterpart_country ?? '—'}</span>
        <span className="font-mono text-sm text-on-surface">{op.currency ?? 'USD'} {usd(op.total_value)}</span>
      </div>
      <div className="mt-3">
        <DocsProgress total={op.docs_total} completos={op.docs_completos} />
      </div>
    </div>
  )
}

function KanbanColumna({ estado, operaciones, paises, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: estado.key })
  return (
    <div
      ref={setNodeRef}
      className={`min-w-[280px] bg-white/[0.01] rounded-2xl p-3 flex-shrink-0 transition-all ${isOver ? 'bg-white/[0.03]' : ''}`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="font-body text-xs font-semibold tracking-widest text-on-surface-variant uppercase">{estado.label}</span>
        <span className="font-mono text-[10px] text-on-surface-variant/50">{operaciones.length}</span>
      </div>
      <div className="space-y-3">
        {operaciones.map(op => (
          <KanbanCard key={op.id} op={op} paises={paises} onClickCard={onCardClick} />
        ))}
      </div>
    </div>
  )
}

/**
 * Vista Kanban de operaciones con drag-and-drop.
 * Props:
 *   operaciones  — array de operaciones
 *   filtroTipo   — 'exportacion' | 'importacion' | 'todos'
 *   paises       — array de { iso3, name_es }
 *   onCardClick  — callback al hacer click en una tarjeta
 *   dragOverlay  — op que se está arrastrando (para DragOverlay externo)
 *   paisesOverlay — paises para el overlay
 */
export { KanbanCard }

export default function VistaKanban({ operaciones, filtroTipo, paises, onCardClick }) {
  const estadosVisibles = filtroTipo === 'importacion'
    ? ESTADOS_IMPO
    : filtroTipo === 'exportacion'
    ? ESTADOS_EXPO
    : [...ESTADOS_EXPO, ...ESTADOS_IMPO]

  const columnas = filtroTipo === 'todos'
    ? estadosVisibles.filter(est => operaciones.some(op => op.status === est.key))
    : estadosVisibles

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columnas.map(estado => (
        <KanbanColumna
          key={estado.key}
          estado={estado}
          operaciones={operaciones.filter(op => op.status === estado.key)}
          paises={paises}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  )
}
