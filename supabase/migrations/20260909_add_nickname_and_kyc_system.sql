-- =============================================================================
-- MIGRACIÓN DE BASE DE DATOS SUPABASE: SISTEMA DE APODOS, BUSCADOR PÚBLICO Y KYC
-- HOLD3R VENEZUELA • PROTOCOLO DE TOKENIZACIÓN Y PROPIEDAD FRACCIONADA
-- =============================================================================

-- 1. Agregar columnas de nickname, kyc_status, bep20_wallet y address_street a public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text UNIQUE,
  ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'none', -- 'none' | 'pending' | 'approved' | 'rejected'
  ADD COLUMN IF NOT EXISTS bep20_wallet text,
  ADD COLUMN IF NOT EXISTS address_street text;

-- Índice para búsqueda rápida por nickname
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON public.profiles (nickname);

-- 2. Crear Tabla public.kyc_verifications para Solicitudes KYC
CREATE TABLE IF NOT EXISTS public.kyc_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  birth_date date NOT NULL,
  document_id text NOT NULL,
  address_country text NOT NULL,
  address_state text NOT NULL,
  address_city text NOT NULL,
  address_street text,
  bep20_wallet text NOT NULL,
  id_document_url text NOT NULL,
  rif_document_url text NOT NULL,
  selfie_url text NOT NULL,
  status text DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS en kyc_verifications
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para kyc_verifications
CREATE POLICY "Los usuarios pueden ver su propia verificación KYC"
  ON public.kyc_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden enviar su verificación KYC"
  ON public.kyc_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los administradores pueden ver todas las verificaciones KYC"
  ON public.kyc_verifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 3. Actualizar Vista Consolidada rwa_purchases_view para incluir Apodo (nickname) y KYC Status
CREATE OR REPLACE VIEW public.rwa_purchases_view AS
SELECT 
  s.id AS share_id,
  s.asset_id,
  s.user_id,
  s.shares_percentage,
  s.amount_invested_usdt,
  s.signed_contract_hash AS tx_hash,
  s.purchased_at,
  -- Metadatos Privados / Públicos del Usuario
  p.full_name AS investor_name,
  p.nickname AS investor_nickname,
  p.document_id AS investor_document_id,
  p.kyc_status AS investor_kyc_status,
  p.role AS user_role,
  -- Metadatos del Activo RWA Tokenizado
  a.title AS asset_title,
  a.category AS asset_category,
  a.total_valuation AS asset_total_valuation,
  a.funded_amount AS asset_funded_amount,
  a.status AS asset_status,
  a.images AS asset_images
FROM public.asset_shares s
LEFT JOIN public.profiles p ON s.user_id = p.id
LEFT JOIN public.assets a ON s.asset_id = a.id
ORDER BY s.purchased_at DESC;

-- Permisos de lectura en la vista pública
GRANT SELECT ON public.rwa_purchases_view TO anon;
GRANT SELECT ON public.rwa_purchases_view TO authenticated;
GRANT SELECT ON public.rwa_purchases_view TO service_role;
