GRANT SELECT, INSERT, UPDATE ON public.visitor_devices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitor_devices TO authenticated;
GRANT ALL ON public.visitor_devices TO service_role;