/**
 * Pure-function unit tests for calcularImportacion.
 *
 * Supabase is stubbed to return fixed NCM/tariff data so these tests run
 * without a live database. Courier regimes ignore DB rates (flat constants),
 * so the stub values only matter for the general-regime path.
 */

import { describe, it, expect, vi } from 'vitest'
import { calcularImportacion } from '../../../lib/calculadora/calc-importacion.js'

// Stub supabase returning NCM and fixed aranceles { die:14, te:2, iva:21, iva_ad:0, gan:0, iibb:0 }.
// Also stubs country_codes and acuerdos_importacion (no preferencia).
function makeSupabase() {
  const ncmRow = {
    codigo_ncm: '84713012000',
    descripcion: 'Computadora portátil',
    aranceles_importacion: {
      aec: 14, die: 14, dii: 0, te: 2, iva: 21, iva_ad: 0, gan: 0, iibb: 0,
    },
  }
  const countryRow = { name_es: 'China' }

  function makeChain(value) {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: value, error: null }),
    }
    // .limit().single() needs to also handle .limit() returning { data:[] }
    chain.limit.mockImplementation((n) => ({
      ...chain,
      single: vi.fn().mockResolvedValue({ data: value, error: null }),
      // for acuerdos (array return without .single())
      then: (resolve) => resolve({ data: [], error: null }),
    }))
    return chain
  }

  return {
    from: vi.fn((table) => {
      if (table === 'ncm') return makeChain(ncmRow)
      if (table === 'country_codes') return makeChain(countryRow)
      if (table === 'acuerdos_importacion') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return makeChain(null)
    }),
  }
}

const NCM = '84713012000'
const PAIS = 'CHN'
const BASE_PARAMS = { ncm_code: NCM, pais_origen_iso3: PAIS, condicion_iva: 'responsable_inscripto' }

describe('Courier Personal', () => {
  it('USD 450 — DI=10, TE=1.5, IVA=94.50, total=106.00', async () => {
    const result = await calcularImportacion(makeSupabase(), {
      ...BASE_PARAMS,
      valor_fob: 450,
      regimen: 'courier_personal',
    })
    expect(result.regimen_unico).toBe(true)
    expect(result.regimen).toBe('courier_personal')
    const { desglose, total_tributos } = result.resultado
    expect(desglose.derecho_importacion.monto).toBe(10)       // 20% of 50
    expect(desglose.tasa_estadistica.monto).toBe(1.5)         // 3% of 50
    expect(desglose.iva.monto).toBe(94.5)                     // 21% of 450
    expect(total_tributos).toBe(106)
  })

  it('USD 380 — below franchise: DI=0, TE=0, IVA=79.80', async () => {
    const result = await calcularImportacion(makeSupabase(), {
      ...BASE_PARAMS,
      valor_fob: 380,
      regimen: 'courier_personal',
    })
    const { desglose, total_tributos } = result.resultado
    expect(desglose.derecho_importacion.monto).toBe(0)
    expect(desglose.tasa_estadistica.monto).toBe(0)
    expect(desglose.iva.monto).toBe(79.8)                     // 21% of 380
    expect(total_tributos).toBe(79.8)
  })

  it('peso_kg=55 — returns weight warning but still calculates', async () => {
    const result = await calcularImportacion(makeSupabase(), {
      ...BASE_PARAMS,
      valor_fob: 450,
      peso_kg: 55,
      regimen: 'courier_personal',
    })
    expect(result.resultado.disponible).toBe(true)
    const allWarnings = [...(result.warnings ?? []), ...(result.resultado?.warnings ?? [])]
    expect(allWarnings.some(w => w.includes('50 kg'))).toBe(true)
  })

  it('USD 3.001 — disponible:false with limit warning', async () => {
    const result = await calcularImportacion(makeSupabase(), {
      ...BASE_PARAMS,
      valor_fob: 3001,
      regimen: 'courier_personal',
    })
    expect(result.resultado.disponible).toBe(false)
    const allWarnings = [...(result.warnings ?? []), ...(result.resultado?.warnings ?? [])]
    expect(allWarnings.some(w => w.includes('3.000') || w.includes('3000'))).toBe(true)
  })
})

describe('Courier Comercial', () => {
  it('USD 1.000 — DI=200, TE=30, IVA=210, percepciones=0', async () => {
    const result = await calcularImportacion(makeSupabase(), {
      ...BASE_PARAMS,
      valor_fob: 1000,
      regimen: 'courier_comercial',
    })
    expect(result.regimen_unico).toBe(true)
    const { desglose, total_tributos } = result.resultado
    expect(desglose.derecho_importacion.monto).toBe(200)
    expect(desglose.tasa_estadistica.monto).toBe(30)
    expect(desglose.iva.monto).toBe(210)
    expect(total_tributos).toBe(440)
    // No percepcion keys in courier
    expect(desglose.iva_adicional).toBeUndefined()
    expect(desglose.percepcion_ganancias).toBeUndefined()
  })

  it('USD 3.001 — disponible:false with limit warning', async () => {
    const result = await calcularImportacion(makeSupabase(), {
      ...BASE_PARAMS,
      valor_fob: 3001,
      regimen: 'courier_comercial',
    })
    expect(result.resultado.disponible).toBe(false)
    const allWarnings = [...(result.warnings ?? []), ...(result.resultado?.warnings ?? [])]
    expect(allWarnings.some(w => w.includes('3.000') || w.includes('3000'))).toBe(true)
  })
})

describe('Régimen General', () => {
  it('regimen:general returns regimen_unico:true with percepciones for RI', async () => {
    const result = await calcularImportacion(makeSupabase(), {
      ...BASE_PARAMS,
      valor_fob: 1000,
      regimen: 'general',
      condicion_iva: 'responsable_inscripto',
    })
    expect(result.regimen_unico).toBe(true)
    expect(result.regimen).toBe('general')
    const { desglose } = result.resultado
    expect(desglose.derecho_importacion).toBeDefined()
    expect(desglose.iva_adicional).toBeDefined()
    expect(desglose.percepcion_ganancias).toBeDefined()
  })
})

describe('Régimen null (comparador path)', () => {
  it('regimen:null returns regimenes.{general,courier,pef,correo_upu} — no regimen_unico', async () => {
    const result = await calcularImportacion(makeSupabase(), {
      ...BASE_PARAMS,
      valor_fob: 1000,
      regimen: null,
    })
    expect(result.regimen_unico).toBeUndefined()
    expect(result.regimenes).toBeDefined()
    expect(result.regimenes.general).toBeDefined()
    expect(result.regimenes.courier).toBeDefined()
    expect(result.regimenes.pef).toBeDefined()
    expect(result.regimenes.correo_upu).toBeDefined()
  })
})
