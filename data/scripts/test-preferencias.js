/**
 * test-preferencias.js
 *
 * Prueba end-to-end de la búsqueda NCM + preferencias arancelarias.
 * Replica la lógica de lib/ncm-lookup.js y lib/preferencias-lookup.js.
 *
 * Uso: node data/scripts/test-preferencias.js
 */

'use strict'

const path = require('path')
const fs   = require('fs')
const { createClient } = require('@supabase/supabase-js')

// ── Cargar .env.local ────────────────────────────────────────
const envPath = path.join(__dirname, '..', '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
for (const line of envContent.split('\n')) {
  const clean = line.trim()
  if (!clean || clean.startsWith('#')) continue
  const [key, ...rest] = clean.split('=')
  if (key) process.env[key.trim()] = rest.join('=').trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

// ─────────────────────────────────────────────────────────────
// HELPERS (réplica de lib/ncm-lookup.js y preferencias-lookup.js)
// ─────────────────────────────────────────────────────────────

function naladisaANcmCode(entrada) {
  const digits = String(entrada).replace(/[.\s]/g, '').replace(/\D/g, '')
  if (digits.length < 2) return null
  const capitulo = parseInt(digits.slice(0, 2), 10)
  if (capitulo < 1 || capitulo > 99) return null
  const ocho = digits.slice(0, 8).padEnd(8, '0')
  return `${ocho.slice(0,4)}.${ocho.slice(4,6)}.${ocho.slice(6,8)}`
}

async function buscarNcmPorCodigo(ncmCode) {
  const { data, error } = await supabase
    .from('ncm')
    .select('*')
    .eq('ncm_code', ncmCode)
    .limit(1)
  if (error) throw error
  return data ?? []
}

async function buscarNcmPorTexto(texto) {
  // Intentar FTS primero
  const { data: dataFTS, error: errorFTS } = await supabase
    .from('ncm')
    .select('*')
    .textSearch('description', texto, { type: 'websearch', config: 'spanish' })
    .limit(3)

  if (!errorFTS && dataFTS && dataFTS.length > 0) return dataFTS

  // Fallback: ILIKE con la palabra más larga
  const termino = texto.split(/\s+/).sort((a, b) => b.length - a.length)[0]
  const { data, error } = await supabase
    .from('ncm')
    .select('*')
    .ilike('description', `%${termino}%`)
    .limit(3)
  if (error) throw error
  return data ?? []
}

async function buscarPreferencias(ncmCode) {
  const [{ data: especificas, error: e1 }, { data: tlc, error: e2 }] = await Promise.all([
    supabase
      .from('preferencias_arancelarias')
      .select('acuerdo_id, pais, tipo')
      .eq('ncm_code', ncmCode)
      .order('acuerdo_id').order('pais'),
    supabase
      .from('acuerdos_generales')
      .select('acuerdo_id, pais, tipo, notas')
      .order('acuerdo_id').order('pais'),
  ])
  if (e1) throw e1
  if (e2) throw e2
  return {
    ncm_code: ncmCode,
    tiene_preferencias: (especificas?.length > 0) || (tlc?.length > 0),
    preferencias_especificas: especificas ?? [],
    acuerdos_cobertura_total: tlc ?? [],
  }
}

// ─────────────────────────────────────────────────────────────
// FORMATEADOR — como lo vería el usuario final
// ─────────────────────────────────────────────────────────────

function mostrarNcm(ncm) {
  if (!ncm) return '  (no encontrado)'
  return [
    `  NCM:               ${ncm.ncm_code}`,
    `  Descripción:       ${ncm.description}`,
    `  Arancel extrazona: ${ncm.arancel_extrazona ?? '-'}%`,
    `  Arancel intrazona: ${ncm.arancel_intrazona ?? '-'}%`,
    `  Der. exportación:  ${ncm.derecho_exportacion ?? '-'}%`,
    `  IVA importación:   ${ncm.iva_importacion ?? '-'}%`,
    `  Tasa estadística:  ${ncm.tasa_estadistica ?? '-'}%`,
    ncm.organismos_imp ? `  Organismos imp.:   ${ncm.organismos_imp}` : null,
  ].filter(Boolean).join('\n')
}

function mostrarPreferencias(pref) {
  const lineas = []

  if (!pref.tiene_preferencias) {
    lineas.push('  No se encontraron preferencias en los acuerdos registrados.')
    lineas.push('  (ACE-36 Bolivia, SGP UE/USA/Japón y otros no están cargados aún.)')
    return lineas.join('\n')
  }

  // Preferencias específicas agrupadas por dirección
  const importacion = pref.preferencias_especificas.filter(p => p.tipo === 'importacion')
  const exportacion = pref.preferencias_especificas.filter(p => p.tipo === 'exportacion')

  if (importacion.length > 0) {
    lineas.push('  Para importar desde:')
    for (const p of importacion) {
      lineas.push(`    • ${p.pais} — ${p.pais} otorga preferencia a Argentina (${p.acuerdo_id})`)
    }
  }

  if (exportacion.length > 0) {
    lineas.push('  Para exportar hacia:')
    for (const p of exportacion) {
      lineas.push(`    • ${p.pais} — Argentina otorga preferencia a ${p.pais} (${p.acuerdo_id})`)
    }
  }

  if (pref.acuerdos_cobertura_total.length > 0) {
    lineas.push('  Acuerdos de libre comercio (cobertura total — todos los productos):')
    for (const t of pref.acuerdos_cobertura_total) {
      lineas.push(`    • ${t.acuerdo_id} con ${t.pais}: ${t.notas}`)
    }
  }

  lineas.push('')
  lineas.push('  Nota: base cubre ACE-6, ACE-13, ACE-35, ACE-58, ACE-59 y MERCOSUR-India.')
  lineas.push('  Otros acuerdos en proceso de incorporación.')

  return lineas.join('\n')
}

function separador(titulo) {
  console.log('\n' + '═'.repeat(60))
  console.log(`  ${titulo}`)
  console.log('═'.repeat(60))
}

// ─────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('trade.ai — Test de NCM + Preferencias Arancelarias\n')

  // ── TEST 1: NCM "04021010" → "0402.10.10" (leche en polvo) ──
  separador('TEST 1 — NCM 04021010 (leche en polvo)')
  {
    const ncmCode = naladisaANcmCode('04021010')
    console.log(`  Código normalizado: ${ncmCode}`)

    const [ncms, pref] = await Promise.all([
      buscarNcmPorCodigo(ncmCode),
      buscarPreferencias(ncmCode),
    ])

    console.log('\n  [Datos del NCM]')
    console.log(mostrarNcm(ncms[0] ?? null))
    console.log('\n  [Preferencias arancelarias]')
    console.log(mostrarPreferencias(pref))
  }

  // ── TEST 2: NCM "84713010" → "8471.30.10" (notebooks) ──────
  separador('TEST 2 — NCM 84713010 (notebooks/laptops)')
  {
    const ncmCode = naladisaANcmCode('84713010')
    console.log(`  Código normalizado: ${ncmCode}`)

    const [ncms, pref] = await Promise.all([
      buscarNcmPorCodigo(ncmCode),
      buscarPreferencias(ncmCode),
    ])

    console.log('\n  [Datos del NCM]')
    console.log(mostrarNcm(ncms[0] ?? null))
    console.log('\n  [Preferencias arancelarias]')
    console.log(mostrarPreferencias(pref))
  }

  // ── TEST 3: NCM con baja probabilidad de preferencias ───────
  separador('TEST 3 — NCM 99030000 (mercadería de correos — bajo probabilidad de preferencias)')
  {
    const ncmCode = naladisaANcmCode('99030000')
    console.log(`  Código normalizado: ${ncmCode}`)

    const [ncms, pref] = await Promise.all([
      buscarNcmPorCodigo(ncmCode),
      buscarPreferencias(ncmCode),
    ])

    console.log('\n  [Datos del NCM]')
    console.log(mostrarNcm(ncms[0] ?? null))
    console.log('\n  [Preferencias arancelarias]')
    console.log(mostrarPreferencias(pref))
  }

  // ── TEST 4: Búsqueda por texto "aceite de oliva" ─────────────
  separador('TEST 4 — Búsqueda por texto: "aceite de oliva"')
  {
    console.log('  Buscando en tabla ncm...\n')
    const ncms = await buscarNcmPorTexto('aceite de oliva')

    if (ncms.length === 0) {
      console.log('  No se encontraron NCMs para "aceite de oliva"')
    } else {
      console.log(`  Se encontraron ${ncms.length} resultado(s). Usando el primero:`)
      console.log('\n  [Datos del NCM]')
      console.log(mostrarNcm(ncms[0]))

      const pref = await buscarPreferencias(ncms[0].ncm_code)
      console.log('\n  [Preferencias arancelarias]')
      console.log(mostrarPreferencias(pref))

      if (ncms.length > 1) {
        console.log('\n  Otros resultados encontrados:')
        for (const n of ncms.slice(1)) {
          console.log(`    • ${n.ncm_code}: ${n.description}`)
        }
      }
    }
  }

  console.log('\n' + '═'.repeat(60))
  console.log('  Tests completados.')
  console.log('═'.repeat(60) + '\n')
}

main().catch(err => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
