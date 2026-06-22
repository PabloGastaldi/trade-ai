/**
 * calc-importacion.js — Cálculo de costos de importación para Argentina.
 * Función pura async — recibe un cliente Supabase como parámetro.
 * Todos los montos en USD, redondeados a 2 decimales.
 *
 * Nuevo schema:
 *   ncm.codigo_ncm          (11 dígitos sin puntos, ej: "29339141000")
 *   ncm.descripcion
 *   aranceles_importacion   (die/dii/aec/te/iva/iva_ad/gan/iibb)
 *   acuerdos_importacion    (bloque, pais, codigo_acuerdo, porcentaje)
 */

import { normalizarCodigoNCM } from '../ncm-lookup.js'

export const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']

// ─── Constantes de estimación de flete — TUNEABLES ───────────────────────────
// Tarifas por kg (USD/kg) — por modo de transporte.
// Fuente: referencia CCER (marítimo ~10% del FOB), Arancely (aéreo/courier).
export const TARIFA_KG = {
  maritimo: 4,
  aereo: 10,
  courier: 15,
}

// Fallback % del FOB cuando no se dispone de peso.
// Marítimo ≈ 10% (CCER doc), aéreo ≈ 18% (premium ~1.8×), courier ≈ 25%.
export const FALLBACK_PCT_FOB = {
  maritimo: 0.10,
  aereo: 0.18,
  courier: 0.25,
}
export const CONDICIONES_IVA = ['responsable_inscripto', 'monotributista', 'consumidor_final', 'exento']
export const REGIMENES = ['general', 'courier', 'pef', 'correo_upu']
export const REGIMENES_IMPORTACION = [
  { key: 'general',          label: 'Régimen General',    desc: 'Despacho formal a plaza' },
  { key: 'courier_comercial',label: 'Courier Comercial',  desc: 'E-commerce · hasta USD 3.000 FOB' },
  { key: 'courier_personal', label: 'Courier Personal',   desc: 'Franquicia USD 400 · hasta USD 3.000 FOB' },
  { key: 'puerta_a_puerta',  label: 'Puerta a Puerta',    desc: 'Franquicia USD 400 · hasta USD 3.000 FOB' },
  { key: 'pef',              label: 'PEF Personal',        desc: 'Prestadores especiales · hasta USD 3.000' },
  { key: 'correo_upu',       label: 'Correo UPU',          desc: 'Correo Argentino · tributo plano 50%' },
]
export const MERCOSUR = ['BRA', 'PRY', 'URY']

function r(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Busca un NCM en el nuevo schema y determina el arancel aplicable.
 * Join manual: ncm → aranceles_importacion → acuerdos_importacion
 */
async function obtenerNCMYArancel(supabase, ncm_code, pais_origen_iso3) {
  const normalizado = normalizarCodigoNCM(ncm_code)
  if (!normalizado) return { error: `Código NCM inválido: "${ncm_code}"` }

  const codigoNCM = normalizado.codigoNCM  // 11 dígitos

  // Buscar NCM con join de aranceles
  const { data: ncmData, error: ncmError } = await supabase
    .from('ncm')
    .select(`
      codigo_ncm, descripcion,
      aranceles_importacion (aec, die, dii, te, iva, iva_ad, gan, iibb)
    `)
    .eq('codigo_ncm', codigoNCM)
    .limit(1)
    .single()

  if (ncmError || !ncmData) {
    return { error: `NCM "${ncm_code}" no encontrado en la base de datos.` }
  }

  const ai = Array.isArray(ncmData.aranceles_importacion)
    ? (ncmData.aranceles_importacion[0] ?? {})
    : (ncmData.aranceles_importacion ?? {})

  // Arancel base: extrazona (DIE) o intrazona (DII) según origen
  const esMercosur = MERCOSUR.includes(pais_origen_iso3)
  let arancel = esMercosur ? (ai.dii ?? 0) : (ai.die ?? ai.aec ?? 0)
  const iva = ai.iva ?? 21
  const tasaEstadistica = ai.te ?? 0

  // Buscar preferencia arancelaria en acuerdos_importacion
  // pais en esa tabla es nombre en español → resolver via country_codes
  const { data: countryRow } = await supabase
    .from('country_codes')
    .select('name_es')
    .eq('iso3', pais_origen_iso3)
    .single()

  let acuerdos = []
  if (countryRow) {
    const { data: acuerdosData } = await supabase
      .from('acuerdos_importacion')
      .select('bloque, pais, codigo_acuerdo, porcentaje')
      .eq('codigo_ncm', codigoNCM)
      .ilike('pais', `%${countryRow.name_es}%`)
      .order('porcentaje', { ascending: false })
      .limit(1)

    acuerdos = acuerdosData ?? []
  }

  let preferencia = null
  if (acuerdos && acuerdos.length > 0) {
    const p = acuerdos[0]
    // porcentaje = % de preferencia (ej: 100 = arancel 0%, 50 = mitad del arancel)
    const arancelConPreferencia = r(arancel * (1 - p.porcentaje / 100))
    preferencia = {
      acuerdo:              p.codigo_acuerdo,
      bloque:               p.bloque,
      pais:                 p.pais,
      porcentaje_preferencia: p.porcentaje,
      arancel_preferencial: arancelConPreferencia,
    }
    arancel = arancelConPreferencia
  }

  return {
    ncm: {
      code:        ncmData.codigo_ncm,
      description: ncmData.descripcion ?? '',
    },
    arancel,
    iva,
    tasaEstadistica,
    ivaAdicional:        ai.iva_ad ?? 0,
    percepcionGanancias: ai.gan ?? 0,
    ingresosBrutos:      ai.iibb ?? 0,
    esMercosur,
    preferencia,
  }
}

function regimenGeneral({ cif, arancel, iva, tasaEstadistica, condicionIva, ivaAdicionalBase, percepcionGananciasBase, ingresosBrutosBase }) {
  const derechoImportacion = r(cif * (arancel / 100))
  const baseTasa = Math.min(cif, 10000)
  const tasaEstMonto = r(baseTasa * (tasaEstadistica / 100))
  const baseIva = r(cif + derechoImportacion + tasaEstMonto)
  const ivaMonto = r(baseIva * (iva / 100))

  let ivaAdicional = 0, percepcionGanancias = 0, ingresosBrutos = 0
  if (condicionIva === 'responsable_inscripto') {
    ivaAdicional       = r(baseIva * ((ivaAdicionalBase || 20) / 100))
    percepcionGanancias = r(baseIva * ((percepcionGananciasBase || 6) / 100))
    ingresosBrutos     = r(baseIva * ((ingresosBrutosBase || 2.5) / 100))
  } else if (condicionIva === 'monotributista') {
    ivaAdicional       = r(baseIva * ((ivaAdicionalBase || 20) / 100))
    ingresosBrutos     = r(baseIva * ((ingresosBrutosBase || 2.5) / 100))
  }

  const total = r(derechoImportacion + tasaEstMonto + ivaMonto + ivaAdicional + percepcionGanancias + ingresosBrutos)

  return {
    disponible: true,
    desglose: {
      derecho_importacion:    { alicuota: arancel,             monto: derechoImportacion },
      tasa_estadistica:       { alicuota: tasaEstadistica,     monto: tasaEstMonto },
      iva:                    { alicuota: iva,                  monto: ivaMonto },
      iva_adicional:          { alicuota: ivaAdicional > 0 ? (ivaAdicionalBase || 20) : 0, monto: ivaAdicional },
      percepcion_ganancias:   { alicuota: percepcionGanancias > 0 ? (percepcionGananciasBase || 6) : 0, monto: percepcionGanancias },
      ingresos_brutos:        { alicuota: ingresosBrutos > 0 ? (ingresosBrutosBase || 2.5) : 0, monto: ingresosBrutos },
    },
    total_tributos: total,
    costo_total:    r(cif + total),
    effective_rate: total > 0 ? r((total / cif) * 100) : 0,
  }
}

function regimenSimplificado(valorFob, limiteFob) {
  const disponible = valorFob <= limiteFob
  if (!disponible) {
    return {
      disponible: false,
      desglose: null,
      total_tributos: null,
      costo_total: null,
      effective_rate: null,
      motivo_no_disponible: `Excede USD ${limiteFob.toLocaleString('es-AR')}`,
    }
  }
  const base = Math.max(0, valorFob - 50)
  const monto = r(base * 0.50)
  return {
    disponible: true,
    desglose: { tributo_unico: { alicuota: 50, monto } },
    total_tributos: monto,
    costo_total: r(valorFob + monto),
    effective_rate: monto > 0 ? r((monto / valorFob) * 100) : 0,
    motivo_no_disponible: null,
  }
}

// ─── Régimen Courier Comercial ───────────────────────────────────────────────
// Flat tariff: DI 20% + TE 3% + IVA 21% on valor_fob. No franchise. No percepciones.
// Limit: valor_fob <= USD 3.000.
const COURIER_DI_PCT  = 20
const COURIER_TE_PCT  = 3
const COURIER_IVA_PCT = 21

function regimenCourierComercial({ valor_fob }) {
  const warnings = []
  if (valor_fob > 3000) {
    warnings.push('Excede USD 3.000')
  }
  const derecho  = r(valor_fob * (COURIER_DI_PCT / 100))
  const tasaEst  = r(valor_fob * (COURIER_TE_PCT / 100))
  const ivaMonto = r(valor_fob * (COURIER_IVA_PCT / 100))
  const total    = r(derecho + tasaEst + ivaMonto)
  return {
    disponible: valor_fob <= 3000,
    motivo_no_disponible: valor_fob > 3000 ? 'Excede USD 3.000 FOB' : null,
    desglose: {
      derecho_importacion: { alicuota: COURIER_DI_PCT,  monto: derecho,  nota: null },
      tasa_estadistica:    { alicuota: COURIER_TE_PCT,  monto: tasaEst,  nota: null },
      iva:                 { alicuota: COURIER_IVA_PCT, monto: ivaMonto, nota: null },
    },
    total_tributos: total,
    costo_total:    r(valor_fob + total),
    effective_rate: total > 0 ? r((total / valor_fob) * 100) : 0,
    warnings,
  }
}

// ─── Régimen Courier Personal ────────────────────────────────────────────────
// Franchise USD 400 exempt. DI 20% + TE 3% on the excess over USD 400 (measured on
// valor_fob). IVA 21% flat on the full valor_fob (not compounded). No percepciones.
// Limit: valor_fob <= USD 3.000. Non-blocking weight warning if peso_kg > 50.
function regimenCourierPersonal({ valor_fob, peso_kg }) {
  const FRANQUICIA = 400
  const warnings = []
  if (valor_fob > 3000) {
    warnings.push('Excede USD 3.000')
  }
  if (peso_kg != null && peso_kg > 50) {
    warnings.push('El envío supera los 50 kg — verificá con el operador de courier')
  }
  const exceso   = Math.max(0, valor_fob - FRANQUICIA)
  const derecho  = r(exceso * (COURIER_DI_PCT / 100))
  const tasaEst  = r(exceso * (COURIER_TE_PCT / 100))
  const ivaMonto = r(valor_fob * (COURIER_IVA_PCT / 100))  // flat on full value
  const total    = r(derecho + tasaEst + ivaMonto)
  return {
    disponible: valor_fob <= 3000,
    motivo_no_disponible: valor_fob > 3000 ? 'Excede USD 3.000 FOB' : null,
    desglose: {
      franquicia:          { monto: Math.min(valor_fob, FRANQUICIA), nota: 'Franquicia exenta USD 400' },
      derecho_importacion: { alicuota: COURIER_DI_PCT,  monto: derecho,  nota: `Sobre exceso USD ${r(exceso)}` },
      tasa_estadistica:    { alicuota: COURIER_TE_PCT,  monto: tasaEst,  nota: null },
      iva:                 { alicuota: COURIER_IVA_PCT, monto: ivaMonto, nota: 'Sobre valor total (FOB)' },
    },
    total_tributos: total,
    costo_total:    r(valor_fob + total),
    effective_rate: valor_fob > 0 ? r((total / valor_fob) * 100) : 0,
    warnings,
  }
}

export async function calcularImportacion(supabase, params) {
  const {
    ncm_code,
    valor_fob,
    flete_internacional = 0,
    seguro_internacional = null,
    pais_origen_iso3,
    condicion_iva = 'responsable_inscripto',
    regimen = null,
    peso_kg = null,
    modo = 'maritimo',
  } = params

  const notas = []

  const datos = await obtenerNCMYArancel(supabase, ncm_code, pais_origen_iso3)
  if (datos.error) return { error: datos.error }

  const { ncm, arancel, iva, tasaEstadistica, ivaAdicional: ivaAdicionalBase, percepcionGanancias: percepcionGananciasBase, ingresosBrutos: ingresosBrutosBase, esMercosur, preferencia } = datos

  // Flete estimado: aplica para cualquier régimen cuando no se ingresó flete.
  // Para courier fuerza modo 'courier'; para otros modos usa el parámetro `modo`.
  const esCourier = regimen === 'courier_comercial' || regimen === 'courier_personal' || regimen === 'puerta_a_puerta'
  const modoEfectivo = esCourier ? 'courier' : (modo ?? 'maritimo')
  let fleteEfectivo = flete_internacional
  let fleteEstimado = false

  if (!flete_internacional || flete_internacional === 0) {
    if (peso_kg) {
      const tarifa = TARIFA_KG[modoEfectivo] ?? TARIFA_KG.maritimo
      fleteEfectivo = r(peso_kg * tarifa)
      fleteEstimado = true
      const modoLabel = modoEfectivo.charAt(0).toUpperCase() + modoEfectivo.slice(1)
      notas.push(`Flete ${modoLabel.toLowerCase()} estimado: ${peso_kg} kg × USD ${tarifa}/kg = USD ${fleteEfectivo}`)
    } else {
      const pct = FALLBACK_PCT_FOB[modoEfectivo] ?? FALLBACK_PCT_FOB.maritimo
      fleteEfectivo = r(valor_fob * pct)
      fleteEstimado = true
      const modoLabel = modoEfectivo.charAt(0).toUpperCase() + modoEfectivo.slice(1)
      notas.push(`Flete ${modoLabel.toLowerCase()} estimado: ${(pct * 100).toFixed(0)}% del FOB (sin peso) = USD ${fleteEfectivo}`)
    }
  }

  const seguro = seguro_internacional !== null
    ? seguro_internacional
    : r((valor_fob + fleteEfectivo) * 0.01)
  const cif = r(valor_fob + fleteEfectivo + seguro)

  notas.push(esMercosur
    ? `Origen Mercosur (${pais_origen_iso3}) — arancel intrazona ${arancel}%`
    : `Origen ${pais_origen_iso3} — arancel extrazona ${arancel}%`)
  if (preferencia) notas.push(`Preferencia arancelaria: ${preferencia.acuerdo} (${preferencia.porcentaje_preferencia}% preferencia) → arancel ${arancel}%`)
  if (seguro_internacional === null) notas.push(`Seguro estimado 1% de (FOB + flete) = USD ${seguro}`)

  // ── Regímenes de un solo resultado (nuevo flujo) ──────────────────────────
  if (regimen === 'courier_comercial') {
    const resultado = regimenCourierComercial({ valor_fob })
    return {
      regimen_unico: true,
      regimen: 'courier_comercial',
      ncm,
      valores_base: { fob: valor_fob, flete: fleteEfectivo, seguro, cif, flete_estimado: fleteEstimado },
      preferencia_aplicada: preferencia,
      resultado,
      notas,
      warnings: resultado.warnings ?? [],
    }
  }

  if (regimen === 'courier_personal') {
    const resultado = regimenCourierPersonal({ valor_fob, peso_kg })
    return {
      regimen_unico: true,
      regimen,
      ncm,
      valores_base: { fob: valor_fob, flete: fleteEfectivo, seguro, cif, flete_estimado: fleteEstimado },
      preferencia_aplicada: preferencia,
      resultado,
      notas,
      warnings: resultado.warnings ?? [],
    }
  }

  if (regimen === 'puerta_a_puerta') {
    const resultado = regimenCourierPersonal({ valor_fob, peso_kg })
    return {
      regimen_unico: true,
      regimen,
      ncm,
      valores_base: { fob: valor_fob, flete: fleteEfectivo, seguro, cif, flete_estimado: fleteEstimado },
      preferencia_aplicada: preferencia,
      resultado,
      notas,
      warnings: resultado.warnings ?? [],
    }
  }

  if (regimen === 'general') {
    const resultado = regimenGeneral({ cif, arancel, iva, tasaEstadistica, condicionIva: condicion_iva, ivaAdicionalBase, percepcionGananciasBase, ingresosBrutosBase })
    return {
      regimen_unico: true,
      regimen: 'general',
      ncm,
      valores_base: { fob: valor_fob, flete: fleteEfectivo, seguro, cif, flete_estimado: fleteEstimado },
      preferencia_aplicada: preferencia,
      resultado,
      notas,
      warnings: [],
    }
  }

  const general = regimenGeneral({ cif, arancel, iva, tasaEstadistica, condicionIva: condicion_iva, ivaAdicionalBase, percepcionGananciasBase, ingresosBrutosBase })
  const courier = regimenSimplificado(valor_fob, 3000)
  if (!courier.disponible) notas.push('Régimen courier no disponible — FOB > USD 3.000')
  const pef = regimenSimplificado(valor_fob, 3000)
  const upuMonto = r(valor_fob * 0.50)
  const correo_upu = {
    disponible: true,
    desglose: { tributo_unico: { alicuota: 50, monto: upuMonto } },
    total_tributos: upuMonto,
    costo_total: r(valor_fob + upuMonto),
    effective_rate: r((upuMonto / valor_fob) * 100),
    motivo_no_disponible: null,
  }

  const opciones = [
    { nombre: 'general', costo: general.costo_total },
    ...(courier.disponible ? [{ nombre: 'courier', costo: courier.costo_total }] : []),
    ...(pef.disponible ? [{ nombre: 'pef', costo: pef.costo_total }] : []),
    { nombre: 'correo_upu', costo: correo_upu.costo_total },
  ]
  opciones.sort((a, b) => a.costo - b.costo)
  const mejorOpcion = opciones[0].nombre
  const ahorroVsGeneral = r(general.costo_total - opciones[0].costo)

  return {
    ncm,
    valores_base: { fob: valor_fob, flete: fleteEfectivo, seguro, cif, flete_estimado: fleteEstimado },
    preferencia_aplicada: preferencia,
    regimenes: { general, courier, pef, correo_upu },
    mejor_opcion: mejorOpcion,
    ahorro_vs_general: ahorroVsGeneral > 0 ? ahorroVsGeneral : 0,
    notas,
  }
}

export default calcularImportacion
