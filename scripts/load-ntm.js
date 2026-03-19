#!/usr/bin/env node

/**
 * Script para cargar datos de barreras no arancelarias (NTM) desde CSV a Supabase.
 *
 * Uso:
 *   node scripts/load-ntm.js
 *
 * El archivo CSV se espera en: C:\Users\Pablo\trade-ai-data\ntm_argentina_filtrado.csv
 * Variables de entorno requeridas: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse'
import 'dotenv/config'

// ─────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────
const CSV_PATH = path.resolve('C:\\Users\\Pablo\\trade-ai-data\\ntm_argentina_filtrado.csv')
const BATCH_SIZE = 200
const TIMESTAMP_START = Date.now()

// ─────────────────────────────────────────────
// CLIENTES Y VALIDACIÓN
// ─────────────────────────────────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('❌ Error: faltan variables de entorno')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', url ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', key ? '✓' : '✗')
  process.exit(1)
}

if (!fs.existsSync(CSV_PATH)) {
  console.error(`❌ Error: archivo no encontrado: ${CSV_PATH}`)
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─────────────────────────────────────────────
// MAPEO DE COLUMNAS CSV → TABLA
// ─────────────────────────────────────────────
const COLUMN_MAP = {
  'Year': 'year',
  'Reporter': 'reporter',
  'ReporterISON': 'reporter_iso_n',
  'Partner': 'partner',
  'PartnerISON': 'partner_iso_n',
  'HSCode': 'hs_code',
  'ntm_all': 'ntm_all',
  'ntm_nonH': 'ntm_non_h',
  'ntm_H': 'ntm_h',
  'ntm_FullCoverage': 'ntm_full_coverage',
  'ntm_PartialCoverage': 'ntm_partial_coverage',
  'NTMCode': 'ntm_code',
}

function mapearFila(csvRow) {
  const fila = {}

  // Columnas booleanas (0/1)
  const BOOL_COLS = ['ntm_all', 'ntm_non_h', 'ntm_h', 'ntm_full_coverage', 'ntm_partial_coverage']

  for (const [csvCol, dbCol] of Object.entries(COLUMN_MAP)) {
    let valor = csvRow[csvCol]

    // Trimear espacios y manejar valores vacíos
    if (typeof valor === 'string') {
      valor = valor.trim()
      if (valor === '') valor = null
    }

    // Convertir a número entero
    if (['year', 'reporter_iso_n', 'partner_iso_n', ...BOOL_COLS].includes(dbCol)) {
      if (valor == null) {
        fila[dbCol] = BOOL_COLS.includes(dbCol) ? 0 : null
      } else {
        const num = parseInt(valor, 10)
        // Para columnas booleanas, normalizar a 0 o 1
        if (BOOL_COLS.includes(dbCol)) {
          fila[dbCol] = num > 0 ? 1 : 0
        } else {
          fila[dbCol] = num
        }
      }
    } else {
      fila[dbCol] = valor
    }
  }
  return fila
}

// Validar que la fila tenga campos críticos no-null
function esFilaValida(fila) {
  return (
    fila.year != null &&
    fila.reporter != null &&
    fila.partner != null &&
    fila.hs_code != null
  )
}

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL DE CARGA
// ─────────────────────────────────────────────
async function loadNTMData() {
  console.log('\n═══════════════════════════════════════════')
  console.log('  Cargando datos de barreras no arancelarias')
  console.log('═══════════════════════════════════════════\n')

  // Confirmación de truncate
  console.log('⚠️  Advertencia: se truncará la tabla ntm_measures antes de cargar.')
  console.log('   Esto eliminará todos los datos existentes.\n')

  const readline = await import('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question('¿Continuar? (s/n): ', async (answer) => {
      rl.close()

      if (answer.toLowerCase() !== 's') {
        console.log('\n❌ Operación cancelada.\n')
        process.exit(0)
      }

      try {
        // Truncate la tabla
        console.log('\n🗑️  Truncando tabla ntm_measures...')
        const { error: truncateError } = await supabase.rpc('truncate_ntm_measures')

        // Si no hay función RPC, usar DELETE
        if (truncateError) {
          console.log('   (usando DELETE en lugar de TRUNCATE)')
          const { error: deleteError } = await supabase
            .from('ntm_measures')
            .delete()
            .gt('id', 0)

          if (deleteError) {
            throw new Error(`Error borrando datos: ${deleteError.message}`)
          }
        }
        console.log('✓ Tabla truncada.\n')

        // Procesar CSV
        await procesarCSV()
        resolve()
      } catch (err) {
        console.error(`\n❌ Error: ${err.message}\n`)
        process.exit(1)
      }
    })
  })
}

// ─────────────────────────────────────────────
// PROCESAMIENTO STREAMING DEL CSV
// ─────────────────────────────────────────────
async function procesarCSV() {
  let totalFilas = 0
  let filasSkipped = 0
  let batchNum = 0
  let batch = []

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(CSV_PATH, { encoding: 'utf-8' })

    const parser = parse({
      columns: true, // usar primera línea como nombres de columna
      skip_empty_lines: true,
      relax_column_count: true,
      bom: true, // ignorar Byte Order Mark si existe
      trim: true, // trimear todos los valores
    })

    stream.pipe(parser)

    parser.on('data', async (csvRow) => {
      // Pausar el stream mientras procesamos para no acumular llamadas en paralelo
      parser.pause()

      try {
        const fila = mapearFila(csvRow)

        if (!esFilaValida(fila)) {
          filasSkipped++
          parser.resume()
          return
        }

        batch.push(fila)
        totalFilas++

        if (batch.length >= BATCH_SIZE) {
          batchNum++
          await insertarBatch(batch, batchNum, totalFilas)
          batch = []
        }

        parser.resume()
      } catch (err) {
        reject(new Error(`Error procesando fila ${totalFilas + 1}: ${err.message}`))
      }
    })

    parser.on('end', async () => {
      try {
        // Insertar el batch final (si hay filas restantes)
        if (batch.length > 0) {
          batchNum++
          await insertarBatch(batch, batchNum, totalFilas)
        }

        // Resumen final
        const tiempoTranscurrido = Math.round((Date.now() - TIMESTAMP_START) / 1000)
        const minutos = Math.floor(tiempoTranscurrido / 60)
        const segundos = tiempoTranscurrido % 60

        console.log('\n═══════════════════════════════════════════')
        console.log(`✓ Carga completada exitosamente`)
        console.log(`  Total: ${totalFilas.toLocaleString()} filas insertadas`)
        if (filasSkipped > 0) {
          console.log(`  Filas saltadas (incompletas): ${filasSkipped.toLocaleString()}`)
        }
        console.log(`  Tiempo: ${minutos}m ${segundos}s`)
        console.log('═══════════════════════════════════════════\n')

        resolve()
      } catch (err) {
        reject(err)
      }
    })

    parser.on('error', (err) => {
      reject(new Error(`Error parseando CSV: ${err.message}`))
    })
  })
}

// ─────────────────────────────────────────────
// INSERTAR UN BATCH (con reintentos)
// ─────────────────────────────────────────────
async function insertarBatch(filas, batchNum, totalProcesadas, intentos = 3) {
  const inicio = Date.now()

  for (let intento = 1; intento <= intentos; intento++) {
    try {
      const { error } = await supabase.from('ntm_measures').insert(filas)

      if (error) {
        throw new Error(error.message)
      }

      const duracion = Math.round((Date.now() - inicio) / 1000)
      console.log(
        `Batch ${batchNum.toString().padStart(4)}... ✓ ` +
        `(${totalProcesadas.toLocaleString()} filas acumuladas) [${duracion}s]`
      )
      return

    } catch (err) {
      if (intento < intentos) {
        console.warn(`  ⚠️  Batch ${batchNum} intento ${intento} falló (${err.message}) — reintentando en 2s...`)
        await new Promise(r => setTimeout(r, 2000))
      } else {
        throw new Error(`Error insertando batch ${batchNum} tras ${intentos} intentos: ${err.message}`)
      }
    }
  }
}

// ─────────────────────────────────────────────
// EJECUTAR
// ─────────────────────────────────────────────
loadNTMData().catch((err) => {
  console.error(`\n❌ Fallo: ${err.message}\n`)
  process.exit(1)
})
