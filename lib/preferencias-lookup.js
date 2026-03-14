import { createClient } from '@supabase/supabase-js'
import { normalizarCodigoNCM } from './ncm-lookup.js'

// ─────────────────────────────────────────────
// CLIENTE SUPABASE CON SERVICE ROLE
// NUNCA importar en Client Components.
// ─────────────────────────────────────────────
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ─────────────────────────────────────────────
// DESCRIPCIÓN LEGIBLE DE CADA PREFERENCIA
//
// Convierte los campos técnicos en una oración clara
// para el usuario final de la app.
// ─────────────────────────────────────────────
function generarDescripcion(tipo, pais, acuerdo) {
  if (tipo === 'importacion') {
    return `${pais} otorga preferencia arancelaria a Argentina bajo el acuerdo ${acuerdo}.`
  }
  if (tipo === 'exportacion') {
    return `Argentina otorga preferencia arancelaria a ${pais} bajo el acuerdo ${acuerdo}.`
  }
  // tipo 'ambos' — usado en acuerdos_generales
  return `Libre circulación de bienes entre Argentina y ${pais} bajo el acuerdo ${acuerdo}.`
}

function generarDescripcionTLC(notas, pais, acuerdo) {
  // Priorizar las notas que ya tenemos en la tabla
  if (notas) return notas
  return `Acuerdo de cobertura total entre Argentina y ${pais} (${acuerdo}).`
}

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL EXPORTADA: buscarPreferencias
//
// Dado un ncm_code, devuelve todas las preferencias
// arancelarias aplicables, combinando:
//   - preferencias_arancelarias: acuerdos específicos por NCM
//   - acuerdos_generales: TLC de cobertura total (aplican a TODOS los NCMs)
//
// Parámetros:
//   ncmCode — string en formato XXXX.XX.XX (ej: "0402.10.10")
//             también acepta formato sin puntos (ej: "04021010")
//
// Retorna:
//   {
//     ncm_code,
//     tiene_preferencias,
//     preferencias_especificas,   // del acuerdo puntual para ese NCM
//     acuerdos_cobertura_total,   // TLC que cubren todos los productos
//   }
// ─────────────────────────────────────────────
export async function buscarPreferencias(ncmCode) {
  if (!ncmCode || typeof ncmCode !== 'string') {
    return _resultadoVacio(ncmCode)
  }

  // Normalizar al formato XXXX.XX.XX que usa la tabla
  const normalizado = normalizarCodigoNCM(ncmCode)
  if (!normalizado) return _resultadoVacio(ncmCode)

  const codigo = normalizado.ncmCode  // ej: "0402.10.10"
  const supabase = getServiceClient()

  // Ejecutar ambas queries en paralelo para mejor performance
  const [resultPref, resultTLC] = await Promise.all([
    // 1. Preferencias específicas para este NCM
    supabase
      .from('preferencias_arancelarias')
      .select('acuerdo_id, pais, tipo')
      .eq('ncm_code', codigo)
      .order('acuerdo_id')
      .order('pais'),

    // 2. TLC de cobertura total (aplican a todos los productos sin excepción)
    supabase
      .from('acuerdos_generales')
      .select('acuerdo_id, pais, tipo, notas')
      .order('acuerdo_id')
      .order('pais'),
  ])

  if (resultPref.error) {
    throw new Error(`Error en preferencias_arancelarias: ${resultPref.error.message}`)
  }
  if (resultTLC.error) {
    throw new Error(`Error en acuerdos_generales: ${resultTLC.error.message}`)
  }

  // Mapear preferencias específicas a la estructura de respuesta
  const preferenciasEspecificas = (resultPref.data ?? []).map((r) => ({
    acuerdo: r.acuerdo_id,
    pais:    r.pais,
    tipo:    r.tipo,
    descripcion: generarDescripcion(r.tipo, r.pais, r.acuerdo_id),
  }))

  // Mapear TLC de cobertura total
  const acuerdosCoberturaTotal = (resultTLC.data ?? []).map((r) => ({
    acuerdo: r.acuerdo_id,
    pais:    r.pais,
    tipo:    r.tipo,
    descripcion: generarDescripcionTLC(r.notas, r.pais, r.acuerdo_id),
  }))

  const tienePreferencias =
    preferenciasEspecificas.length > 0 || acuerdosCoberturaTotal.length > 0

  return {
    ncm_code:                codigo,
    tiene_preferencias:      tienePreferencias,
    preferencias_especificas: preferenciasEspecificas,
    acuerdos_cobertura_total: acuerdosCoberturaTotal,
  }
}

// ─────────────────────────────────────────────
// FORMATEADOR PARA PROMPT DEL AGENTE
//
// Convierte el resultado de buscarPreferencias en un
// bloque de texto listo para inyectar en el prompt de Claude.
//
// Diferencia claramente:
//   - Preferencias específicas (solo para ese NCM)
//   - TLC de cobertura total (para todos los productos)
// ─────────────────────────────────────────────
export function formatearPreferencias(resultado) {
  if (!resultado || !resultado.tiene_preferencias) {
    return (
      '[PREFERENCIAS_ARANCELARIAS]\n' +
      'No se encontraron preferencias arancelarias específicas para este NCM.\n' +
      'Consultar con un despachante de aduana para acuerdos no incluidos en la base ' +
      '(ACE-36 Bolivia, SGP Unión Europea/USA/Japón).'
    )
  }

  const lineas = ['[PREFERENCIAS_ARANCELARIAS]']

  // Preferencias específicas del NCM
  if (resultado.preferencias_especificas.length > 0) {
    lineas.push('\nPreferencias arancelarias específicas para este NCM:')

    // Agrupar por acuerdo para mejor lectura
    const porAcuerdo = {}
    for (const p of resultado.preferencias_especificas) {
      if (!porAcuerdo[p.acuerdo]) porAcuerdo[p.acuerdo] = []
      porAcuerdo[p.acuerdo].push(p)
    }

    for (const [acuerdo, prefs] of Object.entries(porAcuerdo)) {
      lineas.push(`\n  ${acuerdo}:`)
      for (const p of prefs) {
        lineas.push(`    • ${p.descripcion}`)
      }
    }
  }

  // TLC de cobertura total
  if (resultado.acuerdos_cobertura_total.length > 0) {
    lineas.push('\nAcuerdos de libre comercio de cobertura total (aplican a TODOS los productos):')
    for (const tlc of resultado.acuerdos_cobertura_total) {
      lineas.push(`  • ${tlc.acuerdo} con ${tlc.pais}: ${tlc.descripcion}`)
    }
  }

  // Nota sobre acuerdos sin datos
  lineas.push(
    '\nNota: no están incluidos en la base ACE-36 Bolivia ni SGP (UE, USA, Japón).'
  )

  return lineas.join('\n')
}

// ─────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────
function _resultadoVacio(ncmCode) {
  return {
    ncm_code:                ncmCode ?? null,
    tiene_preferencias:      false,
    preferencias_especificas: [],
    acuerdos_cobertura_total: [],
  }
}
