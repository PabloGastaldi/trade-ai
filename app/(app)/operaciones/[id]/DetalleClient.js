'use client'

// Medio de pago - operaciones
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getMedioPago } from '@/lib/data/medios-pago'
import styles from './detalle.module.css'
import DocItem from './DocItem'
import PanelMedioPagoDetalle from './PanelMedioPagoDetalle'
import PrintView from './PrintView'

// ── Iconos ────────────────────────────────────────────────────────────────────

function IconCalculadora() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm2.498-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm2.504-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Z" />
    </svg>
  )
}

function IconChat() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  )
}

function IconPDF() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

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
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  const año = d.getUTCFullYear()
  if (!conHora) return `${dia}/${mes}/${año}`
  const h = String(d.getUTCHours()).padStart(2, '0')
  const m = String(d.getUTCMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${año} ${h}:${m}`
}

function formatValor(op) {
  if (!op.total_value) return null
  const n = Number(op.total_value).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${op.currency ?? 'USD'} ${n}`
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
  const [restricciones, setRestricciones] = useState([])
  const [productosPermitidos, setProductosPermitidos] = useState([])
  const [productosProhibidos, setProductosProhibidos] = useState([])
  const [organismos, setOrganismos] = useState([])

  const regimen = op.regimen || 'general'

  useEffect(() => {
    const supabase = createClient()
    const regimenQuery = regimen.startsWith('courier_') ? [regimen, 'courier'] : [regimen]
    const esCourier = regimen.startsWith('courier_') || regimen === 'courier'
    const ncm = op.ncm_code

    const fetches = [
      // Restricciones
      regimen !== 'general'
        ? supabase.from('restricciones_regimenes').select('*').in('regimen', regimenQuery)
        : Promise.resolve({ data: [] }),
      // Organismos intervinientes
      ncm
        ? supabase
            .from('regimen_intervenciones')
            .select('*')
            .eq('operacion', op.operation_type)
            .in('regimen', regimenQuery)
        : Promise.resolve({ data: [] }),
    ]

    if (esCourier) {
      fetches.push(
        supabase.from('productos_regimen').select('*').in('regimen', regimenQuery).eq('tipo', 'permitido'),
        supabase.from('productos_regimen').select('*').in('regimen', regimenQuery).eq('tipo', 'prohibido'),
      )
    }

    Promise.all(fetches).then(([resR, resI, resP, resPr]) => {
      // Filtrar organismos por NCM si corresponde
      const orgs = (resI?.data ?? []).filter(org => {
        if (!org.ncm_patron || org.ncm_patron === 'nan' || org.ncm_patron === 'todos' || org.ncm_patron === 'null') return true
        if (!ncm) return true
        const capitulo = ncm.replace(/\D/g, '').slice(0, 2)
        const patrones = org.ncm_patron.split(',').map(p => p.trim().replace('%', '').replace('.', ''))
        return patrones.some(p => capitulo.startsWith(p.slice(0, 2)))
      })
      setRestricciones(resR?.data ?? [])
      setOrganismos(orgs)
      setProductosPermitidos(resP?.data ?? [])
      setProductosProhibidos(resPr?.data ?? [])
    }).catch(() => {
      // Error silencioso
    })
  }, [op.id])

  const pais = paises.find(p => p.iso3 === op.counterpart_country)

  // ── Progreso documentos ──────────────────────────────────────────────────

  const docsTotal = documentos.length
  const docsCompletos = documentos.filter(d => d.is_completed).length
  const pctDocs = docsTotal > 0 ? Math.round((docsCompletos / docsTotal) * 100) : 0

  const docsCriticos = documentos.filter(d => d.document_category === 'critico')
  const docsImportantes = documentos.filter(d => d.document_category === 'importante')
  const docsOpcionales = documentos.filter(d => d.document_category === 'opcional' || d.document_category === 'condicional')

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
              {op.payment_method && (
                <>
                  <dt>Medio de pago</dt>
                  <dd>{getMedioPago(op.payment_method)?.nombre_corto ?? op.payment_method}</dd>
                </>
              )}
            </dl>
            {op.payment_method && <PanelMedioPagoDetalle medioId={op.payment_method} />}
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

          {/* Régimen */}
          {regimen !== 'general' && (
            <div className={styles.card}>
              <h3 className={styles.cardTitulo}>Régimen aduanero</h3>
              <p className="font-body text-sm text-on-surface capitalize">{regimen.replace(/_/g, ' ')}</p>
            </div>
          )}

          {/* Restricciones del régimen */}
          {restricciones.length > 0 && (
            <div className={styles.card}>
              <h3 className={styles.cardTitulo}>Restricciones del régimen</h3>
              <ul className="space-y-2">
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

          {/* Productos permitidos/prohibidos (solo courier) */}
          {productosPermitidos.length > 0 && (
            <div className={styles.card}>
              <h3 className={styles.cardTitulo} style={{ color: 'rgb(52 211 153)' }}>Productos permitidos</h3>
              <p className="font-body text-xs text-on-surface-variant">
                {productosPermitidos.map(p => p.producto).join(', ')}
              </p>
            </div>
          )}

          {productosProhibidos.length > 0 && (
            <div className={styles.card}>
              <h3 className={styles.cardTitulo} style={{ color: 'rgb(248 113 113)' }}>Productos NO permitidos</h3>
              <ul className="space-y-1.5">
                {productosProhibidos.map((p, i) => (
                  <li key={i} className="font-body text-xs text-on-surface-variant">
                    <span className="text-red-400/70">•</span>{' '}
                    <span className="font-medium text-on-surface">{p.producto}</span>
                    {p.motivo && p.motivo !== 'nan' && <span> — {p.motivo}</span>}
                    {p.organismo && p.organismo !== 'nan' && <span className="text-on-surface-variant/60"> ({p.organismo})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Creación */}
          <p className={styles.metaDatos}>
            Operación creada el {formatFecha(op.created_at, true)}
          </p>
        </div>

        {/* ════ COLUMNA DERECHA — Checklist ════ */}
        <div className={`${styles.colDer} ${tabMobile !== 'docs' ? styles.hideMobile : ''}`}>
          <div className={styles.card}>
            <div className={styles.cardTituloRow}>
              <h3 className={styles.cardTitulo}>Checklist de documentos</h3>
              {docsTotal > 0 && (
                <span className="font-mono text-xs text-on-surface-variant">
                  {docsCompletos}/{docsTotal}
                </span>
              )}
            </div>

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
                        <span>{label}</span>
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

          {/* Organismos que intervienen */}
          <div className={styles.card}>
            <h3 className={styles.cardTitulo}>Organismos que intervienen</h3>
            {organismos.length === 0 ? (
              <p className={styles.sinDatos}>
                No se identificaron organismos con intervención obligatoria para este producto y régimen.
              </p>
            ) : (
              <div className="space-y-3">
                {organismos.map((org, i) => {
                  const esObligatorio = org.estado === 'obligatorio'
                  const esCondicional = org.estado === 'condicional'
                  const esExento = org.estado === 'exento'
                  const borderColor = esObligatorio
                    ? 'border-red-400/50'
                    : esCondicional
                    ? 'border-amber-400/50'
                    : 'border-emerald-400/50'
                  const textEstado = esObligatorio
                    ? 'text-red-400'
                    : esCondicional
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                  return (
                    <div key={i} className={`pl-3 border-l-2 ${borderColor}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-body text-sm font-medium text-on-surface">{org.organismo}</span>
                        <span className={`font-mono text-[10px] uppercase tracking-wider ${textEstado}`}>
                          {org.estado}
                        </span>
                      </div>
                      {esExento && (
                        <p className="font-body text-xs text-emerald-400 mt-0.5">
                          No requiere intervención en este régimen
                        </p>
                      )}
                      {org.notas && org.notas !== 'nan' && org.notas !== 'null' && (
                        <p className="font-body text-xs text-on-surface-variant mt-0.5">{org.notas}</p>
                      )}
                    </div>
                  )
                })}
              </div>
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


