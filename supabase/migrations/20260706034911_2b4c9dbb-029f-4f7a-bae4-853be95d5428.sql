-- Grant Data API access to tables so anon/authenticated can insert enquiries and views
GRANT SELECT, INSERT, UPDATE ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.product_views TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_views TO authenticated;
GRANT ALL ON public.product_views TO service_role;

GRANT UPDATE (view_count, enquiry_count) ON public.products TO anon;
GRANT UPDATE (view_count, enquiry_count) ON public.products TO authenticated;