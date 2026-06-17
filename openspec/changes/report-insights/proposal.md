# Propuesta — Informe accionable (report-insights)

- **Change ID:** `report-insights`
- **Estado:** propuesta
- **Fecha:** 2026-06-13
- **Depende de:** `import-first-redesign` (v2) e `intercom-redesign` (v3)
- **Artifact store:** openspec

---

## 1. Problema

El informe de importación de trade.ai da un costo total, pero **no entrega los insights que
vuelven ese número accionable**. Benchmark contra Arancely (capturas de referencia del usuario):
su reporte distingue **costo real no recuperable** de **crédito fiscal recuperable** (con plazos
de recupero), cita la normativa de cada intervención y muestra tiempos de tránsito. El nuestro
muestra "Tributos US$ X" como si todo fuera costo — lo que **infla el costo percibido** del
importador con plata que en realidad recupera.

### Hallazgos de la auditoría (ordenados por impacto)

1. **No separamos recuperable de costo real** — el gap más grande. IVA, IVA Adicional, percepción
   de Ganancias e IIBB son **crédito fiscal recuperable**, no costo. DI + TE + logística son el
   costo real hundido. Hoy se muestran todos juntos como "tributos".
2. **Costo "puesto en Argentina" incompleto** — solo llegamos a CIF (FOB + flete + seguro);
   faltan gastos portuarios, despachante y flete interno. (Datos/defaults — fase posterior.)
3. **Impuestos internos** — no se calculan; ciertos NCM los tienen. (Dato nuevo — fase posterior.)
4. **Intervenciones vagas** — mostramos el organismo pero no la normativa citada ni el plazo de
   trámite. Tenemos `base_legal`/`notas` en los datos y no los surfaceamos.
5. **Estado del importador hardcodeado** — `responsable_inscripto` fijo; afecta percepciones.
   (Fase posterior.)
6. **Sin tiempos de tránsito** (marítimo 30-45 días, aéreo 7-12).

## 2. Decisión

Elevar el informe a "grado consultora" en fases, **empezando por los quick wins de presentación**
(esta fase), que usan datos que YA calculamos y atacan directamente lo que hace ver pobre el reporte.

## 3. Alcance

### Fase 1 — Quick wins de presentación (este change, ahora)

- **«Entendé tus costos»**: bloque que separa el costo total en tres baldes —
  **Producto (FOB)**, **Costo de importación no recuperable** (DI + TE + flete + seguro),
  **Crédito fiscal recuperable** (IVA + IVA Ad. + Ganancias + IIBB) — con **plazos de recupero
  estimados** (IVA 1-3m, IVA Ad. 2-6m, Ganancias 12-24m, IIBB 6-18m).
- **Normativa citada**: surfacear `base_legal` y `notas` de documentos y organismos en el informe.
- **Tiempos de tránsito** de referencia por modo (marítimo / aéreo).

Todo en presentación, sobre `calc.regimenes.general.desglose` y la respuesta del simulador que ya
existen. Sin tocar el motor de cálculo ni datos.

### Fases posteriores (fuera de este change, planificadas)

- Costo puesto en Argentina completo (logística: portuarios, despachante, flete interno, flete por peso/modo).
- Impuestos internos por NCM (requiere fuente de datos).
- Plazos de trámite + links de normativa por organismo (enriquecer `regimen_intervenciones`).
- Modelar estado del importador / modo de importación (afecta percepciones y régimen).

## 4. Objetivos

1. Que el importador entienda su **costo real** (no recuperable) vs lo que **recupera** — y cuándo.
2. Igualar y superar la claridad del reporte de Arancely sin datos nuevos.
3. Cero regresión: build verde, tests sin fallas nuevas, lógica de cálculo intacta.

## 5. No-objetivos (de esta fase)

- No cambiar el motor `calc-importacion` (solo se consume su `desglose` existente).
- No agregar impuestos internos ni costos logísticos nuevos (fases posteriores).
- No tocar la base de datos.

## 6. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Clasificar mal un tributo como recuperable | Regla explícita y documentada: recuperable = IVA + IVA Ad. + Ganancias + IIBB; el resto, costo |
| Plazos de recupero presentados como exactos | Mostrarlos como **estimados** ("plazo típico"), no como garantía |
| El costo "real" sin portuarios/despachante subestima | Etiquetar claramente que la logística completa llega en una mejora siguiente |
