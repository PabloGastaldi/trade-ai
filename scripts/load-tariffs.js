'use strict';

// scripts/load-tariffs.js
// Carga aranceles de destino desde Excel a la tabla destination_tariffs en Supabase
// Uso: node scripts/load-tariffs.js

require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// ── Configuración ──────────────────────────────────────────────────────────────

const EXCEL_PATH = 'C:\\Users\\Pablo\\trade-ai-data\\aranceles-destino.xlsx';
const TABLE_NAME = 'destination_tariffs';
const BATCH_SIZE = 500;

// ── Cliente Supabase ──────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parsea el campo AVE (Ad Valorem Equivalent).
 * Ejemplos: "6%", "6.5%", "FREE", "", "varies", "0-12%"
 * Retorna { value: number|null, warned: boolean, raw: string }
 */
function parseAve(raw) {
  if (raw === undefined || raw === null) return { value: 0, warned: false };

  const str = String(raw).trim();

  if (str === '' || str.toUpperCase() === 'FREE' || str === '0') {
    return { value: 0, warned: false };
  }

  // Caso simple: "6%" o "6.5%"
  const simple = str.replace('%', '').trim();
  const num = parseFloat(simple);
  if (!isNaN(num) && simple === String(num) || /^\d+(\.\d+)?$/.test(simple)) {
    return { value: num, warned: false };
  }

  // Caso porcentaje directo sin símbolo: "6" o "6.5"
  if (/^\d+(\.\d+)?$/.test(str)) {
    return { value: parseFloat(str), warned: false };
  }

  // Rango o texto raro → null
  return { value: null, warned: true, raw: str };
}

/**
 * Formatea ProductCode a 6 dígitos con ceros a la izquierda.
 * "1234" → "001234", "123456" → "123456", 1234 → "001234"
 */
function formatHsCode(raw) {
  const str = String(raw).trim().replace(/\D/g, '');
  return str.padStart(6, '0').slice(0, 6);
}

/** Pregunta en consola y espera respuesta */
function askConfirmation(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ── Verificar tabla existente ─────────────────────────────────────────────────

async function tableHasData() {
  const { count, error } = await supabase
    .from(TABLE_NAME)
    .select('*', { count: 'exact', head: true });

  if (error) {
    // Si la tabla no existe, el error lo aclara
    if (error.message.includes('does not exist') || error.code === '42P01') {
      return { exists: false, count: 0 };
    }
    throw new Error(`Error al verificar tabla: ${error.message}`);
  }
  return { exists: true, count: count || 0 };
}

async function truncateTable() {
  // Supabase no expone TRUNCATE via JS client; usamos delete sin filtro
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .neq('id', 0); // equivale a DELETE FROM sin WHERE restrictivo

  if (error) throw new Error(`Error al truncar tabla: ${error.message}`);
}

// ── Carga principal ───────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();

  // Verificar env vars
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Leer Excel
  console.log(`📂 Leyendo ${EXCEL_PATH}...`);
  let workbook;
  try {
    workbook = XLSX.readFile(EXCEL_PATH);
  } catch (err) {
    console.error(`❌ No se pudo leer el archivo Excel: ${err.message}`);
    process.exit(1);
  }

  // La hoja con los datos se llama "Data"; ignorar "Query_Details"
  const sheetName = workbook.SheetNames.includes('Data')
    ? 'Data'
    : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  console.log(`✓ ${rawRows.length} filas encontradas en hoja "${sheetName}"\n`);

  // Verificar si la tabla ya tiene datos
  const { exists, count: existingCount } = await tableHasData();

  if (exists && existingCount > 0) {
    console.log(`⚠️  La tabla "${TABLE_NAME}" ya tiene ${existingCount.toLocaleString()} filas.`);
    const answer = await askConfirmation('¿Truncar la tabla antes de insertar? (s/N): ');
    if (answer === 's' || answer === 'si' || answer === 'sí') {
      process.stdout.write('Truncando tabla...');
      await truncateTable();
      console.log(' ✓\n');
    } else {
      console.log('Operación cancelada. No se modificaron datos.\n');
      process.exit(0);
    }
  }

  // Transformar filas
  const rows = [];
  const aveWarnings = [];

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const rowNum = i + 2; // +2 porque fila 1 es el header en Excel

    const { value: aveValue, warned, raw: aveRaw } = parseAve(r.AVE);

    if (warned) {
      aveWarnings.push({ rowNum, raw: aveRaw });
      console.log(`  ⚠️  Fila ${rowNum}: AVE "${aveRaw}" no es numérico → null`);
    }

    // El Excel guarda AVE como decimal (0.06 = 6%).
    // La app espera porcentaje (6.0 = 6%). Convertimos acá.
    const avePercent = aveValue !== null ? Math.round(aveValue * 10000) / 100 : null;

    rows.push({
      reporting_country:   String(r.ReportingCountry || '').trim(),
      partner_country:     String(r.PartnerCountry || '').trim(),
      year:                Number(r.Year) || null,
      hs_code:             formatHsCode(r.ProductCode),
      product_description: String(r.ProductDescription || '').trim(),
      num_tariff_lines:    Number(r.NoOfTariffLines) || null,
      ave_rate:            avePercent,
      // Revision se ignora intencionalmente
    });
  }

  // Insertar en batches
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
  let totalInserted = 0;

  console.log(`\n📤 Insertando ${rows.length.toLocaleString()} filas en batches de ${BATCH_SIZE}...\n`);

  for (let b = 0; b < totalBatches; b++) {
    const batch = rows.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    process.stdout.write(`  Insertando batch ${b + 1}/${totalBatches}...`);

    const { error } = await supabase
      .from(TABLE_NAME)
      .insert(batch);

    if (error) {
      console.log(` ❌\n  Error en batch ${b + 1}: ${error.message}`);
      console.error('\nAbortando. Las filas insertadas hasta ahora quedaron en la tabla.');
      process.exit(1);
    }

    totalInserted += batch.length;
    console.log(` ✓ (${totalInserted.toLocaleString()} filas)`);
  }

  // Resumen final
  const elapsedSec = Math.round((Date.now() - startTime) / 1000);

  // Conteo por partner_country
  const countryCount = {};
  for (const row of rows) {
    const pais = row.partner_country || '(vacío)';
    countryCount[pais] = (countryCount[pais] || 0) + 1;
  }
  const sortedCountries = Object.entries(countryCount)
    .sort((a, b) => b[1] - a[1]);

  console.log('\n' + '─'.repeat(50));
  console.log(`✓ Total: ${totalInserted.toLocaleString()} filas insertadas en ${TABLE_NAME}`);
  if (aveWarnings.length > 0) {
    console.log(`⚠️  AVE no numérico: ${aveWarnings.length} filas (guardadas con ave_rate = null)`);
  } else {
    console.log(`✓ AVE: todos los valores parseados sin advertencias`);
  }
  console.log(`⏱  Tiempo: ${elapsedSec}s`);
  console.log('\nPor país (partner_country):');
  for (const [pais, cantidad] of sortedCountries) {
    console.log(`  - ${pais}: ${cantidad.toLocaleString()} filas`);
  }
  console.log('─'.repeat(50) + '\n');
}

main().catch((err) => {
  console.error('❌ Error inesperado:', err.message);
  process.exit(1);
});
