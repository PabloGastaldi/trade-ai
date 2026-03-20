# Skill: Base de Datos — Supabase

## Cuándo usar esta skill
Cuando se trabaja con queries, migraciones, estructura de tablas
o conexión a la base de datos.

## Conexión
- Plataforma: Supabase cloud
- Proyecto: dinjztjipjazwzbgjiix
- URL: NEXT_PUBLIC_SUPABASE_URL (en .env.local)
- Clave pública (anon): NEXT_PUBLIC_SUPABASE_ANON_KEY
- Clave privada (service_role): SUPABASE_SERVICE_ROLE_KEY

Para queries desde servidor usar SIEMPRE service_role key (bypasea RLS).
NUNCA usar service_role en Client Components.

## Tablas existentes

### `ncm` (ACTIVA — 10,432 filas)
Posiciones arancelarias argentinas. NCM con puntos formato XXXX.XX.XX.
```
id                  integer (PK autoincrement)
ncm_code            text         ej: "0101.21.00"
description         text         descripción del producto en español
section             text         (null en todos los registros actuales)
chapter             text         ej: "01"
arancel_extrazona   float        AEC/TEC — arancel para países sin acuerdo
arancel_intrazona   float        arancel preferencial intrazona
derecho_exportacion float
iva_importacion     float
tasa_estadistica    float
organismos_imp      text         ej: "SENASA"
organismos_exp      text
unidad_medida       text         ej: "unidades"
observaciones       text         (null en todos los registros actuales)
created_at          timestamptz
```

### `users_profile` (ACTIVA — datos reales)
```
id                  uuid (FK → auth.users)
full_name           text
company_name        text
plan_type           text         'free', 'pro', 'enterprise'
queries_this_month  integer
queries_reset_date  timestamptz
mp_subscription_id  text
created_at          timestamptz
updated_at          timestamptz
```

### `queries_log` (ACTIVA — vacía por ahora)
```
id                  integer (PK)
user_id             uuid
query_text          text
response_text       text
ncm_codes_referenced text[]
sources_cited       text[]
tokens_used         integer
created_at          timestamptz
```

### `documents_registry` (ACTIVA — vacía por ahora)
Para RAG: documentos normativos oficiales.

### `destination_tariffs` (ACTIVA — 122,220 filas)
Aranceles que cobran otros países a productos argentinos. Fuente: WITS/ITC.
Script de carga: `scripts/load-tariffs.js` (lee hoja "Data" del Excel).
```
id                  serial PK
reporting_country   text NOT NULL    -- país que cobra (ej: "China")
partner_country     text NOT NULL    -- siempre "Argentina"
year                smallint NOT NULL
hs_code             varchar(6) NOT NULL   -- código HS 6 dígitos
product_description text
num_tariff_lines    smallint
ave_rate            decimal          -- Ad Valorem Equivalent (ej: 6.0 = 6%)
created_at          timestamp default now()
```
RLS: lectura pública (data pública WITS), escritura solo service_role.

### `user_products` (ACTIVA)
Catálogo de productos de cada usuario. RLS: usuario solo ve/edita los suyos.
```
id                  uuid PK default gen_random_uuid()
user_id             uuid FK → auth.users ON DELETE CASCADE
name                text NOT NULL
ncm_code            varchar(12) NOT NULL
description         text
unit_price          decimal NOT NULL
currency            varchar(3) default 'USD'
incoterm            varchar(3) NOT NULL
weight_kg           decimal
hs_code_6           varchar(6) GENERATED ALWAYS AS (replace(left(ncm_code,7),'.','')) STORED
default_origin      varchar(3)       -- ISO3
default_destination varchar(3)       -- ISO3
operation_type      varchar(10) NOT NULL  CHECK ('exportacion'|'importacion')
is_active           boolean default true
created_at / updated_at  timestamptz
```
Trigger `trg_user_products_updated_at` actualiza `updated_at` en cada UPDATE.

### `users_profile` — columnas nuevas (2026-03-19)
```
calcs_this_month    integer NOT NULL DEFAULT 0
```
Comparte `queries_reset_date` para el ciclo mensual.
Límites: free=5 cálculos/mes, pro=ilimitado, empresa=ilimitado.

## Reglas estrictas
1. NUNCA hacer DELETE sin WHERE y sin confirmación del usuario
2. NUNCA hacer DROP TABLE sin confirmación del usuario
3. NUNCA hacer TRUNCATE sin confirmación del usuario
4. Siempre usar transacciones para operaciones de escritura múltiple
5. En Supabase, los DDL (CREATE TABLE, ALTER TABLE) se ejecutan
   desde el SQL Editor del dashboard, NO desde psql local
6. Los ncm_code se almacenan con puntos: XXXX.XX.XX
7. Los NALADISA se almacenan sin puntos: VARCHAR(10)
8. Las fechas siempre en UTC con timezone (TIMESTAMPTZ)

## Acceso desde Node.js (API Routes)
```javascript
import { createClient } from '@supabase/supabase-js'

// Solo en servidor (API routes, server components)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

// Ejemplo de query
const { data, error } = await supabase
  .from('ncm')
  .select('*')
  .eq('ncm_code', '0101.21.00')
  .limit(1)
```

## Sin backup local (estamos en cloud)
Los backups de Supabase se gestionan desde el dashboard de Supabase.
No hay pg_dump disponible sin la contraseña de la DB.
