-- ================================================================
-- TRIGGER & RLS SETUP FOR HOLD3R SUPABASE DATABASE
-- Ejecutar este script en el SQL Editor de tu proyecto en Supabase
-- ================================================================

-- 1. Asegurar extensión pgcrypto para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Función Trigger ultra-robusta para crear automáticamente Perfil y Wallet
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_document_id TEXT;
  v_role TEXT;
  v_wallet_address TEXT;
BEGIN
  -- Extraer metadatos de forma segura (soporta raw_user_meta_data NULL)
  IF new.raw_user_meta_data IS NOT NULL THEN
    v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
    v_document_id := COALESCE(new.raw_user_meta_data->>'document_id', 'V-00000000');
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'investor');
  ELSE
    v_full_name := split_part(new.email, '@', 1);
    v_document_id := 'V-00000000';
    v_role := 'investor';
  END IF;

  -- Asignación automática de rol de administración por correo electrónico
  IF LOWER(TRIM(COALESCE(new.email, ''))) = 'hold3rvenezuela@gmail.com' THEN
    v_role := 'admin';
  END IF;

  -- Insertar o actualizar en public.profiles capturando excepciones
  BEGIN
    INSERT INTO public.profiles (id, full_name, document_id, role, created_at)
    VALUES (new.id, v_full_name, v_document_id, v_role, NOW())
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      document_id = EXCLUDED.document_id,
      role = EXCLUDED.role;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error en profiles: %', SQLERRM;
  END;

  -- Generar dirección simulada USDT para la wallet en red TRC20
  v_wallet_address := 'T' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 32));

  -- Insertar en public.wallets capturando excepciones y generando id si es necesario
  BEGIN
    INSERT INTO public.wallets (id, user_id, usdt_address, network, balance, updated_at)
    VALUES (gen_random_uuid(), new.id, v_wallet_address, 'TRC20', 0.00, NOW())
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error en wallets: %', SQLERRM;
  END;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Vincular el Trigger a la tabla auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS) RECOMENDADAS
-- ================================================================

-- Habilitar RLS en las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas previas de profiles para evitar duplicados
DROP POLICY IF EXISTS "Lectura pública de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios insertan su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios editan su propio perfil" ON public.profiles;

-- Políticas para profiles
CREATE POLICY "Lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Usuarios insertan su propio perfil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Usuarios editan su propio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Limpiar políticas previas de wallets
DROP POLICY IF EXISTS "Usuarios ven su propia wallet" ON public.wallets;
DROP POLICY IF EXISTS "Usuarios actualizan su propia wallet" ON public.wallets;

-- Políticas para wallets
CREATE POLICY "Usuarios ven su propia wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios actualizan su propia wallet" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);

-- Limpiar políticas previas de assets
DROP POLICY IF EXISTS "Lectura pública de activos" ON public.assets;
DROP POLICY IF EXISTS "Solo admins crean activos" ON public.assets;
DROP POLICY IF EXISTS "Solo admins actualizan activos" ON public.assets;
DROP POLICY IF EXISTS "Solo admins eliminan activos" ON public.assets;

-- Políticas para assets
CREATE POLICY "Lectura pública de activos" ON public.assets FOR SELECT USING (true);
CREATE POLICY "Solo admins crean activos" ON public.assets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Solo admins actualizan activos" ON public.assets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Solo admins eliminan activos" ON public.assets FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Limpiar políticas previas de asset_shares
DROP POLICY IF EXISTS "Usuarios ven sus propias inversiones" ON public.asset_shares;
DROP POLICY IF EXISTS "Usuarios insertan inversiones propias" ON public.asset_shares;

-- Políticas para asset_shares
CREATE POLICY "Usuarios ven sus propias inversiones" ON public.asset_shares FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios insertan inversiones propias" ON public.asset_shares FOR INSERT WITH CHECK (auth.uid() = user_id);
