# Diseño — Fase 2: Costo logístico puesto en Argentina

- **Change ID:** `report-insights` · Fase 2
- **Fuente:** CCER "Costos en una Importación" (composición de gastos) + práctica de plaza
- **Requisito del usuario:** estimar por % / monto ahora, con interfaz lista para reemplazar por
  **cotizaciones en vivo de un proveedor** más adelante.

## A — Composición (CCER)

Más allá del CIF (FOB + flete + seguro), el costo "puesto en Argentina" suma:
1. **Gastos de puerto/depósito** — naviera (manejo contenedor + liberación), forwarder, depósito
   fiscal, manipuleo (carga/descarga/estibado), otros admin (certificaciones, inspecciones).
2. **Honorarios del despachante** — comisión en función del valor de la operación, **sobre FOB (%)**.
3. **Flete interno** — puerto → planta.
4. **Gastos bancarios** — según medio de pago (carta de crédito > transferencia).

Ejemplo CCER (FOB 10.000, CIF 11.150): puerto 1.160 + destino 600 = **1.760** extra (~16% del CIF).
Arancely (FOB 260.841): portuarios 4.613 (~1,8% FOB), despachante 500, flete interno 150.

## B — Modelo de estimación (`lib/calculadora/estimar-logistica.js`)

Función pura, **swappable**: `estimarLogistica({ fob, cif, peso_kg, modo, medio_pago })` →
`{ items: [{ key, label, monto, metodo, detalle }], total, es_estimado: true }`.

`metodo` ∈ `'estimado' | 'fijo' | 'porcentaje'`. Cada ítem trae `detalle` (cómo se calculó) para que
la UI muestre "estimado" y un futuro proveedor pueda reemplazar el ítem con una cotización real.

**Defaults (constantes exportadas y TUNEABLES, etiquetados como estimación de plaza):**

| Ítem | Regla default | Notas |
| --- | --- | --- |
| `gastos_portuarios` | `clamp(CIF × 2%, mín 250, máx 6000)` | bundle naviera+forwarder+depósito+manipuleo |
| `despachante` | `clamp(FOB × 0.5%, mín 300, máx 2500)` | CCER: % sobre FOB |
| `flete_interno` | fijo `USD 200` | puerto → planta (placeholder hasta distancia real) |
| `gastos_bancarios` | `FOB × 0.25%` (o por `medio_pago` si está) | carta de crédito ~0.5%, transferencia ~0.25% |

El **flete internacional** sigue en `calc-importacion` (parte del CIF): se extiende la estimación
por peso/modo — marítimo ~USD 4/kg, aéreo ~USD 10/kg, courier 15/kg (ya existe courier) — cuando no
se ingresa flete. NO duplicar flete: estos ítems son SOLO los gastos post-CIF.

## C — Integración (sin romper el motor de tributos)

- `calc-importacion` queda como el motor de **CIF + tributos** (no se toca su matemática fiscal).
- `app/api/calculadora/importacion/route.js`: llama también a `estimarLogistica(...)` y devuelve
  `{ ...resultado, logistica }`.
- `ImportarClient.generar`: pasa `logistica` al informe (en `report.calc` o `report.logistica`).
- `ImportReport.jsx`:
  - Sección **«+ Logística»** (estilo Arancely): flete + seguro (del CIF) + los ítems estimados,
    cada uno con su monto y etiqueta "estimado".
  - **Costo total puesto en Argentina** = `costo_total` (CIF+tributos) **+ logística.total**.
  - En «Entendé tus costos», la logística entra en el balde **no recuperable** (es costo real).
  - Nota visible: "Logística estimada — un proveedor podrá cotizarla en vivo".

## D — Interfaz para cotizaciones en vivo (futuro)

`estimarLogistica` y un futuro `cotizarLogistica(proveedor, params)` comparten la forma de salida
(`{ items, total }`). El informe consume esa forma sin saber si vino de estimación o de cotización
real → el swap es transparente. Por ahora solo existe `estimarLogistica`.

## E — Fuera de alcance (anotado para pasada de precisión del motor)

Hallazgos del CCER que tocan la matemática fiscal, NO esta fase:
- **IIBB**: CCER usa **3%**; el motor usa 2,5%. Revisar.
- **Tasa estadística**: topes absolutos (base < USD 10.000 → máx USD 180; tramos superiores con tope).
  El motor hace `min(cif,10000)×3%`, aproximación distinta.
- **Tasa de Comprobación de Destino (2%)**: no se calcula.
