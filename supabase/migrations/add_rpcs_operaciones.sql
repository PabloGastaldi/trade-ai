-- Migración: RPCs server-side para filtrado de tablas operativas
-- Fase 0.1 del plan de optimización de tablas

-- ─────────────────────────────────────────────
-- Helper: ncm_patron_matches
--
-- ncm_patron puede ser:
--   NULL              → aplica a todos
--   'todos'           → aplica a todos
--   '04%'             → un único patrón LIKE
--   '01%,02%,03%'     → lista de patrones separados por coma
--   '2804.70%,2806%'  → lista con puntos (el NCM de entrada también puede tener puntos)
--
-- Devuelve TRUE si p_ncm matchea al menos uno de los patrones.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION ncm_patron_matches(p_ncm TEXT, patron TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  parte TEXT;
BEGIN
  -- Sin NCM o patrón nulo/vacío/nan/todos → siempre aplica
  IF p_ncm IS NULL OR patron IS NULL OR patron = '' OR patron = 'nan' OR patron = 'todos' THEN
    RETURN TRUE;
  END IF;

  -- Iterar sobre cada patrón separado por coma
  FOREACH parte IN ARRAY string_to_array(patron, ',')
  LOOP
    parte := trim(parte);
    IF parte = '' THEN CONTINUE; END IF;
    -- Comparar sin puntos para normalizar formatos (2804.70% → 280470%)
    IF replace(p_ncm, '.', '') LIKE replace(parte, '.', '') THEN
      RETURN TRUE;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─────────────────────────────────────────────
-- RPC: documentos_por_operacion
--
-- Devuelve documentos requeridos filtrados por tipo de operación,
-- régimen, NCM (soporta lista de patrones) y opcionalmente país.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION documentos_por_operacion(
  p_tipo    TEXT,
  p_regimen TEXT,
  p_ncm     TEXT DEFAULT NULL,
  p_pais    TEXT DEFAULT NULL
)
RETURNS SETOF documentos_requeridos AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM documentos_requeridos dr
  WHERE dr.tipo_operacion = p_tipo
    AND dr.regimen = p_regimen
    AND ncm_patron_matches(p_ncm, dr.ncm_patron)
    AND (dr.pais_patron IS NULL OR dr.pais_patron = '' OR dr.pais_patron = 'nan' OR dr.pais_patron = p_pais)
  ORDER BY dr.sort_order;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- RPC: intervenciones_por_operacion
--
-- Devuelve organismos intervinientes filtrados por operación,
-- régimen y NCM (soporta lista de patrones).
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION intervenciones_por_operacion(
  p_operacion TEXT,
  p_regimen   TEXT,
  p_ncm       TEXT DEFAULT NULL
)
RETURNS SETOF regimen_intervenciones AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM regimen_intervenciones ri
  WHERE ri.operacion = p_operacion
    AND ri.regimen = p_regimen
    AND ncm_patron_matches(p_ncm, ri.ncm_patron);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- RPC: restricciones_por_regimen
--
-- Devuelve restricciones aplicables a un régimen dado.
-- ─────────────────────────────────────────────
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
