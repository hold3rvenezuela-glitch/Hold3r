-- ============================================================
-- HOLD3R · Migración: Oficina Virtual del Inversor
-- Ejecutar en el Editor SQL de Supabase Dashboard
-- ============================================================

-- 1. Agregar avatar_url a perfiles (si no existe ya)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Tabla unificada de historial de transacciones de wallet
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('deposit', 'purchase', 'yield', 'withdrawal')),
  amount      numeric NOT NULL,
  tx_hash     text,
  status      text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'failed')),
  description text,
  asset_id    uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Índices para consultas rápidas por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id
  ON public.wallet_transactions (user_id, created_at DESC);

-- 3. RLS en wallet_transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- El usuario solo puede ver sus propias transacciones
CREATE POLICY IF NOT EXISTS "wallet_txns_select_own"
  ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Solo el sistema (service_role) puede insertar / actualizar transacciones
CREATE POLICY IF NOT EXISTS "wallet_txns_insert_service"
  ON public.wallet_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Admin puede leer todo
CREATE POLICY IF NOT EXISTS "wallet_txns_select_admin"
  ON public.wallet_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. RLS en profiles: permitir UPDATE de datos propios
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Storage bucket 'avatars' (ignora conflicto si ya existe)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Política Storage: el usuario puede subir su propio avatar
CREATE POLICY IF NOT EXISTS "avatars_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY IF NOT EXISTS "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Lectura pública de avatares
CREATE POLICY IF NOT EXISTS "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
