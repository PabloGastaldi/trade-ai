import { createClient } from '@supabase/supabase-js'
import { normalizarCodigoNCM } from '../ncm-lookup.js'

// ─────────────────────────────────────────────────────────────────────────────
// calc-importacion.js
//
// Función PURA de cálculo de costos de importación para Argentina.
// Sin side effects de UI — usable desde la calculadora y desde el chat de IA.
//
// Regímenes soportados:
//   general     — despacho formal a plaza (importación a consumo)
//   courier     — régimen simplificado postal (DGA Res. 3564/2021)
//   pef         — Prestadores de Servicios Postales / Puerta a Puerta
//   correo_upu  — Correo Argentino, encomiendas postales internacionales
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

// ── Constantes normativas ─────────────────────────────────────────────────────

// Países del MERCOSUR (para aplicar arancel intrazona en lugar de extrazona)
const PAISES_MERCOSUR = new Set(['BRA', 'PRY', 'URY', 'VEN'])

// Franquicia courier/PEF: USD 50 exentos (DGA)
const FRANQUICIA_COURIER_USD = 50
// Tasa única para excedente de franquicia
const TASA_COURIER = 0.50
// Límite máximo FOB para régimen courier
const LIMITE_FOB_COURIER_USD = 3000

// Tasa estadística vigente (Res. ME 1111/2023 y actualizaciones)
const TASA_ESTADISTICA_ALICUOTA = 0.03
// Tope de base imponible para tasa estadística en USD
const TOPE_BASE_TASA_ESTADISTICA_USD = 500000

// Alícuotas de IVA adicional (percepción IVA) por condición fiscal
// Res. AFIP 2937/2010 y modificatorias
const IVA_ADICIONAL_POR_CONDICION = {
  responsable_inscripto: 0.20,  // reducido a 10% para bienes del listado Anexo IV
  monotributista:        0.20,
  consumidor_final:      0.00,
  exento:                0.00,
}

// Percepción ganancias por condición fiscal (Res. AFIP 2937/2010)
const GANANCIAS_POR_CONDICION = {
  responsable_inscripto: 0.06,
  monotributista:        0.00,
  consumidor_final:      0.00,
  exento:                0.00,
}

// Ingresos brutos promedio nacional (varía por provincia; este es el típico)
const IIBB_ALICUOTA = 0.025

// ── Helpers de redondeo ───────────────────────────────────────────────────────

// Redondea a 2 decimales para montos en USD
function r(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// ── Lookup: datos del NCM desde Supabase ──────────────────────────────────────

async function obtenerDatosNCM(ncm_code) {
  const supabase = getServiceClient()
  const normalizado = normalizarCodigoNCM(ncm_code)
  if (!normalizado) return null

  const { data, error } = await supabase
    .from('ncm')
    .select([
      'ncm_code',
      'description',
      'arancel_extrazona',
      'arancel_intrazona',
      'iva_importacion',
      'tasa_estadistica',
      'derecho_exportacion',
      'organismos_imp',
    ].join(', '))
    .eq('ncm_code', normalizado.ncmCode)
    .limit(1)
    .single()

  if (error || !data) return null
  return data
}

// ── Lookup: preferencia arancelaria para un NCM + país de origen ──────────────
//
// Consulta las tablas preferencias_arancelarias y acuerdos_generales
// para determinar si el origen tiene arancel preferencial.
//
// Devuelve { tienePreferencia, acuerdo, arancelPreferencial }
// donde arancelPreferencial es null si no se sabe el % exacto
// (para los TLC de cobertura total como MERCOSUR se aplica arancel_intrazona)
// ─────────────────────────────────────────────────────────────────────────────

async function obtenerPreferenciaArancelaria(ncm_code, pais_origen) {
  if (!pais_origen) return { tienePreferencia: false }

  const supabase = getServiceClient()
  const normalizado = normalizarCodigoNCM(ncm_code)
  if (!normalizado) return { tienePreferencia: false }

  // Mapeo ISO3 → nombre de país para buscar en la tabla
  // (la tabla preferencias_arancelarias guarda nombre, no ISO3)
  const nombresPorISO3 = {
    MEX: 'México', PRY: 'Paraguay', CHL: 'Chile', PER: 'Perú',
    COL: 'Colombia', ECU: 'Ecuador', VEN: 'Venezuela', IND: 'India',
    BRA: 'Brasil', URY: 'Uruguay',
  }
  const nombrePais = nombresPorISO3[pais_origen.toUpperCase()]

  // Consultar ambas tablas en paralelo
  const [resPref, resTLC] = await Promise.all([
    // Preferencia específica para este NCM
    nombrePais
      ? supabase
          .from('preferencias_arancelarias')
          .select('acuerdo_id, pais')
          .eq('ncm_code', normalizado.ncmCode)
          .eq('pais', nombrePais)
          .eq('tipo', 'importacion') // importación = el otro país nos da preferencia
          .limit(1)
      : Promise.resolve({ data: [], error: null }),

    // TLC de cobertura total (MERCOSUR, ACE-35 Chile)
    nombrePais
      ? supabase
          .from('acuerdos_generales')
          .select('acuerdo_id, pais, tipo')
          .eq('pais', nombrePais)
          .limit(1)
      : Promise.resolve({ data: [], error: null }),
  ])

  const prefEspecifica = resPref.data?.[0]
  const tlcTotal       = resTLC.data?.[0]

  if (prefEspecifica) {
    return {
      tienePreferencia: true,
      acuerdo: prefEspecifica.acuerdo_id,
      tipo: 'especifica',
      // Las tablas actuales no guardan el % de preferencia, solo la existencia.
      // La alícuota real sería 0% para los listados; usamos arancel_intrazona
      // como mejor aproximación cuando el origen es MERCOSUR, y 0% para ACE.
      arancelPreferencial: PAISES_MERCOSUR.has(pais_origen.toUpperCase()) ? 'intrazona' : 0,
    }
  }

  if (tlcTotal) {
    return {
      tienePreferencia: true,
      acuerdo: tlcTotal.acuerdo_id,
      tipo: 'tlc_total',
      arancelPreferencial: PAISES_MERCOSUR.has(pais_origen.toUpperCase()) ? 'intrazona' : 0,
    }
  }

  return { tienePreferencia: false }
}

// ── Régimen GENERAL (despacho formal a plaza) ─────────────────────────────────
//
// Base legal:
//   - DI: Ley 22.415 (CAA) art. 664 + NCM vigente
//   - TE: Res. ME 1111/2023 (tope USD 500k CIF)
//   - IVA: Ley 23.349 art. 24 inc. b
//   - IVA adicional: Res. AFIP 2937/2010
//   - Percepción Ganancias: Res. AFIP 2937/2010
//   - IIBB: varía por provincia (aquí: promedio nacional 2.5%)
// ─────────────────────────────────────────────────────────────────────────────

function calcularRegimeGeneral({ cif, datosNCM, preferencia, condicion_iva }) {
  const notas = []

  // ── Arancel aplicable ──────────────────────────────────────────────────────
  let arancelAplicado
  let arancelFuente

  if (preferencia.tienePreferencia) {
    if (preferencia.arancelPreferencial === 'intrazona') {
      // MERCOSUR/intrazona: usar arancel_intrazona del NCM
      arancelAplicado = (datosNCM.arancel_intrazona ?? 0) / 100
      arancelFuente = `intrazona ${datosNCM.arancel_intrazona ?? 0}% (${preferencia.acuerdo})`
      notas.push(`Preferencia ${preferencia.acuerdo}: arancel intrazona ${datosNCM.arancel_intrazona ?? 0}% en lugar de extrazona ${datosNCM.arancel_extrazona ?? 0}%`)
    } else {
      // Acuerdo ACE u otro: arancel preferencial puntual (generalmente 0%)
      arancelAplicado = preferencia.arancelPreferencial ?? 0
      arancelFuente = `preferencial ${arancelAplicado * 100}% (${preferencia.acuerdo})`
      notas.push(`Preferencia arancelaria aplicada: ${preferencia.acuerdo} — arancel ${arancelAplicado * 100}% en lugar de AEC ${datosNCM.arancel_extrazona ?? 0}%`)
    }
  } else {
    // Sin preferencia: AEC (Arancel Externo Común)
    arancelAplicado = (datosNCM.arancel_extrazona ?? 0) / 100
    arancelFuente = `extrazona (AEC) ${datosNCM.arancel_extrazona ?? 0}%`
    notas.push(`Sin preferencia arancelaria para el origen declarado — se aplica AEC ${datosNCM.arancel_extrazona ?? 0}%`)
  }

  // ── Derecho de importación (DI) ────────────────────────────────────────────
  const di_alicuota = arancelAplicado
  const di_monto    = r(cif * di_alicuota)

  // ── Tasa estadística (TE) ──────────────────────────────────────────────────
  // Base imponible con tope de USD 500k CIF
  const base_te     = Math.min(cif, TOPE_BASE_TASA_ESTADISTICA_USD)
  const te_alicuota = TASA_ESTADISTICA_ALICUOTA
  const te_monto    = r(base_te * te_alicuota)

  if (cif > TOPE_BASE_TASA_ESTADISTICA_USD) {
    notas.push(`Tasa estadística calculada sobre tope máximo de USD ${TOPE_BASE_TASA_ESTADISTICA_USD.toLocaleString('es-AR')}`)
  }

  // ── Base imponible para IVA y percepciones ─────────────────────────────────
  // = CIF + DI + TE (no incluye IIBB ni percepciones entre sí)
  const base_iva = r(cif + di_monto + te_monto)

  // ── IVA (percepción a la importación) ─────────────────────────────────────
  // La tabla ncm guarda iva_importacion; si está vacío, default 21%
  const iva_alicuota = ((datosNCM.iva_importacion ?? 21) / 100)
  const iva_monto    = r(base_iva * iva_alicuota)

  if (datosNCM.iva_importacion === 0) {
    notas.push('Producto exento de IVA según nomenclatura arancelaria')
  } else if (datosNCM.iva_importacion === 10.5) {
    notas.push('IVA reducido 10.5% según NCM')
  }

  // ── IVA adicional (percepción sobre compras al exterior) ──────────────────
  const iva_ad_alicuota = IVA_ADICIONAL_POR_CONDICION[condicion_iva] ?? 0
  const iva_ad_monto    = r(base_iva * iva_ad_alicuota)

  // ── Percepción ganancias ───────────────────────────────────────────────────
  const gg_alicuota = GANANCIAS_POR_CONDICION[condicion_iva] ?? 0
  const gg_monto    = r(base_iva * gg_alicuota)

  // ── Impuestos internos ─────────────────────────────────────────────────────
  // La tabla ncm no tiene columna ii_alicuota; por ahora se devuelve 0.
  // Agregar cuando se incorpore el dataset de impuestos internos (tabaco, alcohol, etc.)
  const ii_alicuota = 0
  const ii_monto    = 0

  // ── Ingresos brutos ────────────────────────────────────────────────────────
  // Percepción sobre base CIF+DI+TE, alícuota promedio nacional
  const iibb_alicuota = IIBB_ALICUOTA
  const iibb_monto    = r(base_iva * iibb_alicuota)

  notas.push(`Ingresos brutos calculados con alícuota promedio nacional ${IIBB_ALICUOTA * 100}% (varía por provincia)`)

  // ── Totales ────────────────────────────────────────────────────────────────
  const total_tributos = r(di_monto + te_monto + iva_monto + iva_ad_monto + gg_monto + ii_monto + iibb_monto)

  return {
    arancelFuente,
    desglose: {
      derecho_importacion:  { alicuota: di_alicuota,    monto: di_monto },
      tasa_estadistica:     { alicuota: te_alicuota,    monto: te_monto },
      iva:                  { alicuota: iva_alicuota,   monto: iva_monto },
      iva_adicional:        { alicuota: iva_ad_alicuota, monto: iva_ad_monto },
      percepcion_ganancias: { alicuota: gg_alicuota,    monto: gg_monto },
      impuestos_internos:   { alicuota: ii_alicuota,    monto: ii_monto },
      ingresos_brutos:      { alicuota: iibb_alicuota,  monto: iibb_monto },
    },
    total_tributos,
    notas,
  }
}

// ── Regímenes simplificados (courier / PEF / UPU) ─────────────────────────────
//
// En estos regímenes no se discriminan tributos individuales:
// se aplica una tasa única del 50% sobre el excedente de la franquicia.
// Ref: DGA Res. 3564/2021 (courier) y Nota Externa DGA 4/2005 (UPU)
// ─────────────────────────────────────────────────────────────────────────────

function calcularRegimenSimplificado({ valor_fob, regimen }) {
  const notas = []

  // Validar límite FOB para courier
  if (regimen === 'courier' && valor_fob > LIMITE_FOB_COURIER_USD) {
    notas.push(`⚠️ El valor FOB USD ${valor_fob.toLocaleString('es-AR', { minimumFractionDigits: 2 })} supera el límite de USD ${LIMITE_FOB_COURIER_USD} para régimen courier`)
  }

  // Franquicia aplicable
  const franquicia = FRANQUICIA_COURIER_USD
  const base_imponible = Math.max(0, valor_fob - franquicia)
  const tributo_unico = r(base_imponible * TASA_COURIER)

  notas.push(`Régimen ${regimen}: tributo único 50% sobre excedente de franquicia USD ${franquicia}`)
  if (base_imponible === 0) {
    notas.push(`Envío dentro de la franquicia USD ${franquicia} — sin tributos`)
  }

  return {
    desglose: {
      tributo_unico: { alicuota: TASA_COURIER, base: base_imponible, monto: tributo_unico },
    },
    total_tributos: tributo_unico,
    notas,
  }
}

// ── FUNCIÓN PRINCIPAL EXPORTADA ───────────────────────────────────────────────
//
// calcularImportacion({ ncm_code, valor_fob, flete_internacional,
//   seguro_internacional, pais_origen, regimen, condicion_iva, cantidad })
//
// Devuelve el objeto de resultado completo o lanza Error con mensaje claro.
// ─────────────────────────────────────────────────────────────────────────────

export async function calcularImportacion({
  ncm_code,
  valor_fob,
  flete_internacional    = 0,
  seguro_internacional   = null,  // null → estimar 1% de (FOB + flete)
  pais_origen            = null,
  regimen                = 'general',
  condicion_iva          = 'responsable_inscripto',
  cantidad               = 1,
}) {
  // ── Validaciones de entrada ────────────────────────────────────────────────

  if (!ncm_code || typeof ncm_code !== 'string') {
    throw new Error('ncm_code es requerido')
  }
  if (typeof valor_fob !== 'number' || valor_fob < 0) {
    throw new Error('valor_fob debe ser un número mayor o igual a 0')
  }
  const REGIMENES_VALIDOS = ['general', 'courier', 'pef', 'correo_upu']
  if (!REGIMENES_VALIDOS.includes(regimen)) {
    throw new Error(`regimen debe ser uno de: ${REGIMENES_VALIDOS.join(', ')}`)
  }
  const CONDICIONES_IVA_VALIDAS = ['responsable_inscripto', 'monotributista', 'consumidor_final', 'exento']
  if (!CONDICIONES_IVA_VALIDAS.includes(condicion_iva)) {
    throw new Error(`condicion_iva debe ser una de: ${CONDICIONES_IVA_VALIDAS.join(', ')}`)
  }

  // ── Buscar datos del NCM en Supabase ───────────────────────────────────────

  const datosNCM = await obtenerDatosNCM(ncm_code)
  if (!datosNCM) {
    throw new Error(`NCM "${ncm_code}" no encontrado en la nomenclatura arancelaria argentina`)
  }

  // ── Calcular valor CIF ────────────────────────────────────────────────────
  // CIF = FOB + Flete + Seguro
  // Si el seguro no se informa, se estima como 1% del (FOB + Flete)
  const flete   = flete_internacional ?? 0
  const seguro  = seguro_internacional !== null
    ? seguro_internacional
    : r((valor_fob + flete) * 0.01)
  const seguroEstimado = seguro_internacional === null

  const cif = r(valor_fob + flete + seguro)

  // ── Verificar preferencia arancelaria ────────────────────────────────────
  const preferencia = await obtenerPreferenciaArancelaria(ncm_code, pais_origen)

  // ── Calcular tributos según régimen ───────────────────────────────────────
  let resultadoCalculo

  if (regimen === 'general') {
    resultadoCalculo = calcularRegimeGeneral({ cif, datosNCM, preferencia, condicion_iva })
  } else {
    // courier / pef / correo_upu → régimen simplificado
    resultadoCalculo = calcularRegimenSimplificado({ valor_fob, regimen })
  }

  // ── Totales finales ────────────────────────────────────────────────────────

  const costo_total_usd = r(cif + resultadoCalculo.total_tributos)

  // Effective rate: total tributos como % del FOB (métrica comparativa tipo price2b)
  const effective_rate = valor_fob > 0
    ? r((resultadoCalculo.total_tributos / valor_fob) * 100)
    : 0

  // ── Calcular ahorro vs régimen general (solo para regímenes simplificados) ─

  let ahorro_vs_general = null
  if (regimen !== 'general') {
    try {
      const calculoGeneral = calcularRegimeGeneral({ cif, datosNCM, preferencia, condicion_iva })
      ahorro_vs_general = r(calculoGeneral.total_tributos - resultadoCalculo.total_tributos)
    } catch {
      // Si falla el cálculo general comparativo, no bloquear el resultado principal
    }
  }

  // ── Notas adicionales ──────────────────────────────────────────────────────

  const notas = [...resultadoCalculo.notas]

  if (seguroEstimado) {
    notas.push(`Seguro estimado como 1% de (FOB + flete) = USD ${seguro.toFixed(2)}. Informá el valor real para mayor precisión.`)
  }
  if (pais_origen && !preferencia.tienePreferencia) {
    notas.push(`No se encontró preferencia arancelaria para origen ${pais_origen}. Consultá si aplica SGP u otro acuerdo no incluido en la base.`)
  }
  if (datosNCM.organismos_imp) {
    notas.push(`Organismos de control para importación: ${datosNCM.organismos_imp}`)
  }

  // ── Objeto de respuesta ────────────────────────────────────────────────────

  return {
    // Inputs normalizados
    regimen,
    ncm_code:         datosNCM.ncm_code,
    ncm_descripcion:  datosNCM.description,
    pais_origen:      pais_origen ?? null,
    condicion_iva,
    cantidad,

    // Valores de base
    valor_fob,
    flete_internacional: flete,
    seguro_internacional: seguro,
    seguro_estimado:  seguroEstimado,
    valor_cif:        cif,

    // Desglose de tributos
    desglose: resultadoCalculo.desglose,

    // Totales
    total_tributos:   resultadoCalculo.total_tributos,
    costo_total_usd,
    effective_rate,   // tributos / FOB × 100

    // Preferencia arancelaria aplicada
    preferencia_aplicada: preferencia.tienePreferencia
      ? { acuerdo: preferencia.acuerdo, tipo: preferencia.tipo }
      : null,

    // Ahorro vs régimen general (solo para regímenes simplificados)
    ahorro_vs_general,

    // Notas y advertencias
    notas,
  }
}
