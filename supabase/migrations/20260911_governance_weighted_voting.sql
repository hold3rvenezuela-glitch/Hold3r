-- =============================================================================
-- HOLD3R PROTOCOL VENEZUELA - GOBERNANZA: VOTO PONDERADO Y RESTRICCIÓN DE SOCIOS
-- Migration File: 20260911_governance_weighted_voting.sql
-- =============================================================================

-- 1. POLÍTICAS RLS PARA PROPOSALS (Propuestas de Gobernanza)
--    Solo usuarios con tenencia activa en asset_shares pueden ver y crear propuestas.
-- ---------------------------------------------------------------------------

-- Limpiar políticas previas para evitar conflictos
DROP POLICY IF EXISTS "Socios leen propuestas" ON public.proposals;
DROP POLICY IF EXISTS "Socios crean propuestas" ON public.proposals;
DROP POLICY IF EXISTS "Solo admins actualizan propuestas" ON public.proposals;

-- Lectura: Solo admins Y usuarios con al menos 1 registro en asset_shares
CREATE POLICY "Socios leen propuestas" ON public.proposals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.asset_shares
      WHERE asset_shares.user_id = auth.uid()
        AND asset_shares.shares_percentage > 0
    )
  );

-- Inserción: Solo admins e inversores con tenencia activa
CREATE POLICY "Socios crean propuestas" ON public.proposals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.asset_shares
      WHERE asset_shares.user_id = auth.uid()
        AND asset_shares.shares_percentage > 0
    )
  );

-- Actualización: Solo admins pueden cambiar el estado de las propuestas
CREATE POLICY "Solo admins actualizan propuestas" ON public.proposals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 2. POLÍTICAS RLS PARA VOTES (Votos Ponderados)
-- ---------------------------------------------------------------------------

-- Limpiar políticas previas
DROP POLICY IF EXISTS "Socios leen votos" ON public.votes;
DROP POLICY IF EXISTS "Socios emiten votos" ON public.votes;

-- Lectura de votos: Cualquier socio con tenencia puede ver el historial
CREATE POLICY "Socios leen votos" ON public.votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.asset_shares
      WHERE asset_shares.user_id = auth.uid()
        AND asset_shares.shares_percentage > 0
    )
  );

-- Inserción de votos: Solo el propio usuario con tenencia activa
CREATE POLICY "Socios emiten votos" ON public.votes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
      )
      OR
      EXISTS (
        SELECT 1 FROM public.asset_shares
        WHERE asset_shares.user_id = auth.uid()
          AND asset_shares.shares_percentage > 0
      )
    )
  );

-- 3. FUNCIÓN RPC ATÓMICA: Emitir Voto Ponderado por Participación
--    - Calcula el poder de voto = suma de shares_percentage del usuario.
--    - Admins: poder de voto fijo de 1.0 si no tienen asset_shares.
--    - Previene votos duplicados (1 voto por usuario por propuesta).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cast_weighted_vote(
  p_proposal_id UUID,
  p_user_id     UUID,
  p_vote        TEXT  -- 'yes' | 'no'
) RETURNS JSONB AS $$
DECLARE
  v_voting_power  NUMERIC := 0;
  v_user_role     TEXT;
  v_existing_vote UUID;
  v_vote_id       UUID;
BEGIN
  -- Validar parámetro de voto
  IF p_vote NOT IN ('yes', 'no') THEN
    RAISE EXCEPTION 'Voto inválido: debe ser ''yes'' o ''no''.';
  END IF;

  -- Verificar que la propuesta existe y está activa
  IF NOT EXISTS (
    SELECT 1 FROM public.proposals
    WHERE id = p_proposal_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'La propuesta no existe o ya no está activa.';
  END IF;

  -- Verificar que el usuario no haya votado ya en esta propuesta
  SELECT id INTO v_existing_vote
  FROM public.votes
  WHERE proposal_id = p_proposal_id AND user_id = p_user_id;

  IF FOUND THEN
    RAISE EXCEPTION 'Ya emitiste un voto en esta propuesta. No se permiten votos duplicados.';
  END IF;

  -- Obtener rol del usuario
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = p_user_id;

  -- Calcular poder de voto = suma total de shares_percentage en asset_shares
  SELECT COALESCE(SUM(shares_percentage), 0) INTO v_voting_power
  FROM public.asset_shares
  WHERE user_id = p_user_id
    AND shares_percentage > 0;

  -- Admin sin fracciones propias: poder de voto simbólico = 1.0
  IF v_user_role = 'admin' AND v_voting_power = 0 THEN
    v_voting_power := 1.0;
  END IF;

  -- Inversores sin ninguna fracción activa no pueden votar
  IF v_user_role != 'admin' AND v_voting_power = 0 THEN
    RAISE EXCEPTION 'No posees fracciones activas. Solo los Socios con tenencia de acciones pueden votar en gobernanza.';
  END IF;

  -- Insertar el voto ponderado
  INSERT INTO public.votes (proposal_id, user_id, vote, weight)
  VALUES (p_proposal_id, p_user_id, p_vote, v_voting_power)
  RETURNING id INTO v_vote_id;

  RETURN jsonb_build_object(
    'success',       true,
    'vote_id',       v_vote_id,
    'vote',          p_vote,
    'voting_power',  v_voting_power,
    'user_role',     v_user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. VISTA AUXILIAR: Resultados ponderados de propuestas
--    Calcula el % de votos A Favor / En Contra basado en el PESO (shares_percentage)
--    en lugar del conteo simple de votos.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.proposal_vote_results AS
SELECT
  v.proposal_id,
  p.title                                                          AS proposal_title,
  p.status                                                         AS proposal_status,
  p.asset_id,
  COUNT(v.id)                                                      AS total_votes_count,
  COALESCE(SUM(v.weight), 0)                                       AS total_voting_power,
  COALESCE(SUM(v.weight) FILTER (WHERE v.vote = 'yes'), 0)         AS yes_power,
  COALESCE(SUM(v.weight) FILTER (WHERE v.vote = 'no'),  0)         AS no_power,
  CASE
    WHEN COALESCE(SUM(v.weight), 0) > 0
    THEN ROUND(
      COALESCE(SUM(v.weight) FILTER (WHERE v.vote = 'yes'), 0)
      / SUM(v.weight) * 100, 2
    )
    ELSE 0
  END                                                              AS yes_percent,
  CASE
    WHEN COALESCE(SUM(v.weight), 0) > 0
    THEN ROUND(
      COALESCE(SUM(v.weight) FILTER (WHERE v.vote = 'no'), 0)
      / SUM(v.weight) * 100, 2
    )
    ELSE 0
  END                                                              AS no_percent
FROM public.votes v
JOIN public.proposals p ON p.id = v.proposal_id
GROUP BY v.proposal_id, p.title, p.status, p.asset_id;

COMMENT ON FUNCTION cast_weighted_vote IS
  'Emite un voto ponderado en una propuesta de gobernanza. El peso del voto equivale al porcentaje total de shares_percentage del usuario en asset_shares. Previene duplicados y restringe el acceso a usuarios sin tenencia activa.';

COMMENT ON VIEW proposal_vote_results IS
  'Vista auxiliar que expone los resultados ponderados de votación por propuesta. Usar en el frontend para mostrar porcentajes basados en poder de voto real (shares_percentage) en lugar de conteo simple.';
