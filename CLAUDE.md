# trade.ai — Contexto del Proyecto

## Qué es trade.ai
Producto import-first para PYMEs argentinas que importan ocasionalmente.
Guía al usuario de punta a punta en un solo recorrido: describís tu producto
en lenguaje natural, elegís el origen, y el sistema responde las tres preguntas
que importan: cuánto sale puesto en Argentina, qué necesitás para importarlo
legalmente, y si conviene según el origen.

**Dos capas de valor:**
1. **IA consultiva** — Copiloto contextual (Claude Haiku) que entiende el informe
   activo y responde preguntas en lenguaje natural. Consultas sobre aranceles, NCM,
   acuerdos comerciales, barreras no arancelarias y documentación aduanera.
2. **Recorrido operativo** — Flujo guiado de 3 pasos (producto → origen → costo)
   que genera un informe de importación. El informe se convierte en una operación
   gestionable con checklist y vista Kanban.

**Usuarios objetivo:** PYMEs importadoras, dueños de PYME que importan ocasionalmente
y no dominan comercio exterior. El producto los guía sin exponer jerga aduanera.

**Exportación:** la funcionalidad de exportación fue eliminada del producto en v2.
Las tablas `aranceles_exportacion`, `acuerdos_exportacion` y `destination_tariffs`
siguen existiendo en la base de datos pero no tienen consumidores activos en código.
`ntm_measures_affecting_argentina` y `ntm_measures_applied_by_argentina` sí se usan
(vía `lib/ntm-extended-lookup.js`) para el contexto NTM del simulador y el copiloto.

## Stack tecnológico
- Frontend: Next.js 14 (App Router) desplegado en Vercel
- Backend: API Routes de Next.js (Node.js)
- Base de datos: Supabase (PostgreSQL cloud) — proyecto: dinjztjipjazwzbgjiix
- RAG: Pinecone (índice trade-ai-docs, modelo integrado llama-text-embed-v2)
- IA: Claude API (Haiku 4.5 para TODO — clasificación y respuestas)
  - Token budget dinámico: simple=800, media=2000, compleja=3000 (techos, no objetivos)
  - Haiku recibe el presupuesto en el mensaje y responde al scope de la pregunta, no al contexto
  - Guía operativa de importación se inyecta solo en consultas operativas (no NCM simples)
- Markdown: react-markdown + remark-gfm (renderizado de respuestas del chat)
- Pagos: MercadoPago Checkout Pro (SDK `mercadopago`, webhook con HMAC-SHA256)
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
Fuentes:         font-display (Bebas Neue — landing/auth y hero de costo en el informe)
                 font-body (Inter — app interna, títulos de sección)
                 font-mono (Space Grotesk — números/código)
                 font-logo (Salin — SOLO logo "trade.ai")
Logo:            <span className="font-logo"><span className="text-on-surface">trade</span><span className="text-primary">.ai</span></span>
Success:         text-emerald-400, bg-emerald-500/10
Error:           text-red-400, bg-red-500/10
```

## Datasets disponibles

### 1. Nomenclatura NCM — schema completo (33.019 filas, todos los capítulos 01-97)
- `ncm` — 33.019 filas. PK: `codigo_ncm` (TEXT, 11 dígitos sin puntos, ej: `29339141000`)
  Campos: `seccion`, `capitulo`, `partida`, `descripcion`
- `aranceles_importacion` — 33.017 filas. FK → `ncm.codigo_ncm`
  Campos: `aec`, `die`, `dii`, `te`, `iva`, `iva_ad`, `gan`, `iibb`
- `aranceles_exportacion` — 32.950 filas. FK → `ncm.codigo_ncm`. **Sin uso activo en código.**
  Campos: `derecho_exportacion`, `reintegro`
- `acuerdos_importacion` — 1.439.634 filas. FK → `ncm.codigo_ncm`
  Campos: `bloque`, `pais` (nombre en español), `codigo_acuerdo`, `porcentaje` (0-100, % de preferencia), `nomenclatura`, `ncm_acuerdo`
- `acuerdos_exportacion` — 1.226.594 filas. Misma estructura que `acuerdos_importacion`. **Sin uso activo en código.**
- `acuerdos_generales` — 4 filas. TLC de cobertura total (sin NCM específico)
  Campos: `acuerdo_id`, `pais`, `tipo`, `notas`
- `preferencias_arancelarias` — tabla VIEJA (NALADISA) — NO usar en código nuevo

**Normalización NCM:** usar siempre `normalizarCodigoNCM()` de `lib/ncm-lookup.js`.
El campo `pais` en acuerdos es nombre en español — cruzar con `country_codes.name_es` para resolver desde ISO3.

### 2. Barreras no arancelarias — UNCTAD TRAINS
- `ntm_measures` — 199.165 filas filtradas para Argentina
  Campos: `reporter`, `partner`, `hs_code` (6 dígitos), `ntm_code`, `ntm_full_coverage`, `ntm_partial_coverage`, `ntm_all`, `ntm_non_h`
  Categorías NTM principales: A=SPS, B=TBT, C=Inspección preembarque, E=Licencias/cuotas, P=Medida de exportación
  Usada en: `/api/simulador`, `/api/consulta` (vía `lib/ntm-lookup.js`)
- `ntm_measures_affecting_argentina` — barreras que terceros países aplican a productos argentinos
  Columnas: `hs_code`, `pais_que_aplica`, `tipo_medida`, `ntm_code`.
  Usada en: `lib/ntm-extended-lookup.js` → `/api/simulador`, `/api/consulta`, `nomenclador/PanelDetalle.jsx`
- `ntm_measures_applied_by_argentina` — barreras que Argentina aplica a importaciones de otros países
  Columnas: `hs_code`, `pais_afectado`, `tipo_medida`, `ntm_code`.
  Usada en: `lib/ntm-extended-lookup.js` → `/api/simulador`, `/api/consulta`
- `ntm_measures_summary_by_country` — resumen agregado de medidas por país/HS. Sin uso activo en el código.
- `country_codes` — mapeo ISO3 → nombre en español/inglés. Campos: `iso3`, `name_es`, `name_en`

### 3. Aranceles en destino (tabla existente, sin uso activo en código)
- `destination_tariffs` — 122.220 filas. Fuente: WITS/ITC, HS 6 dígitos, AVE%
  Campos: `hs_code` (6 dígitos), `partner_iso3`, `ave_pct`, `reporting_country`, `ave_rate`, `num_tariff_lines`, `year`, `source`
  **Sin consumidor de código activo.** La tabla existe en la DB; `lib/destination-tariffs-lookup.js` fue eliminado.

### 4. Tablas operativas
- `documentos_requeridos` — 50 filas. Checklist por `tipo_operacion` + `regimen`. Filtros opcionales: `ncm_patron`, `pais_patron`
  Campos: `tipo_operacion`, `regimen`, `documento_nombre`, `documento_categoria`, `organismo_emisor`, `condicion`, `ncm_patron`, `pais_patron`, `base_legal`, `sort_order`, `notas`
- `regimen_intervenciones` — 52 filas. Organismos (SENASA, ANMAT, etc.) por operación/régimen/NCM
  Campos: `operacion`, `regimen`, `organismo`, `estado`, `ncm_patron`, `notas`
- `restricciones_regimenes` — 25 filas. Límites y condiciones por régimen (ej: courier USD 3.000)
  Campos: `regimen`, `restriccion`, `valor`, `notas`

## Estructura de la base de datos

**Tablas NCM:** `ncm`, `aranceles_importacion`, `acuerdos_importacion`, `acuerdos_generales`
**Tablas NCM (sin uso activo):** `aranceles_exportacion`, `acuerdos_exportacion`
**Tablas NTM:** `ntm_measures`, `ntm_measures_affecting_argentina`, `ntm_measures_applied_by_argentina`, `ntm_measures_summary_by_country` (sin uso activo)
**Tablas operativas:** `documentos_requeridos`, `regimen_intervenciones`, `restricciones_regimenes`
**Tablas auxiliares:** `country_codes`, `preferencias_arancelarias` (legacy, no usar), `destination_tariffs` (sin uso activo en código)
**Tablas de app:** `users_profile`, `queries_log`, `documents_registry`, `user_products`, `operations`
**Tablas de mercados:** `granos_bcr` — cacheado por cron diario (fetched_at, fecha_bcr, granos JSON)

**IMPORTANTE — búsquedas por codigo_ncm:** El campo `codigo_ncm` es tipo TEXT en Supabase.
Para búsqueda por prefijo usar rango `gte`/`lt` (ilike NO funciona sobre columnas numéricas en algunos contextos):
```js
const desde = digits.padEnd(11, '0')
const hasta = String(parseInt(digits, 10) + 1).padStart(digits.length, '0').padEnd(11, '0')
query.gte('codigo_ncm', desde).lt('codigo_ncm', hasta)
```

## Sistema de planes y límites

### Planes disponibles: `free`, `pro`, `empresa`
Configuración centralizada en `lib/plans-config.js` → `getPlanConfig(planId)`

| Feature | Free | Pro | Empresa |
|---|---|---|---|
| consulta IA | 3/mes | ilimitada | ilimitada |
| simulador | 1/mes | ilimitado | ilimitado |
| calculadora | 1/mes | ilimitada | ilimitada |
| comparador | 1/mes | ilimitado | ilimitado |
| operaciones | 1/mes | ilimitadas | ilimitadas |
| nomenclador | 5/mes | ilimitado | ilimitado |
| catálogo | 3 total | ilimitado | ilimitado |
| mercados | completo | completo | completo |

### Control de uso
- **`lib/usage-limiter.js`** — `verificarLimite(supabase, userId, feature)` y `registrarUso(supabase, userId, feature)`
  Features: `simulador`, `comparador`, `nomenclador`, `operaciones`, `calculadora`
  Columnas en `users_profile`: `*_this_month`. RPCs atómicos: `increment_*`
- **`/api/consulta`** — límites de chat (`queries_this_month`, RPC `increment_queries`)
- **`lib/monthly-reset.js`** — `aplicarResetMensual(supabase, userId, queriesResetDate)`: fuente única de verdad del reset mensual. La usan usage-limiter y /api/consulta.
- Reset mensual on-the-fly basado en `queries_reset_date` — resetea TODOS los contadores a la vez
- **`components/ui/UpgradePrompt.jsx`** — banner de upgrade. Props: `{ feature, limit, used }`

## Flujo guiado y API Routes

### Flujo de importación — `app/(app)/importar/`
Puerta principal del producto. Recorrido de 3 pasos: producto → origen → costo.
- `ImportarClient.js` — orquesta el stepper (3 pasos), transiciones CSS con `prefers-reduced-motion`, estado reversible.
- `ProductStep` (inline en ImportarClient) — input conversacional; llama a `/api/nomenclador/clasificar`; el NCM viaja oculto en el estado, nunca se muestra al usuario.
- `OriginStep` — selector de país con frecuentes priorizados (`OriginPicker`).
- `ValueStep` — monto en USD, flete opcional; estima flete si se omite.
- Al confirmar: llama en paralelo a `/api/simulador` y `/api/calculadora/importacion`.
- `ImportReport.jsx` — informe con 3 secciones: `CostHero` (costo puesto en Argentina, ticker animado), `RequirementsCard` (semáforo de viabilidad, organismos, documentos), `OriginAdvisorCard` (preferencia del origen + comparación a demanda). Persistencia sin DB: link compartible por query params (`/importar?ncm=&pais=&valor=&flete=`).
- `CopilotRail.jsx` — chat contextual que inyecta el informe activo en `/api/consulta`. Desktop: riel lateral. Mobile: hoja inferior.

### Chat IA — `POST /api/consulta`
- Flujo: autenticación → rate limit (10/min) → límite mensual → clasificación con Haiku → búsqueda paralela (NCM + preferencias + NTM + Pinecone) → inyección de guía de importación → streaming de respuesta → log en `queries_log`
- Tablas usadas: `users_profile`, `ncm`, `aranceles_importacion`, `acuerdos_importacion`, `ntm_measures`, `ntm_measures_affecting_argentina`, `ntm_measures_applied_by_argentina`, `queries_log`
- Libs: `lib/ncm-lookup.js` (buscarNCM), `lib/ntm-lookup.js` (buscarBarrerasNTM), `lib/ntm-extended-lookup.js` (resumenNTMCompleto), `lib/preferencias-lookup.js` (buscarPreferencias)

### Simulador — `POST /api/simulador`
Motor interno del informe de importación: NCM + país + tipo + régimen.
- **Tablas usadas:** `ncm`, `aranceles_importacion`, `acuerdos_importacion`, `acuerdos_generales`, `documentos_requeridos`, `regimen_intervenciones`, `restricciones_regimenes`, `ntm_measures`, `ntm_measures_affecting_argentina`, `ntm_measures_applied_by_argentina`, `country_codes`
- **Secciones del reporte:** NCM, país, aranceles, preferencias (mejor acuerdo + arancel efectivo), documentos (categorizados), organismos intervinientes, restricciones del régimen, barreras NTM, warnings
- Accesible por deep-link directo (`/simulador`); no está en el nav principal.

### Calculadora — `lib/calculadora/calc-importacion.js`
CIF → derecho (DIE/DII) → tasa estadística → IVA + adicionales.
- Regímenes: `general`, `courier_comercial`, `courier_personal`, `puerta_a_puerta`, `pef`, `correo_upu`.
- Condiciones IVA: `responsable_inscripto`, `monotributista`, `consumidor_final`, `exento`.
- Tablas: `ncm`, `aranceles_importacion`, `acuerdos_importacion`, `country_codes`
- `courier_comercial` y `courier_personal` usan aranceles reales del NCM (DIE/TE/IVA de la DB)
- `puerta_a_puerta` usa tasas fijas: 20% DI, 3% TE, 21% IVA
- Parámetro opcional `peso_kg`: si el régimen es courier y no se ingresó flete, estima flete = peso_kg × USD 15/kg
- `calc-exportacion.js` fue eliminado en v2.

### Comparador — `POST /api/comparador`
- Llama `calcularImportacion` en paralelo para hasta 40 países
- Devuelve array `[{ pais_iso3, ok, data|error }]`
- Cuenta como 1 uso del plan (no uno por país)
- Accesible por deep-link directo (`/comparador`); no está en el nav principal.

### Nomenclador — `app/(app)/nomenclador/page.js`
Tres secciones: búsqueda rápida (chips predefinidos), clasificador IA, panel de detalle.
Panel de detalle extraído a `app/(app)/nomenclador/PanelDetalle.jsx`.
- `GET /api/nomenclador/aranceles?ncm=` → `{ importacion: {...} }` (solo importación)
  Tablas: `aranceles_importacion`
- `GET /api/nomenclador/preferencias?ncm=` → acuerdos de importación para ese NCM
  Tablas: `acuerdos_importacion`, `acuerdos_generales`
- `POST /api/nomenclador/clasificar` → candidatos NCM + clasificación Haiku
  Body: `{ producto, material, uso, estado, presentacion, detalles }`
  Flujo de 3 fases:
  1. Haiku devuelve `partidas` (array de 4 dígitos SA) + `palabras_clave` backup — NO códigos NCM completos
  2. DB: trae TODAS las posiciones de esas partidas vía rango `gte`/`lt` (sin limit) + ilike por palabras_clave como complemento
  3. Haiku rankea entre candidatos reales (solo puede elegir códigos de la lista recibida)
  Tablas: `ncm` (rango por partida + ilike descripcion), `aranceles_importacion`
- `GET /api/ncm-search?q=` → autocompletado, devuelve `[{ ncm_code, description }]`
  Tablas: `ncm`. Búsqueda numérica por rango gte/lt o textual por ilike descripcion.
- Accesible por deep-link directo (`/nomenclador`); no está en el nav principal.

### Catálogo — `POST/GET/PATCH/DELETE /api/catalogo`
- Gestión de `user_products`. Verifica que `ncm_code` exista en tabla `ncm`.
- Límite free: 3 productos activos total (`is_active = true`)
- Accesible por deep-link directo (`/catalogo`); no está en el nav principal.

### Operaciones — `POST /api/operaciones`
- Crea operación de importación en tabla `operations`. `operation_type` restringido a importación.
- Validaciones: `incoterm` (EXW/FCA/FAS/FOB/CFR/CIF/CPT/CIP/DAP/DPU/DDP), `currency` (USD/EUR/ARS), `transport_mode` (maritimo/aereo/terrestre/multimodal)
- Al crear, llama RPC `documentos_por_operacion` para poblar `operation_documents` con el checklist.
- El frontend `OperacionesClient.js` lee operaciones directamente desde Supabase con sesión del usuario.
- Llega precargado desde el informe con `ncm`, `pais` y `desc` como query params.

### Mercados — `app/(app)/mercados/`
- Dólar (DolarApi), inflación/PBI (ArgentinaDatos), acciones (Yahoo Finance v8/chart), granos BCR (cron diario)
- Accesible por deep-link; no está en el nav principal.
- Cron: `GET /api/cron/bcr` — `0 15 * * *` UTC (12:00 AR). Auth: `x-vercel-cron: 1` o `Bearer <CRON_SECRET>`. Guarda en `granos_bcr`.

### Pagos — `POST /api/webhooks/mercadopago`
- Validación HMAC-SHA256 (x-signature + x-request-id + timestamp). Anti-replay: ventana de 5 min.
- Al aprobar: actualiza `plan_type`, `mp_subscription_id` en `users_profile`, resetea contadores.
- Al rechazar/refundar: revierte a `free`, limpia `mp_subscription_id`.

## Páginas activas

### Recorrido principal (en el nav)
- ✅ **Importar** (`app/(app)/importar/page.js` + `ImportarClient.js`) — flujo guiado 3 pasos + informe. Ruta: `/importar`. Puerta principal post-login.
- ✅ **Operaciones** (`app/(app)/operaciones/OperacionesClient.js`) — acepta `?ncm=&pais=&desc=`, vista lista + Kanban (@dnd-kit). Solo importación.
- ✅ **Chat IA / Copiloto** (`app/(app)/consulta/page.js`) — streaming, ReactMarkdown. También usado como copiloto contextual desde `CopilotRail.jsx`.

### Páginas accesibles por deep-link (no en el nav)
- ✅ Simulador (`app/(app)/simulador/SimuladorClient.js`) — motor de informe; accesible directamente.
- ✅ Calculadora (`app/(app)/calculadora/CalculadoraClient.js`) — acepta `?ncm=&pais=` para precarga (solo importación).
- ✅ Comparador (`app/(app)/comparador/ComparadorClient.js`) — solo importación.
- ✅ Catálogo (`app/(app)/catalogo/CatalogoClient.js`)
- ✅ Mercados (`app/(app)/mercados/`) — DolarApi + ArgentinaDatos + Yahoo Finance + BCR
- ✅ Nomenclador (`app/(app)/nomenclador/page.js`) — búsqueda, clasificador IA, panel detalle
- ✅ `/inicio` (`app/(app)/inicio/`) — huérfana (existe, no está linkeada en el nav, no es destino post-login)

### Páginas de soporte
- ✅ Landing page (`app/page.js`)
- ✅ Historial, Mi cuenta, Planes, Auth pages
- ✅ Términos y Condiciones (`app/terminos/page.js`)
- ✅ Política de Privacidad (`app/privacidad/page.js`)

## UI Components (components/ui/)
- `PageLayout.jsx` — wrapper con título y subtítulo
- `Card.jsx` — default/highlighted/glass variants
- `Badge.jsx` — primary/accent/success/error/neutral variants
- `DataTable.jsx` — tabla con hover
- `Button.js` — primary/secondary/ghost/danger, loading state
- `Input.js` — label, hint, error states
- `NcmAutocomplete.jsx` — autocomplete compartido (simulador, comparador, operaciones). `onSelect(item)` devuelve `{ ncm_code, description }`. Prop opcional `showDescription` para mostrar descripción debajo.
- `Collapsible.jsx` — acordeón reutilizable (sección colapsable con animación)
- `UpgradePrompt.jsx` — banner de límite alcanzado. Props: `{ feature, limit, used }`. Botón → `/planes`

## Librerías de dominio (lib/)
- `lib/constants.js` — constantes centralizadas: `INCOTERMS` (11 términos ICC 2020), `CURRENCIES` (USD/EUR/ARS), `TRANSPORT_MODES`
- `lib/api-response.js` — helpers `successResponse(data, status)` y `errorResponse(message, code, status)` para API routes
- `lib/ncm-lookup.js` — `normalizarCodigoNCM(entrada)`: normaliza a 11 dígitos, soporta formatos con/sin puntos, 8 u 11 dígitos, parciales
- `lib/ntm-lookup.js` — `buscarBarrerasNTM(hs_code, options)`: busca en `ntm_measures`, resuelve ISO3 con `resolverISO3()`
- `lib/ntm-extended-lookup.js` — `resumenNTMCompleto(supabase, hs6, paisISO3)`: busca en `ntm_measures_affecting_argentina` y `ntm_measures_applied_by_argentina`. Usado en simulador y consulta.
- `lib/preferencias-lookup.js` — `buscarPreferencias(ncm)`: consulta `acuerdos_importacion`, `acuerdos_generales`
- `lib/plans-config.js` — `getPlanConfig(planId)`: devuelve límites y labels por plan
- `lib/usage-limiter.js` — `verificarLimite(supabase, userId, feature)` / `registrarUso(supabase, userId, feature)`: control de uso mensual genérico (incluye `calculadora`)
- `lib/monthly-reset.js` — `aplicarResetMensual(...)` + `RESET_CONTADORES`: fuente única del reset mensual
- `lib/calculadora/calc-importacion.js` — `calcularImportacion(supabase, params)`
- `lib/data/medios-pago.js` — `getMedioPago(id)`: opciones de medios de pago para operaciones
- `lib/data/paises-no-cooperantes.js` — lista de países no cooperantes para cálculos adicionales
- `lib/rate-limit.js` — rate limiter en memoria para `/api/consulta` (10/min por usuario)
- `lib/utils/sanitize.js` — sanitización de inputs para el chat
- `lib/utils/formato-datos.js` — helpers de formato: `formatearNCM`, `formatMoneda`, etc.
- `lib/pinecone-search.js` — búsqueda semántica en Pinecone para RAG

## Sub-componentes extraídos (feature-level)

### Flujo de importación (`app/(app)/importar/`)
- `ImportarClient.js` — stepper de 3 pasos con transiciones CSS y estado reversible
- `ImportReport.jsx` — informe completo: `CostHero` (ticker animado), `RequirementsCard` (semáforo), `OriginAdvisorCard` (preferencia + comparación a demanda), disclaimer, acciones
- `CopilotRail.jsx` — chat contextual con informe inyectado; riel lateral desktop, hoja inferior mobile

### Calculadora (`app/(app)/calculadora/`)
- `ResultadosImpo.jsx` — renderizado completo de resultados de importación (desglose por régimen, tabla comparativa)
- `ContextoComercial.jsx` — panel de contexto comercial NTM (solo importación)

### Operaciones (`app/(app)/operaciones/`)
- `ModalNuevaOperacion.jsx` — modal autocontenido para crear operación (solo importación). Incluye `PanelMedioPago` sub-component
- `VistaKanban.jsx` — vista Kanban con drag-and-drop (@dnd-kit), solo estados de importación. Exporta default `VistaKanban` y named `KanbanCard` (usada para DragOverlay en el padre)

### Detalle de Operación (`app/(app)/operaciones/[id]/`)
- `DocItem.jsx` — ítem del checklist con edición de notas inline
- `PanelMedioPagoDetalle.jsx` — panel expandible con detalle del medio de pago
- `PrintView.jsx` — vista oculta solo para impresión/PDF (solo visible con `@media print`)

### Nomenclador (`app/(app)/nomenclador/`)
- `PanelDetalle.jsx` — panel slide-over de detalle de posición NCM. Exporta además: `formatearNCM`, `normalizarNCM`, `arancelColor`, `InfoCelda`, `LABEL_ARANCEL_IMPO`
- Cada candidato del clasificador tiene botón "Calcular costos con este NCM →" → `router.push('/calculadora?ncm=...')`

## Layout responsive
- **Desktop (≥1024px):** Sidebar fija izquierda 250px + contenido
- **Mobile (<768px):** Header fijo arriba (logo) + Bottom tab bar fijo (60px) + Sheet "Más" desde abajo

### Sidebar — estructura v2 (import-first)
- Logo → `/` (landing pública)
- Acción primaria: «Nueva importación» (botón amarillo) → `/importar`
- Secundarios: Mis operaciones → `/operaciones`, Chat IA → `/consulta`
- Footer: bloque usuario (avatar inicial, nombre, plan) + botón logout. Link cuenta → `/cuenta`.
- Las 7 herramientas del modelo viejo no están en el nav; siguen accesibles por deep-link.

### MobileNav — estructura v2 (import-first)
- Bottom tab bar: 3 tabs: Importar → `/importar`, Operaciones → `/operaciones`, Chat IA → `/consulta`
- Botón «Más»: abre sheet. El sheet contiene solo cuenta y logout (sin grilla de herramientas).
- `app-layout.css` mobile: `padding-bottom: calc(60px + env(safe-area-inset-bottom))` para no quedar detrás del tab bar

### Redirects post-login
- Login email/password → `/importar`
- OAuth callback (Google, magic link) → `/importar`
- Reset de contraseña exitoso → `/importar`
- `/inicio` existe pero es una ruta huérfana — no está vinculada en el nav ni es destino post-login.

### Colisión de rutas Next.js — IMPORTANTE
`app/(app)/page.js` y `app/page.js` mapean ambos a `/` porque los route groups `(app)` no generan segmento de URL.
**El recorrido principal vive en `app/(app)/importar/` (ruta `/importar`), nunca en `app/(app)/page.js`.**

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
- Datos locales: C:\Users\Pablo\scripts-locales\scraper-ncm\data\ (archivos JSON de NCM, aranceles, acuerdos)
- Build: `npm run build` — verificar siempre antes de considerar un cambio listo
- Dev: `npm run dev`
