-- =============================================================================
-- HOLD3R — BLOQUEO TOTAL RLS GOBERNANZA (CORRECCIÓN ESTRICTA)
-- Migration File: 20260911_governance_strict_rls_fix.sql
--
-- PROBLEMA RAÍZ: Las políticas RLS que usan EXISTS(SELECT FROM asset_shares)
-- dentro de otra tabla con RLS pueden fallar silenciosamente o ser bypasseadas
-- cuando Supabase evalúa políticas en cadena. La solución es una función
-- SECURITY DEFINER que accede a asset_shares sin restricción RLS.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FUNCIÓN HELPER SECURITY DEFINER: Verificador de Tenencia
--    Al ser SECURITY DEFINER, se ejecuta con permisos del owner (postgres),
--    evitando recursión RLS y garantizando evaluación directa de asset_shares.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION hold3r_user_is_shareholder(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.asset_shares
    WHERE user_id = p_user_id
      AND shares_percentage > 0
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER
   SET search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION hold3r_user_is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER
   SET search_path = public, pg_catalog;

-- Función combinada: es admin O tiene acciones activas
CREATE OR REPLACE FUNCTION hold3r_user_has_governance_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT (
    hold3r_user_is_admin(p_user_id)
    OR
    hold3r_user_is_shareholder(p_user_id)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER
   SET search_path = public, pg_catalog;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. LIMPIAR TODAS LAS POLÍTICAS EXISTENTES EN proposals Y votes
--    (incluyendo las del migration anterior para evitar conflictos OR)
-- ─────────────────────────────────────────────────────────────────────────────

-- proposals: eliminar TODAS las políticas conocidas y posibles duplicados
DROP POLICY IF EXISTS "Socios leen propuestas"            ON public.proposals;
DROP POLICY IF EXISTS "Socios crean propuestas"           ON public.proposals;
DROP POLICY IF EXISTS "Solo admins actualizan propuestas" ON public.proposals;
DROP POLICY IF EXISTS "Propuestas lectura pública"        ON public.proposals;
DROP POLICY IF EXISTS "Lectura pública de propuestas"     ON public.proposals;
DROP POLICY IF EXISTS "proposals_select"                  ON public.proposals;
DROP POLICY IF EXISTS "proposals_insert"                  ON public.proposals;
DROP POLICY IF EXISTS "proposals_update"                  ON public.proposals;

-- votes: eliminar TODAS las políticas conocidas
DROP POLICY IF EXISTS "Socios leen votos"                 ON public.votes;
DROP POLICY IF EXISTS "Socios emiten votos"               ON public.votes;
DROP POLICY IF EXISTS "Votos lectura pública"             ON public.votes;
DROP POLICY IF EXISTS "Lectura pública de votos"          ON public.votes;
DROP POLICY IF EXISTS "votes_select"                      ON public.votes;
DROP POLICY IF EXISTS "votes_insert"                      ON public.votes;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ASEGURAR QUE RLS ESTÉ HABILITADO (idempotente)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes     ENABLE ROW LEVEL SECURITY;

-- FORCE RLS incluso para el dueño de la tabla (extra seguridad en Supabase)
ALTER TABLE public.proposals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.votes     FORCE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. POLÍTICAS ESTRICTAS PARA proposals
--    Usa hold3r_user_has_governance_access() — bulletproof sin recursión RLS
-- ─────────────────────────────────────────────────────────────────────────────

-- SELECT: Solo admin o usuario con shares_percentage > 0
CREATE POLICY "gov_proposals_select"
  ON public.proposals FOR SELECT
  USING ( hold3r_user_has_governance_access(auth.uid()) );

-- INSERT: Solo admin o accionista activo; además valida tenencia en el asset
CREATE POLICY "gov_proposals_insert"
  ON public.proposals FOR INSERT
  WITH CHECK (
    hold3r_user_is_admin(auth.uid())
    OR (
      hold3r_user_is_shareholder(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.asset_shares
        WHERE user_id     = auth.uid()
          AND asset_id    = proposals.asset_id
          AND shares_percentage > 0
      )
    )
  );

-- UPDATE: Solo administradores pueden cambiar estado de propuestas
CREATE POLICY "gov_proposals_update"
  ON public.proposals FOR UPDATE
  USING ( hold3r_user_is_admin(auth.uid()) );

-- DELETE: Solo administradores
CREATE POLICY "gov_proposals_delete"
  ON public.proposals FOR DELETE
  USING ( hold3r_user_is_admin(auth.uid()) );


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. POLÍTICAS ESTRICTAS PARA votes
-- ─────────────────────────────────────────────────────────────────────────────

-- SELECT: Solo admin o accionista activo
CREATE POLICY "gov_votes_select"
  ON public.votes FOR SELECT
  USING ( hold3r_user_has_governance_access(auth.uid()) );

-- INSERT: El propio usuario, que además debe ser admin o accionista activo
CREATE POLICY "gov_votes_insert"
  ON public.votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND hold3r_user_has_governance_access(auth.uid())
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RPC VALIDADA: Crear Propuesta con Verificación de Tenencia en el Activo
--    Sustituye la inserción directa desde el cliente para garantizar que el
--    usuario no solo sea accionista general, sino del activo específico.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_governance_proposal(
  p_asset_id    UUID,
  p_title       TEXT,
  p_description TEXT
) RETURNS JSONB AS $$
DECLARE
  v_caller_id   UUID  := auth.uid();
  v_is_admin    BOOL;
  v_has_share   BOOL;
  v_proposal_id UUID;
BEGIN
  -- Validar inputs
  IF p_title IS NULL OR TRIM(p_title) = '' THEN
    RAISE EXCEPTION 'El título de la propuesta no puede estar vacío.';
  END IF;
  IF p_asset_id IS NULL THEN
    RAISE EXCEPTION 'Debes asociar la propuesta a un activo válido.';
  END IF;

  v_is_admin  := hold3r_user_is_admin(v_caller_id);

  -- Verificar tenencia específica en el activo (no sólo general)
  SELECT EXISTS (
    SELECT 1 FROM public.asset_shares
    WHERE user_id     = v_caller_id
      AND asset_id    = p_asset_id
      AND shares_percentage > 0
  ) INTO v_has_share;

  IF NOT v_is_admin AND NOT v_has_share THEN
    RAISE EXCEPTION
      'Acceso denegado: debes poseer fracciones activas del activo seleccionado para crear una propuesta de gobernanza.';
  END IF;

  -- Verificar que el activo existe
  IF NOT EXISTS (SELECT 1 FROM public.assets WHERE id = p_asset_id) THEN
    RAISE EXCEPTION 'El activo especificado no existe.';
  END IF;

  -- Insertar propuesta
  INSERT INTO public.proposals (asset_id, title, description, status, created_at)
  VALUES (p_asset_id, TRIM(p_title), TRIM(p_description), 'active', now())
  RETURNING id INTO v_proposal_id;

  RETURN jsonb_build_object(
    'success',     true,
    'proposal_id', v_proposal_id,
    'asset_id',    p_asset_id,
    'title',       p_title
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_catalog;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ACTUALIZAR cast_weighted_vote para usar los helpers SECURITY DEFINER
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cast_weighted_vote(
  p_proposal_id UUID,
  p_user_id     UUID,
  p_vote        TEXT
) RETURNS JSONB AS $$
DECLARE
  v_voting_power  NUMERIC := 0;
  v_is_admin      BOOL;
  v_has_shares    BOOL;
  v_vote_id       UUID;
BEGIN
  -- Validar voto
  IF p_vote NOT IN ('yes', 'no') THEN
    RAISE EXCEPTION 'Voto inválido: debe ser ''yes'' o ''no''.';
  END IF;

  -- Verificar propuesta activa
  IF NOT EXISTS (
    SELECT 1 FROM public.proposals
    WHERE id = p_proposal_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'La propuesta no existe o ya no está activa.';
  END IF;

  -- Verificar voto duplicado
  IF EXISTS (
    SELECT 1 FROM public.votes
    WHERE proposal_id = p_proposal_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Ya emitiste un voto en esta propuesta. No se permiten votos duplicados.';
  END IF;

  -- Verificar acceso
  v_is_admin  := hold3r_user_is_admin(p_user_id);
  v_has_shares := hold3r_user_is_shareholder(p_user_id);

  IF NOT v_is_admin AND NOT v_has_shares THEN
    RAISE EXCEPTION
      'No posees fracciones activas. Solo los Socios con tenencia de acciones pueden votar en gobernanza.';
  END IF;

  -- Calcular poder de voto
  SELECT COALESCE(SUM(shares_percentage), 0) INTO v_voting_power
  FROM public.asset_shares
  WHERE user_id = p_user_id AND shares_percentage > 0;

  IF v_is_admin AND v_voting_power = 0 THEN
    v_voting_power := 1.0;
  END IF;

  -- Insertar voto ponderado
  INSERT INTO public.votes (proposal_id, user_id, vote, weight)
  VALUES (p_proposal_id, p_user_id, p_vote, v_voting_power)
  RETURNING id INTO v_vote_id;

  RETURN jsonb_build_object(
    'success',      true,
    'vote_id',      v_vote_id,
    'vote',         p_vote,
    'voting_power', v_voting_power
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_catalog;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. COMENTARIOS DE DOCUMENTACIÓN
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON FUNCTION hold3r_user_has_governance_access IS
  'Verifica si un usuario tiene acceso al módulo de gobernanza (es admin O posee shares_percentage > 0 en asset_shares). SECURITY DEFINER para evitar recursión RLS.';

COMMENT ON FUNCTION create_governance_proposal IS
  'RPC validada para crear propuestas de gobernanza. Verifica que el usuario tenga tenencia activa del activo específico seleccionado antes de insertar.';

COMMENT ON FUNCTION cast_weighted_vote IS
  'Emite voto ponderado (weight = SUM shares_percentage). Bloquea inversores sin tenencia. Previene duplicados. SECURITY DEFINER para evaluación segura.';
