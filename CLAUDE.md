# trade.ai — Contexto del Proyecto

## Qué es trade.ai
ERP de comercio exterior argentino con IA integrada.
Combina un asistente conversacional (Claude Haiku) con herramientas
operativas para gestionar el ciclo completo de importación y exportación.

**Dos capas de valor:**
1. **IA consultiva** — Consultas en lenguaje natural sobre aranceles, NCM,
   acuerdos comerciales, barreras no arancelarias, documentación aduanera
   y normativa vigente.
2. **ERP operativo** — Herramientas de gestión: catálogo de productos,
   calculadora de costos (impo/expo, comparación de regímenes), comparador
   por país, gestor de operaciones con checklist inteligente.

**Usuarios objetivo:** PYMEs exportadoras/importadoras, despachantes de aduana,
agentes de comercio exterior, consultores de comex.

## Stack tecnológico
- Frontend: Next.js 14 (App Router) desplegado en Vercel
- Backend: API Routes de Next.js (Node.js)
- Base de datos: Supabase (PostgreSQL cloud) — proyecto: dinjztjipjazwzbgjiix
- RAG: Pinecone (índice trade-ai-docs, modelo integrado llama-text-embed-v2)
- IA: Claude API (Haiku 4.5 para TODO — clasificación y respuestas)
  - Token budget dinámico: simple=800, media=2000, compleja=3000 (techos, no objetivos)
  - Haiku recibe el presupuesto en el mensaje y responde al scope de la pregunta, no al contexto
  - Guía operativa (exportación/importación) se inyecta solo en consultas operativas (no NCM simples)
- Markdown: react-markdown + remark-gfm (renderizado de respuestas del chat)
- Pagos: MercadoPago Checkout Pro (SDK `mercadopago`, webhook con HMAC)
- Idioma de la app: Español (Argentina)
- CSS: Tailwind CSS + design tokens en CSS variables
- Iconos: Lucide React

## Design tokens (Tailwind + CSS variables)
```
Fondo:           bg-surface (#1A191C)
Surface low:     bg-surface-low (#1f1e21)
Surface high:    bg-surface-high (#2a292e)
Surface highest: bg-surface-highest (#313035)
Sidebar:         #111013 (más oscuro que surface para contraste)
Cards:           bg-white/[0.03] border border-white/[0.04] rounded-2xl
Primario:        text-primary (#DDD92A), bg-primary-intense (#EAE151)
Sobre primario:  text-on-primary (#1A191C) — texto oscuro sobre amarillo
Texto:           text-on-surface (#F5F5F5), text-on-surface-variant (#9E9DA0)
Fuentes:         font-display (Bebas Neue — solo landing/auth)
                 font-body (Inter — app interna, títulos de sección)
                 font-mono (Space Grotesk — números/código)
                 font-logo (Salin — SOLO logo "trade.ai")
Logo:            <span className="font-logo"><span className="text-on-surface">trade</span><span className="text-primary">.ai</span></span>
Success:         text-emerald-400, bg-emerald-500/10
Error:           text-red-400, bg-red-500/10
```

## Datasets disponibles

### 1. Nomenclatura NCM — schema nuevo (cargado 2026-03-31)
- `ncm` — 26.439 filas. PK: `codigo_ncm` (11 dígitos sin puntos, ej: `29339141000`)
  Campos: `seccion`, `capitulo`, `partida`, `descripcion`
- `aranceles_importacion` — 26.437 filas. FK → `ncm.codigo_ncm`
  Campos: `aec`, `die`, `dii`, `te`, `iva`, `iva_ad`, `gan`, `iibb`
- `aranceles_exportacion` — 26.384 filas. FK → `ncm.codigo_ncm`
  Campos: `derecho_exportacion`, `reintegro`
- `acuerdos_importacion` — 1.106.272 filas. FK → `ncm.codigo_ncm`
  Campos: `bloque`, `pais` (nombre en español), `codigo_acuerdo`, `porcentaje` (0-100, % de preferencia), `nomenclatura`, `ncm_acuerdo`
- `acuerdos_exportacion` — 931.482 filas. Misma estructura que `acuerdos_importacion`
- `acuerdos_generales` — 4 filas. TLC de cobertura total (sin NCM específico)
  Campos: `acuerdo_id`, `pais`, `tipo`, `notas`
- `preferencias_arancelarias` — 52.510 filas. Tabla VIEJA (NALADISA) — NO usar en código nuevo

**Normalización NCM:** usar siempre `normalizarCodigoNCM()` de `lib/ncm-lookup.js`.
El campo `pais` en acuerdos es nombre en español — cruzar con `country_codes.name_es` para resolver desde ISO3.

### 2. Barreras no arancelarias — UNCTAD TRAINS
- `ntm_measures` — 199.165 filas filtradas para Argentina
- `country_codes` — mapeo ISO3 → nombre en español/inglés

### 3. Aranceles en destino
- `destination_tariffs` — 122.220 filas. Fuente: WITS/ITC, HS 6 dígitos, AVE%
- Join: `ncm.codigo_ncm.slice(0,6)` → `destination_tariffs.hs_code`

### 4. Tablas operativas
- `documentos_requeridos` — 50 filas. Checklist de documentación por `tipo_operacion` + `regimen`. Filtros opcionales: `ncm_patron`, `pais_patron`
- `regimen_intervenciones` — 52 filas. Organismos (SENASA, ANMAT, etc.) por operación/régimen/categoría de producto. Filtro por `ncm_patron`
- `restricciones_regimenes` — 25 filas. Límites y condiciones por régimen (ej: courier USD 3.000)

## Estructura de la base de datos
Tablas NCM: `ncm`, `aranceles_importacion`, `aranceles_exportacion`, `acuerdos_importacion`, `acuerdos_exportacion`, `acuerdos_generales`
Tablas operativas: `documentos_requeridos`, `regimen_intervenciones`, `restricciones_regimenes`
Tablas auxiliares: `ntm_measures`, `country_codes`, `destination_tariffs`, `preferencias_arancelarias` (legacy)
Tablas de app: `users_profile`, `queries_log`, `documents_registry`, `user_products`
Tablas de mercados: `granos_bcr` — cacheado por cron diario (fetched_at, fecha_bcr, granos JSON)

**IMPORTANTE — búsquedas por codigo_ncm:** El campo `codigo_ncm` es tipo NUMÉRICO en Supabase.
`.like()` / `.ilike()` NO funcionan en columnas numéricas. Usar siempre rango `gte`/`lt` para búsqueda por prefijo:
```js
const padded = digits.padEnd(11, '0')
const next = (BigInt(digits.padEnd(11, '9')) + 1n).toString().padStart(11, '0')
query.gte('codigo_ncm', padded).lt('codigo_ncm', next)
```

## Páginas activas
- ✅ Landing page (`app/page.js`)
- ✅ Chat IA (`app/(app)/consulta/page.js`) — streaming, ReactMarkdown
- ✅ Simulador (`app/(app)/simulador/SimuladorClient.js`) — POST /api/simulador, 10 queries paralelas, reporte accordion 6 secciones
- ✅ Calculadora (`app/(app)/calculadora/CalculadoraClient.js`) — acepta ?ncm=&pais=&tipo= para precarga
- ✅ Comparador (`app/(app)/comparador/ComparadorClient.js`) — 2-3 países, tabla lado a lado, llama /api/simulador por país
- ✅ Catálogo (`app/(app)/catalogo/CatalogoClient.js`)
- ✅ Operaciones (`app/(app)/operaciones/OperacionesClient.js`) — acepta ?ncm=&pais=&tipo= para abrir modal precargado
- ✅ Mercados (`app/(app)/mercados/`) — DolarApi + ArgentinaDatos + Yahoo Finance + BCR (cron)
- ✅ Nomenclador (`app/(app)/nomenclador/page.js`) — activo (sin soon)
- ✅ Historial, Mi cuenta, Planes, Comparador, Auth pages
- ✅ Términos y Condiciones (`app/terminos/page.js`)
- ✅ Política de Privacidad (`app/privacidad/page.js`)

## UI Components (components/ui/)
- `PageLayout.jsx` — wrapper con título y subtítulo
- `Card.jsx` — default/highlighted/glass variants
- `Badge.jsx` — primary/accent/success/error/neutral variants
- `DataTable.jsx` — tabla con hover
- `Button.js` — primary/secondary/ghost/danger, loading state
- `Input.js` — label, hint, error states
- `NcmAutocomplete.js` — autocomplete compartido para NCM (simulador, comparador). El componente maneja su propio estado de input; `onSelect(item)` se llama solo al elegir un ítem, devuelve `{ ncm_code, description }` (mismos campos del API)

## API Routes relevantes
- `POST /api/simulador` — panorama completo de operación: NCM + país + tipo + régimen → aranceles, preferencias, documentos, organismos, NTM, restricciones
- `GET /api/ncm-search?q=` — búsqueda NCM, devuelve `[{ ncm_code, description }]`
- `GET /api/cron/bcr` — scraper BCR granos, ejecutado por Vercel Cron (vercel.json: `0 15 * * *` = 12:00 AR)

## Layout responsive
- **Desktop (≥1024px)**: Sidebar fija izquierda 250px + contenido
- **Mobile (<768px)**: Header fijo arriba (logo + hamburguesa) + Drawer deslizable con todos los ítems

## Cron Jobs (vercel.json)
- `/api/cron/bcr` — `0 15 * * *` UTC (= 12:00 AR). Scrapea BCR, guarda en `granos_bcr`.
  Auth: acepta header `x-vercel-cron: 1` (Vercel lo inyecta automáticamente) o `Authorization: Bearer <CRON_SECRET>`.

## Convenciones de código
- Usar español para variables de dominio (ej: derechoImportacion)
- Usar inglés para código técnico (ej: fetchData, handleSubmit)
- Componentes React en PascalCase, utilidades en camelCase
- Tailwind para estilos nuevos; CSS modules solo para archivos legacy
- No emojis — usar SVG inline o Lucide React
- No borders de 1px para separar secciones — usar cambios de tono

## Reglas estrictas (NUNCA violar)
1. NUNCA hardcodear API keys o credenciales en el código
2. NUNCA modificar datos de la base de datos sin confirmación explícita
3. NUNCA borrar archivos sin preguntar primero
4. Cada respuesta al usuario DEBE incluir el disclaimer legal
5. Las consultas siempre responden en español argentino
6. Usar Git commit después de cada cambio funcional importante
7. NUNCA deshabilitar el rate limiting o la validación HMAC del webhook
8. NUNCA agregar console.log con emails, user_ids u otros datos de usuario

## Disclaimer obligatorio
"Esta información es orientativa y está respaldada por fuentes oficiales.
Para operaciones concretas, consultá con un despachante de aduana
matriculado o un profesional de comercio exterior."

## Seguridad de configuración Claude Code
- Auditado con [Clauditor](https://github.com/gabrielsoltz/clauditor) v0.5.4
- Configuración endurecida aplicada en `.claude/settings.json` (scope: project)
- Resultado scan: 19/51 checks PASS — mejora continua pendiente (32 FAIL restantes son managed/SSO/CODEOWNERS)
- Checks críticos resueltos: `disableBypassPermissionsMode`, sandbox filesystem deny, deny `.env` directo, deny MCP filesystem server
- Pendientes manuales: CODEOWNERS (CC001/CC030), SSO (CC007/CC008), managed scope (requiere Claude for Business)
- Re-escanear con: `PYTHONUTF8=1 clauditor scan --path .`

## Entorno de desarrollo
- Windows 11, PowerShell, VS Code
- Puerto dev: 3000 (Next.js)
- Base de datos: Supabase cloud
- Datos locales: C:\Users\Pablo\trade-ai-data\
- Build: `npm run build` — verificar siempre antes de considerar un cambio listo
- Dev: `npm run dev`
