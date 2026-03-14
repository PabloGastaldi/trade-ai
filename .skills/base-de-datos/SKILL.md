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

## Tablas por crear

### `preferencias_arancelarias` (PENDIENTE)
```sql
CREATE TABLE preferencias_arancelarias (
    id SERIAL PRIMARY KEY,
    ncm_code VARCHAR(10),        -- formato XXXX.XX.XX (igual que tabla ncm)
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

### `acuerdos_generales` (PENDIENTE)
```sql
CREATE TABLE acuerdos_generales (
    id SERIAL PRIMARY KEY,
    acuerdo_id VARCHAR(20),
    pais VARCHAR(50),
    tipo VARCHAR(15),            -- 'exportacion', 'importacion', 'ambos'
    cobertura VARCHAR(20),       -- 'total', 'parcial'
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Datos a insertar: ACE-35 Chile (total), MERCOSUR Brasil/Uruguay/Paraguay (total)
```

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
