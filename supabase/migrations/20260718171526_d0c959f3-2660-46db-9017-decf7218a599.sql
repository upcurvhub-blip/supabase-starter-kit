
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS follow_up_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS follow_up_notes text,
  ADD COLUMN IF NOT EXISTS follow_up_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS follow_up_completed_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_leads_follow_up_at ON public.leads(follow_up_at) WHERE follow_up_done = false AND follow_up_at IS NOT NULL;

DROP TRIGGER IF EXISTS trg_compute_seller_trust_score ON public.seller_profiles;
CREATE TRIGGER trg_compute_seller_trust_score
BEFORE INSERT OR UPDATE ON public.seller_profiles
FOR EACH ROW EXECUTE FUNCTION public.compute_seller_trust_score();

-- Recompute existing seller trust scores by touching each row
UPDATE public.seller_profiles SET updated_at = now();
