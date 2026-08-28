-- Engine 6: Lead Quality Pricing
CREATE TABLE IF NOT EXISTS public.lead_pricing_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES public.categories(id),
  base_price numeric NOT NULL DEFAULT 50,
  intent_multiplier_low numeric DEFAULT 0.8,
  intent_multiplier_medium numeric DEFAULT 1.0,
  intent_multiplier_high numeric DEFAULT 1.5,
  geography_premium jsonb DEFAULT '{"tier1": 1.3, "tier2": 1.1, "tier3": 1.0}'::jsonb,
  urgency_multiplier_normal numeric DEFAULT 1.0,
  urgency_multiplier_urgent numeric DEFAULT 1.5,
  urgency_multiplier_critical numeric DEFAULT 2.0,
  demand_factor_base numeric DEFAULT 1.0,
  min_price numeric DEFAULT 20,
  max_price numeric DEFAULT 500,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Lead pricing history
CREATE TABLE IF NOT EXISTS public.lead_price_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.leads(id) NOT NULL,
  calculated_price numeric NOT NULL,
  base_price numeric NOT NULL,
  intent_score integer,
  intent_multiplier numeric,
  geography_tier text,
  geography_multiplier numeric,
  urgency_level text,
  urgency_multiplier numeric,
  demand_factor numeric,
  final_price numeric NOT NULL,
  pricing_breakdown jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Engine 7: Deal Closure Tracking
CREATE TABLE IF NOT EXISTS public.deal_stages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  display_order integer DEFAULT 0,
  color text DEFAULT '#6366f1',
  is_final boolean DEFAULT false,
  is_won boolean DEFAULT false,
  is_lost boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insert default deal stages
INSERT INTO public.deal_stages (name, display_order, color, is_final, is_won, is_lost) VALUES
  ('New Lead', 0, '#3b82f6', false, false, false),
  ('Contacted', 1, '#8b5cf6', false, false, false),
  ('Qualified', 2, '#06b6d4', false, false, false),
  ('Proposal Sent', 3, '#f59e0b', false, false, false),
  ('Negotiation', 4, '#f97316', false, false, false),
  ('Closed Won', 5, '#22c55e', true, true, false),
  ('Closed Lost', 6, '#ef4444', true, false, true)
ON CONFLICT DO NOTHING;

-- Deal tracking table
CREATE TABLE IF NOT EXISTS public.deal_tracking (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.leads(id) NOT NULL,
  seller_id uuid REFERENCES public.seller_profiles(id) NOT NULL,
  current_stage_id uuid REFERENCES public.deal_stages(id),
  deal_value numeric,
  expected_close_date date,
  actual_close_date date,
  probability integer DEFAULT 50,
  notes text,
  lost_reason text,
  competitor_name text,
  next_action text,
  next_action_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Deal stage history
CREATE TABLE IF NOT EXISTS public.deal_stage_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid REFERENCES public.deal_tracking(id) NOT NULL,
  from_stage_id uuid REFERENCES public.deal_stages(id),
  to_stage_id uuid REFERENCES public.deal_stages(id) NOT NULL,
  changed_by uuid REFERENCES public.profiles(id),
  notes text,
  time_in_stage interval,
  created_at timestamptz DEFAULT now()
);

-- Deal activities
CREATE TABLE IF NOT EXISTS public.deal_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid REFERENCES public.deal_tracking(id) NOT NULL,
  activity_type text NOT NULL,
  description text,
  outcome text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.lead_pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;

-- Lead Pricing Config policies
CREATE POLICY "Admins can manage pricing config" ON public.lead_pricing_config
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active pricing config" ON public.lead_pricing_config
  FOR SELECT USING (is_active = true);

-- Lead Price History policies
CREATE POLICY "Admins can manage price history" ON public.lead_price_history
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Sellers can view own lead prices" ON public.lead_price_history
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM leads l
    JOIN seller_profiles sp ON sp.id = l.seller_id
    WHERE l.id = lead_price_history.lead_id AND sp.user_id = auth.uid()
  ));

-- Deal Stages policies
CREATE POLICY "Anyone can view deal stages" ON public.deal_stages
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage deal stages" ON public.deal_stages
  FOR ALL USING (is_admin(auth.uid()));

-- Deal Tracking policies
CREATE POLICY "Sellers can manage own deals" ON public.deal_tracking
  FOR ALL USING (EXISTS (
    SELECT 1 FROM seller_profiles WHERE id = deal_tracking.seller_id AND user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all deals" ON public.deal_tracking
  FOR ALL USING (is_admin(auth.uid()));

-- Deal Stage History policies
CREATE POLICY "Sellers can view own deal history" ON public.deal_stage_history
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM deal_tracking dt
    JOIN seller_profiles sp ON sp.id = dt.seller_id
    WHERE dt.id = deal_stage_history.deal_id AND sp.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all deal history" ON public.deal_stage_history
  FOR ALL USING (is_admin(auth.uid()));

-- Deal Activities policies
CREATE POLICY "Sellers can manage own deal activities" ON public.deal_activities
  FOR ALL USING (EXISTS (
    SELECT 1 FROM deal_tracking dt
    JOIN seller_profiles sp ON sp.id = dt.seller_id
    WHERE dt.id = deal_activities.deal_id AND sp.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all deal activities" ON public.deal_activities
  FOR ALL USING (is_admin(auth.uid()));

-- Function to calculate lead price
CREATE OR REPLACE FUNCTION public.calculate_lead_price(
  p_lead_id uuid,
  p_intent_score integer DEFAULT 50,
  p_geography_tier text DEFAULT 'tier2',
  p_urgency text DEFAULT 'normal'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
  v_config RECORD;
  v_base_price numeric;
  v_intent_multiplier numeric;
  v_geography_multiplier numeric;
  v_urgency_multiplier numeric;
  v_demand_factor numeric;
  v_final_price numeric;
  v_seller_demand integer;
BEGIN
  -- Get lead and product info
  SELECT l.*, p.category_id INTO v_lead
  FROM leads l
  LEFT JOIN products p ON p.id = l.product_id
  WHERE l.id = p_lead_id;
  
  IF v_lead IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
  END IF;
  
  -- Get pricing config (category-specific or default)
  SELECT * INTO v_config
  FROM lead_pricing_config
  WHERE (category_id = v_lead.category_id OR category_id IS NULL) AND is_active = true
  ORDER BY category_id NULLS LAST
  LIMIT 1;
  
  IF v_config IS NULL THEN
    v_config := ROW(
      NULL, NULL, 50, 0.8, 1.0, 1.5,
      '{"tier1": 1.3, "tier2": 1.1, "tier3": 1.0}'::jsonb,
      1.0, 1.5, 2.0, 1.0, 20, 500, true, now(), now()
    );
  END IF;
  
  v_base_price := v_config.base_price;
  
  -- Intent multiplier
  v_intent_multiplier := CASE
    WHEN p_intent_score >= 70 THEN v_config.intent_multiplier_high
    WHEN p_intent_score >= 30 THEN v_config.intent_multiplier_medium
    ELSE v_config.intent_multiplier_low
  END;
  
  -- Geography multiplier
  v_geography_multiplier := COALESCE(
    (v_config.geography_premium->>p_geography_tier)::numeric,
    1.0
  );
  
  -- Urgency multiplier
  v_urgency_multiplier := CASE p_urgency
    WHEN 'critical' THEN v_config.urgency_multiplier_critical
    WHEN 'urgent' THEN v_config.urgency_multiplier_urgent
    ELSE v_config.urgency_multiplier_normal
  END;
  
  -- Demand factor based on seller demand in category
  SELECT COUNT(*) INTO v_seller_demand
  FROM leads
  WHERE product_id IN (SELECT id FROM products WHERE category_id = v_lead.category_id)
    AND created_at > now() - interval '7 days';
  
  v_demand_factor := CASE
    WHEN v_seller_demand > 100 THEN 1.3
    WHEN v_seller_demand > 50 THEN 1.15
    WHEN v_seller_demand > 20 THEN 1.0
    ELSE 0.9
  END;
  
  -- Calculate final price
  v_final_price := v_base_price * v_intent_multiplier * v_geography_multiplier * v_urgency_multiplier * v_demand_factor;
  
  -- Apply min/max bounds
  v_final_price := GREATEST(v_config.min_price, LEAST(v_config.max_price, v_final_price));
  
  -- Store pricing history
  INSERT INTO lead_price_history (
    lead_id, calculated_price, base_price, intent_score, intent_multiplier,
    geography_tier, geography_multiplier, urgency_level, urgency_multiplier,
    demand_factor, final_price, pricing_breakdown
  ) VALUES (
    p_lead_id, v_final_price, v_base_price, p_intent_score, v_intent_multiplier,
    p_geography_tier, v_geography_multiplier, p_urgency, v_urgency_multiplier,
    v_demand_factor, v_final_price,
    jsonb_build_object(
      'base', v_base_price,
      'intent', jsonb_build_object('score', p_intent_score, 'multiplier', v_intent_multiplier),
      'geography', jsonb_build_object('tier', p_geography_tier, 'multiplier', v_geography_multiplier),
      'urgency', jsonb_build_object('level', p_urgency, 'multiplier', v_urgency_multiplier),
      'demand', v_demand_factor
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'final_price', v_final_price,
    'base_price', v_base_price,
    'multipliers', jsonb_build_object(
      'intent', v_intent_multiplier,
      'geography', v_geography_multiplier,
      'urgency', v_urgency_multiplier,
      'demand', v_demand_factor
    ),
    'expected_conversion', CASE
      WHEN p_intent_score >= 70 THEN 0.35
      WHEN p_intent_score >= 50 THEN 0.20
      WHEN p_intent_score >= 30 THEN 0.10
      ELSE 0.05
    END
  );
END;
$$;

-- Function to update deal stage
CREATE OR REPLACE FUNCTION public.update_deal_stage(
  p_deal_id uuid,
  p_new_stage_id uuid,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal RECORD;
  v_old_stage_id uuid;
  v_time_in_stage interval;
  v_new_stage RECORD;
BEGIN
  SELECT * INTO v_deal FROM deal_tracking WHERE id = p_deal_id;
  
  IF v_deal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
  END IF;
  
  v_old_stage_id := v_deal.current_stage_id;
  
  -- Calculate time in previous stage
  SELECT updated_at INTO v_time_in_stage FROM deal_tracking WHERE id = p_deal_id;
  v_time_in_stage := now() - v_time_in_stage;
  
  -- Get new stage info
  SELECT * INTO v_new_stage FROM deal_stages WHERE id = p_new_stage_id;
  
  -- Update deal
  UPDATE deal_tracking SET
    current_stage_id = p_new_stage_id,
    actual_close_date = CASE WHEN v_new_stage.is_final THEN CURRENT_DATE ELSE NULL END,
    probability = CASE 
      WHEN v_new_stage.is_won THEN 100
      WHEN v_new_stage.is_lost THEN 0
      ELSE probability
    END,
    updated_at = now()
  WHERE id = p_deal_id;
  
  -- Record stage history
  INSERT INTO deal_stage_history (deal_id, from_stage_id, to_stage_id, changed_by, notes, time_in_stage)
  VALUES (p_deal_id, v_old_stage_id, p_new_stage_id, auth.uid(), p_notes, v_time_in_stage);
  
  -- Update lead status if deal is closed
  IF v_new_stage.is_won THEN
    UPDATE leads SET status = 'converted', converted_at = now() WHERE id = v_deal.lead_id;
    -- Update seller converted leads count
    UPDATE seller_profiles SET converted_leads = converted_leads + 1 WHERE id = v_deal.seller_id;
  ELSIF v_new_stage.is_lost THEN
    UPDATE leads SET status = 'lost' WHERE id = v_deal.lead_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'deal_id', p_deal_id,
    'from_stage', v_old_stage_id,
    'to_stage', p_new_stage_id,
    'is_closed', v_new_stage.is_final
  );
END;
$$;