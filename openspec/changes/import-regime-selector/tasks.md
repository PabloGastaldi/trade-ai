# Tasks — Import regime selector (import-regime-selector)

- **Change ID:** `import-regime-selector`
- **Depends on:** `proposal.md`, `specs/`, `design.md`
- **Artifact store:** openspec

Cross-cutting rule: **each work unit leaves `npm run build` green** (best-effort — see env note
below). Each task maps to one commit following `work-unit-commits` conventions. Tasks within a
phase are sequential unless marked **[can run in parallel]**.

> **Env note (trade.ai):** `npm install` is known to fail with EPERM on Windows. Build and test
> steps should be attempted; if EPERM blocks them, record the blocker and leave the gate open for
> the apply agent to re-attempt in a clean shell. Pure-function engine tests do NOT require a
> running server or Supabase — prefer those over integration tests for the canonical number
> assertions.

> **IVA base (confirmed by product owner):** IVA is FLAT on the full value (`baseIva = valor_fob`),
> NOT compounded on DI/TE. `IVA = 0.21 × 450 = 94.5`. All verification and tests MUST assert `94.5`
> and `total_tributos = 106.00`. Spec and design agree.

---

## Phase 1 — Engine fix: flat courier math + `general` single-result branch

**File:** `lib/calculadora/calc-importacion.js`
**Spec:** `courier-tax-engine`
**Sequential — this phase must ship before all others (report and UI depend on correct output).**

- [x] **T-01** Fix `regimenCourierComercial` to use flat constants:
  - Replace `arancel` / `tasaEstadistica` / `iva` params with hardcoded `DI_PCT = 20`,
    `TE_PCT = 3`, `IVA_PCT = 21`.
  - Change the tax base from `cif` to `valor_fob` for DI, TE, and IVA.
  - Remove the compounding `baseIva = cif + derecho + tasaEst` — courier IVA base is
    `valor_fob + DI + TE` (flat, not compounded on CIF).
  - Result shape stays identical (same `desglose` keys); percepciones always 0.
  - Canonical assert: USD 1.000 → `DI = 200`, `TE = 30`, `IVA = 210`.
  - Spec ref: `courier-tax-engine` § Courier Comercial.

- [x] **T-02** Fix `regimenCourierPersonal` to use flat constants + correct franchise + IVA base:
  - Replace `arancel` / `tasaEstadistica` / `iva` params with hardcoded `DI_PCT = 20`,
    `TE_PCT = 3`, `IVA_PCT = 21`.
  - Franchise and excess now measured on **`valor_fob`** (not `cif`):
    `exceso = Math.max(0, valor_fob - 400)`.
  - `DI = DI_PCT/100 × exceso`; `TE = TE_PCT/100 × exceso`.
  - IVA base = **`valor_fob + DI + TE`** (full FOB plus duties on excess):
    `baseIva = valor_fob + DI + TE`; `IVA = 0.21 × baseIva`.
  - No percepciones ever.
  - Add `> 50 kg` non-blocking warning when `peso_kg > 50`:
    push `'El envío supera los 50 kg — verificá con el operador de courier'` to `warnings`.
  - The `peso_kg` value must be threaded into `regimenCourierPersonal` call site in
    `calcularImportacion`.
  - Canonical asserts:
    - USD 450 → `exceso=50`, `DI=10`, `TE=1.5`, `baseIva=450`, `IVA=94.50`,
      `total_tributos=106.00`.
    - USD 380 (below franchise) → `DI=0`, `TE=0`, `baseIva=380`, `IVA=79.80`.
    - USD 3.001 → `disponible:false`, warning «Excede USD 3.000».
  - Spec ref: `courier-tax-engine` § Courier Personal.

- [x] **T-03** Add `regimen === 'general'` single-result branch in `calcularImportacion`:
  - After the existing `courier_comercial` and `courier_personal` branches, add:
    ```js
    if (regimen === 'general') {
      const resultado = regimenGeneral({ cif, arancel, iva, tasaEstadistica,
        condicionIva: condicion_iva, ivaAdicionalBase, percepcionGananciasBase,
        ingresosBrutosBase })
      return {
        regimen_unico: true,
        regimen: 'general',
        ncm,
        valores_base: { fob: valor_fob, flete: fleteEfectivo, seguro, cif,
          flete_estimado: fleteEstimado },
        preferencia_aplicada: preferencia,
        resultado,
        notas,
        warnings: [],
      }
    }
    ```
  - The existing `regimen == null` multi-regime block (lines 357–389) MUST NOT be modified.
    `/comparador` and origin comparison in `ImportReport` depend on `calc.regimenes.general`.
  - Canonical assert: `regimen:'general'` returns `{ regimen_unico:true, resultado: {...} }`;
    `regimen:null` still returns `{ regimenes: { general, courier, pef, correo_upu } }`.
  - Spec ref: `courier-tax-engine` § Régimen General — single-result branch.

- [x] **T-04** Write pure-function unit tests for the three canonical engine scenarios:
  - Stub Supabase to return fixed `{ die:14, te:2, iva:21, iva_ad:0, gan:0, iibb:0 }` so
    tests don't need a live DB (actual rates don't matter; the courier paths ignore them now).
  - Test cases:
    1. Courier Personal USD 450 → `DI=10`, `TE=1.5`, `IVA=94.50`, `total_tributos=106.00`.
    2. Courier Personal USD 380 → `DI=0`, `TE=0`, `IVA=79.80`.
    3. Courier Personal `peso_kg=55` → warning present, calc still returns.
    4. Courier Personal USD 3.001 → `disponible:false`.
    5. Courier Comercial USD 1.000 → `DI=200`, `TE=30`, `IVA=210`, percepciones=0.
    6. `regimen:'general'` → `regimen_unico:true`, percepciones present for RI.
    7. `regimen:null` → `regimenes.general` present, `regimen_unico` absent.
  - Place test file in `__tests__/lib/calculadora/calc-importacion.test.js` (or equivalent
    project test location if one exists).
  - Spec ref: `courier-tax-engine` § Testing Strategy.

---

## Phase 2 — UI: regime selector in `ValueStep` + form wiring

**File:** `app/(app)/importar/ImportarClient.js`
**Spec:** `regime-selector`
**Depends on:** Phase 1 (engine must exist before the selector can send a meaningful regime).
**Sequential within phase.**

- [x] **T-05** Add `regimen: 'courier_personal'` to `FORM_VACIO`:
  - Diff: `const FORM_VACIO = { ncm: '', ncmDescripcion: '', origen: '', origenNombre: '',
    valor: '', flete: '', peso: '', modo: 'maritimo', regimen: 'courier_personal' }`
  - Spec ref: `regime-selector` § `regimen` field in form initial state.

- [x] **T-06** Add `OPCIONES_REGIMEN` constant and the selector UI inside `ValueStep`:
  ```js
  const OPCIONES_REGIMEN = [
    { key: 'courier_personal',  label: 'Courier — uso personal',
      help: 'Franquicia USD 400, hasta USD 3.000. La opción más común.' },
    { key: 'courier_comercial', label: 'Courier — empresa',
      help: 'E-commerce/empresa, hasta USD 3.000. Sin franquicia.' },
    { key: 'general',           label: 'Despacho formal (Régimen General)',
      help: 'Importación formal con despachante, sin tope de valor.' },
  ]
  ```
  - Render the selector as a segmented-button group (same visual pattern as `MODOS_ENVIO`
    in the existing `ValueStep`) directly below the value/freight inputs.
  - Each option shows its `label` and `help` text; the currently selected one has the
    `bg-surface-highest border-on-surface text-on-surface font-medium` active style.
  - On click: `patch({ regimen: key })`.
  - Default (`courier_personal`) is pre-selected on render (comes from `FORM_VACIO`).
  - Spec ref: `regime-selector` § Selector visible with default pre-selected.

- [x] **T-07** Thread `d.regimen` through `generar()` to both API calls:
  - Add `mapSimulador` helper (can be a one-liner):
    `const mapSimulador = (r) => r === 'general' ? 'general' : 'courier'`
  - Simulador body: `regimen: mapSimulador(d.regimen)` (replaces hardcoded `'general'`).
  - Calc body: `regimen: d.regimen` (new field; route already forwards it).
  - Do NOT pass `pais_origen` — the field is already named `pais_origen_iso3` in the engine;
    check the existing calc body for the actual key used (currently `pais_origen` — verify
    against route and fix if needed to `pais_origen_iso3`).
  - Spec ref: `regime-selector` § User submits Step 3 with a regime selected.

- [x] **T-08** Include `regimen` in the deep-link URL and read it on load:
  - In `copiarLink` (ImportReport reads `meta.regimen`): add `params.set('regimen', meta.regimen ?? 'courier_personal')`.
    Note: `copiarLink` lives in `ImportReport.jsx` — coordinate with T-10 so both files
    add the param together; keep them in the same commit if touched simultaneously.
  - In the `useEffect` deep-link reader in `ImportarClient.js`: read
    `searchParams.get('regimen') || 'courier_personal'` and pass it as `regimen` in the
    `generar({...})` call.
  - Spec ref: `import-report-regime` § Deep-link sharing includes regime param.

---

## Phase 3 — Report: render `regimen_unico` result

**File:** `app/(app)/importar/ImportReport.jsx`
**Spec:** `import-report-regime`
**Depends on:** Phase 1 (engine shape) + Phase 2 (meta.regimen available in report).
**Sequential within phase.**

- [x] **T-09** Change `ImportReport`'s cost-data read to handle `regimen_unico`:
  - Current line: `const general = calc?.regimenes?.general ?? null`
  - Replace with:
    ```js
    const resultado = calc?.regimen_unico ? calc.resultado : (calc?.regimenes?.general ?? null)
    const regimenActivo = calc?.regimen ?? null
    ```
  - Replace all downstream reads of `general` with `resultado` (desglose, total_tributos,
    costo_total, effective_rate, disponible, warnings).
  - The multi-regime comparison block used by `OriginAdvisorCard` and the `comparacion`
    fetch STILL reads `r.data?.regimenes?.general?.costo_total` — this is the comparador
    response shape (never a `regimen_unico` response) so it must NOT be changed.
  - Spec ref: `import-report-regime` § Costo total puesto en Argentina.

- [x] **T-10** Show the active regime label in the report header; update deep-link to include `regimen`:
  - Add a `LABEL_REGIMEN` map:
    ```js
    const LABEL_REGIMEN = {
      courier_personal:  'Courier — uso personal',
      courier_comercial: 'Courier — empresa',
      general:           'Despacho formal (Régimen General)',
    }
    ```
  - In `CostHero` (or the report card header), render a small badge/chip showing
    `LABEL_REGIMEN[regimenActivo]` so the user can confirm the regime they are reading.
    Use the same `text-on-surface-variant` / `bg-surface-2` style used for other metadata
    chips; keep it below the hero cost figure, not overlapping it.
  - In `copiarLink`: add `params.set('regimen', meta.regimen ?? 'courier_personal')`.
  - Spec ref: `import-report-regime` § Regime label visible in report header +
    Deep-link sharing includes regime param.

- [x] **T-11** Verify `RequirementsCard` no-ops or renders correctly for courier regime:
  - The simulador now receives `regimen: 'courier'` (from `mapSimulador`) for both courier
    variants. Confirm `RequirementsCard` renders the sim data it receives without crashing.
  - If the component hard-codes anything regime-specific, adjust it to be data-driven.
  - No new UI state needed — the simulador API already returns the correct requirements for
    the mapped regime.
  - Spec ref: `import-report-regime` § Requirements match the chosen regime.

- [x] **T-12** Regression check: origin advisor + disclaimer still render with `regimen_unico`:
  - `OriginAdvisorCard` reads `calc?.regimenes?.general` for the current-origin cost (this
    remains valid when `regimen_unico` is present — the comparador calls use `null` regime).
  - Verify `DISCLAIMER` renders unconditionally (it already does; confirm no gating was added).
  - Verify `EntendeTusCostos` either receives `resultado.desglose` or gracefully returns null
    (it already guards with `if (!desglose || !valoresBase) return null`).
  - This is a review/read task; code change only if a regression is found.
  - Spec ref: `import-report-regime` § No regression on existing report capabilities.

---

## Phase 4 — Build gate + API route verification

**[T-13 and T-14 can run in parallel]**

- [x] **T-13** Verify `app/api/calculadora/importacion/route.js` pass-through (read-only):
  - Confirm `regimen` is destructured from the request body and forwarded to
    `calcularImportacion`. If it is absent, add the destructure + forward (no other change).
  - Spec ref: `courier-tax-engine` § Régimen General — General regime result survives build.

- [x] **T-14** Verify `app/api/simulador/route.js` accepts `'courier'` and `'general'` (read-only):
  - Confirm `REGIMENES_VALIDOS` includes `'courier'` and `'general'` (design confirms it does).
  - Confirm it does NOT need to accept `'courier_personal'` / `'courier_comercial'` directly
    (mapping is done client-side in `generar()`).
  - No code change expected; if `REGIMENES_VALIDOS` is missing `'courier'`, add it.
  - Spec ref: `regime-selector` § User submits Step 3 with a regime selected.

- [x] **T-15** Build gate — `npm run build` green:
  - Run `npm run build` and confirm zero new TypeScript / lint errors.
  - Best-effort: if EPERM blocks install, record the error and leave the gate open for CI.
  - Any pre-existing failures (known 4 test failures from `import-first-redesign`) do NOT
    count as regressions.
  - Spec ref: `courier-tax-engine` § General regime result survives build.

---

## Dependency graph

```
T-01 ──┐
T-02 ──┤──> T-04 (tests)
T-03 ──┘
         │
         ▼
T-05 ──> T-06 ──> T-07 ──> T-08
                              │
                              ▼
                  T-09 ──> T-10 ──> T-11 ──> T-12
                                               │
                              T-13 ──────────> T-15
                              T-14 ──────────> T-15
```

Phases 1–3 are strictly sequential. T-13/T-14 can be done any time after Phase 1 and run
in parallel with each other. T-15 is the final gate.

---

## Review Workload Forecast

| File | Estimated changed lines |
|------|------------------------|
| `lib/calculadora/calc-importacion.js` | ~60 (regimenCourierComercial rewrite ~15, regimenCourierPersonal rewrite ~20, general branch ~20, call-site peso_kg thread ~5) |
| `app/(app)/importar/ImportarClient.js` | ~45 (FORM_VACIO +1, OPCIONES_REGIMEN +12, ValueStep selector ~20, generar() wiring ~10, deep-link read ~3) |
| `app/(app)/importar/ImportReport.jsx` | ~30 (cost read swap ~5, LABEL_REGIMEN map +8, regime badge ~8, copiarLink +1, minor guards ~8) |
| `app/api/calculadora/importacion/route.js` | ~0–3 (verify only; change only if regimen not forwarded) |
| `app/api/simulador/route.js` | ~0–3 (verify only) |
| `__tests__/lib/calculadora/calc-importacion.test.js` | ~80 (new file — 7 test cases × ~11 lines each) |

**Total estimated additions:** ~220 lines
**Total estimated deletions:** ~30 lines
**Net changed lines:** ~250

- **Chained PRs recommended: No** — change fits comfortably under the 400-line budget.
- **400-line budget risk: Low** — ~250 net changed lines including the new test file.
- **Decision needed before apply: No** — single PR is appropriate. All phases can land in
  one PR with work-unit commits (one commit per phase/task group).

**Suggested commit sequence (single PR):**
1. `fix(calc): flat courier math + IVA-on-full-base for Personal and Comercial`
2. `feat(calc): add general single-result branch (regimen_unico)`
3. `test(calc): canonical courier and general regime assertions`
4. `feat(importar): regime selector in ValueStep + FORM_VACIO default`
5. `feat(importar): thread regimen through generar() and deep-link`
6. `feat(informe): read regimen_unico result + regime label in header`
