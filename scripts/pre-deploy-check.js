#!/usr/bin/env node
/**
 * pre-deploy-check.js
 * Verifica que el proyecto esté listo para deploy en Vercel.
 * Uso: node scripts/pre-deploy-check.js
 * También ejecutable como: npm run pre-deploy
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

let errores = 0
let advertencias = 0

function ok(msg)    { console.log(`  ✅  ${msg}`) }
function warn(msg)  { console.warn(`  ⚠️   ${msg}`); advertencias++ }
function fail(msg)  { console.error(`  ❌  ${msg}`); errores++ }
function titulo(msg){ console.log(`\n─── ${msg} ───`) }

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────

function leerArchivo(ruta) {
  try { return readFileSync(ruta, 'utf8') } catch { return null }
}

/**
 * Recorre recursivamente un directorio y devuelve todos los archivos .js/.ts/.jsx/.tsx
 * Excluye node_modules, .next, dist, .git, scripts
 */
function archivosCodigo(dir, lista = []) {
  const EXCLUIR = ['node_modules', '.next', 'dist', '.git', 'scripts', '.claude']
  let entradas
  try { entradas = readdirSync(dir) } catch { return lista }

  for (const entrada of entradas) {
    if (EXCLUIR.includes(entrada)) continue
    const ruta = join(dir, entrada)
    const stat = statSync(ruta)
    if (stat.isDirectory()) {
      archivosCodigo(ruta, lista)
    } else if (/\.(js|ts|jsx|tsx|mjs)$/.test(entrada)) {
      lista.push(ruta)
    }
  }
  return lista
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Variables de entorno requeridas en producción
// ─────────────────────────────────────────────────────────────────────────────
titulo('1. Variables de entorno requeridas')

const ENV_REQUERIDAS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'PINECONE_API_KEY',
  'PINECONE_INDEX_NAME',
  'MERCADOPAGO_ACCESS_TOKEN',
  'MP_WEBHOOK_SECRET',
  'NEXT_PUBLIC_SITE_URL',
]

// En CI/Vercel las variables vienen del entorno del proceso
// En local, las leemos del .env.local para verificar que estén definidas
const envLocal = leerArchivo(join(ROOT, '.env.local')) || ''
const envDefinidas = new Set()

// Parsear .env.local
for (const linea of envLocal.split('\n')) {
  const match = linea.match(/^([A-Z_][A-Z0-9_]*)=/)
  if (match) envDefinidas.add(match[1])
}

// También revisar process.env (útil en CI)
for (const key of Object.keys(process.env)) envDefinidas.add(key)

for (const variable of ENV_REQUERIDAS) {
  if (envDefinidas.has(variable)) {
    ok(variable)
  } else {
    fail(`${variable} — no encontrada en .env.local ni en process.env`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. API keys hardcodeadas en el código
// ─────────────────────────────────────────────────────────────────────────────
titulo('2. Credenciales hardcodeadas')

const PATRONES_SECRETOS = [
  // Anthropic
  { regex: /sk-ant-[a-zA-Z0-9\-_]{20,}/,        nombre: 'Anthropic API key' },
  // Supabase service role (JWT)
  { regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, nombre: 'JWT token hardcodeado' },
  // Pinecone
  { regex: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/, nombre: 'UUID (posible API key)' },
  // MercadoPago access token
  { regex: /APP_USR-[a-zA-Z0-9\-_]{40,}/,        nombre: 'MercadoPago access token' },
  // Claves genéricas literales (no process.env)
  { regex: /(?<![.A-Z_])(password|secret|api_key|apikey)\s*=\s*['"][^'"]{8,}['"]/i, nombre: 'Credencial literal asignada' },
]

const archivos = archivosCodigo(ROOT)
let credencialesOk = true

for (const archivo of archivos) {
  const contenido = leerArchivo(archivo)
  if (!contenido) continue

  // Ignorar archivos de test y scripts de ingesta
  const rel = relative(ROOT, archivo)
  if (rel.startsWith('tests') || rel.startsWith('scripts')) continue

  for (const patron of PATRONES_SECRETOS) {
    if (patron.regex.test(contenido)) {
      fail(`${rel} — posible ${patron.nombre} detectado`)
      credencialesOk = false
    }
  }
}

if (credencialesOk) ok('No se encontraron credenciales hardcodeadas')

// ─────────────────────────────────────────────────────────────────────────────
// 3. console.log con datos de usuario
// ─────────────────────────────────────────────────────────────────────────────
titulo('3. console.log con datos sensibles')

const PATRONES_LOG_SENSIBLE = [
  /console\.log\([^)]*\b(email|password|token|user_id|userId|secret|key)\b/i,
  /console\.log\([^)]*auth\.uid/i,
]

let logsOk = true
for (const archivo of archivos) {
  const contenido = leerArchivo(archivo)
  if (!contenido) continue
  const rel = relative(ROOT, archivo)
  if (rel.startsWith('tests')) continue

  const lineas = contenido.split('\n')
  for (let i = 0; i < lineas.length; i++) {
    for (const patron of PATRONES_LOG_SENSIBLE) {
      if (patron.test(lineas[i])) {
        fail(`${rel}:${i + 1} — console.log con datos sensibles`)
        logsOk = false
      }
    }
  }
}
if (logsOk) ok('No se encontraron console.log con datos sensibles')

// ─────────────────────────────────────────────────────────────────────────────
// 4. Archivos .env no deben estar en el repositorio
// ─────────────────────────────────────────────────────────────────────────────
titulo('4. Archivos .env en el repositorio')

const gitignore = leerArchivo(join(ROOT, '.gitignore')) || ''
const envFiles = ['.env', '.env.local', '.env.production', '.env.production.local']

for (const envFile of envFiles) {
  const enGitignore = gitignore.includes(envFile) || gitignore.includes('.env*') || gitignore.includes('.env.local')
  if (enGitignore) {
    ok(`${envFile} está en .gitignore`)
  } else {
    warn(`${envFile} NO está explícitamente en .gitignore`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Headers de seguridad en next.config
// ─────────────────────────────────────────────────────────────────────────────
titulo('5. Headers de seguridad en next.config')

const nextConfig = leerArchivo(join(ROOT, 'next.config.mjs'))
              || leerArchivo(join(ROOT, 'next.config.js'))
              || ''

const headersRequeridos = [
  { key: 'X-Frame-Options',          valor: 'DENY' },
  { key: 'X-Content-Type-Options',   valor: 'nosniff' },
  { key: 'Referrer-Policy',          valor: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',       valor: 'camera=' },
  { key: 'Content-Security-Policy',  valor: "default-src 'self'" },
  { key: 'Strict-Transport-Security', valor: 'max-age=' },
]

for (const header of headersRequeridos) {
  if (nextConfig.includes(header.key) && nextConfig.includes(header.valor)) {
    ok(`${header.key}`)
  } else {
    fail(`${header.key} — no encontrado o valor incorrecto en next.config`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Middleware configurado
// ─────────────────────────────────────────────────────────────────────────────
titulo('6. Middleware')

const middleware = leerArchivo(join(ROOT, 'middleware.js'))
               || leerArchivo(join(ROOT, 'middleware.ts'))

if (!middleware) {
  fail('middleware.js no encontrado')
} else {
  if (middleware.includes('RateLimiter')) ok('Rate limiting configurado')
  else warn('Rate limiting no detectado en middleware')

  if (middleware.includes('updateSession')) ok('Sesión Supabase configurada')
  else warn('updateSession no detectado en middleware')

  if (middleware.includes("startsWith('/api/')")) ok('Matcher de API routes presente')
  else warn('Matcher de API routes no detectado')
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Webhook de MercadoPago con HMAC
// ─────────────────────────────────────────────────────────────────────────────
titulo('7. Webhook MercadoPago')

const webhookFile = leerArchivo(join(ROOT, 'app/api/webhooks/mercadopago/route.js'))
                 || leerArchivo(join(ROOT, 'app/api/webhooks/mercadopago/route.ts'))

if (!webhookFile) {
  warn('Archivo webhook MP no encontrado en ruta esperada')
} else {
  if (webhookFile.includes('MP_WEBHOOK_SECRET')) ok('MP_WEBHOOK_SECRET referenciado')
  else fail('MP_WEBHOOK_SECRET NO referenciado en webhook')

  if (webhookFile.includes('createHmac') || webhookFile.includes('timingSafeEqual')) {
    ok('Validación HMAC presente')
  } else {
    fail('Validación HMAC no detectada en webhook')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Verificar que no haya NODE_ENV checks que anulen seguridad en producción
// ─────────────────────────────────────────────────────────────────────────────
titulo('8. Bypasses de seguridad condicionales')

const PATRONES_BYPASS = [
  { regex: /if\s*\(\s*process\.env\.NODE_ENV\s*!==\s*['"]production['"]\s*\)[\s\S]{0,200}(rate.lim|HMAC|webhook|auth)/i,
    nombre: 'bypass de seguridad condicional en non-production' },
]

let bypassOk = true
for (const archivo of archivos) {
  const contenido = leerArchivo(archivo)
  if (!contenido) continue
  const rel = relative(ROOT, archivo)

  for (const patron of PATRONES_BYPASS) {
    if (patron.regex.test(contenido)) {
      warn(`${rel} — ${patron.nombre}`)
      bypassOk = false
    }
  }
}
if (bypassOk) ok('No se detectaron bypasses de seguridad')

// ─────────────────────────────────────────────────────────────────────────────
// Resumen final
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════')
if (errores === 0 && advertencias === 0) {
  console.log('  🚀  Todo OK — listo para deploy en Vercel')
} else if (errores === 0) {
  console.log(`  🟡  ${advertencias} advertencia(s) — revisar antes de deploy`)
} else {
  console.log(`  🛑  ${errores} error(es) y ${advertencias} advertencia(s) — NO deployar hasta resolver`)
}
console.log('══════════════════════════════════════════\n')

if (errores > 0) process.exit(1)
