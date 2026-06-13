# Spec — Gestión de operaciones (acto final)

Capacidad: `operations-management`. Es el final del recorrido, no un destino paralelo. El informe
se convierte en una operación gestionable con checklist inteligente y vista Kanban. Se mantiene
la base existente (`operations`, `@dnd-kit`), reorientada a importación.

## ADDED Requirements

### Requirement: Crear operación desde el informe

El sistema DEBE permitir crear una operación de importación precargada con los datos del informe.

#### Scenario: Conversión informe → operación

- **WHEN** el usuario elige «gestionar esta importación» desde un informe
- **THEN** se crea una operación de tipo importación precargada con producto, origen, NCM
  (interno) y los datos relevantes del informe
- **AND** el estado inicial se asigna automáticamente según el tipo de operación

### Requirement: Checklist documental inteligente

El sistema DEBE generar el checklist de la operación a partir de los documentos requeridos del
producto y régimen, permitiendo marcar avance y notas.

#### Scenario: Checklist precargado

- **WHEN** se crea la operación
- **THEN** el checklist se arma desde `documentos_requeridos` para ese tipo de operación y régimen
- **AND** el usuario puede marcar ítems como completados y agregar notas

### Requirement: Vista lista y Kanban

El sistema DEBE ofrecer las operaciones en vista lista y en vista Kanban con arrastrar y soltar.

#### Scenario: Mover una operación de etapa

- **WHEN** el usuario arrastra una tarjeta de operación a otra columna en el Kanban
- **THEN** la operación actualiza su estado de etapa de forma persistente

## MODIFIED Requirements

### Requirement: Operaciones solo de importación

El sistema DEBE restringir la creación y gestión de operaciones al tipo importación, retirando
las opciones de exportación de los formularios y validaciones.

#### Scenario: Alta de operación sin opción de exportación

- **WHEN** el usuario crea una operación
- **THEN** el formulario no ofrece tipo exportación
- **AND** las validaciones de `operation_type` aceptan solo el dominio de importación
