
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS quantity_unit text;

ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS quantity_unit text;
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS response_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS delivery_timeline text;

ALTER TABLE public.seller_availability ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;
ALTER TABLE public.seller_availability ADD COLUMN IF NOT EXISTS available_from text NOT NULL DEFAULT '09:00';
ALTER TABLE public.seller_availability ADD COLUMN IF NOT EXISTS available_to text NOT NULL DEFAULT '18:00';
ALTER TABLE public.seller_availability ADD COLUMN IF NOT EXISTS auto_response_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.seller_availability ALTER COLUMN vacation_until TYPE timestamptz USING vacation_until::timestamptz;

ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS leads_used_this_month integer NOT NULL DEFAULT 0;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS leads_per_month integer NOT NULL DEFAULT 0;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS featured_products integer NOT NULL DEFAULT 0;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS verified_badge boolean NOT NULL DEFAULT false;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS show_contact_details boolean NOT NULL DEFAULT false;

ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS updated_by uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='platform_settings_key_key') THEN
    ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_key_key UNIQUE (key);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.lead_pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  base_price numeric NOT NULL DEFAULT 50,
  intent_multiplier_low numeric NOT NULL DEFAULT 0.8,
  intent_multiplier_medium numeric NOT NULL DEFAULT 1.0,
  intent_multiplier_high numeric NOT NULL DEFAULT 1.5,
  urgency_multiplier_normal numeric NOT NULL DEFAULT 1.0,
  urgency_multiplier_urgent numeric NOT NULL DEFAULT 1.5,
  urgency_multiplier_critical numeric NOT NULL DEFAULT 2.0,
  min_price numeric NOT NULL DEFAULT 20,
  max_price numeric NOT NULL DEFAULT 500,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lead_pricing_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_pricing_config TO authenticated;
GRANT ALL ON public.lead_pricing_config TO service_role;
ALTER TABLE public.lead_pricing_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage lead pricing" ON public.lead_pricing_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone read active pricing" ON public.lead_pricing_config FOR SELECT USING (is_active = true);

CREATE TABLE IF NOT EXISTS public.lead_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  intent_score numeric,
  geography_tier text,
  urgency_level text,
  base_price numeric,
  final_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.lead_price_history TO authenticated;
GRANT ALL ON public.lead_price_history TO service_role;
ALTER TABLE public.lead_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view price history" ON public.lead_price_history FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System insert price history" ON public.lead_price_history FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.route_lead_to_seller(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
  v_business_name text;
BEGIN
  SELECT seller_id INTO v_seller_id FROM public.leads WHERE id = p_lead_id;
  IF v_seller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found or has no seller');
  END IF;
  SELECT COALESCE(business_name, company_name) INTO v_business_name FROM public.seller_profiles WHERE id = v_seller_id;
  RETURN jsonb_build_object('success', true, 'seller_id', v_seller_id, 'business_name', v_business_name);
END;
$$;
