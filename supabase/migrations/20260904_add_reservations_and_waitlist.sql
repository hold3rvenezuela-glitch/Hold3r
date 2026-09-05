-- ================================================================
-- TABLAS DE RESERVAS TEMPORALES Y LISTA DE ESPERA (HOLD3R RWA)
-- ================================================================

-- 1. Tabla de Reservas Temporales de Cupo (Bloqueo de 15 minutos)
CREATE TABLE IF NOT EXISTS public.asset_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_usdt NUMERIC(14,2) NOT NULL CHECK (amount_usdt > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de consulta rápida para expiración y activo
CREATE INDEX IF NOT EXISTS idx_asset_reservations_expires ON public.asset_reservations(expires_at);
CREATE INDEX IF NOT EXISTS idx_asset_reservations_asset ON public.asset_reservations(asset_id);

-- 2. Tabla de Lista de Espera por Activo Agotado
CREATE TABLE IF NOT EXISTS public.asset_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  document_id TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_waitlist_asset ON public.asset_waitlist(asset_id);

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

ALTER TABLE public.asset_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_waitlist ENABLE ROW LEVEL SECURITY;

-- Políticas para asset_reservations
DROP POLICY IF EXISTS "Lectura de reservas activas" ON public.asset_reservations;
DROP POLICY IF EXISTS "Usuarios crean sus propias reservas" ON public.asset_reservations;
DROP POLICY IF EXISTS "Usuarios eliminan sus propias reservas" ON public.asset_reservations;

CREATE POLICY "Lectura de reservas activas" ON public.asset_reservations FOR SELECT USING (true);
CREATE POLICY "Usuarios crean sus propias reservas" ON public.asset_reservations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios eliminan sus propias reservas" ON public.asset_reservations FOR DELETE USING (auth.uid() = user_id);

-- Políticas para asset_waitlist
DROP POLICY IF EXISTS "Usuarios ingresan a lista de espera" ON public.asset_waitlist;
DROP POLICY IF EXISTS "Admins ven lista de espera" ON public.asset_waitlist;

CREATE POLICY "Usuarios ingresan a lista de espera" ON public.asset_waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins ven lista de espera" ON public.asset_waitlist FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
