CREATE OR REPLACE FUNCTION public.record_service_view(p_service_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_service_id IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.services
  SET view_count = COALESCE(view_count, 0) + 1,
      updated_at = now()
  WHERE id = p_service_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_service_view(uuid) TO anon, authenticated, service_role;