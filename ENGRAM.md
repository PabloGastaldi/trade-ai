# trade.ai — ENGRAM (Memoria del Proyecto)

> Estado del proyecto al 2026-03-20. Actualizado después de la sesión de trabajo con el desarrollador.

## Última sesión: Migración a Tailwind + Nuevas features

### Auth pages rediseñadas
Todas las pages de auth ahora tienen split-screen centrado:
- `app/(auth)/login/page.js`, `registro/page.js`, `recuperar-password/page.js`, `reset-password/page.js`
- Estructura: card izq 500×600px (`w-[500px] h-[600px]`) + formulario 400px (`w-[400px]`)
- Contenedor: `flex min-h-screen items-center justify-center gap-12 px-8 bg-surface`
- Extraído `LeftBrandingCard` como componente reutilizable en recuperar-password y reset-password
- `app/(auth)/layout.js` simplificado: solo `bg-surface min-h-screen`

### Calculadora completa
- `app/(app)/calculadora/CalculadoraClient.js` reescrito completo con Tailwind
- Tabs IMPORTACIÓN / EXPORTACIÓN con toggle
- 4 cards de regímenes con desglose expandible
- API route corregido: `calcularImportacion(supabase, params)` — ahora recibe supabase como primer parámetro
- Bug corregido en `lib/calculadora/calc-importacion.js:118` — paréntesis faltante en `effective_rate`

### Nomenclador NCM
- `app/(app)/nomenclador/page.js` creado desde cero con Tailwind
- Búsqueda con debounce 300ms, panel deslizable derecho con datos completos
- Incluye preferencias, NTM, aranceles destino

### UI Components nuevos
- `components/ui/Button.js` — 4 variants + loading state
- `components/ui/Input.js` — label, hint, error states

## Bugs corregidos
- `calc-importacion.js:118` — `effective_rate` con expresión incompleta (faltaba paréntesis)
- API `/api/calculadora/importacion` — no pasaba supabase ni usaba `calcularImportacion` correctamente
- Auth layout wrapper con `flex items-center justify-center` que rompía el split-screen

## Archivos importantes para recordar
- `lib/calculadora/calc-importacion.js` — función asíncrona, recibe `supabase` como primer arg
- `lib/calculadora/calc-exportacion.js` — función asíncrona, recibe params (sin supabase)
- `app/api/calculadora/importacion/route.js` — usa `createServiceClient` con `SUPABASE_SERVICE_ROLE_KEY`
- Auth pages: estructura split-screen fija, NO usar `w-1/2` ni `flex-1`

## Pending work
- Sidebar redesign (aún usa CSS legacy)
- Páginas /planes, /cuenta, /historial pendientes de redesign
- Modal.js, Button.js, Input.js son componentes nuevos (Button e Input ahora implementados)
- Archivos CSS legacy a limpiar: `catalogo.module.css`, `home.module.css`, `ChatMessage.module.css`, `ChatInput.module.css`

## Convenciones de diseño (recordar)
- Auth split-screen: card izq 500×600px固定, formulario 400px固定, gap-12 centrado
- Never: `w-1/2`, `flex-1` en auth (rompe el centrado)
- Tailwind colors: bg-surface, text-on-surface, text-primary, bg-surface-low/high/highest
- Fonts: font-display (Bebas Neue), font-body (Inter), font-mono (Space Grotesk)
- Auth layout: `bg-surface min-h-screen` sin flex center wrapper
