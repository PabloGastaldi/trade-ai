import { createClient } from '@supabase/supabase-js'
import { normalizarCodigoNCM } from '../ncm-lookup.js'
import { esPaisNoCooperante } from '../data/paises-no-cooperantes.js'

// ─────────────────────────────────────────────────────────────────────────────
// calc-exportacion.js
// Nuevo schema: ncm.codigo_ncm (11 dígitos), aranceles_exportacion (derecho_exportacion, reintegro)
// ─────────────────────────────────────────────────────────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export const REGIMENES_EXPORTACION = [
  { key: 'general',       label: 'Régimen General',  desc: 'Exportación formal' },
  { key: 'exporta_simple',label: 'Exporta Simple',   desc: 'MiPyMEs · sin derechos · hasta USD 15.000' },
  { key: 'courier',       label: 'Courier',           desc: 'Pequeños envíos · hasta USD 3.000' },
]

const COSTO_REGISTRO_SIM_USD = 10
const SEGURO_ESTIMADO_ALICUOTA = 0.005
const JERARQUIA_INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CPT', 'CIF', 'CIP', 'DAP', 'DPU', 'DDP']

function r(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

async function obtenerDatosNCM(ncm_code) {
  const supabase = getServiceClient()
  const normalizado = normalizarCodigoNCM(ncm_code)
  if (!normalizado) return null

  const { data, error } = await supabase
    .from('ncm')
    .select(`
      codigo_ncm, descripcion, capitulo, partida,
      aranceles_exportacion (derecho_exportacion, reintegro),
      aranceles_importacion (die, aec)
    `)
    .eq('codigo_ncm', normalizado.codigoNCM)
    .limit(1)
    .single()

  if (error || !data) return null

  const ae = Array.isArray(data.aranceles_exportacion)
    ? (data.aranceles_exportacion[0] ?? {})
    : (data.aranceles_exportacion ?? {})
  const ai = Array.isArray(data.aranceles_importacion)
    ? (data.aranceles_importacion[0] ?? {})
    : (data.aranceles_importacion ?? {})

  return {
    ncm_code:            data.codigo_ncm,
    description:         data.descripcion,
    derecho_exportacion: ae.derecho_exportacion ?? 0,
    reintegro:           ae.reintegro ?? 0,
    arancel_extrazona:   ai.die ?? ai.aec ?? 0,
  }
}

async function obtenerArancelDestino(hs_code_6, pais_destino_iso3) {
  if (!hs_code_6 || !pais_destino_iso3) return null
  const supabase = getServiceClient()

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
  return { ave_rate: data.ave_rate, num_tariff_lines: data.num_tariff_lines, year: data.year }
}

function normalizarAExw({ precio_producto, incoterm_base, flete_interno, flete_internacional, seguro_internacional, gastos_portuarios }) {
  const incoterm = incoterm_base.toUpperCase()
  if (incoterm === 'EXW') return { exw: precio_producto, nota: null }
  if (['FOB', 'FCA', 'FAS'].includes(incoterm)) {
    const costos_conocidos = (flete_interno ?? 0) + (gastos_portuarios ?? 0)
    if (costos_conocidos > 0) return { exw: r(precio_producto - costos_conocidos), nota: `EXW estimado restando flete interno y gastos portuarios del precio ${incoterm}` }
    return { exw: precio_producto, nota: `Precio ${incoterm} usado como base — informá flete interno y gastos portuarios para calcular EXW exacto` }
  }
  if (['CIF', 'CFR', 'CPT', 'CIP'].includes(incoterm)) {
    const costos = (flete_interno ?? 0) + (flete_internacional ?? 0) + (seguro_internacional ?? 0) + (gastos_portuarios ?? 0)
    if (costos > 0) return { exw: r(precio_producto - costos), nota: `EXW estimado restando todos los costos conocidos del precio ${incoterm}` }
    return { exw: precio_producto, nota: `Precio ${incoterm} usado como base EXW aproximada — informá los costos intermedios para mayor precisión` }
  }
  return { exw: precio_producto, nota: `Precio ${incoterm} usado como base — conversión a EXW no automática para este incoterm` }
}

function calcularFob({ exw, flete_interno, gastos_portuarios, gastos_aduana_exportacion }) {
  const fob = r(exw + (flete_interno ?? 0) + (gastos_portuarios ?? 0) + (gastos_aduana_exportacion ?? 0))
  const costos_faltantes = []
  if (flete_interno === null) costos_faltantes.push('flete interno')
  if (gastos_portuarios === null) costos_faltantes.push('gastos portuarios')
  if (gastos_aduana_exportacion === null) costos_faltantes.push('gastos de despacho')
  return { fob, costos_faltantes }
}

function construirTablaIncoterms({ exw, fob, flete_internacional, seguro_internacional, arancelDestino, pais_destino, notas }) {
  const tabla = { EXW: r(exw), FOB: r(fob) }

  if (flete_internacional !== null) {
    tabla.CFR = r(fob + flete_internacional)
    const seguro = seguro_internacional !== null
      ? seguro_internacional
      : r((fob + flete_internacional) * SEGURO_ESTIMADO_ALICUOTA)
    tabla.CIF = r(tabla.CFR + seguro)
    if (seguro_internacional === null) notas.push(`Seguro estimado como ${SEGURO_ESTIMADO_ALICUOTA * 100}% de (FOB + flete) = USD ${seguro.toFixed(2)}`)
  } else {
    tabla.CFR = null
    tabla.CIF = null
  }

  if (tabla.CIF !== null && arancelDestino?.ave_rate != null) {
    const arancel_monto = r(tabla.CIF * (arancelDestino.ave_rate / 100))
    tabla.DDP = null
    tabla._ddp_parcial = r(tabla.CIF + arancel_monto)
    tabla._ddp_nota = `DDP parcial (sin IVA/impuestos locales de ${pais_destino}): CIF ${tabla.CIF.toFixed(2)} + arancel ${arancelDestino.ave_rate}% = USD ${tabla._ddp_parcial.toFixed(2)}`
    notas.push(tabla._ddp_nota)
    notas.push(`Para DDP completo necesitamos el IVA/GST local de ${pais_destino}, que no está en la base actual`)
  } else {
    tabla.DDP = null
    if (tabla.CIF !== null && arancelDestino === null) notas.push(`DDP no calculable: no tenemos datos de aranceles de ${pais_destino ?? 'ese destino'} para este HS code`)
  }

  return tabla
}

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
  gastos_aduana_exportacion = null,
  bonus_reintegro        = false,
  pais_facturacion_diferente = false,
  regimen                = null,
}) {
  if (!ncm_code || typeof ncm_code !== 'string') throw new Error('ncm_code es requerido')
  if (typeof precio_producto !== 'number' || precio_producto <= 0) throw new Error('precio_producto debe ser un número mayor a 0')

  const incoterm_base_u    = incoterm_base.toUpperCase()
  const incoterm_deseado_u = incoterm_deseado.toUpperCase()
  if (!JERARQUIA_INCOTERMS.includes(incoterm_base_u)) throw new Error(`incoterm_base "${incoterm_base}" no reconocido`)
  if (!JERARQUIA_INCOTERMS.includes(incoterm_deseado_u)) throw new Error(`incoterm_deseado "${incoterm_deseado}" no reconocido`)

  const notas = []

  const datosNCM = await obtenerDatosNCM(ncm_code)
  if (!datosNCM) throw new Error(`NCM "${ncm_code}" no encontrado en la nomenclatura arancelaria argentina`)

  const hs_code_6 = datosNCM.ncm_code.slice(0, 6)

  const arancelDestino = pais_destino ? await obtenerArancelDestino(hs_code_6, pais_destino) : null
  if (pais_destino && arancelDestino === null) notas.push(`Sin datos de arancel de destino para ${pais_destino} HS ${hs_code_6} — DDP no calculable`)
  else if (arancelDestino !== null) notas.push(`Arancel destino (${pais_destino}, HS ${hs_code_6}, año ${arancelDestino.year}): ${arancelDestino.ave_rate ?? 0}% AVE`)

  const { exw, nota: notaExw } = normalizarAExw({ precio_producto, incoterm_base: incoterm_base_u, flete_interno, flete_internacional, seguro_internacional, gastos_portuarios })
  if (notaExw) notas.push(notaExw)

  const { fob, costos_faltantes } = calcularFob({ exw, flete_interno, gastos_portuarios, gastos_aduana_exportacion })
  if (costos_faltantes.length > 0) notas.push(`FOB calculado sin: ${costos_faltantes.join(', ')} — informalos para mayor precisión`)

  // ── Ajustes por régimen ────────────────────────────────────────────────────
  const warnings = []
  let derechoExportacionPct = datosNCM.derecho_exportacion ?? 0

  if (regimen === 'exporta_simple') {
    derechoExportacionPct = 0
    notas.push('Exporta Simple: derecho de exportación 0% (régimen simplificado MiPyMEs)')
    if (fob > 15000) warnings.push('El valor FOB supera el límite de USD 15.000 para Exporta Simple')
  } else if (regimen === 'courier') {
    if (fob > 3000) warnings.push('El valor FOB supera el límite de USD 3.000 para courier de exportación')
  }

  const derecho_exp_alicuota = derechoExportacionPct / 100
  const derecho_exp_monto    = r(fob * derecho_exp_alicuota)

  if (regimen !== 'exporta_simple') {
    if (derecho_exp_alicuota === 0) notas.push('Derecho de exportación 0% para esta posición NCM')
    else notas.push(`Derecho de exportación ${derechoExportacionPct}% sobre FOB USD ${fob.toFixed(2)}`)
  }

  const reintegro = datosNCM.reintegro > 0
    ? { 
        alicuota: datosNCM.reintegro, 
        monto: r(fob * datosNCM.reintegro / 100), 
        nota: null,
        bonus_aplicado: false,
      }
    : { alicuota: null, monto: null, nota: 'Reintegro 0% o no disponible para este NCM', bonus_aplicado: false }

  // Aplicar bonus de reintegro si corresponde
  if (bonus_reintegro && reintegro.alicuota !== null) {
    const reintegroConBonus = reintegro.alicuota + 0.5
    reintegro.alicuota = reintegroConBonus
    reintegro.monto = r(fob * reintegroConBonus / 100)
    reintegro.bonus_aplicado = true
    notas.push('Reintegro con bonus +0.5% (orgánico/denominación de origen/sello Alimentos Argentinos)')
  }

  // Percepción Ganancias exportación (país no cooperante o facturación diferente)
  let percepcionGananciasExpo = 0
  let percepcionMotivo = null
  if (pais_destino && esPaisNoCooperante(pais_destino)) {
    percepcionGananciasExpo = r(fob * 0.015)  // 1.5%
    percepcionMotivo = 'País no cooperante (Decreto 589/13)'
    notas.push(`Percepción Ganancias expo 1.5%: USD ${percepcionGananciasExpo.toFixed(2)} — ${percepcionMotivo}`)
  } else if (pais_facturacion_diferente) {
    percepcionGananciasExpo = r(fob * 0.005)  // 0.5%
    percepcionMotivo = 'País de facturación diferente al destino'
    notas.push(`Percepción Ganancias expo 0.5%: USD ${percepcionGananciasExpo.toFixed(2)} — ${percepcionMotivo}`)
  }

  const costo_sim = COSTO_REGISTRO_SIM_USD
  const costos_exportacion = {
    derecho_exportacion:       { alicuota: derecho_exp_alicuota, monto: derecho_exp_monto },
    registro_sim:              costo_sim,
    flete_interno,
    gastos_portuarios,
    gastos_aduana_exportacion,
  }

  const costo_neto_exportacion = r(derecho_exp_monto + costo_sim + (flete_interno ?? 0) + (gastos_portuarios ?? 0) + (gastos_aduana_exportacion ?? 0))
  const margen_neto = r(precio_producto - costo_neto_exportacion)

  const conversion_incoterms = construirTablaIncoterms({ exw, fob, flete_internacional, seguro_internacional, arancelDestino, pais_destino, notas })
  const precio_calculado_valor = conversion_incoterms[incoterm_deseado_u] ?? null
  if (precio_calculado_valor === null) notas.push(`No se pudo calcular el precio ${incoterm_deseado_u} por falta de datos`)

  return {
    ncm_code:         datosNCM.ncm_code,
    ncm_descripcion:  datosNCM.description,
    pais_destino:     pais_destino ?? null,
    cantidad,
    regimen:          regimen ?? 'general',
    precio_base:      { valor: precio_producto, incoterm: incoterm_base_u },
    precio_exw:       r(exw),
    precio_fob:       r(fob),
    precio_calculado: { valor: precio_calculado_valor, incoterm: incoterm_deseado_u },
    costos_exportacion,
    reintegro,
    percepcion_ganancias_expo: {
      aplica:   percepcionGananciasExpo > 0,
      motivo:   percepcionMotivo,
      alicuota: percepcionMotivo === 'País no cooperante (Decreto 589/13)' ? 1.5
              : percepcionMotivo === 'País de facturación diferente al destino' ? 0.5
              : 0,
      monto:    percepcionGananciasExpo,
    },
    costo_neto_exportacion,
    margen_neto,
    conversion_incoterms,
    arancel_destino: arancelDestino
      ? { hs_code: hs_code_6, ave_rate: arancelDestino.ave_rate, year: arancelDestino.year, fuente: 'WITS / ITC (AVE)' }
      : null,
    notas,
    warnings,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// calcularPrecioFOB — Calcula el precio FOB necesario para cubrir costos
// Fórmula VUCE: FOB = (CM + EMB + FI + SI + OG + Utm) / (1 - (GI + (DER/(1+DER)) + UT) + RE)
// ─────────────────────────────────────────────────────────────────────────────

export function calcularPrecioFOB(params) {
  const {
    costo_mercaderia,        // CM — obligatorio
    envases_embalajes = 0,   // EMB
    flete_interno = 0,       // FI
    seguro_interno = 0,      // SI
    otros_gastos = 0,        // OG
    utilidad_monto = 0,      // Utm — monto fijo
    gastos_indirectos_pct = 0, // GI — % sobre FOB
    derecho_exportacion_pct = 0, // DER — viene del NCM
    reintegro_pct = 0,       // RE — viene del NCM
    utilidad_pct = 0,        // UT — % sobre FOB
  } = params

  if (!costo_mercaderia || costo_mercaderia <= 0) {
    return { error: 'El costo de mercadería es obligatorio y debe ser mayor a 0' }
  }

  // Fórmula VUCE:
  // FOB = (CM + EMB + FI + SI + OG + Utm) /
  //       (1 - (GI + (DER/(1+DER)) + UT) + RE)

  const numerador = costo_mercaderia +
                    envases_embalajes +
                    flete_interno +
                    seguro_interno +
                    otros_gastos +
                    utilidad_monto

  const gi  = gastos_indirectos_pct / 100
  const der = derecho_exportacion_pct / 100
  const ut  = utilidad_pct / 100
  const re  = reintegro_pct / 100

  const denominador = 1 - (gi + (der / (1 + der)) + ut) + re

  if (denominador <= 0) {
    return {
      error: 'Los gastos y derechos superan el 100% — no es viable exportar con estos costos'
    }
  }

  const fob = numerador / denominador

  const derechoExportacionMonto = r(fob * der)
  const reintegroMonto          = r(fob * re)
  const gastosIndirectosMonto    = r(fob * gi)
  const utilidadTotal           = r(fob * ut + utilidad_monto)

  return {
    precio_fob: r(fob),
    desglose: {
      costos_directos: {
        mercaderia:      costo_mercaderia,
        envases:         envases_embalajes,
        flete_interno,
        seguro_interno,
        otros_gastos,
        subtotal: r(numerador - utilidad_monto),
      },
      sobre_fob: {
        derecho_exportacion: { pct: derecho_exportacion_pct, monto: derechoExportacionMonto },
        gastos_indirectos:    { pct: gastos_indirectos_pct,    monto: gastosIndirectosMonto },
        reintegro:            { pct: reintegro_pct,            monto: reintegroMonto },
      },
      utilidad: {
        pct:       utilidad_pct,
        monto_fijo: utilidad_monto,
        total:     utilidadTotal,
      },
    },
    notas: [
      `Precio FOB mínimo para cubrir costos: USD ${r(fob - utilidadTotal).toFixed(2)}`,
      `Con utilidad incluida: USD ${r(fob).toFixed(2)}`,
      reintegroMonto > 0 ? `Reintegro a cobrar: USD ${reintegroMonto.toFixed(2)}` : null,
    ].filter(Boolean),
  }
}
