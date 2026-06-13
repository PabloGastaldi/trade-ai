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

const REGIMENES_SIN_PERCEPCIONES = ['courier_comercial', 'courier_personal', 'puerta_a_puerta']

export default function CalculadoraClient({ productos, paises }) {
  const searchParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : null

  const initNcm  = searchParams?.get('ncm')  ?? ''
  const initPais = searchParams?.get('pais') ?? ''

  return (
    <PageLayout title="CALCULADORA" subtitle="Calculá costos de importación">
      <TabImportacion productos={productos} paises={paises} initNcm={initNcm} initPais={initPais} />
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
