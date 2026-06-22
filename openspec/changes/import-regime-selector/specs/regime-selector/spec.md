# Delta for Regime Selector — ValueStep / Import Flow

Capability: `regime-selector`. Adds an explicit 3-option regime selector to the cost step
of the guided import flow, threads the chosen regime through the form state, and passes it
to both API calls that generate the report.

## MODIFIED Requirements

### Requirement: Paso 3 — valor de la mercadería

The system MUST request the merchandise value AND the import regime in the same step,
presenting the regime as a human-friendly 3-option selector with a one-line explanation
for each option. The user MUST NOT be exposed to customs jargon without context.
Regime MUST default to «Courier — uso personal» (most common PYME case).
(Previously: Step 3 only asked for the USD value and optional freight; no regime input.)

#### Scenario: Selector visible with default pre-selected

- GIVEN the user reaches Step 3 (ValueStep) of the guided import flow
- WHEN the step renders
- THEN a regime selector is visible with three options: «Courier — uso personal»,
  «Courier — empresa», «Despacho formal (Régimen General)»
- AND «Courier — uso personal» is pre-selected by default
- AND each option displays a one-line help text in plain Spanish

#### Scenario: User changes the selected regime

- GIVEN the user is on Step 3 with the default regime pre-selected
- WHEN the user selects «Courier — empresa»
- THEN the form state records `regimen: 'courier_comercial'`
- AND no other form fields lose their current values

#### Scenario: User submits Step 3 with a regime selected

- GIVEN the user has filled in the USD value and a regime is selected
- WHEN the user confirms the step
- THEN `generar()` reads `d.regimen` from form state
- AND passes the `regimen` value to BOTH `/api/calculadora/importacion` AND `/api/simulador`
- AND neither API call omits or hardcodes the `regimen` field

## ADDED Requirements

### Requirement: `regimen` field in form initial state

The system MUST include a `regimen` field in `FORM_VACIO` with a defined default value.
The field MUST be treated as required; the form MUST NOT submit without a regime.

#### Scenario: Form initializes with regime default

- GIVEN the import flow is loaded fresh (no query params)
- WHEN `FORM_VACIO` is evaluated
- THEN it contains `regimen: 'courier_personal'`

#### Scenario: Navigating back does not lose regime selection

- GIVEN the user has reached Step 3 and selected «Despacho formal»
- WHEN the user navigates back to Step 1 and then advances to Step 3 again
- THEN the regime field retains the value the user previously chose
