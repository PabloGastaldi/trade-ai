import { createClient } from '@supabase/supabase-js'
import { normalizarCodigoNCM } from '../ncm-lookup.js'

// ─────────────────────────────────────────────────────────────────────────────
// calc-exportacion.js
//
// Función PURA de cálculo de costos de exportación desde Argentina.
// Sin side effects de UI — usable desde la calculadora y desde el chat de IA.
//
// Lógica central:
//   1. Normalizar el precio dado al incoterm EXW y FOB
//   2. Calcular derechos de exportación (retenciones) sobre FOB
//   3. Buscar reintegros aplicables
//   4. Construir tabla de conversión de incoterms (EXW → FOB → CFR → CIF → DDP)
//   5. Calcular costo neto y margen
// ─────────────────────────────────────────────────────────────────────────────

// ── Cliente Supabase (server-only) ────────────────────────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ── Constantes ────────────────────────────────────────────────────────────────

// Costo del Registro de Solicitud de Inscripción de Manifiesto (SIM/ROE)
// Monto fijo aproximado; varía levemente por despachante
const COSTO_REGISTRO_SIM_USD = 10

// Gastos de despacho de exportación estimados cuando el usuario no los informa
// (honorarios despachante + gastos portuarios mínimos — referencia de mercado 2024)
// No se usan en el cálculo si el usuario no los provee; son solo para la nota
const GASTOS_ADUANA_ESTIMADOS_POR_DEFECTO_USD = 150

// Incoterms soportados en orden creciente de inclusión de costos
// (de menor a mayor compromiso del exportador)
const JERARQUIA_INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CPT', 'CIF', 'CIP', 'DAP', 'DPU', 'DDP']

// Incoterms que se consideran "equivalentes a FOB" para base de cálculo de retenciones
// La base imponible de los derechos de exportación en AR es siempre el valor FOB
const INCOTERMS_FOB_EQUIVALENTES = new Set(['FOB', 'FAS'])

// Seguro estimado como % del (FOB + flete) si no se informa
const SEGURO_ESTIMADO_ALICUOTA = 0.005 // 0.5% — exportación es menor riesgo que importación

// ── Redondeo ──────────────────────────────────────────────────────────────────

function r(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// ── Lookup: datos del NCM ─────────────────────────────────────────────────────

async function obtenerDatosNCM(ncm_code) {
  const supabase = getServiceClient()
  const normalizado = normalizarCodigoNCM(ncm_code)
  if (!normalizado) return null

  const { data, error } = await supabase
    .from('ncm')
    .select('ncm_code, description, derecho_exportacion, arancel_extrazona, organismos_exp')
    .eq('ncm_code', normalizado.ncmCode)
    .limit(1)
    .single()

  if (error || !data) return null
  return data
}

// ── Lookup: arancel destino desde destination_tariffs ────────────────────────
//
// Busca el AVE (Ad Valorem Equivalent) que cobra el país destino
// para el HS code del producto exportado.
// Retorna null si no hay datos para ese destino (no bloquea el cálculo).
// ─────────────────────────────────────────────────────────────────────────────

async function obtenerArancelDestino(hs_code_6, pais_destino_iso3) {
  if (!hs_code_6 || !pais_destino_iso3) return null

  const supabase = getServiceClient()

  // Mapeo ISO3 → nombre del país como está en destination_tariffs
  // (la tabla guarda el nombre en inglés tal como viene de WITS/ITC)
  const { data: countryRow } = await supabase
    .from('country_codes')
    .select('name_en')
    .eq('iso3', pais_destino_iso3.toUpperCase())
    .limit(1)
    .single()

  if (!countryRow) return null

  const { data, error } = await supabase
    .from('destination_tariffs')
    .select('ave_rate, num_tariff_lines, year')
    .eq('hs_code', hs_code_6)
    .eq('reporting_country', countryRow.name_en)
    .order('year', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null

  return {
    ave_rate:         data.ave_rate,       // decimal, ej: 6.5 (significa 6.5%)
    num_tariff_lines: data.num_tariff_lines,
    year:             data.year,
  }
}

// ── Normalizar precio al incoterm EXW ─────────────────────────────────────────
//
// Convierte el precio dado a EXW (precio en planta, sin ningún costo adicional).
// EXW es la base mínima — todos los costos van sumando hacia arriba.
//
// Si el usuario da un precio FOB, CIF, etc., restamos los costos conocidos
// para llegar al EXW. Solo es posible si el usuario proveyó esos costos.
// Si no, usamos el precio dado como aproximación de EXW.
// ─────────────────────────────────────────────────────────────────────────────

function normalizarAExw({
  precio_producto,
  incoterm_base,
  flete_interno,
  flete_internacional,
  seguro_internacional,
  gastos_portuarios,
}) {
  const incoterm = incoterm_base.toUpperCase()

  if (incoterm === 'EXW') {
    return { exw: precio_producto, nota: null }
  }

  if (incoterm === 'FOB' || incoterm === 'FCA' || incoterm === 'FAS') {
    // FOB = EXW + flete_interno + gastos_portuarios + gastos_aduana
    // Si el usuario no da esos costos, no podemos descontar → usamos FOB como base
    const costos_conocidos = (flete_interno ?? 0) + (gastos_portuarios ?? 0)
    if (costos_conocidos > 0) {
      return {
        exw: r(precio_producto - costos_conocidos),
        nota: `EXW estimado restando flete interno y gastos portuarios del precio ${incoterm}`,
      }
    }
    return {
      exw: precio_producto,
      nota: `Precio ${incoterm} usado como base — informá flete interno y gastos portuarios para calcular EXW exacto`,
    }
  }

  if (incoterm === 'CIF' || incoterm === 'CFR' || incoterm === 'CPT' || incoterm === 'CIP') {
    const costos = (flete_interno ?? 0) + (flete_internacional ?? 0)
      + (seguro_internacional ?? 0) + (gastos_portuarios ?? 0)
    if (costos > 0) {
      return {
        exw: r(precio_producto - costos),
        nota: `EXW estimado restando todos los costos conocidos del precio ${incoterm}`,
      }
    }
    return {
      exw: precio_producto,
      nota: `Precio ${incoterm} usado como base EXW aproximada — informá los costos intermedios para mayor precisión`,
    }
  }

  // Para cualquier otro incoterm (DAP, DPU, DDP) no intentamos descontar
  return {
    exw: precio_producto,
    nota: `Precio ${incoterm} usado como base — conversión a EXW no automática para este incoterm`,
  }
}

// ── Calcular valor FOB desde EXW ──────────────────────────────────────────────
//
// FOB = EXW + flete_interno + gastos_portuarios + gastos_aduana_exportacion
//
// Los gastos de aduana de exportación incluyen:
//   - Honorarios del despachante
//   - Gastos administrativos del despacho
//   - Costo del SIM/ROE (incluido por separado en costos_exportacion)
//
// Si el usuario no informó alguno de estos costos, el FOB será parcial
// y se documenta en las notas.
// ─────────────────────────────────────────────────────────────────────────────

function calcularFob({ exw, flete_interno, gastos_portuarios, gastos_aduana_exportacion }) {
  const fob = r(exw
    + (flete_interno ?? 0)
    + (gastos_portuarios ?? 0)
    + (gastos_aduana_exportacion ?? 0)
  )

  const costos_faltantes = []
  if (flete_interno === null) costos_faltantes.push('flete interno')
  if (gastos_portuarios === null) costos_faltantes.push('gastos portuarios')
  if (gastos_aduana_exportacion === null) costos_faltantes.push('gastos de despacho')

  return { fob, costos_faltantes }
}

// ── Tabla de conversión de incoterms ─────────────────────────────────────────
//
// Construye los precios para cada incoterm relevante.
// null = no se puede calcular por falta de datos.
// ─────────────────────────────────────────────────────────────────────────────

function construirTablaIncoterms({
  exw,
  fob,
  flete_interno,
  flete_internacional,
  seguro_internacional,
  gastos_portuarios,
  arancelDestino,
  pais_destino,
  notas,
}) {
  const tabla = { EXW: r(exw) }

  // FOB / FCA (en tierra transporte internacional)
  tabla.FOB = r(fob)

  // CFR (o CPT para multimodal) = FOB + flete internacional
  if (flete_internacional !== null) {
    tabla.CFR = r(fob + flete_internacional)
  } else {
    tabla.CFR = null
  }

  // CIF = CFR + seguro internacional
  if (flete_internacional !== null) {
    const seguro = seguro_internacional !== null
      ? seguro_internacional
      : r((fob + flete_internacional) * SEGURO_ESTIMADO_ALICUOTA)
    tabla.CIF = r((tabla.CFR ?? fob) + seguro)
    if (seguro_internacional === null) {
      notas.push(`Seguro estimado como ${SEGURO_ESTIMADO_ALICUOTA * 100}% de (FOB + flete) = USD ${seguro.toFixed(2)}`)
    }
  } else {
    tabla.CIF = null
  }

  // DDP = CIF + arancel destino + impuestos destino + gastos locales destino
  // Solo calculable si tenemos datos de aranceles del destino
  if (tabla.CIF !== null && arancelDestino !== null && arancelDestino.ave_rate !== null) {
    const base_ddp       = tabla.CIF
    const arancel_monto  = r(base_ddp * (arancelDestino.ave_rate / 100))
    // IVA/GST destino: no lo tenemos en la base — documentamos la limitación
    tabla.DDP = null
    tabla._ddp_parcial = r(tabla.CIF + arancel_monto)
    tabla._ddp_nota = `DDP parcial (sin IVA/impuestos locales de ${pais_destino}): CIF ${tabla.CIF.toFixed(2)} + arancel ${arancelDestino.ave_rate}% = USD ${tabla._ddp_parcial.toFixed(2)}`
    notas.push(tabla._ddp_nota)
    notas.push(`Para DDP completo necesitamos el IVA/GST local de ${pais_destino}, que no está en la base actual`)
  } else if (tabla.CIF !== null && arancelDestino === null) {
    tabla.DDP = null
    notas.push(`DDP no calculable: no tenemos datos de aranceles de ${pais_destino ?? 'ese destino'} para este HS code`)
  } else {
    tabla.DDP = null
  }

  return tabla
}

// ── FUNCIÓN PRINCIPAL EXPORTADA ───────────────────────────────────────────────
//
// calcularExportacion({ ncm_code, precio_producto, incoterm_base,
//   incoterm_deseado, pais_destino, cantidad, flete_interno,
//   flete_internacional, seguro_internacional, gastos_portuarios })
//
// Devuelve el objeto de resultado completo o lanza Error con mensaje claro.
// ─────────────────────────────────────────────────────────────────────────────

export async function calcularExportacion({
  ncm_code,
  precio_producto,
  incoterm_base          = 'FOB',
  incoterm_deseado       = 'FOB',
  pais_destino           = null,
  cantidad               = 1,
  flete_interno          = null,
  flete_internacional    = null,
  seguro_internacional   = null,
  gastos_portuarios      = null,
  gastos_aduana_exportacion = null, // honorarios despachante + gastos admin
}) {
  // ── Validaciones de entrada ────────────────────────────────────────────────

  if (!ncm_code || typeof ncm_code !== 'string') {
    throw new Error('ncm_code es requerido')
  }
  if (typeof precio_producto !== 'number' || precio_producto <= 0) {
    throw new Error('precio_producto debe ser un número mayor a 0')
  }
  const incoterm_base_u    = incoterm_base.toUpperCase()
  const incoterm_deseado_u = incoterm_deseado.toUpperCase()
  if (!JERARQUIA_INCOTERMS.includes(incoterm_base_u)) {
    throw new Error(`incoterm_base "${incoterm_base}" no reconocido`)
  }
  if (!JERARQUIA_INCOTERMS.includes(incoterm_deseado_u)) {
    throw new Error(`incoterm_deseado "${incoterm_deseado}" no reconocido`)
  }

  const notas = []

  // ── Buscar datos del NCM ───────────────────────────────────────────────────

  const datosNCM = await obtenerDatosNCM(ncm_code)
  if (!datosNCM) {
    throw new Error(`NCM "${ncm_code}" no encontrado en la nomenclatura arancelaria argentina`)
  }

  // HS code a 6 dígitos (sin puntos) para buscar en destination_tariffs
  const hs_code_6 = datosNCM.ncm_code.replace(/\./g, '').slice(0, 6)

  // ── Buscar aranceles del destino ───────────────────────────────────────────

  const arancelDestino = pais_destino
    ? await obtenerArancelDestino(hs_code_6, pais_destino)
    : null

  if (pais_destino && arancelDestino === null) {
    notas.push(`Sin datos de arancel de destino para ${pais_destino} HS ${hs_code_6} — DDP no calculable`)
  } else if (arancelDestino !== null) {
    notas.push(`Arancel destino (${pais_destino}, HS ${hs_code_6}, año ${arancelDestino.year}): ${arancelDestino.ave_rate ?? 0}% AVE`)
  }

  // ── Normalizar precio dado a EXW ───────────────────────────────────────────

  const { exw, nota: notaExw } = normalizarAExw({
    precio_producto,
    incoterm_base: incoterm_base_u,
    flete_interno,
    flete_internacional,
    seguro_internacional,
    gastos_portuarios,
  })
  if (notaExw) notas.push(notaExw)

  // ── Calcular valor FOB ─────────────────────────────────────────────────────

  const { fob, costos_faltantes } = calcularFob({
    exw,
    flete_interno,
    gastos_portuarios,
    gastos_aduana_exportacion,
  })

  if (costos_faltantes.length > 0) {
    notas.push(`FOB calculado sin: ${costos_faltantes.join(', ')} — informalos para mayor precisión`)
  }

  // ── Derechos de exportación (retenciones) ─────────────────────────────────
  // Base imponible: valor FOB (Ley 23.018 y Decretos vigentes)
  // La tabla ncm guarda derecho_exportacion como porcentaje (ej: 12 = 12%)

  const derecho_exp_alicuota = (datosNCM.derecho_exportacion ?? 0) / 100
  const derecho_exp_monto    = r(fob * derecho_exp_alicuota)

  if (derecho_exp_alicuota === 0) {
    notas.push('Derecho de exportación 0% para esta posición NCM')
  } else {
    notas.push(`Derecho de exportación ${datosNCM.derecho_exportacion}% sobre FOB USD ${fob.toFixed(2)}`)
  }

  // ── Reintegros ────────────────────────────────────────────────────────────
  // Los reintegros no están en la tabla ncm actual.
  // Se documenta la limitación — a incorporar con dataset de reintegros AFIP.
  const reintegro = {
    alicuota:  null,
    monto:     null,
    nota:      'Reintegros no disponibles en la base actual — consultá AFIP para el reintegro específico de este NCM',
  }

  // ── Costo del SIM / ROE ───────────────────────────────────────────────────

  const costo_sim = COSTO_REGISTRO_SIM_USD

  // ── Costos totales de exportación ────────────────────────────────────────
  // Incluye: retenciones + SIM + costos logísticos informados por el usuario

  const costos_exportacion = {
    derecho_exportacion:      { alicuota: derecho_exp_alicuota, monto: derecho_exp_monto },
    registro_sim:             costo_sim,
    flete_interno:            flete_interno,            // null si no informado
    gastos_portuarios:        gastos_portuarios,         // null si no informado
    gastos_aduana_exportacion: gastos_aduana_exportacion, // null si no informado
  }

  // Costo neto de exportación = suma de todos los costos conocidos
  const costo_neto_exportacion = r(
    derecho_exp_monto
    + costo_sim
    + (flete_interno ?? 0)
    + (gastos_portuarios ?? 0)
    + (gastos_aduana_exportacion ?? 0)
  )

  // ── Margen neto ────────────────────────────────────────────────────────────
  // = precio original del producto − todos los costos de exportación conocidos
  // No incluye costo de producción (el usuario ya lo tiene incorporado en su precio)

  const margen_neto = r(precio_producto - costo_neto_exportacion)

  // ── Tabla de conversión de incoterms ──────────────────────────────────────

  const conversion_incoterms = construirTablaIncoterms({
    exw,
    fob,
    flete_interno,
    flete_internacional,
    seguro_internacional,
    gastos_portuarios,
    arancelDestino,
    pais_destino,
    notas,
  })

  // ── Precio calculado para el incoterm deseado ─────────────────────────────

  const precio_calculado_valor = conversion_incoterms[incoterm_deseado_u] ?? null

  if (precio_calculado_valor === null) {
    notas.push(`No se pudo calcular el precio ${incoterm_deseado_u} por falta de datos (flete internacional, seguro, o aranceles del destino)`)
  }

  // ── Organismos de control ─────────────────────────────────────────────────

  if (datosNCM.organismos_exp) {
    notas.push(`Organismos de control para exportación: ${datosNCM.organismos_exp}`)
  }

  // ── Objeto de respuesta ────────────────────────────────────────────────────

  return {
    // Inputs normalizados
    ncm_code:         datosNCM.ncm_code,
    ncm_descripcion:  datosNCM.description,
    pais_destino:     pais_destino ?? null,
    cantidad,

    // Precio de entrada
    precio_base: {
      valor:    precio_producto,
      incoterm: incoterm_base_u,
    },

    // EXW y FOB calculados
    precio_exw: r(exw),
    precio_fob: r(fob),

    // Precio calculado para el incoterm pedido
    precio_calculado: {
      valor:    precio_calculado_valor,
      incoterm: incoterm_deseado_u,
    },

    // Costos de exportación desde Argentina
    costos_exportacion,

    // Reintegros (pendiente dataset)
    reintegro,

    // Totales
    costo_neto_exportacion,
    margen_neto,

    // Tabla completa de incoterms
    conversion_incoterms,

    // Datos del arancel en destino (de destination_tariffs)
    arancel_destino: arancelDestino
      ? {
          hs_code:   hs_code_6,
          ave_rate:  arancelDestino.ave_rate,
          year:      arancelDestino.year,
          fuente:    'WITS / ITC (AVE)',
        }
      : null,

    // Notas y advertencias
    notas,
  }
}
