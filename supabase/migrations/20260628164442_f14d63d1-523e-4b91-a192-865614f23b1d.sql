
-- lead_status enum additions
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'interested';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'converted';

-- leads enhancements
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_score numeric;

-- Re-point buyer_id FK to profiles so PostgREST can embed buyer info
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_buyer_id_fkey;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_buyer_id_fkey
  FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- subscription_plans.slug nullable
ALTER TABLE public.subscription_plans ALTER COLUMN slug DROP NOT NULL;

-- deal_stages
CREATE TABLE IF NOT EXISTS public.deal_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#3b82f6',
  is_won boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  is_final boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.deal_stages TO anon, authenticated;
GRANT ALL ON public.deal_stages TO service_role;
ALTER TABLE public.deal_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone read deal stages" ON public.deal_stages FOR SELECT USING (true);
CREATE POLICY "Admins manage deal stages" ON public.deal_stages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Default stages
INSERT INTO public.deal_stages (name, display_order, color, is_won, is_lost, is_final)
SELECT * FROM (VALUES
  ('Prospect', 1, '#3b82f6', false, false, false),
  ('Qualified', 2, '#8b5cf6', false, false, false),
  ('Proposal', 3, '#f59e0b', false, false, false),
  ('Negotiation', 4, '#ec4899', false, false, false),
  ('Won', 5, '#22c55e', true, false, true),
  ('Lost', 6, '#ef4444', false, true, true)
) AS v(name, display_order, color, is_won, is_lost, is_final)
WHERE NOT EXISTS (SELECT 1 FROM public.deal_stages);

-- deal_tracking
CREATE TABLE IF NOT EXISTS public.deal_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  current_stage_id uuid REFERENCES public.deal_stages(id),
  deal_value numeric NOT NULL DEFAULT 0,
  probability integer NOT NULL DEFAULT 50,
  next_action_date timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_tracking TO authenticated;
GRANT ALL ON public.deal_tracking TO service_role;
ALTER TABLE public.deal_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers manage own deals" ON public.deal_tracking FOR ALL
  USING (EXISTS (SELECT 1 FROM public.seller_profiles sp WHERE sp.id = seller_id AND sp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.seller_profiles sp WHERE sp.id = seller_id AND sp.user_id = auth.uid()));
CREATE POLICY "Admins view all deals" ON public.deal_tracking FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- deal_activities
CREATE TABLE IF NOT EXISTS public.deal_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deal_tracking(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.deal_activities TO authenticated;
GRANT ALL ON public.deal_activities TO service_role;
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers manage own deal activities" ON public.deal_activities FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.deal_tracking dt
    JOIN public.seller_profiles sp ON sp.id = dt.seller_id
    WHERE dt.id = deal_id AND sp.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.deal_tracking dt
    JOIN public.seller_profiles sp ON sp.id = dt.seller_id
    WHERE dt.id = deal_id AND sp.user_id = auth.uid()
  ));

-- update_deal_stage function
CREATE OR REPLACE FUNCTION public.update_deal_stage(p_deal_id uuid, p_new_stage_id uuid, p_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.deal_tracking
  SET current_stage_id = p_new_stage_id, updated_at = now(),
      notes = COALESCE(p_notes, notes)
  WHERE id = p_deal_id;

  INSERT INTO public.deal_activities (deal_id, activity_type, description, created_by)
  VALUES (p_deal_id, 'stage_change', COALESCE(p_notes, 'Stage updated'), auth.uid());

  RETURN jsonb_build_object('success', true, 'deal_id', p_deal_id, 'stage_id', p_new_stage_id);
END;
$$;
