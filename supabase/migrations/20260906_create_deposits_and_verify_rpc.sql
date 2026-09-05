-- ================================================================
-- TABLA Y PROCEDIMIENTO ALMACENADO PARA ACREDITACIÓN AUTOMÁTICA DE DEPÓSITOS USDT
-- Proyecto: HOLD3R RWA Platform
-- Fecha: 2026-09-06
-- ================================================================

-- 1. Crear tabla public.deposits para registro único de transacciones
CREATE TABLE IF NOT EXISTS public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tx_hash TEXT NOT NULL,
  network TEXT NOT NULL CHECK (network IN ('BEP20', 'ERC20', 'TRC20', 'SOLANA')),
  amount_usdt NUMERIC(15, 2) NOT NULL CHECK (amount_usdt > 0),
  treasury_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Evitar ataque de reanimación/reentrada: un mismo TxID por red sólo se acredita 1 sola vez
  CONSTRAINT unique_tx_per_network UNIQUE (tx_hash, network)
);

-- Habilitar RLS en public.deposits
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad RLS
DROP POLICY IF EXISTS "Usuarios ven sus propios depósitos" ON public.deposits;
CREATE POLICY "Usuarios ven sus propios depósitos" ON public.deposits 
  FOR SELECT USING (auth.uid() = user_id);

-- Indexación para consultas de auditoría rápidas
CREATE INDEX IF NOT EXISTS idx_deposits_user ON public.deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_tx_net ON public.deposits(tx_hash, network);


-- 2. Procedimiento Almacenado Atómico para acreditar saldo sin duplicaciones
CREATE OR REPLACE FUNCTION public.verify_and_credit_deposit(
  p_user_id UUID,
  p_tx_hash TEXT,
  p_network TEXT,
  p_amount_usdt NUMERIC,
  p_treasury_address TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_existing_id UUID;
  v_new_balance NUMERIC(15, 2);
  v_result JSONB;
BEGIN
  -- Limpiar espacios en blanco
  p_tx_hash := TRIM(p_tx_hash);
  p_network := UPPER(TRIM(p_network));

  -- 1. Verificar si la transacción ya fue procesada anteriormente
  SELECT id INTO v_existing_id
  FROM public.deposits
  WHERE LOWER(tx_hash) = LOWER(p_tx_hash) AND network = p_network;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'DUPLICATE_TX',
      'message', 'El Hash de Transacción (TxID) ya ha sido acreditado previamente.'
    );
  END IF;

  -- 2. Insertar el registro del depósito de forma atómica
  INSERT INTO public.deposits (
    user_id,
    tx_hash,
    network,
    amount_usdt,
    treasury_address,
    status,
    verified_at
  ) VALUES (
    p_user_id,
    p_tx_hash,
    p_network,
    p_amount_usdt,
    p_treasury_address,
    'confirmed',
    NOW()
  );

  -- 3. Actualizar atómicamente el balance en la tabla public.wallets
  UPDATE public.wallets
  SET 
    balance = COALESCE(balance, 0) + p_amount_usdt,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  -- Si el usuario no tenía wallet previa, crearla con el monto
  IF NOT FOUND THEN
    INSERT INTO public.wallets (id, user_id, usdt_address, network, balance, updated_at)
    VALUES (
      gen_random_uuid(), 
      p_user_id, 
      'T' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 32)), 
      p_network, 
      p_amount_usdt, 
      NOW()
    )
    RETURNING balance INTO v_new_balance;
  END IF;

  -- 4. Construir respuesta de éxito
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Depósito acreditado exitosamente.',
    'new_balance', v_new_balance,
    'amount_credited', p_amount_usdt,
    'tx_hash', p_tx_hash,
    'network', p_network
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'code', 'DB_ERROR',
    'message', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
