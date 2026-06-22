# Verify Report — import-regime-selector

- **Change:** `import-regime-selector`
- **Artifact store:** openspec
- **Verification date:** 2026-06-22
- **Verdict:** PASS WITH WARNINGS

---

## Completeness Table

| Task | Status in tasks.md | Code state | Verdict |
|------|-------------------|------------|---------|
| T-01 | [x] done | `regimenCourierComercial` uses flat constants on `valor_fob` | PASS |
| T-02 | [x] done | `regimenCourierPersonal` uses flat constants, franchise on `valor_fob`, IVA flat on full `valor_fob`, peso_kg > 50 warning | PASS |
| T-03 | [x] done | `regimen === 'general'` branch present before multi-regime block | PASS |
| T-04 | [x] done | 7 pure-function tests in `__tests__/lib/calculadora/calc-importacion.test.js` | PASS |
| T-05 | [x] done | `FORM_VACIO` includes `regimen: 'courier_personal'` | PASS |
| T-06 | [x] done | `OPCIONES_REGIMEN` constant + selector UI in `ValueStep` | PASS |
| T-07 | [x] done | `mapSimulador` helper + both API calls receive `regimen` | PASS |
| T-08 | [x] done | Deep-link reads `regimen` from params; `copiarLink` writes `regimen` | PASS |
| T-09 | [x] done | `resultado` replaces `general`; comparador block unchanged | PASS |
| T-10 | [x] done | `LABEL_REGIMEN` map + regime badge in header + `copiarLink` updated | PASS |
| T-11 | [x] done (read-only) | `RequirementsCard` reads `sim.*` — fully data-driven, no crash | PASS |
| T-12 | [x] done (read-only) | Origin advisor reads `r.data?.regimenes?.general`, `DISCLAIMER` unconditional | PASS |
| T-13 | [x] done (read-only) | Route destructures `pais_origen`, forwards as `pais_origen_iso3` to engine | PASS |
| T-14 | [x] done (read-only) | `REGIMENES_VALIDOS = ['general', 'courier', 'puerta_a_puerta', 'muestras', 'equipaje']` | PASS |
| T-15 | [x] done | Build green — confirmed by this verification | PASS |

All 15 tasks checked. No unchecked tasks.

---

## Test Evidence

```
npx vitest run __tests__/lib/calculadora/calc-importacion.test.js

 RUN  v2.1.9 /Users/pablogastaldi/trade-ai

 ✓ __tests__/lib/calculadora/calc-importacion.test.js (7 tests) 3ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Duration  322ms
```

All 7 canonical test cases pass. Numbers verified:
- Courier Personal USD 450: DI=10, TE=1.5, IVA=94.50, total=106.00 ✓
- Courier Personal USD 380: DI=0, TE=0, IVA=79.80 ✓
- Courier Personal peso_kg=55: warning present, calc returns ✓
- Courier Personal USD 3.001: disponible=false ✓
- Courier Comercial USD 1.000: DI=200, TE=30, IVA=210, percepciones absent ✓
- General RI: regimen_unico=true, percepciones present ✓
- null regimen: regimenes.{general,courier,pef,correo_upu} present, regimen_unico absent ✓

---

## Build Evidence

```
npm run build → green (Dynamic server-side rendered routes all present)
/importar: 14.3 kB (client) — new regime selector included
No TypeScript or lint errors introduced.
```

---

## Spec Compliance Matrix

### courier-tax-engine spec

| Scenario | Spec | Test | Runtime evidence | Status |
|----------|------|------|-----------------|--------|
| Courier Personal below franchise (USD 380) | DI=0, TE=0, IVA=79.80 | Test 2 | PASS | COMPLIANT |
| Courier Personal canonical USD 450 | DI=10, TE=1.5, IVA=94.50, total=106.00 | Test 1 | PASS | COMPLIANT |
| Courier Personal exceeds limit USD 3.001 | disponible=false, warning | Test 4 | PASS | COMPLIANT |
| Courier Personal weight > 50 kg | warning present, calc proceeds | Test 3 | PASS | COMPLIANT |
| Courier Comercial standard USD 1.000 | DI=200, TE=30, IVA=210, no percepciones | Test 5 | PASS | COMPLIANT |
| Courier Comercial > 3.000 | warning present | Not explicitly tested | Source verified | COMPLIANT |
| General single-result branch | regimen_unico=true, percepciones for RI | Test 6 | PASS | COMPLIANT |
| null regimen unchanged | regimenes.{general,courier,pef,correo_upu} | Test 7 | PASS | COMPLIANT |
| Build green | no new errors | npm run build | PASS | COMPLIANT |

### regime-selector spec

| Scenario | Implementation | Status |
|----------|---------------|--------|
| Selector visible with default pre-selected | `OPCIONES_REGIMEN` rendered in `ValueStep`, `FORM_VACIO.regimen = 'courier_personal'` | COMPLIANT |
| User changes regime | `patch({ regimen: op.key })` — no other fields affected | COMPLIANT |
| generar() forwards regimen to both APIs | simulador: `mapSimulador(d.regimen)`, calc: `d.regimen` | COMPLIANT |
| Form initializes with regime default | `FORM_VACIO = { ..., regimen: 'courier_personal' }` | COMPLIANT |
| Navigate back does not lose regime | `data.regimen` lives in parent `useState(FORM_VACIO)` — unchanged on step navigation | COMPLIANT |

### import-report-regime spec

| Scenario | Implementation | Status |
|----------|---------------|--------|
| Single regime cost as primary figure | `resultado = calc?.regimen_unico ? calc.resultado : calc?.regimenes?.general` | COMPLIANT |
| Regime label in header | `LABEL_REGIMEN[regimenActivo]` badge rendered at `ImportReport.jsx:383` | COMPLIANT |
| Requirements match chosen regime | `mapSimulador(d.regimen)` sends correct value to simulador | COMPLIANT |
| Disclaimer always present | `DISCLAIMER` rendered unconditionally at line 547 | COMPLIANT |
| Origin advisor still renders | reads `r.data?.regimenes?.general` from comparador (never regimen_unico path) | COMPLIANT |
| Deep-link includes regimen param | `copiarLink()` calls `params.set('regimen', meta.regimen ?? 'courier_personal')` | COMPLIANT |

---

## Correctness Table

| Check | Result |
|-------|--------|
| IVA base — Courier Personal is flat on valor_fob (NOT compounded) | CONFIRMED: `ivaMonto = r(valor_fob * (COURIER_IVA_PCT / 100))` |
| DI/TE — Courier Personal on excess only | CONFIRMED: `exceso = max(0, valor_fob - 400)` |
| IVA base — Courier Comercial is flat on valor_fob | CONFIRMED: `ivaMonto = r(valor_fob * (COURIER_IVA_PCT / 100))` |
| percepciones absent for both courier paths | CONFIRMED: desglose keys contain only derecho_importacion, tasa_estadistica, iva (+ franquicia for personal) |
| multi-regime block (`regimen == null`) unmodified | CONFIRMED: block at lines 371-403 unchanged; returns `{ regimenes: {general, courier, pef, correo_upu}, mejor_opcion, ahorro_vs_general }` |
| `regimen_unico` absent in null-regime response | CONFIRMED by Test 7 |
| `pais_origen` → `pais_origen_iso3` mapping | CONFIRMED: route.js line 32 reads `pais_origen`, passes `pais_origen_iso3: pais_origen` to engine |
| `mapSimulador` maps both courier subtypes to 'courier' | CONFIRMED: `const mapSimulador = (r) => r === 'general' ? 'general' : 'courier'` |
| T-14: simulador REGIMENES_VALIDOS includes 'courier' and 'general' | CONFIRMED: `['general', 'courier', 'puerta_a_puerta', 'muestras', 'equipaje']` |

---

## Issues

### CRITICAL

None.

---

### WARNING

**W-01 — puerta_a_puerta behavioral change (regression scope: `/calculadora`)**

File: `lib/calculadora/calc-importacion.js:343-355`

The apply agent claimed `puerta_a_puerta` behavior is "identical" after rewiring. This claim is **FALSE**. Quantified delta below.

**Before this change (old behavior):**
`regimenCourierPersonal` used `cif` as the tax base (the original function accepted `{ cif, arancel, tasaEstadistica, iva }` and derived `exceso = max(0, cif - 400)`, `baseIva = exceso + derecho + tasaEst` — compounded).

**After this change (new behavior):**
`puerta_a_puerta` now delegates to the NEW `regimenCourierPersonal({ valor_fob, peso_kg })` which uses:
- `exceso = max(0, valor_fob - 400)` (FOB, not CIF)
- `IVA = 0.21 × valor_fob` (flat, not compounded)

**Concrete delta for valor_fob = USD 1.000, flete estimated at 25% (courier mode) = USD 250:**
```
CIF_old = 1.000 + 250 + 12.50 = 1.262.50 (old base)
exceso_old = max(0, 1262.50 - 400) = 862.50
DI_old = 0.20 × 862.50 = 172.50
TE_old = 0.03 × 862.50 = 25.875 → r = 25.88
baseIva_old = 862.50 + 172.50 + 25.88 = 1.060.88
IVA_old = 0.21 × 1.060.88 = 222.78

total_old = 172.50 + 25.88 + 222.78 = 421.16

CIF_new = same CIF reported in valores_base (unchanged)
exceso_new = max(0, 1.000 - 400) = 600
DI_new = 0.20 × 600 = 120
TE_new = 0.03 × 600 = 18
IVA_new = 0.21 × 1.000 = 210

total_new = 120 + 18 + 210 = 348
```

**Numeric delta: total_tributos drops from ~421 to 348 (-73 USD, -17%) on this example.**

**Blast radius — consumers of `puerta_a_puerta`:**

| Consumer | Path | Sends `regimen: 'puerta_a_puerta'`? | Affected? |
|----------|------|-------------------------------------|-----------|
| `CalculadoraClient.js` | `app/(app)/calculadora/CalculadoraClient.js:48,181` | YES — when user selects it from `REGIMENES_IMPORTACION` | YES — numbers change |
| `SimuladorClient.js` | `app/(app)/simulador/SimuladorClient.js:21` | YES — passed to `/api/simulador` only (not `/api/calculadora`) | NOT AFFECTED — simulador does not call the calculator |
| `ComparadorClient.js` | `app/(app)/comparador/ComparadorClient.js:58` | YES — when user selects it from the comparador regime selector | YES — numbers change |
| Import flow (`ImportarClient.js`) | No `puerta_a_puerta` option in `OPCIONES_REGIMEN` | NO — not exposed to users | NOT AFFECTED |

**Decision needed (do not decide unilaterally):** The change may be an intentional improvement (puerta-a-puerta is legally similar to courier personal — FOB base and flat IVA is arguably more correct) or an out-of-scope regression (the Calculadora and Comparador were using CIF-based compounded IVA; changing this silently alters their outputs for existing users). The spec for this change (`import-regime-selector`) did not address `puerta_a_puerta`; the design only mentioned that `puerta_a_puerta` is NOT in the new import-first flow's `OPCIONES_REGIMEN`.

**Recommendation:** Product owner should confirm whether the new FOB+flat IVA behavior for `puerta_a_puerta` is intentional and acceptable, or whether `puerta_a_puerta` should retain a separate function (distinct from the new `regimenCourierPersonal`) to preserve the old behavior for `CalculadoraClient` users. This is a WARNING, not a CRITICAL, because the change does not break functionality — it changes numbers that may or may not reflect the correct regulation. No user-facing crash; both paths return valid data.

---

**W-02 — CalculadoraClient `puerta_a_puerta` sends `regimen: 'puerta_a_puerta'` but does NOT pass `peso_kg`**

File: `app/(app)/calculadora/CalculadoraClient.js:170,181`

```js
const esCourier = regimen === 'courier_comercial' || regimen === 'courier_personal'
// ...
regimen: regimen \!== 'general' ? regimen : null,
...(esCourier && { peso_kg: Number(form.peso_kg) || null }),
```

`esCourier` is `false` for `puerta_a_puerta`. So when a user selects Puerta a Puerta in the Calculadora, `peso_kg` is never sent. The engine receives `peso_kg = null` and skips the > 50 kg warning. This is a pre-existing issue (the CalculadoraClient predates this change and already had `puerta_a_puerta` as a selectable regime) and the weight warning for `puerta_a_puerta` is non-critical, but it is an inconsistency worth flagging. The flete estimation also uses `TARIFA_KG.courier = 15` when `esCourier` is true — but for `puerta_a_puerta` the engine now classifies `esCourier = true` (line 282), so flete estimation is correct from the engine side. The missing `peso_kg` in the Calculadora payload only means the weight-based flete estimate is never triggered from that client (falls back to 25% FOB). **Pre-existing issue, not introduced by this change.**

---

### SUGGESTION

**S-01 — Courier Comercial `> 3.000` scenario not covered by a test**

The spec (`courier-tax-engine` § Scenario: Value exceeds limit — warning present for Courier Comercial) has no corresponding test case. Only the Personal `> 3.000` case is tested. Low risk since the code path is the same structure; adding a test would improve completeness.

File: `__tests__/lib/calculadora/calc-importacion.test.js`

**S-02 — `puerta_a_puerta` not present in `OPCIONES_REGIMEN` for the import flow — no selector label defined in `LABEL_REGIMEN`**

File: `app/(app)/importar/ImportReport.jsx:13`

`LABEL_REGIMEN` does not include `puerta_a_puerta`. If a deep-link with `regimen=puerta_a_puerta` is crafted and opened, the badge in the report header will render nothing (`LABEL_REGIMEN['puerta_a_puerta']` is `undefined`, and the conditional `{regimenActivo && LABEL_REGIMEN[regimenActivo] && ...}` will correctly suppress the badge). No crash — graceful suppression is already coded. However, the user would not see a regime badge. Minor edge case since `puerta_a_puerta` is not exposed in the import-first flow.

**S-03 — `mapSimulador` maps `puerta_a_puerta` to `'courier'`**

File: `app/(app)/importar/ImportarClient.js:369`

`const mapSimulador = (r) => r === 'general' ? 'general' : 'courier'`

Any non-`'general'` regime including a hypothetical future `puerta_a_puerta` value would map to `'courier'`. This is correct and intentional for the current 3-option selector, but the function has no guard if a new regime key is added that is NOT `'general'` and NOT a courier. Low risk in current scope; worth noting for future extensibility.

---

## Design Coherence

| Design decision | Code state | Status |
|----------------|------------|--------|
| Flat DI 20 / TE 3 / IVA 21 constants for courier | Shared constants `COURIER_DI_PCT/TE_PCT/IVA_PCT` at lines 198-200 | COHERENT |
| `general` branch returns `regimen_unico: true` with `regimenGeneral(...)` | Lines 357-369 | COHERENT |
| Multi-regime block kept as `regimen == null` default | Lines 371-403, unmodified | COHERENT |
| Simulador mapping client-side | `mapSimulador` in ImportarClient.js | COHERENT |
| Report reads `regimen_unico ? resultado : regimenes.general` | ImportReport.jsx:340-341 | COHERENT |
| Selector default `courier_personal` | `FORM_VACIO.regimen = 'courier_personal'` | COHERENT |
| `pais_origen` key mismatch (tasks.md note) | Route accepts `pais_origen`, internally maps to `pais_origen_iso3` — works correctly | COHERENT |

---

## Verdict

**PASS WITH WARNINGS**

- 0 CRITICAL issues
- 2 WARNINGS (W-01: `puerta_a_puerta` behavior change needs product owner confirmation; W-02: pre-existing `peso_kg` not passed for `puerta_a_puerta` in CalculadoraClient)
- 3 SUGGESTIONS (non-blocking)
- All 15 tasks checked
- 7/7 tests passing
- Build green
- All spec scenarios covered and compliant

**Archive readiness:** The change is archivable. W-01 documents a behavioral change to an out-of-scope regime (`puerta_a_puerta`) that should be acknowledged by the product owner. No blocking issues.
