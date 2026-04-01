# Plan de Optimización e Integración de Tablas — trade.ai

## Diagnóstico ejecutivo

trade.ai tiene 12 tablas de dominio cargadas y mantenidas, pero solo 6 se usan de forma consistente. Las tablas NTM affecting/applied están completamente muertas, `destination_tariffs` tiene consumidores desalineados, y las tablas operativas (`documentos_requeridos`, `regimen_intervenciones`, `restricciones_regimenes`) solo viven dentro del simulador cuando deberían alimentar a toda la plataforma. El resultado es que el usuario que usa la Consulta IA, el Nomenclador o las Operaciones recibe una fracción del valor que los datos podrían darle.

---

## Fase 0 — Infraestructura (Semana 1)

Antes de integrar tablas nuevas en cada herramienta, hay dos problemas de base que resolver. Sin esto, cada integración futura va a arrastrar los mismos vicios.

### 0.1 — RPCs de Supabase para filtrado server-side

**Problema:** El simulador descarga todos los registros de `documentos_requeridos` y `regimen_intervenciones` y filtra `ncm_patron` en JavaScript con pattern matching. Con 50 y 52 filas respectivamente esto no rompe nada hoy, pero es arquitectura frágil: cuando crezcan los registros (y van a crecer cuando agregues regímenes especiales o documentos por país) se va a notar, y además impide reutilizar la lógica desde otras herramientas sin duplicar el filtrado.

**Solución:** Crear dos funciones RPC en Supabase que reciban `tipo_operacion`, `regimen`, `codigo_ncm` y opcionalmente `pais`, y devuelvan los registros que matcheen usando `LIKE` nativo de PostgreSQL sobre `ncm_patron`.

```sql
-- RPC: documentos_por_operacion
CREATE OR REPLACE FUNCTION documentos_por_operacion(
  p_tipo TEXT,
  p_regimen TEXT,
  p_ncm TEXT DEFAULT NULL,
  p_pais TEXT DEFAULT NULL
)
RETURNS SETOF documentos_requeridos AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM documentos_requeridos dr
  WHERE dr.tipo_operacion = p_tipo
    AND dr.regimen = p_regimen
    AND (dr.ncm_patron IS NULL OR p_ncm LIKE REPLACE(dr.ncm_patron, '%', '') || '%')
    AND (dr.pais_patron IS NULL OR dr.pais_patron = p_pais)
  ORDER BY dr.sort_order;
END;
$$ LANGUAGE plpgsql STABLE;
```

```sql
-- RPC: intervenciones_por_operacion
CREATE OR REPLACE FUNCTION intervenciones_por_operacion(
  p_operacion TEXT,
  p_regimen TEXT,
  p_ncm TEXT DEFAULT NULL
)
RETURNS SETOF regimen_intervenciones AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM regimen_intervenciones ri
  WHERE ri.operacion = p_operacion
    AND ri.regimen = p_regimen
    AND (ri.ncm_patron IS NULL OR p_ncm LIKE REPLACE(ri.ncm_patron, '%', '') || '%');
END;
$$ LANGUAGE plpgsql STABLE;
```

```sql
-- RPC: restricciones_por_regimen
CREATE OR REPLACE FUNCTION restricciones_por_regimen(
  p_regimen TEXT
)
RETURNS SETOF restricciones_regimenes AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM restricciones_regimenes
  WHERE regimen = p_regimen;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Impacto:** Una vez que estos RPCs existen, cualquier herramienta puede llamar `supabase.rpc('documentos_por_operacion', { p_tipo, p_regimen, p_ncm, p_pais })` y recibir datos filtrados sin duplicar lógica.

### 0.2 — Lib centralizada para NTM affecting/applied

**Problema:** Las tablas `ntm_measures_affecting_argentina` y `ntm_measures_applied_by_argentina` existen pero no tienen ningún lookup helper. Cada herramienta que quiera usarlas tendría que escribir su propia query, lo cual es exactamente cómo se llega a inconsistencias como las de `destination_tariffs`.

**Solución:** Crear `lib/ntm-extended-lookup.js` con dos funciones:

```js
// lib/ntm-extended-lookup.js

/**
 * Barreras que otros países aplican a productos argentinos (exportación)
 * @param {string} hs6 - código HS a 6 dígitos
 * @param {string} [paisDestino] - ISO3 o nombre del país destino (opcional)
 * @returns {{ pais, ntm_code, tipo_medida, cobertura }[]}
 */
export async function buscarBarrerasEnDestino(supabase, hs6, paisDestino) {
  let query = supabase
    .from('ntm_measures_affecting_argentina')
    .select('*')
    .eq('hs_code', hs6);

  if (paisDestino) {
    query = query.eq('pais_que_aplica', paisDestino);
  }

  const { data, error } = await query.limit(50);
  if (error) throw error;
  return data || [];
}

/**
 * Barreras que Argentina aplica a importaciones de cierto origen
 * @param {string} hs6 - código HS a 6 dígitos
 * @param {string} [paisOrigen] - país de origen (opcional)
 * @returns {{ pais_afectado, ntm_code, tipo_medida, cobertura }[]}
 */
export async function buscarBarrerasArgentinas(supabase, hs6, paisOrigen) {
  let query = supabase
    .from('ntm_measures_applied_by_argentina')
    .select('*')
    .eq('hs_code', hs6);

  if (paisOrigen) {
    query = query.eq('pais_afectado', paisOrigen);
  }

  const { data, error } = await query.limit(50);
  if (error) throw error;
  return data || [];
}

/**
 * Resumen NTM para un producto/país: combina ambas tablas
 * @returns {{ barreras_en_destino: [], barreras_argentinas: [], resumen: string }}
 */
export async function resumenNTMCompleto(supabase, hs6, paisContraparte, tipoOp) {
  const [enDestino, argentinas] = await Promise.all([
    tipoOp === 'exportacion'
      ? buscarBarrerasEnDestino(supabase, hs6, paisContraparte)
      : [],
    tipoOp === 'importacion'
      ? buscarBarrerasArgentinas(supabase, hs6, paisContraparte)
      : [],
  ]);

  return {
    barreras_en_destino: enDestino,
    barreras_argentinas: argentinas,
    total: enDestino.length + argentinas.length,
  };
}
```

### 0.3 — Normalizar el consumo de `destination_tariffs`

**Aclaración del CLAUDE.md:** El propio CLAUDE.md dice que `ave_pct`/`partner_iso3` y `ave_rate`/`reporting_country` son columnas del mismo schema, no inconsistencia. El problema real es que no hay un helper centralizado y cada consumidor hace su propia query con campos distintos.

**Solución:** Crear `lib/destination-tariffs-lookup.js`:

```js
// lib/destination-tariffs-lookup.js

/**
 * Busca aranceles en destino para un HS6 y país
 * Devuelve un objeto normalizado independientemente de qué columna se use
 */
export async function buscarArancelDestino(supabase, hs6, paisISO3) {
  const { data, error } = await supabase
    .from('destination_tariffs')
    .select('*')
    .eq('hs_code', hs6)
    .eq('partner_iso3', paisISO3)
    .order('year', { ascending: false })
    .limit(1);

  if (error || !data?.length) return null;

  const row = data[0];
  return {
    hs_code: row.hs_code,
    pais_iso3: row.partner_iso3,
    pais_nombre: row.reporting_country,
    arancel_pct: row.ave_pct ?? row.ave_rate ?? 0,
    lineas_arancelarias: row.num_tariff_lines,
    anio: row.year,
    fuente: row.source,
  };
}

/**
 * Busca aranceles en destino para múltiples países (comparador)
 */
export async function buscarArancelesMultiplesPaises(supabase, hs6, paisesISO3) {
  const { data, error } = await supabase
    .from('destination_tariffs')
    .select('*')
    .eq('hs_code', hs6)
    .in('partner_iso3', paisesISO3);

  if (error) return [];

  // Agrupar por país y tomar el más reciente
  const porPais = {};
  for (const row of data || []) {
    const key = row.partner_iso3;
    if (!porPais[key] || row.year > porPais[key].year) {
      porPais[key] = row;
    }
  }

  return Object.values(porPais).map(row => ({
    hs_code: row.hs_code,
    pais_iso3: row.partner_iso3,
    pais_nombre: row.reporting_country,
    arancel_pct: row.ave_pct ?? row.ave_rate ?? 0,
    lineas_arancelarias: row.num_tariff_lines,
    anio: row.year,
  }));
}
```

---

## Fase 1 — Consulta IA (Semana 2)

Esta es la integración de mayor impacto. Hoy el chat con Haiku sabe buscar NCM, aranceles, preferencias y NTM genéricas, pero no puede decirle al usuario qué documentos necesita para exportar leche a Brasil, ni qué organismos intervienen, ni qué restricciones tiene el régimen courier. Eso es exactamente lo que un despachante preguntaría.

### Cambios en `POST /api/consulta`

**Paso 1 — Ampliar la clasificación.** Hoy Haiku clasifica la consulta y decide qué buscar (NCM, preferencias, NTM, Pinecone). Agregar tres señales nuevas al prompt de clasificación:

```
- needs_documentos: true si el usuario pregunta por documentación, requisitos, trámites, habilitaciones
- needs_intervenciones: true si pregunta por organismos (SENASA, ANMAT, INAL), permisos, certificados
- needs_restricciones: true si pregunta por límites de régimen, montos máximos, condiciones
```

**Paso 2 — Queries paralelas adicionales.** En el bloque donde hoy se hacen las búsquedas paralelas (NCM + preferencias + NTM + Pinecone), agregar condicionalmente:

```js
const promesas = [
  clasificacion.ncm ? buscarNCM(supabase, clasificacion.ncm) : null,
  clasificacion.preferencias ? buscarPreferencias(supabase, ncm) : null,
  clasificacion.ntm ? buscarBarrerasNTM(hs6) : null,
  clasificacion.pinecone ? buscarEnPinecone(query) : null,
  // NUEVAS:
  clasificacion.needs_documentos
    ? supabase.rpc('documentos_por_operacion', {
        p_tipo: clasificacion.tipo_operacion,
        p_regimen: clasificacion.regimen || 'general',
        p_ncm: clasificacion.ncm,
      })
    : null,
  clasificacion.needs_intervenciones
    ? supabase.rpc('intervenciones_por_operacion', {
        p_operacion: clasificacion.tipo_operacion,
        p_regimen: clasificacion.regimen || 'general',
        p_ncm: clasificacion.ncm,
      })
    : null,
  clasificacion.needs_restricciones
    ? supabase.rpc('restricciones_por_regimen', {
        p_regimen: clasificacion.regimen || 'general',
      })
    : null,
];
```

**Paso 3 — Inyectar en el contexto de Haiku.** Agregar una sección al system prompt dinámico:

```
## Documentación requerida para esta operación:
{JSON de documentos agrupados por categoría}

## Organismos intervinientes:
{Lista de organismos con estado obligatorio/opcional}

## Restricciones del régimen:
{Lista de restricciones con valores y base legal}
```

**Resultado:** El usuario pregunta "¿Qué necesito para exportar miel a la UE?" y Haiku responde con NCM, aranceles, preferencias, documentos específicos (certificado SENASA, certificado de origen, etc.), organismos que intervienen, y restricciones del régimen, todo en una sola respuesta.

### Integración NTM extended

Agregar al bloque de búsquedas paralelas:

```js
clasificacion.ntm_extended
  ? resumenNTMCompleto(supabase, hs6, clasificacion.pais_iso3, clasificacion.tipo_operacion)
  : null,
```

Y al contexto de Haiku, una sección de "Barreras no arancelarias en destino" cuando sea exportación, o "Barreras argentinas a la importación" cuando sea importación.

---

## Fase 2 — Nomenclador (Semana 3)

Hoy el Nomenclador muestra aranceles y preferencias para un NCM, pero no dice nada sobre documentos, intervenciones ni restricciones. Un usuario que busca un NCM debería ver de un vistazo si ese producto requiere SENASA, ANMAT, o tiene restricciones especiales.

### Panel de detalle ampliado

Cuando el usuario selecciona un NCM y se abre el panel de detalle, agregar tres secciones nuevas debajo de las preferencias:

**Sección "Documentos e intervenciones":**
Llamar a los RPCs con `tipo_operacion = 'importacion'` y `tipo_operacion = 'exportacion'` en paralelo para el NCM seleccionado, régimen `general`. Mostrar en dos tabs (Importación / Exportación):
- Lista de documentos categorizados (crítico, recomendado, condicional)
- Organismos que intervienen con su estado (obligatorio/opcional)
- Badge de alerta si hay organismos obligatorios (ej: "Requiere SENASA")

**Sección "Restricciones":**
Para régimen general, mostrar restricciones aplicables. Esto es más útil en el simulador, pero si el usuario navega desde nomenclador a calculadora, ya tiene contexto.

### Nuevos endpoints

```
GET /api/nomenclador/documentos?ncm={ncm}&tipo={importacion|exportacion}
GET /api/nomenclador/intervenciones?ncm={ncm}&tipo={importacion|exportacion}
```

Ambos son wrappers delgados sobre los RPCs de Fase 0.

---

## Fase 3 — Calculadora (Semana 3-4)

La calculadora hoy calcula costos duros (aranceles, impuestos, reintegros) pero no muestra contexto comercial. El usuario sabe cuánto le cuesta importar, pero no sabe si hay un acuerdo que le baje el arancel, ni qué barreras NTM va a encontrar.

### Calculadora de Importación — Enriquecimiento

Después del resultado del cálculo, agregar un bloque "Contexto comercial":

1. **Acuerdos disponibles:** Consultar `acuerdos_importacion` para el NCM y país. Mostrar el mejor acuerdo (mayor preferencia) con un botón "Recalcular con preferencia" que re-ejecute el cálculo aplicando el descuento.

2. **NTM relevantes:** Llamar a `buscarBarrerasArgentinas(hs6, paisOrigen)` y mostrar un badge con cantidad de medidas + desglose por tipo (SPS, TBT, licencias).

### Calculadora de Exportación — Enriquecimiento

1. **Arancel en destino:** Ya usa `destination_tariffs`, pero migrar al helper centralizado `buscarArancelDestino()`.

2. **Barreras en destino:** Llamar a `buscarBarrerasEnDestino(hs6, paisDestino)` y mostrar las NTM que el país destino aplica a productos argentinos.

3. **Acuerdos de exportación:** Consultar `acuerdos_exportacion` para mostrar si hay preferencia arancelaria en destino.

---

## Fase 4 — Operaciones (Semana 4-5)

Hoy la operación se crea con NCM, país, tipo e incoterm, pero después queda como un registro plano. El valor real está en generar automáticamente el checklist de documentos y los organismos que hay que gestionar.

### Checklist automático al crear operación

Cuando se crea una operación vía `POST /api/operaciones`, después de insertar el registro:

1. Llamar a `documentos_por_operacion(tipo, regimen, ncm, pais)`.
2. Llamar a `intervenciones_por_operacion(tipo, regimen, ncm)`.
3. Insertar los resultados en una nueva tabla `operation_checklist`:

```sql
CREATE TABLE operation_checklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- 'documento' | 'intervencion'
  item_name TEXT NOT NULL,
  item_category TEXT, -- 'critico' | 'recomendado' | 'condicional' | 'obligatorio' | 'opcional'
  organismo TEXT,
  base_legal TEXT,
  notas TEXT,
  status TEXT DEFAULT 'pendiente', -- 'pendiente' | 'en_tramite' | 'completado' | 'no_aplica'
  completed_at TIMESTAMPTZ,
  sort_order INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: solo el dueño de la operación
ALTER TABLE operation_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own checklist"
  ON operation_checklist FOR ALL
  USING (operation_id IN (SELECT id FROM operations WHERE user_id = auth.uid()));
```

### UI de checklist en Operaciones

En el detalle de cada operación, mostrar el checklist con:
- Progreso visual (barra o porcentaje)
- Items agrupados por categoría (Documentos críticos → Documentos recomendados → Intervenciones obligatorias)
- Cada item tiene toggle de estado (pendiente → en trámite → completado)
- Items críticos/obligatorios resaltados con badge rojo si pendientes

### Enriquecimiento con aranceles

En el detalle de la operación, sidebar con resumen financiero:
- Aranceles aplicables (impo o expo según tipo)
- Mejor acuerdo disponible
- Arancel en destino (si exportación)

---

## Fase 5 — NTM en todas las herramientas (Semana 5-6)

Las tablas `ntm_measures_affecting_argentina` y `ntm_measures_applied_by_argentina` pasan de estar completamente ignoradas a ser ciudadanas de primera clase.

### Simulador

Ya usa `ntm_measures`. Agregar al bloque paralelo de queries:

```js
const ntmExtended = await resumenNTMCompleto(
  supabase, hs6, paisISO3, tipoOperacion
);
```

Nueva sección en el reporte: "Medidas no arancelarias específicas" con desglose por código NTM y cobertura (total/parcial).

### Comparador

Hoy compara costos puros. Agregar una columna "NTM" al resultado que muestre la cantidad de barreras por país, coloreada como semáforo (verde = 0-2, amarillo = 3-5, rojo = 6+). Esto le da al usuario un indicador rápido de complejidad regulatoria por mercado.

### Nomenclador

En el panel de detalle del NCM, sección "Barreras no arancelarias globales": resumen de cuántos países aplican medidas a ese producto y los tipos más frecuentes. Esto es informativo, no operativo.

---

## Fase 6 — Simulador: migración a RPCs (Semana 6)

El simulador hoy funciona bien pero hace filtrado client-side. Migrar las queries de `documentos_requeridos`, `regimen_intervenciones` y `restricciones_regimenes` a los RPCs creados en Fase 0. Esto es refactoring puro: misma funcionalidad, mejor arquitectura, y prepara para escalar las tablas.

---

## Matriz de integración final

| Tabla | Consulta IA | Simulador | Calculadora | Nomenclador | Comparador | Operaciones |
|-------|:-----------:|:---------:|:-----------:|:-----------:|:----------:|:-----------:|
| `ncm` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `aranceles_importacion` | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ Fase 4 |
| `aranceles_exportacion` | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ Fase 4 |
| `acuerdos_importacion` | ✅ | ✅ | ◐ Fase 3 | ✅ | ✅ | — |
| `acuerdos_exportacion` | ✅ | ✅ | ◐ Fase 3 | ✅ | ✅ | — |
| `documentos_requeridos` | ◐ Fase 1 | ✅→RPC Fase 6 | — | ◐ Fase 2 | — | ◐ Fase 4 |
| `regimen_intervenciones` | ◐ Fase 1 | ✅→RPC Fase 6 | — | ◐ Fase 2 | — | ◐ Fase 4 |
| `restricciones_regimenes` | ◐ Fase 1 | ✅→RPC Fase 6 | — | ◐ Fase 2 | — | — |
| `destination_tariffs` | ✅ | ✅→helper | ✅→helper | — | ◐ Fase 5 | — |
| `ntm_measures` | ✅ | ✅ | — | — | — | — |
| `ntm_affecting_argentina` | ◐ Fase 1 | ◐ Fase 5 | ◐ Fase 3 | ◐ Fase 5 | ◐ Fase 5 | — |
| `ntm_applied_by_argentina` | ◐ Fase 1 | ◐ Fase 5 | ◐ Fase 3 | ◐ Fase 5 | ◐ Fase 5 | — |

**Leyenda:** ✅ = ya integrado | ◐ = integración planificada | — = no aplica

---

## Orden de ejecución y dependencias

```
Fase 0 (RPCs + libs)
  ├── Fase 1 (Consulta IA) ← depende de RPCs + ntm-extended-lookup
  ├── Fase 2 (Nomenclador) ← depende de RPCs
  ├── Fase 3 (Calculadora) ← depende de destination-tariffs-lookup + ntm-extended-lookup
  ├── Fase 4 (Operaciones) ← depende de RPCs + tabla operation_checklist
  ├── Fase 5 (NTM everywhere) ← depende de ntm-extended-lookup
  └── Fase 6 (Simulador refactor) ← depende de RPCs
```

Todas las fases 1-6 dependen de Fase 0 pero son independientes entre sí. Podés atacarlas en cualquier orden después de tener la infraestructura lista.

---

## Estimación de complejidad

| Fase | Archivos nuevos | Archivos modificados | Complejidad | Riesgo |
|------|:-:|:-:|:-:|:-:|
| 0 — Infraestructura | 3 libs + 3 RPCs SQL | 0 | Baja | Bajo |
| 1 — Consulta IA | 0 | `api/consulta/route.js` | Media-Alta | Medio (prompt engineering) |
| 2 — Nomenclador | 2 endpoints | `nomenclador/page.js`, panel detalle | Media | Bajo |
| 3 — Calculadora | 0 | `calc-importacion.js`, `calc-exportacion.js`, UI client | Media | Bajo |
| 4 — Operaciones | 1 tabla SQL, 1 endpoint | `api/operaciones/route.js`, `OperacionesClient.js` | Alta | Medio (nueva tabla + UI) |
| 5 — NTM everywhere | 0 | Simulador, Comparador, Nomenclador | Media | Bajo (aditiva) |
| 6 — Simulador refactor | 0 | `api/simulador/route.js` | Baja | Bajo (refactoring) |

---

## Notas de implementación

**Sobre el prompt de clasificación en Consulta IA:** La clave está en que Haiku detecte correctamente cuándo activar las búsquedas nuevas. Hay que darle ejemplos explícitos en el prompt de clasificación: "¿Qué documentos necesito para exportar vino?" → `needs_documentos: true, tipo_operacion: exportacion`. "¿SENASA interviene en la importación de quesos?" → `needs_intervenciones: true, tipo_operacion: importacion`. Sin buenos ejemplos de few-shot, Haiku va a subutilizar las fuentes nuevas.

**Sobre `operation_checklist`:** Hay que decidir si el checklist se genera una vez al crear la operación (snapshot) o si se regenera dinámicamente. Recomiendo snapshot con opción de "regenerar checklist" por si las tablas base se actualizan. El snapshot le da al usuario control para marcar items como completados sin que se le reseteen.

**Sobre el token budget de Haiku:** Al inyectar documentos, intervenciones y restricciones en el contexto, el input crece. Para consultas operativas complejas, el contexto puede sumar 500-800 tokens extra. Dentro del budget actual (compleja = 3000 tokens de respuesta) debería ser manejable, pero hay que monitorear que el input no supere los límites de Haiku.
