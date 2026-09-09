-- =============================================================================
-- MIGRACIÓN DE BASE DE DATOS SUPABASE: INDICES Y VISTA DE COMPRAS RWA
-- HOLD3R VENEZUELA • PROTOCOLO DE TOKENIZACIÓN Y PROPIEDAD FRACCIONADA
-- =============================================================================

-- 1. Crear Índices B-Tree para Búsqueda Rápida por TxHash, Usuario y Activo
CREATE INDEX IF NOT EXISTS idx_asset_shares_contract_hash 
  ON public.asset_shares (signed_contract_hash);

CREATE INDEX IF NOT EXISTS idx_asset_shares_user_id 
  ON public.asset_shares (user_id);

CREATE INDEX IF NOT EXISTS idx_asset_shares_asset_id 
  ON public.asset_shares (asset_id);

CREATE INDEX IF NOT EXISTS idx_asset_shares_purchased_at 
  ON public.asset_shares (purchased_at DESC);

-- 2. Crear Vista Consolidada para el Historial de Compras y Auditoría de Contratos RWA
CREATE OR REPLACE VIEW public.rwa_purchases_view AS
SELECT 
  s.id AS share_id,
  s.asset_id,
  s.user_id,
  s.shares_percentage,
  s.amount_invested_usdt,
  s.signed_contract_hash AS tx_hash,
  s.purchased_at,
  -- Metadatos del Perfil del Usuario KYC
  p.full_name AS investor_name,
  p.document_id AS investor_document_id,
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

-- Otorgar permisos de lectura en la vista para usuarios autenticados
GRANT SELECT ON public.rwa_purchases_view TO authenticated;
GRANT SELECT ON public.rwa_purchases_view TO service_role;
