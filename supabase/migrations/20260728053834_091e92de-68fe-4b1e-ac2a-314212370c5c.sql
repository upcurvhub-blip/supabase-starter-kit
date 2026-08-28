
-- Broadcast a single buyer enquiry to the top N verified sellers in the same category (+city preference).
CREATE OR REPLACE FUNCTION public.broadcast_rfq_to_top_sellers(
  p_product_id uuid,
  p_guest_name text,
  p_guest_phone text,
  p_guest_email text DEFAULT NULL,
  p_buyer_city text DEFAULT NULL,
  p_quantity integer DEFAULT NULL,
  p_unit text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_device_id text DEFAULT NULL,
  p_max_sellers integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_id uuid;
  v_product_name text;
  v_origin_seller uuid;
  v_inserted integer := 0;
  v_seller_ids uuid[] := ARRAY[]::uuid[];
  v_seller record;
BEGIN
  IF p_product_id IS NULL THEN
    RAISE EXCEPTION 'Product is required';
  END IF;
  IF COALESCE(btrim(p_guest_name), '') = '' OR COALESCE(btrim(p_guest_phone), '') = '' THEN
    RAISE EXCEPTION 'Name and phone are required';
  END IF;

  SELECT category_id, name, seller_id
    INTO v_category_id, v_product_name, v_origin_seller
  FROM public.products
  WHERE id = p_product_id;

  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'Product not found or has no category';
  END IF;

  -- Rank verified/approved sellers with active products in this category.
  -- Same-city sellers score higher; then trust_score.
  FOR v_seller IN
    SELECT sp.id AS seller_id
    FROM public.seller_profiles sp
    WHERE sp.status = 'approved'
      AND EXISTS (
        SELECT 1 FROM public.products p2
        WHERE p2.seller_id = sp.id
          AND p2.category_id = v_category_id
          AND COALESCE(p2.is_active, true) = true
      )
    ORDER BY
      (CASE WHEN p_buyer_city IS NOT NULL AND lower(sp.city) = lower(p_buyer_city) THEN 1 ELSE 0 END) DESC,
      COALESCE(sp.trust_score, 0) DESC,
      COALESCE(sp.avg_rating, 0) DESC
    LIMIT GREATEST(COALESCE(p_max_sellers, 5), 1)
  LOOP
    v_seller_ids := array_append(v_seller_ids, v_seller.seller_id);

    INSERT INTO public.leads (
      buyer_id, device_id,
      guest_name, guest_phone, guest_email,
      seller_id, product_id, category_id,
      message, quantity, unit, quantity_unit,
      status, source, metadata
    ) VALUES (
      NULL, p_device_id,
      p_guest_name, p_guest_phone, p_guest_email,
      v_seller.seller_id,
      CASE WHEN v_seller.seller_id = v_origin_seller THEN p_product_id ELSE NULL END,
      v_category_id,
      COALESCE(
        p_message,
        'RFQ (broadcast): ' || v_product_name ||
        CASE WHEN p_quantity IS NOT NULL THEN E'\nQuantity: ' || p_quantity || ' ' || COALESCE(p_unit, '') ELSE '' END ||
        CASE WHEN p_buyer_city IS NOT NULL THEN E'\nCity: ' || p_buyer_city ELSE '' END
      ),
      p_quantity, p_unit, p_unit,
      'new',
      'multi_supplier_rfq',
      jsonb_build_object(
        'origin_product_id', p_product_id,
        'origin_product_name', v_product_name,
        'buyer_city', p_buyer_city,
        'broadcast', true
      )
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'seller_count', v_inserted,
    'seller_ids', to_jsonb(v_seller_ids)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.broadcast_rfq_to_top_sellers(uuid, text, text, text, text, integer, text, text, text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.broadcast_rfq_to_top_sellers(uuid, text, text, text, text, integer, text, text, text, integer) TO anon, authenticated, service_role;

-- Category price benchmark
CREATE OR REPLACE FUNCTION public.get_category_price_benchmark(
  p_category_id uuid,
  p_city text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'sample_size', COUNT(*),
    'avg_price', ROUND(AVG(p.price)::numeric, 2),
    'min_price', MIN(p.price),
    'max_price', MAX(p.price),
    'median_price', ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY p.price))::numeric, 2),
    'city', p_city
  )
  FROM public.products p
  JOIN public.seller_profiles sp ON sp.id = p.seller_id
  WHERE p.category_id = p_category_id
    AND COALESCE(p.is_active, true) = true
    AND p.price IS NOT NULL
    AND p.price > 0
    AND sp.status = 'approved'
    AND (p_city IS NULL OR lower(sp.city) = lower(p_city));
$$;

REVOKE ALL ON FUNCTION public.get_category_price_benchmark(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_category_price_benchmark(uuid, text) TO anon, authenticated, service_role;
