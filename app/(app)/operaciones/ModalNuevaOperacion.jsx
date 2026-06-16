'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MEDIOS_PAGO_OPTIONS, getMedioPago } from '@/lib/data/medios-pago'

const INCOTERMS = ['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP']
const MODOS = ['maritimo','aereo','terrestre']

const REGIMENES_IMPORTACION = [
  { value: 'general', label: 'General (canal rojo/naranja/verde)' },
]

function getRegimenQuery(regimen) {
  return regimen.startsWith('courier_') ? [regimen, 'courier'] : [regimen]
}

function badgeRiesgo(riesgo) {
  if (!riesgo) return null
  const r = riesgo.toLowerCase()
  if (r === 'muy bajo' || r === 'bajo') return { bg: 'bg-emerald-500/10', text: 'text-emerald-700' }
  if (r === 'medio') return { bg: 'bg-amber-500/10', text: 'text-amber-700' }
  return { bg: 'bg-red-500/10', text: 'text-red-700' }
}

function IconCerrar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
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

function PanelMedioPago({ medioId }) {
  const [expandir, setExpandir] = useState(false)
  const medio = getMedioPago(medioId)
  if (!medio) return null

  const riesgoExp = badgeRiesgo(medio.riesgo_exportador)
  const riesgoImp = badgeRiesgo(medio.riesgo_importador)
  const costo = badgeRiesgo(medio.costo_relativo)

  return (
    <div className="bg-surface rounded-lg p-5 mt-3 border border-hairline">
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
                    <IconCheck className="text-emerald-600 mt-0.5 shrink-0" />
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
                    <IconX className="text-red-600 mt-0.5 shrink-0" />
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

          <div className="pt-2 border-t border-hairline-soft">
            <p className="font-body text-xs text-ink-subtle">Recomendado para: {medio.recomendado_para}</p>
            <p className="font-mono text-[10px] text-ink-tertiary mt-1">Normativa: {medio.normativa}</p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Modal para crear una nueva operación.
 * Props: form, setField, errores, productos, paises, guardando, onGuardar, onCerrar, onProductoChange
 */
export default function ModalNuevaOperacion({ form, setField, errores, productos, paises, guardando, onGuardar, onCerrar, onProductoChange }) {
  const [expandir, setExpandir] = useState(false)
  const [ncmSugerencias, setNcmSugerencias] = useState([])
  const [ncmVisible, setNcmVisible] = useState(false)
  const [buscandoNcm, setBuscandoNcm] = useState(false)
  const [restricciones, setRestricciones] = useState([])
  const [productosPermitidos, setProductosPermitidos] = useState([])
  const [productosProhibidos, setProductosProhibidos] = useState([])
  const ncmRef = useRef(null)
  const debounceRef = useRef(null)

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
        supabase.from('productos_regimen').select('producto, motivo, organismo, notas').in('regimen', regimenQuery).eq('tipo', 'permitido'),
        supabase.from('productos_regimen').select('producto, motivo, organismo, notas').in('regimen', regimenQuery).eq('tipo', 'prohibido'),
      )
    }

    Promise.all(fetches).then(([resR, resP, resPr]) => {
      setRestricciones(resR.data ?? [])
      setProductosPermitidos(resP?.data ?? [])
      setProductosProhibidos(resPr?.data ?? [])
    }).catch(() => {})
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
    <div className="fixed inset-0 bg-on-surface/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className="bg-surface-1 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-hairline">
        <div className="flex items-center justify-between p-6 border-b border-hairline-soft sticky top-0 bg-surface-1 z-10">
          <h2 className="font-body text-base font-semibold text-on-surface uppercase">NUEVA OPERACIÓN</h2>
          <button onClick={onCerrar} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface-2 transition-colors cursor-pointer">
            <IconCerrar />
          </button>
        </div>

        <form onSubmit={onGuardar} noValidate className="p-6 space-y-5">
          {(() => {
            const regimenOpts = REGIMENES_IMPORTACION
            if (regimenOpts.length <= 1) return null
            return (
              <div>
                <label className="block font-body text-xs text-on-surface-variant mb-1.5">Régimen aduanero</label>
                <select
                  className="w-full bg-surface-1 rounded-md px-4 py-3 font-body text-sm text-on-surface border border-hairline focus:border-on-surface outline-none cursor-pointer"
                  value={form.regimen}
                  onChange={e => setField('regimen', e.target.value)}
                >
                  {regimenOpts.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <p className="mt-1.5 font-body text-[11px] text-ink-subtle">
                  El régimen determina los documentos requeridos y los organismos que intervienen en tu operación.
                </p>

                {restricciones.length > 0 && (
                  <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                    <p className="font-body text-xs font-semibold text-amber-700 mb-2">Restricciones del régimen seleccionado</p>
                    <ul className="space-y-1">
                      {restricciones.map((r, i) => (
                        <li key={i} className="font-body text-xs text-on-surface-variant">
                          <span className="text-amber-700/70">•</span>{' '}
                          <span className="font-medium text-on-surface">{r.restriccion}</span>
                          {r.valor && <span className="text-on-surface-variant">: {r.valor}</span>}
                          {r.notas && r.notas !== 'nan' && r.notas !== 'null' && (
                            <span className="text-ink-subtle"> — {r.notas}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {productosPermitidos.length > 0 && (
                  <div className="mt-2 bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-4">
                    <p className="font-body text-xs font-semibold text-emerald-700 mb-2">Productos permitidos por este régimen</p>
                    <p className="font-body text-xs text-on-surface-variant">
                      {productosPermitidos.map(p => p.producto).join(', ')}
                    </p>
                  </div>
                )}

                {productosProhibidos.length > 0 && (
                  <div className="mt-2 bg-red-500/5 border border-red-500/15 rounded-lg p-4">
                    <p className="font-body text-xs font-semibold text-red-700 mb-2">Productos NO permitidos (requieren régimen general)</p>
                    <ul className="space-y-1">
                      {productosProhibidos.map((p, i) => (
                        <li key={i} className="font-body text-xs text-on-surface-variant">
                          <span className="text-red-700/70">•</span>{' '}
                          <span className="font-medium text-on-surface">{p.producto}</span>
                          {(p.motivo && p.motivo !== 'nan') && <span className="text-on-surface-variant"> — {p.motivo}</span>}
                          {(p.organismo && p.organismo !== 'nan') && <span className="text-ink-subtle"> ({p.organismo})</span>}
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
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">Producto del catálogo <span className="text-ink-tertiary">(autocompleta campos)</span></label>
              <select
                className="w-full bg-surface-1 rounded-md px-4 py-3 font-body text-sm text-on-surface border border-hairline focus:border-on-surface outline-none cursor-pointer"
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
            <label className="block font-body text-xs text-on-surface-variant mb-1.5">NCM <span className="text-red-600">*</span></label>
            <div ref={ncmRef} className="relative">
              <input
                className={`w-full bg-surface-1 rounded-md px-4 py-3 font-mono text-sm text-on-surface placeholder:text-ink-tertiary border ${errores.ncm_code ? 'border-red-500/50' : 'border-hairline focus:border-on-surface'} outline-none`}
                placeholder="Código o descripción…"
                value={form.ncm_code}
                onChange={e => handleNcmInput(e.target.value)}
                onFocus={() => ncmSugerencias.length > 0 && setNcmVisible(true)}
                autoComplete="off"
              />
              {buscandoNcm && <p className="mt-1 font-body text-[10px] text-ink-subtle">Buscando…</p>}
              {ncmVisible && (
                <div className="absolute top-full left-0 right-0 z-50 bg-surface-1 rounded-md border border-hairline mt-1 overflow-hidden">
                  {ncmSugerencias.map(s => (
                    <button
                      key={s.ncm_code}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-surface-2 transition-colors border-b border-hairline-soft last:border-0"
                      onClick={() => seleccionarNcm(s)}
                    >
                      <span className="font-mono text-xs text-ink-muted block">{s.ncm_code}</span>
                      <span className="font-body text-[11px] text-on-surface-variant line-clamp-1">{s.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errores.ncm_code && <p className="mt-1 font-body text-[10px] text-red-600">{errores.ncm_code}</p>}
          </div>

          <div>
            <label className="block font-body text-xs text-on-surface-variant mb-1.5">Descripción del producto</label>
            <input
              className="w-full bg-surface-1 rounded-md px-4 py-3 font-body text-sm text-on-surface placeholder:text-ink-tertiary border border-hairline focus:border-on-surface outline-none"
              placeholder="Ej: Galletas de chocolate con leche"
              value={form.product_description}
              onChange={e => setField('product_description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">
                País de origen <span className="text-red-600">*</span>
              </label>
              <select
                className={`w-full bg-surface-1 rounded-md px-4 py-3 font-body text-sm text-on-surface border ${errores.counterpart_country ? 'border-red-500/50' : 'border-hairline focus:border-on-surface'} outline-none cursor-pointer`}
                value={form.counterpart_country}
                onChange={e => setField('counterpart_country', e.target.value)}
              >
                <option value="">Seleccionar…</option>
                {paises.map(p => <option key={p.iso3} value={p.iso3}>{p.name_es}</option>)}
              </select>
              {errores.counterpart_country && <p className="mt-1 font-body text-[10px] text-red-600">{errores.counterpart_country}</p>}
            </div>
            <div>
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">Incoterm <span className="text-red-600">*</span></label>
              <select
                className="w-full bg-surface-1 rounded-md px-4 py-3 font-body text-sm text-on-surface border border-hairline focus:border-on-surface outline-none cursor-pointer"
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
              className="w-full bg-surface-1 rounded-md px-4 py-3 font-body text-sm text-on-surface border border-hairline focus:border-on-surface outline-none cursor-pointer"
              value={form.payment_method}
              onChange={e => setField('payment_method', e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {MEDIOS_PAGO_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            {form.payment_method && <PanelMedioPago medioId={form.payment_method} />}
          </div>

          <div>
            <label className="block font-body text-xs text-on-surface-variant mb-1.5">
              Exportador
            </label>
            <input
              className="w-full bg-surface-1 rounded-md px-4 py-3 font-body text-sm text-on-surface placeholder:text-ink-tertiary border border-hairline focus:border-on-surface outline-none"
              placeholder="Nombre de la empresa"
              value={form.counterpart_name}
              onChange={e => setField('counterpart_name', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">Valor total (USD)</label>
              <input
                className="w-full bg-surface-1 rounded-md px-4 py-3 font-mono text-sm text-on-surface placeholder:text-ink-tertiary border border-hairline focus:border-on-surface outline-none"
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.total_value}
                onChange={e => setField('total_value', e.target.value)}
              />
            </div>
            <div>
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">Moneda</label>
              <select className="w-full bg-surface-1 rounded-md px-4 py-3 font-body text-sm text-on-surface border border-hairline focus:border-on-surface outline-none cursor-pointer" value={form.currency} onChange={e => setField('currency', e.target.value)}>
                <option value="USD">USD</option><option value="EUR">EUR</option><option value="ARS">ARS</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 bg-surface rounded-md border border-hairline hover:bg-surface-2 transition-colors cursor-pointer"
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
                    className="w-full bg-surface-1 rounded-md px-4 py-3 font-body text-sm text-on-surface border border-hairline focus:border-on-surface outline-none"
                    value={form.estimated_ship_date}
                    onChange={e => setField('estimated_ship_date', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-body text-xs text-on-surface-variant mb-1.5">Medio de transporte</label>
                  <select
                    className="w-full bg-surface-1 rounded-md px-4 py-3 font-body text-sm text-on-surface border border-hairline focus:border-on-surface outline-none cursor-pointer"
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
                  className="w-full bg-surface-1 rounded-md px-4 py-3 font-body text-sm text-on-surface placeholder:text-ink-tertiary border border-hairline focus:border-on-surface outline-none"
                  placeholder="Nombre del despachante"
                  value={form.customs_broker}
                  onChange={e => setField('customs_broker', e.target.value)}
                />
              </div>
              <div>
                <label className="block font-body text-xs text-on-surface-variant mb-1.5">Notas</label>
                <textarea
                  rows={3}
                  className="w-full bg-surface-1 rounded-md px-4 py-3 font-body text-sm text-on-surface placeholder:text-ink-tertiary border border-hairline focus:border-on-surface outline-none resize-none"
                  placeholder="Observaciones adicionales…"
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                />
              </div>
            </div>
          )}

          {errores._general && (
            <div className={`px-4 py-3 rounded-md text-sm ${errores._limitAlcanzado ? 'bg-primary/5 border border-primary/30 text-on-surface' : 'bg-red-500/10 border border-red-500/20 text-red-700'}`}>
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
              className="flex-1 py-3 rounded-md bg-surface-2 text-on-surface font-body font-semibold text-sm hover:bg-hairline-soft transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 py-3 rounded-md bg-on-surface text-on-primary font-body font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando ? 'Creando…' : 'Crear operación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
