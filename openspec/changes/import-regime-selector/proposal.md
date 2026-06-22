# Proposal — Import regime selector (import-regime-selector)

- **Change ID:** `import-regime-selector`
- **Status:** proposal
- **Date:** 2026-06-22
- **Depends on:** `import-first-redesign` (v2)
- **Artifact store:** openspec
- **Language note:** Artifact in English. UI labels/copy specified here are Spanish (Argentina) because we extend an existing Spanish product.

---

## 1. Problem

The guided flow `/importar` hides the import regime entirely: `generar()` hardcodes
`regimen: 'general'` to the simulador and passes NO `regimen` to the calculator, so the
report renders a generic multi-regime comparison instead of one correct cost. The regime
materially changes landed cost — a flat courier tariff vs. full formal clearance with the
real NCM duty + percepciones — yet the user never chooses it. Worse, the courier math is
wrong: `regimenCourierComercial` / `regimenCourierPersonal` use REAL NCM rates (courier
pays a FLAT tariff, no NCM position) and Personal exempts the USD 400 franchise from IVA
(IVA must apply to the FULL value). Target users (occasional PYME importers) get a number
that does not match the regime they will actually use.

## 2. Decision

Add an explicit regime selector to the cost step and align the engine to the confirmed
tax rules. The user picks **Courier Personal**, **Courier Comercial**, or **Régimen
General**; the report shows the single correct cost for that regime, and the requirements
panel (documentos / organismos / restricciones) follows the same regime.

## 3. Confirmed business rules (the contract — do not deviate)

| Regime | Tariff | Franchise | IVA base | Percepciones | Limit |
| --- | --- | --- | --- | --- | --- |
| **Courier Personal** (DSC) | FLAT DI 20% + TE 3% on **excess over USD 400** only | USD 400 (no DI/TE below) | IVA 21% on **FULL value** | **Never** | ≤ USD 3.000; warn if weight > 50 kg |
| **Courier Comercial** (DIS) | FLAT DI 20% + TE 3% + IVA 21% | None | per flat tariff | **Never** | ≤ USD 3.000 |
| **Régimen General** | Real NCM arancel + percepciones per `condicion_iva` | n/a | current `regimenGeneral` behavior | per `condicion_iva` | none — keep unchanged |

**Worked example (encode as test):** value USD 450, Courier Personal → IVA 21% on the full
450; DI 20% + TE 3% only on the 50 of excess. Below 400: IVA only, no DI/TE.

## 4. Scope

### In scope
- Regime selector in `ValueStep` with Spanish (AR) human labels + one-line help each.
  Suggested copy (design refines): «Courier — uso personal», «Courier — empresa»,
  «Despacho formal (Régimen General)».
- `regimen` field in `FORM_VACIO`; thread it from `ValueStep` → `generar()`.
- Pass the selected `regimen` to BOTH `/api/calculadora/importacion` AND `/api/simulador`.
- Fix `regimenCourierComercial` → flat 20/3/21 (not NCM rates).
- Fix `regimenCourierPersonal` → flat 20/3 on excess; IVA 21% on full value; add > 50 kg warning.
- Add a coherent single-regime (`regimen_unico`) result for `general` so the report renders one regime.
- `ImportReport.jsx` renders the chosen single regime.

### Out of scope (non-goals)
- The standalone `/calculadora`, `/comparador`, `/simulador` page UIs.
- Export tables and any export logic.
- Reworking the multi-regime comparison block beyond what the new `general` branch needs.
- The `puerta_a_puerta`, `correo_upu`, `pef` regimes (not offered in this selector).

## 5. Approach

- **UI:** `ValueStep` gains a 3-option selector (default Personal, the common PYME case);
  selection stored in form state, hidden customs jargon softened by the help line.
- **Wiring:** `generar()` reads `d.regimen` and forwards it to both API calls. The
  simulador requirements panel then matches the chosen regime.
- **Engine:** courier functions switch to FLAT constants (DI 20 / TE 3 / IVA 21). Personal
  recomputes `baseIva` on the full value (not `exceso + derecho + tasaEst`) and pushes a
  `> 50 kg` warning. Add a `regimen === 'general'` single-result branch returning the
  existing `regimenGeneral` shape as `regimen_unico`.

## 6. Affected areas

| Area | Impact | Description |
| --- | --- | --- |
| `app/(app)/importar/ImportarClient.js` | Modified | `regimen` in form state + selector wiring + both API calls |
| `app/(app)/importar/ImportReport.jsx` | Modified | render selected single regime (`regimen_unico`) |
| `lib/calculadora/calc-importacion.js` | Modified | flat courier math, Personal IVA-on-full + franchise, > 50 kg warning, `general` single branch |
| `app/api/calculadora/importacion` | Modified | accept/forward `regimen` (verify pass-through) |
| `app/api/simulador` | Modified | accept selected `regimen` for requirements (verify pass-through) |

## 7. Open decisions for design (do not resolve here — surface)

- **IVA base, Courier Personal:** IVA 21% on full CIF only, or on (full CIF + DI/TE on excess)?
  Customs IVA normally compounds on CIF+DI+TE; user wording implies IVA on full value with
  DI/TE on excess. Design decides.
- **Franchise/limit base:** USD 400 franchise and USD 3.000 limit on FOB or CIF? Current
  code mixes them (franchise on CIF, limit on FOB). Design must pick one consistently.

## 8. Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Courier math diverges from confirmed rules | Med | Encode the USD 450 worked example as a test; flat constants, no NCM rates |
| `general` selection still falls through to multi-regime block | Med | Add explicit `regimen_unico` branch for `general`; report reads `regimen_unico` |
| Percepciones leak into a courier result | Low | Courier paths never call percepciones; assert in tests |
| Simulador requirements mismatch the chosen regime | Low | Thread the same `regimen` to the simulador call |

## 9. Rollback plan

Single feature branch. Revert is: restore the hardcoded `regimen: 'general'` in
`generar()`, drop the `regimen` field from `FORM_VACIO` and `ValueStep`, and `git revert`
the `calc-importacion.js` changes. No DB migration, no data change — rollback is code-only.

## 10. Success criteria

- [ ] User picks Personal / Comercial / General in `ValueStep`; default is Personal.
- [ ] Courier Comercial returns FLAT DI 20 + TE 3 + IVA 21, no percepciones.
- [ ] Courier Personal returns flat DI/TE on excess over 400, IVA 21% on full value, no percepciones.
- [ ] USD 450 example matches the worked numbers in a passing test.
- [ ] `> 50 kg` produces a warning for Courier Personal.
- [ ] Selecting General returns a single `regimen_unico` result (not the comparison block).
- [ ] The report and the simulador requirements panel both reflect the chosen regime.
- [ ] `npm run build` is green; no new test failures.

## 11. Next artifacts

- `specs/` — requirements + Given/When/Then scenarios per capability.
- `design.md` — resolves the two open decisions; engine + UI design.
- `tasks.md` — implementation checklist.
