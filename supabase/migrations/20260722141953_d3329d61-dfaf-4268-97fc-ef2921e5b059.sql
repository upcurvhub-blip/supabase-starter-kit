
-- 1) seo_metadata
CREATE TABLE public.seo_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  title TEXT,
  description TEXT,
  keywords TEXT[],
  canonical TEXT,
  og_image TEXT,
  json_ld JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);
CREATE INDEX idx_seo_metadata_entity ON public.seo_metadata(entity_type, entity_id);
GRANT SELECT ON public.seo_metadata TO anon, authenticated;
GRANT ALL ON public.seo_metadata TO service_role;
ALTER TABLE public.seo_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_metadata public read" ON public.seo_metadata FOR SELECT USING (true);
CREATE POLICY "seo_metadata admin write" ON public.seo_metadata FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_seo_metadata_updated BEFORE UPDATE ON public.seo_metadata
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) slugs registry
CREATE TABLE public.slugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_slugs_entity ON public.slugs(entity_type, entity_id);
GRANT SELECT ON public.slugs TO anon, authenticated;
GRANT ALL ON public.slugs TO service_role;
ALTER TABLE public.slugs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slugs public read" ON public.slugs FOR SELECT USING (true);
CREATE POLICY "slugs admin write" ON public.slugs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) redirects
CREATE TABLE public.redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path TEXT NOT NULL UNIQUE,
  to_path TEXT NOT NULL,
  status_code INT NOT NULL DEFAULT 301,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.redirects TO anon, authenticated;
GRANT ALL ON public.redirects TO service_role;
ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "redirects public read" ON public.redirects FOR SELECT USING (true);
CREATE POLICY "redirects admin write" ON public.redirects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) brands
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO anon, authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands public read" ON public.brands FOR SELECT USING (true);
CREATE POLICY "brands admin write" ON public.brands FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_brands_updated BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) product_brands
CREATE TABLE public.product_brands (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, brand_id)
);
GRANT SELECT ON public.product_brands TO anon, authenticated;
GRANT ALL ON public.product_brands TO service_role;
ALTER TABLE public.product_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_brands public read" ON public.product_brands FOR SELECT USING (true);
CREATE POLICY "product_brands admin write" ON public.product_brands FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6) product_faqs
CREATE TABLE public.product_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'ai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_faqs_product ON public.product_faqs(product_id, position);
GRANT SELECT ON public.product_faqs TO anon, authenticated;
GRANT ALL ON public.product_faqs TO service_role;
ALTER TABLE public.product_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_faqs public read" ON public.product_faqs FOR SELECT USING (true);
CREATE POLICY "product_faqs admin write" ON public.product_faqs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_product_faqs_updated BEFORE UPDATE ON public.product_faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) internal_links
CREATE TABLE public.internal_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_type TEXT NOT NULL,
  from_entity_id UUID NOT NULL,
  to_entity_type TEXT NOT NULL,
  to_entity_id UUID NOT NULL,
  anchor TEXT,
  weight NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_entity_type, from_entity_id, to_entity_type, to_entity_id)
);
CREATE INDEX idx_internal_links_from ON public.internal_links(from_entity_type, from_entity_id);
CREATE INDEX idx_internal_links_to ON public.internal_links(to_entity_type, to_entity_id);
GRANT SELECT ON public.internal_links TO anon, authenticated;
GRANT ALL ON public.internal_links TO service_role;
ALTER TABLE public.internal_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internal_links public read" ON public.internal_links FOR SELECT USING (true);
CREATE POLICY "internal_links admin write" ON public.internal_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8) buying_guides
CREATE TABLE public.buying_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  faq_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  meta_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.buying_guides TO anon, authenticated;
GRANT ALL ON public.buying_guides TO service_role;
ALTER TABLE public.buying_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buying_guides public read published" ON public.buying_guides FOR SELECT USING (is_published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "buying_guides admin write" ON public.buying_guides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_buying_guides_updated BEFORE UPDATE ON public.buying_guides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
