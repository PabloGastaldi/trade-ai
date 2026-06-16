'use client'

import Badge from '@/components/ui/Badge'

/**
 * Bloque de contexto comercial post-cálculo: acuerdos + barreras NTM de importación.
 * Props:
 *   contexto — objeto { acuerdos, ntm } devuelto por /api/calculadora/contexto
 */
export default function ContextoComercial({ contexto }) {
  const acuerdos = contexto?.acuerdos ?? []
  const ntm = contexto?.ntm ?? []

  const tituloAcuerdos = 'Acuerdos disponibles'
  const tituloNTM = 'Barreras no arancelarias aplicables'

  if (acuerdos.length === 0 && ntm.length === 0) return null

  return (
    <div className="space-y-3">
      {acuerdos.length > 0 && (
        <div className="bg-surface-1 rounded-lg border border-hairline p-5">
          <p className="font-body text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-3">{tituloAcuerdos}</p>
          <div className="space-y-2">
            {acuerdos.map((a, i) => (
              <div key={i} className="flex justify-between items-center py-2 px-3 bg-surface rounded-md">
                <div>
                  <p className="font-body text-sm text-on-surface">{a.codigo_acuerdo ?? a.acuerdo}</p>
                  <p className="font-body text-[10px] text-ink-subtle">{a.bloque ?? ''}{a.pais ? ` · ${a.pais}` : ''}</p>
                </div>
                <Badge variant={a.porcentaje === 100 ? 'success' : 'primary'}>
                  {a.porcentaje === 100 ? 'Libre' : `${a.porcentaje}% pref.`}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {ntm.length > 0 && (
        <div className="bg-surface-1 rounded-lg border border-hairline p-5">
          <p className="font-body text-xs font-semibold tracking-widests text-on-surface-variant uppercase mb-3">{tituloNTM}</p>
          <div className="space-y-1.5">
            {ntm.map((m, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 px-3 bg-surface rounded-md">
                <Badge variant="neutral">{m.ntm_code}</Badge>
                <span className="font-body text-xs text-on-surface-variant">{m.tipo_medida}</span>
                {m.cobertura && <span className="font-body text-[10px] text-ink-subtle ml-auto">{m.cobertura}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
