-- ================================================================
-- TRIGGER & RLS SETUP FOR HOLD3R SUPABASE DATABASE
-- Executar este script en el SQL Editor de tu proyecto en Supabase
-- ================================================================

-- 1. Función Trigger para crear automáticamente Perfil y Wallet
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_document_id TEXT;
  v_role TEXT;
  v_wallet_address TEXT;
BEGIN
  -- Extraer metadatos pasados durante supabase.auth.signUp({ options: { data: { ... } } })
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_document_id := COALESCE(new.raw_user_meta_data->>'document_id', 'V-00000000');
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'investor');

  -- Insertar en public.profiles
  INSERT INTO public.profiles (id, full_name, document_id, role, created_at)
  VALUES (new.id, v_full_name, v_document_id, v_role, NOW())
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    document_id = EXCLUDED.document_id,
    role = EXCLUDED.role;

  -- Generar dirección simulada USDT para la wallet en red TRC20
  v_wallet_address := 'T' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 32));

  -- Insertar en public.wallets con balance inicial en 0.00
  INSERT INTO public.wallets (user_id, usdt_address, network, balance, updated_at)
  VALUES (new.id, v_wallet_address, 'TRC20', 0.00, NOW())
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Vincular el Trigger a la tabla auth.users
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

-- Políticas para profiles
CREATE POLICY "Lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Usuarios editan su propio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para wallets
CREATE POLICY "Usuarios ven su propia wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios actualizan su propia wallet" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para assets
CREATE POLICY "Lectura pública de activos" ON public.assets FOR SELECT USING (true);
CREATE POLICY "Solo admins crean activos" ON public.assets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Solo admins actualizan activos" ON public.assets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Políticas para asset_shares
CREATE POLICY "Usuarios ven sus propias inversiones" ON public.asset_shares FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios insertan inversiones propias" ON public.asset_shares FOR INSERT WITH CHECK (auth.uid() = user_id);
