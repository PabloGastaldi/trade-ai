import { createClient } from '@supabase/supabase-js'
import { normalizarCodigoNCM } from './ncm-lookup.js'

// ─────────────────────────────────────────────
// CLIENTE SUPABASE CON SERVICE ROLE
// NUNCA importar en Client Components.
// ─────────────────────────────────────────────
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function generarDescripcionTLC(notas, pais, acuerdo) {
  if (notas) return notas
  return `Acuerdo de cobertura total entre Argentina y ${pais} (${acuerdo}).`
}

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: buscarPreferencias
//
// Nuevo schema: tabla acuerdos_importacion
// con campo porcentaje (0-100 = % de preferencia arancelaria).
// acuerdos_generales sigue igual (TLC de cobertura total).
// ─────────────────────────────────────────────
/**
 * Busca preferencias arancelarias de importación para un NCM.
 * @param {string} ncmCode — código NCM en cualquier formato soportado por normalizarCodigoNCM()
 * @returns {Promise<{
 *   ncm_code: string,
 *   codigo_ncm: string,
 *   tiene_preferencias: boolean,
 *   preferencias_especificas: Array<{ acuerdo: string, pais: string, porcentaje: number, tipo: 'importacion' }>,
 *   acuerdos_cobertura_total: Array<{ acuerdo: string, pais: string, tipo: string, descripcion: string }>
 * }>}
 */
export async function buscarPreferencias(ncmCode) {
  if (!ncmCode || typeof ncmCode !== 'string') return _resultadoVacio(ncmCode)

  const normalizado = normalizarCodigoNCM(ncmCode)
  if (!normalizado) return _resultadoVacio(ncmCode)

  const codigoNCM = normalizado.codigoNCM  // 11 dígitos sin puntos
  const supabase = getServiceClient()

  const [resultImpo, resultTLC] = await Promise.all([
    // Acuerdos de importación para este NCM
    supabase
      .from('acuerdos_importacion')
      .select('bloque, pais, codigo_acuerdo, porcentaje')
      .eq('codigo_ncm', codigoNCM)
      .order('codigo_acuerdo')
      .order('pais'),

    // TLC de cobertura total (aplican a todos los productos)
    supabase
      .from('acuerdos_generales')
      .select('acuerdo_id, pais, tipo, notas')
      .order('acuerdo_id')
      .order('pais'),
  ])

  if (resultImpo.error) throw new Error(`Error en acuerdos_importacion: ${resultImpo.error.message}`)
  if (resultTLC.error)  throw new Error(`Error en acuerdos_generales: ${resultTLC.error.message}`)

  const preferenciasImpo = (resultImpo.data ?? []).map((r) => ({
    acuerdo:     r.codigo_acuerdo,
    bloque:      r.bloque,
    pais:        r.pais,
    porcentaje:  r.porcentaje,
    tipo:        'importacion',
    descripcion: `${r.pais} — preferencia ${r.porcentaje}% bajo ${r.codigo_acuerdo} (${r.bloque})`,
  }))

  const acuerdosCoberturaTotal = (resultTLC.data ?? []).map((r) => ({
    acuerdo:     r.acuerdo_id,
    pais:        r.pais,
    tipo:        r.tipo,
    descripcion: generarDescripcionTLC(r.notas, r.pais, r.acuerdo_id),
  }))

  const preferenciasEspecificas = [...preferenciasImpo]
  const tienePreferencias = preferenciasEspecificas.length > 0 || acuerdosCoberturaTotal.length > 0

  return {
    ncm_code:                 normalizado.ncmCode,  // formato display XXXX.XX.XX
    codigo_ncm:               codigoNCM,
    tiene_preferencias:       tienePreferencias,
    preferencias_especificas: preferenciasEspecificas,
    acuerdos_cobertura_total: acuerdosCoberturaTotal,
  }
}

// ─────────────────────────────────────────────
// FORMATEADOR PARA PROMPT DEL AGENTE
// ─────────────────────────────────────────────
/**
 * Formatea el resultado de buscarPreferencias() como bloque de texto para el prompt de Claude.
 * @param {ReturnType<typeof buscarPreferencias> extends Promise<infer T> ? T : never} resultado
 * @returns {string}
 */
export function formatearPreferencias(resultado) {
  if (!resultado || !resultado.tiene_preferencias) {
    return (
      '[PREFERENCIAS_ARANCELARIAS]\n' +
      'No se encontraron preferencias arancelarias específicas para este NCM.\n' +
      'Consultar con un despachante de aduana para acuerdos no incluidos en la base.'
    )
  }

  const lineas = ['[PREFERENCIAS_ARANCELARIAS]']

  if (resultado.preferencias_especificas.length > 0) {
    lineas.push('\nPreferencias de importación (lo que Argentina otorga a terceros países):')
    const porAcuerdo = {}
    for (const p of resultado.preferencias_especificas) {
      if (!porAcuerdo[p.acuerdo]) porAcuerdo[p.acuerdo] = []
      porAcuerdo[p.acuerdo].push(p)
    }
    for (const [acuerdo, prefs] of Object.entries(porAcuerdo)) {
      lineas.push(`\n  ${acuerdo}:`)
      for (const p of prefs) lineas.push(`    • ${p.descripcion}`)
    }
  }

  if (resultado.acuerdos_cobertura_total.length > 0) {
    lineas.push('\nAcuerdos de libre comercio de cobertura total (aplican a TODOS los productos):')
    for (const tlc of resultado.acuerdos_cobertura_total) {
      lineas.push(`  • ${tlc.acuerdo} con ${tlc.pais}: ${tlc.descripcion}`)
    }
  }

  lineas.push('\nNota: no están incluidos en la base ACE-36 Bolivia ni SGP (UE, USA, Japón).')
  return lineas.join('\n')
}

function _resultadoVacio(ncmCode) {
  return {
    ncm_code:                ncmCode ?? null,
    tiene_preferencias:      false,
    preferencias_especificas: [],
    acuerdos_cobertura_total: [],
  }
}
