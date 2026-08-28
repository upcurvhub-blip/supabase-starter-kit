CREATE OR REPLACE FUNCTION public.record_product_view(
  p_product_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_view_id uuid;
BEGIN
  IF p_product_id IS NULL THEN
    RAISE EXCEPTION 'Product is required';
  END IF;

  INSERT INTO public.product_views (
    product_id,
    user_id,
    session_id,
    referrer,
    user_agent,
    view_duration,
    duration_seconds
  )
  VALUES (
    p_product_id,
    p_user_id,
    NULLIF(p_session_id, ''),
    NULLIF(p_referrer, ''),
    NULLIF(p_user_agent, ''),
    0,
    0
  )
  RETURNING id INTO v_view_id;

  UPDATE public.products
  SET view_count = COALESCE(view_count, 0) + 1,
      updated_at = now()
  WHERE id = p_product_id;

  RETURN v_view_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_product_view(uuid, uuid, text, text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_product_view_duration(
  p_view_id uuid,
  p_duration integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_view_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.product_views
  SET view_duration = GREATEST(COALESCE(p_duration, 0), 0),
      duration_seconds = GREATEST(COALESCE(p_duration, 0), 0)
  WHERE id = p_view_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_product_view_duration(uuid, integer) TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.visitor_page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type text NOT NULL,
  page_path text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES public.seller_profiles(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  user_id uuid,
  device_id text,
  session_id text,
  referrer text,
  user_agent text,
  duration_seconds integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.visitor_page_views TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitor_page_views TO authenticated;
GRANT ALL ON public.visitor_page_views TO service_role;

ALTER TABLE public.visitor_page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public visitors can record page views" ON public.visitor_page_views;
CREATE POLICY "Public visitors can record page views"
ON public.visitor_page_views
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Sellers can view own page views" ON public.visitor_page_views;
CREATE POLICY "Sellers can view own page views"
ON public.visitor_page_views
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.seller_profiles sp
    WHERE sp.id = visitor_page_views.seller_id
      AND sp.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.seller_profiles sp ON sp.id = p.seller_id
    WHERE p.id = visitor_page_views.product_id
      AND sp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Sellers can update own page view durations" ON public.visitor_page_views;
CREATE POLICY "Sellers can update own page view durations"
ON public.visitor_page_views
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_visitor_page_views_created_at ON public.visitor_page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_page_views_product_id ON public.visitor_page_views(product_id);
CREATE INDEX IF NOT EXISTS idx_visitor_page_views_seller_id ON public.visitor_page_views(seller_id);
CREATE INDEX IF NOT EXISTS idx_product_views_product_created ON public.product_views(product_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_visitor_page_view(
  p_page_type text,
  p_page_path text DEFAULT NULL,
  p_product_id uuid DEFAULT NULL,
  p_seller_id uuid DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_device_id text DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.visitor_page_views (
    page_type,
    page_path,
    product_id,
    seller_id,
    category_id,
    user_id,
    device_id,
    session_id,
    referrer,
    user_agent,
    metadata
  )
  VALUES (
    COALESCE(NULLIF(p_page_type, ''), 'page'),
    NULLIF(p_page_path, ''),
    p_product_id,
    p_seller_id,
    p_category_id,
    p_user_id,
    NULLIF(p_device_id, ''),
    NULLIF(p_session_id, ''),
    NULLIF(p_referrer, ''),
    NULLIF(p_user_agent, ''),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_visitor_page_view(text, text, uuid, uuid, uuid, uuid, text, text, text, text, jsonb) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_visitor_page_view_duration(
  p_view_id uuid,
  p_duration integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_view_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.visitor_page_views
  SET duration_seconds = GREATEST(COALESCE(p_duration, 0), 0)
  WHERE id = p_view_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_visitor_page_view_duration(uuid, integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sync_product_view_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products p
  SET view_count = COALESCE(v.cnt, 0),
      updated_at = now()
  FROM (
    SELECT product_id, COUNT(*)::integer AS cnt
    FROM public.product_views
    GROUP BY product_id
  ) v
  WHERE p.id = v.product_id;

  UPDATE public.products p
  SET view_count = 0,
      updated_at = now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.product_views pv WHERE pv.product_id = p.id
  )
    AND COALESCE(p.view_count, 0) <> 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_product_view_counts() TO authenticated, service_role;