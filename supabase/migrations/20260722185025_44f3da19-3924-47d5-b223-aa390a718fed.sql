-- Extend seo_metadata with prerender-friendly fields
ALTER TABLE public.seo_metadata
  ADD COLUMN IF NOT EXISTS h1 text,
  ADD COLUMN IF NOT EXISTS intro_html text,
  ADD COLUMN IF NOT EXISTS content_outline jsonb;

-- Image alt text
ALTER TABLE public.product_images
  ADD COLUMN IF NOT EXISTS alt_text text;

-- Ensure pg_net for HTTP callouts from triggers/cron
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Trigger: auto-run on-product-publish when a product is inserted or key SEO fields change
CREATE OR REPLACE FUNCTION public.trigger_on_product_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
BEGIN
  -- Only for active products
  IF COALESCE(NEW.is_active, true) = false THEN
    RETURN NEW;
  END IF;

  v_url := 'https://wjtxyoaqtxsfbtrzsimb.supabase.co/functions/v1/on-product-publish';

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('product_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_seo_autofill ON public.products;
CREATE TRIGGER products_seo_autofill
AFTER INSERT OR UPDATE OF name, description, short_description, category_id, price_min, price_max, images, primary_image_url, brand
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.trigger_on_product_publish();