# Delta for Import Report — Single-Regime Rendering

Capability: `import-report-regime`. The import report renders the single chosen regime
result (`regimen_unico`) instead of a multi-regime comparison block. The simulador
requirements panel (documentos, organismos, restricciones) reflects the same regime.

## MODIFIED Requirements

### Requirement: Costo total puesto en Argentina

The system MUST display the cost total as the primary figure using the `regimen_unico`
result returned by the calculator. The multi-regime comparison block MUST NOT render when
`regimen_unico` is present.
(Previously: rendered a multi-regime comparison with no single-regime path.)

#### Scenario: Informe muestra el costo destacado — single regime

- GIVEN the user completed the guided flow with a regime selected
- WHEN the import report renders
- THEN it shows the cost total from `regimen_unico` as the primary figure
- AND displays a breakdown (mercadería, derechos, IVA + adicionales, tasa estadística)
  drawn from `regimen_unico`
- AND the multi-regime comparison table is not rendered

#### Scenario: Regime label visible in report header

- GIVEN `regimen_unico` carries the selected regime key
- WHEN the report renders
- THEN the selected regime is identified in plain Spanish (matching the label the user
  chose in the selector) so the user can confirm they are reading the right result

### Requirement: Viabilidad y requisitos con semáforo

The system MUST pass the selected `regimen` to the `/api/simulador` call so that
documentos, organismos, and restricciones returned match the chosen regime.
(Previously: simulador always received `regimen: 'general'` hardcoded in `generar()`.)

#### Scenario: Requirements match the chosen regime

- GIVEN the user selected «Courier — uso personal»
- WHEN the report renders the requirements panel
- THEN the documents and organisations shown correspond to the `courier_personal` regime
  (fetched from `documentos_requeridos` / `regimen_intervenciones` filtered by that regime)
- AND the `restricciones_regimenes` restriction for courier_personal (≤ USD 3.000 limit)
  is displayed if applicable

#### Scenario: Disclaimer still present

- GIVEN any regime is selected
- WHEN the import report renders
- THEN the mandatory legal disclaimer is included, unchanged

## ADDED Requirements

### Requirement: No regression on existing report capabilities

The changes to `ImportReport.jsx` MUST NOT remove or break the semáforo panel, origin
advisor card, or deep-link sharing via query params. Existing report capabilities outside
the cost block MUST continue to function when `regimen_unico` is present.

#### Scenario: Origin advisor still renders with single regime

- GIVEN the user completed the flow with a regime selected
- WHEN the import report renders
- THEN the origin advisor card (preferencia del origen + comparación) is still visible
  and functional

#### Scenario: Deep-link sharing includes regime param

- GIVEN the user shares the report link
- WHEN the shareable URL is generated
- THEN it includes the `regimen` query param alongside `ncm`, `pais`, `valor`, `flete`
  so the shared link reproduces the same single-regime view
