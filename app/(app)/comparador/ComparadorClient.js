'use client'

import { useState, useMemo } from 'react'
import PageLayout from '@/components/ui/PageLayout'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

const PAISES_EXPO = [
  { iso3: 'BRA', name: 'Brasil',          region: 'mercosur' },
  { iso3: 'URY', name: 'Uruguay',         region: 'mercosur' },
  { iso3: 'PRY', name: 'Paraguay',        region: 'mercosur' },
  { iso3: 'CHL', name: 'Chile',           region: 'latam' },
  { iso3: 'PER', name: 'Perú',            region: 'latam' },
  { iso3: 'COL', name: 'Colombia',        region: 'latam' },
  { iso3: 'ECU', name: 'Ecuador',         region: 'latam' },
  { iso3: 'MEX', name: 'México',          region: 'latam' },
  { iso3: 'BOL', name: 'Bolivia',         region: 'latam' },
  { iso3: 'VEN', name: 'Venezuela',       region: 'latam' },
  { iso3: 'CRI', name: 'Costa Rica',      region: 'latam' },
  { iso3: 'PAN', name: 'Panamá',          region: 'latam' },
  { iso3: 'GTM', name: 'Guatemala',       region: 'latam' },
  { iso3: 'DEU', name: 'Alemania',        region: 'europa' },
  { iso3: 'ESP', name: 'España',          region: 'europa' },
  { iso3: 'ITA', name: 'Italia',          region: 'europa' },
  { iso3: 'FRA', name: 'Francia',         region: 'europa' },
  { iso3: 'NLD', name: 'Países Bajos',    region: 'europa' },
  { iso3: 'GBR', name: 'Gran Bretaña',    region: 'europa' },
  { iso3: 'POL', name: 'Polonia',         region: 'europa' },
  { iso3: 'CHN', name: 'China',           region: 'asia' },
  { iso3: 'JPN', name: 'Japón',           region: 'asia' },
  { iso3: 'KOR', name: 'Corea del Sur',   region: 'asia' },
  { iso3: 'IND', name: 'India',           region: 'asia' },
  { iso3: 'IDN', name: 'Indonesia',       region: 'asia' },
  { iso3: 'THA', name: 'Tailandia',       region: 'asia' },
  { iso3: 'VNM', name: 'Vietnam',        region: 'asia' },
  { iso3: 'AUS', name: 'Australia',       region: 'asia' },
  { iso3: 'USA', name: 'Estados Unidos',  region: 'otros' },
  { iso3: 'CAN', name: 'Canadá',          region: 'otros' },
  { iso3: 'ZAF', name: 'Sudáfrica',       region: 'otros' },
  { iso3: 'EGY', name: 'Egipto',          region: 'otros' },
  { iso3: 'ISR', name: 'Israel',          region: 'otros' },
  { iso3: 'MAR', name: 'Marruecos',       region: 'otros' },
  { iso3: 'NGA', name: 'Nigeria',         region: 'otros' },
  { iso3: 'SAU', name: 'Arabia Saudita', region: 'otros' },
  { iso3: 'ARE', name: 'Emiratos Árabes', region: 'otros' },
  { iso3: 'RUS', name: 'Rusia',           region: 'otros' },
  { iso3: 'TUR', name: 'Turquía',         region: 'otros' },
]

const PAISES_IMPO = PAISES_EXPO
const PAISES = PAISES_EXPO

const REGIONES = [
  { key: 'todos',    label: 'Todos' },
  { key: 'mercosur', label: 'Mercosur' },
  { key: 'latam',    label: 'Latam' },
  { key: 'europa',   label: 'Europa' },
  { key: 'asia',     label: 'Asia' },
  { key: 'otros',    label: 'Otros' },
]

const ISO3_TO_ISO2 = {
  BRA:'br', URY:'uy', PRY:'py', CHL:'cl', PER:'pe', COL:'co', ECU:'ec',
  MEX:'mx', BOL:'bo', VEN:'ve', CRI:'cr', PAN:'pa', GTM:'gt', DEU:'de',
  ESP:'es', ITA:'it', FRA:'fr', NLD:'nl', GBR:'gb', POL:'pl', CHN:'cn',
  JPN:'jp', KOR:'kr', IND:'in', IDN:'id', THA:'th', VNM:'vn', AUS:'au',
  USA:'us', CAN:'ca', ZAF:'za', EGY:'eg', ISR:'il', MAR:'ma', NGA:'ng',
  SAU:'sa', ARE:'ae', RUS:'ru', TUR:'tr',
}

const FLAG_URL = 'https://flagcdn.com/w40'

function FlagImg({ iso3, size = 28 }) {
  const iso2 = ISO3_TO_ISO2[iso3]
  if (!iso2) {
    return (
      <span className="inline-block w-7 h-5 bg-white/[0.06] rounded" />
    )
  }
  return (
    <img
      src={`${FLAG_URL}/${iso2}.png`}
      width={size}
      height={Math.round(size * 0.7)}
      alt={iso3}
      className="rounded object-cover inline-block"
    />
  )
}

function fmtUSD(n) {
  if (n === null || n === undefined) return null
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function ModalDesglose({ resultado, tipo, onClose }) {
  if (!resultado) return null
  const { data, pais_iso3 } = resultado
  const pais = PAISES.find(p => p.iso3 === pais_iso3)

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-surface-low border border-white/[0.06] rounded-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-white/[0.04] shrink-0">
          <div className="flex items-center gap-3">
            <FlagImg iso3={pais_iso3} size={32} />
            <div>
              <p className="font-display text-lg tracking-wider text-on-surface">{pais?.name ?? pais_iso3}</p>
              <Badge variant="neutral" className="mt-1">
                {tipo === 'exportacion' ? 'EXPORTACIÓN' : 'IMPORTACIÓN'}
              </Badge>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer text-on-surface-variant/60 hover:text-on-surface"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {tipo === 'exportacion' ? <DesgloseExpo data={data} /> : <DesgloseImpo data={data} />}
        </div>
      </div>
    </>
  )
}

function DesgloseExpo({ data }) {
  const ci = data?.conversion_incoterms ?? {}
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {['EXW','FOB','CIF'].map(inc => (
          <div key={inc} className="bg-white/[0.02] rounded-xl p-3 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/50">{inc}</p>
            <p className="font-mono text-base text-on-surface mt-1">
              {ci[inc] != null ? `USD ${fmtUSD(ci[inc])}` : '—'}
            </p>
          </div>
        ))}
      </div>

      {data?.costos_exportacion && (
        <div className="space-y-1.5">
          <p className="font-display text-[10px] tracking-widest uppercase text-on-surface-variant/50 mb-2">Costos de exportación</p>
          {data.costos_exportacion.derecho_exportacion?.monto > 0 && (
            <div className="flex justify-between py-1.5 px-3 bg-white/[0.02] rounded-lg">
              <span className="font-body text-xs text-on-surface-variant">
                Derechos ({(data.costos_exportacion.derecho_exportacion.alicuota * 100).toFixed(0)}%)
              </span>
              <span className="font-mono text-xs text-on-surface">USD {fmtUSD(data.costos_exportacion.derecho_exportacion.monto)}</span>
            </div>
          )}
          <div className="flex justify-between py-1.5 px-3 bg-white/[0.02] rounded-lg">
            <span className="font-body text-xs text-on-surface-variant">Costo neto</span>
            <span className="font-mono text-xs text-on-surface">USD {fmtUSD(data.costo_neto_exportacion)}</span>
          </div>
          <div className="flex justify-between py-1.5 px-3 bg-primary/5 border border-primary/10 rounded-lg">
            <span className="font-body text-xs text-on-surface">Ingreso neto</span>
            <span className={`font-mono text-xs ${data.margen_neto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              USD {fmtUSD(data.margen_neto)}
            </span>
          </div>
        </div>
      )}

      {data?.arancel_destino && (
        <div className="bg-white/[0.02] rounded-xl p-4">
          <p className="font-display text-[10px] tracking-widest uppercase text-on-surface-variant/50 mb-2">Arancel destino</p>
          <div className="flex justify-between items-center">
            <span className="font-body text-xs text-on-surface-variant">
              HS {data.arancel_destino.hs_code}
            </span>
            <span className="font-mono text-sm text-on-surface">
              {data.arancel_destino.ave_rate != null ? `${data.arancel_destino.ave_rate}% AVE` : 'Sin datos'}
            </span>
          </div>
          <p className="font-mono text-[10px] text-on-surface-variant/30 mt-1">Fuente: WITS {data.arancel_destino.year}</p>
        </div>
      )}
    </div>
  )
}

function DesgloseImpo({ data }) {
  const d = data?.desglose ?? {}
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'FOB', val: data?.valor_fob },
          { label: 'CIF', val: data?.valor_cif },
          { label: 'Tributos', val: data?.total_tributos },
        ].map(item => (
          <div key={item.label} className="bg-white/[0.02] rounded-xl p-3 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/50">{item.label}</p>
            <p className="font-mono text-base text-on-surface mt-1">
              {item.val != null ? `USD ${fmtUSD(item.val)}` : '—'}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <p className="font-display text-[10px] tracking-widest uppercase text-on-surface-variant/50 mb-2">Tributos aplicados</p>
        {d.derecho_importacion && (
          <div className="flex justify-between py-1.5 px-3 bg-white/[0.02] rounded-lg">
            <span className="font-body text-xs text-on-surface-variant">
              Derecho ({(d.derecho_importacion.alicuota * 100).toFixed(0)}%)
            </span>
            <span className="font-mono text-xs text-on-surface">USD {fmtUSD(d.derecho_importacion.monto)}</span>
          </div>
        )}
        {d.tasa_estadistica && (
          <div className="flex justify-between py-1.5 px-3 bg-white/[0.02] rounded-lg">
            <span className="font-body text-xs text-on-surface-variant">Tasa estadística (3%)</span>
            <span className="font-mono text-xs text-on-surface">USD {fmtUSD(d.tasa_estadistica.monto)}</span>
          </div>
        )}
        {d.iva && (
          <div className="flex justify-between py-1.5 px-3 bg-white/[0.02] rounded-lg">
            <span className="font-body text-xs text-on-surface-variant">
              IVA ({(d.iva.alicuota * 100).toFixed(0)}%)
            </span>
            <span className="font-mono text-xs text-on-surface">USD {fmtUSD(d.iva.monto)}</span>
          </div>
        )}
        {d.iva_adicional?.monto > 0 && (
          <div className="flex justify-between py-1.5 px-3 bg-white/[0.02] rounded-lg">
            <span className="font-body text-xs text-on-surface-variant">
              IVA adicional ({(d.iva_adicional.alicuota * 100).toFixed(0)}%)
            </span>
            <span className="font-mono text-xs text-on-surface">USD {fmtUSD(d.iva_adicional.monto)}</span>
          </div>
        )}
        <div className="flex justify-between py-1.5 px-3 bg-primary/5 border border-primary/10 rounded-lg font-semibold">
          <span className="font-body text-xs text-on-surface">Costo total en Argentina</span>
          <span className="font-mono text-xs text-on-surface">USD {fmtUSD(data?.costo_total_usd)}</span>
        </div>
      </div>

      {data?.preferencia_aplicada && (
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4">
          <p className="font-display text-[10px] tracking-widest uppercase text-emerald-400/60 mb-1">Preferencia aplicada</p>
          <p className="font-body text-sm text-emerald-400">{data.preferencia_aplicada.acuerdo}</p>
        </div>
      )}
    </div>
  )
}

function PaisCard({ resultado, tipo, onClick }) {
  const { ok, metrica, esMejor, esPeor, data } = resultado
  const pais = PAISES.find(p => p.iso3 === resultado.pais_iso3) ?? { name: resultado.pais_iso3 }
  const tieneDatos = ok && metrica !== null

  return (
    <button
      onClick={tieneDatos ? onClick : undefined}
      disabled={!tieneDatos}
      title={ok && !tieneDatos ? 'Sin datos de arancel' : undefined}
      className={`relative text-center p-4 rounded-xl transition-all cursor-pointer w-full ${
        esMejor
          ? 'border border-emerald-500/30 bg-emerald-500/[0.02]'
          : esPeor
          ? 'border border-red-500/20'
          : 'border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.08]'
      } ${!tieneDatos ? 'opacity-30 cursor-default' : ''}`}
    >
      {esMejor && (
        <span className="absolute top-2 right-2 font-mono text-[9px] tracking-widest text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
          MEJOR
        </span>
      )}
      {esPeor && (
        <span className="absolute top-2 right-2 font-mono text-[9px] tracking-widest text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
          MÁS CARO
        </span>
      )}

      <div className="flex justify-center mb-2">
        <FlagImg iso3={resultado.pais_iso3} size={32} />
      </div>
      <p className="font-body text-[10px] text-on-surface-variant mt-1 leading-tight">
        {pais.name}
      </p>

      {tieneDatos ? (
        <p className="font-mono text-base text-on-surface font-bold mt-2">
          {tipo === 'exportacion' ? `${metrica}%` : `USD ${fmtUSD(metrica)}`}
        </p>
      ) : ok ? (
        <p className="font-mono text-[10px] text-on-surface-variant/40 mt-2">Sin datos</p>
      ) : (
        <p className="font-mono text-[10px] text-red-400/60 mt-2">Error</p>
      )}

      {ok && data?.preferencia_aplicada && (
        <p className="font-mono text-[9px] text-emerald-400/60 mt-1">{data.preferencia_aplicada.acuerdo}</p>
      )}
    </button>
  )
}

export default function ComparadorClient({ productos }) {
  const [tipo, setTipo] = useState('exportacion')
  const [region, setRegion] = useState('todos')
  const [cargando, setCargando] = useState(false)
  const [resultados, setResultados] = useState(null)
  const [error, setError] = useState(null)
  const [modalData, setModalData] = useState(null)

  const [productoId, setProductoId] = useState('')
  const [ncmManual, setNcmManual] = useState('')
  const [precioManual, setPrecioManual] = useState('')
  const [incoterm, setIncoterm] = useState('FOB')

  const paisesLista = tipo === 'exportacion' ? PAISES_EXPO : PAISES_IMPO
  const paisesRegion = region === 'todos' ? paisesLista : paisesLista.filter(p => p.region === region)

  const productoSel = productos.find(p => p.id === productoId) ?? null
  const ncmCode = productoSel ? productoSel.ncm_code : ncmManual.trim()
  const precioNum = productoSel ? productoSel.unit_price : parseFloat(precioManual)

  const resultadosProcesados = useMemo(() => {
    if (!resultados) return null

    const conValor = resultados.map(r => {
      if (!r.ok) return { ...r, metrica: null }
      if (tipo === 'exportacion') {
        const ae = r.data?.arancel_destino
        return { ...r, metrica: ae?.ave_rate != null ? ae.ave_rate : null }
      } else {
        return { ...r, metrica: r.data?.costo_total_usd ?? null }
      }
    })

    const soloConMetrica = conValor.filter(r => r.metrica !== null)
    if (soloConMetrica.length === 0) return conValor

    const valMin = Math.min(...soloConMetrica.map(r => r.metrica))
    const valMax = Math.max(...soloConMetrica.map(r => r.metrica))
    const hayVariacion = valMin !== valMax

    return conValor.map(r => ({
      ...r,
      esMejor: hayVariacion && r.metrica !== null && r.metrica === valMin,
      esPeor:  hayVariacion && r.metrica !== null && r.metrica === valMax,
    }))
  }, [resultados, tipo])

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
    } catch {
      setError('Error de red — intentá de nuevo')
    } finally {
      setCargando(false)
    }
  }

  const conteoOk = resultadosProcesados?.filter(r => r.metrica !== null).length ?? 0
  const conteoSin = resultadosProcesados?.filter(r => r.ok && r.metrica === null).length ?? 0

  return (
    <PageLayout title="COMPARADOR" subtitle="Compará costos entre destinos">
      <div className="max-w-6xl">
        {/* Selector de producto */}
        <Card className="mb-6">
          <p className="font-display text-[10px] tracking-widest uppercase text-on-surface-variant mb-4">
            SELECCIONÁ UN PRODUCTO
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">
                Del catálogo
              </label>
              <select
                className="w-full bg-surface-highest rounded-xl px-4 py-3 font-mono text-sm text-on-surface border border-transparent outline-none focus:border-primary/30 transition-all cursor-pointer"
                value={productoId}
                onChange={e => setProductoId(e.target.value)}
              >
                <option value="">— Seleccionar producto —</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.ncm_code})
                  </option>
                ))}
              </select>
            </div>

            {!productoSel && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-body text-xs text-on-surface-variant mb-1.5">NCM</label>
                  <input
                    className="w-full bg-surface-highest rounded-xl px-4 py-3 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-transparent focus:border-primary/30 outline-none transition-all"
                    placeholder="ej: 0902.40.00"
                    value={ncmManual}
                    onChange={e => setNcmManual(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-body text-xs text-on-surface-variant mb-1.5">Precio (USD)</label>
                  <input
                    className="w-full bg-surface-highest rounded-xl px-4 py-3 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-transparent focus:border-primary/30 outline-none transition-all"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="1000"
                    value={precioManual}
                    onChange={e => setPrecioManual(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {productoSel && (
            <div className="bg-white/[0.03] rounded-xl px-4 py-3 font-mono text-sm text-on-surface-variant flex items-center gap-3">
              <span className="text-primary">{productoSel.ncm_code}</span>
              <span className="text-on-surface-variant/30">|</span>
              <span>{productoSel.name}</span>
              <span className="text-on-surface-variant/30">|</span>
              <span>USD {fmtUSD(productoSel.unit_price)} {productoSel.incoterm}</span>
            </div>
          )}

          <div className="h-px bg-white/[0.04] my-4" />

          {/* Tabs + Incoterm */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex bg-white/[0.04] rounded-xl p-1 gap-1">
              <button
                className={`px-4 py-2 rounded-lg font-body text-sm transition-all cursor-pointer ${
                  tipo === 'exportacion'
                    ? 'bg-primary-intense text-on-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                onClick={() => { setTipo('exportacion'); setResultados(null) }}
              >
                Exportación
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-body text-sm transition-all cursor-pointer ${
                  tipo === 'importacion'
                    ? 'bg-primary-intense text-on-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                onClick={() => { setTipo('importacion'); setResultados(null) }}
              >
                Importación
              </button>
            </div>

            {tipo === 'exportacion' && (
              <select
                className="bg-surface-highest rounded-xl px-4 py-2.5 font-mono text-sm text-on-surface border border-transparent focus:border-primary/30 outline-none transition-all cursor-pointer"
                value={incoterm}
                onChange={e => setIncoterm(e.target.value)}
              >
                {['EXW','FOB','CIF','CFR','DDP'].map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            )}

            {/* Filtro región */}
            <div className="flex flex-wrap gap-1.5 ml-auto">
              {REGIONES.map(r => (
                <button
                  key={r.key}
                  onClick={() => setRegion(r.key)}
                  className={`px-3 py-1.5 rounded-lg font-body text-xs transition-all cursor-pointer ${
                    region === r.key
                      ? 'bg-white/[0.08] text-on-surface'
                      : 'text-on-surface-variant/60 hover:text-on-surface'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <p className="font-mono text-[10px] text-on-surface-variant/40 mt-3">
            {paisesRegion.length} países — {tipo === 'exportacion' ? 'arancel que cobra el destino (%)' : 'costo total en Argentina (USD)'}
          </p>

          {error && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="font-body text-xs text-red-400">{error}</p>
            </div>
          )}

          <Button
            className="mt-4"
            loading={cargando}
            onClick={handleCalcular}
          >
            {cargando ? (
              <>Calculando {paisesRegion.length} países…</>
            ) : (
              <>COMPARAR {paisesRegion.length} PAÍSES</>
            )}
          </Button>
        </Card>

        {/* Resultados */}
        {!resultadosProcesados && !cargando && (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 mb-4 text-on-surface-variant/[0.1]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <p className="font-display text-xl tracking-wider text-on-surface-variant/30 uppercase">
              Seleccioná un producto y comparalo
            </p>
          </div>
        )}

        {resultadosProcesados && (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-3 font-body text-xs text-on-surface-variant">
                {conteoOk > 0 && (
                  <span className="text-emerald-400">{conteoOk} con datos</span>
                )}
                {conteoSin > 0 && (
                  <span className="text-on-surface-variant/40">{conteoSin} sin datos de arancel</span>
                )}
              </div>
              <a href="/planes" className="ml-auto font-body text-xs text-on-surface-variant/30 hover:text-primary transition-colors">
                Free: 2 comparaciones/mes
              </a>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
              {resultadosProcesados.map(r => (
                <PaisCard
                  key={r.pais_iso3}
                  resultado={r}
                  tipo={tipo}
                  onClick={() => setModalData(r)}
                />
              ))}
            </div>

            <p className="font-mono text-[10px] text-on-surface-variant/20 text-center mt-6 leading-relaxed">
              Datos de aranceles: ARCA (importación Argentina) · WITS 2024 (aranceles en destino).
              Esta información es orientativa y está respaldada por fuentes oficiales.
              Para operaciones concretas, consultá con un despachante de aduana matriculado
              o un profesional de comercio exterior.
            </p>
          </>
        )}
      </div>

      {modalData && (
        <ModalDesglose
          resultado={modalData}
          tipo={tipo}
          onClose={() => setModalData(null)}
        />
      )}
    </PageLayout>
  )
}
