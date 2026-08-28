
-- Local landing pages (city / category SEO pages)
CREATE TABLE IF NOT EXISTS public.local_landing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  h1 TEXT NOT NULL,
  meta_description TEXT,
  city TEXT NOT NULL,
  state TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  page_type TEXT NOT NULL DEFAULT 'suppliers_in_city',
  hero_content TEXT,
  intro_html TEXT,
  faq JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.local_landing_pages TO anon;
GRANT SELECT ON public.local_landing_pages TO authenticated;
GRANT ALL ON public.local_landing_pages TO service_role;

ALTER TABLE public.local_landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read published landing pages"
  ON public.local_landing_pages FOR SELECT
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage landing pages"
  ON public.local_landing_pages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS local_landing_pages_city_idx ON public.local_landing_pages(city);
CREATE INDEX IF NOT EXISTS local_landing_pages_category_idx ON public.local_landing_pages(category_id);

CREATE TRIGGER local_landing_pages_updated_at
  BEFORE UPDATE ON public.local_landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mapping: which sellers show on which page
CREATE TABLE IF NOT EXISTS public.local_landing_page_sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.local_landing_pages(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (page_id, seller_id)
);

GRANT SELECT ON public.local_landing_page_sellers TO anon;
GRANT SELECT ON public.local_landing_page_sellers TO authenticated;
GRANT ALL ON public.local_landing_page_sellers TO service_role;

ALTER TABLE public.local_landing_page_sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read landing page sellers"
  ON public.local_landing_page_sellers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.local_landing_pages p
      WHERE p.id = page_id AND (p.is_published = true OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "admins manage landing page sellers"
  ON public.local_landing_page_sellers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS llps_page_idx ON public.local_landing_page_sellers(page_id, position);
CREATE INDEX IF NOT EXISTS llps_seller_idx ON public.local_landing_page_sellers(seller_id);
