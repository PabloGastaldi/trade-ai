'use client'

import { useState, useEffect } from 'react'

function Checkbox({ checked, onChange }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange({ target: { checked: !checked } })}
      className={`w-5 h-5 rounded-md border shrink-0 flex items-center justify-center transition-all cursor-pointer ${
        checked
          ? 'bg-primary border-primary'
          : 'bg-surface-highest border-white/[0.15] hover:border-white/[0.3]'
      }`}
    >
      {checked && (
        <svg className="w-3 h-3 text-on-primary" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2 6 5 9 10 3" />
        </svg>
      )}
    </button>
  )
}
import PageLayout from '@/components/ui/PageLayout'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import NcmAutocomplete from '@/components/ui/NcmAutocomplete'
import ResultadosImpo from './ResultadosImpo'
import ResultadosExpo from './ResultadosExpo'
import ContextoComercial from './ContextoComercial'

const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CPT', 'CIF', 'CIP', 'DAP', 'DPU', 'DDP']

const CONDICIONES_IVA = [
  { value: 'responsable_inscripto', label: 'Responsable inscripto' },
  { value: 'monotributista',        label: 'Monotributista' },
  { value: 'consumidor_final',      label: 'Consumidor final' },
  { value: 'exento',                label: 'Exento' },
]

const REGIMENES_IMPORTACION = [
  { key: 'general',           label: 'Régimen General',    desc: 'Despacho formal a plaza' },
  { key: 'courier_comercial', label: 'Courier Comercial',  desc: 'E-commerce · hasta USD 3.000 FOB' },
  { key: 'courier_personal',  label: 'Courier Personal',   desc: 'Franquicia USD 400 · hasta USD 3.000 FOB' },
  { key: 'puerta_a_puerta',   label: 'Puerta a Puerta',    desc: 'Franquicia USD 400 · hasta USD 3.000 FOB' },
]

const REGIMENES_EXPORTACION = [
  { key: 'general',        label: 'Régimen General',  desc: 'Exportación formal' },
  { key: 'exporta_simple', label: 'Exporta Simple',   desc: 'MiPyMEs · sin derechos · hasta USD 15.000' },
]

const REGIMENES_SIN_PERCEPCIONES = ['courier_comercial', 'courier_personal', 'puerta_a_puerta']

export default function CalculadoraClient({ productos, paises }) {
  const searchParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : null

  const [tab, setTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const t = new URLSearchParams(window.location.search).get('tipo')
      if (t === 'exportacion' || t === 'importacion') return t
    }
    return 'importacion'
  })

  const initNcm  = searchParams?.get('ncm')  ?? ''
  const initPais = searchParams?.get('pais') ?? ''

  return (
    <PageLayout title="CALCULADORA" subtitle="Calculá costos de importación y exportación">
      <div className="flex bg-white/[0.02] rounded-xl p-1 w-fit mb-8">
        {[
          { key: 'importacion', label: 'IMPORTACIÓN' },
          { key: 'exportacion', label: 'EXPORTACIÓN' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-6 py-2.5 font-body text-sm font-semibold tracking-wide rounded-lg transition-all duration-150 ${
              tab === t.key
                ? 'bg-white/[0.06] text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface cursor-pointer'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'importacion'
        ? <TabImportacion productos={productos} paises={paises} initNcm={initNcm} initPais={initPais} />
        : <TabExportacion productos={productos} paises={paises} initNcm={initNcm} initPais={initPais} />
      }
    </PageLayout>
  )
}

function ProductoSelector({ productos, onSelect, operationType }) {
  const filtrados = productos.filter(p => !operationType || p.operation_type === operationType)
  if (filtrados.length === 0) {
    return (
      <div className="mb-4 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
        <p className="font-body text-xs text-on-surface-variant">
          No tenés productos en tu catálogo.{' '}
          <a href="/catalogo" className="text-primary hover:underline">Cargalos acá →</a>
        </p>
      </div>
    )
  }

  return (
    <div className="mb-5">
      <label className="block font-body text-xs text-on-surface-variant mb-1.5">
        Producto del catálogo <span className="text-[10px] text-on-surface-variant/50">(opcional)</span>
      </label>
      <select
        className="w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface border border-transparent outline-none focus:border-primary/40 transition-all cursor-pointer"
        defaultValue=""
        onChange={e => {
          const p = filtrados.find(x => x.id === e.target.value)
          if (p) onSelect(p)
        }}
      >
        <option value="">Seleccionar del catálogo…</option>
        {filtrados.map(p => (
          <option key={p.id} value={p.id}>
            {p.name} — {p.ncm_code} ({p.incoterm} USD {Number(p.unit_price).toLocaleString('es-AR')})
          </option>
        ))}
      </select>
    </div>
  )
}

function CampoSelect({ label, value, onChange, options, className = '' }) {
  return (
    <div className={className}>
      <label className="block font-body text-xs text-on-surface-variant mb-1.5">{label}</label>
      <select
        className="w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface border border-transparent outline-none focus:border-primary/40 transition-all cursor-pointer"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function TabImportacion({ productos, paises, initNcm = '', initPais = '' }) {
  const [form, setForm] = useState({
    ncm_code: initNcm, valor_fob: '', flete_internacional: '',
    seguro_internacional: '', estimarSeguro: true,
    pais_origen: initPais, condicion_iva: 'responsable_inscripto',
    peso_kg: '',
  })
  const [regimen, setRegimen] = useState('general')
  const [errores, setErrores] = useState({})
  const [calculando, setCalculando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [regSeleccionado, setRegSeleccionado] = useState('general')
  const [contexto, setContexto] = useState(null)

  const ocultarCondicionIva = REGIMENES_SIN_PERCEPCIONES.includes(regimen)

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
    if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: null }))
  }

  function cargarDesdeProducto(p) {
    setForm(prev => ({
      ...prev, ncm_code: p.ncm_code, valor_fob: String(p.unit_price ?? ''), pais_origen: p.default_origin ?? '',
    }))
  }

  function validar() {
    const e = {}
    if (!form.ncm_code.trim()) e.ncm_code = 'El NCM es obligatorio'
    if (!form.valor_fob || Number(form.valor_fob) <= 0) e.valor_fob = 'El valor FOB debe ser mayor a 0'
    return e
  }

  async function handleCalcular(e) {
    e.preventDefault()
    const errs = validar()
    if (Object.keys(errs).length > 0) { setErrores(errs); return }

    setCalculando(true)
    setResultado(null)
    setContexto(null)

    const seguro = form.estimarSeguro ? null : (Number(form.seguro_internacional) || null)
    const ncmTrimmed = form.ncm_code.trim()
    const paisOrigen = form.pais_origen || null

    try {
      const esCourier = regimen === 'courier_comercial' || regimen === 'courier_personal'
      const res = await fetch('/api/calculadora/importacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ncm_code: ncmTrimmed,
          valor_fob: Number(form.valor_fob),
          flete_internacional: Number(form.flete_internacional) || 0,
          seguro_internacional: seguro,
          pais_origen: paisOrigen,
          condicion_iva: ocultarCondicionIva ? 'responsable_inscripto' : form.condicion_iva,
          regimen: regimen !== 'general' ? regimen : null,
          ...(esCourier && { peso_kg: Number(form.peso_kg) || null }),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Error de cálculo')
      setResultado(json.data)
      setRegSeleccionado('general')

      // Cargar contexto comercial en paralelo (no bloquea el resultado)
      if (ncmTrimmed && paisOrigen) {
        fetch(`/api/calculadora/contexto?tipo=impo&ncm=${encodeURIComponent(ncmTrimmed)}&pais=${encodeURIComponent(paisOrigen)}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => d && setContexto(d))
          .catch(() => {})
      }
    } catch (err) {
      setErrores({ _general: err.message })
    } finally {
      setCalculando(false)
    }
  }


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <form onSubmit={handleCalcular} noValidate>
        <Card>
          <p className="font-body text-sm font-semibold tracking-widest text-on-surface-variant uppercase mb-6">Datos de la operación</p>

          <ProductoSelector productos={productos} onSelect={cargarDesdeProducto} operationType="importacion" />

          <div className="space-y-5">
            <div>
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">
                NCM <span className="text-[10px] text-on-surface-variant/50">(obligatorio)</span>
              </label>
              <NcmAutocomplete
                value={form.ncm_code}
                onSelect={item => set('ncm_code', item.ncm_code)}
                error={errores.ncm_code}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Valor FOB (USD)"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.valor_fob}
                onChange={e => set('valor_fob', e.target.value)}
                error={errores.valor_fob}
              />
              <Input
                label="Flete internacional (USD)"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.flete_internacional}
                onChange={e => set('flete_internacional', e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-body text-xs text-on-surface-variant">Seguro internacional (USD)</label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${form.estimarSeguro ? 'bg-primary-intense border-primary-intense' : 'border-white/20'}`}>
                    {form.estimarSeguro && (
                      <svg className="w-2.5 h-2.5 text-on-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span className="font-body text-[11px] text-on-surface-variant">Estimar 1%</span>
                </label>
              </div>
              <input
                className={`w-full bg-surface-highest rounded-xl px-4 py-3 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-transparent outline-none transition-all ${
                  form.estimarSeguro ? 'opacity-40 cursor-not-allowed' : 'focus:border-primary/40'
                }`}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.seguro_internacional}
                onChange={e => set('seguro_internacional', e.target.value)}
                disabled={form.estimarSeguro}
              />
            </div>

            {(regimen === 'courier_comercial' || regimen === 'courier_personal') && (
              <Input
                label="Peso estimado (kg)"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.peso_kg}
                onChange={e => set('peso_kg', e.target.value)}
                hint="Opcional — se usa para estimar el flete courier (USD 15/kg) si no ingresaste flete"
              />
            )}

            <CampoSelect
              label="País de origen"
              value={form.pais_origen}
              onChange={v => set('pais_origen', v)}
              options={[{ value: '', label: 'Seleccionar país…' }, ...paises.map(p => ({ value: p.iso3, label: p.name_es }))]}
            />

            {!ocultarCondicionIva && (
              <CampoSelect
                label="Condición ante IVA"
                value={form.condicion_iva}
                onChange={v => set('condicion_iva', v)}
                options={CONDICIONES_IVA}
              />
            )}

            <CampoSelect
              label="Régimen aduanero"
              value={regimen}
              onChange={v => { setRegimen(v); setResultado(null) }}
              options={REGIMENES_IMPORTACION.map(r => ({ value: r.key, label: r.label }))}
            />
            {regimen !== 'general' && (
              <p className="font-body text-[10px] text-on-surface-variant/60 -mt-3">
                {REGIMENES_IMPORTACION.find(r => r.key === regimen)?.desc}
              </p>
            )}
          </div>

          {errores._general && (
            <div className="mt-4 p-3 bg-red-500/10 rounded-xl border border-red-500/10">
              <p className="font-body text-xs text-red-400">{errores._general}</p>
            </div>
          )}

          <Button type="submit" className="w-full mt-6" loading={calculando}>
            {calculando ? 'Calculando…' : 'CALCULAR'}
          </Button>
        </Card>
      </form>

      <div className="space-y-4">
        {!resultado && !calculando && (
          <div className="flex flex-col items-center justify-center h-64 bg-white/[0.02] rounded-2xl border border-white/[0.04]">
            <svg className="w-10 h-10 text-on-surface-variant/20 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="8" y1="10" x2="16" y2="10" />
              <line x1="8" y1="14" x2="12" y2="14" />
            </svg>
            <p className="font-body text-sm text-on-surface-variant/40 text-center">Completá los datos y hacé clic en Calcular</p>
          </div>
        )}

        {calculando && (
          <div className="flex flex-col items-center justify-center h-64 bg-white/[0.02] rounded-2xl border border-white/[0.04]">
            <div className="flex gap-1.5 mb-4">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
            <p className="font-body text-sm text-on-surface-variant/50">Calculando…</p>
          </div>
        )}

        {resultado && (
          <>
            <ResultadosImpo resultado={resultado} regSeleccionado={regSeleccionado} setRegSeleccionado={setRegSeleccionado} paisIso3={form.pais_origen || null} />
            {contexto && <ContextoComercial contexto={contexto} tipo="impo" />}
          </>
        )}
      </div>
    </div>
  )
}

function TabExportacion({ productos, paises, initNcm = '', initPais = '' }) {
  const [form, setForm] = useState({
    ncm_code: initNcm, precio_producto: '', incoterm_base: 'FOB',
    incoterm_deseado: 'CIF', pais_destino: initPais,
    flete_interno: '', flete_internacional: '', seguro_internacional: '',
    gastos_portuarios: '', gastos_aduana: '',
    bonus_reintegro: false,
    pais_facturacion_diferente: false,
  })
  const [regimenExpo, setRegimenExpo] = useState('general')
  const [errores, setErrores] = useState({})
  const [calculando, setCalculando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [contextoExpo, setContextoExpo] = useState(null)
  const [gastosExpanded, setGastosExpanded] = useState(false)
  const [modoFOB, setModoFOB] = useState('precio') // 'precio' | 'calcular'
  const [resultadoFOB, setResultadoFOB] = useState(null)
  const [formFOB, setFormFOB] = useState({
    costo_mercaderia: '',
    envases_embalajes: '',
    flete_interno: '',
    seguro_interno: '',
    otros_gastos: '',
    gastos_indirectos_pct: '',
    derecho_exportacion_pct: '',
    reintegro_pct: '',
    bonus_reintegro: false,
    utilidad_pct: '',
    utilidad_monto: '',
    utilidad_tipo: 'pct',
  })

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
    if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: null }))
  }

  function cargarDesdeProducto(p) {
    setForm(prev => ({
      ...prev,
      ncm_code: p.ncm_code,
      precio_producto: String(p.unit_price ?? ''),
      incoterm_base: p.incoterm,
      pais_destino: p.default_destination ?? '',
    }))
  }

  function validar() {
    const e = {}
    if (!form.ncm_code.trim()) e.ncm_code = 'El NCM es obligatorio'
    if (!form.precio_producto || Number(form.precio_producto) <= 0) e.precio_producto = 'El precio debe ser mayor a 0'
    return e
  }

  async function handleCalcular(e) {
    e.preventDefault()
    const errs = validar()
    if (Object.keys(errs).length > 0) { setErrores(errs); return }

    setCalculando(true)
    setResultado(null)
    setContextoExpo(null)

    const ncmTrimmed = form.ncm_code.trim()
    const paisDestino = form.pais_destino || null

    try {
      const res = await fetch('/api/calculadora/exportacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ncm_code: ncmTrimmed,
          precio_producto: Number(form.precio_producto),
          incoterm_base: form.incoterm_base,
          incoterm_deseado: form.incoterm_deseado,
          pais_destino: paisDestino,
          flete_interno: Number(form.flete_interno) || null,
          flete_internacional: Number(form.flete_internacional) || null,
          seguro_internacional: Number(form.seguro_internacional) || null,
          gastos_portuarios: Number(form.gastos_portuarios) || null,
          gastos_aduana_exportacion: Number(form.gastos_aduana) || null,
          bonus_reintegro: form.bonus_reintegro || false,
          pais_facturacion_diferente: form.pais_facturacion_diferente || false,
          regimen: regimenExpo !== 'general' ? regimenExpo : null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Error de cálculo')
      setResultado(json.data)

      // Cargar contexto comercial de exportación en paralelo
      if (ncmTrimmed && paisDestino) {
        fetch(`/api/calculadora/contexto?tipo=expo&ncm=${encodeURIComponent(ncmTrimmed)}&pais=${encodeURIComponent(paisDestino)}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => d && setContextoExpo(d))
          .catch(() => {})
      }
    } catch (err) {
      setErrores({ _general: err.message })
    } finally {
      setCalculando(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <form onSubmit={handleCalcular} noValidate>
        <Card>
          <p className="font-body text-sm font-semibold tracking-widest text-on-surface-variant uppercase mb-6">Datos de la operación</p>

          <ProductoSelector productos={productos} onSelect={cargarDesdeProducto} operationType="exportacion" />

          <div className="space-y-5">
            <div>
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">
                NCM <span className="text-[10px] text-on-surface-variant/50">(obligatorio)</span>
              </label>
              <NcmAutocomplete
                value={form.ncm_code}
                onSelect={item => set('ncm_code', item.ncm_code)}
                error={errores.ncm_code}
              />
            </div>

            <Input
              label="Precio del producto (USD)"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.precio_producto}
              onChange={e => set('precio_producto', e.target.value)}
              error={errores.precio_producto}
            />

            <div className="grid grid-cols-2 gap-4">
              <CampoSelect
                label="Incoterm del precio"
                value={form.incoterm_base}
                onChange={v => set('incoterm_base', v)}
                options={INCOTERMS.map(i => ({ value: i, label: i }))}
              />
              <CampoSelect
                label="Incoterm deseado"
                value={form.incoterm_deseado}
                onChange={v => set('incoterm_deseado', v)}
                options={INCOTERMS.map(i => ({ value: i, label: i }))}
              />
            </div>

            <CampoSelect
              label="País de destino"
              value={form.pais_destino}
              onChange={v => set('pais_destino', v)}
              options={[{ value: '', label: 'Seleccionar país…' }, ...paises.map(p => ({ value: p.iso3, label: p.name_es }))]}
            />

            <CampoSelect
              label="Régimen aduanero"
              value={regimenExpo}
              onChange={v => { setRegimenExpo(v); setResultado(null) }}
              options={REGIMENES_EXPORTACION.map(r => ({ value: r.key, label: r.label }))}
            />
            {regimenExpo !== 'general' && (
              <p className="font-body text-[10px] text-on-surface-variant/60 -mt-3">
                {REGIMENES_EXPORTACION.find(r => r.key === regimenExpo)?.desc}
              </p>
            )}

            <div className="bg-white/[0.02] rounded-xl border border-white/[0.04] overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
                onClick={() => setGastosExpanded(p => !p)}
              >
                <span className="font-body text-xs text-on-surface-variant">Gastos opcionales</span>
                <svg
                  className={`w-4 h-4 text-on-surface-variant transition-transform duration-200 ${gastosExpanded ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {gastosExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/[0.04]">
                  {[
                    { campo: 'flete_interno', label: 'Flete interno (USD)' },
                    { campo: 'gastos_portuarios', label: 'Gastos portuarios (USD)' },
                    { campo: 'flete_internacional', label: 'Flete internacional (USD)' },
                    { campo: 'seguro_internacional', label: 'Seguro internacional (USD)' },
                    { campo: 'gastos_aduana', label: 'Gastos de despacho (USD)' },
                  ].map(({ campo, label }) => (
                    <Input
                      key={campo}
                      label={label}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form[campo]}
                      onChange={e => set(campo, e.target.value)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 mt-5 pt-4 border-t border-white/[0.04]">
              <label className="flex items-center gap-3 cursor-pointer group">
                <Checkbox checked={form.bonus_reintegro} onChange={e => set('bonus_reintegro', e.target.checked)} />
                <div className="flex-1">
                  <span className="font-body text-sm text-on-surface">Mi producto es orgánico / tiene denominación de origen / sello Alimentos Argentinos</span>
                  <p className="font-body text-[10px] text-on-surface-variant/60 mt-0.5">Activa bonus de +0.5% en el reintegro</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <Checkbox checked={form.pais_facturacion_diferente} onChange={e => set('pais_facturacion_diferente', e.target.checked)} />
                <div className="flex-1">
                  <span className="font-body text-sm text-on-surface">El país de facturación es diferente al destino</span>
                  <p className="font-body text-[10px] text-on-surface-variant/60 mt-0.5">Activa percepción adicional de Ganancias 0.5%</p>
                </div>
              </label>
            </div>
          </div>

          {errores._general && (
            <div className="mt-4 p-3 bg-red-500/10 rounded-xl border border-red-500/10">
              <p className="font-body text-xs text-red-400">{errores._general}</p>
            </div>
          )}

          <Button type="submit" className="w-full mt-6" loading={calculando}>
            {calculando ? 'Calculando…' : 'CALCULAR'}
          </Button>
        </Card>
      </form>

      <div>
        {!resultado && !calculando && (
          <div className="flex flex-col items-center justify-center h-64 bg-white/[0.02] rounded-2xl border border-white/[0.04]">
            <svg className="w-10 h-10 text-on-surface-variant/20 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="8" y1="10" x2="16" y2="10" />
              <line x1="8" y1="14" x2="12" y2="14" />
            </svg>
            <p className="font-body text-sm text-on-surface-variant/40 text-center">Completá los datos y hacé clic en Calcular</p>
          </div>
        )}

        {calculando && (
          <div className="flex flex-col items-center justify-center h-64 bg-white/[0.02] rounded-2xl border border-white/[0.04]">
            <div className="flex gap-1.5 mb-4">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
            <p className="font-body text-sm text-on-surface-variant/50">Calculando…</p>
          </div>
        )}

        {resultado && (
          <div className="space-y-4">
            <ResultadosExpo resultado={{ ...resultado, pais_destino_iso3: form.pais_destino || null }} />
            {contextoExpo && <ContextoComercial contexto={contextoExpo} tipo="expo" />}
          </div>
        )}
      </div>
    </div>
  )
}

