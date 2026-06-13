'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import PageLayout from '@/components/ui/PageLayout'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import NcmAutocomplete from '@/components/ui/NcmAutocomplete'

const ISO3_TO_ISO2 = {
  AFG:'af', ALB:'al', DZA:'dz', AND:'ad', AGO:'ao', ATG:'ag', ARG:'ar', ARM:'am',
  AUS:'au', AUT:'at', AZE:'az', BHS:'bs', BHR:'bh', BGD:'bd', BRB:'bb', BLR:'by',
  BEL:'be', BLZ:'bz', BEN:'bj', BTN:'bt', BOL:'bo', BIH:'ba', BWA:'bw', BRA:'br',
  BRN:'bn', BGR:'bg', BFA:'bf', BDI:'bi', CPV:'cv', KHM:'kh', CMR:'cm', CAN:'ca',
  CAF:'cf', TCD:'td', CHL:'cl', CHN:'cn', COL:'co', COM:'km', COD:'cd', COG:'cg',
  CRI:'cr', CIV:'ci', HRV:'hr', CUB:'cu', CYP:'cy', CZE:'cz', DNK:'dk', DJI:'dj',
  DOM:'do', ECU:'ec', EGY:'eg', SLV:'sv', GNQ:'gq', ERI:'er', EST:'ee', SWZ:'sz',
  ETH:'et', FJI:'fj', FIN:'fi', FRA:'fr', GAB:'ga', GMB:'gm', GEO:'ge', DEU:'de',
  GHA:'gh', GRC:'gr', GTM:'gt', GIN:'gn', GNB:'gw', GUY:'gy', HTI:'ht', HND:'hn',
  HUN:'hu', ISL:'is', IND:'in', IDN:'id', IRN:'ir', IRQ:'iq', IRL:'ie', ISR:'il',
  ITA:'it', JAM:'jm', JPN:'jp', JOR:'jo', KAZ:'kz', KEN:'ke', KIR:'ki', PRK:'kp',
  KOR:'kr', KWT:'kw', KGZ:'kg', LAO:'la', LVA:'lv', LBN:'lb', LSO:'ls', LBR:'lr',
  LBY:'ly', LIE:'li', LTU:'lt', LUX:'lu', MDG:'mg', MWI:'mw', MYS:'my', MDV:'mv',
  MLI:'ml', MLT:'mt', MHL:'mh', MRT:'mr', MUS:'mu', MEX:'mx', FSM:'fm', MDA:'md',
  MCO:'mc', MNG:'mn', MNE:'me', MAR:'ma', MOZ:'mz', MMR:'mm', NAM:'na', NRU:'nr',
  NPL:'np', NLD:'nl', NZL:'nz', NIC:'ni', NER:'ne', NGA:'ng', MKD:'mk', NOR:'no',
  OMN:'om', PAK:'pk', PLW:'pw', PAN:'pa', PNG:'pg', PRY:'py', PER:'pe', PHL:'ph',
  POL:'pl', PRT:'pt', QAT:'qa', ROU:'ro', RUS:'ru', RWA:'rw', KNA:'kn', LCA:'lc',
  VCT:'vc', WSM:'ws', SMR:'sm', STP:'st', SAU:'sa', SEN:'sn', SRB:'rs', SLE:'sl',
  SGP:'sg', SVK:'sk', SVN:'si', SLB:'sb', SOM:'so', ZAF:'za', SSD:'ss', ESP:'es',
  LKA:'lk', SDN:'sd', SUR:'sr', SWE:'se', CHE:'ch', SYR:'sy', TWN:'tw', TJK:'tj',
  TZA:'tz', THA:'th', TLS:'tl', TGO:'tg', TON:'to', TTO:'tt', TUN:'tn', TUR:'tr',
  TKM:'tm', TUV:'tv', UGA:'ug', UKR:'ua', ARE:'ae', GBR:'gb', USA:'us', URY:'uy',
  UZB:'uz', VUT:'vu', VEN:'ve', VNM:'vn', YEM:'ye', ZMB:'zm', ZWE:'zw',
}

const FLAG_URL = 'https://flagcdn.com/w40'

function FlagImg({ iso3, size = 24 }) {
  const iso2 = ISO3_TO_ISO2[iso3?.toUpperCase()]
  if (!iso2) return <span className="inline-block rounded bg-white/[0.06]" style={{ width: size, height: Math.round(size * 0.7) }} />
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

const REGIMENES = {
  importacion: [
    { key: 'general',         label: 'General' },
    { key: 'courier',         label: 'Courier' },
    { key: 'puerta_a_puerta', label: 'Puerta a puerta' },
    { key: 'muestras',        label: 'Muestras' },
  ],
}

function fmt(n, tipo) {
  if (n === null || n === undefined) return null
  if (tipo === 'importacion') return `${n}%`
  return `${n.toFixed(1)}% AVE`
}

function getBestCountry(resultados, tipo) {
  const conDatos = resultados.filter(r => r.ok && r.metrica !== null)
  if (conDatos.length === 0) return null
  return conDatos.reduce((best, r) => r.metrica < best.metrica ? r : best).iso3
}

function SectionRow({ label, values, renderCell }) {
  return (
    <tr className="border-b border-white/[0.03]">
      <td className="py-2.5 pr-4 font-body text-xs text-on-surface-variant/60 whitespace-nowrap w-40 align-top">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="py-2.5 px-3 align-top">
          {renderCell(v)}
        </td>
      ))}
    </tr>
  )
}

function DetailCard({ resultado, tipo, nombre }) {
  const { ok, data } = resultado
  if (!ok || !data) return null

  const [open, setOpen] = useState(false)

  const aranceles = data.aranceles ?? {}
  const prefs = data.preferencias ?? {}
  const docs = data.documentos ?? {}
  const organismos = data.organismos ?? {}
  const ntm = data.barreras_ntm ?? []
  const restricciones = data.restricciones ?? []

  return (
    <div className="border border-white/[0.04] rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2.5">
          <FlagImg iso3={resultado.iso3} size={22} />
          <span className="font-body text-sm font-medium text-on-surface">{nombre}</span>
        </div>
        <svg
          className={`w-4 h-4 text-on-surface-variant/40 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/[0.04]">
          {/* Aranceles */}
          {tipo === 'importacion' && (
            <div className="pt-3">
              <p className="font-body text-[10px] font-semibold tracking-widest uppercase text-on-surface-variant/40 mb-2">Aranceles</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['AEC', aranceles.aec],
                  ['DIE', aranceles.die],
                  ['DII', aranceles.dii],
                  ['TE', aranceles.te],
                  ['IVA', aranceles.iva],
                  ['IIBB', aranceles.iibb],
                ].filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => (
                  <div key={k} className="flex justify-between px-3 py-1.5 bg-white/[0.02] rounded-lg">
                    <span className="font-mono text-[10px] text-on-surface-variant/50">{k}</span>
                    <span className="font-mono text-xs text-on-surface">{v}%</span>
                  </div>
                ))}
              </div>
              {prefs.tiene_preferencia && prefs.acuerdos?.length > 0 && (
                <div className="mt-2 px-3 py-2 bg-emerald-500/5 border border-emerald-500/15 rounded-lg">
                  <p className="font-mono text-[10px] text-emerald-400/60 uppercase tracking-widest mb-0.5">Preferencia arancelaria</p>
                  <p className="font-body text-xs text-emerald-400">{prefs.acuerdos[0].bloque} — {prefs.acuerdos[0].porcentaje}% de descuento → arancel efectivo: {prefs.arancel_efectivo}%</p>
                </div>
              )}
            </div>
          )}

          {/* Organismos */}
          {(organismos.obligatorios?.length > 0 || organismos.condicionales?.length > 0) && (
            <div>
              <p className="font-body text-[10px] font-semibold tracking-widest uppercase text-on-surface-variant/40 mb-2">Organismos</p>
              <div className="flex flex-wrap gap-1.5">
                {organismos.obligatorios?.map((o, i) => (
                  <span key={i} className="font-mono text-[10px] px-2 py-1 rounded-md bg-red-500/10 text-red-400">{o.organismo}</span>
                ))}
                {organismos.condicionales?.map((o, i) => (
                  <span key={i} className="font-mono text-[10px] px-2 py-1 rounded-md bg-white/[0.04] text-on-surface-variant">{o.organismo}</span>
                ))}
              </div>
            </div>
          )}

          {/* Documentos críticos */}
          {docs.criticos?.length > 0 && (
            <div>
              <p className="font-body text-[10px] font-semibold tracking-widest uppercase text-on-surface-variant/40 mb-2">Documentos críticos</p>
              <div className="space-y-1">
                {docs.criticos.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400/60 shrink-0" />
                    <span className="font-body text-xs text-on-surface-variant">{d.documento_nombre}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NTM */}
          {ntm.length > 0 && (
            <div>
              <p className="font-body text-[10px] font-semibold tracking-widest uppercase text-on-surface-variant/40 mb-2">Barreras no arancelarias ({ntm.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {ntm.slice(0, 6).map((m, i) => (
                  <span key={i} className="font-mono text-[10px] px-2 py-1 rounded-md bg-white/[0.04] text-on-surface-variant">{m.codigo}</span>
                ))}
                {ntm.length > 6 && (
                  <span className="font-mono text-[10px] px-2 py-1 rounded-md bg-white/[0.04] text-on-surface-variant/40">+{ntm.length - 6} más</span>
                )}
              </div>
            </div>
          )}

          {/* Restricciones */}
          {restricciones.filter(r => r.valor && r.valor !== 'nan').length > 0 && (
            <div>
              <p className="font-body text-[10px] font-semibold tracking-widest uppercase text-on-surface-variant/40 mb-2">Restricciones del régimen</p>
              {restricciones.filter(r => r.valor && r.valor !== 'nan').map((r, i) => (
                <div key={i} className="flex justify-between px-3 py-1.5 bg-white/[0.02] rounded-lg text-xs">
                  <span className="font-body text-on-surface-variant">{r.restriccion}</span>
                  <span className="font-mono text-on-surface">{r.valor}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ComparadorClient({ paises }) {
  const searchParams = useSearchParams()
  const tipo = 'importacion'
  const [regimen, setRegimen] = useState('general')
  const [ncmItem, setNcmItem] = useState(null)
  const [ncmError, setNcmError] = useState('')
  const [paisesSeleccionados, setPaisesSeleccionados] = useState(['', '', ''])
  const [paisError, setPaisError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [resultados, setResultados] = useState(null)
  const [error, setError] = useState(null)
  const [tabMobile, setTabMobile] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Pre-cargar NCM desde query param
  useEffect(() => {
    const ncmParam = searchParams.get('ncm')
    if (ncmParam) {
      fetch(`/api/ncm-search?q=${encodeURIComponent(ncmParam.replace(/\D/g, ''))}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.length > 0) {
            setNcmItem(data[0])
          }
        })
        .catch(() => {})
    }
  }, [])

  const regimenLabel = REGIMENES[tipo].find(r => r.key === regimen)?.label ?? regimen

  function setPais(idx, val) {
    setPaisesSeleccionados(prev => {
      const next = [...prev]
      next[idx] = val
      return next
    })
  }

  function addPais() {
    if (paisesSeleccionados.length < 3) {
      setPaisesSeleccionados(prev => [...prev, ''])
    }
  }

  function removePais(idx) {
    if (paisesSeleccionados.length <= 2) return
    setPaisesSeleccionados(prev => prev.filter((_, i) => i !== idx))
  }

  const paisesValidos = paisesSeleccionados.filter(p => p !== '')

  async function handleComparar() {
    setError(null)
    setNcmError('')
    setPaisError('')

    if (!ncmItem) {
      setNcmError('Seleccioná un NCM')
      return
    }
    if (paisesValidos.length < 2) {
      setPaisError('Seleccioná al menos 2 países para comparar')
      return
    }

    setCargando(true)
    setResultados(null)

    try {
      const fetchPais = async (iso3) => {
        try {
          const res = await fetch('/api/simulador', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              codigo_ncm: ncmItem.ncm_code,
              pais_iso3: iso3,
              tipo_operacion: tipo,
              regimen,
            }),
          })
          const json = await res.json()
          if (!res.ok) return { iso3, ok: false, error: json.error ?? 'Error' }
          return { iso3, ok: true, data: json }
        } catch {
          return { iso3, ok: false, error: 'Error de red' }
        }
      }

      const raw = await Promise.all(paisesValidos.map(fetchPais))

      // Calcular métrica por país
      const withMetrica = raw.map(r => {
        if (!r.ok) return { ...r, metrica: null }
        const ae = r.data?.preferencias?.arancel_efectivo
        const base = r.data?.aranceles?.arancel_base
        return { ...r, metrica: ae ?? base ?? null }
      })

      // Marcar mejor y peor
      const conMetrica = withMetrica.filter(r => r.metrica !== null)
      const valMin = conMetrica.length > 0 ? Math.min(...conMetrica.map(r => r.metrica)) : null
      const valMax = conMetrica.length > 0 ? Math.max(...conMetrica.map(r => r.metrica)) : null
      const hayVariacion = valMin !== null && valMin !== valMax

      const final = withMetrica.map(r => ({
        ...r,
        esMejor: hayVariacion && r.metrica === valMin,
        esPeor: hayVariacion && r.metrica === valMax,
      }))

      setResultados(final)
      setTabMobile(0)
    } finally {
      setCargando(false)
    }
  }

  const nombrePais = (iso3) => paises.find(p => p.iso3 === iso3)?.name_es ?? iso3

  const paisesDisponibles = (idx) => {
    const selOtros = paisesSeleccionados.filter((_, i) => i !== idx)
    return paises.filter(p => !selOtros.includes(p.iso3))
  }

  return (
    <PageLayout title="COMPARADOR" subtitle="Compará el mismo producto entre 2 o 3 países">
      <div className="max-w-5xl">

        {/* Formulario */}
        <Card className="mb-6">
          {/* NCM + régimen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">Código NCM</label>
              <NcmAutocomplete
                value={ncmItem?.ncm_code ?? ''}
                onSelect={(item) => { setNcmItem(item); setNcmError('') }}
                error={ncmError}
              />
            </div>
            <div>
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">Régimen</label>
              <select
                className="w-full bg-surface-highest rounded-xl px-4 py-3 font-body text-sm text-on-surface border border-transparent outline-none focus:border-primary/30 transition-all cursor-pointer"
                value={regimen}
                onChange={e => setRegimen(e.target.value)}
              >
                {REGIMENES[tipo].map(r => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {ncmItem && (
            <div className="mb-5 px-4 py-2.5 bg-white/[0.03] rounded-xl flex items-center gap-3">
              <span className="font-mono text-sm text-primary">{ncmItem.ncm_code}</span>
              <span className="text-on-surface-variant/20">|</span>
              <span className="font-body text-xs text-on-surface-variant line-clamp-1">{ncmItem.description}</span>
            </div>
          )}

          {/* Países */}
          <div>
            <label className="block font-body text-xs text-on-surface-variant mb-2">Países a comparar</label>
            <div className="space-y-2">
              {paisesSeleccionados.map((iso3, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {iso3 && <FlagImg iso3={iso3} size={22} />}
                  {!iso3 && <span className="w-7 h-5 bg-white/[0.04] rounded inline-block shrink-0" />}
                  <select
                    className={`flex-1 bg-surface-highest rounded-xl px-4 py-2.5 font-body text-sm border border-transparent outline-none focus:border-primary/30 transition-all cursor-pointer ${iso3 ? 'text-on-surface' : 'text-on-surface-variant/50'}`}
                    value={iso3}
                    onChange={e => setPais(idx, e.target.value)}
                  >
                    <option value="">Seleccionar país</option>
                    {mounted && paisesDisponibles(idx).map(p => (
                      <option key={p.iso3} value={p.iso3}>{p.name_es}</option>
                    ))}
                  </select>
                  {paisesSeleccionados.length > 2 && (
                    <button
                      onClick={() => removePais(idx)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant/40 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {paisesSeleccionados.length < 3 && (
              <button
                onClick={addPais}
                className="mt-2 flex items-center gap-1.5 font-body text-xs text-on-surface-variant/50 hover:text-primary transition-colors cursor-pointer"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Agregar tercer país
              </button>
            )}

            {paisError && (
              <p className="mt-2 font-body text-xs text-red-400">{paisError}</p>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="font-body text-xs text-red-400">{error}</p>
            </div>
          )}

          <Button className="mt-5" loading={cargando} onClick={handleComparar}>
            {cargando ? 'Consultando...' : 'COMPARAR'}
          </Button>
        </Card>

        {/* Estado vacío */}
        {!resultados && !cargando && (
          <div className="text-center py-16">
            <div className="mx-auto w-14 h-14 mb-4 text-on-surface-variant/[0.08]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <p className="font-body text-sm text-on-surface-variant/30 uppercase tracking-wide">
              Seleccioná un NCM y 2 países para comparar
            </p>
          </div>
        )}

        {/* Resultados */}
        {resultados && (
          <>
            {/* ── Mejor opción ── */}
            {resultados.some(r => r.esMejor) && (
              <div className="mb-5 px-4 py-3 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-xl flex items-center gap-3">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <div>
                  <span className="font-body text-xs text-emerald-400/70 uppercase tracking-widest">Mejor opción</span>
                  {resultados.filter(r => r.esMejor).map(r => (
                    <p key={r.iso3} className="font-body text-sm text-emerald-400 font-medium">
                      {nombrePais(r.iso3)} —{' '}
                      {tipo === 'importacion'
                        ? `arancel efectivo ${r.metrica}%`
                        : `arancel destino ${r.metrica?.toFixed(1)}% AVE`
                      }
                      {tipo === 'importacion' && r.data?.preferencias?.tiene_preferencia && (
                        <span className="ml-2 font-mono text-[10px] text-emerald-400/60">con preferencia arancelaria</span>
                      )}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tabla desktop ── */}
            <div className="hidden md:block mb-6">
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/[0.05]">
                        <th className="py-3 pr-4 font-body text-[10px] text-on-surface-variant/40 uppercase tracking-widest w-40">Métrica</th>
                        {resultados.map(r => (
                          <th key={r.iso3} className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <FlagImg iso3={r.iso3} size={20} />
                              <span className={`font-body text-sm font-medium ${r.esMejor ? 'text-emerald-400' : 'text-on-surface'}`}>
                                {nombrePais(r.iso3)}
                              </span>
                              {r.esMejor && (
                                <span className="font-mono text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">MEJOR</span>
                              )}
                              {r.esPeor && (
                                <span className="font-mono text-[9px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">MAYOR COSTO</span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Métrica principal */}
                      <tr className="border-b border-white/[0.04] bg-white/[0.01]">
                        <td className="py-3 pr-4 font-body text-xs font-semibold text-on-surface-variant/80">
                          {tipo === 'importacion' ? 'Arancel efectivo' : 'Arancel destino'}
                        </td>
                        {resultados.map(r => (
                          <td key={r.iso3} className="py-3 px-3">
                            {!r.ok ? (
                              <span className="font-mono text-xs text-red-400/60">Error</span>
                            ) : r.metrica === null ? (
                              <span className="font-mono text-xs text-on-surface-variant/30">Sin datos</span>
                            ) : (
                              <span className={`font-mono text-base font-bold ${r.esMejor ? 'text-emerald-400' : r.esPeor ? 'text-red-400' : 'text-on-surface'}`}>
                                {tipo === 'importacion' ? `${r.metrica}%` : `${r.metrica?.toFixed(1)}%`}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>

                      {tipo === 'importacion' && (
                        <>
                          <SectionRow
                            label="AEC"
                            values={resultados}
                            renderCell={r => <span className="font-mono text-xs text-on-surface-variant">{r.data?.aranceles?.aec ?? '—'}%</span>}
                          />
                          <SectionRow
                            label="Arancel base"
                            values={resultados}
                            renderCell={r => <span className="font-mono text-xs text-on-surface-variant">{r.data?.aranceles?.arancel_base ?? '—'}%</span>}
                          />
                          <SectionRow
                            label="IVA"
                            values={resultados}
                            renderCell={r => <span className="font-mono text-xs text-on-surface-variant">{r.data?.aranceles?.iva ?? '—'}%</span>}
                          />
                          <SectionRow
                            label="Preferencia"
                            values={resultados}
                            renderCell={r => r.data?.preferencias?.tiene_preferencia
                              ? <span className="font-body text-xs text-emerald-400">{r.data.preferencias.acuerdos?.[0]?.bloque ?? 'Sí'}</span>
                              : <span className="font-mono text-xs text-on-surface-variant/30">No</span>
                            }
                          />
                        </>
                      )}


                      <SectionRow
                        label="Organismos"
                        values={resultados}
                        renderCell={r => {
                          const obs = r.data?.organismos?.obligatorios ?? []
                          return obs.length > 0
                            ? <span className="font-body text-xs text-red-400">{obs.map(o => o.organismo).join(', ')}</span>
                            : <span className="font-mono text-xs text-on-surface-variant/30">—</span>
                        }}
                      />
                      <SectionRow
                        label="Docs. críticos"
                        values={resultados}
                        renderCell={r => {
                          const n = r.data?.documentos?.criticos?.length ?? 0
                          return <span className="font-mono text-xs text-on-surface-variant">{n > 0 ? `${n} documentos` : '—'}</span>
                        }}
                      />
                      <SectionRow
                        label="Barreras NTM"
                        values={resultados}
                        renderCell={r => {
                          const extTotal = r.data?.ntm_extended?.total ?? 0
                          const base = r.data?.barreras_ntm?.length ?? 0
                          const total = extTotal + base
                          if (total === 0) return <span className="font-mono text-xs text-on-surface-variant/30">—</span>
                          const color = total <= 2 ? 'text-emerald-400' : total <= 5 ? 'text-amber-400' : 'text-red-400'
                          return <span className={`font-mono text-xs ${color}`}>{total} medidas</span>
                        }}
                      />
                      <SectionRow
                        label="Warnings"
                        values={resultados}
                        renderCell={r => {
                          const w = r.data?.warnings ?? []
                          return w.length > 0
                            ? <span className="font-body text-xs text-amber-400">{w.length} alerta{w.length > 1 ? 's' : ''}</span>
                            : <span className="font-mono text-xs text-on-surface-variant/30">—</span>
                        }}
                      />
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* ── Tabs mobile ── */}
            <div className="md:hidden mb-4">
              <div className="flex bg-white/[0.04] rounded-xl p-1 gap-1 mb-4">
                {resultados.map((r, i) => (
                  <button
                    key={r.iso3}
                    onClick={() => setTabMobile(i)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-body text-xs transition-all cursor-pointer ${
                      tabMobile === i ? 'bg-white/[0.08] text-on-surface' : 'text-on-surface-variant/50'
                    }`}
                  >
                    <FlagImg iso3={r.iso3} size={16} />
                    <span className="truncate">{nombrePais(r.iso3).split(' ')[0]}</span>
                  </button>
                ))}
              </div>

              {resultados[tabMobile] && (() => {
                const r = resultados[tabMobile]
                return (
                  <Card>
                    <div className="flex items-center gap-2 mb-4">
                      <FlagImg iso3={r.iso3} size={24} />
                      <span className={`font-body text-base font-semibold ${r.esMejor ? 'text-emerald-400' : 'text-on-surface'}`}>
                        {nombrePais(r.iso3)}
                      </span>
                      {r.esMejor && <span className="font-mono text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">MEJOR</span>}
                      {r.esPeor && <span className="font-mono text-[9px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">MAYOR COSTO</span>}
                    </div>

                    {!r.ok ? (
                      <p className="font-body text-sm text-red-400">{r.error ?? 'Error al consultar'}</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between px-3 py-2 bg-white/[0.03] rounded-xl">
                          <span className="font-body text-xs text-on-surface-variant">
                            {tipo === 'importacion' ? 'Arancel efectivo' : 'Arancel destino'}
                          </span>
                          <span className={`font-mono text-sm font-bold ${r.esMejor ? 'text-emerald-400' : r.esPeor ? 'text-red-400' : 'text-on-surface'}`}>
                            {r.metrica !== null ? `${tipo === 'importacion' ? r.metrica : r.metrica?.toFixed(1)}%` : 'Sin datos'}
                          </span>
                        </div>

                        {tipo === 'importacion' && [
                          ['AEC', r.data?.aranceles?.aec],
                          ['DII / DIE', r.data?.aranceles?.arancel_base],
                          ['IVA', r.data?.aranceles?.iva],
                        ].map(([label, val]) => val !== null && val !== undefined ? (
                          <div key={label} className="flex justify-between px-3 py-1.5 bg-white/[0.02] rounded-lg">
                            <span className="font-mono text-[10px] text-on-surface-variant/50">{label}</span>
                            <span className="font-mono text-xs text-on-surface">{val}%</span>
                          </div>
                        ) : null)}

                        {r.data?.preferencias?.tiene_preferencia && (
                          <div className="px-3 py-2 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                            <p className="font-mono text-[10px] text-emerald-400/60 uppercase tracking-widest mb-0.5">Preferencia</p>
                            <p className="font-body text-xs text-emerald-400">
                              {r.data.preferencias.acuerdos?.[0]?.bloque}
                            </p>
                          </div>
                        )}

                        {(r.data?.organismos?.obligatorios?.length > 0) && (
                          <div className="px-3 py-2 bg-red-500/5 border border-red-500/15 rounded-xl">
                            <p className="font-mono text-[10px] text-red-400/60 uppercase tracking-widest mb-1">Organismos obligatorios</p>
                            <p className="font-body text-xs text-red-400">
                              {r.data.organismos.obligatorios.map(o => o.organismo).join(', ')}
                            </p>
                          </div>
                        )}

                        {r.data?.warnings?.length > 0 && (
                          <div className="px-3 py-2 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                            <p className="font-mono text-[10px] text-amber-400/60 uppercase tracking-widest mb-1">Alertas</p>
                            {r.data.warnings.map((w, i) => (
                              <p key={i} className="font-body text-xs text-amber-400">{w}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })()}
            </div>

            {/* ── Detalle colapsable por país ── */}
            <div className="space-y-2 mb-6">
              <p className="font-body text-[10px] font-semibold tracking-widest uppercase text-on-surface-variant/40 mb-3">
                Detalle completo por país
              </p>
              {resultados.map(r => (
                <DetailCard
                  key={r.iso3}
                  resultado={r}
                  tipo={tipo}
                  nombre={nombrePais(r.iso3)}
                />
              ))}
            </div>

            <p className="font-mono text-[10px] text-on-surface-variant/20 text-center leading-relaxed">
              Datos: ARCA (aranceles importación ARG) · WITS/ITC 2024 (aranceles destino) · UNCTAD TRAINS (NTM).
              Esta información es orientativa y está respaldada por fuentes oficiales.
              Para operaciones concretas, consultá con un despachante de aduana matriculado
              o un profesional de comercio exterior.
            </p>
          </>
        )}
      </div>
    </PageLayout>
  )
}
