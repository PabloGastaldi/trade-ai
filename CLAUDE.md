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
Fondo:         bg-surface (#0c0e12)
Surface low:    bg-surface-low (#111318)
Surface high:  bg-surface-high (#1d2025)
Surface highest: bg-surface-highest (#23262c)
Cards:         bg-white/[0.03] border border-white/[0.04] rounded-2xl
Primario:      text-primary (#81e9ff), bg-primary-intense (#00e0ff)
Texto:         text-on-surface (#f6f6fc), text-on-surface-variant (#aaabb0)
Fuentes:       font-display (Bebas Neue), font-body (Inter), font-mono (Space Grotesk)
Success:       text-emerald-400, bg-emerald-500/10
Error:         text-red-400, bg-red-500/10
```

## Datasets disponibles

### 1. Nomenclatura NCM (cargada en Supabase)
- Tabla: `ncm` — 10,432 filas con posiciones arancelarias argentinas
- Formato ncm_code: `XXXX.XX.XX` con puntos

### 2. Acuerdos comerciales con preferencias (cargados en Supabase)
- Tabla: `preferencias_arancelarias` — 52,510 filas
- NCM en formato NALADISA sin puntos (10 dígitos), mapeado a formato con puntos
- Acuerdos: ACE-6 (México), ACE-13 (Paraguay), ACE-35 (Chile), ACE-58 (Perú), ACE-59 (Colombia/Ecuador/Venezuela), MERCOSUR-India

### 3. Barreras no arancelarias — UNCTAD TRAINS (cargada en Supabase)
- Tabla: `ntm_measures` — 199,165 filas filtradas para Argentina
- Tabla auxiliar `country_codes`: mapeo ISO3 → nombre en español

### 4. Aranceles en destino (cargados en Supabase)
- Tabla: `destination_tariffs` — 122,220 filas
- Fuente: WITS/ITC, HS 6 dígitos, AVE%

## Estructura de la base de datos
Tablas: `ncm`, `preferencias_arancelarias`, `acuerdos_generales`, `ntm_measures`, `country_codes`, `destination_tariffs`, `users_profile`, `queries_log`, `documents_registry`, `user_products`

## Páginas migradas a Tailwind / redesignadas
- ✅ Landing page (`app/page.js`)
- ✅ Chat IA (`app/(app)/consulta/page.js`) — streaming, ReactMarkdown, normalización de texto
- ✅ Catálogo (`app/(app)/catalogo/CatalogoClient.js`)
- ✅ Calculadora (`app/(app)/calculadora/CalculadoraClient.js`)
- ✅ Nomenclador (`app/(app)/nomenclador/page.js`)
- ✅ Historial (`app/(app)/historial/HistorialClient.js`)
- ✅ Mi cuenta (`app/(app)/cuenta/CuentaClient.js`)
- ✅ Cambiar contraseña (`app/(app)/cuenta/password/page.js`)
- ✅ Planes (`app/(app)/planes/page.js` + PlanesClient.js)
- ✅ Comparador (`app/(app)/comparador/ComparadorClient.js`)
- ✅ Operaciones (`app/(app)/operaciones/OperacionesClient.js`, `DetalleClient.js`)
- ✅ Auth pages split-screen (login, registro, recuperar-password, reset-password)

## UI Components (components/ui/)
- `PageLayout.jsx` — wrapper con título y subtítulo
- `Card.jsx` — default/highlighted/glass variants
- `Badge.jsx` — primary/accent/success/error/neutral variants
- `DataTable.jsx` — tabla con hover
- `Button.js` — primary/secondary/ghost/danger, loading state
- `Input.js` — label, hint, error states

## Layout responsive
- **Desktop (≥1024px)**: Sidebar fija izquierda 250px + contenido
- **Mobile (<768px)**: Header fijo arriba (logo + hamburguesa) + Bottom tabs (Chat/Calculadora/Operaciones/Más) + Drawer deslizable

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

## Entorno de desarrollo
- Windows 11, PowerShell, VS Code
- Puerto dev: 3000 (Next.js)
- Base de datos: Supabase cloud
- Datos locales: C:\Users\Pablo\trade-ai-data\
- Build: `npm run build` — verificar siempre antes de considerar un cambio listo
- Dev: `npm run dev`
