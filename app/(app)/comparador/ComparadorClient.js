'use client'

import { useState, useMemo } from 'react'
import s from './comparador.module.css'

// ── Listas de países ───────────────────────────────────────────────────────────

// Países disponibles para comparación (reporters NTM + destinos principales Argentina)
// Para exportación: destinos donde Argentina exporta
// Para importación: orígenes que exportan a Argentina

const PAISES_EXPO = [
  // MERCOSUR
  { iso3: 'BRA', name: 'Brasil',         region: 'mercosur' },
  { iso3: 'URY', name: 'Uruguay',        region: 'mercosur' },
  { iso3: 'PRY', name: 'Paraguay',       region: 'mercosur' },
  // Latam
  { iso3: 'CHL', name: 'Chile',          region: 'latam' },
  { iso3: 'PER', name: 'Perú',           region: 'latam' },
  { iso3: 'COL', name: 'Colombia',       region: 'latam' },
  { iso3: 'ECU', name: 'Ecuador',        region: 'latam' },
  { iso3: 'MEX', name: 'México',         region: 'latam' },
  { iso3: 'BOL', name: 'Bolivia',        region: 'latam' },
  { iso3: 'VEN', name: 'Venezuela',      region: 'latam' },
  { iso3: 'CRI', name: 'Costa Rica',     region: 'latam' },
  { iso3: 'PAN', name: 'Panamá',         region: 'latam' },
  { iso3: 'GTM', name: 'Guatemala',      region: 'latam' },
  // Europa
  { iso3: 'DEU', name: 'Alemania',       region: 'europa' },
  { iso3: 'ESP', name: 'España',         region: 'europa' },
  { iso3: 'ITA', name: 'Italia',         region: 'europa' },
  { iso3: 'FRA', name: 'Francia',        region: 'europa' },
  { iso3: 'NLD', name: 'Países Bajos',   region: 'europa' },
  { iso3: 'GBR', name: 'Gran Bretaña',   region: 'europa' },
  { iso3: 'POL', name: 'Polonia',        region: 'europa' },
  // Asia / Oceanía
  { iso3: 'CHN', name: 'China',          region: 'asia' },
  { iso3: 'JPN', name: 'Japón',          region: 'asia' },
  { iso3: 'KOR', name: 'Corea del Sur',  region: 'asia' },
  { iso3: 'IND', name: 'India',          region: 'asia' },
  { iso3: 'IDN', name: 'Indonesia',      region: 'asia' },
  { iso3: 'THA', name: 'Tailandia',      region: 'asia' },
  { iso3: 'VNM', name: 'Vietnam',        region: 'asia' },
  { iso3: 'AUS', name: 'Australia',      region: 'asia' },
  // Otros
  { iso3: 'USA', name: 'Estados Unidos', region: 'otros' },
  { iso3: 'CAN', name: 'Canadá',         region: 'otros' },
  { iso3: 'ZAF', name: 'Sudáfrica',      region: 'otros' },
  { iso3: 'EGY', name: 'Egipto',         region: 'otros' },
  { iso3: 'ISR', name: 'Israel',         region: 'otros' },
  { iso3: 'MAR', name: 'Marruecos',      region: 'otros' },
  { iso3: 'NGA', name: 'Nigeria',        region: 'otros' },
  { iso3: 'SAU', name: 'Arabia Saudita', region: 'otros' },
  { iso3: 'ARE', name: 'Emiratos Árabes', region: 'otros' },
  { iso3: 'RUS', name: 'Rusia',          region: 'otros' },
  { iso3: 'TUR', name: 'Turquía',        region: 'otros' },
]

// Importación: misma lista que exportación.
// Los países con acuerdo (BRA, URY, PRY, CHL, PER, COL, ECU, MEX, IND, VEN)
// muestran costo con preferencia arancelaria. Los demás aplican AEC (igual para todos).
const PAISES_IMPO = PAISES_EXPO

const REGIONES = [
  { key: 'todos',    label: 'Todos' },
  { key: 'mercosur', label: 'Mercosur' },
  { key: 'latam',    label: 'Latam' },
  { key: 'europa',   label: 'Europa' },
  { key: 'asia',     label: 'Asia' },
  { key: 'otros',    label: 'Otros' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

// ISO3 → ISO2 para flagcdn.com (entrega imágenes SVG de banderas)
const ISO3_TO_ISO2 = {
  BRA:'br', URY:'uy', PRY:'py', CHL:'cl', PER:'pe', COL:'co', ECU:'ec',
  MEX:'mx', BOL:'bo', VEN:'ve', CRI:'cr', PAN:'pa', GTM:'gt', DEU:'de',
  ESP:'es', ITA:'it', FRA:'fr', NLD:'nl', GBR:'gb', POL:'pl', CHN:'cn',
  JPN:'jp', KOR:'kr', IND:'in', IDN:'id', THA:'th', VNM:'vn', AUS:'au',
  USA:'us', CAN:'ca', ZAF:'za', EGY:'eg', ISR:'il', MAR:'ma', NGA:'ng',
  SAU:'sa', ARE:'ae', RUS:'ru', TUR:'tr',
}

function FlagImg({ iso3 }) {
  const iso2 = ISO3_TO_ISO2[iso3]
  if (!iso2) return <span style={{ fontSize: '1.4rem' }}>🌐</span>
  return (
    <img
      src={`https://flagcdn.com/w40/${iso2}.png`}
      width={28}
      height={20}
      alt={iso3}
      style={{ borderRadius: 2, objectFit: 'cover' }}
    />
  )
}

function fmtUSD(n) {
  if (n === null || n === undefined) return null
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ── Componente Modal de desglose ───────────────────────────────────────────────

function ModalDesglose({ resultado, tipo, onClose }) {
  if (!resultado) return null
  const { data, pais_iso3 } = resultado
  const pais = tipo === 'exportacion'
    ? PAISES_EXPO.find(p => p.iso3 === pais_iso3)
    : PAISES_IMPO.find(p => p.iso3 === pais_iso3)

  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <div className={s.modalTitulo}>
            <FlagImg iso3={pais_iso3} /> {pais?.name ?? pais_iso3}
            <span className={s.modalBadge}>{tipo === 'exportacion' ? 'Exportación' : 'Importación'}</span>
          </div>
          <button className={s.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={s.modalCuerpo}>
          {tipo === 'exportacion' ? (
            <DesgloseExpo data={data} />
          ) : (
            <DesgloseImpo data={data} />
          )}
        </div>
      </div>
    </div>
  )
}

function DesgloseExpo({ data }) {
  const ci = data.conversion_incoterms ?? {}
  return (
    <>
      <div className={s.desglosePrecioRow}>
        <div className={s.desglosePrecioItem}>
          <span className={s.dpLabel}>EXW</span>
          <span className={s.dpValor}>{ci.EXW != null ? `USD ${fmtUSD(ci.EXW)}` : '—'}</span>
        </div>
        <div className={s.desglosePrecioItem}>
          <span className={s.dpLabel}>FOB</span>
          <span className={s.dpValor}>{ci.FOB != null ? `USD ${fmtUSD(ci.FOB)}` : '—'}</span>
        </div>
        <div className={s.desglosePrecioItem}>
          <span className={s.dpLabel}>CIF</span>
          <span className={s.dpValor}>{ci.CIF != null ? `USD ${fmtUSD(ci.CIF)}` : '—'}</span>
        </div>
      </div>

      {data.costos_exportacion && (
        <table className={s.desgloseTbl}>
          <tbody>
            <tr className={s.desgloseSeccion}>
              <td colSpan={2}>Costos de exportación</td>
            </tr>
            {data.costos_exportacion.derecho_exportacion?.monto > 0 && (
              <tr>
                <td>Derechos de exportación ({(data.costos_exportacion.derecho_exportacion.alicuota * 100).toFixed(0)}%)</td>
                <td className={s.tdMonto}>USD {fmtUSD(data.costos_exportacion.derecho_exportacion.monto)}</td>
              </tr>
            )}
            {data.costos_exportacion.registro_sim > 0 && (
              <tr>
                <td>Registro SIM/ROE</td>
                <td className={s.tdMonto}>USD {fmtUSD(data.costos_exportacion.registro_sim)}</td>
              </tr>
            )}
            <tr className={s.desgloseSubtotal}>
              <td>Costo neto exportación</td>
              <td className={s.tdMonto}>USD {fmtUSD(data.costo_neto_exportacion)}</td>
            </tr>
            <tr className={s.desgloseTotalFinal}>
              <td>Ingreso neto (precio − costos)</td>
              <td className={`${s.tdMonto} ${data.margen_neto >= 0 ? s.positivo : s.negativo}`}>
                USD {fmtUSD(data.margen_neto)}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {data.arancel_destino && (
        <div className={s.arancelDestino}>
          <span>Arancel destino (HS {data.arancel_destino.hs_code})</span>
          <span className={s.adValor}>
            {data.arancel_destino.ave_rate != null
              ? `${data.arancel_destino.ave_rate}% AVE`
              : 'Sin datos'
            }
            <span className={s.adFuente}> — WITS {data.arancel_destino.year}</span>
          </span>
        </div>
      )}

      {data.notas?.length > 0 && (
        <div className={s.notasBox}>
          {data.notas.slice(0, 4).map((n, i) => (
            <div key={i} className={s.nota}>{n}</div>
          ))}
        </div>
      )}
    </>
  )
}

function DesgloseImpo({ data }) {
  const d = data.desglose ?? {}
  return (
    <>
      <div className={s.desglosePrecioRow}>
        <div className={s.desglosePrecioItem}>
          <span className={s.dpLabel}>FOB</span>
          <span className={s.dpValor}>USD {fmtUSD(data.valor_fob)}</span>
        </div>
        <div className={s.desglosePrecioItem}>
          <span className={s.dpLabel}>CIF</span>
          <span className={s.dpValor}>USD {fmtUSD(data.valor_cif)}</span>
        </div>
        <div className={s.desglosePrecioItem}>
          <span className={s.dpLabel}>Total tributos</span>
          <span className={s.dpValor}>USD {fmtUSD(data.total_tributos)}</span>
        </div>
      </div>

      <table className={s.desgloseTbl}>
        <tbody>
          <tr className={s.desgloseSeccion}>
            <td colSpan={3}>Tributos aplicados</td>
          </tr>
          {d.derecho_importacion && (
            <tr>
              <td>Derecho de importación ({(d.derecho_importacion.alicuota * 100).toFixed(0)}%)</td>
              <td className={s.tdAlicuota}></td>
              <td className={s.tdMonto}>USD {fmtUSD(d.derecho_importacion.monto)}</td>
            </tr>
          )}
          {d.tasa_estadistica && (
            <tr>
              <td>Tasa estadística (3%)</td>
              <td className={s.tdAlicuota}></td>
              <td className={s.tdMonto}>USD {fmtUSD(d.tasa_estadistica.monto)}</td>
            </tr>
          )}
          {d.iva && (
            <tr>
              <td>IVA importación ({(d.iva.alicuota * 100).toFixed(0)}%)</td>
              <td className={s.tdAlicuota}></td>
              <td className={s.tdMonto}>USD {fmtUSD(d.iva.monto)}</td>
            </tr>
          )}
          {d.iva_adicional?.monto > 0 && (
            <tr>
              <td>IVA adicional ({(d.iva_adicional.alicuota * 100).toFixed(0)}%)</td>
              <td className={s.tdAlicuota}></td>
              <td className={s.tdMonto}>USD {fmtUSD(d.iva_adicional.monto)}</td>
            </tr>
          )}
          {d.percepcion_ganancias?.monto > 0 && (
            <tr>
              <td>Percepción ganancias ({(d.percepcion_ganancias.alicuota * 100).toFixed(0)}%)</td>
              <td className={s.tdAlicuota}></td>
              <td className={s.tdMonto}>USD {fmtUSD(d.percepcion_ganancias.monto)}</td>
            </tr>
          )}
          {d.ingresos_brutos?.monto > 0 && (
            <tr>
              <td>Ingresos brutos (2.5%)</td>
              <td className={s.tdAlicuota}></td>
              <td className={s.tdMonto}>USD {fmtUSD(d.ingresos_brutos.monto)}</td>
            </tr>
          )}
          <tr className={s.desgloseSubtotal}>
            <td colSpan={2}>Total tributos</td>
            <td className={s.tdMonto}>USD {fmtUSD(data.total_tributos)}</td>
          </tr>
          <tr className={s.desgloseTotalFinal}>
            <td colSpan={2}>Costo total puesto en Argentina</td>
            <td className={s.tdMonto}>USD {fmtUSD(data.costo_total_usd)}</td>
          </tr>
        </tbody>
      </table>

      {data.preferencia_aplicada && (
        <div className={s.arancelDestino}>
          <span>Preferencia aplicada</span>
          <span className={s.adValor}>{data.preferencia_aplicada.acuerdo}</span>
        </div>
      )}

      {data.notas?.length > 0 && (
        <div className={s.notasBox}>
          {data.notas.slice(0, 4).map((n, i) => (
            <div key={i} className={s.nota}>{n}</div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function ComparadorClient({ productos }) {
  const [tipo, setTipo] = useState('exportacion')
  const [region, setRegion] = useState('todos')
  const [orden, setOrden] = useState('menor')
  const [cargando, setCargando] = useState(false)
  const [resultados, setResultados] = useState(null)
  const [error, setError] = useState(null)
  const [modalData, setModalData] = useState(null)

  // Campos del formulario
  const [productoId, setProductoId] = useState('')
  const [ncmManual, setNcmManual] = useState('')
  const [precioManual, setPrecioManual] = useState('')
  const [incoterm, setIncoterm] = useState('FOB')

  const paisesLista = tipo === 'exportacion' ? PAISES_EXPO : PAISES_IMPO
  const paisesRegion = region === 'todos' ? paisesLista : paisesLista.filter(p => p.region === region)

  // Producto seleccionado
  const productoSel = productos.find(p => p.id === productoId) ?? null

  const ncmCode = productoSel ? productoSel.ncm_code : ncmManual.trim()
  const precioNum = productoSel
    ? productoSel.unit_price
    : parseFloat(precioManual)

  async function handleCalcular() {
    setError(null)
    setResultados(null)

    if (!ncmCode) {
      setError('Seleccioná un producto o ingresá un NCM')
      return
    }
    if (isNaN(precioNum) || precioNum <= 0) {
      setError('Ingresá un precio válido mayor a 0')
      return
    }

    setCargando(true)
    try {
      const body = {
        tipo,
        ncm_code: ncmCode,
        paises: paisesRegion.map(p => p.iso3),
        ...(tipo === 'exportacion'
          ? { precio_producto: precioNum, incoterm_base: incoterm }
          : { valor_fob: precioNum }
        ),
      }

      const res = await fetch('/api/comparador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (!res.ok || !json.ok) {
        setError(json.error ?? 'Error al calcular')
        return
      }
      setResultados(json.resultados)
    } catch (e) {
      setError('Error de red — intentá de nuevo')
    } finally {
      setCargando(false)
    }
  }

  // Procesar resultados: calcular métrica principal + ordenar
  const resultadosProcesados = useMemo(() => {
    if (!resultados) return null

    const conValor = resultados.map(r => {
      if (!r.ok) return { ...r, metrica: null, metricaTipo: null }

      if (tipo === 'exportacion') {
        // Para exportación la métrica es el arancel % que cobra el país destino.
        // El FOB es igual para todos — no sirve para comparar.
        const ae = r.data.arancel_destino
        const metrica = (ae && ae.ave_rate !== null) ? ae.ave_rate : null
        return { ...r, metrica, metricaTipo: 'arancel_pct' }
      } else {
        // Para importación la métrica es el costo total en Argentina.
        // Varía según preferencias arancelarias del país origen.
        return { ...r, metrica: r.data.costo_total_usd ?? null, metricaTipo: 'costo_usd' }
      }
    })

    const soloConMetrica = conValor.filter(r => r.metrica !== null)
    if (soloConMetrica.length === 0) return conValor

    const valMin = Math.min(...soloConMetrica.map(r => r.metrica))
    const valMax = Math.max(...soloConMetrica.map(r => r.metrica))

    // Solo marcar mejor/peor si hay variación real
    const hayVariacion = valMin !== valMax

    // Para expo: mejor = menor arancel. Para impo: mejor = menor costo.
    const tagged = conValor.map(r => ({
      ...r,
      esMejor: hayVariacion && r.metrica !== null && r.metrica === valMin,
      esPeor:  hayVariacion && r.metrica !== null && r.metrica === valMax,
    }))

    const sorted = [...tagged].sort((a, b) => {
      // Países sin datos van al final
      if (a.metrica === null && b.metrica === null) return 0
      if (a.metrica === null) return 1
      if (b.metrica === null) return -1
      return orden === 'menor' ? a.metrica - b.metrica : b.metrica - a.metrica
    })

    return sorted
  }, [resultados, orden, tipo])

  return (
    <div className={s.page}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className={s.pageHeader}>
        <h1 className={s.titulo}>Comparador por país</h1>
        <p className={s.subtitulo}>
          Compará el costo de {tipo === 'exportacion' ? 'exportar a' : 'importar desde'} múltiples países de un vistazo
        </p>
      </div>

      {/* ── Tabs tipo ──────────────────────────────────────────────── */}
      <div className={s.tabs}>
        <button
          className={`${s.tab} ${tipo === 'exportacion' ? s.tabActivo : ''}`}
          onClick={() => { setTipo('exportacion'); setResultados(null) }}
        >
          Exportar a
        </button>
        <button
          className={`${s.tab} ${tipo === 'importacion' ? s.tabActivo : ''}`}
          onClick={() => { setTipo('importacion'); setResultados(null) }}
        >
          Importar desde
        </button>
      </div>

      {/* ── Layout ─────────────────────────────────────────────────── */}
      <div className={s.layout}>

        {/* ── Formulario ───────────────────────────────────────────── */}
        <div className={s.formPanel}>
          <div className={s.campo}>
            <label className={s.label}>
              Producto{' '}
              <span className={s.opcional}>(del catálogo)</span>
            </label>
            <select
              className={s.select}
              value={productoId}
              onChange={e => setProductoId(e.target.value)}
            >
              <option value="">— Seleccioná un producto —</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.ncm_code})
                </option>
              ))}
            </select>
          </div>

          {!productoSel && (
            <>
              <div className={s.separadorOr}>o ingresá manualmente</div>
              <div className={s.campoFila}>
                <div className={s.campo} style={{ flex: 1 }}>
                  <label className={s.label}>
                    NCM <span className={s.req}>*</span>
                  </label>
                  <input
                    className={s.input}
                    placeholder="ej: 0101.21.00"
                    value={ncmManual}
                    onChange={e => setNcmManual(e.target.value)}
                  />
                </div>
                <div className={s.campo} style={{ flex: 1 }}>
                  <label className={s.label}>
                    Precio (USD) <span className={s.req}>*</span>
                  </label>
                  <input
                    className={s.input}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="1000"
                    value={precioManual}
                    onChange={e => setPrecioManual(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {productoSel && (
            <div className={s.productoSel}>
              <span className={s.productoSelNcm}>{productoSel.ncm_code}</span>
              {' — '}
              <span>USD {fmtUSD(productoSel.unit_price)} {productoSel.incoterm}</span>
            </div>
          )}

          {tipo === 'exportacion' && (
            <div className={s.campo}>
              <label className={s.label}>Incoterm base</label>
              <select
                className={s.select}
                value={incoterm}
                onChange={e => setIncoterm(e.target.value)}
              >
                {['EXW','FOB','CIF','CFR','DDP'].map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro región integrado al formulario */}
          <div className={s.campo}>
            <label className={s.label}>Región a comparar</label>
            <div className={s.regionPills}>
              {REGIONES.map(r => (
                <button
                  key={r.key}
                  className={`${s.regionPill} ${region === r.key ? s.regionPillActivo : ''}`}
                  onClick={() => setRegion(r.key)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className={s.regionCount}>
              {paisesRegion.length} países seleccionados
            </div>
          </div>

          {error && <div className={s.errorGeneral}>{error}</div>}

          <button
            className={s.btnCalcular}
            onClick={handleCalcular}
            disabled={cargando}
          >
            {cargando ? (
              <>
                <span className={s.spinner} />
                Calculando {paisesRegion.length} países...
              </>
            ) : (
              `Comparar ${paisesRegion.length} países`
            )}
          </button>
        </div>

        {/* ── Resultados ───────────────────────────────────────────── */}
        <div className={s.resultadosPanel}>
          {!resultadosProcesados && !cargando && (
            <div className={s.placeholder}>
              <div className={s.placeholderIcono}>🌍</div>
              <div>Configurá tu producto y hacé clic en <strong>Comparar</strong></div>
              <div className={s.placeholderSub}>
                Verás el costo para cada país de un vistazo
              </div>
            </div>
          )}

          {cargando && (
            <div className={s.placeholder}>
              <div className={s.loadingDots}>
                <span /><span /><span />
              </div>
              <div>Calculando en paralelo...</div>
            </div>
          )}

          {resultadosProcesados && (
            <>
              {/* Barra de controles */}
              <div className={s.barraResultados}>
                <div className={s.resumenConteo}>
                  <span className={s.resumenOk}>
                    {resultadosProcesados.filter(r => r.metrica !== null).length} con datos
                  </span>
                  {resultadosProcesados.filter(r => r.ok && r.metrica === null).length > 0 && (
                    <span className={s.resumenErr}>
                      {resultadosProcesados.filter(r => r.ok && r.metrica === null).length} sin datos de arancel
                    </span>
                  )}
                  {tipo === 'exportacion' && (
                    <span className={s.resumenTip}>ordenado por arancel destino (%)</span>
                  )}
                </div>
                <div className={s.ordenWrap}>
                  <label className={s.ordenLabel}>Ordenar:</label>
                  <select
                    className={s.ordenSelect}
                    value={orden}
                    onChange={e => setOrden(e.target.value)}
                  >
                    <option value="menor">Menor → Mayor</option>
                    <option value="mayor">Mayor → Menor</option>
                  </select>
                </div>
              </div>

              {/* Grid de cards */}
              <div className={s.cardsGrid}>
                {resultadosProcesados.map(r => {
                  const paisesList = tipo === 'exportacion' ? PAISES_EXPO : PAISES_IMPO
                  const pais = paisesList.find(p => p.iso3 === r.pais_iso3) ?? { name: r.pais_iso3 }
                  return (
                    <PaisCard
                      key={r.pais_iso3}
                      resultado={r}
                      pais={pais}
                      tipo={tipo}
                      onClick={(r.ok && r.metrica !== null) ? () => setModalData(r) : null}
                    />
                  )
                })}
              </div>

              <div className={s.disclaimer}>
                Esta información es orientativa y está respaldada por fuentes oficiales.
                Para operaciones concretas, consultá con un despachante de aduana matriculado
                o un profesional de comercio exterior.
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modal desglose ─────────────────────────────────────────── */}
      {modalData && (
        <ModalDesglose
          resultado={modalData}
          tipo={tipo}
          onClose={() => setModalData(null)}
        />
      )}
    </div>
  )
}

// ── Card de país ──────────────────────────────────────────────────────────────

function PaisCard({ resultado, pais, tipo, onClick }) {
  const { ok, metrica, metricaTipo, esMejor, esPeor, data } = resultado

  const tieneDatos = ok && metrica !== null

  let cardClass = s.paisCard
  if (esMejor) cardClass += ` ${s.paisCardMejor}`
  else if (esPeor) cardClass += ` ${s.paisCardPeor}`
  if (!tieneDatos) cardClass += ` ${s.paisCardSinDatos}`

  // Línea secundaria según tipo
  let linea2 = null
  if (ok && data) {
    if (tipo === 'exportacion') {
      // Precio FOB como referencia (es fijo para todos, lo dejamos como contexto)
      linea2 = data.precio_fob != null ? `FOB: USD ${fmtUSD(data.precio_fob)}` : null
    } else {
      const pref = data.preferencia_aplicada
      linea2 = pref ? pref.acuerdo : null
    }
  }

  return (
    <button
      className={cardClass}
      onClick={tieneDatos ? onClick : undefined}
      disabled={!tieneDatos}
      title={ok && !tieneDatos ? 'Sin datos de arancel para este destino' : undefined}
    >
      {esMejor && <div className={s.mejorBadge}>{tipo === 'exportacion' ? 'MENOS ARANCEL' : 'MEJOR'}</div>}
      {esPeor  && <div className={s.peorBadge}>{tipo === 'exportacion' ? 'MÁS ARANCEL' : 'MÁS CARO'}</div>}

      <div className={s.cardFlag}><FlagImg iso3={pais.iso3} /></div>
      <div className={s.cardPais}>{pais.name}</div>

      {tieneDatos ? (
        <>
          {metricaTipo === 'arancel_pct' ? (
            <div className={s.cardValor}>{metrica}%</div>
          ) : (
            <div className={s.cardValor}>USD {fmtUSD(metrica)}</div>
          )}
          {linea2 && <div className={s.cardSub}>{linea2}</div>}
        </>
      ) : ok ? (
        <div className={s.cardSinDatos}>Sin datos de arancel</div>
      ) : (
        <div className={s.cardSinDatos}>Error</div>
      )}
    </button>
  )
}
