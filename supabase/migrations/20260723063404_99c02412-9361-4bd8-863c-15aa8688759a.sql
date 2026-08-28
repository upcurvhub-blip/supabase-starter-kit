
-- Categories AI classification fields
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS service_confidence NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS service_ai_flagged BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_ai_reason TEXT;

-- SERVICES
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  price NUMERIC(12,2),
  currency TEXT DEFAULT 'INR',
  unit TEXT DEFAULT 'per_visit',
  city TEXT,
  state TEXT,
  images TEXT[] DEFAULT '{}',
  working_hours JSONB DEFAULT '{}'::jsonb,
  service_radius_km INTEGER,
  response_time TEXT,
  min_charges NUMERIC(12,2),
  certifications TEXT[] DEFAULT '{}',
  team_size TEXT,
  warranty TEXT,
  emergency_service BOOLEAN DEFAULT false,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_public_read_active" ON public.services
  FOR SELECT USING (is_active = true);
CREATE POLICY "services_seller_manage" ON public.services
  FOR ALL USING (public.is_seller_profile_owner(seller_id, auth.uid()))
  WITH CHECK (public.is_seller_profile_owner(seller_id, auth.uid()));
CREATE POLICY "services_admin_manage" ON public.services
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_services_seller ON public.services(seller_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_city ON public.services(city);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(is_active);

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ADS
CREATE TABLE IF NOT EXISTS public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('text','image','popup','scratch')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  placements TEXT[] NOT NULL DEFAULT '{}',
  target_category_ids UUID[] DEFAULT '{}',
  target_cities TEXT[] DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads TO authenticated;
GRANT ALL ON public.ads TO service_role;

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ads_public_read_active" ON public.ads
  FOR SELECT USING (
    is_active = true
    AND (start_at IS NULL OR start_at <= now())
    AND (end_at IS NULL OR end_at >= now())
  );
CREATE POLICY "ads_admin_manage" ON public.ads
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_ads_active ON public.ads(is_active);
CREATE INDEX IF NOT EXISTS idx_ads_placements ON public.ads USING GIN(placements);
CREATE INDEX IF NOT EXISTS idx_ads_target_cats ON public.ads USING GIN(target_category_ids);

CREATE TRIGGER update_ads_updated_at
  BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AD EVENTS
CREATE TABLE IF NOT EXISTS public.ad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view','click','dismiss','reveal')),
  page_path TEXT,
  device_id TEXT,
  session_id TEXT,
  user_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.ad_events TO anon;
GRANT SELECT, INSERT ON public.ad_events TO authenticated;
GRANT ALL ON public.ad_events TO service_role;

ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_events_anyone_insert" ON public.ad_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "ad_events_admin_read" ON public.ad_events
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_ad_events_ad ON public.ad_events(ad_id, created_at DESC);
