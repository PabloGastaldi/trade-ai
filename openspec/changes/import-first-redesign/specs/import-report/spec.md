# Spec — Informe de importación

Capacidad: `import-report`. El destino del recorrido guiado. Responde las tres preguntas reales
del importador en un orden fijo: cuánto sale, qué necesita, si conviene. Reutiliza la lógica de
datos que hoy alimenta el simulador y la calculadora de importación.

## ADDED Requirements

### Requirement: Costo total puesto en Argentina

El sistema DEBE presentar como dato principal del informe el costo total estimado puesto en
Argentina, con un desglose simple y legible para no expertos.

#### Scenario: Informe muestra el costo destacado

- **WHEN** el usuario completa el recorrido guiado
- **THEN** el informe muestra arriba el costo total puesto en Argentina como número principal
- **AND** debajo un desglose simple: mercadería, derechos, IVA + adicionales, tasa estadística
- **AND** los cálculos provienen de `calcularImportacion` (lib/calculadora/calc-importacion.js)

### Requirement: Viabilidad y requisitos con semáforo

El sistema DEBE indicar si el producto se puede importar y qué se necesita, usando un código de
color (verde/amarillo/rojo) y lenguaje claro, a partir de documentos, organismos y restricciones.

#### Scenario: Producto importable con intervención

- **WHEN** el informe se genera para un producto con organismo interviniente
- **THEN** muestra en verde que el producto se puede importar
- **AND** muestra en amarillo los organismos que intervienen (p. ej. INTI, SENASA, ANMAT)
- **AND** lista los documentos requeridos en lenguaje claro
- **AND** las fuentes son `documentos_requeridos`, `regimen_intervenciones`, `restricciones_regimenes`

#### Scenario: Producto con restricción dura

- **WHEN** existe una restricción que impide o condiciona fuertemente la importación
- **THEN** el informe la muestra en rojo de forma prominente, antes que el resto del detalle

### Requirement: Conveniencia del origen

El sistema DEBE mostrar si el origen elegido tiene preferencia arancelaria y cómo se compara
con orígenes alternativos.

#### Scenario: Origen sin preferencia con alternativas mejores

- **WHEN** el origen elegido no tiene preferencia arancelaria y existe un origen con acuerdo
- **THEN** el informe indica que no hay preferencia para el origen elegido
- **AND** muestra orígenes alternativos con su costo estimado, destacando los que conviene
- **AND** usa `acuerdos_importacion` y `country_codes` para resolver preferencias

### Requirement: Disclaimer legal obligatorio

El sistema DEBE incluir el disclaimer legal en todo informe.

#### Scenario: Informe incluye disclaimer

- **WHEN** se renderiza cualquier informe
- **THEN** incluye el texto de disclaimer orientativo con la recomendación de consultar a un
  despachante de aduana matriculado

### Requirement: Acciones posteriores al informe

El sistema DEBE ofrecer, desde el informe, continuar hacia la ejecución (crear operación) y un
guardado liviano del producto.

#### Scenario: Convertir informe en operación

- **WHEN** el usuario decide avanzar desde el informe
- **THEN** puede crear una operación precargada con el producto, origen y datos del informe
- **AND** puede guardar el producto para consultarlo después

---

# Spec — Copiloto de IA contextual

Capacidad: `ai-copilot`. El chat deja de ser un destino que compite con todo y pasa a ser un
acompañante del informe actual.

## ADDED Requirements

### Requirement: Chat consciente del informe

El sistema DEBE permitir al usuario preguntar en lenguaje natural sobre el informe que está
viendo, con el contexto del informe inyectado en la consulta.

#### Scenario: Pregunta sobre un dato del informe

- **WHEN** el usuario abre el copiloto desde un informe y pregunta «¿por qué pago tanto IVA?»
- **THEN** la respuesta usa el contexto del informe actual (producto, origen, montos)
- **AND** reutiliza el pipeline de `POST /api/consulta` con el contexto del informe
- **AND** incluye el disclaimer legal obligatorio
