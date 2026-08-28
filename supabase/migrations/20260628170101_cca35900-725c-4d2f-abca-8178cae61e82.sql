
-- 1. Add display_order to categories (frontend queries it)
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
UPDATE public.categories SET display_order = COALESCE(sort_order, 0) WHERE display_order = 0;

-- 2. Rewrite handle_new_user to ALSO populate profiles.role and create seller_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text := COALESCE(NEW.raw_user_meta_data->>'role', 'buyer');
  v_full_name text := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (NEW.id, v_full_name, NEW.email, NEW.raw_user_meta_data->>'phone', v_role)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role::app_role)
  ON CONFLICT DO NOTHING;

  IF v_role = 'seller' THEN
    INSERT INTO public.seller_profiles (user_id, business_name, company_name, email, phone, status, slug)
    VALUES (
      NEW.id,
      v_full_name,
      v_full_name,
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      'pending',
      lower(regexp_replace(v_full_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8)
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Attach trigger to auth.users (the missing piece!)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Add unique constraint on seller_profiles.user_id if missing
DO $$ BEGIN
  ALTER TABLE public.seller_profiles ADD CONSTRAINT seller_profiles_user_id_key UNIQUE (user_id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;

-- 5. Backfill: create missing profiles, user_roles, seller_profiles for existing users
INSERT INTO public.profiles (id, full_name, email, phone, role)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
       u.email,
       u.raw_user_meta_data->>'phone',
       COALESCE(u.raw_user_meta_data->>'role', 'buyer')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'role', 'buyer')::app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL;

INSERT INTO public.seller_profiles (user_id, business_name, company_name, email, phone, status, slug)
SELECT u.id,
       COALESCE(p.full_name, split_part(u.email, '@', 1)),
       COALESCE(p.full_name, split_part(u.email, '@', 1)),
       u.email,
       p.phone,
       'pending',
       lower(regexp_replace(COALESCE(p.full_name, split_part(u.email, '@', 1)), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(u.id::text, 1, 8)
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.seller_profiles sp ON sp.user_id = u.id
WHERE sp.user_id IS NULL
  AND (p.role = 'seller' OR u.raw_user_meta_data->>'role' = 'seller');

-- 6. Allow anonymous users to post requirements (RFQ) without login
DROP POLICY IF EXISTS "Anyone can post requirements" ON public.requirements;
CREATE POLICY "Anyone can post requirements"
  ON public.requirements FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

GRANT INSERT ON public.requirements TO anon;
