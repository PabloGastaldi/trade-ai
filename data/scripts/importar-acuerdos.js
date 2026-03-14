/**
 * importar-acuerdos.js
 *
 * Importa el archivo acuerdos_estructurados.xlsx a la tabla
 * preferencias_arancelarias en Supabase.
 *
 * Uso:
 *   node data/scripts/importar-acuerdos.js
 *
 * Requiere: npm install xlsx
 * Ya instalado: @supabase/supabase-js
 */

'use strict'

const path = require('path')
const fs   = require('fs')
const XLSX = require('xlsx')
const { createClient } = require('@supabase/supabase-js')

// ─────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────

const EXCEL_PATH = 'C:\\Users\\Pablo\\trade-ai-data\\2-acuerdos\\acuerdos_estructurados.xlsx'
const HOJA       = 'Consolidado'
const BATCH_SIZE = 1000   // filas por INSERT
const LOG_PROGRESO = 5000 // mostrar progreso cada N filas

// Directorio de logs (relativo a la raíz del proyecto)
const LOG_DIR  = path.join(__dirname, '..', 'logs')
const LOG_FILE = path.join(LOG_DIR, 'ncm_sin_match_acuerdos.json')

// ─────────────────────────────────────────────────────────────
// CARGAR VARIABLES DE ENTORNO DESDE .env.local
// ─────────────────────────────────────────────────────────────

function cargarEnvLocal() {
  const envPath = path.join(__dirname, '..', '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    throw new Error(`No se encontró .env.local en: ${envPath}`)
  }
  const contenido = fs.readFileSync(envPath, 'utf8')
  for (const linea of contenido.split('\n')) {
    const limpia = linea.trim()
    if (!limpia || limpia.startsWith('#')) continue
    const [clave, ...resto] = limpia.split('=')
    if (clave && resto.length > 0) {
      process.env[clave.trim()] = resto.join('=').trim()
    }
  }
}

cargarEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────
// CLIENTE SUPABASE (service_role para bypasear RLS)
// ─────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─────────────────────────────────────────────────────────────
// CONVERSIÓN NALADISA → ncm_code
//
// NALADISA tiene 10 dígitos sin puntos: "0402101000"
// La tabla ncm usa 8 dígitos con puntos: "0402.10.10"
//
// Regla: tomar los primeros 8 dígitos del NALADISA
//        y formatear como XXXX.XX.XX
//
// Ejemplos:
//   "0402101000" → "0402.10.10"
//   "0101212000" → "0101.21.20"
//   "0102291100" → "0102.29.11"
//   "4202110000" → "4202.11.00"
// ─────────────────────────────────────────────────────────────

function naladisaANcmCode(naladisa) {
  // Normalizar: eliminar puntos u otros chars, asegurar string
  const digits = String(naladisa).replace(/\D/g, '').padStart(10, '0')
  const ocho   = digits.slice(0, 8)
  return `${ocho.slice(0, 4)}.${ocho.slice(4, 6)}.${ocho.slice(6, 8)}`
}

// ─────────────────────────────────────────────────────────────
// CARGAR ncm_codes VÁLIDOS DESDE SUPABASE
//
// Carga todos los ncm_code de la tabla ncm en un Set para
// validación rápida O(1) sin hacer una query por cada fila.
// ─────────────────────────────────────────────────────────────

async function cargarNcmCodesValidos() {
  console.log('📥 Cargando ncm_codes válidos desde Supabase...')

  const todosLosCodigos = new Set()
  let desde = 0
  const PAGINA = 1000 // límite máximo de Supabase PostgREST por request

  while (true) {
    const { data, error } = await supabase
      .from('ncm')
      .select('ncm_code')
      .range(desde, desde + PAGINA - 1)

    if (error) throw new Error(`Error cargando ncm: ${error.message}`)
    if (!data || data.length === 0) break

    for (const fila of data) {
      todosLosCodigos.add(fila.ncm_code)
    }

    // Si devolvió menos que PAGINA, llegamos al final
    if (data.length < PAGINA) break
    desde += PAGINA
  }

  console.log(`✅ ${todosLosCodigos.size} ncm_codes cargados en memoria para validación\n`)
  return todosLosCodigos
}

// ─────────────────────────────────────────────────────────────
// INSERTAR BATCH EN SUPABASE
//
// Usa upsert con ignoreDuplicates para respetar el UNIQUE
// constraint sin fallar en duplicados.
// ─────────────────────────────────────────────────────────────

async function insertarBatch(filas) {
  const { error, count } = await supabase
    .from('preferencias_arancelarias')
    .upsert(filas, {
      onConflict: 'ncm_naladisa,acuerdo_id,pais,tipo',
      ignoreDuplicates: true,
      count: 'exact',
    })

  if (error) throw new Error(`Error al insertar batch: ${error.message}`)

  // count puede ser null con ignoreDuplicates — lo calculamos al final
  return count ?? filas.length
}

// ─────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  Importador de Acuerdos Comerciales → Supabase    ')
  console.log('═══════════════════════════════════════════════════\n')

  // ── 1. Leer Excel ─────────────────────────────────────────
  console.log(`📂 Leyendo Excel: ${EXCEL_PATH}`)
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`❌ No se encontró el archivo: ${EXCEL_PATH}`)
    process.exit(1)
  }

  const workbook = XLSX.readFile(EXCEL_PATH)

  if (!workbook.SheetNames.includes(HOJA)) {
    console.error(`❌ No existe la hoja "${HOJA}". Hojas disponibles: ${workbook.SheetNames.join(', ')}`)
    process.exit(1)
  }

  const sheet  = workbook.Sheets[HOJA]
  const filas  = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true })

  // La primera fila es el encabezado
  const encabezado  = filas[0]
  const datos       = filas.slice(1).filter(f => f.length > 0)
  const totalFilas  = datos.length

  console.log(`✅ Hoja "${HOJA}" leída: ${totalFilas.toLocaleString()} filas de datos`)
  console.log(`   Columnas: ${encabezado.join(' | ')}\n`)

  // ── 2. Cargar NCMs válidos para validación ────────────────
  const ncmCodesValidos = await cargarNcmCodesValidos()

  // ── 3. Procesar filas ─────────────────────────────────────
  const stats = {
    procesadas:   0,
    insertadas:   0,
    duplicadas:   0,
    sinMatch:     0,
    porAcuerdo:   {},  // { "ACE-58 | Perú": { procesadas, sinMatch } }
  }
  const sinMatchLog = []  // NCMs que no matchearon en la tabla ncm
  let batch = []

  for (const fila of datos) {
    // Columnas del Excel (índice base 0):
    //   0: NCM/Naladisa  1: Acuerdo  2: País  3: Tipo  4: ¿Tiene Preferencia?
    const naladisaRaw = fila[0]
    const acuerdoId   = String(fila[1] ?? '').trim()
    const pais        = String(fila[2] ?? '').trim()
    const tipoRaw     = String(fila[3] ?? '').trim().toLowerCase()

    // Normalizar tipo a valores esperados
    const tipo = tipoRaw.startsWith('export') ? 'exportacion'
               : tipoRaw.startsWith('import') ? 'importacion'
               : tipoRaw

    if (!naladisaRaw || !acuerdoId || !pais || !tipo) {
      // Fila vacía o incompleta — saltar
      continue
    }

    // Normalizar NALADISA: asegurar string de 10 dígitos con ceros a la izquierda
    const ncmNaladisa = String(naladisaRaw).replace(/\D/g, '').padStart(10, '0')
    const ncmCode     = naladisaANcmCode(ncmNaladisa)

    // Clave para el desglose por acuerdo/país
    const claveAcuerdo = `${acuerdoId} | ${pais}`
    if (!stats.porAcuerdo[claveAcuerdo]) {
      stats.porAcuerdo[claveAcuerdo] = { procesadas: 0, sinMatch: 0 }
    }
    stats.porAcuerdo[claveAcuerdo].procesadas++
    stats.procesadas++

    // Validar que ncm_code existe en la tabla ncm
    const matchea = ncmCodesValidos.has(ncmCode)

    if (!matchea) {
      stats.sinMatch++
      stats.porAcuerdo[claveAcuerdo].sinMatch++
      sinMatchLog.push({ ncmNaladisa, ncmCode, acuerdoId, pais, tipo })
      // Igual se inserta — solo se loguea el no-match
    }

    batch.push({
      ncm_code:          ncmCode,
      ncm_naladisa:      ncmNaladisa,
      acuerdo_id:        acuerdoId,
      pais:              pais,
      tipo:              tipo,
      tiene_preferencia: true,
    })

    // Insertar cuando el batch llega al tamaño definido
    if (batch.length >= BATCH_SIZE) {
      await insertarBatch(batch)
      stats.insertadas += batch.length
      batch = []
    }

    // Progreso
    if (stats.procesadas % LOG_PROGRESO === 0) {
      const pct = ((stats.procesadas / totalFilas) * 100).toFixed(1)
      console.log(`[${stats.procesadas.toLocaleString()}/${totalFilas.toLocaleString()}] ${pct}% — último: ${acuerdoId} | ${pais}`)
    }
  }

  // Insertar el último batch (filas restantes)
  if (batch.length > 0) {
    await insertarBatch(batch)
    stats.insertadas += batch.length
  }

  // Las duplicadas son la diferencia entre procesadas e insertadas
  // (aproximado — upsert con ignoreDuplicates no devuelve conteo exacto de ignorados)
  stats.duplicadas = stats.procesadas - stats.insertadas

  // ── 4. Guardar log de sin-match ───────────────────────────
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
  fs.writeFileSync(LOG_FILE, JSON.stringify({
    generado:    new Date().toISOString(),
    totalSinMatch: sinMatchLog.length,
    registros:   sinMatchLog,
  }, null, 2), 'utf8')

  // ── 5. Resumen final ──────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════')
  console.log('  RESUMEN DE IMPORTACIÓN')
  console.log('═══════════════════════════════════════════════════')
  console.log(`  Filas procesadas:       ${stats.procesadas.toLocaleString()}`)
  console.log(`  Insertadas:             ${stats.insertadas.toLocaleString()}`)
  console.log(`  Duplicadas/ignoradas:   ${stats.duplicadas.toLocaleString()}`)
  console.log(`  NCMs sin match en ncm:  ${stats.sinMatch.toLocaleString()}`)

  console.log('\n  Desglose por acuerdo y país:')
  for (const [clave, s] of Object.entries(stats.porAcuerdo).sort()) {
    const sinMatchStr = s.sinMatch > 0 ? ` (⚠️  ${s.sinMatch} sin match)` : ''
    console.log(`    ${clave.padEnd(35)} ${s.procesadas.toLocaleString().padStart(6)} filas${sinMatchStr}`)
  }

  if (sinMatchLog.length > 0) {
    console.log(`\n  Primeros 20 NCMs sin match (guardados en ${LOG_FILE}):`)
    for (const r of sinMatchLog.slice(0, 20)) {
      console.log(`    NALADISA ${r.ncmNaladisa} → ${r.ncmCode}  [${r.acuerdoId} | ${r.pais} | ${r.tipo}]`)
    }
  }

  console.log(`\n  📄 Log completo: ${LOG_FILE}`)
  console.log('═══════════════════════════════════════════════════\n')
}

// ─────────────────────────────────────────────────────────────
// EJECUCIÓN
// ─────────────────────────────────────────────────────────────

main().catch(err => {
  console.error('\n❌ Error fatal:', err.message)
  process.exit(1)
})
