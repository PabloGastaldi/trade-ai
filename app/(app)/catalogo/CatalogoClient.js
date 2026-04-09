'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import PageLayout from '@/components/ui/PageLayout'

function formatearNCM(codigo) {
  if (!codigo || codigo.length !== 11) return codigo ?? ''
  return `${codigo.slice(0,4)}.${codigo.slice(4,6)}.${codigo.slice(6,8)}.${codigo.slice(8)}`
}

const FORM_VACIO = {
  name: '',
  operation_type: 'exportacion',
  ncm_code: '',
  ncm_descripcion_oficial: '',
  unit_price: '',
  currency: 'USD',
  weight_kg: '',
  description: '',
}

export default function CatalogoClient({ productosIniciales, paises }) {
  const [productos, setProductos] = useState(productosIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modalEliminar, setModalEliminar] = useState(null)
  const [productoEditando, setProductoEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [erroresForm, setErroresForm] = useState({})
  const [form, setForm] = useState(FORM_VACIO)

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
      weight_kg: p.weight_kg ? String(p.weight_kg) : '',
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
    const supabase = createClient()
    const { error } = await supabase
      .from('user_products')
      .update({ is_active: false })
      .eq('id', id)
    if (!error) {
      setProductos(prev => prev.filter(p => p.id !== id))
    }
    setModalEliminar(null)
  }

  async function handleGuardar(datosValidos) {
    setGuardando(true)
    try {
      if (productoEditando) {
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

  const filtros = [
    { key: 'todos', label: 'Todos' },
    { key: 'exportacion', label: 'Exportación' },
    { key: 'importacion', label: 'Importación' },
  ]

  return (
    <PageLayout title="CATÁLOGO" subtitle="Tus productos para exportación e importación">
      {/* Barra de acciones */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
        {/* Buscador */}
        <div className="relative flex-1 max-w-80">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o NCM..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full bg-surface-highest rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant/40 hover:text-on-surface-variant">
              ✕
            </button>
          )}
        </div>

        {/* Filtros tipo */}
        <div className="flex items-center gap-1 bg-surface-low rounded-full p-1">
          {filtros.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltroTipo(f.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-body transition-all duration-150 ${
                filtroTipo === f.key
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Botón agregar */}
        <button
          onClick={abrirNuevo}
          className="flex-shrink-0 bg-primary-intense text-on-primary px-5 py-2.5 rounded-xl font-body font-semibold text-sm hover:bg-primary transition-all duration-150 whitespace-nowrap"
        >
          + Agregar producto
        </button>
      </div>

      {/* Grid de productos */}
      {productosFiltrados.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productosFiltrados.map(p => (
            <Card key={p.id} className="group hover:border-white/[0.08] transition-all duration-200">
              {/* Header */}
              <div className="flex items-center justify-between">
                <Badge variant={p.operation_type === 'exportacion' ? 'primary' : 'accent'}>
                  {p.operation_type === 'exportacion' ? 'EXPORTACIÓN' : 'IMPORTACIÓN'}
                </Badge>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => abrirEditar(p)}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-on-surface-variant/50 hover:text-on-surface transition-all"
                    title="Editar"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setModalEliminar(p)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-on-surface-variant/50 hover:text-red-400 transition-all"
                    title="Eliminar"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Producto info */}
              <div className="mt-3">
                <h3 className="font-body text-base font-semibold text-on-surface leading-tight">{p.name}</h3>
                <p className="font-mono text-sm text-primary mt-1">{p.ncm_code}</p>
                {p.product_description_ncm && (
                  <p className="font-body text-xs text-on-surface-variant mt-0.5 line-clamp-1">
                    {p.product_description_ncm}
                  </p>
                )}
              </div>

              {/* Datos clave */}
              <div className="mt-4 pt-4 border-t border-white/[0.04] flex items-center justify-between">
                <div>
                  <p className="font-body text-[11px] text-on-surface-variant/50 uppercase mb-1">Precio</p>
                  <p className="font-mono text-sm text-on-surface">
                    {p.currency} {Number(p.unit_price).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {p.weight_kg && (
                  <div className="text-right">
                    <p className="font-body text-[11px] text-on-surface-variant/50 uppercase mb-1">Peso</p>
                    <p className="font-mono text-sm text-on-surface-variant">{p.weight_kg} kg</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Estado vacío */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-16 h-16 text-on-surface-variant/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <p className="font-body text-lg text-on-surface-variant mb-2">
            {busqueda ? 'Sin resultados' : 'No tenés productos cargados'}
          </p>
          <p className="font-body text-sm text-on-surface-variant/60 max-w-xs">
            {busqueda
              ? `No encontramos productos con "${busqueda}"`
              : 'Agregá tu primer producto para usar la calculadora y el comparador'}
          </p>
          {!busqueda && (
            <button
              onClick={abrirNuevo}
              className="mt-6 bg-primary-intense text-on-primary px-5 py-2.5 rounded-xl font-body font-semibold text-sm hover:bg-primary transition-all duration-150"
            >
              + Agregar producto
            </button>
          )}
        </div>
      )}

      {/* Modal agregar/editar */}
      {modalAbierto && (
        <ModalProducto
          form={form}
          setForm={setForm}
          errores={erroresForm}
          setErrores={setErroresForm}
          editando={productoEditando}
          guardando={guardando}
          onGuardar={handleGuardar}
          onCerrar={cerrarModal}
        />
      )}

      {/* Modal confirmar eliminación */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-low rounded-2xl p-8 w-full max-w-sm border border-white/[0.06] shadow-2xl">
            <h3 className="font-body text-base font-semibold text-on-surface mb-2">
              ¿ELIMINAR PRODUCTO?
            </h3>
            <p className="font-body text-sm text-on-surface-variant mb-6">
              "<span className="text-on-surface">{modalEliminar.name}</span>" será eliminado del catálogo. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalEliminar(null)}
                className="px-5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] font-body text-sm text-on-surface-variant hover:bg-white/[0.06] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminar(modalEliminar.id)}
                className="px-5 py-2.5 rounded-xl bg-red-500/20 text-red-400 font-body text-sm font-semibold hover:bg-red-500/30 transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}

function ModalProducto({ form, setForm, errores, setErrores, editando, guardando, onGuardar, onCerrar }) {
  const [ncmSugerencias, setNcmSugerencias] = useState([])
  const [buscandoNcm, setBuscandoNcm] = useState(false)
  const [ncmDropdownVisible, setNcmDropdownVisible] = useState(false)
  const ncmDebounceRef = useRef(null)
  const ncmRef = useRef(null)

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

      const digits = valor.trim().replace(/[.\s]/g, '').replace(/\D/g, '')
      let query = supabase.from('ncm').select('codigo_ncm, descripcion').limit(5)
      if (esNumerico) {
        query = query.like('codigo_ncm', `${digits}%`)
      } else {
        query = query.ilike('descripcion', `%${valor.trim()}%`)
      }

      const { data } = await query
      // Normalizar al formato display con puntos para mostrar en UI
      const sugerencias = (data ?? []).map(r => ({
        ncm_code: formatearNCM(r.codigo_ncm),
        description: r.descripcion,
        codigo_ncm: r.codigo_ncm,
      }))
      setNcmSugerencias(sugerencias)
      setNcmDropdownVisible(sugerencias.length > 0)
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
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      description: form.description.trim() || null,
    }

    onGuardar(datos)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-low rounded-2xl w-full max-w-lg border border-white/[0.06] shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="font-body text-base font-semibold text-on-surface">
            {editando ? 'EDITAR PRODUCTO' : 'AGREGAR PRODUCTO'}
          </h2>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-on-surface-variant hover:text-on-surface transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="p-6 flex flex-col gap-5">
          {errores._general && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {errores._general}
            </div>
          )}

          {/* Tipo */}
          <div>
            <label className="block font-body text-sm font-medium text-on-surface-variant mb-2">Tipo de operación <span className="text-primary">*</span></label>
            <div className="flex gap-2">
              {['exportacion', 'importacion'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('operation_type', t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-body transition-all border ${
                    form.operation_type === t
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-white/[0.03] text-on-surface-variant border-white/[0.06] hover:border-white/[0.1]'
                  }`}
                >
                  {t === 'exportacion' ? 'Exportación' : 'Importación'}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block font-body text-sm font-medium text-on-surface-variant mb-1.5">Nombre del producto <span className="text-primary">*</span></label>
            <input
              type="text"
              placeholder="Ej: Galletas de chocolate"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className={`w-full bg-surface-highest rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/30 ${errores.name ? 'ring-1 ring-red-500/50' : ''}`}
            />
            {errores.name && <p className="font-body text-xs text-red-400 mt-1">{errores.name}</p>}
          </div>

          {/* NCM */}
          <div ref={ncmRef}>
            <label className="block font-body text-sm font-medium text-on-surface-variant mb-1.5">Posición NCM <span className="text-primary">*</span></label>
            <div className="relative">
              <input
                type="text"
                placeholder="Escribí código (ej: 1905) o descripción..."
                value={form.ncm_code}
                onChange={e => handleNcmInput(e.target.value)}
                onFocus={() => ncmSugerencias.length > 0 && setNcmDropdownVisible(true)}
                autoComplete="off"
                className={`w-full bg-surface-highest rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/30 ${errores.ncm_code ? 'ring-1 ring-red-500/50' : ''}`}
              />
              {buscandoNcm && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-body text-xs text-on-surface-variant/50">buscando…</span>
              )}
              {ncmDropdownVisible && (
                <div className="absolute top-full mt-1 w-full bg-surface-high rounded-xl border border-white/[0.06] shadow-xl z-10 max-h-48 overflow-y-auto">
                  {ncmSugerencias.map(s => (
                    <button
                      key={s.ncm_code}
                      type="button"
                      onClick={() => seleccionarNcm(s)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/[0.04] border-b border-white/[0.04] last:border-b-0 transition-colors"
                    >
                      <span className="font-mono text-primary text-sm">{s.ncm_code}</span>
                      <span className="block font-body text-xs text-on-surface-variant mt-0.5 truncate">{s.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.ncm_descripcion_oficial && !ncmDropdownVisible && (
              <p className="font-body text-xs text-on-surface-variant/60 mt-1.5 italic">{form.ncm_descripcion_oficial}</p>
            )}
            {errores.ncm_code && <p className="font-body text-xs text-red-400 mt-1">{errores.ncm_code}</p>}
          </div>

          {/* Precio + moneda */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block font-body text-sm font-medium text-on-surface-variant mb-1.5">Precio unitario <span className="text-primary">*</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.unit_price}
                onChange={e => set('unit_price', e.target.value)}
                className={`w-full bg-surface-highest rounded-xl px-4 py-3 text-sm font-mono text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/30 ${errores.unit_price ? 'ring-1 ring-red-500/50' : ''}`}
              />
              {errores.unit_price && <p className="font-body text-xs text-red-400 mt-1">{errores.unit_price}</p>}
            </div>
            <div className="w-24">
              <label className="block font-body text-sm font-medium text-on-surface-variant mb-1.5">Moneda</label>
              <select
                value={form.currency}
                onChange={e => set('currency', e.target.value)}
                className="w-full bg-surface-highest rounded-xl px-4 py-3 text-sm font-mono text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>

          {/* Peso */}
          <div>
            <label className="block font-body text-sm font-medium text-on-surface-variant mb-1.5">
              Peso por unidad (kg) <span className="text-on-surface-variant/50 font-normal">opcional</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.001"
              placeholder="Ej: 0.5"
              value={form.weight_kg}
              onChange={e => set('weight_kg', e.target.value)}
              className="w-full bg-surface-highest rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block font-body text-sm font-medium text-on-surface-variant mb-1.5">
              Notas adicionales <span className="text-on-surface-variant/50 font-normal">opcional</span>
            </label>
            <textarea
              placeholder="Descripción libre, variedad, especificaciones..."
              rows={2}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="w-full bg-surface-highest rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-2 border-t border-white/[0.04]">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="px-5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] font-body text-sm text-on-surface-variant hover:bg-white/[0.06] transition-all disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2.5 rounded-xl bg-primary-intense text-on-primary font-body font-semibold text-sm hover:bg-primary transition-all disabled:opacity-40"
            >
              {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Agregar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
