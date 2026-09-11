-- =============================================================================
-- HOLD3R — GOBERNANZA: FEATURES AVANZADAS
-- Migration File: 20260911_governance_advanced_features.sql
--
-- Features implementadas:
--   1. Límite de 1 propuesta por usuario cada 7 días
--   2. Cierre automático a las 24 horas con cálculo de resultado ponderado
--   3. Tabla de notificaciones + trigger para socios al crear propuesta
--   4. Columnas expires_at y result en proposals
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EXTENDER TABLA proposals: expires_at, result, closed_at
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ  DEFAULT (now() + INTERVAL '24 hours'),
  ADD COLUMN IF NOT EXISTS result      TEXT         CHECK (result IN ('approved', 'rejected', 'tie')),
  ADD COLUMN IF NOT EXISTS closed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS yes_power   NUMERIC      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_power    NUMERIC      DEFAULT 0;

-- Índice para consultas de expiración eficientes
CREATE INDEX IF NOT EXISTS idx_proposals_expires_at
  ON public.proposals (expires_at)
  WHERE status = 'active';

COMMENT ON COLUMN public.proposals.expires_at  IS 'Propuesta se cierra automáticamente 24h después de su creación.';
COMMENT ON COLUMN public.proposals.result      IS 'Resultado final: approved | rejected | tie. NULL = abierta.';
COMMENT ON COLUMN public.proposals.yes_power   IS 'Poder ponderado total emitido a favor al cierre.';
COMMENT ON COLUMN public.proposals.no_power    IS 'Poder ponderado total emitido en contra al cierre.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABLA: governance_notifications
--    Almacena notificaciones in-app para socios cuando se crea una propuesta.
--    El frontend se suscribe vía Supabase Realtime para alertas instantáneas.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.governance_notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  proposal_id  UUID        NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  asset_id     UUID        NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  message      TEXT        NOT NULL,
  is_read      BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gov_notif_user
  ON public.governance_notifications (user_id, is_read, created_at DESC);

-- RLS en notifications
ALTER TABLE public.governance_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven sus notificaciones" ON public.governance_notifications;
DROP POLICY IF EXISTS "Usuarios actualizan sus notificaciones" ON public.governance_notifications;

CREATE POLICY "Usuarios ven sus notificaciones"
  ON public.governance_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios actualizan sus notificaciones"
  ON public.governance_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. FUNCIÓN TRIGGER: Notificar socios cuando se crea una propuesta
--    Inserta una notificación para cada usuario con shares_percentage > 0
--    en el activo de la propuesta (excepto el propio creador).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_shareholders_on_proposal()
RETURNS TRIGGER AS $$
DECLARE
  v_asset_title TEXT;
  v_shareholder RECORD;
BEGIN
  -- Obtener nombre del activo
  SELECT title INTO v_asset_title
  FROM public.assets WHERE id = NEW.asset_id;

  -- Insertar notificación para cada socio del activo (excluyendo al creador)
  -- Usamos INSERT INTO ... SELECT para eficiencia en lotes
  INSERT INTO public.governance_notifications (user_id, proposal_id, asset_id, message)
  SELECT DISTINCT
    as2.user_id,
    NEW.id,
    NEW.asset_id,
    FORMAT(
      'Nueva propuesta de gobernanza en "%s": "%s". Tienes 24 horas para votar.',
      COALESCE(v_asset_title, 'Activo RWA'),
      NEW.title
    )
  FROM public.asset_shares as2
  WHERE as2.asset_id        = NEW.asset_id
    AND as2.shares_percentage > 0
    AND as2.user_id         != COALESCE(NEW.created_by, auth.uid());  -- excluir al creador

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_catalog;

-- Columna created_by en proposals (para excluir al creador de su propia notificación)
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Trigger: se ejecuta AFTER INSERT en proposals
DROP TRIGGER IF EXISTS trg_notify_shareholders_on_proposal ON public.proposals;
CREATE TRIGGER trg_notify_shareholders_on_proposal
  AFTER INSERT ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION notify_shareholders_on_proposal();


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. FUNCIÓN: Cerrar propuestas expiradas y calcular resultado ponderado
--    Llamada: cliente al cargar propuestas + pg_cron si está disponible.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION close_expired_proposals()
RETURNS INTEGER AS $$
DECLARE
  v_count   INTEGER := 0;
  v_prop    RECORD;
  v_yes     NUMERIC;
  v_no      NUMERIC;
  v_result  TEXT;
BEGIN
  FOR v_prop IN
    SELECT id FROM public.proposals
    WHERE status = 'active'
      AND expires_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Calcular poder ponderado emitido
    SELECT
      COALESCE(SUM(weight) FILTER (WHERE vote = 'yes'), 0),
      COALESCE(SUM(weight) FILTER (WHERE vote = 'no'),  0)
    INTO v_yes, v_no
    FROM public.votes
    WHERE proposal_id = v_prop.id;

    -- Determinar resultado
    IF v_yes > v_no   THEN v_result := 'approved';
    ELSIF v_no > v_yes THEN v_result := 'rejected';
    ELSE                    v_result := 'tie';
    END IF;

    UPDATE public.proposals
    SET
      status    = 'approved',   -- aprovado/rechazado, se distingue por result
      result    = v_result,
      yes_power = v_yes,
      no_power  = v_no,
      closed_at = now()
    WHERE id = v_prop.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_catalog;

COMMENT ON FUNCTION close_expired_proposals IS
  'Cierra todas las propuestas activas cuyo expires_at <= now(). '
  'Calcula yes_power y no_power ponderados y asigna result: approved/rejected/tie. '
  'Llamar periódicamente via pg_cron o desde el cliente al cargar propuestas.';

-- Programar cierre automático cada hora via pg_cron (si la extensión está habilitada)
-- En Supabase Pro+: Dashboard > Database > Extensions > habilitar pg_cron
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'close-expired-proposals',
      '0 * * * *',   -- cada hora en punto
      'SELECT close_expired_proposals()'
    );
    RAISE NOTICE 'pg_cron: job close-expired-proposals programado cada hora.';
  ELSE
    RAISE NOTICE 'pg_cron no disponible. Llama close_expired_proposals() desde el cliente.';
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ACTUALIZAR create_governance_proposal: límite 7 días + expires_at + created_by
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
  -- Validar inputs
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

  -- ── LÍMITE 7 DÍAS: verificar última propuesta creada por este usuario ──
  SELECT MAX(created_at) INTO v_last_proposal
  FROM public.proposals
  WHERE created_by = v_caller_id;

  IF v_last_proposal IS NOT NULL THEN
    v_days_since_last := EXTRACT(EPOCH FROM (now() - v_last_proposal)) / 86400.0;
    IF v_days_since_last < 7 THEN
      RAISE EXCEPTION
        'Límite de creación: debes esperar % días más antes de crear una nueva propuesta. '
        'Solo puedes crear una propuesta cada 7 días.',
        CEIL(7 - v_days_since_last);
    END IF;
  END IF;

  -- Insertar propuesta con expires_at = 24 horas, created_by = caller
  INSERT INTO public.proposals (
    asset_id, title, description, status,
    created_by, expires_at, created_at
  )
  VALUES (
    p_asset_id,
    TRIM(p_title),
    TRIM(p_description),
    'active',
    v_caller_id,
    now() + INTERVAL '24 hours',
    now()
  )
  RETURNING id INTO v_proposal_id;

  RETURN jsonb_build_object(
    'success',     true,
    'proposal_id', v_proposal_id,
    'asset_id',    p_asset_id,
    'title',       p_title,
    'expires_at',  (now() + INTERVAL '24 hours')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_catalog;

COMMENT ON FUNCTION create_governance_proposal IS
  'Crea propuesta de gobernanza. Valida: tenencia activa en el activo, '
  'límite de 1 propuesta/7 días por usuario. expires_at = 24h. '
  'Trigger trg_notify_shareholders_on_proposal se ejecuta automáticamente.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ACTUALIZAR cast_weighted_vote: verificar expires_at además del status
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
  IF p_vote NOT IN ('yes', 'no') THEN
    RAISE EXCEPTION 'Voto inválido: debe ser ''yes'' o ''no''.';
  END IF;

  -- Obtener propuesta activa y no expirada
  SELECT * INTO v_proposal
  FROM public.proposals
  WHERE id = p_proposal_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La propuesta no existe o ya fue cerrada.';
  END IF;

  -- Verificar que no haya expirado (cierre temporal antes del cron/cliente)
  IF v_proposal.expires_at IS NOT NULL AND v_proposal.expires_at <= now() THEN
    RAISE EXCEPTION 'La propuesta de votación ha expirado (24 horas). Ya no se aceptan votos.';
  END IF;

  -- Verificar voto duplicado
  IF EXISTS (
    SELECT 1 FROM public.votes
    WHERE proposal_id = p_proposal_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Ya emitiste un voto en esta propuesta. No se permiten votos duplicados.';
  END IF;

  v_is_admin := hold3r_user_is_admin(p_user_id);

  -- Verificar tenencia en el activo ESPECÍFICO de la propuesta
  IF NOT v_is_admin AND NOT hold3r_user_has_asset_share(p_user_id, v_proposal.asset_id) THEN
    RAISE EXCEPTION
      'No posees participación activa en este activo. '
      'Solo los accionistas de este activo pueden votar.';
  END IF;

  -- Poder de voto = acciones del usuario en el activo ESPECÍFICO de esta propuesta
  SELECT COALESCE(SUM(shares_percentage), 0) INTO v_voting_power
  FROM public.asset_shares
  WHERE user_id  = p_user_id
    AND asset_id = v_proposal.asset_id
    AND shares_percentage > 0;

  IF v_is_admin AND v_voting_power = 0 THEN
    v_voting_power := 1.0;
  END IF;

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
