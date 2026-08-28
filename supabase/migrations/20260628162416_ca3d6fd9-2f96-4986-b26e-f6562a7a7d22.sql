
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT;

ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS avg_response_time INTEGER DEFAULT 0;

UPDATE public.seller_profiles SET business_name = company_name WHERE business_name IS NULL;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS enquiry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS moq_unit TEXT DEFAULT 'piece',
  ADD COLUMN IF NOT EXISTS price_unit TEXT DEFAULT 'piece',
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.product_views
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS view_duration INTEGER DEFAULT 0;
