GRANT SELECT ON public.ads TO anon, authenticated;
GRANT ALL ON public.ads TO service_role;
GRANT INSERT ON public.ad_events TO anon, authenticated;
GRANT SELECT ON public.ad_events TO authenticated;
GRANT ALL ON public.ad_events TO service_role;