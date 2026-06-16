# Tareas — Rediseño visual Intercom (trade.ai v3)

- **Change ID:** `intercom-redesign`
- **Depende de:** `proposal.md`, `design.md`, `DESIGN-intercom.md`, `reference-importar.html`, `specs/`

Regla transversal: **cada fase deja `npm run build` compilando** y sin fallas de test nuevas.
Es un re-skin: no se toca lógica, API ni base de datos.

---

## Fase 1 — Fundación (tokens + fuentes)

- [x] Reescribir `theme.extend.colors` en `tailwind.config.js` al mapeo de `design.md` Parte B
      (crema/blanco/carbón/naranja + hairline/surface-1/surface-2/ink-subtle/ink-tertiary).
- [x] Reescribir las CSS vars de `:root` en `app/globals.css` con el mismo mapeo (incluye `--accent`,
      `--text`, `--border`, `--bg`, etc.).
- [x] Cargar Inter (400/500/600) y JetBrains Mono (400/500) vía Google Fonts `<link>` en `app/layout.js`;
      mapear `--font-body`/`--font-display`/`--font-logo`→Inter, `--font-mono`→JetBrains Mono.
- [x] Retirar Bebas Neue, Space Grotesk y Salin (`--font-logo` + `@font-face`) y sus usos directos.
- [x] Ajustar `body` (fondo crema, tinta carbón, antialiasing).
- [x] Verificación: build compila. (Pantallas a medias es esperado hasta migrarlas.)

## Fase 2 — App shell (layout, sidebar, topbar, mobile)

- [x] `Sidebar.js` + `Sidebar.css`: panel blanco sobre crema, ítems carbón, activo con barra carbón
      e indicador, footer de usuario, según `reference-importar.html`.
- [x] `MobileNav.js` + `MobileNav.css`: tab bar y sheet en light.
- [x] `AppHeader`/topbar: crema con hairline inferior, uso de plan + botón ayuda.
- [x] `app/(app)/layout.js`: fondo crema, grilla sidebar+main.
- [x] Migrar utilities dark (Parte C) en estos archivos. Build verde.

## Fase 3 — Flujo de importación

- [x] `ImportarClient`: hero (`¿Qué querés importar?`), searchbar con CTA "Clasificar" naranja,
      chips de ejemplo, eyebrow "Paso X de 3", según `reference-importar.html`.
- [x] Pasos (producto/origen/costo), progreso y candidatos NCM en light (chip NCM en mono).
- [x] Migrar utilities dark. Build verde.

## Fase 4 — Informe + copiloto

- [x] `ImportReport`: CostHero (número grande Inter/JetBrains), tarjetas blancas, semáforo, chip NCM,
      comparación de orígenes, acciones — todo light.
- [x] `CopilotRail`: rail/sheet en light (blanco sobre crema, hairline), burbujas legibles.
- [x] Migrar utilities dark. Build verde.

## Fase 5 — Operaciones

- [x] Lista + Kanban (`OperacionesClient`, `VistaKanban`) en light; badges con la paleta nueva.
- [x] Detalle (`[id]/DetalleClient`, `DocItem`, `PanelMedioPagoDetalle`, `PrintView`) en light.
- [x] `ModalNuevaOperacion` en light.
- [x] Migrar utilities dark. Build verde.

## Fase 6 — Auth + landing + secundarias + pulido

### Fase 6a — Componentes UI compartidos + landing + auth (hecho)
- [x] Componentes compartidos `components/ui/*` (`Button`, `Input`, `Card`, `Badge`, `PageLayout`,
      `DataTable`, `Collapsible`, `NcmAutocomplete`, `UpgradePrompt`) migrados a Parte C — superficies
      blancas/crema, hairline, radii 8/12, sin sombras. `Button`: primary = carbón, variante `ai`
      agregada para el único CTA naranja explícito; secondary = blanco + hairline. `Badge`: success/error
      recoloreados para fondo claro (emerald-600/red-600 sobre tint claro). `Modal.js` es un archivo
      vacío (0 bytes) sin componente real — no requiere migración.
- [x] `app/page.js` (landing) reescrito al sistema editorial crema/carbón/naranja: header con hairline,
      hero Inter-500 con tracking negativo, tarjetas blancas + hairline (sin blur/glow decorativo),
      un solo CTA naranja por sección, tier destacado de precios invertido a carbón. `Navbar.js` no
      tiene usos en el código — no se tocó.
- [x] Auth pages (`login`, `registro`, `recuperar-password`, `reset-password`) en light: panel de marca
      izquierdo ahora es tarjeta carbón (`bg-on-surface`) con texto blanco — única superficie invertida,
      consistente con `pricing-card-featured` del sistema. Inputs/botones a `rounded-md` + hairline.
      Headlines pasados a sentence-case (se retira ALL-CAPS + tracking ancho del tema dark).
- [x] `/cuenta`, `/planes`, `/historial`, `/consulta` (chat) en light.
- [x] Deep-link: nomenclador, calculadora, simulador, comparador, catalogo, mercados en light.
- [x] Pasada final: contraste AA sobre crema, foco visible, `prefers-reduced-motion`, mobile.
- [x] Verificación: build verde, sin fallas de test nuevas, sin restos del tema dark.

### Fase 6b — Cierre de leftovers (catálogo, comparador, mercados, inicio, legal)
- [x] `CatalogoClient.js`: tarjetas/inputs/modales migrados a `bg-surface-1`/`bg-surface-high` +
      `border-hairline`, textos a `text-ink-subtle`/`text-ink-tertiary`, radii 8/12, error states a
      `red-600`.
- [x] `ComparadorClient.js`: instancias residuales de `bg-white/[0.0x]`, `border-white/[0.0x]` y
      opacidades de `text-on-surface-variant` migradas; semánticos `emerald-400`/`red-400`/`amber-400`
      → `-600` para contraste sobre claro.
- [x] `MercadosClient.js`: tarjetas, filas y skeletons migrados a superficies blancas + hairline;
      semánticos a `-600`.
- [x] `InicioClient.js` (huérfana, migrada por consistencia): hero/searchbar a light, gradiente de
      texto con hex amarillo (`#DDD92A`) retirado a favor de `text-primary`; orbes ambientales
      decorativos (glow amarillo dark-only) retirados — sin equivalente en el sistema editorial sin
      sombras (criterio aplicado igual que en `app/page.js`).
- [x] `app/privacidad/page.js`, `app/terminos/page.js`: header/footer/callouts a `border-hairline` /
      `bg-surface-high`, textos de opacidad a `text-ink-subtle`/`text-ink-tertiary`.
- [x] Grep final repo-wide (`app`, `components`) de patrones dark crudos: cero resultados.

---

## Pronóstico de carga de revisión

- **Tamaño:** alto (toca casi todos los componentes). PRs encadenados por fase recomendados.
- **Orden no negociable:** Fase 1 (fundación) primero — todo depende de los tokens nuevos.
- **Riesgo principal:** utilities dark crudas que quedan ilegibles; mitigado migrando por pantalla.
