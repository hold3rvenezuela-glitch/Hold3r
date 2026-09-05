-- ================================================================
-- HOLD3R — MIGRACIÓN: metadata JSONB + holders_count en assets
-- Ejecutar en el SQL Editor de tu proyecto en Supabase
-- ================================================================

-- 1. Agregar columna metadata JSONB si no existe
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Agregar columna holders_count (cantidad de holders definida por admin)
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS holders_count INTEGER;

-- 3. Verificar y recrear la política DELETE para admins (idempotente)
DROP POLICY IF EXISTS "Solo admins eliminan activos" ON public.assets;
CREATE POLICY "Solo admins eliminan activos" ON public.assets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Confirmar que INSERT y UPDATE también están activos
DROP POLICY IF EXISTS "Solo admins crean activos" ON public.assets;
CREATE POLICY "Solo admins crean activos" ON public.assets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Solo admins actualizan activos" ON public.assets;
CREATE POLICY "Solo admins actualizan activos" ON public.assets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Función helper: limpiar reservas expiradas automáticamente
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.asset_reservations WHERE expires_at < NOW();
END;
$$;

-- ================================================================
-- DIAGNÓSTICO: verificar columnas actuales de assets
-- ================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'assets'
ORDER BY ordinal_position;
