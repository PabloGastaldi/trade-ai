'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import PageLayout from '@/components/ui/PageLayout'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Trash2 } from 'lucide-react'
import VistaKanban, { KanbanCard } from './VistaKanban'
import ModalNuevaOperacion from './ModalNuevaOperacion'

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
  operation_type: 'importacion',
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
  if (total === 0) return <span className="font-mono text-xs text-ink-tertiary">—</span>
  const pct = Math.round((completos / total) * 100)
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-10 h-1.5 rounded-full bg-surface-2 overflow-hidden">
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
  const [filtroTipo] = useState('importacion')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [erroresForm, setErroresForm] = useState({})
  const [form, setForm] = useState(FORM_VACIO)
  const [activeDragId, setActiveDragId] = useState(null)
  const [eliminando, setEliminando] = useState({})

  // Precargar desde query params (ej: viene del informe de importación)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const ncm  = params.get('ncm')
    const pais = params.get('pais')
    const desc = params.get('desc')
    if (ncm || pais) {
      setForm({
        ...FORM_VACIO,
        ncm_code: ncm ?? '',
        counterpart_country: pais ?? '',
        product_description: desc ?? '',
        operation_type: 'importacion',
      })
      setModalAbierto(true)
    }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const opsActivas = operaciones.filter(op => op.status !== 'impo_cerrada')

  const opsFiltradas = operaciones
    .filter(op => {
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
      operation_type: 'importacion',
      incoterm: prod.incoterm ?? prev.incoterm,
      currency: prod.currency ?? prev.currency,
      total_value: prod.unit_price ? String(prod.unit_price) : prev.total_value,
      counterpart_country: prod.default_origin ?? prev.counterpart_country,
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
    if (!nuevoStatus.startsWith('impo_')) return
    setOperaciones(prev => prev.map(o => o.id === op.id ? { ...o, status: nuevoStatus } : o))
    const supabase = createClient()
    const { error } = await supabase.from('operations').update({ status: nuevoStatus }).eq('id', op.id)
    if (error) setOperaciones(prev => prev.map(o => o.id === op.id ? { ...o, status: op.status } : o))
  }

  const activeDragOp = activeDragId ? operaciones.find(o => o.id === activeDragId) : null

  return (
    <PageLayout title="OPERACIONES" subtitle="Gestioná tus importaciones">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <select
            className="bg-surface-1 rounded-md px-4 py-2 text-sm font-body text-on-surface border border-hairline focus:border-on-surface outline-none cursor-pointer"
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
          >
            <option value="todos">Todos los estados</option>
            {ESTADOS_IMPO.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-surface-1 border border-hairline rounded-md p-1">
            <button
              onClick={() => setVista('lista')}
              className={`p-2 rounded-md transition-colors ${vista === 'lista' ? 'bg-surface-2 text-on-surface' : 'text-ink-subtle hover:text-on-surface'}`}
              title="Vista lista"
            >
              <IconLista />
            </button>
            <button
              onClick={() => setVista('kanban')}
              className={`p-2 rounded-md transition-colors ${vista === 'kanban' ? 'bg-surface-2 text-on-surface' : 'text-ink-subtle hover:text-on-surface'}`}
              title="Vista Kanban"
            >
              <IconKanban />
            </button>
          </div>

          <input
            className="w-60 bg-surface-1 rounded-md px-4 py-2 text-sm font-body text-on-surface placeholder:text-ink-tertiary border border-hairline focus:border-on-surface outline-none"
            placeholder="Buscar operación..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />

          <button
            onClick={abrirModal}
            className="bg-on-surface text-on-primary px-5 py-2.5 rounded-md font-body font-semibold text-sm hover:opacity-90 transition-all"
          >
            + Nueva operación
          </button>
        </div>
      </div>

      {operaciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="text-ink-tertiary mb-4"><IconBarco /></div>
          <p className="font-body text-lg text-on-surface-variant">No tenés operaciones activas</p>
          <p className="font-body text-sm text-ink-subtle mt-2">Creá tu primera operación para empezar a gestionar</p>
          <button onClick={abrirModal} className="mt-6 bg-on-surface text-on-primary px-6 py-3 rounded-md font-body font-semibold text-sm hover:opacity-90 transition-all">
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
    <div className="rounded-xl border border-hairline bg-surface-1 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-surface-2">
            {['ESTADO','PRODUCTO','ORIGEN','VALOR','DOCS','FECHA',''].map(h => (
              <th key={h} className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-ink-subtle font-medium">{h}</th>
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
                className="border-t border-hairline-soft hover:bg-surface transition-colors cursor-pointer"
                onClick={() => !estadoElim && onRowClick(op)}
              >
                <td className="px-4 py-3"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                <td className="px-4 py-3 max-w-[200px]">
                  <p className="font-body text-sm text-on-surface truncate">{op.product_description ?? '—'}</p>
                  {op.ncm_code && <p className="font-mono text-xs text-ink-muted mt-0.5">{op.ncm_code}</p>}
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
                        className="px-2 py-1 rounded-md font-body text-xs bg-red-500/15 text-red-600 hover:bg-red-500/25 transition-colors"
                      >
                        Eliminar
                      </button>
                      <button
                        onClick={(e) => onCancelar(op.id, e)}
                        className="px-2 py-1 rounded-md font-body text-xs text-ink-subtle hover:text-on-surface transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => onEliminar(op.id, e)}
                      className="p-1.5 rounded-md text-ink-tertiary hover:text-red-600 hover:bg-red-500/10 transition-colors"
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
