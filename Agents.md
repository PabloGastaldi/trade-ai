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
- CSS: Tailwind CSS (migrado desde styled-jsx) + design tokens en CSS variables

## Design tokens (Tailwind + CSS variables)
```
Fondo:       bg-surface (#0c0e12)
Cards:        bg-white/[0.03] border border-white/[0.04] rounded-2xl
Primario:     text-primary (#81e9ff), bg-primary-intense (#00e0ff)
Texto:        text-on-surface (#f6f6fc), text-on-surface-variant (#aaabb0)
Surface low:  bg-surface-low (#111318)
Surface high: bg-surface-high (#1d2025)
Surface highest: bg-surface-highest (#23262c)
Acento:       text-accent (#F59E0B)
Fuentes:      font-display (Bebas Neue), font-body (Inter), font-mono (Space Grotesk)
Success:      text-emerald-400, bg-emerald-500/10
Error:        text-red-400, bg-red-500/10
```

## Datasets disponibles

### 1. Nomenclatura NCM (cargada en Supabase)
- Tabla: `ncm`
- 10,432 filas con posiciones arancelarias argentinas
- Formato ncm_code: `XXXX.XX.XX` con puntos (ej: `0101.21.00`)
- Columnas: id, ncm_code, description, section, chapter,
  arancel_extrazona, arancel_intrazona, derecho_exportacion,
  iva_importacion, tasa_estadistica, organismos_imp, organismos_exp,
  unidad_medida, observaciones, created_at

### 2. Acuerdos comerciales con preferencias (Excel, pendiente de importar)
- Archivo: acuerdos_estructurados.xlsx
- 52,510 filas en hoja "Consolidado"
- Columnas: NCM/Naladisa, Acuerdo, País, Tipo, ¿Tiene Preferencia?
- IMPORTANTE: NCM en formato NALADISA sin puntos, 10 dígitos (ej: 0402101000)
- Mapeo al formato de la tabla ncm: tomar los primeros 8 dígitos del NALADISA
  y formatear como XXXX.XX.XX (ej: 04021010 → 0402.10.10)
- Todos los registros son "SI" (solo lista productos CON preferencia)
- Distingue exportación vs importación
- Acuerdos incluidos:
  - ACE-6: México (2,968 NCMs)
  - ACE-13: Paraguay (309 NCMs)
  - ACE-35: Chile (52 NCMs — solo excepciones, es TLC total)
  - ACE-58: Perú (13,045 NCMs)
  - ACE-59: Colombia, Ecuador, Venezuela (35,237 NCMs)
  - MERCOSUR-India: India (899 NCMs)
- Acuerdos NO incluidos (pendientes de conseguir datos):
  - ACE-36: Bolivia
  - SGP: Unión Europea, USA, Japón
  - MERCOSUR completo (Brasil, Uruguay, Paraguay son TLC total)

### 3. Barreras no arancelarias — UNCTAD TRAINS (cargada en Supabase)
- Tabla: `ntm_measures`
- 199,165 filas del dataset UNCTAD TRAINS filtrado para Argentina
- Archivo fuente: C:\Users\Pablo\trade-ai-data\ntm_argentina_filtrado.csv
- Script de carga: `scripts/load-ntm.js`
- Columnas clave: year, reporter (ISO3), partner (ISO3), hs_code (6 dígitos),
  ntm_all, ntm_non_h, ntm_h, ntm_full_coverage, ntm_partial_coverage, ntm_code
- Tabla auxiliar `country_codes`: mapeo ISO3 → nombre en español
- Categorías NTM: A=SPS, B=TBT, C=Inspección, E=Licencias/cuotas, P=Exportación

## Estructura de la base de datos
Base de datos: Supabase cloud (proyecto dinjztjipjazwzbgjiix)
Acceso: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY desde .env.local

Tablas existentes:
- `ncm`: 10,432 filas (posiciones arancelarias argentinas)
- `preferencias_arancelarias`: 52,510 filas (acuerdos comerciales por NCM)
- `acuerdos_generales`: TLC de cobertura total (MERCOSUR + ACE-35)
- `ntm_measures`: 199,165 filas (barreras no arancelarias UNCTAD TRAINS)
- `country_codes`: códigos ISO3 y nombres de países (name_es + name_en)
- `destination_tariffs`: 122,220 filas — aranceles que cobran otros países
  a productos argentinos (fuente WITS/ITC, HS 6 dígitos, AVE%)
- `users_profile`: perfil de usuarios (id, full_name, company_name, plan_type,
  queries_this_month, calcs_this_month, queries_reset_date, mp_subscription_id)
- `queries_log`: historial de consultas
- `documents_registry`: documentos normativos para RAG
- `user_products`: catálogo de productos del usuario (ncm_code, precio, incoterm,
  is_active, hs_code_6 generado automáticamente)

## Estado actual del desarrollo

### Diseño y CSS
- ✅ Tailwind CSS configurado (tailwind.config.js, postcss.config.mjs)
- ✅ globals.css con Tailwind directives + CSS variables para compatibilidad
- ✅ Layout principal con Bebas Neue + Inter + Space Grotesk
- ✅ Diseño Token System implementado en todas las pages nuevas

### Páginas migradas a Tailwind / redesignadas
- ✅ Landing page (app/page.js) — 7 secciones, bento grid, stats, pricing
- ✅ Chat/consulta (app/(app)/consulta/page.js) — streaming, ReactMarkdown
- ✅ Catálogo (app/(app)/catalogo/CatalogoClient.js) — CRUD, modal, NCM autocomplete
- ✅ Calculadora (app/(app)/calculadora/CalculadoraClient.js) — tabs impo/expo, 4 regímenes
- ✅ Nomenclador (app/(app)/nomenclador/page.js) — búsqueda + panel deslizable con detalle NCM
- ✅ Auth pages split-screen (login, registro, recuperar-password, reset-password)

### Módulo IA consultiva
- ✅ Endpoint /api/consulta con Claude Haiku 4.5 + historial
- ✅ RAG con Pinecone (104 archivos ingestados, búsqueda semántica)
- ✅ Arquitectura Haiku para todo (clasificador + respuesta) con token budget dinámico
- ✅ System prompt externalizado a lib/prompts/system-prompt.js
- ✅ Guías operativas (guia-exportacion.js, guia-importacion.js — inyección condicional)
- ✅ Barreras no arancelarias UNCTAD TRAINS (199K filas, integradas en el agente)
- ✅ Frontend del chat (tema oscuro, hero, chips, Markdown)

### Módulo ERP — Catálogo de productos
- ✅ Tabla `user_products` con RLS y trigger para hs_code_6
- ✅ Página /catalogo — CRUD completo con búsqueda inteligente de NCM
- ✅ API route /api/catalogo con límites por plan (free: 2, pro: 30, empresa: ilimitado)

### Módulo ERP — Calculadora de costos
- ✅ lib/calculadora/calc-importacion.js — firma: `calcularImportacion(supabase, params)`
  - Busca NCM y arancel en Supabase, detecta Mercosur, busca preferencias
  - Régulina general + courier (USD 3.000) + PEF + Correo UPU
- ✅ lib/calculadora/calc-exportacion.js — firma: `calcularExportacion(params)`
  - Normaliza precio a EXW, calcula FOB, derechos de exportación, tabla incoterms
  - Busca aranceles destino en destination_tariffs
- ✅ Tabla `destination_tariffs` (122K filas, aranceles por destino WITS/ITC)
- ✅ API routes /api/calculadora/importacion y /api/calculadora/exportacion
- ✅ Página /calculadora — UI Tailwind con tabs impo/expo, 4 cards de regímenes, desglose
- ✅ Límites por plan (free: 5 cálculos/mes, pro/empresa: ilimitado) via lib/calc-limit.js
- ✅ Columna calcs_this_month en users_profile

### Módulo ERP — Nomenclador NCM
- ✅ app/(app)/nomenclador/page.js — página completa con Tailwind
- Búsqueda con debounce 300ms (código por LIKE, texto por ILIKE)
- Tabla con 6 columnas: NCM, Descripción, AEC, D.Expo, IVA, Organismos
- Panel deslizable desde la derecha con: aranceles, organismos, preferencias, NTM, aranceles destino
- Chips de ejemplo clickeables, "Cargar más" para +50 resultados

### Infraestructura y seguridad
- ✅ Auth (Supabase Auth), Pagos (MercadoPago Checkout Pro)
- ✅ Rate limiting dos capas, headers de seguridad, auditoría 2026-03-17
- ✅ Suite de pruebas (Vitest, 52 tests unit + integration)

### UI Components (components/ui/)
- PageLayout.jsx — Header + separator + children wrapper
- Card.jsx — default/highlighted/glass variants
- Badge.jsx — primary/accent/success/error/neutral variants
- DataTable.jsx — tabla con hover y alternating rows
- Button.js — 4 variants (primary/secondary/ghost/danger), loading state
- Input.js — con label, hint, error states

### Roadmap ERP pendiente
- ⬜ Fase C: Comparador por país (usa calculadora para múltiples destinos)
- ⬜ Fase D: Gestor de operaciones + checklist inteligente
- ⬜ Rediseñar Sidebar (aún usa Sidebar.css, falta migrar a Tailwind)
- ⬜ Página de Planes, Cuenta, Historial (rediseño pendiente)
- ⬜ Deploy a producción (Vercel)
- ⬜ Configurar webhook MP en producción (MP_WEBHOOK_SECRET obligatorio)
- ⬜ Verificar RLS policies en Supabase dashboard
- ⬜ OCR de 12 PDFs escaneados pendientes

## Convenciones de código
- Usar español para nombres de variables de dominio (ej: derechoImportacion)
- Usar inglés para código técnico (ej: fetchData, handleSubmit)
- Comentarios en español
- Archivos de componentes React en PascalCase
- Archivos de utilidades en camelCase
- API routes en kebab-case
- Tailwind para estilos nuevos; CSS modules solo para archivos legacy no migrados
- No emojis — usar SVG inline o Lucide React
- No borders de 1px para separar secciones — usar cambios de tono

## Estructura del proyecto
```
trade-ai/
├── app/
│   ├── page.js                         # Landing page (Tailwind, 7 secciones)
│   ├── (app)/
│   │   ├── layout.js                   # Shell con Sidebar + MobileNav
│   │   ├── app-layout.css             # Margin del sidebar
│   │   ├── consulta/page.js            # Chat IA (Tailwind, streaming)
│   │   ├── catalogo/
│   │   │   ├── page.js                # SSR wrapper
│   │   │   ├── CatalogoClient.js       # UI CRUD + modal (Tailwind)
│   │   │   └── catalogo.module.css     # Legacy — no migrado
│   │   ├── calculadora/
│   │   │   ├── page.js                 # SSR wrapper
│   │   │   └── CalculadoraClient.js    # Tabs impo/expo, 4 regímenes (Tailwind)
│   │   ├── nomenclador/
│   │   │   └── page.js                # Búsqueda NCM + panel detalle (Tailwind)
│   │   ├── planes/page.js
│   │   ├── cuenta/page.js
│   │   └── historial/page.js
│   ├── (auth)/
│   │   ├── layout.js                  # bg-surface min-h-screen
│   │   ├── login/page.js              # Split-screen: card 500x600 + form 400px
│   │   ├── registro/page.js            # Split-screen igual que login
│   │   ├── recuperar-password/page.js   # Split-screen igual que login
│   │   └── reset-password/page.js      # Split-screen igual que login
│   ├── auth/callback/route.js         # OAuth callback
│   └── api/
│       ├── consulta/route.js
│       ├── catalogo/route.js
│       ├── calculadora/
│       │   ├── importacion/route.js   # Usa serviceClient + calcularImportacion(supabase, params)
│       │   └── exportacion/route.js   # Usa calcularExportacion(params)
│       ├── checkout/route.js
│       └── webhooks/mercadopago/route.js
├── components/
│   ├── ui/
│   │   ├── PageLayout.jsx
│   │   ├── Card.jsx
│   │   ├── Badge.jsx
│   │   ├── DataTable.jsx
│   │   ├── Button.js                  # (legacy — vacío, migrar si se necesita)
│   │   ├── Input.js                   # (legacy — vacío, migrar si se necesita)
│   │   └── Modal.js                   # (legacy — vacío, migrar si se necesita)
│   ├── layout/
│   │   ├── Sidebar.js                # Aún usa CSS
│   │   └── Sidebar.css
│   └── chat/
│       ├── ChatMessage.js             # Legacy — no usado (lógica en page)
│       ├── ChatInput.js               # Legacy — no usado
│       ├── ChatMessage.module.css     # Legacy
│       └── ChatInput.module.css       # Legacy
├── lib/
│   ├── calculadora/
│   │   ├── calc-importacion.js        # calcularImportacion(supabase, params)
│   │   └── calc-exportacion.js        # calcularExportacion(params)
│   ├── calc-limit.js
│   ├── mercadopago/client.js
│   ├── pinecone/
│   ├── rate-limit.js
│   ├── supabase/                     # client.js + server.js
│   ├── ncm-lookup.js
│   ├── ntm-lookup.js
│   ├── preferencias-lookup.js
│   └── prompts/
│       ├── system-prompt.js
│       ├── guia-exportacion.js
│       └── guia-importacion.js
├── middleware.js
├── next.config.mjs
├── tailwind.config.js
├── postcss.config.mjs
├── app/
│   └── globals.css                    # Tailwind directives + CSS variables
├── scripts/
│   ├── ingest.js
│   ├── load-ntm.js
│   ├── load-tariffs.js
│   └── test-runner.js
├── tests/
│   ├── test-queries.json
│   ├── unit/
│   └── integration/
├── Security.md
├── CLAUDE.md
└── .skills/
    ├── ingesta-datos/SKILL.md
    ├── consulta-ncm/SKILL.md
    ├── frontend-chat/SKILL.md
    └── base-de-datos/SKILL.md
```

## Reglas estrictas (NUNCA violar)
1. NUNCA hardcodear API keys o credenciales en el código
2. NUNCA modificar datos de la base de datos sin confirmación explícita
3. NUNCA borrar archivos sin preguntar primero
4. Cada respuesta al usuario de trade.ai DEBE incluir el disclaimer legal
5. Las consultas de la app siempre responden en español argentino
6. Usar Git commit después de cada cambio funcional importante
7. NUNCA deshabilitar el rate limiting o la validación HMAC del webhook
8. NUNCA agregar console.log con emails, user_ids u otros datos de usuario

## Disclaimer obligatorio de la app
"Esta información es orientativa y está respaldada por fuentes oficiales.
Para operaciones concretas, consultá con un despachante de aduana
matriculado o un profesional de comercio exterior."

## Flujo de trabajo preferido
1. Antes de hacer cambios grandes, explicame tu plan y esperá mi OK
2. Un archivo a la vez — no cambies 5 archivos sin confirmar
3. Después de cada cambio, decime cómo verificar que funciona
4. Si algo falla, mostrá el error y sugerí la solución

## Entorno de desarrollo
- Sistema operativo: Windows 11
- Terminal: PowerShell
- Editor: VS Code
- Puerto del servidor de desarrollo: 3000 (Next.js)
- Base de datos: Supabase cloud (no hay PostgreSQL local)
- Datos locales: C:\Users\Pablo\trade-ai-data\ (Excel de acuerdos, etc.)
- Build: `npm run build` — verificar siempre antes de considerar un cambio listo
- Dev: `npm run dev`

## Skills disponibles
Tenés skills especializadas en la carpeta .skills/:
- .skills/ingesta-datos/SKILL.md — Para procesar e importar datos
- .skills/consulta-ncm/SKILL.md — Para consultas de aranceles y NCM
- .skills/frontend-chat/SKILL.md — Para trabajo en la UI
- .skills/base-de-datos/SKILL.md — Para operaciones de base de datos

Lee la skill relevante ANTES de empezar una tarea especializada.
