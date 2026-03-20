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
- ✅ lib/calculadora/calc-importacion.js — régimen general + courier/PEF/UPU
- ✅ lib/calculadora/calc-exportacion.js — conversión incoterms + derechos de expo
- ✅ Tabla `destination_tariffs` (122K filas, aranceles por destino WITS/ITC)
- ✅ Script scripts/load-tariffs.js para cargar destination_tariffs
- ✅ API routes /api/calculadora/importacion y /api/calculadora/exportacion
- ✅ Página /calculadora — UI con tabs impo/expo, 4 cards de regímenes, desglose
- ✅ Límites por plan (free: 5 cálculos/mes, pro/empresa: ilimitado) via lib/calc-limit.js
- ✅ Columna calcs_this_month en users_profile

### Infraestructura y seguridad
- ✅ Auth (Supabase Auth), Pagos (MercadoPago Checkout Pro)
- ✅ Rate limiting dos capas, headers de seguridad, auditoría 2026-03-17
- ✅ Suite de pruebas (Vitest, 52 tests unit + integration)

### Roadmap ERP pendiente
- ⬜ Fase C: Comparador por país (usa calculadora para múltiples destinos)
- ⬜ Fase D: Gestor de operaciones + checklist inteligente
- ⬜ Deploy a producción (Vercel)
- ⬜ Configurar webhook MP en producción (MP_WEBHOOK_SECRET obligatorio)
- ⬜ Verificar RLS policies en Supabase dashboard
- ⬜ OCR de 12 PDFs escaneados pendientes
- ⬜ Agregar /catalogo y /calculadora al AppHeader

## Convenciones de código
- Usar español para nombres de variables de dominio (ej: derechoImportacion)
- Usar inglés para código técnico (ej: fetchData, handleSubmit)
- Comentarios en español
- Archivos de componentes React en PascalCase
- Archivos de utilidades en camelCase
- API routes en kebab-case

## Estructura del proyecto
```
trade-ai/
├── app/
│   ├── page.js                         # Landing page
│   ├── (app)/
│   │   ├── consulta/page.js            # Chat con la IA
│   │   ├── catalogo/                   # ERP: catálogo de productos
│   │   │   ├── page.js                 # SSR — carga productos + países
│   │   │   ├── CatalogoClient.js       # UI interactiva + modal formulario
│   │   │   └── catalogo.module.css
│   │   ├── calculadora/                # ERP: calculadora de costos
│   │   │   ├── page.js                 # SSR — carga productos + países
│   │   │   ├── CalculadoraClient.js    # UI tabs impo/expo + cards regímenes
│   │   │   └── calculadora.module.css
│   │   ├── planes/page.js              # Página de planes y precios
│   │   ├── cuenta/page.js              # Mi cuenta
│   │   └── historial/page.js           # Historial de consultas
│   ├── (auth)/                         # Login / registro
│   ├── api/
│   │   ├── consulta/route.js           # Endpoint IA (Claude + RAG)
│   │   ├── catalogo/route.js           # CRUD catálogo con límite de plan
│   │   ├── calculadora/
│   │   │   ├── importacion/route.js    # Cálculo 4 regímenes en paralelo
│   │   │   └── exportacion/route.js    # Cálculo conversión incoterms
│   │   ├── checkout/route.js           # Crear preferencia MercadoPago
│   │   └── webhooks/mercadopago/       # Webhook handler MP (HMAC + anti-replay)
│   └── layout.js
├── components/
│   ├── chat/                           # ChatMessage, ChatInput
│   └── layout/                         # AppHeader
├── lib/
│   ├── calculadora/
│   │   ├── calc-importacion.js         # Lógica pura: régimen general + courier/PEF/UPU
│   │   └── calc-exportacion.js         # Lógica pura: incoterms + derechos expo
│   ├── calc-limit.js                   # Límites mensuales de cálculos por plan
│   ├── mercadopago/client.js           # Cliente MP + PLANES (precios + límites)
│   ├── pinecone/                       # Búsqueda semántica RAG
│   ├── rate-limit.js                   # RateLimiter reutilizable + getClientIp()
│   ├── supabase/                       # Clientes Supabase (browser/server/middleware)
│   ├── ncm-lookup.js                   # Consulta NCM + preferencias arancelarias
│   ├── ntm-lookup.js                   # Barreras no arancelarias (UNCTAD TRAINS)
│   ├── preferencias-lookup.js          # Acuerdos comerciales y TLC
│   └── prompts/                        # System prompt + guías operativas
├── middleware.js                       # Rate limiting IP + sesión Supabase
├── next.config.mjs                     # Headers de seguridad (CSP, X-Frame, etc.)
├── scripts/
│   ├── ingest.js                       # Ingesta PDFs/TXTs a Pinecone
│   ├── load-ntm.js                     # Carga NTM a Supabase (199K filas)
│   ├── load-tariffs.js                 # Carga destination_tariffs (122K filas)
│   └── test-runner.js                  # Runner de evaluación del agente
├── tests/
│   ├── test-queries.json               # 30 consultas de evaluación
│   ├── unit/                           # Tests unitarios
│   └── integration/                    # Tests de integración
├── Security.md                         # Auditoría de seguridad y decisiones
├── CLAUDE.md                           # Este archivo
└── .skills/                            # Skills del agente
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

## Memoria
Tenés acceso a memoria persistente via auto-memory (archivos en .claude/projects/).
- Guardá proactivamente después de trabajo significativo

## Skills disponibles
Tengo skills especializadas en la carpeta .skills/:
- .skills/ingesta-datos/SKILL.md — Para procesar e importar datos
- .skills/consulta-ncm/SKILL.md — Para consultas de aranceles y NCM
- .skills/frontend-chat/SKILL.md — Para trabajo en la UI
- .skills/base-de-datos/SKILL.md — Para operaciones de base de datos

Lee la skill relevante ANTES de empezar una tarea especializada.
