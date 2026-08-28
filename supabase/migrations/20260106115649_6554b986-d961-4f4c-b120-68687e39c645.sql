-- Add slug column for seller profiles
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS slug text;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS seller_profiles_slug_key ON seller_profiles(slug) WHERE slug IS NOT NULL;