-- Add explicit Data API grants for public marketplace tables
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

GRANT SELECT ON public.seller_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_profiles TO authenticated;
GRANT ALL ON public.seller_profiles TO service_role;

GRANT SELECT ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;

GRANT INSERT ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

-- Helper functions prevent recursive RLS checks between products and seller_profiles
CREATE OR REPLACE FUNCTION public.is_seller_profile_owner(_seller_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.seller_profiles sp
    WHERE sp.id = _seller_id
      AND sp.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.seller_has_active_product(_seller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.seller_id = _seller_id
      AND p.is_active = true
  )
$$;

-- Replace recursive policies with function-backed policies
DROP POLICY IF EXISTS "Active products public" ON public.products;
CREATE POLICY "Active products public"
ON public.products
FOR SELECT
USING (
  is_active = true
  OR public.is_seller_profile_owner(seller_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Sellers manage own products" ON public.products;
CREATE POLICY "Sellers manage own products"
ON public.products
FOR ALL
USING (
  public.is_seller_profile_owner(seller_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.is_seller_profile_owner(seller_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Public can view approved sellers and active product sellers" ON public.seller_profiles;
CREATE POLICY "Public can view approved sellers and active product sellers"
ON public.seller_profiles
FOR SELECT
USING (
  is_approved = true
  OR status = 'approved'
  OR public.seller_has_active_product(id)
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Seller/admin update lead" ON public.leads;
CREATE POLICY "Seller/admin update lead"
ON public.leads
FOR UPDATE
USING (
  public.is_seller_profile_owner(seller_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Stakeholders view lead" ON public.leads;
CREATE POLICY "Stakeholders view lead"
ON public.leads
FOR SELECT
USING (
  auth.uid() = buyer_id
  OR public.is_seller_profile_owner(seller_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);