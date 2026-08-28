-- =============================================
-- B2B MARKETPLACE DATABASE SCHEMA
-- Complete rebuild for IndiaMART-like platform
-- =============================================

-- First, drop all existing tables (cascade to remove dependencies)
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.job_cards CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop existing enums
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.booking_status CASCADE;
DROP TYPE IF EXISTS public.job_status CASCADE;
DROP TYPE IF EXISTS public.payment_method CASCADE;
DROP TYPE IF EXISTS public.vehicle_type CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.has_role CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS public.auto_deduct_inventory CASCADE;

-- =============================================
-- NEW ENUMS FOR B2B MARKETPLACE
-- =============================================

CREATE TYPE public.user_role AS ENUM ('buyer', 'seller', 'sales_agent', 'admin', 'super_admin');
CREATE TYPE public.seller_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'interested', 'converted', 'lost', 'expired');
CREATE TYPE public.subscription_tier AS ENUM ('free', 'basic', 'pro', 'premium');
CREATE TYPE public.verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE public.requirement_status AS ENUM ('open', 'in_progress', 'fulfilled', 'closed', 'expired');

-- =============================================
-- CORE TABLES
-- =============================================

-- User Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'buyer',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Categories (multi-level)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subscription Plans (configurable from admin)
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier subscription_tier NOT NULL,
  description TEXT,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  leads_per_month INTEGER NOT NULL DEFAULT 0,
  featured_products INTEGER DEFAULT 0,
  priority_ranking INTEGER DEFAULT 0,
  show_contact_details BOOLEAN DEFAULT false,
  verified_badge BOOLEAN DEFAULT false,
  analytics_access BOOLEAN DEFAULT false,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seller Profiles (business details)
CREATE TABLE public.seller_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type TEXT,
  gst_number TEXT,
  pan_number TEXT,
  established_year INTEGER,
  employee_count TEXT,
  annual_turnover TEXT,
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  country TEXT DEFAULT 'India',
  website TEXT,
  logo_url TEXT,
  banner_url TEXT,
  status seller_status DEFAULT 'pending',
  verification_status verification_status DEFAULT 'unverified',
  verified_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  trust_score INTEGER DEFAULT 0,
  response_rate NUMERIC DEFAULT 0,
  avg_response_time INTEGER,
  total_leads INTEGER DEFAULT 0,
  converted_leads INTEGER DEFAULT 0,
  subscription_plan_id UUID REFERENCES public.subscription_plans(id),
  subscription_starts_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  leads_used_this_month INTEGER DEFAULT 0,
  leads_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Products/Services Listings
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  specifications JSONB DEFAULT '{}',
  min_order_quantity INTEGER DEFAULT 1,
  moq_unit TEXT DEFAULT 'Piece',
  price_min NUMERIC,
  price_max NUMERIC,
  price_unit TEXT DEFAULT 'Per Piece',
  images JSONB DEFAULT '[]',
  video_url TEXT,
  tags TEXT[],
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  enquiry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Buy Requirements (RFI - Request for Information)
CREATE TABLE public.requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER,
  quantity_unit TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  location TEXT,
  delivery_timeline TEXT,
  attachments JSONB DEFAULT '[]',
  status requirement_status DEFAULT 'open',
  response_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Leads (enquiries from buyers to sellers)
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  requirement_id UUID REFERENCES public.requirements(id) ON DELETE SET NULL,
  message TEXT,
  quantity INTEGER,
  quantity_unit TEXT,
  status lead_status DEFAULT 'new',
  lead_score INTEGER DEFAULT 50,
  is_paid BOOLEAN DEFAULT false,
  contacted_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  notes TEXT,
  assigned_agent_id UUID REFERENCES public.profiles(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Requirement Responses (sellers responding to RFIs)
CREATE TABLE public.requirement_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  quoted_price NUMERIC,
  delivery_time TEXT,
  attachments JSONB DEFAULT '[]',
  is_shortlisted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requirement_id, seller_id)
);

-- Saved Suppliers (buyer favorites)
CREATE TABLE public.saved_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(buyer_id, seller_id)
);

-- Reviews & Ratings
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  admin_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seller Subscriptions History
CREATE TABLE public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  amount_paid NUMERIC NOT NULL,
  payment_method TEXT,
  payment_reference TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_renewal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lead Purchases (pay-per-lead tracking)
CREATE TABLE public.lead_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Platform Settings (admin configurable)
CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Verification Documents
CREATE TABLE public.verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  status verification_status DEFAULT 'pending',
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activity Log (for analytics)
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sales Agent Assignments
CREATE TABLE public.agent_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, seller_id)
);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'buyer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = _role AND is_active = true
  )
$$;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role IN ('admin', 'super_admin') AND is_active = true
  )
$$;

-- Check if user is seller
CREATE OR REPLACE FUNCTION public.is_seller(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'seller' AND is_active = true
  )
$$;

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seller_profiles_updated_at BEFORE UPDATE ON public.seller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON public.requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Handle new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_assignments ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR ALL USING (public.is_admin(auth.uid()));

-- CATEGORIES POLICIES (public read)
CREATE POLICY "Anyone can view active categories" ON public.categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (public.is_admin(auth.uid()));

-- SUBSCRIPTION PLANS POLICIES (public read)
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage plans" ON public.subscription_plans
  FOR ALL USING (public.is_admin(auth.uid()));

-- SELLER PROFILES POLICIES
CREATE POLICY "Approved sellers are publicly visible" ON public.seller_profiles
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can view own seller profile" ON public.seller_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own seller profile" ON public.seller_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own seller profile" ON public.seller_profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all seller profiles" ON public.seller_profiles
  FOR ALL USING (public.is_admin(auth.uid()));

-- PRODUCTS POLICIES
CREATE POLICY "Active products from approved sellers are public" ON public.products
  FOR SELECT USING (
    is_active = true AND 
    EXISTS (SELECT 1 FROM public.seller_profiles WHERE id = seller_id AND status = 'approved')
  );

CREATE POLICY "Sellers can manage own products" ON public.products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.seller_profiles WHERE id = seller_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all products" ON public.products
  FOR ALL USING (public.is_admin(auth.uid()));

-- REQUIREMENTS POLICIES
CREATE POLICY "Open requirements are publicly visible" ON public.requirements
  FOR SELECT USING (status = 'open');

CREATE POLICY "Buyers can manage own requirements" ON public.requirements
  FOR ALL USING (buyer_id = auth.uid());

CREATE POLICY "Admins can manage all requirements" ON public.requirements
  FOR ALL USING (public.is_admin(auth.uid()));

-- LEADS POLICIES
CREATE POLICY "Buyers can view own leads" ON public.leads
  FOR SELECT USING (buyer_id = auth.uid());

CREATE POLICY "Buyers can create leads" ON public.leads
  FOR INSERT WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Sellers can view leads sent to them" ON public.leads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.seller_profiles WHERE id = seller_id AND user_id = auth.uid())
  );

CREATE POLICY "Sellers can update leads sent to them" ON public.leads
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.seller_profiles WHERE id = seller_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all leads" ON public.leads
  FOR ALL USING (public.is_admin(auth.uid()));

-- REQUIREMENT RESPONSES POLICIES
CREATE POLICY "Requirement owners can view responses" ON public.requirement_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.requirements WHERE id = requirement_id AND buyer_id = auth.uid())
  );

CREATE POLICY "Sellers can manage own responses" ON public.requirement_responses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.seller_profiles WHERE id = seller_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all responses" ON public.requirement_responses
  FOR ALL USING (public.is_admin(auth.uid()));

-- SAVED SUPPLIERS POLICIES
CREATE POLICY "Users can manage own saved suppliers" ON public.saved_suppliers
  FOR ALL USING (buyer_id = auth.uid());

-- REVIEWS POLICIES
CREATE POLICY "Visible reviews are public" ON public.reviews
  FOR SELECT USING (is_visible = true);

CREATE POLICY "Buyers can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Buyers can update own reviews" ON public.reviews
  FOR UPDATE USING (buyer_id = auth.uid());

CREATE POLICY "Admins can manage all reviews" ON public.reviews
  FOR ALL USING (public.is_admin(auth.uid()));

-- SUBSCRIPTION HISTORY POLICIES
CREATE POLICY "Sellers can view own subscription history" ON public.subscription_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.seller_profiles WHERE id = seller_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage subscription history" ON public.subscription_history
  FOR ALL USING (public.is_admin(auth.uid()));

-- LEAD PURCHASES POLICIES
CREATE POLICY "Sellers can view own lead purchases" ON public.lead_purchases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.seller_profiles WHERE id = seller_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage lead purchases" ON public.lead_purchases
  FOR ALL USING (public.is_admin(auth.uid()));

-- PLATFORM SETTINGS POLICIES
CREATE POLICY "Anyone can view platform settings" ON public.platform_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage platform settings" ON public.platform_settings
  FOR ALL USING (public.is_admin(auth.uid()));

-- VERIFICATION DOCUMENTS POLICIES
CREATE POLICY "Sellers can manage own documents" ON public.verification_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.seller_profiles WHERE id = seller_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all documents" ON public.verification_documents
  FOR ALL USING (public.is_admin(auth.uid()));

-- ACTIVITY LOG POLICIES
CREATE POLICY "Users can view own activity" ON public.activity_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activity" ON public.activity_log
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert activity" ON public.activity_log
  FOR INSERT WITH CHECK (true);

-- AGENT ASSIGNMENTS POLICIES
CREATE POLICY "Agents can view own assignments" ON public.agent_assignments
  FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "Agents can update own assignments" ON public.agent_assignments
  FOR UPDATE USING (agent_id = auth.uid());

CREATE POLICY "Admins can manage all assignments" ON public.agent_assignments
  FOR ALL USING (public.is_admin(auth.uid()));

-- =============================================
-- SEED DATA
-- =============================================

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, tier, description, price_monthly, price_yearly, leads_per_month, featured_products, priority_ranking, show_contact_details, verified_badge, analytics_access, features) VALUES
('Free', 'free', 'Get started with basic visibility', 0, 0, 5, 0, 1, false, false, false, '["Basic listing", "5 leads/month", "Standard support"]'),
('Basic', 'basic', 'For growing businesses', 999, 9990, 25, 3, 2, true, false, false, '["Enhanced listing", "25 leads/month", "Show contact details", "3 featured products", "Email support"]'),
('Pro', 'pro', 'For established businesses', 2999, 29990, 100, 10, 3, true, true, true, '["Premium listing", "100 leads/month", "Verified badge", "10 featured products", "Priority support", "Analytics dashboard"]'),
('Premium', 'premium', 'For market leaders', 9999, 99990, 500, 50, 4, true, true, true, '["Top listing", "500 leads/month", "Premium badge", "50 featured products", "Dedicated manager", "Advanced analytics", "API access"]');

-- Insert sample categories
INSERT INTO public.categories (name, slug, description, icon, level, display_order) VALUES
('Electronics & Electricals', 'electronics', 'Electronic components, devices, and electrical equipment', 'Cpu', 1, 1),
('Machinery & Equipment', 'machinery', 'Industrial machines and manufacturing equipment', 'Settings', 1, 2),
('Textiles & Apparel', 'textiles', 'Fabrics, clothing, and fashion accessories', 'Shirt', 1, 3),
('Building & Construction', 'construction', 'Construction materials and building supplies', 'Building2', 1, 4),
('Food & Beverages', 'food', 'Food products, beverages, and agricultural goods', 'UtensilsCrossed', 1, 5),
('Chemicals & Plastics', 'chemicals', 'Industrial chemicals and plastic products', 'FlaskConical', 1, 6),
('Health & Medical', 'health', 'Medical equipment and healthcare products', 'Heart', 1, 7),
('Automotive & Transport', 'automotive', 'Vehicles, parts, and transportation equipment', 'Car', 1, 8);

-- Insert sub-categories
INSERT INTO public.categories (name, slug, description, parent_id, level, display_order)
SELECT 'Mobile Phones', 'mobile-phones', 'Smartphones and mobile devices', id, 2, 1 FROM public.categories WHERE slug = 'electronics'
UNION ALL
SELECT 'Computers & Laptops', 'computers', 'Desktop computers and laptops', id, 2, 2 FROM public.categories WHERE slug = 'electronics'
UNION ALL
SELECT 'LED Lights', 'led-lights', 'LED lighting solutions', id, 2, 3 FROM public.categories WHERE slug = 'electronics'
UNION ALL
SELECT 'CNC Machines', 'cnc-machines', 'CNC cutting and milling machines', id, 2, 1 FROM public.categories WHERE slug = 'machinery'
UNION ALL
SELECT 'Packaging Machines', 'packaging-machines', 'Packaging and sealing machines', id, 2, 2 FROM public.categories WHERE slug = 'machinery';

-- Insert platform settings
INSERT INTO public.platform_settings (key, value, description) VALUES
('site_name', '"B2B Marketplace"', 'Platform name'),
('site_tagline', '"Connect with Verified Suppliers"', 'Platform tagline'),
('contact_email', '"support@b2bmarket.com"', 'Support email'),
('contact_phone', '"+91 1800 123 4567"', 'Support phone'),
('lead_price', '50', 'Default price per lead in INR'),
('lead_expiry_days', '7', 'Days before a lead expires'),
('requirement_expiry_days', '30', 'Days before a requirement expires'),
('min_seller_rating', '3', 'Minimum rating to show seller');