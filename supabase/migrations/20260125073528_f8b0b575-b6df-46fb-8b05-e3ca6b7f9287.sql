-- ENGINE 4: Lead Distribution & Routing
-- Add lead routing fields to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS routing_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_seller_assigned_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS previous_sellers jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS routing_status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS escalation_level integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_expired_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS response_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS priority_score integer DEFAULT 50;

-- Create lead routing configuration table
CREATE TABLE IF NOT EXISTS public.lead_routing_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES public.categories(id),
  response_timeout_hours integer DEFAULT 24,
  max_routing_attempts integer DEFAULT 3,
  escalation_delay_hours integer DEFAULT 12,
  priority_boost_for_premium boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create lead routing history table
CREATE TABLE IF NOT EXISTS public.lead_routing_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id),
  assigned_at timestamp with time zone DEFAULT now(),
  response_at timestamp with time zone,
  status text DEFAULT 'pending',
  timeout_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- ENGINE 5: Search & Ranking
-- Create search ranking configuration
CREATE TABLE IF NOT EXISTS public.search_ranking_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factor_name text NOT NULL UNIQUE,
  weight numeric DEFAULT 1.0,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert default ranking factors
INSERT INTO public.search_ranking_config (factor_name, weight, description) VALUES
  ('relevance', 0.35, 'Text match relevance score'),
  ('trust_score', 0.25, 'Seller trust and verification score'),
  ('response_rate', 0.15, 'Seller response rate to leads'),
  ('intent_match', 0.10, 'Match with buyer intent signals'),
  ('paid_boost', 0.10, 'Premium subscription boost'),
  ('recency', 0.05, 'Product freshness score')
ON CONFLICT (factor_name) DO NOTHING;

-- Create seller availability tracking
CREATE TABLE IF NOT EXISTS public.seller_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  is_available boolean DEFAULT true,
  available_from time,
  available_to time,
  timezone text DEFAULT 'Asia/Kolkata',
  max_leads_per_day integer DEFAULT 50,
  leads_received_today integer DEFAULT 0,
  last_lead_received_at timestamp with time zone,
  auto_response_enabled boolean DEFAULT false,
  vacation_mode boolean DEFAULT false,
  vacation_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(seller_id)
);

-- Add RLS policies
ALTER TABLE public.lead_routing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_routing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_ranking_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_availability ENABLE ROW LEVEL SECURITY;

-- Lead routing config policies
CREATE POLICY "Admins can manage routing config" ON public.lead_routing_config FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Anyone can view routing config" ON public.lead_routing_config FOR SELECT USING (true);

-- Lead routing history policies
CREATE POLICY "Admins can manage routing history" ON public.lead_routing_history FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Sellers can view own routing history" ON public.lead_routing_history FOR SELECT 
  USING (EXISTS (SELECT 1 FROM seller_profiles WHERE seller_profiles.id = lead_routing_history.seller_id AND seller_profiles.user_id = auth.uid()));

-- Search ranking config policies
CREATE POLICY "Admins can manage ranking config" ON public.search_ranking_config FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Anyone can view ranking config" ON public.search_ranking_config FOR SELECT USING (true);

-- Seller availability policies
CREATE POLICY "Admins can manage all availability" ON public.seller_availability FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Sellers can manage own availability" ON public.seller_availability FOR ALL 
  USING (EXISTS (SELECT 1 FROM seller_profiles WHERE seller_profiles.id = seller_availability.seller_id AND seller_profiles.user_id = auth.uid()));

-- Function to route lead to next best seller
CREATE OR REPLACE FUNCTION public.route_lead_to_seller(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead RECORD;
  v_best_seller RECORD;
  v_config RECORD;
  v_result jsonb;
BEGIN
  -- Get lead details
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  
  IF v_lead IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
  END IF;
  
  -- Get routing config
  SELECT * INTO v_config FROM lead_routing_config 
    WHERE category_id IS NULL OR category_id = (SELECT category_id FROM products WHERE id = v_lead.product_id)
    ORDER BY category_id NULLS LAST LIMIT 1;
  
  -- Check if max attempts reached
  IF v_lead.routing_attempts >= COALESCE(v_config.max_routing_attempts, 3) THEN
    UPDATE leads SET routing_status = 'exhausted', auto_expired_at = now() WHERE id = p_lead_id;
    RETURN jsonb_build_object('success', false, 'error', 'Max routing attempts reached');
  END IF;
  
  -- Find best available seller
  SELECT sp.* INTO v_best_seller
  FROM seller_profiles sp
  LEFT JOIN seller_availability sa ON sa.seller_id = sp.id
  WHERE sp.status = 'approved'
    AND sp.id != v_lead.seller_id
    AND NOT (v_lead.previous_sellers ? sp.id::text)
    AND (sa.is_available IS NULL OR sa.is_available = true)
    AND (sa.vacation_mode IS NULL OR sa.vacation_mode = false)
    AND (sa.max_leads_per_day IS NULL OR sa.leads_received_today < sa.max_leads_per_day)
  ORDER BY 
    sp.trust_score DESC,
    sp.response_rate DESC,
    CASE WHEN sp.subscription_plan_id IS NOT NULL THEN 1 ELSE 0 END DESC
  LIMIT 1;
  
  IF v_best_seller IS NULL THEN
    UPDATE leads SET routing_status = 'no_sellers_available' WHERE id = p_lead_id;
    RETURN jsonb_build_object('success', false, 'error', 'No available sellers found');
  END IF;
  
  -- Update lead with new seller
  UPDATE leads SET
    previous_sellers = COALESCE(previous_sellers, '[]'::jsonb) || jsonb_build_object('seller_id', seller_id, 'assigned_at', current_seller_assigned_at),
    seller_id = v_best_seller.id,
    current_seller_assigned_at = now(),
    routing_attempts = routing_attempts + 1,
    response_deadline = now() + (COALESCE(v_config.response_timeout_hours, 24) || ' hours')::interval,
    routing_status = 'active'
  WHERE id = p_lead_id;
  
  -- Record routing history
  INSERT INTO lead_routing_history (lead_id, seller_id, timeout_at)
  VALUES (p_lead_id, v_best_seller.id, now() + (COALESCE(v_config.response_timeout_hours, 24) || ' hours')::interval);
  
  -- Update seller availability
  UPDATE seller_availability SET
    leads_received_today = leads_received_today + 1,
    last_lead_received_at = now()
  WHERE seller_id = v_best_seller.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'seller_id', v_best_seller.id,
    'business_name', v_best_seller.business_name,
    'attempt', v_lead.routing_attempts + 1
  );
END;
$$;

-- Function to calculate search ranking
CREATE OR REPLACE FUNCTION public.calculate_search_rank(
  p_product_id uuid,
  p_search_query text DEFAULT NULL,
  p_buyer_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_product RECORD;
  v_seller RECORD;
  v_config RECORD;
  v_rank numeric := 0;
  v_relevance numeric := 0;
  v_trust numeric := 0;
  v_response numeric := 0;
  v_intent numeric := 0;
  v_paid numeric := 0;
  v_recency numeric := 0;
  v_buyer_intent RECORD;
BEGIN
  -- Get product and seller
  SELECT p.*, sp.trust_score, sp.response_rate, sp.subscription_plan_id, sp.created_at as seller_created
  INTO v_product
  FROM products p
  JOIN seller_profiles sp ON sp.id = p.seller_id
  WHERE p.id = p_product_id;
  
  IF v_product IS NULL THEN RETURN 0; END IF;
  
  -- Calculate relevance (if search query provided)
  IF p_search_query IS NOT NULL AND p_search_query != '' THEN
    v_relevance := CASE
      WHEN lower(v_product.name) = lower(p_search_query) THEN 100
      WHEN lower(v_product.name) LIKE '%' || lower(p_search_query) || '%' THEN 70
      WHEN lower(v_product.description) LIKE '%' || lower(p_search_query) || '%' THEN 50
      ELSE 20
    END;
  ELSE
    v_relevance := 50;
  END IF;
  
  -- Trust score (0-100)
  v_trust := COALESCE(v_product.trust_score, 50);
  
  -- Response rate (0-100)
  v_response := COALESCE(v_product.response_rate, 50);
  
  -- Intent match (if buyer provided)
  IF p_buyer_id IS NOT NULL THEN
    SELECT * INTO v_buyer_intent FROM buyer_intent_snapshots WHERE user_id = p_buyer_id;
    IF v_buyer_intent IS NOT NULL THEN
      v_intent := CASE
        WHEN v_buyer_intent.product_interests ? p_product_id::text THEN 80
        WHEN v_buyer_intent.category_interests ? v_product.category_id::text THEN 60
        ELSE 30
      END;
    ELSE
      v_intent := 30;
    END IF;
  ELSE
    v_intent := 30;
  END IF;
  
  -- Paid boost (premium sellers get boost, but capped)
  IF v_product.subscription_plan_id IS NOT NULL THEN
    v_paid := 60; -- Moderate boost, never overrides trust
  ELSE
    v_paid := 30;
  END IF;
  
  -- Recency (newer products rank slightly higher)
  v_recency := GREATEST(0, 100 - EXTRACT(EPOCH FROM (now() - v_product.created_at)) / 86400);
  
  -- Calculate weighted rank
  SELECT 
    v_relevance * COALESCE((SELECT weight FROM search_ranking_config WHERE factor_name = 'relevance'), 0.35) +
    v_trust * COALESCE((SELECT weight FROM search_ranking_config WHERE factor_name = 'trust_score'), 0.25) +
    v_response * COALESCE((SELECT weight FROM search_ranking_config WHERE factor_name = 'response_rate'), 0.15) +
    v_intent * COALESCE((SELECT weight FROM search_ranking_config WHERE factor_name = 'intent_match'), 0.10) +
    v_paid * COALESCE((SELECT weight FROM search_ranking_config WHERE factor_name = 'paid_boost'), 0.10) +
    v_recency * COALESCE((SELECT weight FROM search_ranking_config WHERE factor_name = 'recency'), 0.05)
  INTO v_rank;
  
  -- Suppress low-quality sellers (trust < 30 gets penalty)
  IF v_trust < 30 THEN
    v_rank := v_rank * 0.5;
  END IF;
  
  RETURN ROUND(v_rank, 2);
END;
$$;

-- Function to check and escalate timed-out leads
CREATE OR REPLACE FUNCTION public.check_lead_timeouts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  v_lead RECORD;
  v_result jsonb;
BEGIN
  FOR v_lead IN 
    SELECT * FROM leads 
    WHERE routing_status = 'active' 
      AND response_deadline < now()
      AND status = 'new'
  LOOP
    -- Mark current assignment as timed out
    UPDATE lead_routing_history SET status = 'timeout', response_at = now()
    WHERE lead_id = v_lead.id AND seller_id = v_lead.seller_id AND status = 'pending';
    
    -- Try to route to next seller
    v_result := route_lead_to_seller(v_lead.id);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;