# Apply Progress — import-regime-selector

- **Status:** done
- **Batch:** 1 (all tasks)
- **Date:** 2026-06-22

## Completed tasks

| Task | Status | Notes |
|------|--------|-------|
| T-01 | done | `regimenCourierComercial` rewritten to flat constants on `valor_fob`. DI 20%, TE 3%, IVA 21%. Canonical: USD 1.000 → DI 200, TE 30, IVA 210. |
| T-02 | done | `regimenCourierPersonal` rewritten with flat constants, franchise on `valor_fob`, IVA flat on full `valor_fob`. Added `peso_kg > 50` non-blocking warning. Constants shared (`COURIER_DI_PCT/TE_PCT/IVA_PCT`). |
| T-03 | done | `regimen === 'general'` branch added before the `regimen == null` multi-regime block. Returns `{ regimen_unico:true, regimen:'general', resultado:regimenGeneral(...) }`. Multi-regime block is untouched. |
| T-04 | done | 7 pure-function tests in `__tests__/lib/calculadora/calc-importacion.test.js`. All pass (vitest). Covers: Personal USD 450/380/3001/50kg, Comercial USD 1000, General RI, null→regimenes. |
| T-05 | done | `FORM_VACIO` now includes `regimen: 'courier_personal'`. |
| T-06 | done | `OPCIONES_REGIMEN` constant added. Selector UI rendered in `ValueStep` below `MODOS_ENVIO` block, matching same segmented-button visual pattern. |
| T-07 | done | `mapSimulador` helper added. `generar()` passes `mapSimulador(d.regimen)` to simulador body and `d.regimen` to calc body. |
| T-08 | done | Deep-link reader reads `searchParams.get('regimen') \|\| 'courier_personal'` and passes it to `generar()`. `copiarLink()` in `ImportReport.jsx` adds `regimen` param to the shareable URL. |
| T-09 | done | `resultado` variable replaces `general` — reads `calc.regimen_unico ? calc.resultado : calc.regimenes.general`. All downstream reads (desglose, tributos, costo_total) use `resultado`. The comparador block still reads `r.data?.regimenes?.general?.costo_total` (unchanged). |
| T-10 | done | `LABEL_REGIMEN` map added. Regime badge chip rendered in report header below existing metadata. `copiarLink()` updated. |
| T-11 | done (read-only) | `RequirementsCard` is inline and reads `sim.*` (simulador response), fully data-driven. No code change needed. |
| T-12 | done (read-only) | Origin advisor reads `r.data?.regimenes?.general` (comparador response, always multi-regime). `DISCLAIMER` renders unconditionally. `EntendeTusCostos` guards with `if (!desglose || !valoresBase) return null`. No regressions found. |
| T-13 | done (read-only) | `app/api/calculadora/importacion/route.js` already destructures and forwards `regimen`. No change needed. |
| T-14 | done (read-only) | `app/api/simulador/route.js` has `REGIMENES_VALIDOS = ['general', 'courier', ...]`. Both values present. No change needed. |
| T-15 | done | `npm run build` green. Only pre-existing non-regression issues: `.env.local` EPERM (sandbox), `calculadora/contexto` dynamic route warning. |

## Work unit boundaries (for commit planning)

1. `fix(calc): flat courier math — DI/TE/IVA on valor_fob, franchise on excess (T-01, T-02)`
2. `feat(calc): add general single-result branch (regimen_unico) (T-03)`
3. `test(calc): canonical courier and general regime assertions (T-04)`
4. `feat(importar): regime selector in ValueStep + FORM_VACIO default (T-05, T-06)`
5. `feat(importar): thread regimen through generar() and deep-link (T-07, T-08)`
6. `feat(informe): read regimen_unico result + regime label in header (T-09, T-10)`

## Files changed

| File | Change |
|------|--------|
| `lib/calculadora/calc-importacion.js` | Flat courier constants; Personal IVA flat on valor_fob; peso_kg warning; general branch |
| `app/(app)/importar/ImportarClient.js` | FORM_VACIO regimen; OPCIONES_REGIMEN; mapSimulador; ValueStep selector; generar() wiring; deep-link reader |
| `app/(app)/importar/ImportReport.jsx` | LABEL_REGIMEN; resultado read; regime badge; copiarLink regimen param |
| `__tests__/lib/calculadora/calc-importacion.test.js` | New — 7 pure-function tests, all pass |

## Canonical number assertions (all verified by test)

- Courier Personal USD 450: DI=10, TE=1.5, IVA=94.50, total_tributos=106.00 ✓
- Courier Personal USD 380: DI=0, TE=0, IVA=79.80, total_tributos=79.80 ✓
- Courier Personal USD 3.001: disponible=false ✓
- Courier Personal peso_kg=55: weight warning, calc returns ✓
- Courier Comercial USD 1.000: DI=200, TE=30, IVA=210, total=440 ✓
- General RI: regimen_unico=true, percepciones present ✓
- null regimen: regimenes.{general,courier,pef,correo_upu} present, regimen_unico absent ✓
