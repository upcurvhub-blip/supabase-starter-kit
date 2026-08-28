CREATE TABLE public.product_cta_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  seller_id uuid,
  cta text NOT NULL,
  session_id text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_cta_events_product ON public.product_cta_events (product_id, created_at DESC);
CREATE INDEX idx_product_cta_events_seller ON public.product_cta_events (seller_id, created_at DESC);

GRANT INSERT ON public.product_cta_events TO anon, authenticated;
GRANT SELECT ON public.product_cta_events TO authenticated;
GRANT ALL ON public.product_cta_events TO service_role;

ALTER TABLE public.product_cta_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a cta event"
ON public.product_cta_events FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Sellers can view their own cta events"
ON public.product_cta_events FOR SELECT TO authenticated
USING (seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()));