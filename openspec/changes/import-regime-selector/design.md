# Design — Import regime selector (import-regime-selector)

- **Change ID:** `import-regime-selector` · **Artifact store:** openspec · **Depends on:** `import-first-redesign`
- **Language:** Design in English; UI copy/labels are Spanish (Argentina).
- **Specs:** `regime-selector`, `courier-tax-engine`, `import-report-regime`.

## Technical Approach

Thread an explicit `regimen` through the existing single-thread flow `ValueStep → generar() → {calc, simulador}`. The calc route ALREADY accepts and forwards `regimen` (no route change for pass-through); the engine ALREADY has `regimen_unico` branches for the two courier regimes. The work is: (1) correct the courier math to flat constants, (2) add a `general` single-result branch, (3) make `ImportReport.jsx` read the `regimen_unico` shape (today it only reads `calc.regimenes.general`), (4) map the courier keys to a simulador-accepted regime, (5) add the selector to `ValueStep` + `FORM_VACIO`. The legacy multi-regime block stays untouched for `/comparador` and the report's origin comparison.

## Resolved Decisions (money — authoritative)

### Decision 1 — IVA base, Courier Personal
**Choice (confirmed by product owner):** `baseIva = valor` (the full declared goods value). IVA = 21% of the value, FLAT — it does NOT compound on DI/TE. DI/TE apply only to the excess over USD 400; IVA applies to the full value.
**Alternative considered:** compound `baseIva = valor + DI + TE` (formal-clearance mechanic). Rejected — the product owner confirmed the simplified courier reading: "el IVA se cobra sobre el valor del producto" (value 450 → IVA over 450, aranceles only over the 50 of excess).
**Rationale:** Courier is a simplified regime; the owner's explicit rule is IVA flat on the declared value with DI/TE on the excess only. Authoritative over the formal compounding mechanic.

**Formulas (Courier Personal):** `exceso = max(0, valor − 400)` · `DI = 0.20 × exceso` · `TE = 0.03 × exceso` · `baseIva = valor` · `IVA = 0.21 × valor` · percepciones = 0.

**Canonical example — value USD 450 (assert in test):**
`exceso = 50` · `DI = 10` · `TE = 1.5` · `IVA = 0.21 × 450 = 94.50` · `total_tributos = 10 + 1.5 + 94.50 = 106.00`.
**Below franchise (USD 380):** `DI = 0`, `TE = 0`, `IVA = 0.21 × 380 = 79.80`, `total_tributos = 79.80`.

> Note: this MATCHES the `courier-tax-engine` spec's canonical `IVA = 94.5`. Spec and design agree; no override.

### Decision 2 — FOB vs CIF for thresholds and tax base
**Choice:** Both the USD 3.000 limit AND the USD 400 franchise/excess are measured on the **declared goods value** (`valor_fob`). The flat tax base is also `valor_fob` (NOT CIF) for both courier regimes.
**Alternatives:** keep the current mix (limit on FOB, franchise/tax on CIF).
**Rationale:** Courier value limits are legally on goods value (FOB). Using `valor_fob` for the franchise too removes estimated-flete/seguro noise, makes the canonical example deterministic, and matches what the user actually typed. General keeps CIF (real formal clearance). This is why courier numbers are clean integers and assertable.

> Engine change: courier functions stop deriving `exceso`/base from `cif`; they use `valor_fob`. CIF is still reported in `valores_base` for display.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Courier tariff source | FLAT `DI 20 / TE 3 / IVA 21` constants; drop DB `arancel/te/iva` for courier | Courier pays a fixed tariff, has no NCM position; current real-rate math is wrong |
| `general` single result | New `if (regimen === 'general')` branch returning `regimenGeneral(...)` as `{ regimen_unico:true, regimen:'general', resultado }` | Report needs ONE regime; avoids multi-regime fall-through |
| Multi-regime block | Keep as the default (`regimen == null`) path | `/comparador` + report origin comparison depend on `calc.regimenes.general` |
| Simulador regime mapping | Map `courier_personal`/`courier_comercial` → `'courier'`; `general` → `'general'` before the `/api/simulador` call | Simulador `REGIMENES_VALIDOS` = `['general','courier','puerta_a_puerta','muestras','equipaje']` — courier keys would 400 |
| Report read shape | `ImportReport` reads `calc.regimen_unico ? calc.resultado : calc.regimenes.general` | Today it reads only `regimenes.general`; courier results render blank |
| Selector default | `courier_personal` | Most common occasional-PYME case (proposal) |

## Data Flow

    ValueStep (regimen selector) ──patch({regimen})──> data.regimen
        │
    generar(d)
        ├─> /api/simulador      { codigo_ncm, pais_iso3, regimen: mapSimulador(d.regimen) }
        └─> /api/calculadora/importacion { ncm_code, valor_fob, regimen: d.regimen, peso_kg, modo, ... }
                                            │
                                  calcularImportacion(regimen)
                                   ├─ 'courier_personal'  -> flat DI/TE on excess, IVA flat on valor  -> regimen_unico
                                   ├─ 'courier_comercial' -> flat DI/TE/IVA on valor_fob               -> regimen_unico
                                   ├─ 'general'           -> regimenGeneral(...)                       -> regimen_unico
                                   └─ null (comparador)   -> {regimenes:{general,courier,pef,correo_upu}}  (unchanged)
        │
    ImportReport: regimen_unico ? resultado : regimenes.general

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/calculadora/calc-importacion.js` | Modify | Flat constants in `regimenCourierComercial`/`regimenCourierPersonal` (base = `valor_fob`); Personal `baseIva = valor_fob` (IVA flat on value, DI/TE on excess only); `> 50 kg` warning for Personal; add `regimen === 'general'` single branch returning `regimenGeneral` as `regimen_unico` |
| `app/(app)/importar/ImportarClient.js` | Modify | Add `regimen:'courier_personal'` to `FORM_VACIO`; regime selector in `ValueStep`; `generar()` forwards `d.regimen` to calc and `mapSimulador(d.regimen)` to simulador; deep-link `generar({...})` includes `regimen` (default if absent) |
| `app/(app)/importar/ImportReport.jsx` | Modify | Read `regimen_unico`/`resultado`; regime label in header; gate multi-regime-only logic; add `regimen` to shareable URL params |
| `app/api/simulador/route.js` | Verify | Confirm it accepts mapped value `'courier'`/`'general'`; no code change if mapping done client-side |
| `app/api/calculadora/importacion/route.js` | Verify | Pass-through already present (`regimen` destructured + forwarded); no change expected |

## Interfaces / Contracts

```js
// FORM_VACIO addition
regimen: 'courier_personal'

// Selector options (Spanish AR labels + one-line help)
[
  { key: 'courier_personal',  label: 'Courier — uso personal', help: 'Franquicia USD 400, hasta USD 3.000. La opción más común.' },
  { key: 'courier_comercial', label: 'Courier — empresa',      help: 'E-commerce/empresa, hasta USD 3.000. Sin franquicia.' },
  { key: 'general',           label: 'Despacho formal (Régimen General)', help: 'Importación formal con despachante, sin tope de valor.' },
]

// Simulador regime mapping (client-side, in generar())
const mapSimulador = (r) => (r === 'general' ? 'general' : 'courier')

// regimen_unico result shape (consumed by ImportReport)
{ regimen_unico: true, regimen, ncm, valores_base, preferencia_aplicada,
  resultado: { disponible, desglose, total_tributos, costo_total, effective_rate, warnings }, notas, warnings }
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Personal USD 450 → DI 10, TE 1.5, IVA 94.50, total 106.00; USD 380 → IVA 79.80, DI/TE 0; > 3.000 unavailable; > 50 kg warning; Comercial USD 1.000 → DI 200/TE 30/IVA 210; percepciones always 0 for courier | Pure-function tests on `calcularImportacion` with a stubbed supabase returning fixed `arancel/te/iva` |
| Unit | `regimen:'general'` returns `regimen_unico` with real NCM rates + percepciones (RI) | Stubbed supabase |
| Regression | `regimen:null` still returns `regimenes.{general,courier,pef,correo_upu}` | Assert shape unchanged (comparador depends on it) |
| Build | `npm run build` green | CI gate |

## Migration / Rollout
No DB migration; no data change. Code-only. Rollback = restore hardcoded `regimen:'general'`, drop `regimen` from `FORM_VACIO`/`ValueStep`, `git revert` engine changes.

## Open Questions
- [ ] None blocking. Both money decisions resolved above; spec placeholder IVA number is intentionally overridden.
