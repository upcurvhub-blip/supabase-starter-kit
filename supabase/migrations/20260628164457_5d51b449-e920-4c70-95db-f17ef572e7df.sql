
ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS business_category text,
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS payment_modes text[],
  ADD COLUMN IF NOT EXISTS manufacturing_capacity text,
  ADD COLUMN IF NOT EXISTS quality_standards text[],
  ADD COLUMN IF NOT EXISTS brand_names text[],
  ADD COLUMN IF NOT EXISTS subscription_plan_id uuid REFERENCES public.subscription_plans(id),
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;
