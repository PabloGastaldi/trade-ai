'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './calculadora.module.css'

// ── Constantes ────────────────────────────────────────────────────────────────

const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CPT', 'CIF', 'CIP', 'DAP', 'DPU', 'DDP']

const CONDICIONES_IVA = [
  { value: 'responsable_inscripto', label: 'Responsable inscripto' },
  { value: 'monotributista',        label: 'Monotributista' },
  { value: 'consumidor_final',      label: 'Consumidor final' },
  { value: 'exento',                label: 'Exento' },
]

const REGIMENES_INFO = {
  general:    { label: 'Régimen General', desc: 'Despacho formal a plaza' },
  courier:    { label: 'Courier',         desc: 'Hasta USD 3.000 FOB' },
  pef:        { label: 'PEF Personal',    desc: 'Prestadores postales' },
  correo_upu: { label: 'Correo UPU',      desc: 'Correo Argentino' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function usd(n) {
  if (n === null || n === undefined) return '—'
  return 'USD ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pct(n) {
  if (n === null || n === undefined) return '—'
  return (Number(n) * 100).toFixed(1) + '%'
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CalculadoraClient({ productos, paises }) {
  const [tab, setTab] = useState('importacion') // 'importacion' | 'exportacion'

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.titulo}>Calculadora de costos</h1>
        <p className={styles.subtitulo}>Compará regímenes de importación y calculá costos de exportación</p>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'importacion' ? styles.tabActivo : ''}`}
          onClick={() => setTab('importacion')}
        >
          Importación
        </button>
        <button
          className={`${styles.tab} ${tab === 'exportacion' ? styles.tabActivo : ''}`}
          onClick={() => setTab('exportacion')}
        >
          Exportación
        </button>
      </div>

      {tab === 'importacion' ? (
        <TabImportacion productos={productos} paises={paises} />
      ) : (
        <TabExportacion productos={productos} paises={paises} />
      )}
    </div>
  )
}

// ── NCM Autocomplete (compartido entre ambos tabs) ────────────────────────────

function NcmAutocomplete({ value, onSelect, error }) {
  const [sugerencias, setSugerencias] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [visible, setVisible] = useState(false)
  const [descripcionSeleccionada, setDescripcionSeleccionada] = useState('')
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
    setDescripcionSeleccionada('')
    clearTimeout(debounceRef.current)
    if (val.trim().length < 2) { setSugerencias([]); setVisible(false); return }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true)
      const supabase = createClient()
      const esNum = /^\d/.test(val.trim())
      const { data } = esNum
        ? await supabase.from('ncm').select('ncm_code, description').ilike('ncm_code', `${val.trim()}%`).limit(5)
        : await supabase.from('ncm').select('ncm_code, description').ilike('description', `%${val.trim()}%`).limit(5)
      setSugerencias(data ?? [])
      setVisible((data ?? []).length > 0)
      setBuscando(false)
    }, 300)
  }

  function handleSelect(item) {
    onSelect(item)
    setDescripcionSeleccionada(item.description)
    setSugerencias([])
    setVisible(false)
  }

  return (
    <div className={styles.ncmWrap} ref={wrapRef}>
      <input
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        type="text"
        placeholder="Código NCM o descripción..."
        value={value}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => sugerencias.length > 0 && setVisible(true)}
        autoComplete="off"
      />
      {buscando && <span className={styles.ncmCargando}>buscando…</span>}
      {visible && (
        <div className={styles.ncmDropdown}>
          {sugerencias.map(s => (
            <button key={s.ncm_code} type="button" className={styles.ncmOpcion} onClick={() => handleSelect(s)}>
              <span className={styles.ncmCodigo}>{s.ncm_code}</span>
              <span className={styles.ncmDesc}>{s.description}</span>
            </button>
          ))}
        </div>
      )}
      {descripcionSeleccionada && !visible && (
        <p className={styles.ncmSeleccionado}>{descripcionSeleccionada}</p>
      )}
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}

// ── Selector de producto del catálogo ────────────────────────────────────────

function ProductoSelector({ productos, onSelect, operationType }) {
  const productosFiltrados = productos.filter(p =>
    !operationType || p.operation_type === operationType
  )
  if (productosFiltrados.length === 0) return null

  return (
    <div className={styles.campo}>
      <label className={styles.label}>Cargar desde catálogo <span className={styles.opcional}>opcional</span></label>
      <select
        className={styles.select}
        defaultValue=""
        onChange={e => {
          const p = productosFiltrados.find(x => x.id === e.target.value)
          if (p) onSelect(p)
        }}
      >
        <option value="">Seleccioná un producto…</option>
        {productosFiltrados.map(p => (
          <option key={p.id} value={p.id}>
            {p.name} — {p.ncm_code} ({p.incoterm} USD {Number(p.unit_price).toLocaleString('es-AR')})
          </option>
        ))}
      </select>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB IMPORTACIÓN
// ─────────────────────────────────────────────────────────────────────────────

function TabImportacion({ productos, paises }) {
  const [form, setForm] = useState({
    ncm_code: '',
    valor_fob: '',
    flete_internacional: '',
    seguro_internacional: '',
    estimarSeguro: true,
    pais_origen: '',
    condicion_iva: 'responsable_inscripto',
  })
  const [errores, setErrores] = useState({})
  const [calculando, setCalculando] = useState(false)
  const [resultados, setResultados] = useState(null) // { general, courier, pef, correo_upu }
  const [regSeleccionado, setRegSeleccionado] = useState('general')

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
    if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: null }))
  }

  function cargarDesdeProducto(p) {
    setForm(prev => ({
      ...prev,
      ncm_code: p.ncm_code,
      pais_origen: p.default_origin ?? '',
    }))
  }

  function validar() {
    const errs = {}
    if (!form.ncm_code.trim()) errs.ncm_code = 'El NCM es obligatorio'
    if (!form.valor_fob || Number(form.valor_fob) <= 0) errs.valor_fob = 'El valor FOB debe ser mayor a 0'
    return errs
  }

  async function handleCalcular(e) {
    e.preventDefault()
    const errs = validar()
    if (Object.keys(errs).length > 0) { setErrores(errs); return }

    setCalculando(true)
    setResultados(null)

    const seguro = form.estimarSeguro ? null : (Number(form.seguro_internacional) || null)

    try {
      const res = await fetch('/api/calculadora/importacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ncm_code:             form.ncm_code.trim(),
          valor_fob:            Number(form.valor_fob),
          flete_internacional:  Number(form.flete_internacional) || 0,
          seguro_internacional: seguro,
          pais_origen:          form.pais_origen || null,
          condicion_iva:        form.condicion_iva,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error de cálculo')
      setResultados(json)
    } catch (err) {
      setErrores({ _general: err.message })
    } finally {
      setCalculando(false)
    }
  }

  // Determinar la mejor opción (menor costo total)
  const mejorRegimen = resultados
    ? Object.entries(resultados)
        .filter(([, v]) => v.ok)
        .sort((a, b) => a[1].data.costo_total_usd - b[1].data.costo_total_usd)[0]?.[0]
    : null

  return (
    <div className={styles.layout}>
      {/* Formulario */}
      <form className={styles.formPanel} onSubmit={handleCalcular} noValidate>
        <ProductoSelector productos={productos} onSelect={cargarDesdeProducto} operationType="importacion" />

        <div className={styles.campo}>
          <label className={styles.label}>Posición NCM <span className={styles.req}>*</span></label>
          <NcmAutocomplete
            value={form.ncm_code}
            onSelect={item => set('ncm_code', item.ncm_code)}
            error={errores.ncm_code}
          />
        </div>

        <div className={styles.campo}>
          <label className={styles.label}>Valor FOB (USD) <span className={styles.req}>*</span></label>
          <input
            className={`${styles.input} ${errores.valor_fob ? styles.inputError : ''}`}
            type="number" min="0" step="0.01" placeholder="0.00"
            value={form.valor_fob}
            onChange={e => set('valor_fob', e.target.value)}
          />
          {errores.valor_fob && <span className={styles.errorMsg}>{errores.valor_fob}</span>}
        </div>

        <div className={styles.campo}>
          <label className={styles.label}>Flete internacional (USD)</label>
          <input
            className={styles.input}
            type="number" min="0" step="0.01" placeholder="0.00"
            value={form.flete_internacional}
            onChange={e => set('flete_internacional', e.target.value)}
          />
        </div>

        <div className={styles.campo}>
          <div className={styles.seguroHeader}>
            <label className={styles.label}>Seguro (USD)</label>
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={form.estimarSeguro}
                onChange={e => set('estimarSeguro', e.target.checked)}
                className={styles.checkbox}
              />
              Estimar 1% de (FOB + flete)
            </label>
          </div>
          {!form.estimarSeguro && (
            <input
              className={styles.input}
              type="number" min="0" step="0.01" placeholder="0.00"
              value={form.seguro_internacional}
              onChange={e => set('seguro_internacional', e.target.value)}
            />
          )}
        </div>

        <div className={styles.campo}>
          <label className={styles.label}>País de origen</label>
          <select className={styles.select} value={form.pais_origen} onChange={e => set('pais_origen', e.target.value)}>
            <option value="">Seleccioná país…</option>
            {paises.map(p => <option key={p.iso3} value={p.iso3}>{p.name_es}</option>)}
          </select>
        </div>

        <div className={styles.campo}>
          <label className={styles.label}>Condición ante IVA</label>
          <select className={styles.select} value={form.condicion_iva} onChange={e => set('condicion_iva', e.target.value)}>
            {CONDICIONES_IVA.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {errores._general && <p className={styles.errorGeneral}>{errores._general}</p>}

        <button type="submit" className={styles.btnCalcular} disabled={calculando}>
          {calculando ? <><span className={styles.spinner} /> Calculando…</> : 'Calcular'}
        </button>
      </form>

      {/* Resultados */}
      <div className={styles.resultadosPanel}>
        {!resultados && !calculando && (
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcono}>🧮</div>
            <p>Completá el formulario y presioná <strong>Calcular</strong></p>
          </div>
        )}

        {calculando && (
          <div className={styles.placeholder}>
            <div className={styles.loadingDots}>
              <span /><span /><span />
            </div>
            <p>Calculando costos…</p>
          </div>
        )}

        {resultados && (
          <>
            {/* Cards de regímenes */}
            <div className={styles.cardsGrid}>
              {Object.entries(REGIMENES_INFO).map(([regimen, info]) => {
                const r = resultados[regimen]
                const esMejor = regimen === mejorRegimen
                const disponible = r?.ok

                return (
                  <CardRegimen
                    key={regimen}
                    regimen={regimen}
                    info={info}
                    resultado={r}
                    esMejor={esMejor}
                    disponible={disponible}
                    seleccionado={regSeleccionado === regimen}
                    onClick={() => disponible && setRegSeleccionado(regimen)}
                  />
                )
              })}
            </div>

            {/* Desglose del régimen seleccionado */}
            {resultados[regSeleccionado]?.ok && (
              <DesgloseTributos resultado={resultados[regSeleccionado].data} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Card de régimen ───────────────────────────────────────────────────────────

function CardRegimen({ regimen, info, resultado, esMejor, disponible, seleccionado, onClick }) {
  if (!disponible) {
    return (
      <div className={`${styles.regimenCard} ${styles.regimenCardDisponible}`}>
        <div className={styles.regimenNombre}>{info.label}</div>
        <div className={styles.regimenNoDisp}>{resultado?.error ?? 'No disponible'}</div>
      </div>
    )
  }

  const d = resultado.data

  return (
    <div
      className={`${styles.regimenCard} ${esMejor ? styles.regimenCardMejor : ''} ${seleccionado ? styles.regimenCardSeleccionado : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      {esMejor && <div className={styles.mejorBadge}>✓ Mejor opción</div>}
      <div className={styles.regimenNombre}>{info.label}</div>
      <div className={styles.regimenDesc}>{info.desc}</div>
      <div className={styles.regimenTotal}>{usd(d.costo_total_usd)}</div>

      <div className={styles.regimenLineas}>
        <div className={styles.regimenLinea}>
          <span>FOB</span><span>{usd(d.valor_fob)}</span>
        </div>
        <div className={styles.regimenLinea}>
          <span>CIF</span><span>{usd(d.valor_cif)}</span>
        </div>

        {regimen === 'general' && d.desglose && (
          <>
            <div className={styles.regimenLinea}>
              <span>DI ({pct(d.desglose.derecho_importacion?.alicuota)})</span>
              <span>{usd(d.desglose.derecho_importacion?.monto)}</span>
            </div>
            <div className={styles.regimenLinea}>
              <span>IVA ({pct(d.desglose.iva?.alicuota)})</span>
              <span>{usd(d.desglose.iva?.monto)}</span>
            </div>
            {d.desglose.iva_adicional?.monto > 0 && (
              <div className={styles.regimenLinea}>
                <span>Perc. IVA ({pct(d.desglose.iva_adicional?.alicuota)})</span>
                <span>{usd(d.desglose.iva_adicional?.monto)}</span>
              </div>
            )}
            {d.desglose.percepcion_ganancias?.monto > 0 && (
              <div className={styles.regimenLinea}>
                <span>Gcias ({pct(d.desglose.percepcion_ganancias?.alicuota)})</span>
                <span>{usd(d.desglose.percepcion_ganancias?.monto)}</span>
              </div>
            )}
          </>
        )}

        {regimen !== 'general' && d.desglose?.tributo_unico && (
          <div className={styles.regimenLinea}>
            <span>Tributo único (50%)</span>
            <span>{usd(d.desglose.tributo_unico.monto)}</span>
          </div>
        )}
      </div>

      <div className={styles.regimenFooter}>
        <div className={styles.effectiveRate}>
          <span>Effective rate</span>
          <span className={styles.effectiveRateVal}>{d.effective_rate?.toFixed(1)}%</span>
        </div>
        {regimen !== 'general' && d.ahorro_vs_general !== null && d.ahorro_vs_general > 0 && (
          <div className={styles.ahorro}>Ahorro: {usd(d.ahorro_vs_general)}</div>
        )}
      </div>
    </div>
  )
}

// ── Desglose completo ─────────────────────────────────────────────────────────

function DesgloseTributos({ resultado }) {
  const [expandido, setExpandido] = useState(false)

  return (
    <div className={styles.desglose}>
      <button className={styles.desgloseToggle} onClick={() => setExpandido(prev => !prev)}>
        <span>Desglose completo</span>
        <svg
          className={`${styles.chevron} ${expandido ? styles.chevronOpen : ''}`}
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {expandido && (
        <div className={styles.desgloseCuerpo}>
          <table className={styles.desgloseTbl}>
            <tbody>
              <tr className={styles.desgloseSeccion}>
                <td colSpan={3}>Base</td>
              </tr>
              <tr>
                <td>Valor FOB</td><td></td><td className={styles.tdMonto}>{usd(resultado.valor_fob)}</td>
              </tr>
              <tr>
                <td>Flete internacional</td><td></td><td className={styles.tdMonto}>{usd(resultado.flete_internacional)}</td>
              </tr>
              <tr>
                <td>Seguro {resultado.seguro_estimado ? '(estimado)' : ''}</td><td></td><td className={styles.tdMonto}>{usd(resultado.seguro_internacional)}</td>
              </tr>
              <tr className={styles.desgloseSubtotal}>
                <td>Valor CIF</td><td></td><td className={styles.tdMonto}>{usd(resultado.valor_cif)}</td>
              </tr>

              {resultado.desglose && (
                <>
                  <tr className={styles.desgloseSeccion}>
                    <td colSpan={3}>Tributos</td>
                  </tr>
                  {Object.entries(resultado.desglose).map(([key, v]) => {
                    if (!v || v.monto === 0) return null
                    const labels = {
                      derecho_importacion: 'Derecho de importación',
                      tasa_estadistica: 'Tasa estadística',
                      iva: 'IVA importación',
                      iva_adicional: 'Perc. IVA adicional',
                      percepcion_ganancias: 'Perc. Ganancias',
                      impuestos_internos: 'Impuestos internos',
                      ingresos_brutos: 'Ingresos brutos',
                      tributo_unico: 'Tributo único',
                    }
                    return (
                      <tr key={key}>
                        <td>{labels[key] ?? key}</td>
                        <td className={styles.tdAlicuota}>{v.alicuota ? pct(v.alicuota) : ''}</td>
                        <td className={styles.tdMonto}>{usd(v.monto)}</td>
                      </tr>
                    )
                  })}
                  <tr className={styles.desgloseSubtotal}>
                    <td>Total tributos</td><td></td><td className={styles.tdMonto}>{usd(resultado.total_tributos)}</td>
                  </tr>
                </>
              )}

              <tr className={styles.desgloseTotalFinal}>
                <td>Costo total</td><td></td><td className={styles.tdMonto}>{usd(resultado.costo_total_usd)}</td>
              </tr>
            </tbody>
          </table>

          {resultado.preferencia_aplicada && (
            <div className={styles.desgloseNota}>
              ✓ Preferencia arancelaria: {resultado.preferencia_aplicada.acuerdo}
            </div>
          )}

          {resultado.notas?.map((n, i) => (
            <div key={i} className={styles.desgloseNota}>{n}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB EXPORTACIÓN
// ─────────────────────────────────────────────────────────────────────────────

function TabExportacion({ productos, paises }) {
  const [form, setForm] = useState({
    ncm_code: '',
    precio_producto: '',
    incoterm_base: 'FOB',
    incoterm_deseado: 'CIF',
    pais_destino: '',
    flete_interno: '',
    flete_internacional: '',
    seguro_internacional: '',
    gastos_portuarios: '',
    gastos_aduana: '',
  })
  const [errores, setErrores] = useState({})
  const [calculando, setCalculando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [gastosExpanded, setGastosExpanded] = useState(false)

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
    if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: null }))
  }

  function cargarDesdeProducto(p) {
    setForm(prev => ({
      ...prev,
      ncm_code: p.ncm_code,
      precio_producto: String(p.unit_price),
      incoterm_base: p.incoterm,
      pais_destino: p.default_destination ?? '',
    }))
  }

  function validar() {
    const errs = {}
    if (!form.ncm_code.trim()) errs.ncm_code = 'El NCM es obligatorio'
    if (!form.precio_producto || Number(form.precio_producto) <= 0) errs.precio_producto = 'El precio debe ser mayor a 0'
    return errs
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
          ncm_code:               form.ncm_code.trim(),
          precio_producto:        Number(form.precio_producto),
          incoterm_base:          form.incoterm_base,
          incoterm_deseado:       form.incoterm_deseado,
          pais_destino:           form.pais_destino || null,
          flete_interno:          Number(form.flete_interno) || null,
          flete_internacional:    Number(form.flete_internacional) || null,
          seguro_internacional:   Number(form.seguro_internacional) || null,
          gastos_portuarios:      Number(form.gastos_portuarios) || null,
          gastos_aduana_exportacion: Number(form.gastos_aduana) || null,
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
    <div className={styles.layout}>
      {/* Formulario */}
      <form className={styles.formPanel} onSubmit={handleCalcular} noValidate>
        <ProductoSelector productos={productos} onSelect={cargarDesdeProducto} operationType="exportacion" />

        <div className={styles.campo}>
          <label className={styles.label}>Posición NCM <span className={styles.req}>*</span></label>
          <NcmAutocomplete
            value={form.ncm_code}
            onSelect={item => set('ncm_code', item.ncm_code)}
            error={errores.ncm_code}
          />
        </div>

        <div className={styles.campo}>
          <label className={styles.label}>Precio del producto (USD) <span className={styles.req}>*</span></label>
          <input
            className={`${styles.input} ${errores.precio_producto ? styles.inputError : ''}`}
            type="number" min="0" step="0.01" placeholder="0.00"
            value={form.precio_producto}
            onChange={e => set('precio_producto', e.target.value)}
          />
          {errores.precio_producto && <span className={styles.errorMsg}>{errores.precio_producto}</span>}
        </div>

        <div className={styles.campoFila}>
          <div className={styles.campo} style={{ flex: 1 }}>
            <label className={styles.label}>Incoterm del precio</label>
            <select className={styles.select} value={form.incoterm_base} onChange={e => set('incoterm_base', e.target.value)}>
              {INCOTERMS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className={styles.campo} style={{ flex: 1 }}>
            <label className={styles.label}>Incoterm deseado</label>
            <select className={styles.select} value={form.incoterm_deseado} onChange={e => set('incoterm_deseado', e.target.value)}>
              {INCOTERMS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.campo}>
          <label className={styles.label}>País de destino</label>
          <select className={styles.select} value={form.pais_destino} onChange={e => set('pais_destino', e.target.value)}>
            <option value="">Seleccioná país…</option>
            {paises.map(p => <option key={p.iso3} value={p.iso3}>{p.name_es}</option>)}
          </select>
        </div>

        {/* Gastos opcionales expandibles */}
        <div className={styles.gastosSection}>
          <button
            type="button"
            className={styles.gastosToggle}
            onClick={() => setGastosExpanded(prev => !prev)}
          >
            <span>Gastos opcionales</span>
            <svg
              className={`${styles.chevron} ${gastosExpanded ? styles.chevronOpen : ''}`}
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {gastosExpanded && (
            <div className={styles.gastosGrid}>
              {[
                { campo: 'flete_interno',        label: 'Flete interno (USD)' },
                { campo: 'gastos_portuarios',     label: 'Gastos portuarios (USD)' },
                { campo: 'flete_internacional',   label: 'Flete internacional (USD)' },
                { campo: 'seguro_internacional',  label: 'Seguro internacional (USD)' },
                { campo: 'gastos_aduana',         label: 'Gastos de despacho (USD)' },
              ].map(({ campo, label }) => (
                <div key={campo} className={styles.campo}>
                  <label className={styles.label}>{label}</label>
                  <input
                    className={styles.input}
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={form[campo]}
                    onChange={e => set(campo, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {errores._general && <p className={styles.errorGeneral}>{errores._general}</p>}

        <button type="submit" className={styles.btnCalcular} disabled={calculando}>
          {calculando ? <><span className={styles.spinner} /> Calculando…</> : 'Calcular'}
        </button>
      </form>

      {/* Resultados */}
      <div className={styles.resultadosPanel}>
        {!resultado && !calculando && (
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcono}>📦</div>
            <p>Completá el formulario y presioná <strong>Calcular</strong></p>
          </div>
        )}

        {calculando && (
          <div className={styles.placeholder}>
            <div className={styles.loadingDots}><span /><span /><span /></div>
            <p>Calculando costos…</p>
          </div>
        )}

        {resultado && <ResultadoExportacion resultado={resultado} />}
      </div>
    </div>
  )
}

// ── Resultado exportación ─────────────────────────────────────────────────────

function ResultadoExportacion({ resultado }) {
  const r = resultado

  return (
    <div className={styles.expoResultados}>
      {/* Card principal */}
      <div className={styles.expoPrecioCard}>
        <div className={styles.expoPrecioLabel}>
          Precio {r.precio_calculado.incoterm}
        </div>
        <div className={styles.expoPrecioValor}>
          {r.precio_calculado.valor !== null ? usd(r.precio_calculado.valor) : '—'}
        </div>
        {r.precio_calculado.valor === null && (
          <p className={styles.expoNoDato}>Datos insuficientes para calcular este incoterm</p>
        )}
        <div className={styles.expoPrecioSub}>
          NCM {r.ncm_code} · {r.ncm_descripcion}
        </div>
      </div>

      {/* Desglose construcción del precio */}
      <div className={styles.expoDesglose}>
        <div className={styles.expoDesgloseTitle}>Construcción del precio</div>
        <table className={styles.desgloseTbl}>
          <tbody>
            <tr>
              <td>Precio base ({r.precio_base.incoterm})</td>
              <td className={styles.tdMonto}>{usd(r.precio_base.valor)}</td>
            </tr>
            {r.costos_exportacion.flete_interno !== null && (
              <tr>
                <td>+ Flete interno</td>
                <td className={styles.tdMonto}>{usd(r.costos_exportacion.flete_interno)}</td>
              </tr>
            )}
            {r.costos_exportacion.gastos_portuarios !== null && (
              <tr>
                <td>+ Gastos portuarios</td>
                <td className={styles.tdMonto}>{usd(r.costos_exportacion.gastos_portuarios)}</td>
              </tr>
            )}
            {r.costos_exportacion.gastos_aduana_exportacion !== null && (
              <tr>
                <td>+ Gastos de despacho</td>
                <td className={styles.tdMonto}>{usd(r.costos_exportacion.gastos_aduana_exportacion)}</td>
              </tr>
            )}
            <tr className={styles.desgloseSubtotal}>
              <td>= Precio FOB</td>
              <td className={styles.tdMonto}>{usd(r.precio_fob)}</td>
            </tr>
            {r.costos_exportacion.derecho_exportacion?.monto > 0 && (
              <tr className={styles.tdRest}>
                <td>− Der. exportación ({pct(r.costos_exportacion.derecho_exportacion.alicuota)})</td>
                <td className={styles.tdMonto}>−{usd(r.costos_exportacion.derecho_exportacion.monto)}</td>
              </tr>
            )}
            <tr>
              <td>− Registro SIM</td>
              <td className={styles.tdMonto}>−{usd(r.costos_exportacion.registro_sim)}</td>
            </tr>
            <tr className={styles.desgloseTotalFinal}>
              <td>Costo neto de exportación</td>
              <td className={styles.tdMonto}>{usd(r.costo_neto_exportacion)}</td>
            </tr>
            <tr className={styles.desgloseMargen}>
              <td>Margen neto estimado</td>
              <td className={`${styles.tdMonto} ${r.margen_neto >= 0 ? styles.positivo : styles.negativo}`}>
                {usd(r.margen_neto)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tabla conversión incoterms */}
      <div className={styles.expoIncoterms}>
        <div className={styles.expoDesgloseTitle}>Conversión de incoterms</div>
        <div className={styles.incotermsGrid}>
          {Object.entries(r.conversion_incoterms)
            .filter(([k]) => !k.startsWith('_')) // ocultar claves internas
            .map(([incoterm, valor]) => (
              <div key={incoterm} className={`${styles.incotermItem} ${valor === null ? styles.incotermItemNull : ''}`}>
                <span className={styles.incotermLabel}>{incoterm}</span>
                <span className={styles.incotermValor}>{valor !== null ? usd(valor) : 'Sin datos'}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Arancel destino */}
      {r.arancel_destino && (
        <div className={styles.arancelDestino}>
          <span className={styles.adLabel}>Arancel en destino ({r.pais_destino})</span>
          <span className={styles.adValor}>
            {r.arancel_destino.ave_rate !== null ? `${r.arancel_destino.ave_rate}% AVE` : 'Sin dato'}
            <span className={styles.adFuente}> · {r.arancel_destino.fuente} {r.arancel_destino.year}</span>
          </span>
        </div>
      )}

      {/* Notas */}
      {r.notas?.length > 0 && (
        <div className={styles.notasBox}>
          {r.notas.map((n, i) => <p key={i} className={styles.nota}>{n}</p>)}
        </div>
      )}
    </div>
  )
}
