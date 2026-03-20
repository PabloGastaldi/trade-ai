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
import styles from './operaciones.module.css'

// ── Constantes ────────────────────────────────────────────────────────────────

const ESTADOS_EXPO = [
  { key: 'expo_preparacion',    label: 'Preparación' },
  { key: 'expo_documentacion',  label: 'Documentación' },
  { key: 'expo_docs_completos', label: 'Docs completos' },
  { key: 'expo_oficializado',   label: 'Oficializado' },
  { key: 'expo_verificacion',   label: 'Verificación' },
  { key: 'expo_embarcado',      label: 'Embarcado' },
  { key: 'expo_cobro_pendiente','label': 'Cobro pendiente' },
  { key: 'expo_cerrada',        label: 'Cerrada' },
]

const ESTADOS_IMPO = [
  { key: 'impo_orden_compra',    label: 'Orden de compra' },
  { key: 'impo_en_transito',     label: 'En tránsito' },
  { key: 'impo_arribada',        label: 'Arribada' },
  { key: 'impo_despacho_proceso','label': 'Despacho en proceso' },
  { key: 'impo_oficializado',    label: 'Oficializado' },
  { key: 'impo_verificacion',    label: 'Verificación' },
  { key: 'impo_librada',         label: 'Librada' },
  { key: 'impo_pago_pendiente',  label: 'Pago pendiente' },
  { key: 'impo_cerrada',         label: 'Cerrada' },
]

const TODOS_ESTADOS = [...ESTADOS_EXPO, ...ESTADOS_IMPO]

const INCOTERMS = ['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP']
const MODOS_TRANSPORTE = ['maritimo','aereo','terrestre']

const FORM_VACIO = {
  operation_type: 'exportacion',
  product_id: '',
  ncm_code: '',
  product_description: '',
  counterpart_name: '',
  counterpart_country: '',
  incoterm: 'FOB',
  currency: 'USD',
  total_value: '',
  estimated_ship_date: '',
  transport_mode: '',
  customs_broker: '',
  port_exit: '',
  port_entry: '',
  notes: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function labelEstado(status) {
  return TODOS_ESTADOS.find(e => e.key === status)?.label ?? status
}

function labelTipo(tipo) {
  return tipo === 'exportacion' ? 'Exportación' : 'Importación'
}

function formatValor(op) {
  if (!op.total_value) return '—'
  return `${op.currency ?? 'USD'} ${Number(op.total_value).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`
}

function formatFecha(fecha) {
  if (!fecha) return '—'
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}

/** Alerta: días desde creación para operaciones con SIM */
function alertaPermiso(op) {
  if (!op.sim_number || !op.created_at) return null
  const dias = Math.floor((Date.now() - new Date(op.created_at)) / 86400000)
  if (dias >= 26) return `Permiso vence en ${30 - dias} días`
  return null
}

function alertaDocs(op) {
  if (op.docs_total === 0) return null
  const pendientes = op.docs_total - op.docs_completos
  if (pendientes === 0) return { tipo: 'ok', msg: 'Documentación completa' }
  return { tipo: 'warn', msg: `${pendientes} doc${pendientes !== 1 ? 's' : ''} pendiente${pendientes !== 1 ? 's' : ''}` }
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function OperacionesClient({ operacionesIniciales, productos, paises }) {
  const router = useRouter()
  const [operaciones, setOperaciones] = useState(operacionesIniciales)
  const [vista, setVista] = useState('lista')       // 'lista' | 'kanban'
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroPais, setFiltroPais] = useState('')
  const [ordenarPor, setOrdenarPor] = useState('fecha')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [erroresForm, setErroresForm] = useState({})
  const [form, setForm] = useState(FORM_VACIO)
  const [activeDragId, setActiveDragId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // ── Filtrado y ordenamiento ──────────────────────────────────────────────

  const opsFiltradas = operaciones
    .filter(op => {
      if (filtroTipo !== 'todos' && op.operation_type !== filtroTipo) return false
      if (filtroEstado !== 'todos' && op.status !== filtroEstado) return false
      if (filtroPais && op.counterpart_country !== filtroPais) return false
      return true
    })
    .sort((a, b) => {
      if (ordenarPor === 'fecha') return new Date(b.created_at) - new Date(a.created_at)
      if (ordenarPor === 'valor') return (b.total_value ?? 0) - (a.total_value ?? 0)
      if (ordenarPor === 'estado') return a.status.localeCompare(b.status)
      return 0
    })

  // ── Modal nueva operación ────────────────────────────────────────────────

  function abrirModal() {
    setForm(FORM_VACIO)
    setErroresForm({})
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setErroresForm({})
  }

  function setField(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
    if (erroresForm[campo]) setErroresForm(prev => ({ ...prev, [campo]: null }))
  }

  function autocompletarProducto(productoId) {
    const prod = productos.find(p => p.id === productoId)
    if (!prod) {
      setField('product_id', '')
      return
    }
    setForm(prev => ({
      ...prev,
      product_id: prod.id,
      ncm_code: prod.ncm_code ?? '',
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
    const errs = {}
    if (!form.operation_type) errs.operation_type = 'Requerido'
    if (!form.ncm_code.trim()) errs.ncm_code = 'El NCM es obligatorio'
    if (!form.counterpart_country) errs.counterpart_country = 'El país es obligatorio'
    if (!form.incoterm) errs.incoterm = 'El incoterm es obligatorio'
    return errs
  }

  async function handleGuardar(e) {
    e.preventDefault()
    const errs = validar()
    if (Object.keys(errs).length > 0) { setErroresForm(errs); return }

    setGuardando(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const payload = {
        user_id: user.id,
        operation_type: form.operation_type,
        status: form.operation_type === 'exportacion' ? 'expo_preparacion' : 'impo_orden_compra',
        product_id: form.product_id || null,
        ncm_code: form.ncm_code.trim() || null,
        product_description: form.product_description.trim() || null,
        counterpart_name: form.counterpart_name.trim() || null,
        counterpart_country: form.counterpart_country || null,
        incoterm: form.incoterm || null,
        currency: form.currency,
        total_value: form.total_value ? Number(form.total_value) : null,
        estimated_ship_date: form.estimated_ship_date || null,
        transport_mode: form.transport_mode || null,
        customs_broker: form.customs_broker.trim() || null,
        port_exit: form.port_exit.trim() || null,
        port_entry: form.port_entry.trim() || null,
        notes: form.notes.trim() || null,
      }

      const { data, error } = await supabase
        .from('operations')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      setOperaciones(prev => [{ ...data, docs_total: 0, docs_completos: 0 }, ...prev])
      cerrarModal()
      // Navegar al detalle para ver el checklist generado
      router.push(`/operaciones/${data.id}`)
    } catch (err) {
      setErroresForm({ _general: err.message })
    } finally {
      setGuardando(false)
    }
  }

  // ── Drag & drop (Kanban) ─────────────────────────────────────────────────

  async function handleDragEnd({ active, over }) {
    setActiveDragId(null)
    if (!over || active.id === over.id) return

    const op = operaciones.find(o => o.id === active.id)
    if (!op) return

    // over.id es el key del estado (columna destino)
    const nuevoStatus = over.id
    if (op.status === nuevoStatus) return

    // Validar que el status sea del mismo tipo de operación
    const esCompatible =
      (op.operation_type === 'exportacion' && nuevoStatus.startsWith('expo_')) ||
      (op.operation_type === 'importacion' && nuevoStatus.startsWith('impo_'))
    if (!esCompatible) return

    // Actualizar optimistamente
    setOperaciones(prev =>
      prev.map(o => o.id === op.id ? { ...o, status: nuevoStatus } : o)
    )

    const supabase = createClient()
    const { error } = await supabase
      .from('operations')
      .update({ status: nuevoStatus })
      .eq('id', op.id)

    if (error) {
      // Revertir si falla
      setOperaciones(prev =>
        prev.map(o => o.id === op.id ? { ...o, status: op.status } : o)
      )
    }
  }

  const activeDragOp = activeDragId ? operaciones.find(o => o.id === activeDragId) : null

  // ── Países únicos para el filtro ──────────────────────────────────────────

  const paisesEnUso = paises.filter(p =>
    operaciones.some(o => o.counterpart_country === p.iso3)
  )

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}>Operaciones</h1>
          <p className={styles.subtitulo}>
            {operaciones.length > 0
              ? `${operaciones.length} operación${operaciones.length !== 1 ? 'es' : ''}`
              : 'No tenés operaciones registradas'}
          </p>
        </div>
        <div className={styles.headerAcciones}>
          {/* Toggle vista */}
          <div className={styles.vistaToggle}>
            <button
              className={`${styles.vistaBtn} ${vista === 'lista' ? styles.vistaBtnActivo : ''}`}
              onClick={() => setVista('lista')}
              title="Vista lista"
            >
              <IconLista />
              <span>Lista</span>
            </button>
            <button
              className={`${styles.vistaBtn} ${vista === 'kanban' ? styles.vistaBtnActivo : ''}`}
              onClick={() => setVista('kanban')}
              title="Vista Kanban"
            >
              <IconKanban />
              <span>Kanban</span>
            </button>
          </div>
          <button className={styles.btnPrimario} onClick={abrirModal}>
            + Nueva operación
          </button>
        </div>
      </div>

      {/* ── Filtros ── */}
      {operaciones.length > 0 && (
        <div className={styles.filtros}>
          <div className={styles.filtroTabs}>
            {['todos', 'exportacion', 'importacion'].map(t => (
              <button
                key={t}
                className={`${styles.filtroTab} ${filtroTipo === t ? styles.filtroTabActivo : ''}`}
                onClick={() => setFiltroTipo(t)}
              >
                {t === 'todos' ? 'Todos' : labelTipo(t)}
              </button>
            ))}
          </div>

          <select
            className={styles.filtroSelect}
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

          {paisesEnUso.length > 0 && (
            <select
              className={styles.filtroSelect}
              value={filtroPais}
              onChange={e => setFiltroPais(e.target.value)}
            >
              <option value="">Todos los países</option>
              {paisesEnUso.map(p => <option key={p.iso3} value={p.iso3}>{p.name_es}</option>)}
            </select>
          )}

          {vista === 'lista' && (
            <select
              className={styles.filtroSelect}
              value={ordenarPor}
              onChange={e => setOrdenarPor(e.target.value)}
            >
              <option value="fecha">Ordenar: Fecha</option>
              <option value="valor">Ordenar: Valor</option>
              <option value="estado">Ordenar: Estado</option>
            </select>
          )}
        </div>
      )}

      {/* ── Contenido principal ── */}
      {operaciones.length === 0 ? (
        <EstadoVacio onNueva={abrirModal} />
      ) : opsFiltradas.length === 0 ? (
        <div className={styles.sinResultados}>
          No hay operaciones que coincidan con los filtros aplicados.
        </div>
      ) : vista === 'lista' ? (
        <VistaLista
          operaciones={opsFiltradas}
          paises={paises}
          onClickFila={op => router.push(`/operaciones/${op.id}`)}
        />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={({ active }) => setActiveDragId(active.id)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDragId(null)}
        >
          <VistaKanban
            operaciones={opsFiltradas}
            filtroTipo={filtroTipo}
            paises={paises}
            onClickCard={op => router.push(`/operaciones/${op.id}`)}
          />
          <DragOverlay>
            {activeDragOp && (
              <KanbanCard
                op={activeDragOp}
                paises={paises}
                overlay
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── Modal nueva operación ── */}
      {modalAbierto && (
        <ModalNuevaOperacion
          form={form}
          setField={setField}
          errores={erroresForm}
          productos={productos}
          paises={paises}
          guardando={guardando}
          onGuardar={handleGuardar}
          onCerrar={cerrarModal}
          onProductoChange={autocompletarProducto}
        />
      )}
    </div>
  )
}

// ── Vista Lista ───────────────────────────────────────────────────────────────

function VistaLista({ operaciones, paises, onClickFila }) {
  return (
    <div className={styles.tabla}>
      <div className={styles.tablaHeader}>
        <span>Estado</span>
        <span>Tipo</span>
        <span>Producto / NCM</span>
        <span>Contraparte / País</span>
        <span>Valor</span>
        <span>Fecha est.</span>
        <span>Docs</span>
      </div>
      {operaciones.map(op => {
        const alerta = alertaPermiso(op)
        const docsAlerta = alertaDocs(op)
        const pais = paises.find(p => p.iso3 === op.counterpart_country)
        const pct = op.docs_total > 0 ? Math.round((op.docs_completos / op.docs_total) * 100) : 0

        return (
          <div
            key={op.id}
            className={styles.tablaFila}
            onClick={() => onClickFila(op)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onClickFila(op)}
          >
            {/* Estado */}
            <div className={styles.colEstado}>
              <span className={`${styles.estadoBadge} ${op.operation_type === 'exportacion' ? styles.estadoBadgeExpo : styles.estadoBadgeImpo}`}>
                {labelEstado(op.status)}
              </span>
              {alerta && <span className={styles.alertaRoja} title={alerta}>⚠</span>}
            </div>

            {/* Tipo */}
            <span className={`${styles.tipoBadge} ${op.operation_type === 'exportacion' ? styles.badgeExpo : styles.badgeImpo}`}>
              {op.operation_type === 'exportacion' ? 'Expo' : 'Impo'}
            </span>

            {/* Producto */}
            <div className={styles.colProducto}>
              <span className={styles.productoNombre}>
                {op.product_description ?? op.ncm_code ?? '—'}
              </span>
              {op.ncm_code && <span className={styles.ncmLabel}>{op.ncm_code}</span>}
            </div>

            {/* Contraparte */}
            <div className={styles.colContraparte}>
              {op.counterpart_name && (
                <span className={styles.contraparteNombre}>{op.counterpart_name}</span>
              )}
              <span className={styles.contrapartePais}>{pais?.name_es ?? op.counterpart_country ?? '—'}</span>
            </div>

            {/* Valor */}
            <span className={styles.colValor}>{formatValor(op)}</span>

            {/* Fecha estimada */}
            <span className={styles.colFecha}>{formatFecha(op.estimated_ship_date)}</span>

            {/* Docs */}
            <div className={styles.colDocs}>
              {op.docs_total > 0 ? (
                <>
                  <div className={styles.docsBarra}>
                    <div
                      className={styles.docsBarraFill}
                      style={{
                        width: `${pct}%`,
                        background: pct === 100 ? 'rgba(74,222,128,0.7)' : 'var(--accent)',
                      }}
                    />
                  </div>
                  <span className={`${styles.docsLabel} ${docsAlerta?.tipo === 'ok' ? styles.docsOk : styles.docsWarn}`}>
                    {op.docs_completos}/{op.docs_total}
                  </span>
                </>
              ) : (
                <span className={styles.docsMuted}>—</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Vista Kanban ──────────────────────────────────────────────────────────────

function VistaKanban({ operaciones, filtroTipo, paises, onClickCard }) {
  // Si hay filtro de tipo, mostrar solo esos estados
  const estadosVisibles = filtroTipo === 'importacion'
    ? ESTADOS_IMPO
    : filtroTipo === 'exportacion'
    ? ESTADOS_EXPO
    : [...ESTADOS_EXPO, ...ESTADOS_IMPO]

  // Solo mostrar columnas que tengan ops o sean del tipo filtrado
  const columnasConOps = estadosVisibles.filter(est =>
    operaciones.some(op => op.status === est.key) ||
    filtroTipo !== 'todos'
  )

  const columnas = filtroTipo !== 'todos' ? estadosVisibles : columnasConOps

  return (
    <div className={styles.kanban}>
      {columnas.map(estado => {
        const opsColumna = operaciones.filter(op => op.status === estado.key)
        return (
          <KanbanColumna
            key={estado.key}
            estado={estado}
            operaciones={opsColumna}
            paises={paises}
            onClickCard={onClickCard}
          />
        )
      })}
    </div>
  )
}

function KanbanColumna({ estado, operaciones, paises, onClickCard }) {
  const { setNodeRef, isOver } = useDroppable({ id: estado.key })

  return (
    <div
      ref={setNodeRef}
      className={`${styles.kanbanCol} ${isOver ? styles.kanbanColOver : ''}`}
    >
      <div className={styles.kanbanColHeader}>
        <span className={styles.kanbanColLabel}>{estado.label}</span>
        <span className={styles.kanbanColCount}>{operaciones.length}</span>
      </div>
      <div className={styles.kanbanColBody}>
        {operaciones.map(op => (
          <KanbanCard
            key={op.id}
            op={op}
            paises={paises}
            onClickCard={onClickCard}
          />
        ))}
      </div>
    </div>
  )
}

function KanbanCard({ op, paises, onClickCard, overlay }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: op.id })
  const pais = paises.find(p => p.iso3 === op.counterpart_country)
  const docsAlerta = alertaDocs(op)
  const alertaP = alertaPermiso(op)

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${styles.kanbanCard} ${isDragging ? styles.kanbanCardDragging : ''} ${overlay ? styles.kanbanCardOverlay : ''}`}
      onClick={e => {
        // No navegar si fue un drag
        if (!overlay && onClickCard) onClickCard(op)
      }}
    >
      {/* Tipo badge */}
      <span className={`${styles.tipoBadgeSmall} ${op.operation_type === 'exportacion' ? styles.badgeExpo : styles.badgeImpo}`}>
        {op.operation_type === 'exportacion' ? 'Expo' : 'Impo'}
      </span>

      {/* Nombre / NCM */}
      <p className={styles.cardNombre}>
        {op.product_description ?? op.ncm_code ?? 'Sin descripción'}
      </p>

      {/* País */}
      {pais && <p className={styles.cardPais}>{pais.name_es}</p>}

      {/* Valor */}
      <p className={styles.cardValor}>{formatValor(op)}</p>

      {/* Alertas */}
      <div className={styles.cardAlertas}>
        {alertaP && (
          <span className={styles.alertaRojaBadge}>🔴 {alertaP}</span>
        )}
        {docsAlerta && (
          <span className={docsAlerta.tipo === 'ok' ? styles.alertaVerdeBadge : styles.alertaAmarillaBadge}>
            {docsAlerta.tipo === 'ok' ? '🟢' : '🟡'} {docsAlerta.msg}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Modal nueva operación ─────────────────────────────────────────────────────

function ModalNuevaOperacion({
  form, setField, errores, productos, paises,
  guardando, onGuardar, onCerrar, onProductoChange,
}) {
  const [expandirOpcionales, setExpandirOpcionales] = useState(false)
  const [ncmSugerencias, setNcmSugerencias] = useState([])
  const [buscandoNcm, setBuscandoNcm] = useState(false)
  const [ncmDropVisible, setNcmDropVisible] = useState(false)
  const ncmRef = useRef(null)
  const ncmDebounce = useRef(null)

  // Cerrar dropdown NCM al click fuera
  useEffect(() => {
    function handler(e) {
      if (ncmRef.current && !ncmRef.current.contains(e.target)) {
        setNcmDropVisible(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleNcmInput(valor) {
    setField('ncm_code', valor)
    clearTimeout(ncmDebounce.current)
    if (valor.trim().length < 2) { setNcmSugerencias([]); setNcmDropVisible(false); return }
    ncmDebounce.current = setTimeout(async () => {
      setBuscandoNcm(true)
      const supabase = createClient()
      const esNum = /^\d/.test(valor.trim())
      let q = supabase.from('ncm').select('ncm_code, description').limit(5)
      q = esNum ? q.ilike('ncm_code', `${valor.trim()}%`) : q.ilike('description', `%${valor.trim()}%`)
      const { data } = await q
      setNcmSugerencias(data ?? [])
      setNcmDropVisible((data ?? []).length > 0)
      setBuscandoNcm(false)
    }, 300)
  }

  function seleccionarNcm(item) {
    setField('ncm_code', item.ncm_code)
    setField('product_description', item.description)
    setNcmSugerencias([])
    setNcmDropVisible(false)
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitulo}>Nueva operación</h2>
          <button className={styles.modalCerrar} onClick={onCerrar} aria-label="Cerrar">
            <IconCerrar />
          </button>
        </div>

        <form className={styles.modalForm} onSubmit={onGuardar} noValidate>

          {/* Tipo de operación */}
          <div className={styles.campo}>
            <label className={styles.label}>Tipo de operación <span className={styles.req}>*</span></label>
            <div className={styles.radioGroup}>
              {['exportacion', 'importacion'].map(t => (
                <label key={t} className={`${styles.radioLabel} ${form.operation_type === t ? styles.radioLabelActivo : ''}`}>
                  <input
                    type="radio"
                    name="operation_type"
                    value={t}
                    checked={form.operation_type === t}
                    onChange={() => setField('operation_type', t)}
                    className={styles.radioInput}
                  />
                  {labelTipo(t)}
                </label>
              ))}
            </div>
          </div>

          {/* Producto del catálogo (si tiene) */}
          {productos.length > 0 && (
            <div className={styles.campo}>
              <label className={styles.label}>
                Producto del catálogo <span className={styles.opcional}>autocompleta campos</span>
              </label>
              <select
                className={styles.select}
                value={form.product_id}
                onChange={e => onProductoChange(e.target.value)}
              >
                <option value="">Sin producto / ingresar manualmente</option>
                {productos
                  .filter(p => p.operation_type === form.operation_type)
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.ncm_code}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* NCM */}
          <div className={styles.campo}>
            <label className={styles.label}>Posición NCM <span className={styles.req}>*</span></label>
            <div className={styles.ncmWrap} ref={ncmRef}>
              <input
                className={`${styles.input} ${errores.ncm_code ? styles.inputError : ''}`}
                type="text"
                placeholder="Código (ej: 1905) o descripción..."
                value={form.ncm_code}
                onChange={e => handleNcmInput(e.target.value)}
                onFocus={() => ncmSugerencias.length > 0 && setNcmDropVisible(true)}
                autoComplete="off"
              />
              {buscandoNcm && <span className={styles.ncmCargando}>buscando…</span>}
              {ncmDropVisible && (
                <div className={styles.ncmDropdown}>
                  {ncmSugerencias.map(s => (
                    <button
                      key={s.ncm_code}
                      type="button"
                      className={styles.ncmOpcion}
                      onClick={() => seleccionarNcm(s)}
                    >
                      <span className={styles.ncmCodigo}>{s.ncm_code}</span>
                      <span className={styles.ncmDesc}>{s.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errores.ncm_code && <span className={styles.errorMsg}>{errores.ncm_code}</span>}
          </div>

          {/* Descripción del producto */}
          <div className={styles.campo}>
            <label className={styles.label}>Descripción del producto <span className={styles.opcional}>opcional</span></label>
            <input
              className={styles.input}
              type="text"
              placeholder="Ej: Galletas de chocolate con leche"
              value={form.product_description}
              onChange={e => setField('product_description', e.target.value)}
            />
          </div>

          {/* País + Incoterm */}
          <div className={styles.campoFila}>
            <div className={styles.campo} style={{ flex: 2 }}>
              <label className={styles.label}>
                {form.operation_type === 'exportacion' ? 'País de destino' : 'País de origen'}
                <span className={styles.req}> *</span>
              </label>
              <select
                className={`${styles.select} ${errores.counterpart_country ? styles.inputError : ''}`}
                value={form.counterpart_country}
                onChange={e => setField('counterpart_country', e.target.value)}
              >
                <option value="">Seleccioná país…</option>
                {paises.map(p => <option key={p.iso3} value={p.iso3}>{p.name_es}</option>)}
              </select>
              {errores.counterpart_country && <span className={styles.errorMsg}>{errores.counterpart_country}</span>}
            </div>
            <div className={styles.campo} style={{ flex: 1 }}>
              <label className={styles.label}>Incoterm <span className={styles.req}>*</span></label>
              <select
                className={`${styles.select} ${errores.incoterm ? styles.inputError : ''}`}
                value={form.incoterm}
                onChange={e => setField('incoterm', e.target.value)}
              >
                {INCOTERMS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              {errores.incoterm && <span className={styles.errorMsg}>{errores.incoterm}</span>}
            </div>
          </div>

          {/* Valor + Moneda */}
          <div className={styles.campoFila}>
            <div className={styles.campo} style={{ flex: 2 }}>
              <label className={styles.label}>Valor total <span className={styles.opcional}>opcional</span></label>
              <input
                className={styles.input}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.total_value}
                onChange={e => setField('total_value', e.target.value)}
              />
            </div>
            <div className={styles.campo} style={{ flex: 1 }}>
              <label className={styles.label}>Moneda</label>
              <select className={styles.select} value={form.currency} onChange={e => setField('currency', e.target.value)}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>

          {/* Contraparte */}
          <div className={styles.campo}>
            <label className={styles.label}>
              {form.operation_type === 'exportacion' ? 'Nombre del importador' : 'Nombre del exportador'}
              <span className={styles.opcional}> opcional</span>
            </label>
            <input
              className={styles.input}
              type="text"
              placeholder="Empresa o persona contraparte"
              value={form.counterpart_name}
              onChange={e => setField('counterpart_name', e.target.value)}
            />
          </div>

          {/* Campos opcionales (collapsable) */}
          <button
            type="button"
            className={styles.expandirBtn}
            onClick={() => setExpandirOpcionales(v => !v)}
          >
            {expandirOpcionales ? '▲' : '▼'} Campos adicionales (fecha, transporte, despachante...)
          </button>

          {expandirOpcionales && (
            <>
              <div className={styles.campoFila}>
                <div className={styles.campo} style={{ flex: 1 }}>
                  <label className={styles.label}>Fecha estimada embarque</label>
                  <input
                    className={styles.input}
                    type="date"
                    value={form.estimated_ship_date}
                    onChange={e => setField('estimated_ship_date', e.target.value)}
                  />
                </div>
                <div className={styles.campo} style={{ flex: 1 }}>
                  <label className={styles.label}>Modo de transporte</label>
                  <select
                    className={styles.select}
                    value={form.transport_mode}
                    onChange={e => setField('transport_mode', e.target.value)}
                  >
                    <option value="">Seleccioná…</option>
                    {MODOS_TRANSPORTE.map(m => (
                      <option key={m} value={m}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.campo}>
                <label className={styles.label}>Despachante de aduana</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Nombre del despachante"
                  value={form.customs_broker}
                  onChange={e => setField('customs_broker', e.target.value)}
                />
              </div>

              <div className={styles.campoFila}>
                <div className={styles.campo} style={{ flex: 1 }}>
                  <label className={styles.label}>Puerto / aeropuerto salida</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Ej: Buenos Aires"
                    value={form.port_exit}
                    onChange={e => setField('port_exit', e.target.value)}
                  />
                </div>
                <div className={styles.campo} style={{ flex: 1 }}>
                  <label className={styles.label}>Puerto / aeropuerto entrada</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Ej: Rotterdam"
                    value={form.port_entry}
                    onChange={e => setField('port_entry', e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.campo}>
                <label className={styles.label}>Notas</label>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  placeholder="Observaciones adicionales..."
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                />
              </div>
            </>
          )}

          {errores._general && (
            <p className={styles.errorGeneral}>{errores._general}</p>
          )}

          <div className={styles.modalAcciones}>
            <button type="button" className={styles.btnSecundario} onClick={onCerrar} disabled={guardando}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimario} disabled={guardando}>
              {guardando ? 'Creando…' : 'Crear operación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Estado vacío ──────────────────────────────────────────────────────────────

function EstadoVacio({ onNueva }) {
  return (
    <div className={styles.vacio}>
      <div className={styles.vacioIcono}>📋</div>
      <div className={styles.vacioTitulo}>No tenés operaciones registradas</div>
      <div className={styles.vacioDesc}>
        Registrá tu primera operación de exportación o importación para gestionar
        el checklist de documentos y el seguimiento de estados.
      </div>
      <button className={styles.btnPrimario} onClick={onNueva} style={{ marginTop: '1.5rem' }}>
        + Crear primera operación
      </button>
    </div>
  )
}

// ── Íconos ────────────────────────────────────────────────────────────────────

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
