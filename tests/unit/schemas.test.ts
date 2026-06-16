import { describe, it, expect } from 'vitest'
import {
  normalizarCodigoNCM,
  extraerCodigoNCM,
  formatearResultadosNCM,
  formatearPreferenciaSinNcm,
} from '@/lib/ncm-lookup.js'
import { formatearPreferencias } from '@/lib/preferencias-lookup.js'

// ─────────────────────────────────────────────
// normalizarCodigoNCM
// ─────────────────────────────────────────────
describe('normalizarCodigoNCM', () => {
  it('acepta código completo con puntos (formato nativo)', () => {
    const r = normalizarCodigoNCM('0402.10.10')
    expect(r?.ncmCode).toBe('0402.10.10')
    expect(r?.esParcial).toBe(false)
    expect(r?.esNaladisa).toBe(false)
  })

  it('acepta 8 dígitos sin puntos y los formatea', () => {
    const r = normalizarCodigoNCM('04021010')
    expect(r?.ncmCode).toBe('0402.10.10')
    expect(r?.esParcial).toBe(false)
  })

  it('acepta código NALADISA de 10 dígitos y toma los primeros 8', () => {
    const r = normalizarCodigoNCM('0402101000')
    expect(r?.ncmCode).toBe('0402.10.10')
    expect(r?.esNaladisa).toBe(true)
  })

  it('acepta partida de 4 dígitos (código parcial)', () => {
    const r = normalizarCodigoNCM('0402')
    expect(r?.ncmCode).toBe('0402.00.00')
    expect(r?.esParcial).toBe(true)
  })

  it('acepta capítulo de 2 dígitos (código parcial)', () => {
    const r = normalizarCodigoNCM('04')
    expect(r?.ncmCode).toBe('0400.00.00')
    expect(r?.esParcial).toBe(true)
  })

  it('acepta subpartida de 6 dígitos (código parcial)', () => {
    const r = normalizarCodigoNCM('040210')
    expect(r?.ncmCode).toBe('0402.10.00')
    expect(r?.esParcial).toBe(true)
  })

  it('devuelve null para entrada vacía', () => {
    expect(normalizarCodigoNCM('')).toBeNull()
    expect(normalizarCodigoNCM(null as any)).toBeNull()
  })

  it('devuelve null para capítulo 00 (inválido)', () => {
    expect(normalizarCodigoNCM('00')).toBeNull()
  })

  it('ignora letras y extrae solo dígitos', () => {
    const r = normalizarCodigoNCM('NCM: 0402.10.10')
    expect(r?.ncmCode).toBe('0402.10.10')
  })
})

// ─────────────────────────────────────────────
// extraerCodigoNCM
// ─────────────────────────────────────────────
describe('extraerCodigoNCM', () => {
  it('extrae código NCM con puntos de texto libre', () => {
    const r = extraerCodigoNCM('¿Cuál es el arancel del NCM 0402.10.10?')
    expect(r?.ncmCode).toBe('0402.10.10')
  })

  it('extrae código de 8 dígitos pegado en texto', () => {
    const r = extraerCodigoNCM('consulta sobre el producto 84713000')
    expect(r?.ncmCode).toBe('8471.30.00')
  })

  it('devuelve null cuando no hay código en el texto', () => {
    expect(extraerCodigoNCM('¿Qué documentos necesito para exportar vino?')).toBeNull()
  })

  it('prefiere el match más largo cuando hay varios candidatos', () => {
    const r = extraerCodigoNCM('del capítulo 04 y específicamente el 0402.10.10')
    // Debe tomar 0402.10.10 (más específico) sobre 04 (capítulo)
    expect(r?.ncmCode).toBe('0402.10.10')
  })
})

// ─────────────────────────────────────────────
// formatearResultadosNCM
// ─────────────────────────────────────────────
describe('formatearResultadosNCM', () => {
  const mockFila = {
    ncm_code: '0402.10.10',
    description: 'Leche en polvo, sin azúcar, materia grasa <= 1.5%',
    arancel_extrazona: 14,
    arancel_intrazona: 0,
    derecho_exportacion: null,
    iva_importacion: 21,
    tasa_estadistica: 2.5,
    unidad_medida: 'KGM',
    organismos_imp: 'SENASA',
    organismos_exp: null,
  }

  it('devuelve string vacío para array vacío', () => {
    expect(formatearResultadosNCM([])).toBe('')
    expect(formatearResultadosNCM(null as any)).toBe('')
  })

  it('incluye el código y descripción del NCM', () => {
    const resultado = formatearResultadosNCM([mockFila])
    expect(resultado).toContain('0402.10.10')
    expect(resultado).toContain('Leche en polvo')
  })

  it('incluye los aranceles extrazona e intrazona', () => {
    const resultado = formatearResultadosNCM([mockFila])
    expect(resultado).toContain('14')
    expect(resultado).toContain('0')
  })

  it('incluye el organismo de importación cuando existe', () => {
    const resultado = formatearResultadosNCM([mockFila])
    expect(resultado).toContain('SENASA')
  })

  it('incluye la sección [NCM_DATA] como encabezado', () => {
    const resultado = formatearResultadosNCM([mockFila])
    expect(resultado).toContain('[NCM_DATA]')
  })

  it('incluye la fuente oficial', () => {
    const resultado = formatearResultadosNCM([mockFila])
    expect(resultado).toContain('AFIP')
  })

  it('con opción esNaladisa agrega nota de advertencia', () => {
    const resultado = formatearResultadosNCM([mockFila], { esNaladisa: true })
    expect(resultado).toContain('NALADISA')
    expect(resultado).toContain('despachante')
  })
})

// ─────────────────────────────────────────────
// formatearPreferenciaSinNcm
// ─────────────────────────────────────────────
describe('formatearPreferenciaSinNcm', () => {
  it('incluye el código NALADISA y el acuerdo', () => {
    const resultado = formatearPreferenciaSinNcm({
      ncm_naladisa: '0402101000',
      acuerdo_id: 'ACE-58',
      pais: 'Perú',
      tipo: 'exportacion',
    })
    expect(resultado).toContain('0402101000')
    expect(resultado).toContain('ACE-58')
    expect(resultado).toContain('Perú')
  })

  it('incluye advertencia sobre nomenclatura anterior', () => {
    const resultado = formatearPreferenciaSinNcm({
      ncm_naladisa: '0101210000',
      acuerdo_id: 'ACE-6',
      pais: 'México',
      tipo: 'importacion',
    })
    expect(resultado).toContain('[NALADISA_SIN_DATOS_ARANCEL]')
    expect(resultado).toContain('despachante')
  })
})

// ─────────────────────────────────────────────
// formatearPreferencias
// ─────────────────────────────────────────────
describe('formatearPreferencias', () => {
  it('devuelve mensaje de sin preferencias cuando tiene_preferencias es false', () => {
    const resultado = formatearPreferencias({
      ncm_code: '9999.99.99',
      tiene_preferencias: false,
      preferencias_especificas: [],
      acuerdos_cobertura_total: [],
    })
    expect(resultado).toContain('[PREFERENCIAS_ARANCELARIAS]')
    expect(resultado).toContain('No se encontraron')
  })

  it('devuelve mensaje de sin preferencias para resultado null', () => {
    const resultado = formatearPreferencias(null as any)
    expect(resultado).toContain('No se encontraron')
  })

  it('formatea preferencias específicas por acuerdo', () => {
    const resultado = formatearPreferencias({
      ncm_code: '0402.10.10',
      tiene_preferencias: true,
      preferencias_especificas: [
        {
          acuerdo: 'ACE-58',
          pais: 'Perú',
          tipo: 'importacion',
          descripcion: 'Perú — preferencia 100% bajo ACE-58 (ALADI)',
        },
      ],
      acuerdos_cobertura_total: [],
    })
    expect(resultado).toContain('ACE-58')
    expect(resultado).toContain('Perú')
    expect(resultado).toContain('Preferencias de importación')
  })

  it('formatea acuerdos de cobertura total (TLC)', () => {
    const resultado = formatearPreferencias({
      ncm_code: '0402.10.10',
      tiene_preferencias: true,
      preferencias_especificas: [],
      acuerdos_cobertura_total: [
        {
          acuerdo: 'ACE-35',
          pais: 'Chile',
          tipo: 'ambos',
          descripcion: 'Libre circulación de bienes entre Argentina y Chile (ACE-35).',
        },
      ],
    })
    expect(resultado).toContain('cobertura total')
    expect(resultado).toContain('ACE-35')
    expect(resultado).toContain('Chile')
  })

  it('incluye nota sobre acuerdos no cargados (ACE-36, SGP)', () => {
    const resultado = formatearPreferencias({
      ncm_code: '0402.10.10',
      tiene_preferencias: true,
      preferencias_especificas: [
        { acuerdo: 'ACE-6', pais: 'México', tipo: 'importacion', descripcion: '...' },
      ],
      acuerdos_cobertura_total: [],
    })
    expect(resultado).toContain('ACE-36')
    expect(resultado).toContain('SGP')
  })
})
