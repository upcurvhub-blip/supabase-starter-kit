DROP POLICY IF EXISTS "Sellers can update own page view durations" ON public.visitor_page_views;
REVOKE UPDATE ON public.visitor_page_views FROM anon;
REVOKE UPDATE ON public.visitor_page_views FROM authenticated;