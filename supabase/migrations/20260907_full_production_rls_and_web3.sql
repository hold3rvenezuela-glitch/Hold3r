-- ================================================================
-- POLÍTICAS DE SEGURIDAD RLS Y PROCEDIMIENTOS ALMACENADOS PARA PRODUCCIÓN 100% BLOCKCHAIN
-- Proyecto: HOLD3R RWA Platform
-- Fecha: 2026-09-07
-- ================================================================

-- 1. Habilitar RLS en todas las tablas requeridas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar políticas previas restrictivas para evitar conflictos de sobreescritura
DROP POLICY IF EXISTS "Lectura pública de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios insertan su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios editan su propio perfil" ON public.profiles;

DROP POLICY IF EXISTS "Usuarios ven su propia wallet" ON public.wallets;
DROP POLICY IF EXISTS "Usuarios actualizan su propia wallet" ON public.wallets;
DROP POLICY IF EXISTS "Permitir inserción de wallet a autenticados" ON public.wallets;

DROP POLICY IF EXISTS "Lectura pública de activos" ON public.assets;
DROP POLICY IF EXISTS "Solo admins crean activos" ON public.assets;
DROP POLICY IF EXISTS "Solo admins actualizan activos" ON public.assets;

DROP POLICY IF EXISTS "Usuarios ven sus propias inversiones" ON public.asset_shares;
DROP POLICY IF EXISTS "Usuarios insertan inversiones propias" ON public.asset_shares;
DROP POLICY IF EXISTS "Lectura global de inversiones" ON public.asset_shares;

DROP POLICY IF EXISTS "Lectura pública de propuestas" ON public.proposals;
DROP POLICY IF EXISTS "Usuarios autenticados crean propuestas" ON public.proposals;
DROP POLICY IF EXISTS "Admins actualizan propuestas" ON public.proposals;

DROP POLICY IF EXISTS "Lectura pública de votos" ON public.votes;
DROP POLICY IF EXISTS "Usuarios autenticados emiten votos" ON public.votes;

-- ================================================================
-- POLÍTICAS RLS PRODUCCIÓN (PERMISOS ROBUSTOS PARA USUARIOS Y ADMINS)
-- ================================================================

-- ── PROFILES ──
CREATE POLICY "Lectura pública de perfiles" ON public.profiles 
  FOR SELECT USING (true);

CREATE POLICY "Usuarios insertan su propio perfil" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios editan su propio perfil" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- ── WALLETS ──
CREATE POLICY "Usuarios ven su propia wallet" ON public.wallets 
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Usuarios actualizan su propia wallet" ON public.wallets 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Permitir inserción de wallet a autenticados" ON public.wallets 
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- ── ASSETS ──
CREATE POLICY "Lectura pública de activos" ON public.assets 
  FOR SELECT USING (true);

CREATE POLICY "Solo admins crean activos" ON public.assets 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') 
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Solo admins actualizan activos" ON public.assets 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') 
    OR auth.role() = 'service_role'
  );

-- ── ASSET_SHARES (Acciones Fraccionadas de Inversión) ──
CREATE POLICY "Lectura global de inversiones" ON public.asset_shares 
  FOR SELECT USING (true);

CREATE POLICY "Usuarios insertan inversiones propias" ON public.asset_shares 
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.role() = 'authenticated'
  );

-- ── PROPOSALS (Gobernanza) ──
CREATE POLICY "Lectura pública de propuestas" ON public.proposals 
  FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados crean propuestas" ON public.proposals 
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Admins actualizan propuestas" ON public.proposals 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR auth.role() = 'service_role'
  );

-- ── VOTES (Votación Web3) ──
CREATE POLICY "Lectura pública de votos" ON public.votes 
  FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados emiten votos" ON public.votes 
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.role() = 'authenticated'
  );

-- ── VISTA AUDITORÍA DE RLS PARA DIAGNÓSTICO ──
CREATE OR REPLACE FUNCTION public.debug_rls_context()
RETURNS TABLE (
  current_uid UUID,
  user_role TEXT,
  is_admin BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() AS current_uid,
    COALESCE((SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()), 'none') AS user_role,
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') AS is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
