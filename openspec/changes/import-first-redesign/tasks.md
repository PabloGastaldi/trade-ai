# Tareas — Rediseño import-first (trade.ai v2)

- **Change ID:** `import-first-redesign`
- **Depende de:** `proposal.md`, `specs/`, `design.md`

Regla transversal: **cada fase deja `npm run build` verde** y, donde aplique, tests verdes antes
de avanzar. Cada fase es un PR encadenado (ver pronóstico de revisión al final).

---

## Fase 0 — Purga de exportación  (`export-removal`)

- [x] Eliminar `lib/calculadora/calc-exportacion.js` y `app/api/calculadora/exportacion/route.js`.
- [x] Eliminar `app/(app)/calculadora/ResultadosExpo.jsx`.
- [x] Quitar la rama expo de `app/(app)/calculadora/ContextoComercial.jsx` (queda solo `impo`).
- [x] Quitar la rama expo de `app/api/comparador/route.js` y de `ComparadorClient.js`.
- [x] Retirar `lib/prompts/guia-exportacion.js` y su inyección en `app/api/consulta/route.js`.
- [x] Retirar consumidores de `destination-tariffs-lookup`, `acuerdos_exportacion`,
      `aranceles_exportacion`, `ntm_measures_affecting_argentina`; borrar libs que queden sin uso.
- [x] Quitar incoterms/flujos de exportación de operaciones (`ModalNuevaOperacion`, validaciones, simulador, calculadora).
- [x] Actualizar `CLAUDE.md` (secciones de exportación) y disclaimers. _(completado — cierre del v2)_
- [x] Verificación: build verde, sin imports muertos, sin referencias a símbolos de exportación.

## Fase 1 — Colapso de navegación y rutas

- [x] Crear ruta `/importar` como puerta principal; redirigir el post-login allí
      (login, reset-password, OAuth callback, middleware).
- [x] Reescribir `Sidebar` y `MobileNav`: acción primaria «Nueva importación» (botón amarillo)
      + secundarios (Operaciones, Chat IA). Eliminados los 7 ítems del modelo viejo.
- [x] Sin colisión de rutas: `/importar` es segmento nuevo. `/inicio` queda huérfano (no linkeado,
      ya no es destino post-login) — pendiente de rework/eliminación en una fase posterior.
- [x] Endpoints que sobreviven (simulador, calculadora, etc.) siguen accesibles por deep-link;
      retirados como destinos del nav. El CTA primario entra al simulador como motor interino.
- [x] Verificación: navegación coherente desktop y mobile, build verde (41 páginas).

## Fase 2 — Flujo guiado de 3 pasos  (`guided-import-flow`)

- [x] Progreso de 3 pasos + botón atrás + estado reversible (en `ImportarClient`).
- [x] `ProductStep`: input conversacional + candidatos en palabras vía `clasificar`.
      NCM viaja oculto en el estado (nunca se muestra al usuario).
- [x] Manejo de baja confianza: candidatos vacíos muestran nota; el API ya cae a búsqueda textual.
- [x] `OriginStep`: orígenes frecuentes priorizados + selector completo. _(salida a comparar → Fase 4)_
- [x] `ValueStep`: monto con ayuda en criollo + flete opcional (estimado si se omite).
- [x] Generación del informe al confirmar (llama a `/api/simulador` + `/api/calculadora/importacion`).
      _(persistencia a `/importar/[id]` → Fase 3)_
- [x] Verificación: recorrido completo de punta a punta, sin pantalla en blanco, build verde.

> Nota: se construyó además una primera versión funcional del **informe** (`ImportReport.jsx`)
> estructurada por las 3 preguntas, para que el flujo no termine en un callejón. La Fase 3 la eleva
> (comparación de orígenes, copiloto, semáforo refinado, motion, persistencia).

## Fase 3 — Informe  (`import-report`)

- [x] `ImportReport` con las 3 preguntas en orden, alimentado por simulador + calculadora.
- [x] Costo principal + desglose (mercadería / flete+seguro / impuestos) desde `calcularImportacion`.
- [x] Requisitos: semáforo (podés importar → organismos → restricciones) + documentación.
- [x] «¿Conviene?»: preferencia del origen + **comparación de orígenes a demanda** (ordenada por costo).
- [x] Disclaimer legal obligatorio en el informe.
- [x] Acciones: «Gestionar esta importación» → operación precargada. _(«Guardar producto» → con catálogo, diferido)_
- [x] Verificación: build verde; el informe responde las 3 preguntas con datos reales.
- [x] Persistencia sin DB: link compartible por query params (`/importar?ncm=&pais=&valor=&flete=`)
      que regenera el informe + botón «Copiar link». Cero cambios de schema.

## Fase 4 — Comparación de orígenes y copiloto  (`origin-comparison`, `ai-copilot`)

- [x] Comparación de orígenes embebida (reusa `calcularImportacion` en paralelo por país). _(ya presente desde Fase 3, no se requirió nuevo trabajo)_
- [x] `CopilotRail`: chat contextual que inyecta el contexto del informe en `/api/consulta`.
- [x] Copiloto en hoja inferior para mobile; riel lateral en desktop.
- [x] Verificación: el copiloto responde con contexto del informe y disclaimer.

## Fase 5 — Operaciones integradas  (`operations-management`)

- [x] «Gestionar esta importación» crea operación precargada desde el informe.
      CTA pasa `ncm`, `pais` y ahora también `desc` (descripción NCM). `OperacionesClient`
      lee los tres params, prefilla `ncm_code`, `counterpart_country` y `product_description`.
- [x] Checklist documental desde `documentos_requeridos`; marcado y notas (`DocItem`).
      Verificado: `app/api/operaciones/route.js` llama RPC `documentos_por_operacion` al
      crear la operación y pobla `operation_documents`. `DetalleClient` carga esos docs y
      permite marcar + agregar notas vía `handleToggleDoc` / `handleNotaDoc`.
- [x] Lista + Kanban (`@dnd-kit`) limpiados de exportación.
      Removidos `ESTADOS_EXPO`, entradas `expo_*` de `BADGE_ESTADO`, filtros de tipo,
      lógica condicional expo/impo en `VistaKanban`, `OperacionesClient`, `DetalleClient`,
      `PrintView`. `handleDragEnd` simplificado a `impo_*` only.
- [x] Restringir `operation_type` y formularios al dominio de importación.
      `filtroTipo` fijado a `'importacion'`; columna TIPO eliminada de la lista;
      `autocompletarProducto` usa `default_origin` siempre; `opsActivas` solo filtra
      `impo_cerrada`; `estadosSiguientes` opera solo sobre `FLUJO_IMPO`.
- [x] Verificación: informe → operación → checklist funciona de corrido.
      Build verde (41 páginas, `✓ Compiled successfully`). 4 failures pre-existentes
      en tests, sin regresiones nuevas.

## Fase 6 — Pulido visual y movimiento

- [x] Evaluar e instalar `framer-motion` y `@number-flow/react` (confirmado: NO se instalaron — se logró todo con CSS @keyframes + requestAnimationFrame vanilla, cero dependencias nuevas).
- [x] Transición entre pasos (slide + fade, ≈250ms) con `prefers-reduced-motion`. CSS classes `step-enter-forward` / `step-enter-back` + JS `matchMedia` guard en `ImportarClient.js`.
- [x] Ticker del costo total en `CostHero` (`ImportReport.jsx`). Implementado con `requestAnimationFrame` + easing cúbico ~600ms. Muestra valor final instantáneo si `prefers-reduced-motion`.
- [x] Revelado escalonado de tarjetas del informe. CSS classes `report-card-1/2/3/actions` con delays 0/120/220/320ms. Desactivado con `@media (prefers-reduced-motion: reduce)`.
- [x] Pasada de jerarquía tipográfica, espaciado y disciplina del amarillo: hero en `font-display` (Bebas Neue) + `text-primary`, números en `font-mono`, cuerpo en `font-body` 400/500. Amarillo solo en hero cost + CTA primario. Botón comparar orígenes degradado a `text-on-surface-variant` (era amarillo). Encabezado en `font-medium` (era `font-semibold`).
- [x] Verificación accesible: reduced-motion desactiva todas las animaciones; contraste OK; foco states preservados; build verde (41 páginas, ✓ Compiled successfully); 4 failures pre-existentes, sin regresiones nuevas.
- [x] Limpieza CSS: removidos `.estadoBadgeExpo`, `.badgeExpo` de `operaciones.module.css` y `.badgeExpo`, `.estadoExpo` de `detalle.module.css`.

---

## Pronóstico de carga de revisión

- **Tamaño estimado:** muy superior a 400 líneas por fase en varias fases (2, 3, 6).
- **PRs encadenados recomendados:** Sí — una fase por PR, en orden.
- **Decisión necesaria antes de `apply`:** estrategia de entrega (encadenado stacked-to-main vs
  feature-branch-chain) y, si aplica, excepción de tamaño por fase.
- **Sugerencia:** Fase 0 (purga) primero y sola — es grande pero mecánica y de bajo riesgo;
  buen primer PR para validar el patrón de encadenado.
