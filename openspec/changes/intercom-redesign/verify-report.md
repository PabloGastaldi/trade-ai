# Verify Report — intercom-redesign

**Change**: `intercom-redesign`
**Mode**: Standard (artifact store: openspec)
**Date**: 2026-06-16

## Completeness

| Metric | Value |
|---|---|
| Phases (tasks.md) | 6 (Fase 1–6, incl. 6a/6b) |
| Tasks total | 33 |
| Tasks complete | 33 |
| Tasks incomplete | 0 |

All checklist items in `tasks.md` are marked `[x]`. No apply-progress artifact exists separately — this change tracks progress via `tasks.md` checkboxes directly (openspec mode, consistent with `proposal.md`'s `Artifact store: openspec`).

## Build & Test Execution

**Build**: PASSED
```
✓ Compiled successfully
```
(The preceding `⨯ Failed to load env from .env.local Error: EPERM` line is the known sandbox artifact — `.env.local` is outside sandbox read permissions — not a code failure.)

**Tests** (`npx vitest run`): 52 passed / 4 failed (pre-existing) / 0 new failures
```
Test Files  2 failed | 2 passed (4)
Tests  4 failed | 52 passed (56)
```
Failures, confirmed pre-existing and unrelated to this visual re-skin:
- `tests/unit/schemas.test.ts` — `formatearResultadosNCM` wording expectations (`SENASA`, `AFIP` substring checks vs. actual formatter output) — 2 failures.
- `tests/integration/api.test.ts` — `/api/consulta` límite de plan expects `403`, receives `429` — 2 failures.

No new failures introduced by the re-skin.

## Spec Compliance Matrix

| Requirement | Scenario | Evidence | Result |
|---|---|---|---|
| Sistema de tokens crema/carbón/naranja | Tokens aplicados globalmente | `tailwind.config.js` colors + `app/globals.css :root` match design.md Parte B exactly (`surface #f5f1ec`, `on-surface #111111`, `primary #ff5600`, `hairline #d3cec6`, `surface-1`/`surface-2` present); grep for Bebas/Space Grotesk/Salin in `app`+`components` → 0 matches | COMPLIANT |
| Tipografía Inter + JetBrains Mono | Fuentes cargadas | `app/layout.js` loads `Inter:wght@400;500;600` + `JetBrains+Mono:wght@400;500` via Google Fonts `<link>`; `--font-body`/`--font-display`/`--font-logo`→Inter, `--font-mono`→JetBrains Mono in `globals.css`; no `@font-face` leftovers for old fonts | COMPLIANT |
| Disciplina del acento naranja | Un solo CTA naranja por vista | Spot-checked `ImportarClient.js` (1 orange CTA: "Clasificar"/submit; step-badge dot is a status indicator, not a competing CTA), `ImportReport.jsx` (explicit code comment: primary action is carbón, orange reserved for copiloto), `Sidebar.js`/`Sidebar.css` (active state uses `--on-surface`, not orange) | COMPLIANT, with 1 WARNING (see below: `bg-primary` used decoratively as a 3-color progress-bar tier in Operaciones) |
| Superficie editorial sin sombras | Tarjetas sobre crema | `rg 'shadow-(sm|md|lg|xl|2xl|inner)'` across `app`+`components` → 0 matches; `rounded-2xl` → 0 matches (fully migrated to 8/12/16px scale, exceeds the design.md ask) | COMPLIANT |
| Consistencia en todas las superficies | Sin restos del tema dark | `rg 'bg-white/\[0\.0|border-white/\[0\.0|#1A191C|#DDD92A|#EAE151|#313035|#2a292e|#1f1e21|#111013|text-on-surface-variant/[0-9]'` across `app`+`components` → 0 matches. Spot-checked nomenclador (deep-link tool), login (auth), mercados (deep-link tool) — all on `bg-surface`/`bg-surface-1`/`hairline` light system | COMPLIANT |
| Sin regresión funcional ni de accesibilidad | Build y tests | Build green, only the 4 pre-existing test failures remain. Spot-checked `fetch('/api/simulador')`, `fetch('/api/calculadora/importacion')`, `fetch('/api/nomenclador/clasificar')`, `fetch('/api/comparador')`, `supabase.from('operations').update(...)` — all wiring intact, untouched by re-skin. `prefers-reduced-motion` handled in 4 CSS files + 2 JS files (`ImportarClient.js`, `ImportReport.jsx`). Focus states (`focus-visible:`/`focus:ring`/`focus:outline`/`focus:border`) present across ~16 files. One accessibility WARNING found (see below: `text-red-400` on light card in `ImportarClient.js`) | COMPLIANT, with 1 WARNING |

**Compliance summary**: 6/6 requirements COMPLIANT (2 carry a non-blocking WARNING each).

## Issues Found

**CRITICAL**: None.

**WARNING**:
1. `app/(app)/importar/ImportarClient.js:399` — inline form error message uses `text-red-400` on a `bg-red-500/10` light tint card. `red-400` is a light/pastel red tuned for dark backgrounds; on a near-white card it will likely fail WCAG AA contrast against cream/white. Should be bumped to `text-red-600`/`text-red-700` like the rest of the codebase (e.g. `ModalNuevaOperacion.jsx:508` already uses `text-red-700` for the equivalent pattern). This is the only `-400` semantic text color left in `app`/`components` — everywhere else was correctly bumped to `-600`/`-700`.
2. `app/(app)/operaciones/VistaKanban.jsx:38` and `app/(app)/operaciones/OperacionesClient.js:82` — `DocsProgress`/document-completion progress bar uses `bg-primary` (the reserved Fin-Orange accent) as the "medium completion" tier in a red/orange/green traffic-light bar (`pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-primary' : 'bg-red-500'`). This is a decorative/semantic use of the orange accent outside the "CTA primario / acción IA" rule from `design.md` Parte C ("Acento amarillo decorativo → quitar; el naranja SOLO en CTA primario / acción IA") and the spec's orange-discipline requirement. It does not create competing CTAs (it's a progress bar, not a button) and is low-visual-weight, but it is a literal violation of the stated rule and should be remapped to a neutral/amber tone instead of `bg-primary`.

**SUGGESTION**:
1. `app/(app)/operaciones/ModalNuevaOperacion.jsx` (lines 94, 108, 145, 511) uses `text-primary` for inline link/bullet emphasis (a "ver más" link, numbered list markers, a bullet, and a "Ver planes" link). These are low-risk (text emphasis, not buttons) but add multiple visible orange accents in one modal alongside any primary CTA. Consider migrating to `text-on-surface`/`font-semibold` for list markers and reserving `text-primary` strictly for the "Ver planes" upgrade link if that is judged the modal's one allowed accent.
2. Radius migration exceeded the spec's ask — zero `rounded-2xl` remain anywhere (fully on the 8/12/16px scale). No action needed; noted as evidence the Parte C migration was thorough.

## Verdict

**PASS WITH WARNINGS**

Token foundation, typography, dark-leftover elimination, shadow/radius migration, and functional wiring are all fully compliant with zero CRITICAL issues. Build is green and only the 4 known pre-existing test failures remain (no regressions). Two non-blocking WARNINGs were found: one accessibility contrast issue (`text-red-400` on light bg in the import flow's error state) and one orange-discipline rule violation (decorative use of `bg-primary` in an operations progress bar). Both are isolated, single-purpose fixes (1-line each) that do not require re-running the re-skin or touching unrelated surfaces. Safe to commit; recommend a small follow-up fix for the two WARNINGs before or shortly after archiving.
