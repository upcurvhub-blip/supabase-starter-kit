GRANT INSERT ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.visitor_devices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitor_devices TO authenticated;
GRANT ALL ON public.visitor_devices TO service_role;

GRANT INSERT ON public.product_views TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_views TO authenticated;
GRANT ALL ON public.product_views TO service_role;

GRANT INSERT ON public.buyer_intent_signals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_intent_signals TO authenticated;
GRANT ALL ON public.buyer_intent_signals TO service_role;

GRANT INSERT ON public.intent_scores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intent_scores TO authenticated;
GRANT ALL ON public.intent_scores TO service_role;

DROP POLICY IF EXISTS "Anyone can submit lead" ON public.leads;
DROP POLICY IF EXISTS "Public visitors can submit leads" ON public.leads;
CREATE POLICY "Public visitors can submit leads"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can insert visitor device" ON public.visitor_devices;
DROP POLICY IF EXISTS "Public visitors can insert consented device" ON public.visitor_devices;
CREATE POLICY "Public visitors can insert consented device"
ON public.visitor_devices
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update visitor device" ON public.visitor_devices;
DROP POLICY IF EXISTS "Public visitors can update consented device" ON public.visitor_devices;
CREATE POLICY "Public visitors can update consented device"
ON public.visitor_devices
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can record view" ON public.product_views;
DROP POLICY IF EXISTS "Public visitors can record product views" ON public.product_views;
CREATE POLICY "Public visitors can record product views"
ON public.product_views
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone records intent" ON public.buyer_intent_signals;
DROP POLICY IF EXISTS "Public visitors can record buyer intent" ON public.buyer_intent_signals;
CREATE POLICY "Public visitors can record buyer intent"
ON public.buyer_intent_signals
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Public visitors can insert intent scores" ON public.intent_scores;
CREATE POLICY "Public visitors can insert intent scores"
ON public.intent_scores
FOR INSERT
TO anon, authenticated
WITH CHECK (true);