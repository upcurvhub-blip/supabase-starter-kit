
-- Attachments column on requirements
ALTER TABLE public.requirements
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_delivery_date date,
  ADD COLUMN IF NOT EXISTS size_spec text;

-- Storage RLS for requirement-attachments (anyone can upload to anon-rfq/* folder; signed reads)
DROP POLICY IF EXISTS "Anyone can upload requirement attachments" ON storage.objects;
CREATE POLICY "Anyone can upload requirement attachments"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'requirement-attachments');

DROP POLICY IF EXISTS "Anyone can read requirement attachments" ON storage.objects;
CREATE POLICY "Anyone can read requirement attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'requirement-attachments');

-- Media bucket policies (authenticated users manage own folder)
DROP POLICY IF EXISTS "Auth users upload media" ON storage.objects;
CREATE POLICY "Auth users upload media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Public read media" ON storage.objects;
CREATE POLICY "Public read media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'media');

DROP POLICY IF EXISTS "Auth users update own media" ON storage.objects;
CREATE POLICY "Auth users update own media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Auth users delete own media" ON storage.objects;
CREATE POLICY "Auth users delete own media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Function: match top sellers for a requirement (ranked by category match, city match, trust)
CREATE OR REPLACE FUNCTION public.match_sellers_for_requirement(p_requirement_id uuid)
RETURNS TABLE (
  seller_id uuid,
  business_name text,
  slug text,
  city text,
  match_score numeric,
  product_count bigint,
  trust_score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category uuid;
  v_city text;
BEGIN
  SELECT r.category_id, COALESCE(r.city, r.location)
    INTO v_category, v_city
  FROM public.requirements r WHERE r.id = p_requirement_id;

  RETURN QUERY
  SELECT
    sp.id,
    COALESCE(sp.business_name, sp.company_name),
    sp.slug,
    sp.city,
    (
      (CASE WHEN EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.seller_id = sp.id AND p.category_id = v_category AND p.is_active = true
      ) THEN 50 ELSE 0 END)
      + (CASE WHEN v_city IS NOT NULL AND lower(sp.city) = lower(v_city) THEN 30 ELSE 0 END)
      + COALESCE(sp.trust_score, 0) * 0.2
    )::numeric AS match_score,
    (SELECT COUNT(*) FROM public.products p WHERE p.seller_id = sp.id AND p.category_id = v_category AND p.is_active = true),
    COALESCE(sp.trust_score, 0)
  FROM public.seller_profiles sp
  WHERE sp.status = 'approved'
    AND (
      EXISTS (SELECT 1 FROM public.products p WHERE p.seller_id = sp.id AND p.category_id = v_category AND p.is_active = true)
      OR lower(sp.city) = lower(COALESCE(v_city, ''))
    )
  ORDER BY match_score DESC
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_sellers_for_requirement(uuid) TO anon, authenticated;

-- Function: get matched requirements for a seller (current user)
CREATE OR REPLACE FUNCTION public.get_matched_requirements_for_seller()
RETURNS TABLE (
  requirement_id uuid,
  title text,
  description text,
  category_id uuid,
  category_name text,
  quantity integer,
  quantity_unit text,
  city text,
  budget_min numeric,
  budget_max numeric,
  preferred_delivery_date date,
  urgency text,
  created_at timestamptz,
  match_score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
  v_seller_city text;
BEGIN
  SELECT sp.id, sp.city INTO v_seller_id, v_seller_city
  FROM public.seller_profiles sp WHERE sp.user_id = auth.uid();

  IF v_seller_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    r.id, r.title, r.description, r.category_id,
    c.name, r.quantity, r.quantity_unit,
    COALESCE(r.city, r.location), r.budget_min, r.budget_max,
    r.preferred_delivery_date, r.urgency, r.created_at,
    (
      (CASE WHEN EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.seller_id = v_seller_id AND p.category_id = r.category_id AND p.is_active = true
      ) THEN 60 ELSE 0 END)
      + (CASE WHEN v_seller_city IS NOT NULL AND lower(COALESCE(r.city, r.location, '')) = lower(v_seller_city) THEN 30 ELSE 0 END)
      + (CASE WHEN r.urgency = 'urgent' THEN 10 ELSE 0 END)
    )::numeric AS match_score
  FROM public.requirements r
  LEFT JOIN public.categories c ON c.id = r.category_id
  WHERE r.status = 'open'
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.seller_id = v_seller_id AND p.category_id = r.category_id AND p.is_active = true
    )
  ORDER BY match_score DESC, r.created_at DESC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_matched_requirements_for_seller() TO authenticated;

-- Allow approved sellers to read open requirements (for matching)
DROP POLICY IF EXISTS "Approved sellers can view open requirements" ON public.requirements;
CREATE POLICY "Approved sellers can view open requirements"
ON public.requirements FOR SELECT
TO authenticated
USING (
  status = 'open' AND EXISTS (
    SELECT 1 FROM public.seller_profiles sp
    WHERE sp.user_id = auth.uid() AND sp.status = 'approved'
  )
);
