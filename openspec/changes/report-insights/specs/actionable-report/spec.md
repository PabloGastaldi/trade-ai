# Spec — Informe accionable (Fase 1)

Capacidad: `actionable-report`. El informe distingue costo real de crédito fiscal recuperable,
cita la normativa de las intervenciones y muestra tiempos de tránsito. Presentación sobre datos
existentes.

## ADDED Requirements

### Requirement: Split recuperable vs costo real

El informe DEBE separar el costo total en producto (FOB), costo de importación no recuperable
(DI + TE + flete + seguro) y crédito fiscal recuperable (IVA + IVA Ad. + Ganancias + IIBB), con
plazos de recupero estimados.

#### Scenario: El usuario ve qué recupera y qué no

- **WHEN** se genera un informe con un régimen general
- **THEN** ve un bloque «Entendé tus costos» con el costo real (no recuperable) destacado
- **AND** ve el crédito fiscal recuperable desglosado por tributo con su plazo de recupero estimado
- **AND** los tres baldes suman el costo total mostrado arriba

#### Scenario: Datos de desglose ausentes

- **WHEN** el cálculo no expone `regimenes.general.desglose`
- **THEN** el bloque «Entendé tus costos» se oculta sin romper el informe

### Requirement: Normativa citada en intervenciones

El informe DEBE mostrar la base legal y notas de documentos y organismos cuando existan.

#### Scenario: Intervención con base legal

- **WHEN** un organismo o documento trae `base_legal`/`notas` (no `'nan'`)
- **THEN** el informe los muestra junto al organismo/documento, citados

### Requirement: Tiempos de tránsito de referencia

El informe DEBE mostrar tiempos de tránsito estimados por modo (marítimo / aéreo).

#### Scenario: Referencia de tránsito

- **WHEN** se ve un informe
- **THEN** muestra una referencia de tránsito (marítimo 30-45 días, aéreo 7-12 días)

### Requirement: Sin regresión de cálculo

El cambio NO DEBE alterar `calc-importacion` ni el simulador; es presentación.

#### Scenario: Motor intacto

- **WHEN** se aplica esta fase
- **THEN** `lib/calculadora/calc-importacion.js` y `app/api/simulador/route.js` no cambian
- **AND** build verde y tests sin fallas nuevas
