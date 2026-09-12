-- =============================================================================
-- HOLD3R — GOBERNANZA: FILTRADO POR TENENCIA DE ACTIVO ESPECÍFICO
-- Migration File: 20260911_governance_per_asset_rls.sql
--
-- REGLA DE NEGOCIO:
--   Una propuesta del activo X solo es visible/votable para usuarios que
--   posean shares_percentage > 0 en ese mismo activo X.
--   Admins tienen visibilidad general sin restricción.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FUNCIÓN HELPER: Verificar tenencia en un activo ESPECÍFICO
--    SECURITY DEFINER para evitar recursión RLS al ser llamada desde políticas.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION hold3r_user_has_asset_share(
  p_user_id  UUID,
  p_asset_id UUID
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.asset_shares
    WHERE user_id         = p_user_id
      AND asset_id        = p_asset_id
      AND shares_percentage > 0
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER
   SET search_path = public, pg_catalog;

COMMENT ON FUNCTION hold3r_user_has_asset_share IS
  'Verifica si un usuario posee shares_percentage > 0 en un activo específico. '
  'SECURITY DEFINER para ser usada de forma segura dentro de políticas RLS '
  'sin recursión en asset_shares.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. REEMPLAZAR POLÍTICA SELECT EN proposals
--    Borra la política global anterior y crea una por-activo.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "gov_proposals_select" ON public.proposals;

-- Nueva política: el usuario debe tener acciones en proposals.asset_id
CREATE POLICY "gov_proposals_select"
  ON public.proposals FOR SELECT
  USING (
    -- Admins ven todas las propuestas sin restricción
    hold3r_user_is_admin(auth.uid())
    OR
    -- Inversores: solo ven propuestas del activo donde tienen participación
    hold3r_user_has_asset_share(auth.uid(), proposals.asset_id)
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. REEMPLAZAR POLÍTICA SELECT EN votes
--    Un usuario solo debe ver los votos de propuestas donde tiene acceso.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "gov_votes_select" ON public.votes;

CREATE POLICY "gov_votes_select"
  ON public.votes FOR SELECT
  USING (
    hold3r_user_is_admin(auth.uid())
    OR
    -- El usuario puede ver votos de una propuesta si tiene acciones en ese activo
    EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = votes.proposal_id
        AND hold3r_user_has_asset_share(auth.uid(), p.asset_id)
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ACTUALIZAR cast_weighted_vote: validar tenencia en el activo de la propuesta
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cast_weighted_vote(
  p_proposal_id UUID,
  p_user_id     UUID,
  p_vote        TEXT
) RETURNS JSONB AS $$
DECLARE
  v_proposal      RECORD;
  v_voting_power  NUMERIC := 0;
  v_is_admin      BOOL;
  v_vote_id       UUID;
BEGIN
  -- Validar voto
  IF p_vote NOT IN ('yes', 'no') THEN
    RAISE EXCEPTION 'Voto inválido: debe ser ''yes'' o ''no''.';
  END IF;

  -- Obtener propuesta y verificar que esté activa
  SELECT * INTO v_proposal
  FROM public.proposals
  WHERE id = p_proposal_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La propuesta no existe o ya no está activa.';
  END IF;

  -- Verificar voto duplicado
  IF EXISTS (
    SELECT 1 FROM public.votes
    WHERE proposal_id = p_proposal_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Ya emitiste un voto en esta propuesta. No se permiten votos duplicados.';
  END IF;

  v_is_admin := hold3r_user_is_admin(p_user_id);

  -- Verificar tenencia en el activo ESPECÍFICO de la propuesta (no global)
  IF NOT v_is_admin AND NOT hold3r_user_has_asset_share(p_user_id, v_proposal.asset_id) THEN
    RAISE EXCEPTION
      'No posees participación activa en el activo "%" (ID: %). '
      'Solo los accionistas de ese activo específico pueden votar esta propuesta.',
      (SELECT title FROM public.assets WHERE id = v_proposal.asset_id),
      v_proposal.asset_id;
  END IF;

  -- Calcular poder de voto: solo las acciones del activo específico de la propuesta
  SELECT COALESCE(SUM(shares_percentage), 0) INTO v_voting_power
  FROM public.asset_shares
  WHERE user_id  = p_user_id
    AND asset_id = v_proposal.asset_id
    AND shares_percentage > 0;

  -- Admin sin fracciones: poder simbólico = 1.0
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
    'voting_power', v_voting_power,
    'asset_id',     v_proposal.asset_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_catalog;

COMMENT ON FUNCTION cast_weighted_vote IS
  'Emite voto ponderado. El peso = shares_percentage del usuario en el activo '
  'ESPECÍFICO de la propuesta. Bloquea usuarios sin tenencia en ese activo. '
  'Previene duplicados. SECURITY DEFINER.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ACTUALIZAR create_governance_proposal (ya valida por activo — confirmar)
-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ACTUALIZAR create_governance_proposal: Límite estricto de 7 Días + Activo + Tenencia
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_governance_proposal(
  p_asset_id    UUID,
  p_title       TEXT,
  p_description TEXT
) RETURNS JSONB AS $$
DECLARE
  v_caller_id       UUID := auth.uid();
  v_proposal_id     UUID;
  v_last_proposal   TIMESTAMPTZ;
  v_days_since_last NUMERIC;
BEGIN
  IF p_title IS NULL OR TRIM(p_title) = '' THEN
    RAISE EXCEPTION 'El título de la propuesta no puede estar vacío.';
  END IF;
  IF p_asset_id IS NULL THEN
    RAISE EXCEPTION 'Debes asociar la propuesta a un activo válido.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.assets WHERE id = p_asset_id) THEN
    RAISE EXCEPTION 'El activo especificado no existe.';
  END IF;

  -- Verificar tenencia en el activo específico (o ser admin)
  IF NOT hold3r_user_is_admin(v_caller_id)
     AND NOT hold3r_user_has_asset_share(v_caller_id, p_asset_id) THEN
    RAISE EXCEPTION
      'Acceso denegado: no posees fracciones activas del activo seleccionado '
      'para crear una propuesta de gobernanza.';
  END IF;

  -- ── LÍMITE ESTRICTO DE 7 DÍAS ──
  SELECT MAX(created_at) INTO v_last_proposal
  FROM public.proposals
  WHERE created_by = v_caller_id;

  IF v_last_proposal IS NOT NULL THEN
    v_days_since_last := EXTRACT(EPOCH FROM (now() - v_last_proposal)) / 86400.0;
    IF v_days_since_last < 7.0 THEN
      RAISE EXCEPTION
        'Límite de creación: debes esperar % días más antes de crear una nueva propuesta. Solo puedes crear una propuesta cada 7 días.',
        CEIL(7.0 - v_days_since_last);
    END IF;
  END IF;

  INSERT INTO public.proposals (asset_id, title, description, status, created_by, expires_at, created_at)
  VALUES (p_asset_id, TRIM(p_title), TRIM(p_description), 'active', v_caller_id, now() + INTERVAL '24 hours', now())
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
-- 6. ELIMINACIÓN Y EDICIÓN DE PROPUESTAS: VENTANA DE GRACIA 5 MINUTOS & 0 VOTOS
-- ─────────────────────────────────────────────────────────────────────────────

-- 6.1 RPC para eliminar propuesta en ventana de gracia (5m y 0 votos)
CREATE OR REPLACE FUNCTION delete_governance_proposal(
  p_proposal_id UUID,
  p_user_id     UUID DEFAULT auth.uid()
) RETURNS JSONB AS $$
DECLARE
  v_proposal RECORD;
  v_vote_count INT;
BEGIN
  SELECT * INTO v_proposal FROM public.proposals WHERE id = p_proposal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La propuesta especificada no existe.';
  END IF;

  -- Solo el creador de la propuesta puede eliminarla
  IF v_proposal.created_by IS NOT NULL AND v_proposal.created_by <> p_user_id THEN
    RAISE EXCEPTION 'Solo el creador original de la propuesta tiene permitido eliminarla.';
  END IF;

  -- Regla de 5 minutos
  IF (now() - v_proposal.created_at) > INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'Transcurridos los 5 minutos de gracia, la propuesta es inmutable y no se puede eliminar.';
  END IF;

  -- Regla de 0 votos
  SELECT COUNT(*) INTO v_vote_count FROM public.votes WHERE proposal_id = p_proposal_id;
  IF v_vote_count > 0 THEN
    RAISE EXCEPTION 'La propuesta ya recibió votos. Es inmutable y no se puede eliminar.';
  END IF;

  DELETE FROM public.proposals WHERE id = p_proposal_id;

  RETURN jsonb_build_object('success', true, 'deleted_id', p_proposal_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_catalog;

-- 6.2 RPC para editar propuesta en ventana de gracia (5m y 0 votos)
CREATE OR REPLACE FUNCTION update_governance_proposal(
  p_proposal_id UUID,
  p_user_id     UUID DEFAULT auth.uid(),
  p_title       TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_proposal RECORD;
  v_vote_count INT;
BEGIN
  SELECT * INTO v_proposal FROM public.proposals WHERE id = p_proposal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La propuesta especificada no existe.';
  END IF;

  IF v_proposal.created_by IS NOT NULL AND v_proposal.created_by <> p_user_id THEN
    RAISE EXCEPTION 'Solo el creador original de la propuesta tiene permitido editarla.';
  END IF;

  IF (now() - v_proposal.created_at) > INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'Transcurridos los 5 minutos de gracia, la propuesta es inmutable y no se puede editar.';
  END IF;

  SELECT COUNT(*) INTO v_vote_count FROM public.votes WHERE proposal_id = p_proposal_id;
  IF v_vote_count > 0 THEN
    RAISE EXCEPTION 'La propuesta ya recibió votos. Es inmutable y no se puede editar.';
  END IF;

  UPDATE public.proposals
  SET title       = COALESCE(NULLIF(TRIM(p_title), ''), title),
      description = COALESCE(NULLIF(TRIM(p_description), ''), description)
  WHERE id = p_proposal_id;

  RETURN jsonb_build_object('success', true, 'proposal_id', p_proposal_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_catalog;

-- 6.3 Políticas RLS directas para DELETE y UPDATE en public.proposals
DROP POLICY IF EXISTS "Grace period delete proposals" ON public.proposals;
CREATE POLICY "Grace period delete proposals"
ON public.proposals
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  AND (now() - created_at) <= INTERVAL '5 minutes'
  AND NOT EXISTS (SELECT 1 FROM public.votes WHERE proposal_id = proposals.id)
);

DROP POLICY IF EXISTS "Grace period update proposals" ON public.proposals;
CREATE POLICY "Grace period update proposals"
ON public.proposals
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  AND (now() - created_at) <= INTERVAL '5 minutes'
  AND NOT EXISTS (SELECT 1 FROM public.votes WHERE proposal_id = proposals.id)
);
