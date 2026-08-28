DROP POLICY IF EXISTS "Approved sellers are public" ON public.seller_profiles;

CREATE POLICY "Public can view approved sellers and active product sellers"
ON public.seller_profiles
FOR SELECT
TO public
USING (
  is_approved = true
  OR status = 'approved'
  OR EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.seller_id = seller_profiles.id
      AND p.is_active = true
  )
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);