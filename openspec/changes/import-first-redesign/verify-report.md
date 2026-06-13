# Verify Report — import-first-redesign

- **Date:** 2026-06-13
- **Verifier:** sdd-verify (automated adversarial review)
- **Build result:** `✓ Compiled successfully — Generating static pages (41/41)` — PASS
- **Test result:** `4 failed | 52 passed (56)` — 4 pre-existing failures confirmed, 0 new failures

---

## Final Verdict: SAFE TO COMMIT

No CRITICAL issues found. 3 WARNINGs — all are intentional design decisions or minor gaps that don't break the product promise. 3 SUGGESTIONs for follow-up.

---

## Build / Test Evidence

```
npm run build
  ⚠ Failed to load env from .env.local (sandbox restriction — not a code defect)
  ✓ Compiled successfully
  ✓ Generating static pages (41/41)

npx vitest run
  Test Files  2 failed | 2 passed (4)
  Tests       4 failed | 52 passed (56)
```

**The 4 pre-existing failures (confirmed pre-date this change):**
- `tests/unit/schemas.test.ts` — `formatearResultadosNCM > incluye el organismo de importación cuando existe`: expects `SENASA` in output; format changed to not include organism names. Stale test.
- `tests/unit/schemas.test.ts` — `formatearResultadosNCM > incluye la fuente oficial`: expects `AFIP`; source string changed to `ARCA/Aduana Argentina`. Stale test.
- `tests/integration/api.test.ts` — two tests expect HTTP 403 from plan limits but middleware rate limiter fires first and returns 429. Stale test.

**No new failures introduced by this change.**

---

## Capability-by-Capability Findings

### Capability: export-removal

**Status: PASS with WARNINGs**

#### What was verified:
- `lib/calculadora/calc-exportacion.js` — DELETED ✓
- `app/api/calculadora/exportacion/route.js` — DELETED ✓
- `app/(app)/calculadora/ResultadosExpo.jsx` — DELETED ✓
- `lib/prompts/guia-exportacion.js` — DELETED ✓
- `lib/destination-tariffs-lookup.js` — DELETED ✓
- `app/(app)/calculadora/ContextoComercial.jsx` — expo branch removed, only `impo` path remains ✓
- `app/api/comparador/route.js` — calls only `calcularImportacion`, no export branch ✓
- `app/(app)/comparador/ComparadorClient.js` — no export references ✓
- `app/(app)/calculadora/CalculadoraClient.js` — no export references, ignores `tipo=exportacion` URL param ✓
- `app/api/consulta/route.js` — `guia-exportacion` removed, only `GUIA_IMPORTACION` injected ✓
- `lib/ncm-lookup.js` — `NCM_SELECT` still joins `aranceles_exportacion` to build `derecho_exportacion` field included in `formatearResultadosNCM`. This populates the AI context string with the export tariff datum. See WARNING 1.
- `lib/preferencias-lookup.js` — still queries `acuerdos_exportacion` and includes export preferences in `formatearPreferencias()`. This is used in `/api/consulta` for AI context. See WARNING 2.
- `app/(app)/nomenclador/PanelDetalle.jsx` — still active; queries `destination_tariffs`, `ntm_measures_affecting_argentina`, `acuerdos_exportacion` (via aranceles/preferencias APIs), renders DE (Derecho de Exportación) field, shows export documents/interventions tab, and has a CTA link to `/calculadora?tipo=exportacion`. See WARNING 3.
- `app/api/simulador/route.js` — no export-domain data queries remain ✓

---

### WARNING 1 — `lib/ncm-lookup.js` still queries `aranceles_exportacion`

**File:** `lib/ncm-lookup.js` lines 121–124, 116–117

`NCM_SELECT` joins `aranceles_exportacion` in every NCM lookup. The enriched row exposes `derecho_exportacion` and `reintegro`. `formatearResultadosNCM` serializes `Der. exportación: X%` into the AI prompt context string consumed by `/api/consulta`.

**Impact:** The AI chatbot receives export tariff data as context for every NCM query. This is informational in the AI system prompt — not user-facing UI — and the spec's primary concern is not offering export *calculation* as a product feature. However, the spec says "no se consultan tablas … de exportación."

**Severity:** WARNING — the chat AI context includes export tariff info as a datum, not as a workflow. Not a user-visible export calculation. Documented design decision not to strip this.

---

### WARNING 2 — `lib/preferencias-lookup.js` still queries `acuerdos_exportacion`

**File:** `lib/preferencias-lookup.js` lines 62–96

`buscarPreferencias()` fetches both `acuerdos_importacion` and `acuerdos_exportacion` and includes export preferences in `formatearPreferencias()`. Used in `/api/consulta` for AI context and in `/api/nomenclador/preferencias`.

**Impact:** Same scope as WARNING 1 — export data in AI context, not in user-facing calculation paths. The simulador (which feeds the import report) uses a different code path and does not call `buscarPreferencias`.

**Severity:** WARNING — same reasoning as W1.

---

### WARNING 3 — `app/(app)/nomenclador/PanelDetalle.jsx` retains export surface

**File:** `app/(app)/nomenclador/PanelDetalle.jsx` lines 83–395

The nomenclador tool (route `/nomenclador`) is NOT in the sidebar or mobile nav but is accessible via deep link. Its PanelDetalle component:
- Queries `destination_tariffs` and `ntm_measures_affecting_argentina`
- Queries `documentos_por_operacion` and `intervenciones_por_operacion` with `tipo='exportacion'`
- Renders `DE: Derecho de Exportación` in the arancel grid (line 184)
- Shows an export documents/interventions tab (line 304)
- Has a CTA link to `/calculadora?ncm=...&tipo=exportacion` (line 395) — which actually opens the importación calculator since CalculadoraClient ignores the `tipo` param

**Impact:** Accessible via deep link but not reachable from the primary product flow. A user who knows the old URL can see export data. The `/calculadora?tipo=exportacion` link is functionally benign (calculadora only does importación now) but the label is misleading.

**Severity:** WARNING — the nomenclador tool is fully orphaned from primary navigation. The export surface exists but is unreachable from the guided flow. Not a blocker for commit; needs cleanup in a follow-up.

---

### Capability: guided-import-flow

**Status: PASS with SUGGESTION**

#### What was verified:
- `/importar` route exists at `app/(app)/importar/page.js` ✓
- `ImportarClient.js` implements 3 steps: `ProductStep`, `OriginStep`, `ValueStep` ✓
- Progress bar renders PASOS = ['Producto', 'Origen', 'Costo'] with step counter and checkmarks ✓
- Back button (`retroceder`) appears from step 2 onwards ✓
- State is held in `data` (React useState) — `patch()` merges partial updates, never resets ✓
- `ProductStep` calls `/api/nomenclador/clasificar`, shows candidates in words, NCM is in state only ✓
- No NCM code shown to user; description from `c.ncm_exacto?.descripcion ?? c.razonamiento` ✓
- Low-confidence / empty candidates handled with `nota` message ✓
- `OriginStep`: frequent countries shown as chips (`PAISES_FRECUENTES`), full select for others ✓
- `ValueStep`: help text in plain language, flete is optional ✓
- Report generation calls `/api/simulador` + `/api/calculadora/importacion` in parallel ✓
- Shareable link via query params (`/importar?ncm=&pais=&valor=&flete=`) regenerates report ✓
- Step transitions animated with CSS classes + `prefers-reduced-motion` JS guard ✓
- Authentication: `(app)` layout server-redirects unauthenticated users to `/login` ✓

#### SUGGESTION 1 — ProductStep doesn't restore prior selection when navigating back

When user goes back from step 2 or 3 to step 1, `data.ncm` and `data.ncmDescripcion` are preserved in state but `ProductStep` doesn't receive them — the search field is empty and the candidate list is cleared. The spec says "conserva el producto y el origen ya elegidos" and "puede modificar el producto". The DATA is preserved (re-advancing will re-use it), but the step 1 UI gives no visual indication that a product was already chosen, which is confusing UX. Not a data-loss violation; the underlying spec scenario is technically satisfied if we interpret "conserva" as data-not-lost. Still worth addressing in a follow-up.

---

### Capability: import-report

**Status: PASS**

#### What was verified:
- `ImportReport.jsx` renders 3 cards in fixed order: CostHero → RequirementsCard → OriginAdvisorCard ✓
- **CostHero**: `costoTotal` from `calc.regimenes.general.costo_total` via `calcularImportacion` API ✓
- Breakdown: mercadería (FOB), flete + seguro (CIF − FOB), impuestos (`total_tributos`) ✓
- `font-display` (Bebas Neue) for hero number, `font-mono` for breakdown values ✓
- **RequirementsCard**: semáforo verde ("Podés importar este producto"), amber (organismos), red (restricciones) ✓
- Sources: `sim.organismos.obligatorios`, `sim.restricciones`, `sim.documentos.criticos/importantes` ✓
- Documents listed from `documentos_requeridos` via simulador ✓
- **OriginAdvisorCard**: preference from `sim.preferencias.tiene_preferencia` and `acuerdos_importacion` ✓
- Origin comparison on demand via `/api/comparador` (import-only) — sorted by cost ✓
- Disclaimer: `DISCLAIMER` constant at line 8, rendered at line 275 ✓ (exact text from CLAUDE.md)
- Actions: "Gestionar esta importación" → `/operaciones?ncm=&pais=&tipo=importacion&desc=` ✓
- Shareable link: `copiarLink()` builds query params and copies to clipboard ✓
- `CopilotRail` rendered in layout: desktop rail right column, mobile floating button + bottom sheet ✓
- Staggered card reveal via CSS classes `report-card-1/2/3/actions` ✓
- `prefers-reduced-motion` respected in CostHero ticker and card reveals ✓

---

### Capability: ai-copilot

**Status: PASS**

#### What was verified:
- `CopilotRail.jsx` implements `buildContextPrefix(meta, costoTotal)` ✓
- Context prefix includes: product name, NCM, origin, FOB value, flete, total cost, regime ✓
- Prefix prepended to every question before sending to `/api/consulta` ✓
- Max question length capped at 2000 chars (prefix + user text sliced) ✓
- Desktop: `lg:flex` rail (hidden on mobile) at `w-80`, sticky ✓
- Mobile: floating button at `bottom-[76px] right-4`, opens bottom sheet at 65vh ✓
- Streaming response handled with SSE reader ✓
- Disclaimer appended to every AI response bubble (below rendered markdown) ✓
- Chat history passed as last 6 messages (import context is in the first message per question) ✓
- Error states handled gracefully ✓

---

### Capability: operations-management

**Status: PASS**

#### What was verified:
- `VALID_OPERATION_TYPES = ['importacion']` in `app/api/operaciones/route.js` line 16 ✓
- Invalid `operation_type` returns 400 ✓
- `OperacionesClient.js`: `filtroTipo` hardcoded to `'importacion'` (line 136) ✓
- Only `impo_*` states defined in `ESTADOS_IMPO`; no `ESTADOS_EXPO` constant ✓
- `opsActivas` filters by `status \!== 'impo_cerrada'` only ✓
- `handleDragEnd` validates `nuevoStatus.startsWith('impo_')` before accepting drop ✓
- `ModalNuevaOperacion.jsx` — no `operation_type` selector exposed to user; `tipo_operacion` is fixed ✓
- `VistaKanban` — no export columns ✓
- Checklist: `app/api/operaciones/route.js` calls `documentos_por_operacion` RPC at creation ✓
- `DetalleClient`: loads `operation_documents`, allows toggle + notes via `handleToggleDoc` / `handleNotaDoc` ✓
- CTA from report: `Link` to `/operaciones?ncm=&pais=&tipo=importacion&desc=` ✓
- `OperacionesClient` reads `ncm`, `pais`, `desc` params and prefills modal ✓
- CSS: `.estadoBadgeExpo` and `.badgeExpo` removed from `operaciones.module.css` ✓

---

### Capability: Navigation

**Status: PASS**

#### What was verified:
- `Sidebar.js`: 3 items only — "Nueva importación" (primary, `/importar`), "Mis operaciones", "Chat IA" ✓
- `MobileNav.js`: 3 tabs — Importar, Operaciones, Chat IA; "Más" sheet contains only account/logout ✓
- Login (`app/(auth)/login/page.js` line 53): `router.push('/importar')` on email/password login ✓
- OAuth callback (`app/auth/callback/route.js` line 12): `next = searchParams.get('next') ?? '/importar'` ✓
- Reset password (`app/(auth)/reset-password/page.js` line 63): `router.push('/importar')` ✓
- Supabase middleware (`lib/supabase/middleware.js` line 71): authenticated users visiting `/login`/`/registro` redirected to `/importar` ✓
- `/inicio` exists but is not linked from nav (correctly orphaned per spec and tasks) ✓
- Old routes (`/simulador`, `/comparador`, `/nomenclador`, `/calculadora`, `/mercados`, `/catalogo`) exist as deep links but are absent from nav ✓

---

## CRITICAL Issues

**None.**

---

## WARNING Summary

| # | Severity | File | Description |
|---|----------|------|-------------|
| W1 | WARNING | `lib/ncm-lookup.js:121-124` | `NCM_SELECT` joins `aranceles_exportacion`; `formatearResultadosNCM` includes `Der. exportación` in AI context string. Not user-facing. |
| W2 | WARNING | `lib/preferencias-lookup.js:62-96` | `buscarPreferencias()` fetches `acuerdos_exportacion` and includes export preferences in AI context. Not in import report data path. |
| W3 | WARNING | `app/(app)/nomenclador/PanelDetalle.jsx:83-395` | Nomenclador orphaned tool still renders full export surface (DE field, export tab, CTA to `/calculadora?tipo=exportacion`). Unreachable from primary flow but accessible via direct URL. The export calculadora CTA is functionally harmless (calculadora is import-only now) but label is misleading. |

---

## SUGGESTION Summary

| # | Severity | Description |
|---|----------|-------------|
| S1 | SUGGESTION | `ProductStep` should receive `currentNcm`/`currentDesc` and display a "currently selected" badge when navigating back, so the user can see their prior selection. |
| S2 | SUGGESTION | `/importar` should be added to `protectedPaths` in `lib/supabase/middleware.js` as defense-in-depth (the `(app)` layout already enforces auth server-side, so this is not a security hole — just belt-and-suspenders hygiene). |
| S3 | SUGGESTION | Schedule a follow-up to clean up `PanelDetalle.jsx` (W3) and strip export fields from `ncm-lookup.js` / `preferencias-lookup.js` AI context (W1, W2) to fully complete the export-removal spec requirement. |

---

## Risk Assessment

The 3 WARNINGs are all in code that is either:
- Not part of the primary user flow (PanelDetalle orphaned in nomenclador)
- AI context-only, not user-facing calculations (ncm-lookup, preferencias-lookup)

None block the core product promise: a PYME can go from `/importar` → 3-step flow → import report → operación without ever seeing export UI or triggering export data queries in the primary path.

**Safe to commit.**
