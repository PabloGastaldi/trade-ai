# Diseño técnico — Rediseño import-first (trade.ai v2)

- **Change ID:** `import-first-redesign`
- **Depende de:** `proposal.md`

Este documento define la arquitectura y el sistema de diseño UX/UI del v2. El norte estético es
explícito: **claridad de fintech serio con calidez de producto argentino.** Nada de adorno por
adorno; cada decisión visual sirve a que el usuario no experto entienda más rápido.

---

## Parte A — Arquitectura

### A.1 Principio: reusar el backend, reconstruir el front

El v2 **no reinventa la lógica de datos**. El simulador de importación ya hace, por detrás, casi
todo lo que el informe necesita (aranceles + preferencias + documentos + organismos +
restricciones + barreras). El trabajo es de **reorganización y presentación**, no de cálculo.

| Capa | Qué se hace |
| --- | --- |
| Datos / lib | Se reutiliza `calc-importacion`, `ncm-lookup`, `preferencias-lookup`, `ntm-lookup`, `clasificar`. Se retira todo lo de exportación. |
| API routes | Se conserva `consulta`, `nomenclador/clasificar`, `calculadora/importacion`, `simulador`, `operaciones`. Se elimina `calculadora/exportacion` y la rama expo de `comparador`. |
| Front | Reestructuración mayor: de 7 destinos a 1 recorrido + secundarios. |

### A.2 Nueva estructura de rutas

```
/importar            → el recorrido guiado (puerta principal, ex /inicio como entrada)
/importar/[id]       → informe persistido (compartible, reanudable)
/operaciones         → lista + Kanban (acto final, llega desde el informe)
/operaciones/[id]    → detalle de operación con checklist
/cuenta, /planes     → se mantienen
/consulta            → el chat se reubica como copiloto; ruta directa secundaria
```

Rutas que se retiran del nav principal: `/simulador`, `/comparador`, `/nomenclador`,
`/calculadora`, `/catalogo`, `/mercados` se absorben dentro del recorrido o se difieren. Los
endpoints que sigan vivos se mantienen; lo que cambia es que dejan de ser **destinos**.

### A.3 Colapso de navegación

El sidebar de 7 ítems se elimina como modelo mental. El v2 navega por **recorrido**, no por menú:

- **Acción primaria única:** «Nueva importación» (inicia el recorrido).
- **Secundarios** (acceso discreto, no compiten): Mis operaciones, Copiloto, Mi cuenta.
- En mobile: una barra inferior mínima (Importar · Operaciones · Cuenta), no 5 tabs.

### A.4 Estado del recorrido

El recorrido guiado mantiene estado en el cliente (producto → origen → costo) y persiste el
informe generado en `/importar/[id]` para que sea reanudable y compartible. Se evalúa guardar
borradores de recorrido en `users_profile` o una tabla `import_drafts` (decisión en tasks).

---

## Parte B — Sistema de diseño

### B.1 Filosofía visual

**«Preciso, oscuro y calmo.»** El producto maneja plata y decisiones legales: tiene que
transmitir seriedad y exactitud, no entusiasmo de landing. Tres principios:

1. **El dato es el héroe.** La tipografía y el espacio existen para que el número y la respuesta
   salten. Todo lo demás se atenúa.
2. **El amarillo es un bisturí, no una inundación.** `#DDD92A` se reserva para la acción primaria
   y para señalar EL dato clave de cada pantalla. Si todo es amarillo, nada es amarillo.
3. **Jerarquía por tono, nunca por líneas.** Se separan secciones con cambios de superficie
   (`surface` → `surface-high` → `surface-highest`), no con bordes de 1px. Esto ya es convención
   del proyecto y se respeta a rajatabla.

### B.2 Color y superficies

Se mantiene la paleta de tokens existente y se disciplina su uso:

```
Fondo app        bg-surface          #1A191C
Tarjetas         bg-white/[0.03]     borde white/[0.04], rounded-2xl
Elevación        surface-high/highest para anidar sin líneas
Acción / dato    text-primary #DDD92A · bg-primary-intense #EAE151 (texto oscuro encima)
Texto            on-surface #F5F5F5 · on-surface-variant #9E9DA0 (jerarquía por opacidad)
Semáforo         emerald-400 (puede) · amber-400 (atención) · red-400 (restricción dura)
```

Regla de contraste: texto sobre amarillo siempre `text-on-primary` (#1A191C). Nunca negro puro
sobre superficies; nunca amarillo sobre amarillo.

### B.3 Tipografía

Tres familias con roles estrictos (ya existen en el proyecto):

- **Bebas Neue** (`font-display`): solo momentos de impacto puntuales (el costo total grande del
  informe puede usarla como gesto editorial). No para UI corrida.
- **Inter** (`font-body`): toda la UI, títulos de sección, texto corrido.
- **Space Grotesk** (`font-mono`): números, montos, códigos. Da precisión visual al dato.
- **Salin** (`font-logo`): solo el logo.

Escala (mobile-first, sube en desktop): hero del costo 40–56px mono; títulos de paso 24–28px;
cuerpo 15–16px; ayudas 13px. Dos pesos de Inter: 400 y 500. Nada de 600/700.

### B.4 Ritmo y layout

- Recorrido guiado: **una pregunta por pantalla**, centrada, con muchísimo aire. El vacío es
  intencional: comunica «un solo paso a la vez».
- Informe: layout de una columna en mobile, dos columnas en desktop (informe + riel de copiloto).
- Espaciado en múltiplos de 4; respiraciones grandes (24/32/48) entre bloques semánticos.

### B.5 Componentes (inventario v2)

Se reutilizan los de `components/ui/` y se agregan:

- `FlowShell` — contenedor del recorrido: progreso, transición entre pasos, botón atrás.
- `ProductSearchStep`, `OriginStep`, `ValueStep` — los tres pasos.
- `ImportReport` — el informe, compuesto por:
  - `CostHero` — número grande + desglose.
  - `RequirementsCard` — semáforo + documentos + organismos.
  - `OriginAdvisorCard` — preferencia + comparación de orígenes.
  - `CopilotRail` — chat contextual lateral.
- `OriginPicker` — selector de país con frecuentes priorizados y banderas.
- `Semaforo` — átomo de estado (verde/amarillo/rojo) con icono y texto.

### B.6 Movimiento

El movimiento es **funcional, no decorativo**. Sirve para dar continuidad y foco:

- Transición entre pasos del recorrido: deslizamiento horizontal corto + fade (≈250ms, easing
  suave). Refuerza la sensación de «avanzo en un camino».
- El costo total **cuenta hacia su valor** al aparecer (number ticker), para que el ojo lo registre.
- Revelado escalonado de las tarjetas del informe (stagger sutil) para guiar la lectura en orden:
  cuánto → qué necesito → conviene.
- Respeta `prefers-reduced-motion`: si está activo, todo aparece sin animación.

---

## Parte C — UX pantalla por pantalla

### C.1 Recorrido guiado

- **Paso 1 — Producto.** Campo grande tipo búsqueda con placeholder conversacional
  («¿Qué querés importar? Ej: zapatillas de cuero»). Debajo, candidatos en palabras como tarjetas
  seleccionables. El NCM viaja oculto en el estado.
- **Paso 2 — Origen.** `OriginPicker` con frecuentes arriba. Link discreto «no sé de dónde
  conviene → comparar».
- **Paso 3 — Valor.** Campo de monto en `font-mono`, ayuda en criollo, opcionales colapsados
  (flete, cantidad). CTA primario amarillo: «Ver mi informe».

### C.2 Informe

Orden de lectura fijo, de arriba hacia abajo:

1. `CostHero` — «Costo puesto en Argentina» + número grande + desglose en una línea.
2. `RequirementsCard` — semáforo de viabilidad, organismos, documentos.
3. `OriginAdvisorCard` — preferencia del origen elegido + tabla corta de alternativas.
4. Acciones: «Gestionar esta importación» (→ operación) y «Guardar producto».
5. `CopilotRail` — en desktop a la derecha; en mobile, botón flotante que abre hoja inferior.
6. Disclaimer legal al pie.

### C.3 Operaciones (acto final)

- Llega precargada desde el informe. Encabezado con el producto y el origen.
- Checklist documental con marcado y notas (reusa `DocItem`).
- Vista lista y Kanban (`@dnd-kit`), limpiadas de exportación.

---

## Parte D — Tecnología nueva propuesta

El usuario autorizó introducir tecnología nueva si eleva el diseño. Propuestas acotadas y
justificadas (cada una se confirma en `tasks.md` antes de instalar):

| Tecnología | Para qué | Por qué |
| --- | --- | --- |
| `framer-motion` (Motion) | Transiciones de pasos, stagger del informe, hoja del copiloto | Estándar de facto para motion declarativo en React; respeta `reduced-motion`; chico y tree-shakeable |
| `@number-flow/react` | Ticker del costo total | Animación de números accesible y precisa, sin reinventar |

Se mantiene Tailwind + tokens CSS. No se introduce librería de componentes pesada (Material, etc.):
rompería la identidad y el control fino del diseño. Los componentes se construyen a medida sobre
los tokens existentes.

---

## Parte E — Decisiones y tradeoffs

- **Reusar simulador vs. reescribir el cálculo:** se reusa. El cálculo es correcto y testeado;
  el problema era de presentación. Reescribir sería riesgo sin valor.
- **Recorrido guiado vs. chat-first:** guiado (decisión de producto ya tomada). El chat queda como
  copiloto, no como puerta, para no reintroducir la pantalla en blanco.
- **Operaciones en v1 vs. v2:** en v1, pero como acto final del recorrido, no como destino suelto.
- **Datos de exportación:** se retira el uso, no se borran las tablas. Reversible y sin pérdida.
- **Motion:** se acepta una dependencia nueva por el valor de claridad/continuidad; se exige
  fallback con `reduced-motion`.
