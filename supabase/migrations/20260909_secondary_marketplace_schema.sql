-- =============================================================================
-- HOLD3R PROTOCOL VENEZUELA - MERCADO SECUNDARIO Y GOBERNANZA (48H DERECHO TANTEO)
-- Migration File: 20260909_secondary_marketplace_schema.sql
-- =============================================================================

-- 1. Crear tabla de órdenes de mercado secundario
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  share_id UUID NOT NULL REFERENCES public.asset_shares(id) ON DELETE CASCADE,
  shares_percentage NUMERIC NOT NULL CHECK (shares_percentage > 0),
  price_usdt NUMERIC NOT NULL CHECK (price_usdt > 0),
  status TEXT NOT NULL DEFAULT 'IN_REVIEW_GOVERNANCE' 
    CHECK (status IN ('IN_REVIEW_GOVERNANCE', 'PUBLIC_MARKET', 'SOLD_INTERNAL', 'SOLD_PUBLIC', 'CANCELLED')),
  buyer_id UUID REFERENCES public.profiles(id),
  escrow_tx_hash TEXT,
  completed_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  governance_expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '48 hours'),
  completed_at TIMESTAMPTZ
);

-- Índices para optimizar consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_seller ON public.marketplace_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_status ON public.marketplace_orders(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_asset ON public.marketplace_orders(asset_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_expires ON public.marketplace_orders(governance_expires_at);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad RLS
-- Lectura pública para mercado abierto
CREATE POLICY "Marketplace orders public read" ON public.marketplace_orders
  FOR SELECT USING (
    status = 'PUBLIC_MARKET'
    OR seller_id = auth.uid()
    OR (
      status = 'IN_REVIEW_GOVERNANCE' AND (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'partner', 'investor')
        )
      )
    )
  );

-- Inserción: Solo el dueño de la cuenta puede crear su orden
CREATE POLICY "Marketplace orders user insert" ON public.marketplace_orders
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- Actualización: Compradores o el vendedor cancelando
CREATE POLICY "Marketplace orders user update" ON public.marketplace_orders
  FOR UPDATE USING (
    auth.uid() = seller_id 
    OR auth.uid() = buyer_id 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 4. Función y Trigger de Actualización Automática de Estatus Expirados (48 Horas)
CREATE OR REPLACE FUNCTION auto_promote_expired_marketplace_orders()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'IN_REVIEW_GOVERNANCE' AND NEW.governance_expires_at <= now() THEN
    NEW.status := 'PUBLIC_MARKET';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_auto_promote_expired_marketplace_orders
BEFORE SELECT OR UPDATE ON public.marketplace_orders
FOR EACH ROW
EXECUTE FUNCTION auto_promote_expired_marketplace_orders();
