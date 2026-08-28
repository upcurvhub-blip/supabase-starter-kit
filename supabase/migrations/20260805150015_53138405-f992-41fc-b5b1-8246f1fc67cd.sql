ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS informed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS informed_at timestamptz,
  ADD COLUMN IF NOT EXISTS informed_by uuid;