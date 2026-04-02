-- ============================================================
-- Migración: columnas de uso mensual por herramienta en users_profile
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- Nuevas columnas de uso mensual
ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS simulador_this_month  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comparador_this_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nomenclador_this_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS operaciones_this_month integer NOT NULL DEFAULT 0;

-- ────────────────────────────────────────────
-- RPCs de incremento atómico (evitan race conditions)
-- ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_simulador(user_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE users_profile
  SET simulador_this_month = simulador_this_month + 1
  WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION increment_comparador(user_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE users_profile
  SET comparador_this_month = comparador_this_month + 1
  WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION increment_nomenclador(user_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE users_profile
  SET nomenclador_this_month = nomenclador_this_month + 1
  WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION increment_operaciones(user_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE users_profile
  SET operaciones_this_month = operaciones_this_month + 1
  WHERE id = user_id;
$$;

-- ────────────────────────────────────────────
-- Si los RPCs increment_queries e increment_calcs no existen, crearlos:
--
-- CREATE OR REPLACE FUNCTION increment_queries(user_id uuid)
-- RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
--   UPDATE users_profile SET queries_this_month = queries_this_month + 1 WHERE id = user_id;
-- $$;
--
-- CREATE OR REPLACE FUNCTION increment_calcs(user_id uuid)
-- RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
--   UPDATE users_profile SET calcs_this_month = calcs_this_month + 1 WHERE id = user_id;
-- $$;
-- ────────────────────────────────────────────

-- Nota: el reset mensual lo manejan los routes via queries_reset_date (on-the-fly).
