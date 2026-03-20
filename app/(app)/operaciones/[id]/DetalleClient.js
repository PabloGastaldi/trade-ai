'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './detalle.module.css'

// ── Constantes ────────────────────────────────────────────────────────────────

const FLUJO_EXPO = [
  'expo_preparacion',
  'expo_documentacion',
  'expo_docs_completos',
  'expo_oficializado',
  'expo_verificacion',
  'expo_embarcado',
  'expo_cobro_pendiente',
  'expo_cerrada',
]

const FLUJO_IMPO = [
  'impo_orden_compra',
  'impo_en_transito',
  'impo_arribada',
  'impo_despacho_proceso',
  'impo_oficializado',
  'impo_verificacion',
  'impo_librada',
  'impo_pago_pendiente',
  'impo_cerrada',
]

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

/** Devuelve los estados a los que se puede avanzar desde el estado actual */
function estadosSiguientes(status, tipo) {
  const flujo = tipo === 'exportacion' ? FLUJO_EXPO : FLUJO_IMPO
  const idx = flujo.indexOf(status)
  if (idx === -1) return []
  // Puede ir al siguiente, o volver al anterior (corrección)
  const siguientes = []
  if (idx < flujo.length - 1) siguientes.push(flujo[idx + 1])
  if (idx > 0) siguientes.push(flujo[idx - 1])
  return siguientes
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFecha(fecha, conHora = false) {
  if (!fecha) return '—'
  const d = new Date(fecha)
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const año = d.getFullYear()
  if (!conHora) return `${dia}/${mes}/${año}`
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${año} ${h}:${m}`
}

function formatValor(op) {
  if (!op.total_value) return null
  return `${op.currency ?? 'USD'} ${Number(op.total_value).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function DetalleClient({ operacion: opInicial, documentosIniciales, timelineInicial, paises }) {
  const router = useRouter()
  const [op, setOp] = useState(opInicial)
  const [documentos, setDocumentos] = useState(documentosIniciales)
  const [timeline, setTimeline] = useState(timelineInicial)
  const [tabMobile, setTabMobile] = useState('datos') // 'datos' | 'docs' | 'timeline'
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('')
  const [editandoNotas, setEditandoNotas] = useState(false)
  const [notasTemp, setNotasTemp] = useState(op.notes ?? '')
  const [guardandoNotas, setGuardandoNotas] = useState(false)
  const [exportandoPDF, setExportandoPDF] = useState(false)

  const pais = paises.find(p => p.iso3 === op.counterpart_country)

  // ── Progreso documentos ──────────────────────────────────────────────────

  const docsTotal = documentos.length
  const docsCompletos = documentos.filter(d => d.is_completed).length
  const pctDocs = docsTotal > 0 ? Math.round((docsCompletos / docsTotal) * 100) : 0

  const docsCriticos = documentos.filter(d => d.document_category === 'critico')
  const docsImportantes = documentos.filter(d => d.document_category === 'importante')
  const docsOpcionales = documentos.filter(d => d.document_category === 'opcional')

  // ── Cambio de estado ─────────────────────────────────────────────────────

  async function handleCambiarEstado() {
    if (!estadoSeleccionado || estadoSeleccionado === op.status) return
    setCambiandoEstado(true)
    try {
      const res = await fetch(`/api/operaciones/${op.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: estadoSeleccionado }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      // Insertar en timeline local
      setTimeline(prev => [{
        id: crypto.randomUUID(),
        operation_id: op.id,
        from_status: op.status,
        to_status: estadoSeleccionado,
        changed_at: new Date().toISOString(),
        notes: null,
      }, ...prev])

      setOp(json.operacion)
      setEstadoSeleccionado('')
    } catch (err) {
      alert('Error al cambiar estado: ' + err.message)
    } finally {
      setCambiandoEstado(false)
    }
  }

  // ── Notas de la operación ────────────────────────────────────────────────

  async function handleGuardarNotas() {
    setGuardandoNotas(true)
    try {
      const res = await fetch(`/api/operaciones/${op.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notasTemp }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setOp(json.operacion)
      setEditandoNotas(false)
    } catch (err) {
      alert('Error al guardar notas: ' + err.message)
    } finally {
      setGuardandoNotas(false)
    }
  }

  // ── Toggle documento completado ──────────────────────────────────────────

  async function handleToggleDoc(doc) {
    const nuevoValor = !doc.is_completed
    // Optimista
    setDocumentos(prev =>
      prev.map(d => d.id === doc.id ? { ...d, is_completed: nuevoValor, completed_at: nuevoValor ? new Date().toISOString() : null } : d)
    )
    try {
      const res = await fetch(`/api/operaciones/${op.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: doc.id, is_completed: nuevoValor }),
      })
      if (!res.ok) throw new Error('Error al actualizar')
    } catch {
      // Revertir
      setDocumentos(prev =>
        prev.map(d => d.id === doc.id ? { ...d, is_completed: doc.is_completed, completed_at: doc.completed_at } : d)
      )
    }
  }

  // ── Notas de documento ───────────────────────────────────────────────────

  async function handleNotaDoc(doc, nuevaNota) {
    setDocumentos(prev => prev.map(d => d.id === doc.id ? { ...d, notes: nuevaNota } : d))
    await fetch(`/api/operaciones/${op.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: doc.id, doc_notes: nuevaNota }),
    })
  }

  // ── Exportar PDF ─────────────────────────────────────────────────────────

  function handleExportarPDF() {
    setExportandoPDF(true)
    // Usamos la API nativa de impresión del browser con estilos @media print
    setTimeout(() => {
      window.print()
      setExportandoPDF(false)
    }, 100)
  }

  // ── Ir a calculadora ─────────────────────────────────────────────────────

  function handleAbrirCalculadora() {
    const params = new URLSearchParams()
    if (op.ncm_code) params.set('ncm', op.ncm_code)
    if (op.counterpart_country) params.set('pais', op.counterpart_country)
    if (op.incoterm) params.set('incoterm', op.incoterm)
    if (op.total_value) params.set('valor', String(op.total_value))
    if (op.operation_type) params.set('tipo', op.operation_type)
    router.push(`/calculadora?${params.toString()}`)
  }

  // ── Abrir chat con contexto ──────────────────────────────────────────────

  function handleAbrirChat() {
    const tipoProd = op.operation_type === 'exportacion' ? 'exportación' : 'importación'
    const producto = op.product_description ?? op.ncm_code ?? 'producto'
    const paisNombre = pais?.name_es ?? op.counterpart_country ?? 'el país'
    const msg = encodeURIComponent(
      `Tengo una operación de ${tipoProd} de ${producto} (NCM ${op.ncm_code ?? 'desconocido'}) hacia ${paisNombre} ` +
      `con incoterm ${op.incoterm ?? 'desconocido'}. ` +
      `¿Qué documentación y requisitos especiales debo tener en cuenta?`
    )
    router.push(`/consulta?msg=${msg}`)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const siguientes = estadosSiguientes(op.status, op.operation_type)

  return (
    <div className={styles.page}>
      {/* ── Breadcrumb ── */}
      <div className={styles.breadcrumb}>
        <button className={styles.breadcrumbLink} onClick={() => router.push('/operaciones')}>
          ← Operaciones
        </button>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbActual}>
          {op.product_description ?? op.ncm_code ?? 'Detalle'}
        </span>
      </div>

      {/* ── Header de la operación ── */}
      <div className={styles.opHeader}>
        <div className={styles.opHeaderLeft}>
          <div className={styles.opTitulo}>
            <span className={`${styles.tipoBadge} ${op.operation_type === 'exportacion' ? styles.badgeExpo : styles.badgeImpo}`}>
              {op.operation_type === 'exportacion' ? 'Exportación' : 'Importación'}
            </span>
            <h1 className={styles.opNombre}>
              {op.product_description ?? op.ncm_code ?? 'Operación sin descripción'}
            </h1>
          </div>
          <div className={styles.opEstadoWrap}>
            <span className={`${styles.estadoBadge} ${op.operation_type === 'exportacion' ? styles.estadoExpo : styles.estadoImpo}`}>
              {LABEL_ESTADOS[op.status] ?? op.status}
            </span>
            {pais && (
              <span className={styles.opPais}>
                {pais.name_es}
              </span>
            )}
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className={styles.opAcciones}>
          <button className={styles.btnAccion} onClick={handleAbrirCalculadora} title="Abrir en calculadora">
            <IconCalculadora />
            <span>Calculadora</span>
          </button>
          <button className={styles.btnAccion} onClick={handleAbrirChat} title="Consultar al chat">
            <IconChat />
            <span>Consultar</span>
          </button>
          <button
            className={styles.btnAccion}
            onClick={handleExportarPDF}
            disabled={exportandoPDF}
            title="Exportar a PDF"
          >
            <IconPDF />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* ── Progreso global (siempre visible) ── */}
      {docsTotal > 0 && (
        <div className={styles.progresoGlobal}>
          <div className={styles.progresoTexto}>
            <span className={styles.progresoNum}>{docsCompletos}</span>
            <span className={styles.progresoSep}> de </span>
            <span className={styles.progresoNum}>{docsTotal}</span>
            <span className={styles.progresoDesc}> documentos completos</span>
            <span className={styles.progresoPct}>({pctDocs}%)</span>
          </div>
          <div className={styles.progresoBarraWrap}>
            <div
              className={styles.progresoBarraFill}
              style={{
                width: `${pctDocs}%`,
                background: pctDocs === 100
                  ? 'rgba(74,222,128,0.7)'
                  : pctDocs >= 60
                  ? 'var(--accent)'
                  : 'rgba(251,191,36,0.7)',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Tabs mobile ── */}
      <div className={styles.tabsMobile}>
        {[
          { key: 'datos', label: 'Datos' },
          { key: 'docs', label: `Documentos${docsTotal > 0 ? ` (${docsCompletos}/${docsTotal})` : ''}` },
          { key: 'timeline', label: 'Historial' },
        ].map(t => (
          <button
            key={t.key}
            className={`${styles.tabMobile} ${tabMobile === t.key ? styles.tabMobileActivo : ''}`}
            onClick={() => setTabMobile(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Layout dos columnas ── */}
      <div className={styles.layout}>

        {/* ════ COLUMNA IZQUIERDA — Datos ════ */}
        <div className={`${styles.colIzq} ${tabMobile !== 'datos' ? styles.hideMobile : ''}`}>

          {/* Cambiar estado */}
          {siguientes.length > 0 && (
            <div className={styles.card}>
              <h3 className={styles.cardTitulo}>Cambiar estado</h3>
              <div className={styles.cambiarEstadoWrap}>
                <select
                  className={styles.select}
                  value={estadoSeleccionado}
                  onChange={e => setEstadoSeleccionado(e.target.value)}
                >
                  <option value="">Seleccioná el nuevo estado…</option>
                  {siguientes.map(s => (
                    <option key={s} value={s}>{LABEL_ESTADOS[s]}</option>
                  ))}
                </select>
                <button
                  className={styles.btnPrimario}
                  onClick={handleCambiarEstado}
                  disabled={!estadoSeleccionado || cambiandoEstado}
                >
                  {cambiandoEstado ? 'Guardando…' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}

          {/* Datos del producto */}
          <div className={styles.card}>
            <h3 className={styles.cardTitulo}>Producto</h3>
            <dl className={styles.datosGrid}>
              {op.ncm_code && (
                <>
                  <dt>NCM</dt>
                  <dd className={styles.ncmValor}>{op.ncm_code}</dd>
                </>
              )}
              {op.product_description && (
                <>
                  <dt>Descripción</dt>
                  <dd>{op.product_description}</dd>
                </>
              )}
              {op.incoterm && (
                <>
                  <dt>Incoterm</dt>
                  <dd><span className={styles.incoterm}>{op.incoterm}</span></dd>
                </>
              )}
              {op.total_value && (
                <>
                  <dt>Valor total</dt>
                  <dd className={styles.valorDestacado}>{formatValor(op)}</dd>
                </>
              )}
            </dl>
          </div>

          {/* Contraparte */}
          <div className={styles.card}>
            <h3 className={styles.cardTitulo}>Contraparte</h3>
            <dl className={styles.datosGrid}>
              {op.counterpart_name && (
                <>
                  <dt>{op.operation_type === 'exportacion' ? 'Importador' : 'Exportador'}</dt>
                  <dd>{op.counterpart_name}</dd>
                </>
              )}
              <dt>País</dt>
              <dd>{pais?.name_es ?? op.counterpart_country ?? '—'}</dd>
            </dl>
          </div>

          {/* Logística */}
          <div className={styles.card}>
            <h3 className={styles.cardTitulo}>Logística y fechas</h3>
            <dl className={styles.datosGrid}>
              {op.transport_mode && (
                <>
                  <dt>Transporte</dt>
                  <dd style={{ textTransform: 'capitalize' }}>{op.transport_mode}</dd>
                </>
              )}
              {op.port_exit && (
                <>
                  <dt>Puerto salida</dt>
                  <dd>{op.port_exit}</dd>
                </>
              )}
              {op.port_entry && (
                <>
                  <dt>Puerto entrada</dt>
                  <dd>{op.port_entry}</dd>
                </>
              )}
              {op.estimated_ship_date && (
                <>
                  <dt>Fecha est. embarque</dt>
                  <dd>{formatFecha(op.estimated_ship_date)}</dd>
                </>
              )}
              {op.actual_ship_date && (
                <>
                  <dt>Fecha real embarque</dt>
                  <dd>{formatFecha(op.actual_ship_date)}</dd>
                </>
              )}
              {!op.transport_mode && !op.port_exit && !op.port_entry && !op.estimated_ship_date && (
                <dd className={styles.sinDatos} style={{ gridColumn: '1/-1' }}>Sin datos logísticos cargados</dd>
              )}
            </dl>
          </div>

          {/* Despachante + SIM */}
          {(op.customs_broker || op.sim_number) && (
            <div className={styles.card}>
              <h3 className={styles.cardTitulo}>Despacho</h3>
              <dl className={styles.datosGrid}>
                {op.customs_broker && (
                  <>
                    <dt>Despachante</dt>
                    <dd>{op.customs_broker}</dd>
                  </>
                )}
                {op.sim_number && (
                  <>
                    <dt>Número SIM</dt>
                    <dd className={styles.ncmValor}>{op.sim_number}</dd>
                  </>
                )}
              </dl>
            </div>
          )}

          {/* Notas */}
          <div className={styles.card}>
            <div className={styles.cardTituloRow}>
              <h3 className={styles.cardTitulo}>Notas</h3>
              {!editandoNotas && (
                <button className={styles.btnEditar} onClick={() => { setNotasTemp(op.notes ?? ''); setEditandoNotas(true) }}>
                  Editar
                </button>
              )}
            </div>
            {editandoNotas ? (
              <>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  value={notasTemp}
                  onChange={e => setNotasTemp(e.target.value)}
                  placeholder="Observaciones, recordatorios, contactos..."
                  autoFocus
                />
                <div className={styles.notasAcciones}>
                  <button className={styles.btnSecundario} onClick={() => setEditandoNotas(false)} disabled={guardandoNotas}>
                    Cancelar
                  </button>
                  <button className={styles.btnPrimario} onClick={handleGuardarNotas} disabled={guardandoNotas}>
                    {guardandoNotas ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </>
            ) : (
              <p className={op.notes ? styles.notasTexto : styles.sinDatos}>
                {op.notes ?? 'Sin notas. Hacé clic en Editar para agregar.'}
              </p>
            )}
          </div>

          {/* Creación */}
          <p className={styles.metaDatos}>
            Operación creada el {formatFecha(op.created_at, true)}
          </p>
        </div>

        {/* ════ COLUMNA DERECHA — Checklist ════ */}
        <div className={`${styles.colDer} ${tabMobile !== 'docs' ? styles.hideMobile : ''}`}>
          <div className={styles.card}>
            <h3 className={styles.cardTitulo}>Checklist de documentos</h3>

            {documentos.length === 0 ? (
              <p className={styles.sinDatos}>
                No hay documentos generados. Asegurate de haber cargado el NCM y el país al crear la operación.
              </p>
            ) : (
              <>
                {[
                  { cat: 'critico',    docs: docsCriticos,    label: 'Críticos',    color: styles.catCritico },
                  { cat: 'importante', docs: docsImportantes, label: 'Importantes', color: styles.catImportante },
                  { cat: 'opcional',   docs: docsOpcionales,  label: 'Opcionales',  color: styles.catOpcional },
                ].map(({ cat, docs, label, color }) =>
                  docs.length > 0 ? (
                    <div key={cat} className={styles.docsGrupo}>
                      <div className={`${styles.docsGrupoHeader} ${color}`}>
                        <span>{cat === 'critico' ? '🔴' : cat === 'importante' ? '🟡' : '🟢'} {label}</span>
                        <span className={styles.docsGrupoCount}>
                          {docs.filter(d => d.is_completed).length}/{docs.length}
                        </span>
                      </div>
                      {docs.map(doc => (
                        <DocItem
                          key={doc.id}
                          doc={doc}
                          onToggle={handleToggleDoc}
                          onNotaChange={handleNotaDoc}
                        />
                      ))}
                    </div>
                  ) : null
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ════ TIMELINE ════ */}
      <div className={`${styles.timelineSection} ${tabMobile !== 'timeline' ? styles.hideMobile : ''}`}>
        <h3 className={styles.cardTitulo} style={{ marginBottom: '1rem' }}>Historial de estados</h3>
        {timeline.length === 0 ? (
          <p className={styles.sinDatos}>Sin cambios de estado registrados.</p>
        ) : (
          <div className={styles.timeline}>
            {/* Estado inicial (creación) */}
            <div className={styles.timelineItem}>
              <div className={styles.timelineDot} />
              <div className={styles.timelineContenido}>
                <span className={styles.timelineFecha}>{formatFecha(op.created_at, true)}</span>
                <span className={styles.timelineEvento}>Operación creada en estado <strong>{LABEL_ESTADOS[timeline[timeline.length - 1]?.from_status] ?? '—'}</strong></span>
              </div>
            </div>
            {[...timeline].reverse().map((ev) => (
              <div key={ev.id} className={styles.timelineItem}>
                <div className={styles.timelineDot} />
                <div className={styles.timelineContenido}>
                  <span className={styles.timelineFecha}>{formatFecha(ev.changed_at, true)}</span>
                  <span className={styles.timelineEvento}>
                    Pasó de <strong>{LABEL_ESTADOS[ev.from_status] ?? ev.from_status}</strong> a <strong>{LABEL_ESTADOS[ev.to_status] ?? ev.to_status}</strong>
                  </span>
                  {ev.notes && <span className={styles.timelineNota}>{ev.notes}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Área de impresión PDF */}
      <PrintView op={op} documentos={documentos} pais={pais} timeline={timeline} />
    </div>
  )
}

// ── DocItem ───────────────────────────────────────────────────────────────────

function DocItem({ doc, onToggle, onNotaChange }) {
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

      {/* Nota del documento */}
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

// ── Vista de impresión (oculta en pantalla, visible al imprimir) ───────────────

function PrintView({ op, documentos, pais, timeline }) {
  const docsCompletos = documentos.filter(d => d.is_completed).length

  return (
    <div className={styles.printOnly}>
      <h1>trade.ai — Detalle de operación</h1>
      <p><strong>Tipo:</strong> {op.operation_type === 'exportacion' ? 'Exportación' : 'Importación'}</p>
      <p><strong>Producto:</strong> {op.product_description ?? '—'} | NCM: {op.ncm_code ?? '—'}</p>
      <p><strong>País:</strong> {pais?.name_es ?? op.counterpart_country ?? '—'}</p>
      <p><strong>Incoterm:</strong> {op.incoterm ?? '—'} | <strong>Valor:</strong> {op.total_value ? `${op.currency} ${op.total_value}` : '—'}</p>
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

// ── Íconos ────────────────────────────────────────────────────────────────────

function IconCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function IconNota() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function IconCalculadora() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/>
      <line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/>
      <line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/>
      <line x1="14" y1="18" x2="16" y2="18"/>
    </svg>
  )
}

function IconChat() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function IconPDF() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}
