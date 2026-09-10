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

-- 5. FUNCIÓN ATÓMICA DE RPC: Procesar Compra Interna (Gobernanza / Derecho de Tanteo)
CREATE OR REPLACE FUNCTION process_internal_marketplace_purchase(
  p_order_id UUID,
  p_buyer_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_buyer_wallet RECORD;
  v_seller_wallet RECORD;
  v_tx_hash TEXT;
BEGIN
  -- A. Buscar la orden de venta y bloquear la fila para prevenir race conditions
  SELECT * INTO v_order
  FROM public.marketplace_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La orden de venta especificada no existe.';
  END IF;

  IF v_order.status NOT IN ('IN_REVIEW_GOVERNANCE', 'PUBLIC_MARKET') THEN
    RAISE EXCEPTION 'La orden ya ha sido procesada o cancelada previamente (Estatus: %).', v_order.status;
  END IF;

  IF v_order.seller_id = p_buyer_id THEN
    RAISE EXCEPTION 'No puedes comprar tu propia oferta de reventa.';
  END IF;

  -- B. Verificar wallet y saldo disponible del comprador
  SELECT * INTO v_buyer_wallet
  FROM public.wallets
  WHERE user_id = p_buyer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La wallet del comprador no se encuentra registrada.';
  END IF;

  IF v_buyer_wallet.balance < v_order.price_usdt THEN
    RAISE EXCEPTION 'Saldo insuficiente en USDT para completar la compra (Saldo actual: %, Precio: %).', v_buyer_wallet.balance, v_order.price_usdt;
  END IF;

  -- C. Buscar wallet del vendedor o crearla si no existía aún
  SELECT * INTO v_seller_wallet
  FROM public.wallets
  WHERE user_id = v_order.seller_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, usdt_address, network, balance, updated_at)
    VALUES (v_order.seller_id, '', 'BEP20', 0, now())
    RETURNING * INTO v_seller_wallet;
  END IF;

  v_tx_hash := '0xint_buy_' || md5(random()::text || clock_timestamp()::text);

  -- 1. Actualizar estatus de la orden de mercado
  UPDATE public.marketplace_orders
  SET status = 'SOLD_INTERNAL',
      buyer_id = p_buyer_id,
      completed_tx_hash = v_tx_hash,
      completed_at = now()
  WHERE id = p_order_id;

  -- 2. Traspaso de tenencia en asset_shares
  UPDATE public.asset_shares
  SET user_id = p_buyer_id
  WHERE id = v_order.share_id;

  -- 3. Movimientos financieros en wallets (Débito comprador, Crédito vendedor)
  UPDATE public.wallets
  SET balance = balance - v_order.price_usdt,
      updated_at = now()
  WHERE id = v_buyer_wallet.id;

  UPDATE public.wallets
  SET balance = balance + v_order.price_usdt,
      updated_at = now()
  WHERE id = v_seller_wallet.id;

  -- 4. Registrar logs en wallet_transactions (si la tabla existe)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallet_transactions') THEN
    -- Débito al comprador
    INSERT INTO public.wallet_transactions (user_id, type, amount, tx_hash, status, description)
    VALUES (p_buyer_id, 'purchase', v_order.price_usdt, v_tx_hash, 'confirmed', 'Compra de fracción RWA en mercado secundario');

    -- Crédito al vendedor
    INSERT INTO public.wallet_transactions (user_id, type, amount, tx_hash, status, description)
    VALUES (v_order.seller_id, 'yield', v_order.price_usdt, v_tx_hash, 'confirmed', 'Venta de fracción RWA en mercado secundario');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'tx_hash', v_tx_hash,
    'price_usdt', v_order.price_usdt
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

