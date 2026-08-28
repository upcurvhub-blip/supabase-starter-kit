
ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS response_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_leads INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS converted_leads INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS gst_number TEXT,
  ADD COLUMN IF NOT EXISTS established_year INTEGER;

UPDATE public.seller_profiles SET description = about WHERE description IS NULL;
UPDATE public.seller_profiles SET gst_number = gstin WHERE gst_number IS NULL;
UPDATE public.seller_profiles SET established_year = year_established WHERE established_year IS NULL;

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS lead_quota INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS featured_listing BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority_support BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS analytics_access BOOLEAN DEFAULT false;

-- Add FK so PostgREST can embed profiles via product_views.user_id
DO $$ BEGIN
  ALTER TABLE public.product_views
    ADD CONSTRAINT product_views_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
