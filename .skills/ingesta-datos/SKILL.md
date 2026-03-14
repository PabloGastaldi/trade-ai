# Skill: Ingesta de Datos de Comercio Exterior

## Cuándo usar esta skill
Cuando el usuario pide procesar, importar o cargar datos de:
- Acuerdos comerciales (ACE, MERCOSUR, SGP)
- Archivos Excel/CSV con datos arancelarios
- Datos desde SICE OAS o ALADI

## DATASET PRINCIPAL: acuerdos_estructurados.xlsx

### Ubicación
C:\Users\Pablo\trade-ai-data\02-acuerdos-comerciales\acuerdos_estructurados.xlsx
(también puede estar en la raíz de trade-ai-data)

### Estructura (hoja "Consolidado")
- 52,510 filas de datos
- Columnas: NCM/Naladisa | Acuerdo | País | Tipo | ¿Tiene Preferencia?

### Contenido por acuerdo
| Acuerdo | País | Export | Import | Total |
|---------|------|--------|--------|-------|
| ACE-6 | México | 1,498 | 1,470 | 2,968 |
| ACE-13 | Paraguay | 157 | 152 | 309 |
| ACE-35 | Chile | 33 | 19 | 52 |
| ACE-58 | Perú | 6,524 | 6,521 | 13,045 |
| ACE-59 | Colombia | 6,523 | 6,524 | 13,047 |
| ACE-59 | Ecuador | 6,523 | 2,621 | 9,144 |
| ACE-59 | Venezuela | 6,523 | 6,523 | 13,046 |
| MERCOSUR-India | India | 450 | 449 | 899 |

### Características importantes
1. TODOS los registros son "SI" — el archivo solo lista NCMs CON preferencia
2. Distingue "exportacion" (preferencia que Argentina otorga al otro país)
   vs "importacion" (preferencia que el otro país otorga a Argentina)
3. Los NCM del Excel están en formato NALADISA sin puntos, 10 dígitos (ej: 0402101000)
4. La tabla `ncm` en Supabase usa formato con puntos XXXX.XX.XX (ej: 0402.10.10)
5. Hay 42 NCMs de 8 dígitos y 52,468 de 10 dígitos en el archivo

## PROBLEMA CRÍTICO: Mapeo NALADISA → ncm_code

### El formato en la tabla ncm es XXXX.XX.XX (con puntos)
El NALADISA del Excel tiene 10 dígitos sin puntos: `0402101000`

### Estrategia de mapeo definida:
1. Tomar los primeros 8 dígitos del NALADISA: `04021010`
2. Formatear como XXXX.XX.XX: `0402.10.10`
3. Este valor debe existir en la columna `ncm_code` de la tabla `ncm`
4. Si no existe, loguearlo (puede ser que el NCM argentino difiera del NALADISA)

```javascript
function naladisaANcmCode(naladisa) {
  // naladisa: "0402101000" (10 dígitos sin puntos)
  const digits = naladisa.replace(/\D/g, '').padEnd(8, '0').slice(0, 8)
  return `${digits.slice(0,4)}.${digits.slice(4,6)}.${digits.slice(6,8)}`
  // resultado: "0402.10.10"
}
```

## Tablas destino en Supabase

### `preferencias_arancelarias` (PENDIENTE DE CREAR)
```sql
CREATE TABLE preferencias_arancelarias (
    id SERIAL PRIMARY KEY,
    ncm_code VARCHAR(10),        -- formato XXXX.XX.XX (join con tabla ncm)
    ncm_naladisa VARCHAR(10),    -- NALADISA original sin puntos (ej: 0402101000)
    acuerdo_id VARCHAR(20),      -- ACE-6, ACE-13, ACE-35, ACE-58, ACE-59, MERCOSUR-India
    pais VARCHAR(50),            -- México, Paraguay, Chile, Perú, Colombia, Ecuador, Venezuela, India
    tipo VARCHAR(15),            -- 'exportacion' o 'importacion'
    tiene_preferencia BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ncm_naladisa, acuerdo_id, pais, tipo)
);
CREATE INDEX idx_pref_ncm_code ON preferencias_arancelarias(ncm_code);
CREATE INDEX idx_pref_acuerdo ON preferencias_arancelarias(acuerdo_id);
CREATE INDEX idx_pref_pais ON preferencias_arancelarias(pais);
CREATE INDEX idx_pref_ncm_acuerdo ON preferencias_arancelarias(ncm_code, acuerdo_id);
```

### `acuerdos_generales` (PENDIENTE DE CREAR)
```sql
CREATE TABLE acuerdos_generales (
    id SERIAL PRIMARY KEY,
    acuerdo_id VARCHAR(20),
    pais VARCHAR(50),
    tipo VARCHAR(15),
    cobertura VARCHAR(20),       -- 'total', 'parcial'
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Datos a insertar: ACE-35 Chile (total), MERCOSUR Brasil/Uruguay/Paraguay (total)
```

## Reglas de ingesta
1. Guardar tanto ncm_code (XXXX.XX.XX) como ncm_naladisa (10 dígitos sin puntos)
2. El ncm_code se obtiene de los primeros 8 dígitos del NALADISA formateados
3. Verificar que ncm_code existe en la tabla `ncm` (loguar los que no coincidan)
4. Validar que no se dupliquen registros (usar ON CONFLICT DO NOTHING)
5. Procesar en batches de 500-1000 filas para no saturar Supabase
6. Log de progreso: mostrar cuántas filas procesadas de cada acuerdo
7. Los DDL (CREATE TABLE) van en el SQL Editor del dashboard de Supabase

## Acuerdos de cobertura total (TLC) — NO están en el Excel
Estos van en tabla `acuerdos_generales`:
- ACE-35 Chile: cobertura total (el Excel solo tiene 52 excepciones)
- MERCOSUR Brasil/Uruguay/Paraguay: cobertura total
Nota: Los 52 NCMs de ACE-35 en el Excel son excepciones o productos especiales.

## Acuerdos pendientes (sin datos todavía)
- ACE-36 Bolivia
- SGP (Unión Europea, USA, Japón)

## Herramientas de procesamiento
- Node.js con librería `xlsx` para leer Excel
- Python 3 con `openpyxl` como alternativa
- Supabase JS client para insertar (en batches via `.insert([...])`)
- NO usar psql directo (sin contraseña de DB disponible localmente)
