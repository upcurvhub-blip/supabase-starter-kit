DROP POLICY IF EXISTS "Approved sellers can view open requirements" ON public.requirements;
DROP POLICY IF EXISTS "Public reqs visible" ON public.requirements;
DROP POLICY IF EXISTS "Buyer views own req" ON public.requirements;
DROP POLICY IF EXISTS "Admins view all requirements" ON public.requirements;
DROP POLICY IF EXISTS "Buyers view own requirements" ON public.requirements;

CREATE POLICY "Admins view all requirements"
ON public.requirements
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Buyers view own requirements"
ON public.requirements
FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id);

CREATE OR REPLACE FUNCTION public.assign_requirement_to_sellers(
  p_requirement_id uuid,
  p_seller_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_req public.requirements%ROWTYPE;
  v_seller_id uuid;
  v_inserted integer := 0;
  v_skipped integer := 0;
  v_has_category_match boolean;
  v_city text;
  v_score numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can assign requirements';
  END IF;

  IF p_seller_ids IS NULL OR array_length(p_seller_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Select at least one seller';
  END IF;

  SELECT * INTO v_req
  FROM public.requirements
  WHERE id = p_requirement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Requirement not found';
  END IF;

  FOREACH v_seller_id IN ARRAY p_seller_ids LOOP
    IF EXISTS (
      SELECT 1 FROM public.seller_profiles sp
      WHERE sp.id = v_seller_id
        AND sp.status = 'approved'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.requirement_id = p_requirement_id
          AND l.seller_id = v_seller_id
      ) THEN
        v_skipped := v_skipped + 1;
      ELSE
        SELECT EXISTS (
          SELECT 1 FROM public.products p
          WHERE p.seller_id = v_seller_id
            AND p.category_id = v_req.category_id
            AND p.is_active = true
        ) INTO v_has_category_match;

        SELECT sp.city INTO v_city
        FROM public.seller_profiles sp
        WHERE sp.id = v_seller_id;

        v_score :=
          (CASE WHEN v_has_category_match THEN 60 ELSE 20 END)
          + (CASE WHEN v_city IS NOT NULL AND lower(v_city) = lower(COALESCE(v_req.city, v_req.location, '')) THEN 25 ELSE 0 END)
          + (CASE WHEN v_req.urgency = 'urgent' THEN 15 ELSE 0 END);

        INSERT INTO public.leads (
          buyer_id,
          guest_name,
          guest_email,
          guest_phone,
          seller_id,
          requirement_id,
          category_id,
          message,
          quantity,
          unit,
          quantity_unit,
          budget,
          status,
          source,
          metadata,
          lead_score,
          response_deadline
        ) VALUES (
          v_req.buyer_id,
          v_req.guest_name,
          v_req.guest_email,
          v_req.guest_phone,
          v_seller_id,
          v_req.id,
          v_req.category_id,
          concat_ws(E'\n',
            'Requirement: ' || v_req.title,
            NULLIF(v_req.description, ''),
            CASE WHEN COALESCE(v_req.city, v_req.location) IS NOT NULL THEN 'City: ' || COALESCE(v_req.city, v_req.location) ELSE NULL END,
            CASE WHEN v_req.size_spec IS NOT NULL THEN 'Size/Spec: ' || v_req.size_spec ELSE NULL END
          ),
          v_req.quantity,
          COALESCE(v_req.unit, v_req.quantity_unit),
          COALESCE(v_req.quantity_unit, v_req.unit),
          COALESCE(v_req.budget_max, v_req.budget_min),
          'new',
          'admin_requirement_assignment',
          jsonb_build_object(
            'title', v_req.title,
            'description', v_req.description,
            'city', COALESCE(v_req.city, v_req.location),
            'state', v_req.state,
            'urgency', v_req.urgency,
            'size_spec', v_req.size_spec,
            'budget_min', v_req.budget_min,
            'budget_max', v_req.budget_max,
            'attachments', v_req.attachments,
            'preferred_delivery_date', v_req.preferred_delivery_date
          ),
          LEAST(v_score, 100),
          now() + interval '48 hours'
        );
        v_inserted := v_inserted + 1;
      END IF;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  UPDATE public.requirements
  SET status = CASE WHEN v_inserted > 0 THEN 'assigned' ELSE status END,
      is_public = false,
      response_count = (SELECT COUNT(*) FROM public.leads l WHERE l.requirement_id = p_requirement_id),
      updated_at = now()
  WHERE id = p_requirement_id;

  RETURN jsonb_build_object(
    'success', true,
    'requirement_id', p_requirement_id,
    'assigned_count', v_inserted,
    'skipped_count', v_skipped
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_matched_requirements_for_seller()
RETURNS TABLE(
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
  created_at timestamp with time zone,
  match_score numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_seller_id uuid;
BEGIN
  SELECT sp.id INTO v_seller_id
  FROM public.seller_profiles sp
  WHERE sp.user_id = auth.uid();

  IF v_seller_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.title,
    r.description,
    r.category_id,
    c.name,
    r.quantity,
    COALESCE(r.quantity_unit, r.unit),
    COALESCE(r.city, r.location),
    r.budget_min,
    r.budget_max,
    r.preferred_delivery_date,
    r.urgency,
    l.created_at,
    COALESCE(l.lead_score, 50)::numeric
  FROM public.leads l
  JOIN public.requirements r ON r.id = l.requirement_id
  LEFT JOIN public.categories c ON c.id = r.category_id
  WHERE l.seller_id = v_seller_id
    AND l.requirement_id IS NOT NULL
    AND l.status IN ('new', 'contacted', 'interested')
  ORDER BY COALESCE(l.lead_score, 50) DESC, l.created_at DESC
  LIMIT 50;
END;
$function$;