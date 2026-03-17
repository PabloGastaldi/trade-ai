-- ═══════════════════════════════════════════════════════════════════
-- trade.ai — Row Level Security (RLS) + Trigger de registro
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- El script es idempotente (se puede re-ejecutar sin romper nada).
--
-- MODELO DE ACCESO:
--   Las tablas de datos (ncm, preferencias, acuerdos, documents) son
--   PRIVADAS. Nadie accede directamente — solo lo hace la API de trade.ai
--   usando service_role desde el servidor. RLS habilitado sin policies
--   = deniega todo a anon y authenticated por defecto.
--
--   users_profile y queries_log: cada usuario ve solo sus propios datos.
-- ═══════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────
-- 1. NCM — acceso solo vía service_role (API server-side)
--    Habilitar RLS sin policies = nadie puede leer/escribir excepto
--    service_role (que bypasea RLS siempre).
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE ncm ENABLE ROW LEVEL SECURITY;

-- Eliminar policies anteriores si existían
DROP POLICY IF EXISTS "ncm_lectura_publica" ON ncm;


-- ───────────────────────────────────────────────────────────────────
-- 2. PREFERENCIAS_ARANCELARIAS — acceso solo vía service_role
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE preferencias_arancelarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "preferencias_lectura_publica" ON preferencias_arancelarias;


-- ───────────────────────────────────────────────────────────────────
-- 3. ACUERDOS_GENERALES — acceso solo vía service_role
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE acuerdos_generales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acuerdos_lectura_publica" ON acuerdos_generales;


-- ───────────────────────────────────────────────────────────────────
-- 4. DOCUMENTS_REGISTRY — acceso solo vía service_role
--    El índice de documentos normativos tampoco es accesible directo.
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE documents_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_lectura_autenticados" ON documents_registry;


-- ───────────────────────────────────────────────────────────────────
-- 5. USERS_PROFILE — cada usuario solo ve y edita su propia fila
--    La columna `id` = auth.uid() del usuario autenticado.
--    INSERT: lo hace el trigger (con SECURITY DEFINER, escapa RLS).
--    DELETE: no permitido para usuarios (solo service_role).
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_profile_select_own" ON users_profile;
CREATE POLICY "users_profile_select_own"
  ON users_profile
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_profile_update_own" ON users_profile;
CREATE POLICY "users_profile_update_own"
  ON users_profile
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ───────────────────────────────────────────────────────────────────
-- 6. QUERIES_LOG — cada usuario solo ve e inserta sus propias consultas
--    La columna `user_id` = auth.uid() del usuario autenticado.
--    UPDATE/DELETE: no permitido (historial inmutable para el usuario).
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE queries_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "queries_log_select_own" ON queries_log;
CREATE POLICY "queries_log_select_own"
  ON queries_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "queries_log_insert_own" ON queries_log;
CREATE POLICY "queries_log_insert_own"
  ON queries_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- ───────────────────────────────────────────────────────────────────
-- 7. TRIGGER — auto-crear users_profile al registrarse un usuario
--
--    Cuando Supabase Auth inserta en auth.users, este trigger crea
--    automáticamente la fila en users_profile con plan free.
--
--    SECURITY DEFINER: corre con permisos del owner (postgres),
--    no del usuario que dispara el evento → puede hacer el INSERT
--    aunque el usuario no tenga policy de INSERT en users_profile.
--
--    ON CONFLICT DO NOTHING: idempotente, no falla si ya existe.
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.crear_perfil_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users_profile (
    id,
    full_name,
    company_name,
    plan_type,
    queries_this_month,
    queries_reset_date
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'company_name',
    'free',
    0,
    (NOW() + INTERVAL '1 month')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.crear_perfil_usuario();


-- ───────────────────────────────────────────────────────────────────
-- VERIFICACIÓN — descomentar y ejecutar para confirmar
-- ───────────────────────────────────────────────────────────────────
-- Tablas con RLS habilitado:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- Policies existentes (solo users_profile y queries_log deben tener):
-- SELECT tablename, policyname, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
