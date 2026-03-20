'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './catalogo.module.css'

const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']

const FORM_VACIO = {
  name: '',
  operation_type: 'exportacion',
  ncm_code: '',
  ncm_descripcion_oficial: '',
  unit_price: '',
  currency: 'USD',
  incoterm: '',
  weight_kg: '',
  default_origin: '',
  default_destination: '',
  description: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function badgeTipo(tipo) {
  return tipo === 'exportacion' ? styles.badgeExpo : styles.badgeImpo
}

function labelTipo(tipo) {
  return tipo === 'exportacion' ? 'Exportación' : 'Importación'
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CatalogoClient({ productosIniciales, paises }) {
  const [productos, setProductos] = useState(productosIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos') // 'todos' | 'exportacion' | 'importacion'
  const [modalAbierto, setModalAbierto] = useState(false)
  const [productoEditando, setProductoEditando] = useState(null) // null = nuevo
  const [guardando, setGuardando] = useState(false)
  const [erroresForm, setErroresForm] = useState({})
  const [form, setForm] = useState(FORM_VACIO)

  // Filtrado local
  const productosFiltrados = productos.filter(p => {
    const matchBusqueda = !busqueda.trim()
      || p.name.toLowerCase().includes(busqueda.toLowerCase())
      || p.ncm_code.includes(busqueda)
    const matchTipo = filtroTipo === 'todos' || p.operation_type === filtroTipo
    return matchBusqueda && matchTipo
  })

  function abrirNuevo() {
    setProductoEditando(null)
    setForm(FORM_VACIO)
    setErroresForm({})
    setModalAbierto(true)
  }

  function abrirEditar(p) {
    setProductoEditando(p)
    setForm({
      name: p.name,
      operation_type: p.operation_type,
      ncm_code: p.ncm_code,
      ncm_descripcion_oficial: p.product_description_ncm ?? '',
      unit_price: String(p.unit_price),
      currency: p.currency,
      incoterm: p.incoterm,
      weight_kg: p.weight_kg ? String(p.weight_kg) : '',
      default_origin: p.default_origin ?? '',
      default_destination: p.default_destination ?? '',
      description: p.description ?? '',
    })
    setErroresForm({})
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setProductoEditando(null)
    setErroresForm({})
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar este producto del catálogo?')) return
    const supabase = createClient()
    const { error } = await supabase
      .from('user_products')
      .update({ is_active: false })
      .eq('id', id)
    if (!error) {
      setProductos(prev => prev.filter(p => p.id !== id))
    }
  }

  async function handleGuardar(datosValidos) {
    setGuardando(true)

    try {
      if (productoEditando) {
        // Edición: directo desde cliente — RLS garantiza que solo edita el propio registro
        const supabase = createClient()
        const { data, error } = await supabase
          .from('user_products')
          .update(datosValidos)
          .eq('id', productoEditando.id)
          .select()
          .single()
        if (error) throw error
        setProductos(prev => prev.map(p => p.id === productoEditando.id ? data : p))
      } else {
        // Inserción: pasa por el API route para validar límite del plan
        const res = await fetch('/api/catalogo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datosValidos),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Error al guardar')
        setProductos(prev => [json.producto, ...prev])
      }
      cerrarModal()
    } catch (err) {
      setErroresForm({ _general: err.message })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}>Catálogo de productos</h1>
          <p className={styles.subtitulo}>
            {productos.length > 0
              ? `${productos.length} producto${productos.length !== 1 ? 's' : ''} guardados`
              : 'Aún no tenés productos cargados'}
          </p>
        </div>
        <button className={styles.btnPrimario} onClick={abrirNuevo}>
          + Agregar producto
        </button>
      </div>

      {/* Controles de filtro */}
      {productos.length > 0 && (
        <div className={styles.controles}>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Buscar por nombre o NCM..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className={styles.searchClear} onClick={() => setBusqueda('')} aria-label="Limpiar">✕</button>
            )}
          </div>

          <div className={styles.filtroTabs}>
            {['todos', 'exportacion', 'importacion'].map(t => (
              <button
                key={t}
                className={`${styles.filtroTab} ${filtroTipo === t ? styles.filtroTabActivo : ''}`}
                onClick={() => setFiltroTipo(t)}
              >
                {t === 'todos' ? 'Todos' : t === 'exportacion' ? 'Exportación' : 'Importación'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de productos */}
      {productosFiltrados.length === 0 ? (
        <EstadoVacio busqueda={busqueda} hayProductos={productos.length > 0} onAgregar={abrirNuevo} />
      ) : (
        <div className={styles.tabla}>
          <div className={styles.tablaHeader}>
            <span>Producto</span>
            <span>NCM</span>
            <span>Precio</span>
            <span>Incoterm</span>
            <span>Tipo</span>
            <span></span>
          </div>
          {productosFiltrados.map(p => (
            <div key={p.id} className={styles.tablaFila}>
              <div className={styles.colNombre}>
                <span className={styles.nombreProducto}>{p.name}</span>
                {p.description && (
                  <span className={styles.descProducto}>{p.description}</span>
                )}
              </div>
              <span className={styles.colNcm}>{p.ncm_code}</span>
              <span className={styles.colPrecio}>
                {p.currency} {Number(p.unit_price).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
              <span className={styles.colIncoterm}>{p.incoterm}</span>
              <span className={`${styles.badge} ${badgeTipo(p.operation_type)}`}>
                {labelTipo(p.operation_type)}
              </span>
              <div className={styles.colAcciones}>
                <button className={styles.btnEditar} onClick={() => abrirEditar(p)} title="Editar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button className={styles.btnEliminar} onClick={() => handleEliminar(p.id)} title="Eliminar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalAbierto && (
        <ModalProducto
          form={form}
          setForm={setForm}
          errores={erroresForm}
          setErrores={setErroresForm}
          paises={paises}
          editando={productoEditando}
          guardando={guardando}
          onGuardar={handleGuardar}
          onCerrar={cerrarModal}
        />
      )}
    </div>
  )
}

// ── Modal con formulario ──────────────────────────────────────────────────────

function ModalProducto({ form, setForm, errores, setErrores, paises, editando, guardando, onGuardar, onCerrar }) {
  const [ncmSugerencias, setNcmSugerencias] = useState([])
  const [buscandoNcm, setBuscandoNcm] = useState(false)
  const [ncmDropdownVisible, setNcmDropdownVisible] = useState(false)
  const ncmDebounceRef = useRef(null)
  const ncmRef = useRef(null)

  // Cerrar dropdown NCM al hacer click fuera
  useEffect(() => {
    function handleClick(e) {
      if (ncmRef.current && !ncmRef.current.contains(e.target)) {
        setNcmDropdownVisible(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
    if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: null }))
  }

  // Búsqueda NCM con debounce
  function handleNcmInput(valor) {
    set('ncm_code', valor)
    set('ncm_descripcion_oficial', '')
    clearTimeout(ncmDebounceRef.current)

    if (valor.trim().length < 2) {
      setNcmSugerencias([])
      setNcmDropdownVisible(false)
      return
    }

    ncmDebounceRef.current = setTimeout(async () => {
      setBuscandoNcm(true)
      const supabase = createClient()
      const esNumerico = /^\d/.test(valor.trim())

      let query = supabase.from('ncm').select('ncm_code, description').limit(5)
      if (esNumerico) {
        query = query.ilike('ncm_code', `${valor.trim()}%`)
      } else {
        query = query.ilike('description', `%${valor.trim()}%`)
      }

      const { data } = await query
      setNcmSugerencias(data ?? [])
      setNcmDropdownVisible((data ?? []).length > 0)
      setBuscandoNcm(false)
    }, 300)
  }

  function seleccionarNcm(item) {
    setForm(prev => ({
      ...prev,
      ncm_code: item.ncm_code,
      ncm_descripcion_oficial: item.description,
    }))
    setErrores(prev => ({ ...prev, ncm_code: null }))
    setNcmSugerencias([])
    setNcmDropdownVisible(false)
  }

  function validar() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'El nombre es obligatorio'
    if (!form.ncm_code.trim()) errs.ncm_code = 'El NCM es obligatorio'
    if (!form.ncm_descripcion_oficial) errs.ncm_code = 'Seleccioná un NCM de la lista'
    if (!form.unit_price || Number(form.unit_price) <= 0) errs.unit_price = 'El precio debe ser mayor a 0'
    if (!form.incoterm) errs.incoterm = 'El incoterm es obligatorio'
    if (!form.operation_type) errs.operation_type = 'El tipo es obligatorio'
    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validar()
    if (Object.keys(errs).length > 0) {
      setErrores(errs)
      return
    }

    const datos = {
      name: form.name.trim(),
      operation_type: form.operation_type,
      ncm_code: form.ncm_code,
      unit_price: Number(form.unit_price),
      currency: form.currency,
      incoterm: form.incoterm,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      default_origin: form.default_origin || null,
      default_destination: form.default_destination || null,
      description: form.description.trim() || null,
    }

    onGuardar(datos)
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitulo}>
            {editando ? 'Editar producto' : 'Agregar producto'}
          </h2>
          <button className={styles.modalCerrar} onClick={onCerrar} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form className={styles.modalForm} onSubmit={handleSubmit} noValidate>
          {/* Nombre */}
          <div className={styles.campo}>
            <label className={styles.label}>Nombre del producto <span className={styles.req}>*</span></label>
            <input
              className={`${styles.input} ${errores.name ? styles.inputError : ''}`}
              type="text"
              placeholder="Ej: Galletas de chocolate"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
            {errores.name && <span className={styles.errorMsg}>{errores.name}</span>}
          </div>

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
                    onChange={() => set('operation_type', t)}
                    className={styles.radioInput}
                  />
                  {t === 'exportacion' ? 'Exportación' : 'Importación'}
                </label>
              ))}
            </div>
            {errores.operation_type && <span className={styles.errorMsg}>{errores.operation_type}</span>}
          </div>

          {/* NCM con búsqueda */}
          <div className={styles.campo}>
            <label className={styles.label}>Posición NCM <span className={styles.req}>*</span></label>
            <div className={styles.ncmWrap} ref={ncmRef}>
              <input
                className={`${styles.input} ${errores.ncm_code ? styles.inputError : ''}`}
                type="text"
                placeholder="Escribí código (ej: 1905) o descripción..."
                value={form.ncm_code}
                onChange={e => handleNcmInput(e.target.value)}
                onFocus={() => ncmSugerencias.length > 0 && setNcmDropdownVisible(true)}
                autoComplete="off"
              />
              {buscandoNcm && <span className={styles.ncmCargando}>buscando…</span>}
              {ncmDropdownVisible && (
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
            {form.ncm_descripcion_oficial && !ncmDropdownVisible && (
              <p className={styles.ncmSeleccionado}>{form.ncm_descripcion_oficial}</p>
            )}
            {errores.ncm_code && <span className={styles.errorMsg}>{errores.ncm_code}</span>}
          </div>

          {/* Precio + moneda */}
          <div className={styles.campoFila}>
            <div className={styles.campo} style={{ flex: 2 }}>
              <label className={styles.label}>Precio unitario <span className={styles.req}>*</span></label>
              <input
                className={`${styles.input} ${errores.unit_price ? styles.inputError : ''}`}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.unit_price}
                onChange={e => set('unit_price', e.target.value)}
              />
              {errores.unit_price && <span className={styles.errorMsg}>{errores.unit_price}</span>}
            </div>
            <div className={styles.campo} style={{ flex: 1 }}>
              <label className={styles.label}>Moneda</label>
              <select className={styles.select} value={form.currency} onChange={e => set('currency', e.target.value)}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>

          {/* Incoterm */}
          <div className={styles.campo}>
            <label className={styles.label}>Incoterm <span className={styles.req}>*</span></label>
            <select
              className={`${styles.select} ${errores.incoterm ? styles.inputError : ''}`}
              value={form.incoterm}
              onChange={e => set('incoterm', e.target.value)}
            >
              <option value="">Seleccioná incoterm…</option>
              {INCOTERMS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            {errores.incoterm && <span className={styles.errorMsg}>{errores.incoterm}</span>}
          </div>

          {/* Peso */}
          <div className={styles.campo}>
            <label className={styles.label}>Peso por unidad (kg) <span className={styles.opcional}>opcional</span></label>
            <input
              className={styles.input}
              type="number"
              min="0"
              step="0.001"
              placeholder="Ej: 0.5"
              value={form.weight_kg}
              onChange={e => set('weight_kg', e.target.value)}
            />
          </div>

          {/* País según tipo */}
          {form.operation_type === 'importacion' ? (
            <div className={styles.campo}>
              <label className={styles.label}>País de origen <span className={styles.opcional}>opcional</span></label>
              <select className={styles.select} value={form.default_origin} onChange={e => set('default_origin', e.target.value)}>
                <option value="">Seleccioná país…</option>
                {paises.map(p => <option key={p.iso3} value={p.iso3}>{p.name_es}</option>)}
              </select>
            </div>
          ) : (
            <div className={styles.campo}>
              <label className={styles.label}>País de destino <span className={styles.opcional}>opcional</span></label>
              <select className={styles.select} value={form.default_destination} onChange={e => set('default_destination', e.target.value)}>
                <option value="">Seleccioná país…</option>
                {paises.map(p => <option key={p.iso3} value={p.iso3}>{p.name_es}</option>)}
              </select>
            </div>
          )}

          {/* Descripción libre */}
          <div className={styles.campo}>
            <label className={styles.label}>Notas adicionales <span className={styles.opcional}>opcional</span></label>
            <textarea
              className={styles.textarea}
              placeholder="Descripción libre, variedad, especificaciones..."
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {errores._general && (
            <p className={styles.errorGeneral}>{errores._general}</p>
          )}

          {/* Acciones */}
          <div className={styles.modalAcciones}>
            <button type="button" className={styles.btnSecundario} onClick={onCerrar} disabled={guardando}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimario} disabled={guardando}>
              {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Agregar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Estado vacío ──────────────────────────────────────────────────────────────

function EstadoVacio({ busqueda, hayProductos, onAgregar }) {
  return (
    <div className={styles.vacio}>
      <div className={styles.vacioIcono}>{busqueda ? '🔍' : '📦'}</div>
      <div className={styles.vacioTitulo}>
        {busqueda ? 'Sin resultados' : 'Tu catálogo está vacío'}
      </div>
      <div className={styles.vacioDesc}>
        {busqueda
          ? `No encontramos productos con "${busqueda}"`
          : 'Agregá tus productos para calcular costos y comparar destinos rápidamente'}
      </div>
      {!busqueda && !hayProductos && (
        <button className={styles.btnPrimario} onClick={onAgregar} style={{ marginTop: '1.5rem' }}>
          + Agregar primer producto
        </button>
      )}
    </div>
  )
}
