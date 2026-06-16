# Spec — Flujo guiado de importación

Capacidad: `guided-import-flow`. Puerta de entrada principal del producto. Lleva al usuario
no experto desde «quiero importar algo» hasta un informe, paso a paso, sin pantalla en blanco.

## ADDED Requirements

### Requirement: Entrada por recorrido guiado

El sistema DEBE presentar como pantalla principal del producto un recorrido guiado de pasos
secuenciales, no un menú de herramientas. El usuario nunca debe enfrentar una decisión de
«¿por dónde empiezo?».

#### Scenario: Usuario nuevo abre el producto

- **WHEN** un usuario autenticado entra a la ruta principal de la app
- **THEN** ve la primera pregunta del recorrido («¿Qué querés importar?») con un único campo
  de entrada destacado y un indicador de progreso del recorrido
- **AND** no ve un menú lateral de 7 herramientas compitiendo por su atención

### Requirement: Paso 1 — identificación del producto en lenguaje natural

El sistema DEBE permitir describir el producto en lenguaje natural y resolver la clasificación
arancelaria por detrás, sin exigir al usuario conocer ni ingresar un código NCM.

#### Scenario: Descripción libre y confirmación en palabras

- **WHEN** el usuario escribe «zapatillas deportivas de cuero» y confirma
- **THEN** el sistema clasifica usando el flujo de `POST /api/nomenclador/clasificar` y muestra
  candidatos descritos **en palabras** (p. ej. «Calzado deportivo con parte superior de cuero»)
- **AND** no muestra códigos NCM como protagonistas de la decisión
- **AND** el usuario elige el candidato correcto y avanza al paso siguiente

#### Scenario: La clasificación no encuentra candidatos claros

- **WHEN** la descripción es ambigua y la IA no devuelve candidatos con confianza suficiente
- **THEN** el sistema pide una precisión (material, uso o estado) o ofrece búsqueda textual de
  respaldo, sin bloquear el recorrido

### Requirement: Paso 2 — selección de origen

El sistema DEBE permitir elegir el país de origen con los orígenes más frecuentes priorizados,
y ofrecer una salida hacia comparación para quien no sabe desde dónde conviene traer.

#### Scenario: Selección de país frecuente

- **WHEN** el usuario llega al paso de origen
- **THEN** ve un selector con los orígenes típicos primero (p. ej. China, Brasil, EE.UU.)
- **AND** puede optar por «no sé de dónde conviene → comparar orígenes»

### Requirement: Paso 3 — valor de la mercadería

El sistema DEBE solicitar el valor que paga el usuario al proveedor con ayuda en lenguaje
claro, evitando jerga de incoterms sin explicar.

#### Scenario: Ingreso de valor con ayuda

- **WHEN** el usuario llega al paso de costo
- **THEN** ve un campo para el valor de la mercadería con texto de ayuda en criollo
  (qué incluye, qué no) y campos opcionales (flete, cantidad)
- **AND** al confirmar, el sistema genera el informe de importación

### Requirement: Progreso y reversibilidad

El sistema DEBE mostrar en qué paso del recorrido está el usuario y permitir volver atrás sin
perder lo ya cargado.

#### Scenario: Volver a un paso anterior

- **WHEN** el usuario está en el paso 3 y vuelve al paso 1
- **THEN** conserva el producto y el origen ya elegidos
- **AND** puede modificar el producto y re-avanzar sin reiniciar el recorrido
