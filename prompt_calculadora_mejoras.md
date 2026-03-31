# PROMPT PARA CLAUDE CODE — Mejoras a la Calculadora (nueva base NCM)

```
Necesito actualizar la calculadora de trade.ai para usar la nueva
base de datos NCM que tiene más campos, e incorporar features nuevas.

Next.js 14 App Router + Tailwind CSS + Supabase.

Archivos a modificar:
- lib/calculadora/calc-importacion.js
- lib/calculadora/calc-exportacion.js
- app/(app)/calculadora/page.js

Archivos a crear:
- lib/data/paises-no-cooperantes.js

## SCHEMA REAL DE LA BASE DE DATOS (nuevo)

Las tablas están separadas — los aranceles NO están en ncm directamente:

### ncm
- codigo_ncm (TEXT PK) — 11 dígitos sin puntos, ej: "29339141000"
- descripcion (TEXT)
- seccion, capitulo, partida (TEXT)

### aranceles_importacion (FK → ncm.codigo_ncm)
- aec (numeric) — Arancel Externo Común
- die (numeric) — Derecho Importación Extrazona
- dii (numeric) — Derecho Importación Intrazona
- te  (numeric) — Tasa de Estadística
- iva (numeric) — IVA
- iva_ad (numeric) — IVA Adicional
- gan (numeric) — Ganancias
- iibb (numeric) — Ingresos Brutos

### aranceles_exportacion (FK → ncm.codigo_ncm)
- derecho_exportacion (numeric) — Derecho de Exportación (%)
- reintegro (numeric) — Reintegro (%)

### acuerdos_importacion (FK → ncm.codigo_ncm)
- bloque (TEXT) — ej: "ALADI", "MERCOSUR"
- pais (TEXT) — nombre del país en español, ej: "Bolivia"
- codigo_acuerdo (TEXT) — ej: "AAP.CE/36"
- porcentaje (numeric) — % de preferencia arancelaria (0-100)
  100 = arancel 0%, 50 = mitad del DIE, 0 = sin preferencia

### acuerdos_exportacion (FK → ncm.codigo_ncm)
- mismos campos que acuerdos_importacion

Para hacer el join en una sola query:
```javascript
const { data } = await supabase
  .from('ncm')
  .select(`
    codigo_ncm, descripcion,
    aranceles_importacion (aec, die, dii, te, iva, iva_ad, gan, iibb),
    aranceles_exportacion (derecho_exportacion, reintegro)
  `)
  .eq('codigo_ncm', codigoNormalizado)  // 11 dígitos
  .single()

// Los joins vienen como array o objeto según RLS — siempre aplanar:
const ai = Array.isArray(data.aranceles_importacion)
  ? (data.aranceles_importacion[0] ?? {})
  : (data.aranceles_importacion ?? {})
const ae = Array.isArray(data.aranceles_exportacion)
  ? (data.aranceles_exportacion[0] ?? {})
  : (data.aranceles_exportacion ?? {})
```

Para buscar acuerdos de importación por NCM y país:
```javascript
const { data: acuerdos } = await supabase
  .from('acuerdos_importacion')
  .select('bloque, pais, codigo_acuerdo, porcentaje')
  .eq('codigo_ncm', codigoNormalizado)
  .ilike('pais', `%${nombrePais}%`)   // pais es nombre en español
  .order('porcentaje', { ascending: false })
  .limit(1)
```

IMPORTANTE: el campo `pais` en acuerdos_importacion es el nombre en español
(ej: "Bolivia", "Brasil"), NO el ISO3. Para cruzar con pais_origen_iso3
hay que resolverlo via country_codes:
```javascript
const { data: countryRow } = await supabase
  .from('country_codes')
  .select('name_es')   // nombre en español
  .eq('iso3', pais_origen_iso3)
  .single()
// Luego buscar acuerdos con .ilike('pais', `%${countryRow.name_es}%`)
```

### Normalización de NCM

El código que llega puede venir en cualquier formato. Usar siempre
normalizarCodigoNCM() de lib/ncm-lookup.js para convertir a 11 dígitos:
```javascript
import { normalizarCodigoNCM } from '../ncm-lookup.js'
const normalizado = normalizarCodigoNCM(ncm_code)
const codigoNCM = normalizado.codigoNCM  // "29339141000"
```

### Clients Supabase

- calc-importacion.js recibe supabase como parámetro (ya está así)
- calc-exportacion.js crea su propio cliente con getServiceClient() (ya está así)
  NO cambiar esta arquitectura — el comparador depende de ella


## ARCHIVO NUEVO: lib/data/paises-no-cooperantes.js

Crear este archivo con la lista de países no cooperantes para
transparencia fiscal (Decreto 589/13, lista AFIP):

```javascript
// Países NO cooperantes para transparencia fiscal
// Fuente: AFIP — https://www.afip.gob.ar/jurisdiccionesCooperantes/
// Última actualización: Marzo 2026
// Si el país de destino/facturación está en esta lista,
// se aplica percepción adicional Ganancias 1.5% sobre FOB

export const PAISES_NO_COOPERANTES = [
  'Brecqhou',
  'Estado de Eritrea',
  'Estado de la Ciudad del Vaticano',
  'Estado de Libia',
  'Estado Plurinacional de Bolivia',
  'Isla Ascensión',
  'Isla de Sark',
  'Isla Santa Elena',
  'Islas Salomón',
  'Los Estados Federados de Micronesia',
  'Reino de Bután',
  'Reino de Camboya',
  'Reino de Lesoto',
  'Reino de Tonga',
  'República Kirguisa',
  'República Árabe de Egipto',
  'República Árabe Siria',
  'República Argelina Democrática y Popular',
  'República Centroafricana',
  'República Cooperativa de Guyana',
  'República de Angola',
  'República de Bielorrusia',
  'República de Burundí',
  'República de Costa de Marfil',
  'República de Cuba',
  'República de Filipinas',
  'República de Fiyi',
  'República de Gambia',
  'República de Guinea',
  'República de Guinea Ecuatorial',
  'República de Guinea-Bisáu',
  'República de Haití',
  'República de Honduras',
  'República de Irak',
  'República de Kiribati',
  'República de la Unión de Myanmar',
  'República de Madagascar',
  'República de Malaui',
  'República de Malí',
  'República de Mozambique',
  'República de Nicaragua',
  'República de Palaos',
  'República de Sierra Leona',
  'República de Sudán del Sur',
  'República de Surinam',
  'República de Tayikistán',
  'República de Trinidad y Tobago',
  'República de Uzbekistán',
  'República de Yemen',
  'República de Yibuti',
  'República de Zambia',
  'República de Zimbabue',
  'República del Chad',
  'República del Níger',
  'República del Sudán',
  'República Democrática de Santo Tomé y Príncipe',
  'República Democrática de Timor Oriental',
  'República del Congo',
  'República Democrática del Congo',
  'República Democrática Federal de Etiopía',
  'República Democrática Popular Lao',
  'República Democrática Socialista de Sri Lanka',
  'República Federal de Somalia',
  'República Federal Democrática de Nepal',
  'República Gabonesa',
  'República Islámica de Afganistán',
  'República Islámica de Irán',
  'República Popular de Bangladés',
  'República Popular Democrática de Corea',
  'República Togolesa',
  'República Unida de Tanzania',
  'Territorio Británico de Ultramar Islas Pitcairn, Henderson, Ducie y Oeno',
  'Tristán da Cunha',
  'Tuvalu',
  'Unión de las Comoras',
]

// Mapeo de ISO3 a nombre oficial para los más comunes
// (para cruzar con country_codes.iso3)
export const NO_COOPERANTES_ISO3 = [
  'BOL', 'CUB', 'IRN', 'IRQ', 'PRK', 'LBY', 'SYR', 'AFG',
  'ERI', 'ETH', 'SOM', 'SDN', 'SSD', 'YEM', 'MMR', 'LAO',
  'KHM', 'BGD', 'NPL', 'LKA', 'BTN', 'KGZ', 'TJK', 'UZB',
  'BLR', 'DZA', 'AGO', 'BDI', 'TCD', 'COG', 'COD', 'CIV',
  'GNQ', 'GAB', 'GMB', 'GIN', 'GNB', 'LSO', 'MDG', 'MWI',
  'MLI', 'MOZ', 'NER', 'CAF', 'SLE', 'TGO', 'TZA', 'ZMB',
  'ZWE', 'COM', 'STP', 'SLB', 'FJI', 'KIR', 'FSM', 'PLW',
  'TON', 'TUV', 'TLS', 'HTI', 'HND', 'NIC', 'GUY', 'SUR',
  'TTO', 'EGY', 'PHL', 'VAT',
]

// Helper para verificar si un país es no cooperante
export function esPaisNoCooperante(iso3) {
  return NO_COOPERANTES_ISO3.includes(iso3)
}
```


## MODIFICAR: lib/calculadora/calc-importacion.js

Cambios respecto a la versión actual:

### 1. Buscar NCM con join a aranceles_importacion

Reemplazar la query actual por:
```javascript
const { data: ncmData, error: ncmError } = await supabase
  .from('ncm')
  .select(`
    codigo_ncm, descripcion,
    aranceles_importacion (aec, die, dii, te, iva, iva_ad, gan, iibb)
  `)
  .eq('codigo_ncm', codigoNCM)   // codigoNCM = normalizado.codigoNCM (11 dígitos)
  .single()

const ai = Array.isArray(ncmData.aranceles_importacion)
  ? (ncmData.aranceles_importacion[0] ?? {})
  : (ncmData.aranceles_importacion ?? {})

const iva = ai.iva ?? 21
const tasaEstadistica = ai.te ?? 0
```

### 2. Determinar arancel con lógica mejorada

```javascript
const MERCOSUR = ['BRA', 'PRY', 'URY']
let arancel = MERCOSUR.includes(pais_origen_iso3)
  ? (ai.dii ?? 0)
  : (ai.die ?? ai.aec ?? 0)

// Buscar preferencia arancelaria en acuerdos_importacion
// pais en esa tabla es nombre en español → resolver via country_codes
const { data: countryRow } = await supabase
  .from('country_codes')
  .select('name_es')
  .eq('iso3', pais_origen_iso3)
  .single()

if (countryRow) {
  const { data: acuerdos } = await supabase
    .from('acuerdos_importacion')
    .select('bloque, pais, codigo_acuerdo, porcentaje')
    .eq('codigo_ncm', codigoNCM)
    .ilike('pais', `%${countryRow.name_es}%`)
    .order('porcentaje', { ascending: false })
    .limit(1)

  if (acuerdos && acuerdos.length > 0) {
    const p = acuerdos[0]
    // porcentaje = % de preferencia: 100 → arancel 0%, 50 → mitad del DIE
    arancel = r(arancel * (1 - p.porcentaje / 100))
    preferencia = {
      acuerdo: p.codigo_acuerdo,
      bloque: p.bloque,
      pais: p.pais,
      porcentaje_preferencia: p.porcentaje,
      arancel_preferencial: arancel,
    }
  }
}
```

### 3. Calcular tributos con alícuotas del NCM

```javascript
const base = cif
const derecho_importacion = r(base * (arancel / 100))
const tasa_estadistica_monto = r(Math.min(base, 10000) * (tasaEstadistica / 100))
const base_iva = r(base + derecho_importacion + tasa_estadistica_monto)

const ivaMonto = condicion !== 'exento' ? r(base_iva * (iva / 100)) : 0

let ivaAdicional = 0, ganancias = 0, iibb = 0

if (condicion === 'responsable_inscripto') {
  ivaAdicional = r(base_iva * ((ai.iva_ad || 20) / 100))
  ganancias    = r(base_iva * ((ai.gan  || 6)    / 100))
  iibb         = r(base_iva * ((ai.iibb || 2.5)  / 100))
} else if (condicion === 'monotributista') {
  ivaAdicional = r(base_iva * ((ai.iva_ad || 20) / 100))
  iibb         = r(base_iva * ((ai.iibb  || 2.5) / 100))
}
```

### 4. Objeto de retorno — desglose con alícuotas reales

```javascript
desglose: {
  derecho_importacion:  { alicuota: arancel,          monto: derecho_importacion },
  tasa_estadistica:     { alicuota: tasaEstadistica,   monto: tasa_estadistica_monto },
  iva:                  { alicuota: iva,                monto: ivaMonto },
  iva_adicional:        { alicuota: ai.iva_ad ?? 0,    monto: ivaAdicional },
  percepcion_ganancias: { alicuota: ai.gan  ?? 0,      monto: ganancias },
  ingresos_brutos:      { alicuota: ai.iibb ?? 0,      monto: iibb },
}
```


## MODIFICAR: lib/calculadora/calc-exportacion.js

Este archivo crea su propio cliente Supabase (NO recibe supabase como parámetro).
Mantener esa arquitectura — no romper compatibilidad con el comparador.

### 1. Buscar NCM con join a aranceles_exportacion

```javascript
const { data, error } = await supabase
  .from('ncm')
  .select(`
    codigo_ncm, descripcion, capitulo, partida,
    aranceles_exportacion (derecho_exportacion, reintegro),
    aranceles_importacion (die, aec)
  `)
  .eq('codigo_ncm', normalizado.codigoNCM)
  .single()

const ae = Array.isArray(data.aranceles_exportacion)
  ? (data.aranceles_exportacion[0] ?? {})
  : (data.aranceles_exportacion ?? {})
const ai = Array.isArray(data.aranceles_importacion)
  ? (data.aranceles_importacion[0] ?? {})
  : (data.aranceles_importacion ?? {})

// Los campos de exportación
const derecho_exportacion = ae.derecho_exportacion ?? 0
const reintegro_base      = ae.reintegro ?? 0
// El arancel extrazona (para info en output)
const arancel_extrazona   = ai.die ?? ai.aec ?? 0
```

### 2. Bonus de reintegro

```javascript
let reintegroFinal = reintegro_base
if (params.bonus_reintegro) {
  reintegroFinal = reintegroFinal + 0.5  // +0.5 puntos porcentuales
}
const reintegroMonto = r(fob * reintegroFinal / 100)
```

Agregar `bonus_reintegro: boolean` a los parámetros de entrada.

### 3. País no cooperante

```javascript
import { esPaisNoCooperante } from '../data/paises-no-cooperantes.js'

let percepcionGananciasExpo = 0
if (pais_destino && esPaisNoCooperante(pais_destino)) {
  percepcionGananciasExpo = r(fob * 0.015)  // 1.5%
} else if (params.pais_facturacion_diferente) {
  percepcionGananciasExpo = r(fob * 0.005)  // 0.5%
}
```

`pais_destino` en calc-exportacion.js es el ISO3 del país.

### 4. NUEVA función exportada: calcularPrecioFOB

```javascript
export function calcularPrecioFOB(params) {
  const {
    costo_mercaderia,        // CM — obligatorio
    envases_embalajes = 0,   // EMB
    flete_interno = 0,       // FI
    seguro_interno = 0,      // SI
    otros_gastos = 0,        // OG
    utilidad_monto = 0,      // Utm — monto fijo
    gastos_indirectos_pct = 0, // GI — % sobre FOB
    derecho_exportacion_pct = 0, // DER — viene del NCM
    reintegro_pct = 0,       // RE — viene del NCM
    utilidad_pct = 0,        // UT — % sobre FOB
  } = params

  // Fórmula VUCE:
  // FOB = (CM + EMB + FI + SI + OG + Utm) /
  //       (1 - (GI + (DER/(1+DER)) + UT) + RE)

  const numerador = (costo_mercaderia || 0) +
                    envases_embalajes +
                    flete_interno +
                    seguro_interno +
                    otros_gastos +
                    utilidad_monto

  const gi  = gastos_indirectos_pct / 100
  const der = derecho_exportacion_pct / 100
  const ut  = utilidad_pct / 100
  const re  = reintegro_pct / 100

  const denominador = 1 - (gi + (der / (1 + der)) + ut) + re

  if (denominador <= 0) {
    return {
      error: 'Los gastos y derechos superan el 100% — no es viable exportar con estos costos'
    }
  }

  const fob = numerador / denominador

  const derechoExportacionMonto = r(fob * der)
  const reintegroMonto          = r(fob * re)
  const gastosIndirectosMonto   = r(fob * gi)
  const utilidadTotal           = r(fob * ut + utilidad_monto)

  return {
    precio_fob: r(fob),
    desglose: {
      costos_directos: {
        mercaderia:    costo_mercaderia || 0,
        envases:       envases_embalajes,
        flete_interno,
        seguro_interno,
        otros_gastos,
        subtotal: r(numerador - utilidad_monto),
      },
      sobre_fob: {
        derecho_exportacion: { pct: derecho_exportacion_pct, monto: derechoExportacionMonto },
        gastos_indirectos:   { pct: gastos_indirectos_pct,   monto: gastosIndirectosMonto },
        reintegro:           { pct: reintegro_pct,            monto: reintegroMonto },
      },
      utilidad: {
        pct:       utilidad_pct,
        monto_fijo: utilidad_monto,
        total:     utilidadTotal,
      },
    },
    notas: [
      `Precio FOB mínimo para cubrir costos: USD ${r(fob - utilidadTotal).toFixed(2)}`,
      `Con utilidad incluida: USD ${r(fob).toFixed(2)}`,
      reintegroMonto > 0 ? `Reintegro a cobrar: USD ${reintegroMonto.toFixed(2)}` : null,
    ].filter(Boolean),
  }
}
```

### 5. Objeto de retorno de calcularExportacion — agregar reintegro y percepción

```javascript
reintegro: {
  alicuota:       reintegroFinal,
  monto:          reintegroMonto,
  bonus_aplicado: params.bonus_reintegro || false,
},
percepcion_ganancias_expo: {
  aplica:   percepcionGananciasExpo > 0,
  motivo:   esPaisNoCooperante(pais_destino)
    ? 'País no cooperante (Decreto 589/13)'
    : params.pais_facturacion_diferente
      ? 'País de facturación diferente al destino'
      : null,
  alicuota: esPaisNoCooperante(pais_destino) ? 1.5
          : params.pais_facturacion_diferente ? 0.5
          : 0,
  monto:    percepcionGananciasExpo,
},
```


## MODIFICAR: app/(app)/calculadora/page.js (UI)

### Tab Exportación — Agregar toggle de modo

Debajo de los tabs "IMPORTACIÓN" / "EXPORTACIÓN", agregar
un sub-toggle cuando está en exportación:

"Ya sé mi precio FOB" | "Quiero calcular mi FOB"

Estilo: mismo que los tabs pero más chico,
font-body text-xs tracking-wide

### Modo "Ya sé mi precio FOB" (el actual)
Mantener el formulario actual + agregar estos campos:

Nuevo checkbox:
"Mi producto es orgánico / tiene denominación de origen /
sello Alimentos Argentinos" → activa bonus_reintegro (+0.5%)
Tooltip explicando las 3 opciones.

Nuevo checkbox:
"El país de facturación es diferente al destino"
→ activa percepción adicional 0.5%

En los resultados, agregar fila de REINTEGRO:
"Reintegro (0.5%): +USD 6.75" en text-emerald-400
(es positivo porque es plata que vuelve)

Si aplica percepción Ganancias expo:
"Percepción Ganancias expo (1.5%): USD 20.25" en text-amber-400
con nota "País no cooperante" o "Facturación ≠ destino"

### Modo "Quiero calcular mi FOB" (NUEVO)

Formulario completamente diferente:

Card "COSTOS DIRECTOS":
- NCM (autocompletado, igual que siempre)
- País destino (select)
- Costo de mercadería (USD) — obligatorio
- Envases y embalajes (USD) — opcional, default 0
- Flete interno (USD) — opcional
- Seguro interno (USD) — opcional
- Otros gastos (USD) — opcional, con tooltip:
  "Incluye: gastos de administración, comercialización,
  comisiones de venta, certificaciones, gastos bancarios"

Card "PORCENTAJES SOBRE FOB":
- Gastos indirectos (%) — opcional, default 0
  Tooltip: "Comisión despachante, comisiones bancarias,
  agente de venta, intereses financiación"
- Derecho de exportación (%) — autocompletado del NCM,
  editable
- Reintegro (%) — autocompletado del NCM, editable
  Checkbox bonus +0.5% (orgánico/denominación/sello)

Card "UTILIDAD":
- Toggle: "Porcentaje sobre FOB" | "Monto fijo"
  Si porcentaje: input % (ej: 15%)
  Si monto fijo: input USD (ej: 500)

Botón "CALCULAR FOB"

### Resultados del modo "Calcular FOB":

Card grande con el resultado:

"TU PRECIO FOB"
"USD 1,847.32"  (font-mono text-4xl)

Desglose visual (tabla):

Costos directos:
  Mercadería          USD 1,200.00
  Envases               USD 50.00
  Flete interno          USD 80.00
  Seguro interno         USD 15.00
  Otros gastos           USD 45.00
  ─────────────────────────────
  Subtotal            USD 1,390.00

Sobre el FOB:
  D. Exportación (4.5%)  USD 83.13
  Gastos indirectos (3%) USD 55.42
  Reintegro (1.0%)      -USD 18.47  ← en verde, resta

Utilidad (15%)          USD 277.10

═══════════════════════════════
PRECIO FOB             USD 1,847.32
PRECIO FOB UNITARIO    USD 1,847.32 / [cantidad]

Debajo: tabla de incoterms (si puso flete/seguro internacional):
FOB USD 1,847.32
CFR USD 2,017.32 (+ flete intl 170)
CIF USD 2,032.32 (+ seguro 15)

Nota si es país no cooperante.

## RESPONSIVE
Todo responsive como estaba. El modo "Calcular FOB" en mobile
va todo en 1 columna con las cards apiladas.

## EXPORTS ACTUALIZADOS

calc-exportacion.js debe exportar:
```javascript
export async function calcularExportacion(params)   // sin supabase — crea su propio cliente
export function calcularPrecioFOB(params)
export const INCOTERMS = [...]
```

calc-importacion.js debe exportar:
```javascript
export async function calcularImportacion(supabase, params)  // recibe supabase
export const REGIMENES = [...]
export const CONDICIONES_IVA = [...]
```

Leé los componentes en components/ui/ y usalos donde corresponda.
Leé los archivos actuales de calc-importacion.js y
calc-exportacion.js para entender la estructura y mantener
compatibilidad con el comparador que los usa.

Dame los 3 archivos modificados + el archivo nuevo de países
no cooperantes.
```
