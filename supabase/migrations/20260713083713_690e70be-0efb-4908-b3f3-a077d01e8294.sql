-- Trust score component columns
ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS kyc_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_time_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deal_success_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feedback_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispute_penalty integer NOT NULL DEFAULT 0;

-- Recompute trust score based on profile completeness + performance
CREATE OR REPLACE FUNCTION public.compute_seller_trust_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  filled integer := 0;
  total integer := 16;
  kyc integer := 0;
  resp integer := 0;
  deal integer := 0;
  feedback integer := 0;
BEGIN
  -- KYC: profile completeness (max 35)
  IF COALESCE(NEW.business_name, '') <> '' THEN filled := filled + 1; END IF;
  IF COALESCE(NEW.about, NEW.description, '') <> '' THEN filled := filled + 1; END IF;
  IF COALESCE(NEW.logo_url, '') <> '' THEN filled := filled + 1; END IF;
  IF COALESCE(NEW.phone, '') <> '' THEN filled := filled + 1; END IF;
  IF COALESCE(NEW.whatsapp, '') <> '' THEN filled := filled + 1; END IF;
  IF COALESCE(NEW.email, '') <> '' THEN filled := filled + 1; END IF;
  IF COALESCE(NEW.address, '') <> '' THEN filled := filled + 1; END IF;
  IF COALESCE(NEW.city, '') <> '' THEN filled := filled + 1; END IF;
  IF COALESCE(NEW.state, '') <> '' THEN filled := filled + 1; END IF;
  IF COALESCE(NEW.pincode, '') <> '' THEN filled := filled + 1; END IF;
  IF COALESCE(NEW.gst_number, NEW.gstin, '') <> '' THEN filled := filled + 1; END IF;
  IF COALESCE(NEW.pan_number, NEW.pan, '') <> '' THEN filled := filled + 1; END IF;
  IF COALESCE(NEW.established_year, NEW.year_established, 0) > 0 THEN filled := filled + 1; END IF;
  IF COALESCE(NEW.website, '') <> '' THEN filled := filled + 1; END IF;
  IF COALESCE(NEW.business_type, '') <> '' THEN filled := filled + 1; END IF;
  IF COALESCE(NEW.employee_count, '') <> '' THEN filled := filled + 1; END IF;

  kyc := round(35.0 * filled / total);

  -- Response score (max 25) from response_rate percentage
  resp := round(25.0 * LEAST(COALESCE(NEW.response_rate, 0), 100) / 100.0);

  -- Deal success (max 20) from converted vs total leads
  IF COALESCE(NEW.total_leads, 0) > 0 THEN
    deal := round(20.0 * LEAST(COALESCE(NEW.converted_leads, 0), NEW.total_leads) / NEW.total_leads);
  END IF;

  -- Feedback (max 20) from avg_rating out of 5
  feedback := round(20.0 * LEAST(COALESCE(NEW.avg_rating, 0), 5) / 5.0);

  NEW.kyc_score := kyc;
  NEW.response_time_score := resp;
  NEW.deal_success_score := deal;
  NEW.feedback_score := feedback;
  NEW.trust_score := GREATEST(0, kyc + resp + deal + feedback - COALESCE(NEW.dispute_penalty, 0));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_trust_score ON public.seller_profiles;
CREATE TRIGGER trg_compute_trust_score
BEFORE INSERT OR UPDATE ON public.seller_profiles
FOR EACH ROW EXECUTE FUNCTION public.compute_seller_trust_score();

-- Backfill existing rows
UPDATE public.seller_profiles SET updated_at = now();