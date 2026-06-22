# Diseño técnico — Informe accionable (report-insights), Fase 1

- **Change ID:** `report-insights`
- **Depende de:** `proposal.md`

Fase 1 es **presentación pura** sobre datos que ya produce el motor. No se toca `calc-importacion`
ni el simulador ni la base. Todo el trabajo vive en `app/(app)/importar/ImportReport.jsx`.

## A — Datos disponibles (lo que ya tenemos)

`calc.regimenes.general` (de `lib/calculadora/calc-importacion.js`) trae:
- `desglose`: `{ derecho_importacion, tasa_estadistica, iva, iva_adicional, percepcion_ganancias, ingresos_brutos }`,
  cada uno `{ alicuota, monto }`.
- `total_tributos`, `costo_total`.
`calc.valores_base`: `{ fob, flete, seguro, cif }`.
`sim` (de `/api/simulador`): `documentos.{criticos,importantes,opcionales}` (cada doc con
`documento_nombre`, `organismo_emisor`, `base_legal`, `notas`), `organismos.{obligatorios,condicionales}`
(con `organismo`, `base_legal`, `notas`).

## B — «Entendé tus costos»: la regla del split

Tres baldes (suman el costo total):

| Balde | Composición | Significado |
| --- | --- | --- |
| **Producto (FOB)** | `valores_base.fob` | Lo que pagás por la mercadería |
| **Costo de importación (no recuperable)** | `derecho_importacion.monto + tasa_estadistica.monto + flete + seguro` | Costo real hundido |
| **Crédito fiscal (recuperable)** | `iva.monto + iva_adicional.monto + percepcion_ganancias.monto + ingresos_brutos.monto` | Vuelve como crédito |

Regla: **recuperable = IVA + IVA Adicional + percepción Ganancias + IIBB.** Todo lo demás es costo.

**Plazos de recupero (estimados, mostrar como "plazo típico" — no garantía):**
`{ iva: '1-3 meses', iva_adicional: '2-6 meses', percepcion_ganancias: '12-24 meses', ingresos_brutos: '6-18 meses' }`.

Resaltar arriba el **costo real** (producto + no recuperable) como el desembolso que no vuelve, y
debajo el crédito fiscal con sus plazos. Defensa robusta: si `desglose` o `general` faltan, ocultar
el bloque (no romper). Etiquetar que la logística completa (portuarios/despachante) llega en una mejora siguiente.

## C — Normativa citada (surfacear lo que ya viaja)

En la tarjeta de requisitos, mostrar para cada organismo/documento su `base_legal` y `notas` cuando
existan y no sean `'nan'`. Formato: organismo + requisito (nota) + base legal citada. Sin inventar
plazos de trámite (no los tenemos — fase posterior).

## D — Tiempos de tránsito

Mapa estático de referencia: `{ maritimo: '30-45 días', aereo: '7-12 días' }`. El flujo actual no
captura el modo de transporte, así que se muestra como **referencia** en el encabezado del informe
(ambos modos), no como dato calculado. (Capturar el modo y filtrar es mejora posterior.)

## E — Componentes

- Nuevo sub-componente `EntendeTusCostos` dentro de `ImportReport.jsx`, alimentado por
  `calc.regimenes.general.desglose` + `calc.valores_base`.
- Extender `RequirementsCard`/sección "¿Qué necesito?" para mostrar `base_legal`/`notas`.
- Línea de referencia de tránsito en el encabezado.
- Estética: sistema Intercom vigente (tarjetas blancas + hairline, carbón; el recuperable puede usar
  un tinte de acento suave; números en `font-mono`). Sin romper la disciplina del naranja.

## F — Tradeoffs

- **Split en presentación vs en el motor:** en presentación (Fase 1) — rápido y sin riesgo. Si más
  adelante varios consumidores necesitan el split, se sube a `calc-importacion`.
- **Plazos estáticos:** son estimaciones típicas de plaza; se etiquetan como tales. Afinarlos con
  datos reales es mejora posterior.
