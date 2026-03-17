import { describe, it, expect } from 'vitest'
import { sanitizarPregunta } from '@/lib/utils/sanitize.js'

describe('sanitizarPregunta', () => {
  it('elimina tags HTML completos (XSS)', () => {
    expect(sanitizarPregunta('<script>alert(1)</script>')).toBe('alert(1)')
  })

  it('elimina caracteres < y > sueltos', () => {
    // <b> es eliminado como tag; > suelto también; espacios normalizados a uno
    expect(sanitizarPregunta('texto <b> y >otro')).toBe('texto y otro')
  })

  it('elimina comentario SQL -- hasta fin de línea', () => {
    // -- inicia un comentario SQL que va hasta fin de línea — se elimina todo
    expect(sanitizarPregunta('texto -- DROP TABLE ncm')).toBe('texto')
  })

  it('elimina comentario SQL /* ... */', () => {
    expect(sanitizarPregunta('SELECT * /* comentario */ FROM ncm')).toBe('SELECT * FROM ncm')
  })

  it('elimina punto y coma ; (SQL injection separador)', () => {
    expect(sanitizarPregunta('SELECT * FROM ncm; DROP TABLE users')).toBe('SELECT * FROM ncm DROP TABLE users')
  })

  it('reemplaza null bytes por espacio', () => {
    expect(sanitizarPregunta('texto\0malicioso')).toBe('texto malicioso')
  })

  it('elimina caracteres de control ASCII', () => {
    expect(sanitizarPregunta('texto\x01\x1Fmalicioso')).toBe('texto malicioso')
  })

  it('hace trim de espacios al inicio y fin', () => {
    expect(sanitizarPregunta('  ¿Cuál es el arancel del vino?  ')).toBe('¿Cuál es el arancel del vino?')
  })

  it('normaliza espacios múltiples a uno solo', () => {
    expect(sanitizarPregunta('texto   con    muchos   espacios')).toBe('texto con muchos espacios')
  })

  it('no modifica texto limpio de una consulta normal', () => {
    const pregunta = '¿Cuál es el arancel para importar maquinaria agrícola desde Brasil?'
    expect(sanitizarPregunta(pregunta)).toBe(pregunta)
  })

  it('no modifica signos de interrogación ni acentos del español', () => {
    expect(sanitizarPregunta('¿Qué requisitos tiene el NCM 0402.10.10?')).toBe('¿Qué requisitos tiene el NCM 0402.10.10?')
  })

  it('maneja combinación de múltiples caracteres peligrosos', () => {
    // <b>bold</b> → tags eliminados → "bold"
    // ; eliminado
    // " -- inyección" → comentario SQL eliminado hasta fin de línea
    expect(sanitizarPregunta('  <b>bold</b>; texto -- inyección  ')).toBe('bold texto')
  })

  it('devuelve string vacío si solo había espacios y caracteres eliminados', () => {
    expect(sanitizarPregunta('   ;   ')).toBe('')
  })
})
