'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Search, Loader2, Check } from 'lucide-react'
import { formatearNCMDisplay } from '@/lib/ncm-lookup'
import ImportReport from './ImportReport'

// Orígenes de importación más frecuentes (se muestran primero).
const PAISES_FRECUENTES = ['CHN', 'BRA', 'USA', 'DEU', 'ITA', 'ESP', 'MEX', 'IND']

const PASOS = ['Producto', 'Origen', 'Costo']

const FORM_VACIO = { ncm: '', ncmDescripcion: '', origen: '', origenNombre: '', valor: '', flete: '', peso: '', modo: 'maritimo', regimen: 'courier_personal' }

// Determina la clase de animación según la dirección de navegación.
// Respeta prefers-reduced-motion leyendo el media query en JS.
function useStepTransitionClass(step) {
  const prevStep = useRef(step)
  const [animClass, setAnimClass] = useState('')
  const prefersReduced = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    if (prefersReduced.current) {
      prevStep.current = step
      return
    }
    const dir = step > prevStep.current ? 'step-enter-forward' : 'step-enter-back'
    setAnimClass(dir)
    prevStep.current = step
    // Elimina la clase después de que concluye la animación para que no interfiera
    // con cambios de step futuros.
    const t = setTimeout(() => setAnimClass(''), 260)
    return () => clearTimeout(t)
  }, [step])

  return animClass
}

export default function ImportarClient({ paises }) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState(FORM_VACIO)
  const [report, setReport] = useState(null)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState(null)

  const searchParams = useSearchParams()
  const animClass = useStepTransitionClass(step)

  function patch(p) { setData(d => ({ ...d, ...p })) }

  function avanzar() { setStep(s => Math.min(3, s + 1)) }
  function retroceder() { setStep(s => Math.max(1, s - 1)) }

  async function generar(d) {
    setGenerando(true)
    setError(null)
    try {
      const [simRes, calcRes] = await Promise.all([
        fetch('/api/simulador', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigo_ncm: d.ncm, pais_iso3: d.origen, regimen: mapSimulador(d.regimen) }),
        }),
        fetch('/api/calculadora/importacion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ncm_code: d.ncm,
            valor_fob: Number(d.valor),
            flete_internacional: Number(d.flete) || 0,
            pais_origen: d.origen,
            condicion_iva: 'responsable_inscripto',
            regimen: d.regimen ?? null,
            ...(d.peso ? { peso_kg: Number(d.peso) } : {}),
            modo: d.modo ?? 'maritimo',
          }),
        }),
      ])
      const sim = await simRes.json()
      const calc = await calcRes.json()
      if (!simRes.ok) throw new Error(sim.error ?? 'No se pudo generar el informe.')
      if (!calcRes.ok || !calc.ok) throw new Error(calc.error ?? 'No se pudo calcular el costo.')
      setReport({ sim, calc: calc.data, meta: { ...d } })
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerando(false)
    }
  }

  const generarInforme = () => generar(data)

  // Link compartible (sin DB): si la URL trae ncm + pais + valor, regenera el informe directo.
  useEffect(() => {
    const ncm = searchParams.get('ncm')
    const pais = searchParams.get('pais')
    const valor = searchParams.get('valor')
    if (!ncm || !pais || !valor) return
    const origenNombre = paises.find(p => p.iso3 === pais)?.name_es ?? pais
    const flete = searchParams.get('flete') || ''
    const regimen = searchParams.get('regimen') || 'courier_personal'
    ;(async () => {
      let ncmDescripcion = `NCM ${ncm}`
      try {
        const r = await fetch(`/api/ncm-search?q=${encodeURIComponent(ncm.replace(/\D/g, ''))}`)
        const arr = await r.json()
        if (Array.isArray(arr) && arr[0]?.description) ncmDescripcion = arr[0].description
      } catch {}
      generar({ ncm, ncmDescripcion, origen: pais, origenNombre, valor, flete, regimen })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (report) {
    return (
      <ImportReport
        report={report}
        paises={paises}
        onReset={() => { setReport(null); setData(FORM_VACIO); setStep(1) }}
      />
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Eyebrow + progreso */}
      <p className="font-body text-sm font-medium text-on-surface-variant mb-4">
        Paso {step} de 3 · {PASOS[step - 1]}
      </p>
      <div className="flex items-center gap-2 mb-8">
        {PASOS.map((label, i) => {
          const n = i + 1
          const done = n < step
          const active = n === step
          return (
            <div key={label} className="flex items-center gap-2">
              <span className={`flex items-center gap-2 font-body text-xs ${active ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-medium ${
                  done ? 'bg-on-surface text-on-primary' : active ? 'bg-primary text-on-primary' : 'bg-surface-2 text-on-surface-variant'
                }`}>
                  {done ? <Check size={12} /> : n}
                </span>
                {label}
              </span>
              {i < PASOS.length - 1 && <span className="text-ink-tertiary">·</span>}
            </div>
          )
        })}
      </div>

      {step > 1 && (
        <button
          onClick={retroceder}
          className="flex items-center gap-1.5 font-body text-xs text-on-surface-variant hover:text-on-surface transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft size={14} /> Atrás
        </button>
      )}

      {/* Contenedor animado: la clase cambia con cada navegación de paso */}
      <div key={step} className={animClass}>
        {step === 1 && (
          <ProductStep
            onSelect={(ncm, desc) => { patch({ ncm, ncmDescripcion: desc }); avanzar() }}
          />
        )}
        {step === 2 && (
          <OriginStep
            paises={paises}
            onSelect={(iso3, nombre) => { patch({ origen: iso3, origenNombre: nombre }); avanzar() }}
          />
        )}
        {step === 3 && (
          <ValueStep
            data={data}
            patch={patch}
            onSubmit={generarInforme}
            generando={generando}
            error={error}
          />
        )}
      </div>
    </div>
  )
}

const EJEMPLOS_PRODUCTO = [
  'Aceite de oliva',
  'Bomba centrífuga 2HP',
  'Zapatillas de cuero',
  'Resina de polietileno',
]

function ProductStep({ onSelect }) {
  const [texto, setTexto] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [candidatos, setCandidatos] = useState(null)
  const [nota, setNota] = useState(null)

  async function buscar(e) {
    e.preventDefault()
    if (!texto.trim()) return
    setBuscando(true)
    setCandidatos(null)
    setNota(null)
    try {
      const res = await fetch('/api/nomenclador/clasificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto: texto.trim(), estado: 'terminado' }),
      })
      const json = await res.json()
      setCandidatos(json.candidatos ?? [])
      setNota(json.nota ?? null)
    } catch {
      setNota('No se pudo clasificar el producto. Probá de nuevo.')
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl md:text-5xl font-medium tracking-[-1.5px] text-on-surface mb-3 leading-[1.06]">
        ¿Qué querés importar?
      </h1>
      <p className="font-body text-lg text-on-surface-variant max-w-xl tracking-[-0.1px] mb-7">
        Describilo en tus palabras. Lo clasificamos en la NCM, aplicamos las preferencias de origen
        y te calculamos el costo de nacionalización.
      </p>

      <form onSubmit={buscar} className="flex gap-2.5 mb-4">
        <div className="flex-1 flex items-center gap-3 bg-surface-1 border border-hairline rounded-md px-4 transition-colors focus-within:border-on-surface">
          <Search size={18} className="text-ink-tertiary shrink-0" />
          <input
            autoFocus
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Ej: notebook 14 pulgadas con SSD"
            aria-label="Describí el producto"
            className="flex-1 bg-transparent py-[15px] font-body text-base text-on-surface placeholder:text-ink-tertiary outline-none border-0"
          />
        </div>
        <button
          type="submit"
          disabled={buscando || !texto.trim()}
          className="px-5 min-h-[48px] rounded-md bg-primary text-on-primary font-body text-sm font-medium flex items-center gap-2 disabled:opacity-40 transition-opacity cursor-pointer whitespace-nowrap"
        >
          {buscando ? <Loader2 size={16} className="animate-spin" /> : null}
          Clasificar
          {!buscando && <ArrowRight size={16} />}
        </button>
      </form>

      <div className="flex items-center gap-2 flex-wrap mb-8">
        <span className="font-body text-sm text-ink-subtle">Probá con:</span>
        {EJEMPLOS_PRODUCTO.map(ejemplo => (
          <button
            key={ejemplo}
            type="button"
            onClick={() => setTexto(ejemplo)}
            className="font-body text-sm text-on-surface-variant bg-surface-1 border border-hairline rounded-sm px-3.5 py-[7px] hover:border-ink-tertiary hover:text-on-surface transition-colors cursor-pointer"
          >
            {ejemplo}
          </button>
        ))}
      </div>

      {candidatos && candidatos.length > 0 && (
        <div className="space-y-2">
          <p className="font-body text-xs text-on-surface-variant mb-1">Elegí el que mejor describe tu producto:</p>
          {candidatos.map((c) => {
            // Las descripciones NCM son jerárquicas ("--De algodón"): se sacan los
            // guiones de indentación. El razonamiento de la IA diferencia opciones similares.
            const titulo = (c.ncm_exacto?.descripcion ?? '').replace(/^[\s.\-–—]+/, '').trim()
              || c.razonamiento || `Posición ${c.codigo_ncm}`
            const detalle = c.razonamiento && c.razonamiento !== titulo ? c.razonamiento : null
            return (
              <button
                key={c.codigo_ncm}
                onClick={() => onSelect(c.codigo_ncm, titulo)}
                className="w-full text-left p-4 bg-surface-1 border border-hairline rounded-md hover:border-on-surface transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-body text-[11px] uppercase tracking-wide text-ink-tertiary block">NCM</span>
                    <span className="font-mono text-lg font-medium text-on-surface block leading-tight">{formatearNCMDisplay(c.codigo_ncm)}</span>
                    <span className="font-body text-sm text-on-surface mt-1.5 block">{titulo}</span>
                    {detalle && (
                      <span className="font-body text-xs text-on-surface-variant mt-0.5 block">{detalle}</span>
                    )}
                  </div>
                  <ArrowRight size={16} className="text-ink-tertiary group-hover:text-on-surface shrink-0 transition-colors mt-1" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {candidatos && candidatos.length === 0 && (
        <p className="font-body text-sm text-on-surface-variant p-4 bg-surface-2 rounded-md">
          {nota ?? 'No encontramos coincidencias. Probá describir el producto de otra forma.'}
        </p>
      )}
    </div>
  )
}

function OriginStep({ paises, onSelect }) {
  const frecuentes = PAISES_FRECUENTES
    .map(iso3 => paises.find(p => p.iso3 === iso3))
    .filter(Boolean)

  return (
    <div>
      <h1 className="font-display text-4xl md:text-5xl font-medium tracking-[-1.5px] text-on-surface mb-3 leading-[1.06]">
        ¿De dónde lo traés?
      </h1>
      <p className="font-body text-lg text-on-surface-variant tracking-[-0.1px] mb-7">
        Elegí el país desde donde vas a importar.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {frecuentes.map(p => (
          <button
            key={p.iso3}
            onClick={() => onSelect(p.iso3, p.name_es)}
            className="px-4 py-2 rounded-md bg-surface-1 border border-hairline font-body text-sm text-on-surface hover:border-on-surface transition-colors cursor-pointer"
          >
            {p.name_es}
          </button>
        ))}
      </div>

      <label className="block font-body text-xs text-on-surface-variant mb-1.5">¿Otro país?</label>
      <select
        defaultValue=""
        onChange={e => {
          const p = paises.find(x => x.iso3 === e.target.value)
          if (p) onSelect(p.iso3, p.name_es)
        }}
        className="w-full bg-surface-1 border border-hairline rounded-md px-4 py-3 font-body text-sm text-on-surface focus:border-on-surface outline-none transition-colors cursor-pointer"
      >
        <option value="">Seleccionar país…</option>
        {paises.map(p => <option key={p.iso3} value={p.iso3}>{p.name_es}</option>)}
      </select>
    </div>
  )
}

const MODOS_ENVIO = [
  { key: 'maritimo', label: 'Marítimo' },
  { key: 'aereo',    label: 'Aéreo' },
]

const OPCIONES_REGIMEN = [
  { key: 'courier_personal',  label: 'Courier — uso personal',            help: 'Franquicia USD 400, hasta USD 3.000. La opción más común.' },
  { key: 'courier_comercial', label: 'Courier — empresa',                 help: 'E-commerce/empresa, hasta USD 3.000. Sin franquicia.' },
  { key: 'general',           label: 'Despacho formal (Régimen General)', help: 'Importación formal con despachante, sin tope de valor.' },
]

// Maps the UI regime key to the simulador REGIMENES_VALIDOS values.
// Simulador accepts 'general' and 'courier', not the specific courier sub-types.
const mapSimulador = (r) => r === 'general' ? 'general' : 'courier'

function ValueStep({ data, patch, onSubmit, generando, error }) {
  const valido = Number(data.valor) > 0

  return (
    <div>
      <h1 className="font-display text-4xl md:text-5xl font-medium tracking-[-1.5px] text-on-surface mb-3 leading-[1.06]">
        ¿Cuánto cuesta?
      </h1>
      <p className="font-body text-lg text-on-surface-variant tracking-[-0.1px] mb-7">
        El valor que te cobra el proveedor por la mercadería, sin contar el envío.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block font-body text-xs text-on-surface-variant mb-1.5">Valor de la mercadería (USD)</label>
          <input
            autoFocus
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={data.valor}
            onChange={e => patch({ valor: e.target.value })}
            placeholder="0.00"
            className="w-full bg-surface-1 border border-hairline rounded-md px-4 py-3 font-mono text-sm text-on-surface placeholder:text-ink-tertiary focus:border-on-surface outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block font-body text-xs text-on-surface-variant mb-1.5">
            Modo de envío
          </label>
          <div className="flex gap-2">
            {MODOS_ENVIO.map(m => (
              <button
                key={m.key}
                type="button"
                onClick={() => patch({ modo: m.key })}
                className={`flex-1 py-2.5 rounded-md font-body text-sm border transition-colors cursor-pointer ${
                  data.modo === m.key
                    ? 'bg-surface-highest border-on-surface text-on-surface font-medium'
                    : 'bg-surface-1 border-hairline text-on-surface-variant hover:border-ink-tertiary'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-body text-xs text-on-surface-variant mb-1.5">
            Régimen de importación
          </label>
          <div className="flex flex-col gap-2">
            {OPCIONES_REGIMEN.map(op => (
              <button
                key={op.key}
                type="button"
                onClick={() => patch({ regimen: op.key })}
                className={`w-full text-left px-4 py-3 rounded-md font-body text-sm border transition-colors cursor-pointer ${
                  data.regimen === op.key
                    ? 'bg-surface-highest border-on-surface text-on-surface font-medium'
                    : 'bg-surface-1 border-hairline text-on-surface-variant hover:border-ink-tertiary'
                }`}
              >
                <span className="block">{op.label}</span>
                <span className="block font-body text-xs text-ink-subtle mt-0.5">{op.help}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-body text-xs text-on-surface-variant mb-1.5">
            Peso total (kg) <span className="text-ink-tertiary">— opcional</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            value={data.peso}
            onChange={e => patch({ peso: e.target.value })}
            placeholder="Si no lo sabés, lo estimamos"
            className="w-full bg-surface-1 border border-hairline rounded-md px-4 py-3 font-mono text-sm text-on-surface placeholder:text-ink-tertiary focus:border-on-surface outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block font-body text-xs text-on-surface-variant mb-1.5">
            Flete internacional (USD) <span className="text-ink-tertiary">— opcional</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={data.flete}
            onChange={e => patch({ flete: e.target.value })}
            placeholder="Si ya lo sabés, ingresalo acá"
            className="w-full bg-surface-1 border border-hairline rounded-md px-4 py-3 font-mono text-sm text-on-surface placeholder:text-ink-tertiary focus:border-on-surface outline-none transition-colors"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 rounded-md border border-red-500/20">
          <p className="font-body text-xs text-red-600">{error}</p>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={!valido || generando}
        className="w-full mt-6 py-3 rounded-md bg-primary text-on-primary font-body text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity cursor-pointer"
      >
        {generando ? <><Loader2 size={16} className="animate-spin" /> Generando informe…</> : 'Ver mi informe'}
      </button>
    </div>
  )
}
