# Propuesta — Rediseño import-first (trade.ai v2)

- **Change ID:** `import-first-redesign`
- **Estado:** propuesta
- **Fecha:** 2026-06-12
- **Autor:** Pablo Gastaldi (con asistencia de arquitectura)
- **Artifact store:** openspec

---

## 1. Problema

trade.ai hoy es un **menú de 7 herramientas** (chat, calculadora, simulador, comparador,
nomenclador, catálogo, operaciones) que no comparten una columna vertebral. El usuario entra
y no sabe por dónde empezar: el producto le ofrece *capacidades*, no un *camino*. Le entrega
herramientas, no respuestas.

Síntomas concretos observados:

- No se entiende para qué sirve la página ni cómo usarla.
- La superficie está duplicada por soportar importación **y** exportación a la vez
  (calculadora impo/expo, comparador impo/expo, aranceles en destino, reintegros), lo que
  duplica la ambigüedad sin duplicar el valor para el usuario objetivo.
- La jerga aduanera (NCM, régimen, intervenciones) está expuesta sin traducción, cuando el
  usuario objetivo no es un experto de comercio exterior.

**Causa raíz:** falta un trabajo único y clarísimo que el producto resuelva de punta a punta.
Un producto que se entiende responde UNA pregunta completa.

## 2. Decisión

Reducir y reenfocar trade.ai en **un solo recorrido import-first para PYMEs no expertas**,
organizado alrededor de la única pregunta que importa al importador:

> «¿Puedo traer **este** producto de **este** país, cuánto me sale puesto en Argentina,
> qué necesito para hacerlo legal, y cómo lo gestiono?»

Las 7 herramientas dejan de ser un menú y se convierten en **etapas de una sola respuesta**.

### La espina dorsal

```
DESCUBRIR  →  ENTENDER  →  DECIDIR  →  EJECUTAR
(producto)    (informe)   (comparar)  (operación)
```

- **Descubrir** — el usuario describe su producto en lenguaje natural; la IA clasifica por
  detrás. El código NCM existe como plomería interna, nunca se muestra como protagonista.
- **Entender** — un informe claro responde las 3 preguntas reales del importador:
  cuánto sale, qué necesita, si conviene.
- **Decidir** — comparación de orígenes para elegir desde dónde traer.
- **Ejecutar** — convertir el informe en una operación gestionable (checklist + Kanban).

## 3. Usuario objetivo

**PYME / importador no experto.** Dueño de PYME o emprendedor que importa ocasionalmente y
no domina comercio exterior. Necesita que el producto lo guíe de la mano y le responda en
criollo. El lenguaje es simple; la jerga se traduce o se esconde. La IA consultiva acompaña,
no reemplaza la claridad del flujo.

## 4. Alcance

### Entra en v1 (la espina completa)

- **Flujo guiado de 3 pasos:** producto → origen → costo.
- **Informe de importación** con las 3 respuestas (cuánto / qué necesito / conviene),
  reutilizando la lógica que hoy vive en el simulador y la calculadora de importación.
- **Comparación de orígenes** (top de países) embebida en el «¿conviene?».
- **Copiloto de IA contextual** sobre el informe (chat que entiende el informe actual).
- **Widget de dólar** acotado (el tipo de cambio impacta el costo).
- **Gestión de operaciones** como acto final del recorrido: el informe se convierte en una
  operación con checklist inteligente y vista Kanban.
- **Autenticación y planes** existentes (se mantienen, se simplifican los límites a las
  features de importación).

### Se elimina (purga de exportación)

- `lib/calculadora/calc-exportacion.js`, `ResultadosExpo.jsx`, rama expo de
  `ContextoComercial.jsx`, rama expo de comparador, `lib/prompts/guia-exportacion.js`.
- Uso de `acuerdos_exportacion`, `aranceles_exportacion`, `destination_tariffs`,
  `ntm_measures_affecting_argentina` (barreras a exportaciones argentinas).
- Rutas y opciones de exportación en simulador, calculadora, comparador y operaciones.

### Se difiere a v2

- **Catálogo completo** de productos (queda solo un «guardar producto» liviano desde el
  informe; la gestión completa del catálogo es post-v1).
- **Mercados completo** (granos BCR, acciones, inflación/PBI). Solo sobrevive el dólar como
  widget contextual.

## 5. Objetivos y no-objetivos

### Objetivos

1. Que un usuario nuevo entienda en menos de 10 segundos qué hace el producto.
2. Que pueda llegar a un informe de costo + viabilidad sin saber qué es un NCM.
3. Reducir la superficie de navegación de 7 destinos a 1 recorrido + accesos secundarios.
4. Calidad estética de primer nivel: claro, preciso y «caro» a la vista.

### No-objetivos

- No servir a despachantes profesionales como usuario primario (pueden usarlo, no se
  optimiza para ellos en v1).
- No soportar exportación.
- No construir un ERP de gestión completa de operaciones en v1 (solo el checklist + Kanban
  que ya existe, integrado al recorrido).

## 6. Métricas de éxito

- **Activación:** % de usuarios nuevos que completan un flujo guiado y ven un informe.
- **Tiempo al primer informe:** mediana desde el alta hasta el primer informe generado.
- **Comprensión:** caída de consultas de soporte tipo «¿para qué sirve / cómo uso esto?».
- **Conversión de recorrido:** % de informes que se convierten en operación.

## 7. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La clasificación IA del producto falla y frustra el paso 1 | Mostrar candidatos en palabras + permitir refinar; fallback a búsqueda textual |
| Quitar exportación deja código roto en flujos compartidos | Purga guiada por fases con build verde en cada paso |
| El rediseño visual se vuelve «bonito pero confuso» | El flujo guiado fija la jerarquía; el diseño sirve a la claridad, no al revés |
| Operaciones agrega complejidad que rompe la simplicidad del recorrido | Operaciones es el acto final, no un destino paralelo; entra solo después del informe |

## 8. Próximos artefactos

- `specs/` — requisitos y escenarios por capacidad.
- `design.md` — arquitectura + sistema de diseño UX/UI.
- `tasks.md` — checklist de implementación por fases.
