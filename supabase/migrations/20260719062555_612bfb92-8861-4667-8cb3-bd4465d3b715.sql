
CREATE TABLE public.local_landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  h1 text NOT NULL,
  meta_description text,
  city text NOT NULL,
  state text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  page_type text NOT NULL DEFAULT 'suppliers_in_city',
  hero_content text,
  intro_html text,
  faq jsonb DEFAULT '[]'::jsonb,
  footer_html text,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.local_landing_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.local_landing_pages TO authenticated;
GRANT ALL ON public.local_landing_pages TO service_role;
ALTER TABLE public.local_landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published landing pages"
  ON public.local_landing_pages FOR SELECT
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert landing pages"
  ON public.local_landing_pages FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update landing pages"
  ON public.local_landing_pages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete landing pages"
  ON public.local_landing_pages FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_llp_updated_at BEFORE UPDATE ON public.local_landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_llp_published ON public.local_landing_pages(is_published, city);
CREATE INDEX idx_llp_category ON public.local_landing_pages(category_id);

CREATE TABLE public.local_landing_page_sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.local_landing_pages(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page_id, seller_id)
);
GRANT SELECT ON public.local_landing_page_sellers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.local_landing_page_sellers TO authenticated;
GRANT ALL ON public.local_landing_page_sellers TO service_role;
ALTER TABLE public.local_landing_page_sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view page sellers"
  ON public.local_landing_page_sellers FOR SELECT
  USING (true);
CREATE POLICY "Admins manage page sellers"
  ON public.local_landing_page_sellers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_llps_page ON public.local_landing_page_sellers(page_id, position);

CREATE TABLE public.seo_snapshots (
  path text PRIMARY KEY,
  html text NOT NULL,
  rendered_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_snapshots TO service_role;
ALTER TABLE public.seo_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only"
  ON public.seo_snapshots FOR ALL TO service_role
  USING (true) WITH CHECK (true);
