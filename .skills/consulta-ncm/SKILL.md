# Skill: Consulta de Nomenclatura NCM

## Cuándo usar esta skill
Cuando el usuario pregunta sobre aranceles, clasificación de productos,
derechos de importación/exportación, o busca un código NCM.

## Tabla principal: `ncm` (10,432 filas en Supabase)
Formato ncm_code: `XXXX.XX.XX` con puntos (ej: `0101.21.00`)

Columnas:
- `ncm_code`: código con puntos (ej: `0101.21.00`)
- `description`: descripción del producto en español
- `chapter`: capítulo (ej: `01`)
- `arancel_extrazona`: arancel para países sin acuerdo (AEC/TEC)
- `arancel_intrazona`: arancel preferencial intrazona
- `derecho_exportacion`: derecho de exportación (%)
- `iva_importacion`: IVA en importación (%)
- `tasa_estadistica`: tasa estadística (%)
- `organismos_imp`: organismos que intervienen en importación (SENASA, ANMAT, etc.)
- `organismos_exp`: organismos que intervienen en exportación
- `unidad_medida`: unidad estadística (kg, unidades, litro, etc.)
- `observaciones`: notas adicionales

## PENDIENTE: Tabla de preferencias `preferencias_arancelarias`
Aún no creada. Cuando exista, columnas:
- `ncm_code` (formato XXXX.XX.XX), `ncm_naladisa`, `acuerdo_id`, `pais`, `tipo`
- `tipo = 'exportacion'`: preferencia que Argentina otorga al otro país
- `tipo = 'importacion'`: preferencia que el otro país otorga a Argentina

## PENDIENTE: Tabla `acuerdos_generales`
Para TLC de cobertura total (ACE-35 Chile, MERCOSUR Brasil/Uruguay/Paraguay).

## Cómo buscar en la tabla ncm

### Por código exacto
```javascript
const { data } = await supabase
  .from('ncm')
  .select('*')
  .eq('ncm_code', '0101.21.00')
  .limit(1)
```

### Por capítulo (prefijo)
```javascript
const { data } = await supabase
  .from('ncm')
  .select('*')
  .eq('chapter', '01')
  .limit(5)
```

### Por descripción (ILIKE)
```javascript
const { data } = await supabase
  .from('ncm')
  .select('*')
  .ilike('description', '%aceite de oliva%')
  .limit(5)
```

### Por full-text search (FTS en español)
```javascript
const { data } = await supabase
  .from('ncm')
  .select('*')
  .textSearch('description', 'aceite oliva', { type: 'websearch', config: 'spanish' })
  .limit(5)
```

## Normalización de código NCM para búsqueda
El usuario puede escribir el código de distintas formas:
- `01012100` → normalizar a `0101.21.00`
- `0101.21.00` → ya está en formato correcto
- `0101` → buscar por capítulo/partida (LIKE `0101%`)

Función de normalización (JS):
```javascript
function normalizarNCM(codigo) {
  // Eliminar puntos y espacios
  const digits = codigo.replace(/[.\s]/g, '')
  if (digits.length >= 8) {
    const d = digits.padEnd(8, '0')
    return `${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6,8)}`
  }
  return null
}
```

## IMPORTANTE: lib/ncm-lookup.js está desactualizado
El archivo `lib/ncm-lookup.js` usa la tabla `nomenclatura_ncm` y campos
incorrectos (aec_tec, percepcion_iva, etc.). Hay que actualizarlo para:
- Usar tabla `ncm`
- Campo `ncm_code` (no `ncm`)
- Campo `description` (no `descripcion`)
- Campos correctos: arancel_extrazona, arancel_intrazona, derecho_exportacion,
  iva_importacion, tasa_estadistica, organismos_imp, organismos_exp

## Formato de respuesta al usuario final
Siempre incluir en este orden:
1. Código NCM y descripción
2. Arancel extrazona (AEC/TEC) y arancel intrazona
3. Derecho de exportación, tasa estadística, IVA importación
4. Organismos que intervienen (si los hay)
5. Preferencias arancelarias por acuerdo y país (cuando existan las tablas)
   (separar importación de exportación)
6. Disclaimer legal obligatorio al final
