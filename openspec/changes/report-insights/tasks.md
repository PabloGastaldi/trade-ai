# Tareas — Informe accionable (report-insights)

- **Change ID:** `report-insights`
- **Depende de:** `proposal.md`, `design.md`, `specs/`

## Fase 1 — Quick wins de presentación (sobre datos existentes)

- [x] `EntendeTusCostos` en `ImportReport.jsx`: tres baldes (Producto FOB / Costo no recuperable /
      Crédito fiscal recuperable) desde `calc.regimenes.general.desglose` + `calc.valores_base`,
      según la regla de `design.md` Parte B. Resaltar el costo real (no recuperable).
- [x] Plazos de recupero estimados por tributo (IVA 1-3m, IVA Ad. 2-6m, Ganancias 12-24m, IIBB 6-18m),
      etiquetados como "plazo típico" (no garantía).
- [x] Defensa: si falta `regimenes.general.desglose`, ocultar el bloque sin romper.
- [x] Surfacear `base_legal`/`notas` de documentos y organismos en la sección «¿Qué necesito?»
      (citados; saltear valores `'nan'`).
- [x] Línea de referencia de tiempos de tránsito (marítimo 30-45 / aéreo 7-12) en el encabezado.
- [x] Estética: sistema Intercom vigente (tarjetas blancas + hairline, carbón, mono para números),
      sin romper la disciplina del naranja.
- [x] Verificación: build compila; el motor `calc-importacion` y el simulador NO se tocaron;
      tests sin fallas nuevas (las 4 pre-existentes siguen).

## Fase 2 — Costo puesto en Argentina completo (logística post-CIF)

- [x] `lib/calculadora/estimar-logistica.js`: función pura y swappable `estimarLogistica({ fob,
      cif, peso_kg, modo, medio_pago })` → `{ items, total, es_estimado: true }`. Constantes
      tuneables exportadas (gastos_portuarios, despachante, flete_interno, gastos_bancarios) según
      `design-logistica.md` Parte B. No duplica el flete internacional (ya vive en `calc-importacion`).
- [x] `app/api/calculadora/importacion/route.js`: llama a `estimarLogistica(...)` tras
      `calcularImportacion(...)` y devuelve `{ ...resultado, logistica }`. Guard: se omite con
      seguridad si falta `valores_base`.
- [x] `ImportReport.jsx`: nueva tarjeta «+ Logística» (flete+seguro del CIF + ítems estimados con
      tag "estimado"); «Costo total puesto en Argentina» recalculado como
      `costo_total + logistica.total`; «Entendé tus costos» suma `logistica.total` al balde no
      recuperable; nota visible "Logística estimada — un proveedor podrá cotizarla en vivo".
      Fallback sin romper si `logistica` no llega.
- [x] Verificación: build compila (`✓ Compiled successfully`); `calc-importacion.js` no se tocó
      (matemática fiscal intacta); tests sin fallas nuevas (4 pre-existentes siguen).

## Pasada de precisión pendiente (motor fiscal — NO esta fase, anotado en `design-logistica.md` Parte E)

- [ ] IIBB: CCER usa 3%, el motor usa 2,5% — revisar cuál es correcto.
- [ ] Tasa estadística: el motor aproxima `min(cif,10000)×3%`; CCER describe topes absolutos por
      tramo (base < USD 10.000 → máx USD 180, tramos superiores con tope distinto) — revisar.
- [ ] Tasa de Comprobación de Destino (2%): no se calcula en el motor actual.

## Fase 3 — Flete/seguro realista por peso y modo de transporte

- [x] `lib/calculadora/calc-importacion.js`: constants `TARIFA_KG` (maritimo 4, aereo 10, courier 15)
      and `FALLBACK_PCT_FOB` (maritimo 0.10, aereo 0.18, courier 0.25) exported as tuneables.
      `calcularImportacion` accepts `modo` param (`'maritimo' | 'aereo' | 'courier'`, default
      `'maritimo'`). For ANY regime: if `flete_internacional` is 0/missing →
      (a) if `peso_kg` given: `peso_kg × TARIFA_KG[modo]`; (b) fallback: `valor_fob × FALLBACK_PCT_FOB[modo]`.
      Note pushed to `notas[]`. `seguro` is now non-zero (1% of FOB+fleteEfectivo). `valores_base`
      gains `flete_estimado: true/false`. Existing courier behavior preserved (forces `modo='courier'`).
- [x] `app/(app)/importar/ImportarClient.js`: `ValueStep` adds "Modo de envío" toggle
      (Marítimo / Aéreo) and optional "Peso total (kg)" input. Both passed as `peso_kg` and `modo`
      in the fetch body to `/api/calculadora/importacion`.
- [x] `app/api/calculadora/importacion/route.js`: reads `peso_kg` and `modo` from body, passes
      `modo` to `calcularImportacion` and to `estimarLogistica` (replacing the hardcoded `'maritimo'`).
- [x] `app/(app)/importar/ImportReport.jsx`: `LogisticaCard` receives `fleteEstimado` prop; shows
      "estimado" tag next to the "Flete + seguro internacional" line when `flete_estimado` is true.
- [x] Verificación: `✓ Compiled successfully`; tax math in `calc-importacion.js` untouched;
      tests without new failures.

## Fases posteriores (planificadas, fuera de Fase 1, Fase 2 y Fase 3)

- [ ] Impuestos internos por NCM (requiere fuente de datos).
- [ ] Plazos de trámite + links de normativa por organismo (enriquecer `regimen_intervenciones`).
- [ ] Modelar estado del importador / modo de importación (afecta percepciones y régimen).
- [ ] Reemplazar `estimar-logistica.js` por cotizaciones en vivo de un proveedor (interfaz
      `{ items, total }` ya lista — ver `design-logistica.md` Parte D).
