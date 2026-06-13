'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Search, Loader2, Check } from 'lucide-react'
import ImportReport from './ImportReport'

// Orígenes de importación más frecuentes (se muestran primero).
const PAISES_FRECUENTES = ['CHN', 'BRA', 'USA', 'DEU', 'ITA', 'ESP', 'MEX', 'IND']

const PASOS = ['Producto', 'Origen', 'Costo']

const FORM_VACIO = { ncm: '', ncmDescripcion: '', origen: '', origenNombre: '', valor: '', flete: '' }

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
          body: JSON.stringify({ codigo_ncm: d.ncm, pais_iso3: d.origen, regimen: 'general' }),
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
    ;(async () => {
      let ncmDescripcion = `NCM ${ncm}`
      try {
        const r = await fetch(`/api/ncm-search?q=${encodeURIComponent(ncm.replace(/\D/g, ''))}`)
        const arr = await r.json()
        if (Array.isArray(arr) && arr[0]?.description) ncmDescripcion = arr[0].description
      } catch {}
      generar({ ncm, ncmDescripcion, origen: pais, origenNombre, valor, flete })
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
      {/* Progreso */}
      <div className="flex items-center gap-2 mb-8">
        {PASOS.map((label, i) => {
          const n = i + 1
          const done = n < step
          const active = n === step
          return (
            <div key={label} className="flex items-center gap-2">
              <span className={`flex items-center gap-2 font-body text-xs ${active ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-medium ${
                  done ? 'bg-primary text-on-primary' : active ? 'bg-primary text-on-primary' : 'bg-white/[0.06] text-on-surface-variant'
                }`}>
                  {done ? <Check size={12} /> : n}
                </span>
                {label}
              </span>
              {i < PASOS.length - 1 && <span className="text-on-surface-variant/30">·</span>}
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
      <h1 className="font-display text-4xl text-on-surface mb-2">¿Qué querés importar?</h1>
      <p className="font-body text-sm text-on-surface-variant mb-6">
        Describilo en tus palabras. Nosotros lo clasificamos por vos.
      </p>

      <form onSubmit={buscar} className="flex gap-2 mb-6">
        <input
          autoFocus
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Ej: zapatillas deportivas de cuero"
          className="flex-1 bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-transparent focus:border-primary/40 outline-none transition-all"
        />
        <button
          type="submit"
          disabled={buscando || !texto.trim()}
          className="px-5 rounded-xl bg-primary-intense text-on-primary font-body text-sm font-semibold flex items-center gap-2 disabled:opacity-40 transition-opacity cursor-pointer"
        >
          {buscando ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Buscar
        </button>
      </form>

      {candidatos && candidatos.length > 0 && (
        <div className="space-y-2">
          <p className="font-body text-xs text-on-surface-variant mb-1">Elegí el que mejor describe tu producto:</p>
          {candidatos.map((c) => {
            const desc = c.ncm_exacto?.descripcion ?? c.razonamiento ?? c.codigo_ncm
            return (
              <button
                key={c.codigo_ncm}
                onClick={() => onSelect(c.codigo_ncm, desc)}
                className="w-full text-left p-4 bg-white/[0.03] border border-white/[0.04] rounded-xl hover:border-primary/40 hover:bg-white/[0.05] transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-body text-sm text-on-surface">{desc}</span>
                  <ArrowRight size={16} className="text-on-surface-variant/40 group-hover:text-primary shrink-0 transition-colors" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {candidatos && candidatos.length === 0 && (
        <p className="font-body text-sm text-on-surface-variant/70 p-4 bg-white/[0.02] rounded-xl">
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
      <h1 className="font-display text-4xl text-on-surface mb-2">¿De dónde lo traés?</h1>
      <p className="font-body text-sm text-on-surface-variant mb-6">
        Elegí el país desde donde vas a importar.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {frecuentes.map(p => (
          <button
            key={p.iso3}
            onClick={() => onSelect(p.iso3, p.name_es)}
            className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.04] font-body text-sm text-on-surface hover:border-primary/40 hover:bg-white/[0.05] transition-all cursor-pointer"
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
        className="w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface border border-transparent focus:border-primary/40 outline-none transition-all cursor-pointer"
      >
        <option value="">Seleccionar país…</option>
        {paises.map(p => <option key={p.iso3} value={p.iso3}>{p.name_es}</option>)}
      </select>
    </div>
  )
}

function ValueStep({ data, patch, onSubmit, generando, error }) {
  const valido = Number(data.valor) > 0

  return (
    <div>
      <h1 className="font-display text-4xl text-on-surface mb-2">¿Cuánto cuesta?</h1>
      <p className="font-body text-sm text-on-surface-variant mb-6">
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
            className="w-full bg-surface-highest rounded-xl px-4 py-3 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-transparent focus:border-primary/40 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block font-body text-xs text-on-surface-variant mb-1.5">
            Flete internacional (USD) <span className="text-on-surface-variant/50">— opcional</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={data.flete}
            onChange={e => patch({ flete: e.target.value })}
            placeholder="Si no lo sabés, lo estimamos"
            className="w-full bg-surface-highest rounded-xl px-4 py-3 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-transparent focus:border-primary/40 outline-none transition-all"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 rounded-xl border border-red-500/10">
          <p className="font-body text-xs text-red-400">{error}</p>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={!valido || generando}
        className="w-full mt-6 py-3 rounded-xl bg-primary-intense text-on-primary font-body text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity cursor-pointer"
      >
        {generando ? <><Loader2 size={16} className="animate-spin" /> Generando informe…</> : 'Ver mi informe'}
      </button>
    </div>
  )
}
