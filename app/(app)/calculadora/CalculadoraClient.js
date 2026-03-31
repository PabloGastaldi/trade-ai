'use client'

import { useState, useRef, useEffect } from 'react'
import PageLayout from '@/components/ui/PageLayout'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CPT', 'CIF', 'CIP', 'DAP', 'DPU', 'DDP']

const CONDICIONES_IVA = [
  { value: 'responsable_inscripto', label: 'Responsable inscripto' },
  { value: 'monotributista',        label: 'Monotributista' },
  { value: 'consumidor_final',      label: 'Consumidor final' },
  { value: 'exento',                label: 'Exento' },
]

const REGIMENES = [
  { key: 'general',    label: 'Régimen General', desc: 'Despacho formal a plaza' },
  { key: 'courier',    label: 'Courier',          desc: 'Hasta USD 3.000 FOB' },
  { key: 'pef',        label: 'PEF Personal',     desc: 'Prestadores especiales' },
  { key: 'correo_upu', label: 'Correo UPU',        desc: 'Correo Argentino' },
]

function usd(n) {
  if (n === null || n === undefined) return '—'
  return 'USD ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pct(n) {
  if (n === null || n === undefined) return '—'
  return (Number(n)).toFixed(1) + '%'
}

function formatAlicuota(n) {
  if (!n || n === 0) return null
  return pct(n)
}

export default function CalculadoraClient({ productos, paises }) {
  const [tab, setTab] = useState('importacion')

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
        ? <TabImportacion productos={productos} paises={paises} />
        : <TabExportacion productos={productos} paises={paises} />
      }
    </PageLayout>
  )
}

function NcmAutocomplete({ value, onSelect, error }) {
  const [sugerencias, setSugerencias] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [visible, setVisible] = useState(false)
  const [descripcion, setDescripcion] = useState('')
  const debounceRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setVisible(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleInput(val) {
    onSelect({ ncm_code: val, description: '' })
    setDescripcion('')
    clearTimeout(debounceRef.current)
    if (val.trim().length < 2) { setSugerencias([]); setVisible(false); return }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const trimmed = val.trim()
        const res = await fetch(`/api/ncm-search?q=${encodeURIComponent(trimmed)}`)
        const data = await res.json()
        if (!res.ok) {
          console.error('NCM search error:', data.error)
        }
        setSugerencias(data ?? [])
        setVisible((data ?? []).length > 0)
      } catch (err) {
        console.error('NCM search exception:', err)
      } finally {
        setBuscando(false)
      }
    }, 300)
  }

  function handleSelect(item) {
    onSelect(item)
    setDescripcion(item.description)
    setSugerencias([])
    setVisible(false)
  }

  return (
    <div ref={wrapRef}>
      <input
        className={`w-full bg-surface-highest rounded-xl px-4 py-3 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/40 border outline-none transition-all duration-150 ${
          error ? 'border-red-500/50' : 'border-transparent focus:border-primary/40'
        }`}
        type="text"
        placeholder="Código NCM o descripción..."
        value={value}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => sugerencias.length > 0 && setVisible(true)}
        autoComplete="off"
      />
      <div className="relative">
        {buscando && (
          <p className="mt-1 font-body text-[10px] text-on-surface-variant/50">Buscando…</p>
        )}
        {visible && (
          <div className="absolute top-1 left-0 right-0 z-50 bg-surface-low rounded-xl border border-white/[0.06] shadow-xl overflow-hidden">
            {sugerencias.map(s => (
              <button
                key={s.ncm_code}
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] last:border-0"
                onClick={() => handleSelect(s)}
              >
                <span className="font-mono text-xs text-primary block">{s.ncm_code}</span>
                <span className="font-body text-[11px] text-on-surface-variant line-clamp-1">{s.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {descripcion && !visible && (
        <p className="mt-1 font-body text-[10px] text-on-surface-variant/60">{descripcion}</p>
      )}
      {error && <p className="mt-1 font-body text-[10px] text-red-400">{error}</p>}
    </div>
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

function LineaDesglose({ label, alicuota, monto, className = '' }) {
  if (!monto && monto !== 0) return null
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className={`font-body text-xs text-on-surface-variant ${className}`}>
        {label}
        {alicuota ? <span className="ml-1 text-[10px] text-on-surface-variant/50">({pct(alicuota)})</span> : null}
      </span>
      <span className={`font-mono text-xs text-on-surface ${className}`}>{usd(monto)}</span>
    </div>
  )
}

function DesgloseImportacion({ data }) {
  const [expandido, setExpandido] = useState(false)

  return (
    <div className="mt-4 bg-white/[0.02] rounded-xl border border-white/[0.04] overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpandido(p => !p)}
      >
        <span className="font-body text-xs font-semibold tracking-wide text-on-surface-variant uppercase">Desglose completo</span>
        <svg
          className={`w-4 h-4 text-on-surface-variant transition-transform duration-200 ${expandido ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expandido && (
        <div className="px-5 pb-5 border-t border-white/[0.04]">
          <div className="pt-4 space-y-0">
            <p className="font-body text-[10px] font-semibold tracking-widest text-on-surface-variant/60 uppercase mb-2">Base imponible</p>
            <LineaDesglose label="FOB" monto={data.valores_base?.fob} />
            <LineaDesglose label="Flete" monto={data.valores_base?.flete} />
            <LineaDesglose label="Seguro" monto={data.valores_base?.seguro} />
            <LineaDesglose label="CIF" monto={data.valores_base?.cif} />

            {data.regimenes?.general?.desglose && (
              <>
                <div className="h-px bg-white/[0.04] my-3" />
                <p className="font-body text-[10px] font-semibold tracking-widest text-on-surface-variant/60 uppercase mb-2">Tributos</p>
                {Object.entries(data.regimenes?.general?.desglose ?? {}).map(([key, v]) => {
                  if (!v || v.monto === 0) return null
                  const labels = {
                    derecho_importacion: 'Derecho de importación',
                    tasa_estadistica: 'Tasa estadística',
                    iva: 'IVA importación',
                    iva_adicional: 'Perc. IVA adicional',
                    percepcion_ganancias: 'Perc. Ganancias',
                    ingresos_brutos: 'Ingresos brutos',
                  }
                  return <LineaDesglose key={key} label={labels[key] ?? key} alicuota={v.alicuota} monto={v.monto} />
                })}
              </>
            )}

            <div className="h-px bg-white/[0.04] my-3" />
            <div className="flex justify-between items-center py-1.5">
              <span className="font-body text-xs text-on-surface font-semibold">Total tributos</span>
              <span className="font-mono text-xs text-on-surface font-semibold">{usd(data.regimenes?.general?.total_tributos)}</span>
            </div>
          </div>

          {data.preferencia_aplicada && (
            <div className="mt-4 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
              <p className="font-body text-[11px] text-emerald-400">
                Preferencia arancelaria: {data.preferencia_aplicada.acuerdo}
              </p>
            </div>
          )}

          {data.notas?.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {data.notas.map((n, i) => (
                <p key={i} className="font-body text-[10px] text-on-surface-variant/60 leading-relaxed">{n}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CardRegimenImportacion({ regimen, info, data, esMejor, seleccionado, onClick }) {
  if (!data.disponible) {
    return (
      <div
        className={`bg-white/[0.03] rounded-2xl p-5 border border-white/[0.04] cursor-not-allowed opacity-50 ${seleccionado ? 'ring-1 ring-primary/30' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-body text-sm font-semibold tracking-wide text-on-surface uppercase">{info.label}</p>
            <p className="font-body text-[10px] text-on-surface-variant mt-0.5">{info.desc}</p>
          </div>
          <Badge variant="neutral">No disponible</Badge>
        </div>
        <p className="font-body text-xs text-on-surface-variant/60 mt-2">{data.motivo_no_disponible}</p>
      </div>
    )
  }

  const esGeneral = regimen === 'general'
  const desglose = data.desglose

  return (
    <div
      className={`bg-white/[0.03] rounded-2xl p-5 border transition-all duration-150 cursor-pointer ${
        seleccionado
          ? 'border-primary/30 ring-1 ring-primary/10'
          : 'border-white/[0.04] hover:border-white/[0.08]'
      } ${esMejor ? 'bg-primary/[0.03]' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-body text-sm font-semibold tracking-wide text-on-surface uppercase">{info.label}</p>
            {esMejor && <Badge variant="success">Mejor opción</Badge>}
          </div>
          <p className="font-body text-[10px] text-on-surface-variant mt-0.5">{info.desc}</p>
        </div>
        {seleccionado && (
          <svg className="w-4 h-4 text-primary mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      <p className="font-mono text-xl text-on-surface font-semibold mt-3">{usd(data.costo_total)}</p>
      <p className="font-body text-[10px] text-on-surface-variant/50 mt-0.5">Costo total</p>

      <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-1.5">
        <div className="flex justify-between">
          <span className="font-body text-[11px] text-on-surface-variant">FOB</span>
          <span className="font-mono text-[11px] text-on-surface">{usd(data.costo_total - data.total_tributos)}</span>
        </div>
        {desglose && (
          <>
            {esGeneral && desglose.derecho_importacion?.monto > 0 && (
              <div className="flex justify-between">
                <span className="font-body text-[11px] text-on-surface-variant">
                  DI ({formatAlicuota(desglose.derecho_importacion.alicuota)})
                </span>
                <span className="font-mono text-[11px] text-on-surface">{usd(desglose.derecho_importacion.monto)}</span>
              </div>
            )}
            {esGeneral && desglose.iva?.monto > 0 && (
              <div className="flex justify-between">
                <span className="font-body text-[11px] text-on-surface-variant">
                  IVA ({formatAlicuota(desglose.iva.alicuota)})
                </span>
                <span className="font-mono text-[11px] text-on-surface">{usd(desglose.iva.monto)}</span>
              </div>
            )}
            {esGeneral && desglose.iva_adicional?.monto > 0 && (
              <div className="flex justify-between">
                <span className="font-body text-[11px] text-on-surface-variant">
                  Perc. IVA ({formatAlicuota(desglose.iva_adicional.alicuota)})
                </span>
                <span className="font-mono text-[11px] text-on-surface">{usd(desglose.iva_adicional.monto)}</span>
              </div>
            )}
            {esGeneral && desglose.percepcion_ganancias?.monto > 0 && (
              <div className="flex justify-between">
                <span className="font-body text-[11px] text-on-surface-variant">
                  Ganancias ({formatAlicuota(desglose.percepcion_ganancias.alicuota)})
                </span>
                <span className="font-mono text-[11px] text-on-surface">{usd(desglose.percepcion_ganancias.monto)}</span>
              </div>
            )}
            {esGeneral && desglose.ingresos_brutos?.monto > 0 && (
              <div className="flex justify-between">
                <span className="font-body text-[11px] text-on-surface-variant">
                  Ing. Brutos ({formatAlicuota(desglose.ingresos_brutos.alicuota)})
                </span>
                <span className="font-mono text-[11px] text-on-surface">{usd(desglose.ingresos_brutos.monto)}</span>
              </div>
            )}
            {!esGeneral && desglose.tributo_unico && (
              <div className="flex justify-between">
                <span className="font-body text-[11px] text-on-surface-variant">Tributo 50%</span>
                <span className="font-mono text-[11px] text-on-surface">{usd(desglose.tributo_unico.monto)}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-white/[0.04] flex justify-between items-center">
        <span className="font-body text-[10px] text-on-surface-variant">Effective rate</span>
        <span className="font-mono text-[11px] text-primary">{pct(data.effective_rate)}</span>
      </div>

      {!esGeneral && data.costo_total && data.costo_total < (data.costo_total || 0) && esMejor && (
        <p className="mt-2 font-body text-[10px] text-emerald-400">
          Ahorro vs. general: {usd(data.costo_total)}
        </p>
      )}
    </div>
  )
}

function TabImportacion({ productos, paises }) {
  const [form, setForm] = useState({
    ncm_code: '', valor_fob: '', flete_internacional: '',
    seguro_internacional: '', estimarSeguro: true,
    pais_origen: '', condicion_iva: 'responsable_inscripto',
  })
  const [errores, setErrores] = useState({})
  const [calculando, setCalculando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [regSeleccionado, setRegSeleccionado] = useState('general')

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

    const seguro = form.estimarSeguro ? null : (Number(form.seguro_internacional) || null)

    try {
      const res = await fetch('/api/calculadora/importacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ncm_code: form.ncm_code.trim(),
          valor_fob: Number(form.valor_fob),
          flete_internacional: Number(form.flete_internacional) || 0,
          seguro_internacional: seguro,
          pais_origen: form.pais_origen || null,
          condicion_iva: form.condicion_iva,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Error de cálculo')
      setResultado(json.data)
      setRegSeleccionado('general')
    } catch (err) {
      setErrores({ _general: err.message })
    } finally {
      setCalculando(false)
    }
  }

  const mejorOpcion = resultado?.mejor_opcion ?? null

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

            <CampoSelect
              label="País de origen"
              value={form.pais_origen}
              onChange={v => set('pais_origen', v)}
              options={[{ value: '', label: 'Seleccionar país…' }, ...paises.map(p => ({ value: p.iso3, label: p.name_es }))]}
            />

            <CampoSelect
              label="Condición ante IVA"
              value={form.condicion_iva}
              onChange={v => set('condicion_iva', v)}
              options={CONDICIONES_IVA}
            />
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
            <div className="space-y-4">
              {REGIMENES.map(r => (
                <CardRegimenImportacion
                  key={r.key}
                  regimen={r.key}
                  info={r}
                  data={resultado.regimenes?.[r.key]}
                  esMejor={r.key === mejorOpcion}
                  seleccionado={regSeleccionado === r.key}
                  onClick={() => resultado.regimenes?.[r.key]?.disponible && setRegSeleccionado(r.key)}
                />
              ))}
            </div>

            {resultado.regimenes[regSeleccionado]?.disponible && (
              <DesgloseImportacion data={resultado} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TabExportacion({ productos, paises }) {
  const [form, setForm] = useState({
    ncm_code: '', precio_producto: '', incoterm_base: 'FOB',
    incoterm_deseado: 'CIF', pais_destino: '',
    flete_interno: '', flete_internacional: '', seguro_internacional: '',
    gastos_portuarios: '', gastos_aduana: '',
    bonus_reintegro: false,
    pais_facturacion_diferente: false,
  })
  const [errores, setErrores] = useState({})
  const [calculando, setCalculando] = useState(false)
  const [resultado, setResultado] = useState(null)
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

    try {
      const res = await fetch('/api/calculadora/exportacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ncm_code: form.ncm_code.trim(),
          precio_producto: Number(form.precio_producto),
          incoterm_base: form.incoterm_base,
          incoterm_deseado: form.incoterm_deseado,
          pais_destino: form.pais_destino || null,
          flete_interno: Number(form.flete_interno) || null,
          flete_internacional: Number(form.flete_internacional) || null,
          seguro_internacional: Number(form.seguro_internacional) || null,
          gastos_portuarios: Number(form.gastos_portuarios) || null,
          gastos_aduana_exportacion: Number(form.gastos_aduana) || null,
          bonus_reintegro: form.bonus_reintegro || false,
          pais_facturacion_diferente: form.pais_facturacion_diferente || false,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Error de cálculo')
      setResultado(json.data)
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
                <input
                  type="checkbox"
                  checked={form.bonus_reintegro}
                  onChange={e => set('bonus_reintegro', e.target.checked)}
                  className="w-4 h-4 rounded border border-white/[0.2] bg-surface-highest accent"
                />
                <div className="flex-1">
                  <span className="font-body text-sm text-on-surface">Mi producto es orgánico / tiene denominación de origen / sello Alimentos Argentinos</span>
                  <p className="font-body text-[10px] text-on-surface-variant/60 mt-0.5">Activa bonus de +0.5% en el reintegro</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.pais_facturacion_diferente}
                  onChange={e => set('pais_facturacion_diferente', e.target.checked)}
                  className="w-4 h-4 rounded border border-white/[0.2] bg-surface-highest accent"
                />
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

        {resultado && <ResultadoExportacion resultado={resultado} />}
      </div>
    </div>
  )
}

function ResultadoExportacion({ resultado: r }) {
  const incotermsMostrar = ['EXW', 'FOB', 'CFR', 'CIF', 'DDP']

  return (
    <div className="space-y-4">
      <Card>
        <div className="text-center py-4">
          <p className="font-body text-xs font-semibold tracking-widest text-on-surface-variant uppercase">
            Precio {r.precio_calculado?.incoterm}
          </p>
          <p className="font-mono text-3xl text-on-surface font-semibold mt-2">
            {r.precio_calculado?.valor !== null ? usd(r.precio_calculado?.valor) : '—'}
          </p>
          {r.precio_calculado?.valor === null && (
            <p className="font-body text-xs text-on-surface-variant/60 mt-2">Datos insuficientes para este incoterm</p>
          )}
          <p className="font-body text-[11px] text-on-surface-variant/50 mt-3">
            {r.ncm_code} · {r.ncm_descripcion}
          </p>
        </div>
      </Card>

      <Card>
        <p className="font-body text-sm font-semibold tracking-widest text-on-surface-variant uppercase mb-4">Construcción del precio</p>

        <div className="space-y-1.5">
          <LineaDesglose
            label={`Precio base (${r.precio_base?.incoterm})`}
            monto={r.precio_base?.valor}
          />
          {r.costos_exportacion?.flete_interno > 0 && (
            <LineaDesglose label="+ Flete interno" monto={r.costos_exportacion.flete_interno} />
          )}
          {r.costos_exportacion?.gastos_portuarios > 0 && (
            <LineaDesglose label="+ Gastos portuarios" monto={r.costos_exportacion.gastos_portuarios} />
          )}
          {r.costos_exportacion?.gastos_aduana_exportacion > 0 && (
            <LineaDesglose label="+ Gastos de despacho" monto={r.costos_exportacion.gastos_aduana_exportacion} />
          )}
          <LineaDesglose label="= Precio FOB" monto={r.precio_fob} />

          {r.costos_exportacion?.derecho_exportacion?.monto > 0 && (
            <LineaDesglose
              label={`− Der. exportación (${pct(r.costos_exportacion.derecho_exportacion.alicuota * 100)})`}
              monto={r.costos_exportacion.derecho_exportacion.monto}
            />
          )}
          <LineaDesglose label="− Registro SIM" monto={r.costos_exportacion?.registro_sim} />

          <div className="h-px bg-white/[0.04] my-2" />
          <LineaDesglose label="Costo neto de exportación" monto={r.costo_neto_exportacion} />

          <div className="flex justify-between items-center py-1.5 mt-1">
            <span className="font-body text-xs text-on-surface font-semibold">Margen neto estimado</span>
            <span className={`font-mono text-sm font-semibold ${r.margen_neto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {usd(r.margen_neto)}
            </span>
          </div>

          {r.reintegro?.alicuota !== null && r.reintegro?.monto > 0 && (
            <LineaDesglose
              label={`+ Reintegro (${pct(r.reintegro.alicuota)}${r.reintegro.bonus_aplicado ? ' + bonus' : ''})`}
              monto={-r.reintegro.monto}
              className="text-emerald-400"
            />
          )}

          {r.percepcion_ganancias_expo?.aplica && (
            <LineaDesglose
              label={`− Percepción Ganancias expo (${pct(r.percepcion_ganancias_expo.alicuota)}): ${r.percepcion_ganancias_expo.motivo}`}
              monto={r.percepcion_ganancias_expo.monto}
              className="text-amber-400"
            />
          )}
        </div>
      </Card>

      <Card>
        <p className="font-body text-sm font-semibold tracking-widest text-on-surface-variant uppercase mb-4">Conversión de incoterms</p>
        <div className="grid grid-cols-2 gap-2">
          {incotermsMostrar.map(inc => {
            const valor = r.conversion_incoterms?.[inc]
            return (
              <div key={inc} className="flex justify-between items-center py-2 px-3 bg-white/[0.02] rounded-xl">
                <span className="font-body text-xs font-semibold tracking-wide text-on-surface-variant">{inc}</span>
                <span className={`font-mono text-xs ${valor === null ? 'text-on-surface-variant/40' : 'text-on-surface'}`}>
                  {valor !== null ? usd(valor) : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {r.arancel_destino && (
        <Card>
          <p className="font-body text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-2">Arancel en destino</p>
          <div className="flex items-center gap-3">
            <Badge variant="accent">
              {r.arancel_destino.ave_rate}% AVE
            </Badge>
            <span className="font-body text-xs text-on-surface-variant">
              {r.pais_destino} · HS {r.arancel_destino.hs_code} · {r.arancel_destino.fuente} {r.arancel_destino.year}
            </span>
          </div>
        </Card>
      )}

      {r.notas?.length > 0 && (
        <div className="bg-white/[0.02] rounded-2xl border border-white/[0.04] p-4 space-y-2">
          {r.notas.map((n, i) => (
            <p key={i} className="font-body text-[11px] text-on-surface-variant/70 leading-relaxed">{n}</p>
          ))}
        </div>
      )}

      <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
        <p className="font-body text-[11px] text-primary/80 leading-relaxed">
          Esta información es orientativa y está respaldada por fuentes oficiales. Para operaciones concretas, consultá con un despachante de aduana matriculado o un profesional de comercio exterior.
        </p>
      </div>
    </div>
  )
}
