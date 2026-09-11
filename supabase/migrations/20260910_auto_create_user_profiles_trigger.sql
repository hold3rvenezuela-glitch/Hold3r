-- ================================================================
-- TRIGGER AUTOMÁTICO DE REGISTRO DE USUARIOS PARA HOLD3R SUPABASE
-- Ejecutar en el SQL Editor de Supabase Dashboard
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, document_id, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data ->> 'document_id', ''),
    CASE 
      WHEN LOWER(TRIM(COALESCE(new.email, ''))) = 'hold3rvenezuela@gmail.com' THEN 'admin'
      ELSE COALESCE(new.raw_user_meta_data ->> 'role', 'investor')
    END
  )
  ON CONFLICT (id) DO NOTHING;

  -- Crear también wallet inicial de forma segura
  INSERT INTO public.wallets (id, user_id, usdt_address, network, balance, updated_at)
  VALUES (
    gen_random_uuid(),
    new.id,
    '',
    'BEP20',
    0.00,
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$;

-- Crear el trigger en la tabla de autenticación si no existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
