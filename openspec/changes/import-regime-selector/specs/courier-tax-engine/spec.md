# Delta for Courier Tax Engine — calc-importacion.js

Capability: `courier-tax-engine`. Corrects the flat-tariff math for Courier Personal and
Courier Comercial, adds the USD 400 franchise and weight warning for Personal, and adds a
`regimen_unico` single-result branch for Régimen General.

## RESOLVED DECISIONS (confirmed by product owner — implement these)

1. **IVA base — Courier Personal:** IVA 21% is FLAT on the full declared value (`baseIva = valor`),
   it does NOT compound on DI/TE. Confirmed: "el IVA se cobra sobre el valor del producto" —
   value 450 → IVA over 450; DI/TE only over the 50 of excess. Canonical `IVA = 0.21 × 450 = 94.5`.

2. **Franchise/limit measurement base:** USD 400 franchise, USD 3.000 limit, AND the courier flat
   tax base are all measured on the declared goods value (`valor_fob`), NOT CIF. Régimen General keeps CIF.

## MODIFIED Requirements

### Requirement: Courier Personal — flat tariff with franchise

The system MUST compute Courier Personal (DSC) costs using a FLAT tariff of DI 20% + TE 3%
applied ONLY to the value EXCEEDING the USD 400 franchise. IVA 21% MUST apply to the FULL
declared value (franchise included). Percepciones (IVA adicional, Ganancias, IIBB) MUST NOT
be included regardless of `condicion_iva`.
(Previously: used real NCM rates; IVA applied to excess-only or compounded incorrectly.)

#### Scenario: Value below franchise — IVA only (USD 380)

- GIVEN `regimen = 'courier_personal'` and declared value = USD 380
- WHEN `calcularImportacion` runs
- THEN `DI = 0`, `TE = 0`
- AND `IVA = 0.21 × 380`
- AND percepciones fields are all 0

#### Scenario: Canonical example — USD 450, flat on excess (MUST pass as test)

- GIVEN `regimen = 'courier_personal'` and declared value = USD 450
- WHEN `calcularImportacion` runs
- THEN `exceso = 50`; `DI = 0.20 × 50 = 10`; `TE = 0.03 × 50 = 1.5`
- AND `IVA = 0.21 × 450 = 94.5` (on the full value)
- AND percepciones are all 0

#### Scenario: Value exceeds limit — result unavailable

- GIVEN `regimen = 'courier_personal'` and declared value = USD 3.001
- WHEN `calcularImportacion` runs
- THEN the result carries a warning «Excede USD 3.000» and the calculation is marked unavailable

#### Scenario: Weight > 50 kg — warning present, calc proceeds

- GIVEN `regimen = 'courier_personal'` and `peso_kg > 50`
- WHEN `calcularImportacion` runs
- THEN the result includes a warning about the 50 kg limit
- AND the numeric calculation is still returned (weight warning is non-blocking)

### Requirement: Courier Comercial — flat tariff, no franchise

The system MUST compute Courier Comercial (DIS) costs using a FLAT tariff of DI 20% +
TE 3% + IVA 21% on the full value. There is NO franchise. Percepciones MUST NOT be
included. Value > USD 3.000 MUST produce a warning.
(Previously: used real NCM rates from the DB position.)

#### Scenario: Standard Comercial cost (no franchise)

- GIVEN `regimen = 'courier_comercial'` and declared value = USD 1.000
- WHEN `calcularImportacion` runs
- THEN `DI = 0.20 × 1.000 = 200`; `TE = 0.03 × 1.000 = 30`; `IVA = 0.21 × 1.000 = 210`
- AND percepciones are all 0

#### Scenario: Value exceeds limit — warning present

- GIVEN `regimen = 'courier_comercial'` and declared value = USD 3.001
- WHEN `calcularImportacion` runs
- THEN the result carries a warning «Excede USD 3.000»

## ADDED Requirements

### Requirement: Régimen General — single-result branch (`regimen_unico`)

The system MUST return a `regimen_unico` result shape when `regimen = 'general'` is
explicitly selected, containing the existing `regimenGeneral` calculation output. The
multi-regime comparison block MUST NOT be returned for this explicit single-regime call.
Real NCM rates and percepciones per `condicion_iva` MUST apply unchanged.

#### Scenario: General regime returns single result with real NCM rates

- GIVEN `regimen = 'general'`, a valid NCM, origin, value, and `condicion_iva = 'responsable_inscripto'`
- WHEN `calcularImportacion` runs
- THEN the response contains `regimen_unico` with the real NCM DI/AEC rate from the DB
- AND percepciones (IVA adicional, Ganancias, IIBB) are included per `condicion_iva`
- AND the multi-regime comparison array is absent from the response

#### Scenario: General regime result survives build

- GIVEN the `general` single-result branch is implemented
- WHEN `npm run build` executes
- THEN the build exits green with no new TypeScript or lint errors
