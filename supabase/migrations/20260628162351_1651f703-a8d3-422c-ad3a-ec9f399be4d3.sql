
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','seller','buyer','sales_agent');
CREATE TYPE public.lead_status AS ENUM ('new','assigned','contacted','quoted','won','lost','expired');
CREATE TYPE public.deal_stage AS ENUM ('lead','contacted','quoted','negotiation','won','lost');
CREATE TYPE public.subscription_status AS ENUM ('active','expired','cancelled','trial');
CREATE TYPE public.kyc_status AS ENUM ('pending','verified','rejected');

-- ============ UTIL ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  show_visitor_data BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users can self-assign initial role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============ AUTH TRIGGER: auto profile + default buyer role ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'buyer'))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  description TEXT,
  icon TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are public" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SUBSCRIPTION PLANS ============
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_products INTEGER DEFAULT 10,
  max_leads_per_month INTEGER DEFAULT 50,
  boost_multiplier NUMERIC(4,2) DEFAULT 1.0,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are public" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "Admins manage plans" ON public.subscription_plans FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SELLER PROFILES ============
CREATE TABLE public.seller_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT,
  about TEXT,
  logo_url TEXT,
  banner_url TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  pincode TEXT,
  gstin TEXT,
  pan TEXT,
  cin TEXT,
  business_type TEXT,
  year_established INTEGER,
  employee_count TEXT,
  annual_turnover TEXT,
  primary_category_id UUID REFERENCES public.categories(id),
  niches TEXT[] DEFAULT '{}',
  certifications JSONB DEFAULT '[]'::jsonb,
  export_countries TEXT[] DEFAULT '{}',
  social_links JSONB DEFAULT '{}'::jsonb,
  kyc_status kyc_status DEFAULT 'pending',
  is_approved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  trust_score NUMERIC(5,2) DEFAULT 0,
  response_time_minutes INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  plan_id UUID REFERENCES public.subscription_plans(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seller_profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.seller_profiles TO authenticated;
GRANT ALL ON public.seller_profiles TO service_role;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved sellers are public" ON public.seller_profiles FOR SELECT USING (is_approved = true OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Sellers manage own profile" ON public.seller_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Sellers update own profile" ON public.seller_profiles FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete sellers" ON public.seller_profiles FOR DELETE USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_seller_updated BEFORE UPDATE ON public.seller_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_seller_category ON public.seller_profiles(primary_category_id);
CREATE INDEX idx_seller_city ON public.seller_profiles(city);

-- ============ SELLER AVAILABILITY ============
CREATE TABLE public.seller_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL UNIQUE REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  working_hours JSONB DEFAULT '{}'::jsonb,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  max_leads_per_day INTEGER DEFAULT 20,
  vacation_mode BOOLEAN DEFAULT false,
  vacation_until DATE,
  auto_response_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_availability TO authenticated;
GRANT ALL ON public.seller_availability TO service_role;
ALTER TABLE public.seller_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers manage availability" ON public.seller_availability FOR ALL USING (
  EXISTS (SELECT 1 FROM public.seller_profiles s WHERE s.id = seller_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.seller_profiles s WHERE s.id = seller_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE TRIGGER trg_avail_updated BEFORE UPDATE ON public.seller_availability FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SELLER SUBSCRIPTIONS ============
CREATE TABLE public.seller_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status subscription_status NOT NULL DEFAULT 'trial',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  amount_paid NUMERIC(10,2),
  payment_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.seller_subscriptions TO authenticated;
GRANT ALL ON public.seller_subscriptions TO service_role;
ALTER TABLE public.seller_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers view own subs" ON public.seller_subscriptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.seller_profiles s WHERE s.id = seller_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "Admins manage subs" ON public.seller_subscriptions FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.seller_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description TEXT,
  price NUMERIC(12,2),
  price_min NUMERIC(12,2),
  price_max NUMERIC(12,2),
  currency TEXT DEFAULT 'INR',
  unit TEXT DEFAULT 'piece',
  moq INTEGER DEFAULT 1,
  stock_quantity INTEGER,
  brand TEXT,
  model TEXT,
  sku TEXT,
  hsn_code TEXT,
  specifications JSONB DEFAULT '{}'::jsonb,
  features TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  primary_image_url TEXT,
  video_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  lead_count INTEGER DEFAULT 0,
  rank_score NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active products public" ON public.products FOR SELECT USING (
  is_active = true OR EXISTS (SELECT 1 FROM public.seller_profiles s WHERE s.id = seller_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "Sellers manage own products" ON public.products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.seller_profiles s WHERE s.id = seller_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.seller_profiles s WHERE s.id = seller_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_seller ON public.products(seller_id);

-- ============ PRODUCT IMAGES ============
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product images public" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Sellers manage own product images" ON public.product_images FOR ALL USING (
  EXISTS (SELECT 1 FROM public.products p JOIN public.seller_profiles s ON s.id = p.seller_id
          WHERE p.id = product_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.products p JOIN public.seller_profiles s ON s.id = p.seller_id
          WHERE p.id = product_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);

-- ============ PRODUCT VIEWS ============
CREATE TABLE public.product_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.product_views TO anon, authenticated;
GRANT SELECT ON public.product_views TO authenticated;
GRANT ALL ON public.product_views TO service_role;
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record view" ON public.product_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Sellers see own product views" ON public.product_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p JOIN public.seller_profiles s ON s.id = p.seller_id
          WHERE p.id = product_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);

-- ============ REQUIREMENTS (RFQ) ============
CREATE TABLE public.requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  category_id UUID REFERENCES public.categories(id),
  title TEXT NOT NULL,
  description TEXT,
  quantity INTEGER,
  unit TEXT,
  budget_min NUMERIC(12,2),
  budget_max NUMERIC(12,2),
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  urgency TEXT DEFAULT 'normal',
  expected_delivery DATE,
  specifications JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'open',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.requirements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requirements TO authenticated;
GRANT ALL ON public.requirements TO service_role;
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reqs visible" ON public.requirements FOR SELECT USING (is_public = true OR auth.uid() = buyer_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Anyone can post req" ON public.requirements FOR INSERT WITH CHECK (true);
CREATE POLICY "Buyer updates own req" ON public.requirements FOR UPDATE USING (auth.uid() = buyer_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Buyer deletes own req" ON public.requirements FOR DELETE USING (auth.uid() = buyer_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_req_updated BEFORE UPDATE ON public.requirements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ LEADS ============
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  seller_id UUID REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  requirement_id UUID REFERENCES public.requirements(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id),
  message TEXT,
  quantity INTEGER,
  unit TEXT,
  budget NUMERIC(12,2),
  status lead_status NOT NULL DEFAULT 'new',
  intent_score NUMERIC(5,2) DEFAULT 0,
  lead_price NUMERIC(10,2) DEFAULT 0,
  expected_conversion NUMERIC(5,2),
  response_deadline TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  source TEXT DEFAULT 'website',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit lead" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Stakeholders view lead" ON public.leads FOR SELECT USING (
  auth.uid() = buyer_id
  OR EXISTS (SELECT 1 FROM public.seller_profiles s WHERE s.id = seller_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "Seller/admin update lead" ON public.leads FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.seller_profiles s WHERE s.id = seller_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_leads_seller ON public.leads(seller_id);
CREATE INDEX idx_leads_buyer ON public.leads(buyer_id);

-- ============ LEAD ASSIGNMENTS (progressive routing) ============
CREATE TABLE public.lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  priority INTEGER DEFAULT 1
);
GRANT SELECT, INSERT, UPDATE ON public.lead_assignments TO authenticated;
GRANT ALL ON public.lead_assignments TO service_role;
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seller/admin view assignments" ON public.lead_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.seller_profiles s WHERE s.id = seller_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "Seller/admin update assignments" ON public.lead_assignments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.seller_profiles s WHERE s.id = seller_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "Admin insert assignments" ON public.lead_assignments FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ DEALS ============
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount NUMERIC(12,2),
  stage deal_stage NOT NULL DEFAULT 'lead',
  probability INTEGER DEFAULT 0,
  expected_close DATE,
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seller manages own deals" ON public.deals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.seller_profiles s WHERE s.id = seller_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.seller_profiles s WHERE s.id = seller_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE TRIGGER trg_deals_updated BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ REVIEWS ============
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL,
  title TEXT,
  review TEXT,
  is_visible BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visible reviews public" ON public.reviews FOR SELECT USING (is_visible = true OR auth.uid() = buyer_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Buyers create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Buyers update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = buyer_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Buyers delete own reviews" ON public.reviews FOR DELETE USING (auth.uid() = buyer_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SAVED SUPPLIERS ============
CREATE TABLE public.saved_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, seller_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_suppliers TO authenticated;
GRANT ALL ON public.saved_suppliers TO service_role;
ALTER TABLE public.saved_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyer manages saved" ON public.saved_suppliers FOR ALL USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);

-- ============ BUYER INTENT SIGNALS ============
CREATE TABLE public.buyer_intent_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  signal_data JSONB DEFAULT '{}'::jsonb,
  weight INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.buyer_intent_signals TO anon, authenticated;
GRANT SELECT ON public.buyer_intent_signals TO authenticated;
GRANT ALL ON public.buyer_intent_signals TO service_role;
ALTER TABLE public.buyer_intent_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone records intent" ON public.buyer_intent_signals FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin reads intent" ON public.buyer_intent_signals FOR SELECT USING (public.has_role(auth.uid(),'admin') OR auth.uid() = user_id);
CREATE INDEX idx_intent_session ON public.buyer_intent_signals(session_id);
CREATE INDEX idx_intent_user ON public.buyer_intent_signals(user_id);

-- ============ INTENT SCORES ============
CREATE TABLE public.intent_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  score NUMERIC(6,2) DEFAULT 0,
  category_id UUID REFERENCES public.categories(id),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.intent_scores TO authenticated;
GRANT ALL ON public.intent_scores TO service_role;
ALTER TABLE public.intent_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User views own intent" ON public.intent_scores FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ============ INTENT CALC FUNCTION ============
CREATE OR REPLACE FUNCTION public.calculate_buyer_intent(p_user_id UUID, p_session_id TEXT)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(weight),0) INTO total
  FROM public.buyer_intent_signals
  WHERE (p_user_id IS NOT NULL AND user_id = p_user_id)
     OR (p_session_id IS NOT NULL AND session_id = p_session_id);

  INSERT INTO public.intent_scores (user_id, session_id, score)
  VALUES (p_user_id, p_session_id, total);
  RETURN total;
END; $$;

-- ============ SEARCH LOGS ============
CREATE TABLE public.search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  query TEXT,
  category_id UUID REFERENCES public.categories(id),
  filters JSONB DEFAULT '{}'::jsonb,
  result_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.search_logs TO anon, authenticated;
GRANT SELECT ON public.search_logs TO authenticated;
GRANT ALL ON public.search_logs TO service_role;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone logs search" ON public.search_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin views logs" ON public.search_logs FOR SELECT USING (public.has_role(auth.uid(),'admin') OR auth.uid() = user_id);

-- ============ PLATFORM SETTINGS ============
CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings public" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Admin manages settings" ON public.platform_settings FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User views own notifs" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User updates own notifs" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ============ AUDIT LOG ============
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.audit_log TO authenticated;
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin views audit" ON public.audit_log FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Insert audit" ON public.audit_log FOR INSERT WITH CHECK (true);
