'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PageLayout from '@/components/ui/PageLayout'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import NcmAutocomplete from '@/components/ui/NcmAutocomplete'
import Collapsible from '@/components/ui/Collapsible'
import { formatearNCMDisplay } from '@/lib/ncm-lookup'
import {
  AlertTriangle, FileText, File,
  Building2, Package, Globe, ArrowRight,
} from 'lucide-react'

const REGIMENES = {
  importacion: [
    { key: 'general',       label: 'Régimen general' },
    { key: 'courier',       label: 'Courier' },
    { key: 'puerta_a_puerta', label: 'Puerta a puerta' },
    { key: 'muestras',      label: 'Muestras sin valor comercial' },
  ],
}

function pct(n) {
  if (n === null || n === undefined) return '—'
  return `${Number(n).toFixed(1)}%`
}

function ArancelRow({ label, valor, highlight, dimmed }) {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-hairline last:border-0 ${dimmed ? 'opacity-40' : ''}`}>
      <span className={`font-body text-xs ${highlight ? 'text-on-surface' : 'text-on-surface-variant'}`}>{label}</span>
      <span className={`font-mono text-xs ${highlight ? 'text-primary font-semibold' : 'text-on-surface'}`}>{valor}</span>
    </div>
  )
}

function DocRow({ doc }) {
  const isNan = v => !v || v === 'nan'
  const catIcon = {
    critico:    <AlertTriangle size={12} className="text-red-600 shrink-0 mt-0.5" />,
    importante: <FileText size={12} className="text-amber-600 shrink-0 mt-0.5" />,
  }[doc.documento_categoria] ?? <File size={12} className="text-on-surface-variant shrink-0 mt-0.5" />

  return (
    <div className="flex gap-3 py-3 border-b border-hairline last:border-0">
      {catIcon}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="font-body text-xs text-on-surface">{doc.documento_nombre}</span>
          {doc.organismo_emisor && !isNan(doc.organismo_emisor) && (
            <span className="font-body text-[10px] text-on-surface-variant shrink-0">{doc.organismo_emisor}</span>
          )}
        </div>
        {!isNan(doc.base_legal) && (
          <p className="font-body text-[10px] text-ink-subtle mt-0.5">Base legal: {doc.base_legal}</p>
        )}
        {!isNan(doc.notas) && (
          <p className="font-body text-[10px] text-ink-subtle mt-0.5">{doc.notas}</p>
        )}
      </div>
    </div>
  )
}

function OrganismoRow({ org }) {
  const isNan = v => !v || v === 'nan'
  const borderColor = org.estado === 'obligatorio' ? 'border-red-600' : 'border-amber-600'
  return (
    <div className={`border-l-2 ${borderColor} pl-3 py-2 mb-2 last:mb-0`}>
      <div className="flex items-center gap-2">
        <span className="font-body text-xs font-semibold text-on-surface">{org.organismo}</span>
        <Badge variant={org.estado === 'obligatorio' ? 'error' : 'accent'}>
          {org.estado === 'obligatorio' ? 'Obligatorio' : 'Condicional'}
        </Badge>
      </div>
      {org.categoria_producto && !isNan(org.categoria_producto) && (
        <p className="font-body text-[10px] text-on-surface-variant mt-0.5 capitalize">{org.categoria_producto}</p>
      )}
      {!isNan(org.base_legal) && (
        <p className="font-body text-[10px] text-ink-subtle mt-0.5">Base legal: {org.base_legal}</p>
      )}
    </div>
  )
}

export default function SimuladorClient({ paises }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [ncmInput, setNcmInput] = useState('')
  const [ncmSeleccionado, setNcmSeleccionado] = useState(null)
  const [paisIso3, setPaisIso3] = useState('')
  const tipoOperacion = 'importacion'
  const [regimen, setRegimen] = useState('general')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [errorApi, setErrorApi] = useState(null)

  // Pre-cargar NCM desde query param
  useEffect(() => {
    const ncmParam = searchParams.get('ncm')
    if (ncmParam) {
      setNcmInput(ncmParam)
      // Buscar el NCM para mostrar la descripción
      fetch(`/api/ncm-search?q=${encodeURIComponent(ncmParam.replace(/\D/g, ''))}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.length > 0) {
            setNcmSeleccionado(data[0])
          }
        })
        .catch(() => {})
    }
  }, [])

  function handleNcmSelect(item) {
    setNcmInput(item.ncm_code || '')
    if (item.ncm_code && item.description !== undefined) {
      setNcmSeleccionado(item)
    } else {
      setNcmSeleccionado(null)
    }
    setErrors(prev => ({ ...prev, ncm: null }))
    setResultado(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!ncmInput.trim()) errs.ncm = 'Ingresá un código NCM'
    if (!paisIso3) errs.pais = 'Seleccioná un país'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setErrors({})
    setLoading(true)
    setErrorApi(null)
    setResultado(null)

    try {
      const res = await fetch('/api/simulador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_ncm: ncmInput.trim(),
          pais_iso3: paisIso3,
          tipo_operacion: tipoOperacion,
          regimen,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorApi(data.error ?? 'Error al simular la operación')
      } else {
        setResultado(data)
        setTimeout(() => {
          document.getElementById('simulador-reporte')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      }
    } catch (err) {
      setErrorApi('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const regimenOptions = REGIMENES[tipoOperacion] ?? REGIMENES.importacion

  return (
    <PageLayout title="SIMULADOR" subtitle="Panorama completo de una operación de comercio exterior">
      {/* Formulario */}
      <form onSubmit={handleSubmit}>
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* NCM */}
            <div className="lg:col-span-2">
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">
                Código NCM <span className="text-red-600">*</span>
              </label>
              <NcmAutocomplete
                value={ncmInput}
                onSelect={handleNcmSelect}
                error={errors.ncm}
              />
              {ncmSeleccionado?.description && (
                <p className="mt-1.5 font-body text-[11px] text-ink-subtle">
                  {ncmSeleccionado.description}
                </p>
              )}
            </div>

            {/* País */}
            <div>
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">
                País <span className="text-red-600">*</span>
              </label>
              <select
                className={`w-full bg-surface rounded-md px-4 py-3 font-body text-sm text-on-surface border outline-none transition-all duration-150 cursor-pointer ${
                  errors.pais ? 'border-red-400' : 'border-hairline focus:border-on-surface'
                }`}
                value={paisIso3}
                onChange={e => { setPaisIso3(e.target.value); setErrors(prev => ({ ...prev, pais: null })); setResultado(null) }}
              >
                <option value="">Seleccionar país…</option>
                {paises.map(p => (
                  <option key={p.iso3} value={p.iso3}>{p.name_es}</option>
                ))}
              </select>
              {errors.pais && <p className="mt-1 font-body text-[10px] text-red-600">{errors.pais}</p>}
            </div>

            {/* Régimen */}
            <div className="lg:col-span-2">
              <label className="block font-body text-xs text-on-surface-variant mb-1.5">
                Régimen
              </label>
              <select
                className="w-full bg-surface rounded-md px-4 py-3 font-body text-sm text-on-surface border border-hairline outline-none focus:border-on-surface transition-all cursor-pointer"
                value={regimen}
                onChange={e => { setRegimen(e.target.value); setResultado(null) }}
              >
                {regimenOptions.map(r => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button type="submit" loading={loading} disabled={loading}>
              SIMULAR OPERACIÓN
            </Button>
          </div>
        </Card>
      </form>

      {/* Error API */}
      {errorApi && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-lg">
          <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
          <p className="font-body text-sm text-red-600">{errorApi}</p>
        </div>
      )}

      {/* Skeleton loading */}
      {loading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-lg border border-hairline animate-pulse" />
          ))}
        </div>
      )}

      {/* Reporte */}
      {resultado && !loading && (
        <div id="simulador-reporte" className="space-y-4">
          {/* Header del reporte */}
          <ReporteHeader resultado={resultado} />

          {/* Warnings */}
          {resultado.warnings.length > 0 && (
            <div className="space-y-2">
              {resultado.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="font-body text-sm text-amber-700">{w}</p>
                </div>
              ))}
            </div>
          )}

          {/* Sección 1: Aranceles */}
          <SeccionAranceles resultado={resultado} />

          {/* Sección 2: Documentación */}
          <SeccionDocumentacion resultado={resultado} />

          {/* Sección 3: Organismos */}
          {(resultado.organismos.obligatorios.length > 0 || resultado.organismos.condicionales.length > 0) && (
            <SeccionOrganismos resultado={resultado} />
          )}

          {/* Sección 4: Restricciones del régimen */}
          {resultado.restricciones.length > 0 && (
            <SeccionRestricciones resultado={resultado} />
          )}

          {/* Sección 5: Barreras NTM */}
          <SeccionNTM resultado={resultado} />

          {/* Acciones */}
          <AccionesPostReporte resultado={resultado} />
        </div>
      )}
    </PageLayout>
  )
}

function ReporteHeader({ resultado }) {
  const { ncm, pais, tipo_operacion, regimen, preferencias } = resultado
  const tipoLabel = tipo_operacion === 'importacion' ? 'IMPORTACIÓN' : 'EXPORTACIÓN'
  const ncmDisplay = formatearNCMDisplay(ncm.codigo_ncm)
  const regimenLabel = {
    general: 'Régimen general',
    courier: 'Courier',
    puerta_a_puerta: 'Puerta a puerta',
    exporta_simple: 'Exporta simple',
    muestras: 'Muestras sin valor comercial',
    rancho: 'Rancho',
    equipaje: 'Equipaje',
  }[regimen] ?? regimen

  return (
    <div className="p-5 bg-primary/[0.06] border border-primary/20 rounded-lg">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-body text-xs font-semibold text-primary tracking-widest">{tipoLabel}</span>
            <span className="text-ink-tertiary">·</span>
            <span className="font-mono text-xs text-on-surface-variant">{ncmDisplay}</span>
          </div>
          <p className="font-body text-sm text-on-surface line-clamp-2">{ncm.descripcion}</p>
          <p className="font-body text-xs text-on-surface-variant mt-1">
            {tipo_operacion === 'importacion' ? 'desde' : 'hacia'} {pais.nombre_es} — {regimenLabel}
          </p>
          {ncm.seccion && (
            <p className="font-body text-[10px] text-ink-subtle mt-0.5">
              Sección {ncm.seccion} · Capítulo {ncm.capitulo}
            </p>
          )}
        </div>
        {preferencias.tiene_preferencia && (
          <Badge variant="success">
            PREFERENCIA {preferencias.mejor_preferencia}%
          </Badge>
        )}
      </div>
    </div>
  )
}

function SeccionAranceles({ resultado }) {
  const { aranceles, preferencias, tipo_operacion, pais } = resultado

  if (tipo_operacion === 'importacion') {
    const tienePreferencia = preferencias.tiene_preferencia
    const arancelOriginal = aranceles.arancel_base
    const arancelEfectivo = preferencias.arancel_efectivo

    return (
      <Collapsible title="Aranceles y tributos">
        <div className="space-y-1 mb-4">
          <ArancelRow label="Arancel Externo Común (AEC)" valor={pct(aranceles.aec)} />
          <ArancelRow label="Der. Importación Extrazona (DIE)" valor={pct(aranceles.die)} />
          <ArancelRow label="Der. Importación Intrazona (DII)" valor={pct(aranceles.dii)} />
          <ArancelRow label="Tasa de Estadística" valor={pct(aranceles.te)} />
          <ArancelRow label="IVA" valor={pct(aranceles.iva)} highlight />
          <ArancelRow label="IVA Adicional" valor={pct(aranceles.iva_ad)} />
          <ArancelRow label="Percepción Ganancias" valor={pct(aranceles.gan)} />
          <ArancelRow label="Percepción IIBB" valor={pct(aranceles.iibb)} />
        </div>

        {tienePreferencia && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-md">
            {preferencias.acuerdos.length > 0 && (
              <>
                <p className="font-body text-xs font-semibold text-emerald-600 mb-1">
                  Preferencia arancelaria: {preferencias.acuerdos[0].porcentaje}%
                  {' '}({preferencias.acuerdos[0].codigo_acuerdo} — {preferencias.acuerdos[0].bloque})
                </p>
                <p className="font-body text-xs text-emerald-700">
                  Arancel efectivo:{' '}
                  <span className="font-mono font-semibold">{pct(preferencias.arancel_efectivo)}</span>
                  {arancelOriginal > 0 && (
                    <span className="text-emerald-700/60 ml-2 line-through font-mono">{pct(arancelOriginal)}</span>
                  )}
                </p>
              </>
            )}
            {preferencias.acuerdos.length === 0 && preferencias.tlc_general && (
              <p className="font-body text-xs text-emerald-600">
                TLC de cobertura total: {preferencias.tlc_general.acuerdo_id} — arancel efectivo: 0%
              </p>
            )}
          </div>
        )}

        {!tienePreferencia && (
          <p className="font-body text-xs text-ink-subtle mt-2">
            No se encontraron preferencias arancelarias para {pais.nombre_es} con este NCM.
          </p>
        )}
      </Collapsible>
    )
  }
}

function SeccionDocumentacion({ resultado }) {
  const { documentos } = resultado
  const total = documentos.criticos.length + documentos.importantes.length + documentos.opcionales.length

  const badge = (
    <Badge variant={documentos.criticos.length > 0 ? 'error' : 'neutral'}>
      {total} docs
    </Badge>
  )

  if (total === 0) {
    return (
      <Collapsible title="Documentación requerida" badge={badge}>
        <p className="font-body text-xs text-ink-subtle">
          No se encontraron documentos registrados para esta operación/régimen.
        </p>
      </Collapsible>
    )
  }

  return (
    <Collapsible title="Documentación requerida" badge={badge}>
      {documentos.criticos.length > 0 && (
        <div className="mb-4">
          <p className="font-body text-[10px] font-semibold text-red-600 tracking-widest uppercase mb-2">Críticos</p>
          {documentos.criticos.map(d => <DocRow key={d.id} doc={d} />)}
        </div>
      )}
      {documentos.importantes.length > 0 && (
        <div className="mb-4">
          <p className="font-body text-[10px] font-semibold text-amber-600 tracking-widest uppercase mb-2">Importantes</p>
          {documentos.importantes.map(d => <DocRow key={d.id} doc={d} />)}
        </div>
      )}
      {documentos.opcionales.length > 0 && (
        <div>
          <p className="font-body text-[10px] font-semibold text-ink-subtle tracking-widest uppercase mb-2">Opcionales</p>
          {documentos.opcionales.map(d => <DocRow key={d.id} doc={d} />)}
        </div>
      )}
    </Collapsible>
  )
}

function SeccionOrganismos({ resultado }) {
  const { organismos } = resultado
  const total = organismos.obligatorios.length + organismos.condicionales.length

  return (
    <Collapsible
      title="Organismos que intervienen"
      badge={<Badge variant={organismos.obligatorios.length > 0 ? 'error' : 'neutral'}>{total}</Badge>}
    >
      {organismos.obligatorios.length > 0 && (
        <div className="mb-4">
          <p className="font-body text-[10px] font-semibold text-red-600 tracking-widest uppercase mb-2">Obligatorios</p>
          {organismos.obligatorios.map(o => <OrganismoRow key={o.id} org={o} />)}
        </div>
      )}
      {organismos.condicionales.length > 0 && (
        <div>
          <p className="font-body text-[10px] font-semibold text-amber-600 tracking-widest uppercase mb-2">Condicionales</p>
          {organismos.condicionales.map(o => <OrganismoRow key={o.id} org={o} />)}
        </div>
      )}
    </Collapsible>
  )
}

function SeccionRestricciones({ resultado }) {
  const { restricciones, regimen } = resultado
  const regimenLabel = {
    courier: 'Courier',
    puerta_a_puerta: 'Puerta a puerta',
    exporta_simple: 'Exporta simple',
    muestras: 'Muestras',
    rancho: 'Rancho',
  }[regimen] ?? regimen

  return (
    <Collapsible
      title={`Restricciones — ${regimenLabel}`}
      badge={<Badge variant="accent">{restricciones.length}</Badge>}
    >
      <div className="space-y-3">
        {restricciones.map(r => (
          <div key={r.id} className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-md">
            <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-body text-xs text-amber-700 font-medium">{r.restriccion}</p>
              {r.valor && r.valor !== 'nan' && (
                <p className="font-mono text-xs text-amber-700 mt-0.5">{r.valor}</p>
              )}
              {r.base_legal && r.base_legal !== 'nan' && (
                <p className="font-body text-[10px] text-ink-subtle mt-1">Base legal: {r.base_legal}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Collapsible>
  )
}

function SeccionNTM({ resultado }) {
  const { barreras_ntm, pais, tipo_operacion } = resultado

  const titulo = tipo_operacion === 'importacion'
    ? 'Barreras no arancelarias (Argentina aplica)'
    : `Barreras no arancelarias (${pais.nombre_es} aplica)`

  if (barreras_ntm.length === 0) {
    return (
      <Collapsible title={titulo}>
        <p className="font-body text-xs text-ink-subtle">
          No se encontraron barreras no arancelarias registradas para este producto.
        </p>
      </Collapsible>
    )
  }

  // Deduplicar por tipo
  const porTipo = {}
  barreras_ntm.forEach(m => {
    if (!porTipo[m.tipo]) porTipo[m.tipo] = { ...m, count: 0 }
    porTipo[m.tipo].count++
  })

  return (
    <Collapsible title={titulo} badge={<Badge variant="neutral">{barreras_ntm.length}</Badge>}>
      <div className="space-y-2">
        {Object.values(porTipo).map((m, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-hairline last:border-0">
            <div>
              <span className="font-body text-xs text-on-surface">{m.tipo}</span>
              {m.count > 1 && (
                <span className="font-body text-[10px] text-ink-subtle ml-2">({m.count} medidas)</span>
              )}
            </div>
            <Badge variant="neutral">{m.cobertura}</Badge>
          </div>
        ))}
      </div>
    </Collapsible>
  )
}

function AccionesPostReporte({ resultado }) {
  const { ncm, pais, tipo_operacion } = resultado
  const calcUrl = `/calculadora?ncm=${encodeURIComponent(ncm.codigo_ncm)}&pais=${encodeURIComponent(pais.iso3)}&tipo=${tipo_operacion}`
  const opsUrl  = `/operaciones?ncm=${encodeURIComponent(ncm.codigo_ncm)}&pais=${encodeURIComponent(pais.iso3)}&tipo=${tipo_operacion}`

  return (
    <div className="flex flex-col sm:flex-row gap-3 pt-2">
      <a
        href={calcUrl}
        className="flex items-center justify-center gap-2 px-5 py-3 bg-primary/10 border border-primary/20 rounded-md font-body text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
      >
        <span>Calcular costos</span>
        <ArrowRight size={14} />
      </a>
      <a
        href={opsUrl}
        className="flex items-center justify-center gap-2 px-5 py-3 bg-surface-1 border border-hairline rounded-md font-body text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-high transition-colors"
      >
        <span>Nueva operación</span>
        <ArrowRight size={14} />
      </a>
    </div>
  )
}
