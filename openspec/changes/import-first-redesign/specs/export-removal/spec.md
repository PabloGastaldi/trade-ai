# Spec — Retiro de exportación

Capacidad: `export-removal`. La mitad mecánica del pivote. Elimina todo el dominio de
exportación del producto, dejando build verde en cada paso.

## REMOVED Requirements

### Requirement: Cálculo de exportación

El sistema YA NO DEBE ofrecer cálculo de exportación.

- Se elimina `lib/calculadora/calc-exportacion.js` y `app/api/calculadora/exportacion/route.js`.
- Se elimina `app/(app)/calculadora/ResultadosExpo.jsx`.

#### Scenario: La calculadora solo resuelve importación

- **WHEN** el usuario usa cualquier flujo de cálculo
- **THEN** solo existe la ruta de importación
- **AND** no hay referencias activas a funciones de exportación

### Requirement: Comparador y contexto de exportación

El sistema YA NO DEBE ofrecer la rama de exportación en comparador ni en el contexto comercial.

- Se elimina la rama expo de `app/(app)/calculadora/ContextoComercial.jsx`.
- Se elimina la rama expo de `app/api/comparador/route.js` y de la UI del comparador.

#### Scenario: Comparación solo entre orígenes de importación

- **WHEN** el usuario compara
- **THEN** la comparación es entre países de origen para importar, no destinos de exportación

### Requirement: Datos y prompts de exportación

El sistema YA NO DEBE consumir datos ni prompts específicos de exportación.

- Deja de usarse: `acuerdos_exportacion`, `aranceles_exportacion`, `destination_tariffs`,
  `ntm_measures_affecting_argentina`, `lib/prompts/guia-exportacion.js`,
  `lib/destination-tariffs-lookup.js` (si queda sin consumidores).

#### Scenario: Sin lecturas a tablas de exportación

- **WHEN** se ejecuta cualquier flujo del producto v1
- **THEN** no se consultan tablas ni se cargan prompts de exportación
- **AND** la guía operativa inyectada en el chat es solo de importación

## Notas de implementación

- Las tablas de exportación permanecen en la base de datos (no se borran datos); solo se retira
  su uso desde el código.
- Cada retiro debe verificarse con `npm run build` verde antes de avanzar al siguiente.
