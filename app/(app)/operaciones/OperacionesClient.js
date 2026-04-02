'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import PageLayout from '@/components/ui/PageLayout'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { MEDIOS_PAGO_OPTIONS, getMedioPago } from '@/lib/data/medios-pago'
import { Trash2 } from 'lucide-react'

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

const TODOS_ESTADOS = [...ESTADOS_EXPO, ...ESTADOS_IMPO]
const INCOTERMS = ['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP']
const MODOS = ['maritimo','aereo','terrestre']

const LABEL_TIPO = { exportacion: 'EXPORTACIÓN', importacion: 'IMPORTACIÓN' }

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

const FORM_VACIO = {
  operation_type: 'exportacion',
  regimen: 'general',
  product_id: '',
  ncm_code: '',
  product_description: '',
  counterpart_name: '',
  counterpart_country: '',
  incoterm: 'FOB',
  payment_method: '',
  currency: 'USD',
  total_value: '',
  estimated_ship_date: '',
  transport_mode: '',
  customs_broker: '',
  notes: '',
}

// Próximamente: más regímenes cuando se carguen los documentos requeridos en la DB
const REGIMENES_EXPORTACION = [
  { value: 'general', label: 'General' },
]

const REGIMENES_IMPORTACION = [
  { value: 'general', label: 'General (canal rojo/naranja/verde)' },
]

function usd(n) {
  if (n == null) return '—'
  return `${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`
}

function fmtFecha(fecha) {
  if (!fecha) return '—'
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}

function fmtFechaFull(fecha) {
  if (!fecha) return '—'
  const d = new Date(fecha)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
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

function IconLista() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
}

function IconKanban() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="18"/><rect x="10" y="3" width="5" height="11"/>
      <rect x="17" y="3" width="5" height="15"/>
    </svg>
  )
}

function IconCerrar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function IconBarco() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.6 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
      <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
      <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>
      <path d="M12 10v4"/>
      <path d="M12 2v3"/>
    </svg>
  )
}

export default function OperacionesClient({ operacionesIniciales, productos, paises }) {
  const router = useRouter()
  const [operaciones, setOperaciones] = useState(operacionesIniciales)
  const [vista, setVista] = useState('lista')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [erroresForm, setErroresForm] = useState({})
  const [form, setForm] = useState(FORM_VACIO)
  const [activeDragId, setActiveDragId] = useState(null)
  const [eliminando, setEliminando] = useState({})

  // Precargar desde query params (ej: viene del Simulador)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const ncm  = params.get('ncm')
    const pais = params.get('pais')
    const tipo = params.get('tipo')
    if (ncm || pais || tipo) {
      setForm({
        ...FORM_VACIO,
        ncm_code: ncm ?? '',
        counterpart_country: pais ?? '',
        operation_type: (tipo === 'importacion' || tipo === 'exportacion') ? tipo : 'exportacion',
      })
      setModalAbierto(true)
    }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const opsActivas = operaciones.filter(op => op.status !== 'expo_cerrada' && op.status !== 'impo_cerrada')

  const opsFiltradas = operaciones
    .filter(op => {
      if (filtroTipo !== 'todos' && op.operation_type !== filtroTipo) return false
      if (filtroEstado !== 'todos' && op.status !== filtroEstado) return false
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase()
        if (
          !(op.product_description?.toLowerCase().includes(q)) &&
          !(op.ncm_code?.toLowerCase().includes(q)) &&
          !(op.counterpart_name?.toLowerCase().includes(q)) &&
          !(op.counterpart_country?.toLowerCase().includes(q))
        ) return false
      }
      return true
    })

  function abrirModal() { setForm(FORM_VACIO); setErroresForm({}); setModalAbierto(true) }
  function cerrarModal() { setModalAbierto(false); setErroresForm({}) }
  function setField(c, v) {
    setForm(prev => ({
      ...prev,
      [c]: v,
      ...(c === 'operation_type' ? { regimen: 'general' } : {}),
    }))
    setErroresForm(prev => ({ ...prev, [c]: null }))
  }

  function autocompletarProducto(productoId) {
    const prod = productos.find(p => p.id === productoId)
    if (!prod) { setField('product_id', ''); return }
    setForm(prev => ({
      ...prev, product_id: prod.id,
      ncm_code: prod.ncm_code ?? prev.ncm_code,
      operation_type: prod.operation_type ?? prev.operation_type,
      incoterm: prod.incoterm ?? prev.incoterm,
      currency: prod.currency ?? prev.currency,
      total_value: prod.unit_price ? String(prod.unit_price) : prev.total_value,
      counterpart_country: (prod.operation_type === 'exportacion'
        ? prod.default_destination
        : prod.default_origin) ?? prev.counterpart_country,
    }))
  }

  function validar() {
    const e = {}
    if (!form.ncm_code.trim()) e.ncm_code = 'El NCM es obligatorio'
    if (!form.counterpart_country) e.counterpart_country = 'El país es obligatorio'
    if (!form.incoterm) e.incoterm = 'Requerido'
    return e
  }

  async function handleGuardar(e) {
    e.preventDefault()
    const errs = validar()
    if (Object.keys(errs).length > 0) { setErroresForm(errs); return }
    setGuardando(true)
    try {
      const res = await fetch('/api/operaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation_type: form.operation_type,
          regimen: form.regimen || 'general',
          product_id: form.product_id || null,
          ncm_code: form.ncm_code.trim() || null,
          product_description: form.product_description.trim() || null,
          counterpart_name: form.counterpart_name.trim() || null,
          counterpart_country: form.counterpart_country || null,
          incoterm: form.incoterm || null,
          payment_method: form.payment_method || null,
          currency: form.currency,
          total_value: form.total_value ? Number(form.total_value) : null,
          estimated_ship_date: form.estimated_ship_date || null,
          transport_mode: form.transport_mode || null,
          customs_broker: form.customs_broker.trim() || null,
          notes: form.notes.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.limitAlcanzado) {
          setErroresForm({ _general: json.error, _limitAlcanzado: true })
        } else {
          throw new Error(json.error || 'Error al crear la operación')
        }
        return
      }
      const data = json.operacion
      setOperaciones(prev => [{ ...data, docs_total: 0, docs_completos: 0 }, ...prev])
      cerrarModal()
      router.push(`/operaciones/${data.id}`)
    } catch (err) {
      setErroresForm({ _general: err.message })
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(opId, e) {
    e.stopPropagation()
    setEliminando(prev => ({ ...prev, [opId]: 'confirmar' }))
  }

  async function confirmarEliminar(op, e) {
    e.stopPropagation()
    setEliminando(prev => ({ ...prev, [op.id]: 'borrando' }))
    setOperaciones(prev => prev.filter(o => o.id !== op.id))
    const res = await fetch(`/api/operaciones/${op.id}`, { method: 'DELETE' })
    if (!res.ok) {
      setOperaciones(prev => [op, ...prev.filter(o => o.id !== op.id)])
      setEliminando(prev => ({ ...prev, [op.id]: null }))
    }
  }

  function cancelarEliminar(opId, e) {
    e.stopPropagation()
    setEliminando(prev => ({ ...prev, [opId]: null }))
  }

  async function handleDragEnd({ active, over }) {
    setActiveDragId(null)
    if (!over || active.id === over.id) return
    const op = operaciones.find(o => o.id === active.id)
    if (!op) return
    const nuevoStatus = over.id
    if (op.status === nuevoStatus) return
    const compatible =
      (op.operation_type === 'exportacion' && nuevoStatus.startsWith('expo_')) ||
      (op.operation_type === 'importacion' && nuevoStatus.startsWith('impo_'))
    if (!compatible) return
    setOperaciones(prev => prev.map(o => o.id === op.id ? { ...o, status: nuevoStatus } : o))
    const supabase = createClient()
    const { error } = await supabase.from('operations').update({ status: nuevoStatus }).eq('id', op.id)
    if (error) setOperaciones(prev => prev.map(o => o.id === op.id ? { ...o, status: op.status } : o))
  }

  const activeDragOp = activeDragId ? operaciones.find(o => o.id === activeDragId) : null

  return (
    <PageLayout title="OPERACIONES" subtitle="Gestioná tus exportaciones e importaciones">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex bg-white/[0.02] rounded-xl p-1">
            {[['todos','Todas'],['exportacion','Exportación'],['importacion','Importación']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFiltroTipo(v)}
                className={`px-4 py-1.5 rounded-lg font-body text-xs transition-all ${
                  filtroTipo === v
                    ? 'bg-white/[0.06] text-on-surface'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <select
            className="bg-surface-highest rounded-xl px-4 py-2 text-sm font-body text-on-surface border border-transparent focus:border-primary/30 outline-none cursor-pointer"
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
          >
            <option value="todos">Todos los estados</option>
            <optgroup label="Exportación">
              {ESTADOS_EXPO.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
            </optgroup>
            <optgroup label="Importación">
              {ESTADOS_IMPO.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
            </optgroup>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/[0.02] rounded-xl p-1">
            <button
              onClick={() => setVista('lista')}
              className={`p-2 rounded-lg transition-colors ${vista === 'lista' ? 'text-primary' : 'text-on-surface-variant/40 hover:text-on-surface-variant'}`}
              title="Vista lista"
            >
              <IconLista />
            </button>
            <button
              onClick={() => setVista('kanban')}
              className={`p-2 rounded-lg transition-colors ${vista === 'kanban' ? 'text-primary' : 'text-on-surface-variant/40 hover:text-on-surface-variant'}`}
              title="Vista Kanban"
            >
              <IconKanban />
            </button>
          </div>

          <input
            className="w-60 bg-surface-highest rounded-xl px-4 py-2 text-sm font-body text-on-surface placeholder:text-on-surface-variant/40 border border-transparent focus:border-primary/30 outline-none"
            placeholder="Buscar operación..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />

          <button
            onClick={abrirModal}
            className="bg-primary-intense text-on-primary px-5 py-2.5 rounded-xl font-body font-semibold text-sm hover:shadow-[0_0_20px_rgba(221,217,42,0.2)] transition-all"
          >
            + Nueva operación
          </button>
        </div>
      </div>

      {operaciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="text-on-surface-variant/20 mb-4"><IconBarco /></div>
          <p className="font-body text-lg text-on-surface-variant">No tenés operaciones activas</p>
          <p className="font-body text-sm text-on-surface-variant/60 mt-2">Creá tu primera operación para empezar a gestionar</p>
          <button onClick={abrirModal} className="mt-6 bg-primary-intense text-on-primary px-6 py-3 rounded-xl font-body font-semibold text-sm hover:shadow-[0_0_20px_rgba(221,217,42,0.2)] transition-all">
            + Nueva operación
          </button>
        </div>
      ) : opsFiltradas.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-body text-sm text-on-surface-variant">No hay operaciones que coincidan con los filtros.</p>
        </div>
      ) : vista === 'lista' ? (
        <VistaLista operaciones={opsFiltradas} paises={paises} onRowClick={op => router.push(`/operaciones/${op.id}`)} onEliminar={handleEliminar} onConfirmar={confirmarEliminar} onCancelar={cancelarEliminar} eliminando={eliminando} />
      ) : (
        <DndContext sensors={sensors} onDragStart={({ active }) => setActiveDragId(active.id)} onDragEnd={handleDragEnd} onDragCancel={() => setActiveDragId(null)}>
          <VistaKanban operaciones={opsFiltradas} filtroTipo={filtroTipo} paises={paises} onCardClick={op => router.push(`/operaciones/${op.id}`)} />
          <DragOverlay>
            {activeDragOp && <KanbanCard op={activeDragOp} paises={paises} overlay />}
          </DragOverlay>
        </DndContext>
      )}

      {modalAbierto && (
        <ModalNuevaOperacion
          form={form} setField={setField} errores={erroresForm}
          productos={productos} paises={paises}
          guardando={guardando} onGuardar={handleGuardar}
          onCerrar={cerrarModal} onProductoChange={autocompletarProducto}
        />
      )}
    </PageLayout>
  )
}

function VistaLista({ operaciones, paises, onRowClick, onEliminar, onConfirmar, onCancelar, eliminando }) {
  return (
    <div className="rounded-xl border border-white/[0.04] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-surface-high">
            {['ESTADO','TIPO','PRODUCTO','DESTINO/ORIGEN','VALOR','DOCS','FECHA',''].map(h => (
              <th key={h} className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {operaciones.map((op) => {
            const pais = paises.find(p => p.iso3 === op.counterpart_country)
            const badge = BADGE_ESTADO[op.status] ?? { variant: 'neutral', label: op.status }
            const estadoElim = eliminando[op.id]
            return (
              <tr
                key={op.id}
                className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
                onClick={() => !estadoElim && onRowClick(op)}
              >
                <td className="px-4 py-3"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                <td className="px-4 py-3">
                  <Badge variant={op.operation_type === 'exportacion' ? 'primary' : 'accent'}>
                    {op.operation_type === 'exportacion' ? 'EXPO' : 'IMPO'}
                  </Badge>
                </td>
                <td className="px-4 py-3 max-w-[200px]">
                  <p className="font-body text-sm text-on-surface truncate">{op.product_description ?? '—'}</p>
                  {op.ncm_code && <p className="font-mono text-xs text-primary mt-0.5">{op.ncm_code}</p>}
                </td>
                <td className="px-4 py-3">
                  <p className="font-body text-sm text-on-surface">{pais?.name_es ?? op.counterpart_country ?? '—'}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-sm text-on-surface">
                    {op.currency ?? 'USD'} {usd(op.total_value)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <DocsProgress total={op.docs_total} completos={op.docs_completos} />
                </td>
                <td className="px-4 py-3">
                  <span className="font-body text-xs text-on-surface-variant">{fmtFecha(op.estimated_ship_date)}</span>
                </td>
                <td className="px-4 py-3 w-[1%] whitespace-nowrap">
                  {estadoElim === 'confirmar' ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => onConfirmar(op, e)}
                        className="px-2 py-1 rounded-lg font-body text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                      >
                        Eliminar
                      </button>
                      <button
                        onClick={(e) => onCancelar(op.id, e)}
                        className="px-2 py-1 rounded-lg font-body text-xs text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => onEliminar(op.id, e)}
                      className="p-1.5 rounded-lg text-on-surface-variant/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Eliminar operación"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function VistaKanban({ operaciones, filtroTipo, paises, onCardClick }) {
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

function badgeRiesgo(riesgo) {
  if (!riesgo) return null
  const r = riesgo.toLowerCase()
  if (r === 'muy bajo' || r === 'bajo') return { bg: 'bg-emerald-500/10', text: 'text-emerald-400' }
  if (r === 'medio') return { bg: 'bg-amber-500/10', text: 'text-amber-400' }
  return { bg: 'bg-red-500/10', text: 'text-red-400' }
}

function IconCheck({ className = '' }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function IconX({ className = '' }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function IconChevronDown({ className = '' }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function IconChevronUp({ className = '' }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  )
}

function PanelMedioPagoInline({ medioId }) {
  const [expandir, setExpandir] = useState(false)
  const medio = getMedioPago(medioId)
  if (!medio) return null

  const riesgoExp = badgeRiesgo(medio.riesgo_exportador)
  const riesgoImp = badgeRiesgo(medio.riesgo_importador)
  const costo = badgeRiesgo(medio.costo_relativo)

  return (
    <div className="bg-white/[0.02] rounded-xl p-5 mt-3 border border-white/[0.04]">
      <h4 className="font-body text-base font-semibold text-on-surface">{medio.nombre}</h4>
      <p className="font-body text-sm text-on-surface-variant mt-2">{medio.descripcion}</p>

      <div className="flex flex-wrap gap-2 mt-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium ${riesgoExp.bg} ${riesgoExp.text}`}>
          Exportador: {medio.riesgo_exportador}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium ${riesgoImp.bg} ${riesgoImp.text}`}>
          Importador: {medio.riesgo_importador}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium ${costo.bg} ${costo.text}`}>
          Costo: {medio.costo_relativo}
        </span>
      </div>

      <button
        type="button"
        className="mt-3 flex items-center gap-1.5 text-primary text-sm font-body hover:underline cursor-pointer"
        onClick={() => setExpandir(v => !v)}
      >
        {expandir ? 'Ocultar detalles' : 'Ver más detalles'}
        {expandir ? <IconChevronUp /> : <IconChevronDown />}
      </button>

      {expandir && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="font-body text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Cómo funciona</p>
            <ol className="space-y-1.5">
              {medio.como_funciona.map((paso, i) => (
                <li key={i} className="flex gap-2 text-sm font-body text-on-surface-variant">
                  <span className="text-primary font-mono text-xs mt-0.5 shrink-0">{i + 1}.</span>
                  <span>{paso}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-body text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Ventajas</p>
              <ul className="space-y-1">
                {medio.ventajas.map((v, i) => (
                  <li key={i} className="flex gap-2 text-sm font-body text-on-surface-variant">
                    <IconCheck className="text-emerald-400 mt-0.5 shrink-0" />
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-body text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Desventajas</p>
              <ul className="space-y-1">
                {medio.desventajas.map((d, i) => (
                  <li key={i} className="flex gap-2 text-sm font-body text-on-surface-variant">
                    <IconX className="text-red-400 mt-0.5 shrink-0" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <p className="font-body text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Documentos bancarios</p>
            <ul className="space-y-1">
              {medio.documentos_bancarios.map((doc, i) => (
                <li key={i} className="flex gap-2 text-sm font-body text-on-surface-variant">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-2 border-t border-white/[0.04]">
            <p className="font-body text-xs text-on-surface-variant/60">Recomendado para: {medio.recomendado_para}</p>
            <p className="font-mono text-[10px] text-on-surface-variant/40 mt-1">Normativa: {medio.normativa}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function getRegimenQuery(regimen) {
  return regimen.startsWith('courier_') ? [regimen, 'courier'] : [regimen]
}

function ModalNuevaOperacion({ form, setField, errores, productos, paises, guardando, onGuardar, onCerrar, onProductoChange }) {
  const [expandir, setExpandir] = useState(false)
  const [ncmSugerencias, setNcmSugerencias] = useState([])
  const [ncmVisible, setNcmVisible] = useState(false)
  const [buscandoNcm, setBuscandoNcm] = useState(false)
  const [restricciones, setRestricciones] = useState([])
  const [productosPermitidos, setProductosPermitidos] = useState([])
  const [productosProhibidos, setProductosProhibidos] = useState([])
  const ncmRef = useRef(null)
  const debounceRef = useRef(null)

  // Fetch restricciones y productos cuando cambia el régimen
  useEffect(() => {
    if (form.regimen === 'general') {
      setRestricciones([])
      setProductosPermitidos([])
      setProductosProhibidos([])
      return
    }

    const supabase = createClient()
    const regimenQuery = getRegimenQuery(form.regimen)
    const esCourier = form.regimen.startsWith('courier_') || form.regimen === 'courier'

    const fetches = [
      supabase
        .from('restricciones_regimenes')
        .select('restriccion, valor, base_legal, notas')
        .in('regimen', regimenQuery),
    ]

    if (esCourier) {
      fetches.push(
        supabase
          .from('productos_regimen')
          .select('producto, motivo, organismo, notas')
          .in('regimen', regimenQuery)
          .eq('tipo', 'permitido'),
        supabase
          .from('productos_regimen')
          .select('producto, motivo, organismo, notas')
          .in('regimen', regimenQuery)
          .eq('tipo', 'prohibido'),
      )
    }

    Promise.all(fetches).then(([resR, resP, resPr]) => {
      setRestricciones(resR.data ?? [])
      setProductosPermitidos(resP?.data ?? [])
      setProductosProhibidos(resPr?.data ?? [])
    }).catch(() => {
      // Error silencioso — tabla puede no existir
    })
  }, [form.regimen])

  useEffect(() => {
    function handler(e) {
      if (ncmRef.current && !ncmRef.current.contains(e.target)) setNcmVisible(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleNcmInput(val) {
    setField('ncm_code', val)
    clearTimeout(debounceRef.current)
    if (val.trim().length < 2) { setNcmSugerencias([]); setNcmVisible(false); return }
    debounceRef.current = setTimeout(async () => {
      setBuscandoNcm(true)
      try {
        const res = await fetch(`/api/ncm-search?q=${encodeURIComponent(val.trim())}`)
        const data = await res.json()
        const items = Array.isArray(data) ? data : []
        setNcmSugerencias(items)
        setNcmVisible(items.length > 0)
      } catch {
        setNcmSugerencias([])
        setNcmVisible(false)
      } finally {
        setBuscandoNcm(false)
      }
    }, 300)
  }

  function seleccionarNcm(item) {
    setField('ncm_code', item.ncm_code)
    setField('product_description', item.description)
    setNcmSugerencias([])
    setNcmVisible(false)
  }

  const productosFiltrados = productos.filter(p => !form.operation_type || p.operation_type === form.operation_type)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className="bg-surface-low rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/[0.04] sticky top-0 bg-surface-low z-10">
          <h2 className="font-body text-base font-semibold text-on-surface uppercase">NUEVA OPERACIÓN</h2>
          <button onClick={onCerrar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer">
            <IconCerrar />
          </button>
        </div>

        <form onSubmit={onGuardar} noValidate className="p-6 space-y-5">
          <div>
            <label className="block font-body text-xs text-on-surface-variant mb-2">Tipo de operación <span className="text-red-400">*</span></label>
            <div className="flex bg-white/[0.02] rounded-xl p-1">
              {['exportacion','importacion'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setField('operation_type', t)}
                  className={`flex-1 py-2 rounded-lg font-body text-sm font-medium transition-all ${
                    form.operation_type === t
                      ? 'bg-white/[0.06] text-on-surface'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {LABEL_TIPO[t]}
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const regimenOpts = form.operation_type === 'importacion' ? REGIMENES_IMPORTACION : REGIMENES_EXPORTACION
            if (regimenOpts.length <= 1) return null
            return (
              <div>
                <label className="block font-body text-xs text-on-surface-variant mb-1.5">Régimen aduanero</label>
                <select
                  className="w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface border border-transparent focus:border-primary/30 outline-none cursor-pointer"
                  value={form.regimen}
                  onChange={e => setField('regimen', e.target.value)}
                >
                  {regimenOpts.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <p className="mt-1.5 font-body text-[11px] text-on-surface-variant/60">
                  El régimen determina los documentos requeridos y los organismos que intervienen en tu operación.
                </p>

                {restricciones.length > 0 && (
                  <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <p className="font-body text-xs font-semibold text-amber-400 mb-2">
                      Restricciones del régimen seleccionado
                    </p>
                    <ul className="space-y-1">
                      {restricciones.map((r, i) => (
                        <li key={i} className="font-body text-xs text-on-surface-variant">
                          <span className="text-amber-400/70">•</span>{' '}
                          <span className="font-medium text-on-surface">{r.restriccion}</span>
                          {r.valor && <span className="text-on-surface-variant">: {r.valor}</span>}
                          {r.notas && r.notas !== 'nan' && r.notas !== 'null' && (
                            <span className="text-on-surface-variant/60"> — {r.notas}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {productosPermitidos.length > 0 && (
                  <div className="mt-2 bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4">
                    <p className="font-body text-xs font-semibold text-emerald-400 mb-2">
                      Productos permitidos por este régimen
                    </p>
                    <p className="font-body text-xs text-on-surface-variant">
                      {productosPermitidos.map(p => p.producto).join(', ')}
                    </p>
                  </div>
                )}

                {productosProhibidos.length > 0 && (
                  <div className="mt-2 bg-red-500/5 border border-red-500/15 rounded-xl p-4">
                    <p className="font-body text-xs font-semibold text-red-400 mb-2">
                      Productos NO permitidos (requieren régimen general)
                    </p>
                    <ul className="space-y-1">
                      {productosProhibidos.map((p, i) => (
                        <li key={i} className="font-body text-xs text-on-surface-variant">
                          <span className="text-red-400/70">•</span>{' '}
                          <span className="font-medium text-on-surface">{p.producto}</span>
                          {(p.motivo && p.motivo !== 'nan') && <span className="text-on-surface-variant"> — {p.motivo}</span>}
                          {(p.organismo && p.organismo !== 'nan') && <span className="text-on-surface-variant/60"> ({p.organismo})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })()}

          {productosFiltrados.length > 0 && (
            <div>
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">Producto del catálogo <span className="text-on-surface-variant/40">(autocompleta campos)</span></label>
              <select
                className="w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface border border-transparent focus:border-primary/30 outline-none cursor-pointer"
                defaultValue=""
                onChange={e => onProductoChange(e.target.value)}
              >
                <option value="">Seleccionar…</option>
                {productosFiltrados.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.ncm_code}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-body text-xs text-on-surface-variant mb-1.5">NCM <span className="text-red-400">*</span></label>
            <div ref={ncmRef} className="relative">
              <input
                className={`w-full bg-surface-highest rounded-xl px-4 py-3 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/40 border ${errores.ncm_code ? 'border-red-500/50' : 'border-transparent focus:border-primary/30'} outline-none`}
                placeholder="Código o descripción…"
                value={form.ncm_code}
                onChange={e => handleNcmInput(e.target.value)}
                onFocus={() => ncmSugerencias.length > 0 && setNcmVisible(true)}
                autoComplete="off"
              />
              {buscandoNcm && <p className="mt-1 font-body text-[10px] text-on-surface-variant/50">Buscando…</p>}
              {ncmVisible && (
                <div className="absolute top-full left-0 right-0 z-50 bg-surface-low rounded-xl border border-white/[0.06] shadow-xl mt-1 overflow-hidden">
                  {ncmSugerencias.map(s => (
                    <button
                      key={s.ncm_code}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] last:border-0"
                      onClick={() => seleccionarNcm(s)}
                    >
                      <span className="font-mono text-xs text-primary block">{s.ncm_code}</span>
                      <span className="font-body text-[11px] text-on-surface-variant line-clamp-1">{s.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errores.ncm_code && <p className="mt-1 font-body text-[10px] text-red-400">{errores.ncm_code}</p>}
          </div>

          <div>
            <label className="block font-body text-xs text-on-surface-variant mb-1.5">Descripción del producto</label>
            <input
              className="w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-transparent focus:border-primary/30 outline-none"
              placeholder="Ej: Galletas de chocolate con leche"
              value={form.product_description}
              onChange={e => setField('product_description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">
                {form.operation_type === 'exportacion' ? 'País de destino' : 'País de origen'} <span className="text-red-400">*</span>
              </label>
              <select
                className={`w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface border ${errores.counterpart_country ? 'border-red-500/50' : 'border-transparent focus:border-primary/30'} outline-none cursor-pointer`}
                value={form.counterpart_country}
                onChange={e => setField('counterpart_country', e.target.value)}
              >
                <option value="">Seleccionar…</option>
                {paises.map(p => <option key={p.iso3} value={p.iso3}>{p.name_es}</option>)}
              </select>
              {errores.counterpart_country && <p className="mt-1 font-body text-[10px] text-red-400">{errores.counterpart_country}</p>}
            </div>
            <div>
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">Incoterm <span className="text-red-400">*</span></label>
              <select
                className="w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface border border-transparent focus:border-primary/30 outline-none cursor-pointer"
                value={form.incoterm}
                onChange={e => setField('incoterm', e.target.value)}
              >
                {INCOTERMS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-body text-xs text-on-surface-variant mb-1.5">Medio de pago</label>
            <select
              className="w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface border border-transparent focus:border-primary/30 outline-none cursor-pointer"
              value={form.payment_method}
              onChange={e => setField('payment_method', e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {MEDIOS_PAGO_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            {form.payment_method && <PanelMedioPagoInline medioId={form.payment_method} />}
          </div>

          <div>
            <label className="block font-body text-xs text-on-surface-variant mb-1.5">
              {form.operation_type === 'exportacion' ? 'Importador' : 'Exportador'}
            </label>
            <input
              className="w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-transparent focus:border-primary/30 outline-none"
              placeholder="Nombre de la empresa"
              value={form.counterpart_name}
              onChange={e => setField('counterpart_name', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">Valor total (USD)</label>
              <input
                className="w-full bg-surface-highest rounded-xl px-4 py-3 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-transparent focus:border-primary/30 outline-none"
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.total_value}
                onChange={e => setField('total_value', e.target.value)}
              />
            </div>
            <div>
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">Moneda</label>
              <select className="w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface border border-transparent focus:border-primary/30 outline-none cursor-pointer" value={form.currency} onChange={e => setField('currency', e.target.value)}>
                <option value="USD">USD</option><option value="EUR">EUR</option><option value="ARS">ARS</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:bg-white/[0.04] transition-colors cursor-pointer"
            onClick={() => setExpandir(v => !v)}
          >
            <span className="font-body text-sm text-on-surface-variant">
              {expandir ? '▲' : '▼'} Campos adicionales
            </span>
          </button>

          {expandir && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-body text-xs text-on-surface-variant mb-1.5">Fecha estimada de embarque</label>
                  <input
                    type="date"
                    className="w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface border border-transparent focus:border-primary/30 outline-none"
                    value={form.estimated_ship_date}
                    onChange={e => setField('estimated_ship_date', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-body text-xs text-on-surface-variant mb-1.5">Medio de transporte</label>
                  <select
                    className="w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface border border-transparent focus:border-primary/30 outline-none cursor-pointer"
                    value={form.transport_mode}
                    onChange={e => setField('transport_mode', e.target.value)}
                  >
                    <option value="">Seleccionar…</option>
                    {MODOS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-body text-xs text-on-surface-variant mb-1.5">Despachante</label>
                <input
                  className="w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-transparent focus:border-primary/30 outline-none"
                  placeholder="Nombre del despachante"
                  value={form.customs_broker}
                  onChange={e => setField('customs_broker', e.target.value)}
                />
              </div>
              <div>
                <label className="block font-body text-xs text-on-surface-variant mb-1.5">Notas</label>
                <textarea
                  rows={3}
                  className="w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-transparent focus:border-primary/30 outline-none resize-none"
                  placeholder="Observaciones adicionales…"
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                />
              </div>
            </div>
          )}

          {errores._general && (
            <div className={`px-4 py-3 rounded-xl text-sm ${errores._limitAlcanzado ? 'bg-primary/5 border border-primary/30 text-on-surface' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
              {errores._general}
              {errores._limitAlcanzado && (
                <a href="/planes" className="ml-2 font-semibold text-primary underline underline-offset-2">Ver planes</a>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="flex-1 py-3 rounded-xl bg-white/[0.05] text-on-surface font-body font-semibold text-sm hover:bg-white/[0.08] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 py-3 rounded-xl bg-primary-intense text-on-primary font-body font-semibold text-sm hover:shadow-[0_0_20px_rgba(221,217,42,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando ? 'Creando…' : 'Crear operación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
