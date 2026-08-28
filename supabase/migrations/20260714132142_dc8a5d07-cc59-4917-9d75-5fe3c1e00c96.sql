
-- Add device_id column to leads for cross-visit identification
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS device_id text;
CREATE INDEX IF NOT EXISTS idx_leads_device_id ON public.leads(device_id);

-- Visitor devices: remember buyer identity across visits
CREATE TABLE IF NOT EXISTS public.visitor_devices (
  device_id text PRIMARY KEY,
  name text,
  phone text,
  email text,
  city text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  enquiry_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.visitor_devices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitor_devices TO authenticated;
GRANT ALL ON public.visitor_devices TO service_role;

ALTER TABLE public.visitor_devices ENABLE ROW LEVEL SECURITY;

-- Anyone can insert/upsert their own device record (device_id is client-generated random)
CREATE POLICY "Anyone can insert visitor device"
  ON public.visitor_devices FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update visitor device"
  ON public.visitor_devices FOR UPDATE
  USING (true) WITH CHECK (true);

-- Admins can view all
CREATE POLICY "Admins can view visitor devices"
  ON public.visitor_devices FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_visitor_devices_updated_at
  BEFORE UPDATE ON public.visitor_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
