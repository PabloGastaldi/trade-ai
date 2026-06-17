/**
 * estimar-logistica.js — Estimación de costos logísticos post-CIF.
 *
 * El motor de tributos (`calc-importacion.js`) llega hasta el CIF (FOB + flete + seguro).
 * "Puesto en Argentina" suma además: gastos de puerto/depósito, honorarios del despachante,
 * flete interno (puerto → planta) y gastos bancarios — ver
 * `openspec/changes/report-insights/design-logistica.md` Parte A/B.
 *
 * Esta función es PURA y SWAPPABLE: un futuro `cotizarLogistica(proveedor, params)` puede
 * reemplazarla sin que el informe sepa la diferencia — ambas comparten la forma de salida
 * `{ items, total }` (ver design-logistica.md Parte D). Mientras tanto, todos los montos son
 * estimaciones de plaza, etiquetadas como tales (`es_estimado: true`, `metodo: 'estimado'`).
 *
 * Todos los montos en USD, redondeados a 2 decimales.
 */

function r(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function clamp(valor, min, max) {
  return Math.min(Math.max(valor, min), max)
}

// ─── Constantes TUNEABLES — defaults de plaza (CCER + práctica), no cotización real ─────────

// Gastos de puerto/depósito: naviera (manejo contenedor + liberación), forwarder, depósito
// fiscal, manipuleo (carga/descarga/estibado), otros admin (certificaciones, inspecciones).
export const GASTOS_PORTUARIOS_PCT_CIF = 0.02
export const GASTOS_PORTUARIOS_MIN = 250
export const GASTOS_PORTUARIOS_MAX = 6000

// Honorarios del despachante: comisión sobre el valor de la operación, % sobre FOB (CCER).
export const DESPACHANTE_PCT_FOB = 0.005
export const DESPACHANTE_MIN = 300
export const DESPACHANTE_MAX = 2500

// Flete interno puerto → planta: placeholder fijo hasta tener distancia real.
export const FLETE_INTERNO_FIJO = 200

// Gastos bancarios: % sobre FOB, varía según medio de pago.
// Carta de crédito ~0.5%, transferencia ~0.25% (placeholder — medio_pago lo refina a futuro).
export const GASTOS_BANCARIOS_PCT_FOB_DEFAULT = 0.0025
export const GASTOS_BANCARIOS_PCT_POR_MEDIO = {
  carta_credito: 0.005,
  transferencia: 0.0025,
}

/**
 * estimarLogistica — calcula los ítems logísticos post-CIF.
 *
 * @param {Object} params
 * @param {number} params.fob - Valor FOB en USD.
 * @param {number} params.cif - Valor CIF en USD (FOB + flete + seguro internacional).
 * @param {number|null} [params.peso_kg] - Reservado para refinar flete por peso (no usado aún
 *   en este módulo: el flete internacional vive en `calc-importacion`, no se duplica aquí).
 * @param {string} [params.modo] - Modo de transporte ('maritimo' | 'aereo' | 'terrestre' |
 *   'multimodal'). Reservado para futuras reglas por modo; no afecta el cálculo todavía.
 * @param {string|null} [params.medio_pago] - 'carta_credito' | 'transferencia'. Si se provee,
 *   refina `gastos_bancarios`.
 * @returns {{ items: Array, total: number, es_estimado: true }}
 */
export function estimarLogistica({ fob, cif, peso_kg = null, modo = 'maritimo', medio_pago = null }) {
  const items = []

  // 1. Gastos portuarios — bundle naviera + forwarder + depósito + manipuleo
  const gastosPortuarios = r(clamp(cif * GASTOS_PORTUARIOS_PCT_CIF, GASTOS_PORTUARIOS_MIN, GASTOS_PORTUARIOS_MAX))
  items.push({
    key: 'gastos_portuarios',
    label: 'Gastos de puerto/depósito',
    monto: gastosPortuarios,
    metodo: 'porcentaje',
    detalle: `${(GASTOS_PORTUARIOS_PCT_CIF * 100).toFixed(0)}% del CIF (USD ${GASTOS_PORTUARIOS_MIN}-${GASTOS_PORTUARIOS_MAX})`,
  })

  // 2. Despachante de aduana — % sobre FOB (CCER)
  const despachante = r(clamp(fob * DESPACHANTE_PCT_FOB, DESPACHANTE_MIN, DESPACHANTE_MAX))
  items.push({
    key: 'despachante',
    label: 'Honorarios del despachante',
    monto: despachante,
    metodo: 'porcentaje',
    detalle: `${(DESPACHANTE_PCT_FOB * 100).toFixed(2)}% del FOB (USD ${DESPACHANTE_MIN}-${DESPACHANTE_MAX})`,
  })

  // 3. Flete interno — puerto → planta (placeholder fijo)
  items.push({
    key: 'flete_interno',
    label: 'Flete interno (puerto → planta)',
    monto: r(FLETE_INTERNO_FIJO),
    metodo: 'fijo',
    detalle: `Estimación fija USD ${FLETE_INTERNO_FIJO} — placeholder hasta tener distancia real`,
  })

  // 4. Gastos bancarios — % sobre FOB, refinado por medio de pago si está disponible
  const pctBancarios = (medio_pago && GASTOS_BANCARIOS_PCT_POR_MEDIO[medio_pago] !== undefined)
    ? GASTOS_BANCARIOS_PCT_POR_MEDIO[medio_pago]
    : GASTOS_BANCARIOS_PCT_FOB_DEFAULT
  const gastosBancarios = r(fob * pctBancarios)
  items.push({
    key: 'gastos_bancarios',
    label: 'Gastos bancarios',
    monto: gastosBancarios,
    metodo: 'porcentaje',
    detalle: medio_pago
      ? `${(pctBancarios * 100).toFixed(2)}% del FOB (medio de pago: ${medio_pago})`
      : `${(pctBancarios * 100).toFixed(2)}% del FOB (placeholder — se refina con medio_pago)`,
  })

  const total = r(items.reduce((acc, item) => acc + item.monto, 0))

  return { items, total, es_estimado: true }
}

export default estimarLogistica
