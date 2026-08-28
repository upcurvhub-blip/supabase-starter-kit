-- Ensure public (anonymous) users can submit enquiries into leads
GRANT INSERT ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

-- Make sure guest fields are populated so seller/admin never see "anonymous"
-- (INSERT policy already allows anyone; keep it explicit and permissive)
DROP POLICY IF EXISTS "Anyone can submit lead" ON public.leads;
CREATE POLICY "Anyone can submit lead"
  ON public.leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);