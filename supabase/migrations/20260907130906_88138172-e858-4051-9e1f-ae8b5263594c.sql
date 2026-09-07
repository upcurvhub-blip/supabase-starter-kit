ALTER TABLE public.seller_profiles ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS claim_status text NOT NULL DEFAULT 'claimed',
  ADD COLUMN IF NOT EXISTS created_by_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

UPDATE public.seller_profiles SET claim_status = 'claimed' WHERE user_id IS NOT NULL;

CREATE POLICY "Admins can create seller profiles"
  ON public.seller_profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.seller_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  phone text NOT NULL,
  email text,
  contact_name text,
  message text,
  page_path text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.seller_claims TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_claims TO authenticated;
GRANT ALL ON public.seller_claims TO service_role;

ALTER TABLE public.seller_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a claim" ON public.seller_claims FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff can view claims" ON public.seller_claims FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales_agent'));
CREATE POLICY "Staff can update claims" ON public.seller_claims FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales_agent'));
CREATE POLICY "Admins can delete claims" ON public.seller_claims FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS seller_claims_seller_idx ON public.seller_claims(seller_id);
CREATE INDEX IF NOT EXISTS seller_claims_status_idx ON public.seller_claims(status);

CREATE TRIGGER update_seller_claims_updated_at BEFORE UPDATE ON public.seller_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();