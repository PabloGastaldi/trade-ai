/**
 * calc-importacion.js — Cálculo de costos de importación para Argentina.
 * Función pura async — recibe un cliente Supabase como parámetro.
 * Todos los montos en USD, redondeados a 2 decimales.
 */

export const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']
export const CONDICIONES_IVA = ['responsable_inscripto', 'monotributista', 'consumidor_final', 'exento']
export const REGIMENES = ['general', 'courier', 'pef', 'correo_upu']
export const MERCOSUR = ['BRA', 'PRY', 'URY']

function r(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Busca un NCM en Supabase y determina el arancel aplicable.
 * Verifica preferencias arancelarias y Mercosur.
 */
async function obtenerNCMYArancel(supabase, ncm_code, pais_origen_iso3) {
  const { data: ncm, error } = await supabase
    .from('ncm')
    .select('ncm_code, description, arancel_extrazona, arancel_intrazona, iva_importacion, tasa_estadistica')
    .eq('ncm_code', ncm_code)
    .single()

  if (error || !ncm) {
    return { error: `NCM "${ncm_code}" no encontrado en la base de datos.` }
  }

  // Mercosur usa arancel intrazona
  let arancel = ncm.arancel_extrazona ?? 0
  let esMercosur = false
  if (MERCOSUR.includes(pais_origen_iso3)) {
    esMercosur = true
    arancel = ncm.arancel_intrazona ?? 0
  }

  // Buscar preferencia arancelaria (NCM sin puntos, primeros 8 dígitos + país ISO3)
  const ncmBase = ncm_code.replace(/\./g, '').substring(0, 8)
  const { data: pref } = await supabase
    .from('preferencias_arancelarias')
    .select('*')
    .like('ncm_naladisa', `${ncmBase}%`)
    .eq('pais_iso3', pais_origen_iso3)
    .limit(1)

  let preferencia = null
  if (pref && pref.length > 0) {
    preferencia = {
      acuerdo: pref[0].acuerdo ?? pref[0].nombre_acuerdo ?? 'Desconocido',
      pais: pref[0].pais ?? pais_origen_iso3,
      arancel_preferencial: pref[0].arancel_reducido ?? 0,
    }
    arancel = pref[0].arancel_reducido ?? 0
  }

  return {
    ncm: {
      code: ncm.ncm_code,
      description: ncm.description ?? '',
    },
    arancel,
    iva: ncm.iva_importacion ?? 21,
    tasaEstadistica: ncm.tasa_estadistica ?? 3,
    esMercosur,
    preferencia,
  }
}

/**
 * Régimen GENERAL — despacho formal a plaza.
 * Incluye: derecho importación, tasa estadística, IVA, IVA adicional,
 * percepción ganancias, ingresos brutos.
 */
function regimenGeneral({ cif, arancel, iva, tasaEstadistica, condicionIva }) {
  // Derecho de importación sobre CIF
  const derechoImportacion = r(cif * (arancel / 100))

  // Tasa estadística: 3% sobre CIF, tope USD 10.000 de base
  const baseTasa = Math.min(cif, 10000)
  const tasaEstMonto = r(baseTasa * (tasaEstadistica / 100))

  // Base imponible IVA = CIF + DI + TE
  const baseIva = r(cif + derechoImportacion + tasaEstMonto)
  const ivaMonto = r(baseIva * (iva / 100))

  // IVA adicional según condición fiscal del importador
  let ivaAdicional = 0, percepcionGanancias = 0, ingresosBrutos = 0
  if (condicionIva === 'responsable_inscripto') {
    ivaAdicional = r(baseIva * 0.20)
    percepcionGanancias = r(baseIva * 0.06)
    ingresosBrutos = r(baseIva * 0.025)
  } else if (condicionIva === 'monotributista') {
    ivaAdicional = r(baseIva * 0.20)
    percepcionGanancias = 0
    ingresosBrutos = r(baseIva * 0.025)
  }
  // consumidor_final y exento → 0 en todos

  const total = r(
    derechoImportacion + tasaEstMonto + ivaMonto +
    ivaAdicional + percepcionGanancias + ingresosBrutos
  )

  return {
    disponible: true,
    desglose: {
      derecho_importacion: { alicuota: arancel, monto: derechoImportacion },
      tasa_estadistica: { alicuota: tasaEstadistica, monto: tasaEstMonto },
      iva: { alicuota: iva, monto: ivaMonto },
      iva_adicional: { alicuota: ivaAdicional > 0 ? 20 : 0, monto: ivaAdicional },
      percepcion_ganancias: { alicuota: percepcionGanancias > 0 ? 6 : 0, monto: percepcionGanancias },
      ingresos_brutos: { alicuota: ingresosBrutos > 0 ? 2.5 : 0, monto: ingresosBrutos },
    },
    total_tributos: total,
    costo_total: r(cif + total),
    effective_rate: total > 0 ? r((total / (cif / (1 + arancel / 100 + tasaEstadistica / 100)) * 100)) : 0,
  }
}

/**
 * Régimen COURIER / PEF / UPU — tasa única 50% sobre excedente de franquicia USD 50.
 * Franquicia: USD 50 exentos. Si FOB ≤ 50 → tributo = 0.
 */
function regimenSimplificado(valorFob, nombreRegimen, limiteFob) {
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

  const base = Math.max(0, valorFob - 50) // franquicia USD 50
  const monto = r(base * 0.50)
  const costoTotal = r(valorFob + monto)

  return {
    disponible: true,
    desglose: {
      tributo_unico: { alicuota: 50, monto },
    },
    total_tributos: monto,
    costo_total: costoTotal,
    effective_rate: monto > 0 ? r((monto / valorFob) * 100) : 0,
    motivo_no_disponible: null,
  }
}

/**
 * Función principal de cálculo de importación.
 *
 * @param {object} supabase - Cliente Supabase
 * @param {object} params
 * @param {string} params.ncm_code
 * @param {number} params.valor_fob
 * @param {number} params.flete_internacional
 * @param {number|null} params.seguro_internacional - null = estimar 1%
 * @param {string} params.pais_origen_iso3
 * @param {string} params.condicion_iva
 * @returns {Promise<object>}
 */
export async function calcularImportacion(supabase, params) {
  const {
    ncm_code,
    valor_fob,
    flete_internacional = 0,
    seguro_internacional = null,
    pais_origen_iso3,
    condicion_iva = 'responsable_inscripto',
  } = params

  const notas = []

  // 1. Obtener NCM y arancel aplicable
  const datos = await obtenerNCMYArancel(supabase, ncm_code, pais_origen_iso3)
  if (datos.error) return { error: datos.error }

  const { ncm, arancel, iva, tasaEstadistica, esMercosur, preferencia } = datos

  // 2. Calcular CIF
  const seguro = seguro_internacional !== null
    ? seguro_internacional
    : r((valor_fob + flete_internacional) * 0.01)
  const cif = r(valor_fob + flete_internacional + seguro)

  // Notas
  notas.push(
    esMercosur
      ? `Origen Mercosur (${pais_origen_iso3}) — arancel intrazona ${arancel}%`
      : `Origen ${pais_origen_iso3} — arancel extrazona ${arancel}%`
  )
  if (preferencia) {
    notas.push(`Preferencia arancelaria: ${preferencia.acuerdo} → arancel ${arancel}%`)
  }
  if (seguro_internacional === null) {
    notas.push(`Seguro estimado 1% de (FOB + flete) = USD ${seguro}`)
  }

  // 3. Régimen general
  const general = regimenGeneral({
    cif,
    arancel,
    iva,
    tasaEstadistica,
    condicionIva: condicion_iva,
  })

  // 4. Courier (límite USD 3.000)
  const courier = regimenSimplificado(valor_fob, 'courier', 3000)
  if (!courier.disponible) notas.push('Régimen courier no disponible — FOB > USD 3.000')

  // 5. PEF (mismo límite que courier)
  const pef = regimenSimplificado(valor_fob, 'pef', 3000)

  // 6. Correo UPU — sin límite, 50% sobre FOB total
  const upuMonto = r(valor_fob * 0.50)
  const correo_upu = {
    disponible: true,
    desglose: { tributo_unico: { alicuota: 50, monto: upuMonto } },
    total_tributos: upuMonto,
    costo_total: r(valor_fob + upuMonto),
    effective_rate: r((upuMonto / valor_fob) * 100),
    motivo_no_disponible: null,
  }

  // 7. Mejor opción (menor costo total entre disponibles)
  const opciones = [
    { nombre: 'general', costo: general.costo_total },
    ...(courier.disponible ? [{ nombre: 'courier', costo: courier.costo_total }] : []),
    ...(pef.disponible ? [{ nombre: 'pef', costo: pef.costo_total }] : []),
    { nombre: 'correo_upu', costo: correo_upu.costo_total },
  ]
  opciones.sort((a, b) => a.costo - b.costo)
  const mejorOpcion = opciones[0].nombre
  const ahorroVsGeneral = general.costo_total - opciones[0].costo

  return {
    ncm,
    valores_base: {
      fob: valor_fob,
      flete: flete_internacional,
      seguro,
      cif,
    },
    preferencia_aplicada: preferencia,
    regimenes: {
      general,
      courier,
      pef,
      correo_upu,
    },
    mejor_opcion: mejorOpcion,
    ahorro_vs_general: ahorroVsGeneral > 0 ? r(ahorroVsGeneral) : 0,
    notas,
  }
}

export default calcularImportacion
