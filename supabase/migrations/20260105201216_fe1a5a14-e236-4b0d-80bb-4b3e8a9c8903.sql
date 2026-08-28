-- =============================================
-- ENGINE 1: BUYER INTENT INTELLIGENCE
-- Plus: Additional business fields, viewer control
-- =============================================

-- Add more business fields to seller_profiles
ALTER TABLE public.seller_profiles
ADD COLUMN IF NOT EXISTS business_category text,
ADD COLUMN IF NOT EXISTS niches text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS certifications text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS export_countries text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS payment_modes text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS manufacturing_capacity text,
ADD COLUMN IF NOT EXISTS quality_standards text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS brand_names text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS whatsapp text;

-- Add admin setting for viewer data visibility
INSERT INTO public.platform_settings (key, value, description)
VALUES ('enable_viewer_data_for_sellers', '"false"', 'Allow sellers to see visitor data for their products')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- BUYER INTENT SIGNALS TABLE
-- Tracks micro-signals for intent scoring
-- =============================================
CREATE TABLE IF NOT EXISTS public.buyer_intent_signals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  signal_type text NOT NULL, -- 'search', 'product_view', 'rfq_edit', 'call_click', 'whatsapp_click', 'enquiry', 'repeated_search'
  signal_data jsonb DEFAULT '{}', -- Stores context like search query, product_id, duration, etc.
  weight integer DEFAULT 1, -- Signal importance (1-10)
  created_at timestamptz DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_buyer_intent_user ON public.buyer_intent_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_intent_session ON public.buyer_intent_signals(session_id);
CREATE INDEX IF NOT EXISTS idx_buyer_intent_type ON public.buyer_intent_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_buyer_intent_created ON public.buyer_intent_signals(created_at DESC);

-- Enable RLS
ALTER TABLE public.buyer_intent_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own signals"
ON public.buyer_intent_signals FOR INSERT
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can view their own signals"
ON public.buyer_intent_signals FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all signals"
ON public.buyer_intent_signals FOR SELECT
USING (is_admin(auth.uid()));

-- =============================================
-- BUYER INTENT SNAPSHOTS TABLE
-- Stores computed intent scores at intervals
-- =============================================
CREATE TABLE IF NOT EXISTS public.buyer_intent_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  intent_score integer DEFAULT 0 CHECK (intent_score >= 0 AND intent_score <= 100),
  intent_stage text DEFAULT 'discovery' CHECK (intent_stage IN ('discovery', 'comparison', 'purchase')),
  category_interests jsonb DEFAULT '{}', -- {category_id: score}
  product_interests jsonb DEFAULT '{}', -- {product_id: score}
  search_patterns jsonb DEFAULT '{}', -- Repeated searches, keywords
  decay_factor numeric(3,2) DEFAULT 1.0,
  signals_count integer DEFAULT 0,
  last_signal_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique constraint for user/session combo
CREATE UNIQUE INDEX IF NOT EXISTS idx_buyer_intent_snapshot_user ON public.buyer_intent_snapshots(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_buyer_intent_snapshot_session ON public.buyer_intent_snapshots(session_id);

-- Enable RLS
ALTER TABLE public.buyer_intent_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own snapshots"
ON public.buyer_intent_snapshots FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all snapshots"
ON public.buyer_intent_snapshots FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "System can upsert snapshots"
ON public.buyer_intent_snapshots FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update snapshots"
ON public.buyer_intent_snapshots FOR UPDATE
USING (true);

-- =============================================
-- INTENT SCORE CALCULATION FUNCTION
-- Computes intent_score with decay for older signals
-- =============================================
CREATE OR REPLACE FUNCTION public.calculate_buyer_intent(p_user_id uuid, p_session_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score integer := 0;
  v_stage text := 'discovery';
  v_signals_count integer := 0;
  v_last_signal_at timestamptz;
  v_category_interests jsonb := '{}';
  v_product_interests jsonb := '{}';
  v_signal RECORD;
  v_decay_factor numeric;
  v_signal_score integer;
  v_hours_ago numeric;
BEGIN
  -- Loop through signals from last 30 days
  FOR v_signal IN (
    SELECT *
    FROM buyer_intent_signals
    WHERE (user_id = p_user_id OR (user_id IS NULL AND session_id = p_session_id))
      AND created_at > now() - interval '30 days'
    ORDER BY created_at DESC
    LIMIT 500
  ) LOOP
    v_signals_count := v_signals_count + 1;
    
    IF v_last_signal_at IS NULL THEN
      v_last_signal_at := v_signal.created_at;
    END IF;
    
    -- Calculate decay: signals lose value over time (half-life = 48 hours)
    v_hours_ago := EXTRACT(EPOCH FROM (now() - v_signal.created_at)) / 3600;
    v_decay_factor := POWER(0.5, v_hours_ago / 48);
    
    -- Base score by signal type
    v_signal_score := CASE v_signal.signal_type
      WHEN 'enquiry' THEN 25
      WHEN 'call_click' THEN 20
      WHEN 'whatsapp_click' THEN 18
      WHEN 'rfq_edit' THEN 15
      WHEN 'product_view' THEN 
        CASE WHEN (v_signal.signal_data->>'duration')::int > 60 THEN 10
             WHEN (v_signal.signal_data->>'duration')::int > 30 THEN 6
             ELSE 3 END
      WHEN 'repeated_search' THEN 8
      WHEN 'search' THEN 2
      ELSE 1
    END;
    
    v_score := v_score + (v_signal_score * v_signal.weight * v_decay_factor)::integer;
    
    -- Track category/product interests
    IF v_signal.signal_data->>'category_id' IS NOT NULL THEN
      v_category_interests := jsonb_set(
        v_category_interests,
        ARRAY[v_signal.signal_data->>'category_id'],
        to_jsonb(COALESCE((v_category_interests->(v_signal.signal_data->>'category_id'))::integer, 0) + v_signal_score)
      );
    END IF;
    
    IF v_signal.signal_data->>'product_id' IS NOT NULL THEN
      v_product_interests := jsonb_set(
        v_product_interests,
        ARRAY[v_signal.signal_data->>'product_id'],
        to_jsonb(COALESCE((v_product_interests->(v_signal.signal_data->>'product_id'))::integer, 0) + v_signal_score)
      );
    END IF;
  END LOOP;
  
  -- Cap score at 100
  v_score := LEAST(v_score, 100);
  
  -- Determine intent stage based on score
  v_stage := CASE
    WHEN v_score >= 70 THEN 'purchase'
    WHEN v_score >= 30 THEN 'comparison'
    ELSE 'discovery'
  END;
  
  -- Upsert snapshot
  INSERT INTO buyer_intent_snapshots (user_id, session_id, intent_score, intent_stage, category_interests, product_interests, signals_count, last_signal_at, updated_at)
  VALUES (p_user_id, p_session_id, v_score, v_stage, v_category_interests, v_product_interests, v_signals_count, v_last_signal_at, now())
  ON CONFLICT (user_id) WHERE user_id IS NOT NULL
  DO UPDATE SET
    intent_score = EXCLUDED.intent_score,
    intent_stage = EXCLUDED.intent_stage,
    category_interests = EXCLUDED.category_interests,
    product_interests = EXCLUDED.product_interests,
    signals_count = EXCLUDED.signals_count,
    last_signal_at = EXCLUDED.last_signal_at,
    updated_at = now();
  
  RETURN jsonb_build_object(
    'score', v_score,
    'stage', v_stage,
    'signals_count', v_signals_count,
    'category_interests', v_category_interests,
    'product_interests', v_product_interests
  );
END;
$$;

-- Add RLS policy for product_views update (needed for fixing anonymous bug)
CREATE POLICY "Anyone can update their session views"
ON public.product_views FOR UPDATE
USING (session_id IS NOT NULL AND user_id IS NULL);

-- Enable realtime for intent tables
ALTER PUBLICATION supabase_realtime ADD TABLE buyer_intent_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE buyer_intent_snapshots;