
-- 1. Products: selling mode + D2C fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS selling_mode text NOT NULL DEFAULT 'wholesale',
  ADD COLUMN IF NOT EXISTS mrp numeric,
  ADD COLUMN IF NOT EXISTS selling_price numeric,
  ADD COLUMN IF NOT EXISTS min_purchase_qty integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS stock_availability text DEFAULT 'in_stock',
  ADD COLUMN IF NOT EXISTS product_condition text DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS supply_capacity text,
  ADD COLUMN IF NOT EXISTS lead_time text,
  ADD COLUMN IF NOT EXISTS min_order_value numeric,
  ADD COLUMN IF NOT EXISTS wholesale_tiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_available boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_scope text DEFAULT 'pan_india',
  ADD COLUMN IF NOT EXISTS delivery_locations text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS delivery_time text,
  ADD COLUMN IF NOT EXISTS pickup_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cod_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_methods text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS return_policy text DEFAULT 'no_returns',
  ADD COLUMN IF NOT EXISTS return_window_days integer,
  ADD COLUMN IF NOT EXISTS replacement_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS warranty text,
  ADD COLUMN IF NOT EXISTS cancellation_policy text,
  ADD COLUMN IF NOT EXISTS shipping_info text,
  ADD COLUMN IF NOT EXISTS installation_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customization_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customization_details text,
  ADD COLUMN IF NOT EXISTS brochure_url text,
  ADD COLUMN IF NOT EXISTS spec_sheet_url text;

CREATE OR REPLACE FUNCTION public.validate_product_selling_mode()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.selling_mode NOT IN ('retail','wholesale','both') THEN
    RAISE EXCEPTION 'selling_mode must be retail, wholesale or both';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_product_selling_mode ON public.products;
CREATE TRIGGER trg_validate_product_selling_mode
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.validate_product_selling_mode();

CREATE INDEX IF NOT EXISTS idx_products_selling_mode ON public.products(selling_mode);

-- 2. Business visitor leads (intent popup capture)
CREATE TABLE IF NOT EXISTS public.business_visitor_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  phone text NOT NULL,
  device_id text,
  session_id text,
  user_id uuid,
  page_path text,
  city text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.business_visitor_leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_visitor_leads TO authenticated;
GRANT ALL ON public.business_visitor_leads TO service_role;

ALTER TABLE public.business_visitor_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a business intent lead"
ON public.business_visitor_leads FOR INSERT
WITH CHECK (true);

CREATE POLICY "Staff can view business intent leads"
ON public.business_visitor_leads FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales_agent'));

CREATE POLICY "Staff can update business intent leads"
ON public.business_visitor_leads FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales_agent'));

CREATE POLICY "Admins can delete business intent leads"
ON public.business_visitor_leads FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_business_visitor_leads_updated_at ON public.business_visitor_leads;
CREATE TRIGGER trg_business_visitor_leads_updated_at
BEFORE UPDATE ON public.business_visitor_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Category-aware specification templates
CREATE TABLE IF NOT EXISTS public.category_spec_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id)
);

GRANT SELECT ON public.category_spec_templates TO anon;
GRANT SELECT ON public.category_spec_templates TO authenticated;
GRANT ALL ON public.category_spec_templates TO service_role;

ALTER TABLE public.category_spec_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Spec templates are publicly readable"
ON public.category_spec_templates FOR SELECT
USING (true);

CREATE POLICY "Admins can manage spec templates"
ON public.category_spec_templates FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_category_spec_templates_updated_at ON public.category_spec_templates;
CREATE TRIGGER trg_category_spec_templates_updated_at
BEFORE UPDATE ON public.category_spec_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
