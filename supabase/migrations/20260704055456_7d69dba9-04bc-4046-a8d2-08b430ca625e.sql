ALTER TABLE public.requirements
  ALTER COLUMN status SET DEFAULT 'pending_admin',
  ALTER COLUMN is_public SET DEFAULT false;

UPDATE public.requirements
SET status = 'pending_admin',
    is_public = false,
    updated_at = now()
WHERE COALESCE(is_public, true) = true
   OR status IN ('open', 'new');

DROP POLICY IF EXISTS "Anyone can post req" ON public.requirements;
DROP POLICY IF EXISTS "Anyone can post requirements" ON public.requirements;

CREATE POLICY "Public buyers can post admin reviewed requirements"
ON public.requirements
FOR INSERT
TO anon, authenticated
WITH CHECK (
  COALESCE(status, 'pending_admin') = 'pending_admin'
  AND COALESCE(is_public, false) = false
);