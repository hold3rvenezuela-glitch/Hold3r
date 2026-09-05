-- ================================================================
-- HOLD3R — MIGRACIÓN: Columnas num_holders, ratings, metadata
-- Ejecutar este script en el SQL Editor de tu proyecto en Supabase
-- ================================================================

-- 1. Agregar columna metadata JSONB (guarda ficha técnica dinámica)
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB;

-- 2. Agregar columna num_holders (cantidad de holders planificada)
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS num_holders INTEGER DEFAULT NULL;

-- 3. Agregar columna ratings JSONB (ratings 0-10 por categoría)
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS ratings JSONB DEFAULT '{}'::JSONB;

-- 4. Agregar columna min_investment si no existe
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS min_investment NUMERIC DEFAULT 10;

-- 5. Agregar columna max_investment si no existe
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS max_investment NUMERIC DEFAULT NULL;

-- ================================================================
-- FUNCIÓN DE DIAGNÓSTICO RLS PARA BORRADO
-- ================================================================
CREATE OR REPLACE FUNCTION public.debug_rls_context()
RETURNS TABLE(
  current_uid UUID,
  current_role TEXT,
  is_admin BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    auth.uid() AS current_uid,
    p.role AS current_role,
    (p.role = 'admin') AS is_admin
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- ================================================================
-- ASEGURAR POLÍTICAS RLS PARA assets (limpia + recrear)
-- ================================================================
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de activos" ON public.assets;
DROP POLICY IF EXISTS "Solo admins crean activos" ON public.assets;
DROP POLICY IF EXISTS "Solo admins actualizan activos" ON public.assets;
DROP POLICY IF EXISTS "Solo admins eliminan activos" ON public.assets;

-- Lectura pública — todos pueden ver los activos
CREATE POLICY "Lectura pública de activos" ON public.assets
  FOR SELECT USING (true);

-- Solo admins pueden insertar activos
CREATE POLICY "Solo admins crean activos" ON public.assets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Solo admins pueden actualizar activos
CREATE POLICY "Solo admins actualizan activos" ON public.assets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Solo admins pueden ELIMINAR activos (DELETE)
CREATE POLICY "Solo admins eliminan activos" ON public.assets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
