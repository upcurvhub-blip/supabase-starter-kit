
-- View tracking for local landing pages
CREATE TABLE IF NOT EXISTS public.local_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.local_landing_pages(id) ON DELETE CASCADE,
  device_id TEXT,
  session_id TEXT,
  referrer TEXT,
  path TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS local_page_views_page_id_idx ON public.local_page_views(page_id, created_at DESC);
CREATE INDEX IF NOT EXISTS local_page_views_device_idx ON public.local_page_views(device_id);

GRANT SELECT, INSERT ON public.local_page_views TO authenticated;
GRANT SELECT, INSERT ON public.local_page_views TO anon;
GRANT ALL ON public.local_page_views TO service_role;

ALTER TABLE public.local_page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert local page views"
  ON public.local_page_views FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read local page views"
  ON public.local_page_views FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Safe RPC to log a view (avoids any future RLS friction from public)
CREATE OR REPLACE FUNCTION public.record_local_page_view(
  p_page_id UUID,
  p_device_id TEXT,
  p_session_id TEXT,
  p_referrer TEXT,
  p_path TEXT,
  p_user_agent TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.local_page_views(page_id, device_id, session_id, referrer, path, user_agent)
  VALUES (p_page_id, p_device_id, p_session_id, p_referrer, p_path, p_user_agent);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_local_page_view(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- IndexNow key setting used by notify-indexnow edge function
INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'indexnow_key',
  to_jsonb('bt7f2a9c14b6d3f5e08c2b1d940e6f8a3'::text),
  'IndexNow key used to notify Bing/Yandex/Naver of new or updated URLs. Hosted at /<key>.txt.'
)
ON CONFLICT (key) DO NOTHING;
