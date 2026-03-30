-- ═══════════════════════════════════════════════════════════════════
-- trade.ai — Tabla granos_bcr
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Almacena las cotizaciones de granos de la Bolsa de Comercio de
-- Rosario (BCR), actualizadas por el cron de Vercel cada 30 minutos.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS granos_bcr (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  fecha_bcr   text,           -- fecha de sesión BCR, ej: "26/03/2026"
  granos      jsonb NOT NULL  -- array de { name, price, prevPrice, change, changePercent, unit }
);

-- Solo conservar los últimos 7 días de registros (limpieza automática)
CREATE INDEX IF NOT EXISTS granos_bcr_fetched_at_idx ON granos_bcr (fetched_at DESC);

-- RLS: acceso solo vía service_role
ALTER TABLE granos_bcr ENABLE ROW LEVEL SECURITY;
