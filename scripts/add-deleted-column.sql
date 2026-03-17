-- ═══════════════════════════════════════════════════════════════════
-- Agregar soft delete a queries_log
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════

-- 1. Agregar columna deleted (default false = no borrado)
ALTER TABLE queries_log
  ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;

-- 2. Crear índice para que el filtro .eq('deleted', false) sea rápido
CREATE INDEX IF NOT EXISTS queries_log_deleted_idx
  ON queries_log (user_id, deleted, created_at DESC);

-- 3. Agregar policy UPDATE para que el usuario pueda hacer soft delete
--    Solo puede setear deleted=true en sus propias filas
DROP POLICY IF EXISTS "queries_log_softdelete_own" ON queries_log;
CREATE POLICY "queries_log_softdelete_own"
  ON queries_log
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
