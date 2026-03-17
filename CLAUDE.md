# trade.ai — Contexto del Proyecto

## Qué es trade.ai
Plataforma web de consulta inteligente para comercio exterior argentino.
Permite a PYMEs, despachantes de aduana, exportadores e importadores
hacer consultas en lenguaje natural sobre aranceles, requisitos de acceso
a mercados, documentación aduanera y normativa vigente.

## Stack tecnológico
- Frontend: Next.js 14 (App Router) desplegado en Vercel
- Backend: API Routes de Next.js (Node.js)
- Base de datos: Supabase (PostgreSQL cloud) — proyecto: dinjztjipjazwzbgjiix
- RAG: Pinecone (índice trade-ai-docs, modelo integrado llama-text-embed-v2)
- IA: Claude API (Haiku 4.5 para producción, Sonnet para desarrollo)
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

## Estructura de la base de datos
Base de datos: Supabase cloud (proyecto dinjztjipjazwzbgjiix)
Acceso: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY desde .env.local

Tablas existentes:
- `ncm`: 10,432 filas (posiciones arancelarias argentinas)
- `users_profile`: perfil de usuarios (id, full_name, company_name, plan_type,
  queries_this_month, queries_reset_date, mp_subscription_id)
- `queries_log`: historial de consultas (vacía por ahora)
- `documents_registry`: documentos normativos para RAG (vacía por ahora)

Tablas por crear:
- `preferencias_arancelarias`: preferencias del Excel de acuerdos comerciales
- `acuerdos_generales`: TLC de cobertura total (ACE-35, MERCOSUR)

## Estado actual del desarrollo
- ✅ Base de datos migrada a Supabase con 4 tablas
- ✅ NCM cargado en Supabase (10,432 posiciones, formato XXXX.XX.XX)
- ✅ Preferencias arancelarias importadas (52,510 filas)
- ✅ Acuerdos generales creados (MERCOSUR + ACE-35)
- ✅ Frontend del chat funcionando (tema oscuro, hero, chips, Markdown)
- ✅ Endpoint /api/consulta con Claude Haiku 4.5 + historial
- ✅ RAG con Pinecone (104 archivos ingestados, búsqueda semántica)
- ✅ Auth de usuarios (Supabase Auth)
- ✅ Pagos (MercadoPago Checkout Pro — /planes, webhook, checkout)
- ✅ Auditoría de seguridad completa (2026-03-17) — ver Security.md
- ✅ Rate limiting en dos capas (middleware IP + route handler userId)
- ✅ Headers de seguridad (CSP, X-Frame-Options, etc.) en next.config.mjs
- ✅ Suite de pruebas de calidad del agente (tests/test-queries.json + scripts/test-runner.js)
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

## Estructura del proyecto
```
trade-ai/
├── app/
│   ├── page.js                    # Landing page
│   ├── (app)/
│   │   ├── consulta/page.js       # Chat con la IA
│   │   ├── planes/page.js         # Página de planes y precios
│   │   ├── cuenta/page.js         # Mi cuenta
│   │   └── historial/page.js      # Historial de consultas
│   ├── (auth)/                    # Login / registro
│   ├── api/
│   │   ├── consulta/route.js      # Endpoint principal (Claude + RAG)
│   │   ├── checkout/route.js      # Crear preferencia MercadoPago
│   │   └── webhooks/mercadopago/  # Webhook handler MP (HMAC + anti-replay)
│   └── layout.js
├── components/
│   ├── chat/                      # ChatMessage, ChatInput
│   └── layout/                    # AppHeader
├── lib/
│   ├── mercadopago/client.js      # Cliente MP + PLANES (precios)
│   ├── pinecone/                  # Búsqueda semántica
│   ├── rate-limit.js              # RateLimiter reutilizable + getClientIp()
│   ├── supabase/                  # Clientes Supabase
│   └── ncm-lookup.js             # Consulta NCM + preferencias
├── middleware.js                  # Rate limiting IP + sesión Supabase
├── next.config.mjs                # Headers de seguridad (CSP, X-Frame, etc.)
├── scripts/
│   ├── ingest.js                  # Ingesta PDFs/TXTs a Pinecone
│   └── test-runner.js             # Runner de evaluación de calidad del agente
├── tests/
│   ├── test-queries.json          # 30 consultas de evaluación por categoría
│   ├── unit/                      # Tests unitarios (sanitize, schemas)
│   └── integration/               # Tests de integración (api)
├── Security.md                    # Auditoría de seguridad y decisiones
├── CLAUDE.md                      # Este archivo
└── .skills/                       # Skills del agente
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
