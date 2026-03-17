'use strict';

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { Pinecone } = require('@pinecone-database/pinecone');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// ─── Configuración ─────────────────────────────────────────────────────────
const CHUNK_SIZE       = 250;   // palabras por chunk
const CHUNK_OVERLAP    = 30;    // palabras de solapamiento
const MIN_CHUNK_WORDS  = 50;    // descartar chunks menores a esto
const MIN_TEXT_CHARS   = 100;   // PDF escaneado si hay menos chars que esto
const PINECONE_BATCH   = 10;    // chunks por batch al hacer upsert
const BATCH_DELAY_MS   = 1200;  // pausa entre batches para respetar rate limit (250k tokens/min)

const EXCLUDED_FOLDERS = new Set(['ncm', 'mercados-destino']);
const SUPPORTED_EXTS   = new Set(['.pdf', '.txt']);

// ─── Init clientes ──────────────────────────────────────────────────────────
function initClients() {
  const required = [
    'PINECONE_API_KEY',
    'PINECONE_INDEX_NAME',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`❌ Variable de entorno faltante: ${key}`);
      process.exit(1);
    }
  }

  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  return { pinecone, supabase };
}

// ─── Escaneo de archivos ─────────────────────────────────────────────────────
function scanFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    console.error(`❌ No se puede leer la carpeta: ${dir} — ${err.message}`);
    return results;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_FOLDERS.has(entry.name)) continue;
      results.push(...scanFiles(path.join(dir, entry.name)));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTS.has(ext)) {
        results.push(path.join(dir, entry.name));
      }
    }
  }
  return results;
}

// ─── Metadatos desde la ruta ─────────────────────────────────────────────────
function getPathMetadata(filePath, baseDir) {
  const rel = path.relative(baseDir, filePath);
  const parts = rel.split(path.sep);

  const categoria   = parts.length > 1 ? parts[0]               : path.basename(baseDir);
  const tipo        = parts.length > 1 ? parts[parts.length - 2] : path.basename(baseDir);
  const relPathUnix = rel.replace(/\\/g, '/');

  return { tipo, categoria, relPathUnix };
}

// ─── Extracción de texto ─────────────────────────────────────────────────────
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf8').trim();
  }

  if (ext === '.pdf') {
    const buffer  = fs.readFileSync(filePath);
    const pdfData = await pdfParse(buffer);
    return (pdfData.text || '').trim();
  }

  throw new Error(`Formato no soportado: ${ext}`);
}

// ─── Slugify para IDs de Pinecone (solo ASCII) ───────────────────────────────
function slugify(str) {
  return str
    .normalize('NFD')                     // descompone ó → o + acento
    .replace(/[\u0300-\u036f]/g, '')      // elimina diacríticos
    .replace(/[^a-zA-Z0-9._-]/g, '_')    // reemplaza todo lo no-ASCII con _
    .replace(/_+/g, '_')                  // colapsa múltiples guiones bajos
    .replace(/^_|_$/g, '');              // trim guiones bajos extremos
}

// ─── Chunking ────────────────────────────────────────────────────────────────
function splitIntoChunks(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const step  = CHUNK_SIZE - CHUNK_OVERLAP;
  const chunks = [];

  for (let i = 0; i < words.length; i += step) {
    const slice = words.slice(i, i + CHUNK_SIZE);
    if (slice.length < MIN_CHUNK_WORDS) continue;
    chunks.push(slice.join(' '));
  }
  return chunks;
}

// ─── Supabase ────────────────────────────────────────────────────────────────
async function getExistingFiles(supabase) {
  const { data, error } = await supabase
    .from('documents_registry')
    .select('archivo_nombre');

  if (error) throw new Error(`Supabase select falló: ${error.message}`);
  return new Set(data.map(r => r.archivo_nombre));
}

async function registerFile(supabase, registro) {
  const { error } = await supabase.from('documents_registry').insert(registro);
  if (error) throw new Error(`Supabase insert falló: ${error.message}`);
}

// ─── Pinecone ────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function upsertBatches(index, records) {
  for (let i = 0; i < records.length; i += PINECONE_BATCH) {
    const batch = records.slice(i, i + PINECONE_BATCH);
    await index.upsertRecords({ records: batch });
    if (i + PINECONE_BATCH < records.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const targetDir = process.argv[2];

  if (!targetDir) {
    console.error('Uso: node scripts/ingest.js <ruta-a-carpeta>');
    console.error('Ejemplos:');
    console.error('  node scripts/ingest.js C:\\Users\\Pablo\\trade-ai-data');
    console.error('  node scripts/ingest.js C:\\Users\\Pablo\\trade-ai-data\\bcra');
    process.exit(1);
  }

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Carpeta no encontrada: ${targetDir}`);
    process.exit(1);
  }

  const { pinecone, supabase } = initClients();
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

  // ── Escanear ───────────────────────────────────────────────────────────────
  process.stdout.write('Escaneando carpetas...');
  const allFiles = scanFiles(targetDir);
  const carpetasUnicas = new Set(allFiles.map(f => path.dirname(f))).size;
  const totalPDF = allFiles.filter(f => f.toLowerCase().endsWith('.pdf')).length;
  const totalTXT = allFiles.filter(f => f.toLowerCase().endsWith('.txt')).length;
  console.log(` encontrados ${allFiles.length} archivos (${totalPDF} PDFs, ${totalTXT} TXTs) en ${carpetasUnicas} carpetas\n`);

  if (allFiles.length === 0) {
    console.log('No se encontraron archivos. Verificá la ruta y las exclusiones.');
    return;
  }

  // ── Archivos ya procesados ─────────────────────────────────────────────────
  let existingFiles;
  try {
    existingFiles = await getExistingFiles(supabase);
  } catch (err) {
    console.error(`❌ Error al consultar Supabase: ${err.message}`);
    process.exit(1);
  }

  // ── Estadísticas ───────────────────────────────────────────────────────────
  const stats = {
    procesados:   0,
    totalChunks:  0,
    salteados:    0,
    escaneados:   0,
    errores:      0,
    porCategoria: {},
  };

  function addCategoria(categoria, chunks) {
    if (!stats.porCategoria[categoria]) {
      stats.porCategoria[categoria] = { archivos: 0, chunks: 0 };
    }
    stats.porCategoria[categoria].archivos++;
    stats.porCategoria[categoria].chunks += chunks;
  }

  // ── Procesar cada archivo ──────────────────────────────────────────────────
  for (let i = 0; i < allFiles.length; i++) {
    const filePath      = allFiles[i];
    const fileName      = path.basename(filePath);
    const fileNameNoExt = path.basename(filePath, path.extname(filePath));
    const prefix        = `[${i + 1}/${allFiles.length}]`;
    const { tipo, categoria, relPathUnix } = getPathMetadata(filePath, targetDir);

    // ── Ya existe ────────────────────────────────────────────────────────────
    if (existingFiles.has(fileName)) {
      console.log(`⏩ ${prefix}: ${relPathUnix} → ya existe, salteado`);
      stats.salteados++;
      continue;
    }

    process.stdout.write(`Procesando ${prefix}: ${relPathUnix} → `);

    try {
      // ── Extraer texto ──────────────────────────────────────────────────────
      const text = await extractText(filePath);

      // Solo PDFs pueden ser "escaneados" (los TXT siempre tienen texto)
      const esPDF = fileName.toLowerCase().endsWith('.pdf');
      if (esPDF && text.length < MIN_TEXT_CHARS) {
        console.log(
          `\n⚠️ ${prefix}: ${fileName} parece ser un PDF escaneado — ` +
          'texto insuficiente para ingestar. Requiere OCR manual.'
        );
        stats.escaneados++;
        await registerFile(supabase, {
          archivo_nombre: fileName,
          archivo_path:   relPathUnix,
          tipo,
          categoria,
          chunks_count:   0,
          fecha_ingesta:  new Date().toISOString(),
        });
        continue;
      }

      // ── Chunking ───────────────────────────────────────────────────────────
      const chunks = splitIntoChunks(text);

      if (chunks.length === 0) {
        console.log('0 chunks útiles, salteado');
        stats.escaneados++;
        continue;
      }

      // ── Pinecone upsert ────────────────────────────────────────────────────
      const fechaIngesta = new Date().toISOString();

      const records = chunks.map((chunkContent, idx) => ({
        id:            `${slugify(tipo)}--${slugify(fileNameNoExt)}--chunk-${idx}`,
        text:          chunkContent,   // Pinecone embebe este campo con llama-text-embed-v2
        fuente:        fileNameNoExt,
        tipo,
        categoria,
        chunk_index:   idx,
        fecha_ingesta: fechaIngesta,
      }));

      await upsertBatches(index, records);

      // ── Supabase registro ──────────────────────────────────────────────────
      await registerFile(supabase, {
        archivo_nombre: fileName,
        archivo_path:   relPathUnix,
        tipo,
        categoria,
        chunks_count:   chunks.length,
        fecha_ingesta:  fechaIngesta,
      });

      console.log(`${chunks.length} chunks → ✓`);
      stats.procesados++;
      stats.totalChunks += chunks.length;
      addCategoria(categoria, chunks.length);

    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      stats.errores++;
      try {
        await registerFile(supabase, {
          archivo_nombre: fileName,
          archivo_path:   relPathUnix,
          tipo,
          categoria,
          chunks_count:   0,
          fecha_ingesta:  new Date().toISOString(),
        });
      } catch (_) { /* ignorar error secundario */ }
    }
  }

  // ── Resumen final ──────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(55));
  console.log(`✓  Procesados:               ${stats.procesados} archivos, ${stats.totalChunks} chunks`);
  console.log(`⏩  Salteados (ya existían):  ${stats.salteados}`);
  console.log(`⚠️  Escaneados (req. OCR):    ${stats.escaneados}`);
  console.log(`✗  Errores:                  ${stats.errores}`);

  const categorias = Object.entries(stats.porCategoria);
  if (categorias.length > 0) {
    console.log('\nPor categoría:');
    for (const [cat, data] of categorias.sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`  - ${cat}: ${data.archivos} archivos, ${data.chunks} chunks`);
    }
  }
}

main().catch(err => {
  console.error('\n❌ Error fatal:', err.message);
  process.exit(1);
});
