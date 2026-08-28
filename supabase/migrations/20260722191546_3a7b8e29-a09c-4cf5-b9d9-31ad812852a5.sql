ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_service boolean NOT NULL DEFAULT false;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS related_keywords text[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_categories_is_service ON public.categories(is_service) WHERE is_service = true;