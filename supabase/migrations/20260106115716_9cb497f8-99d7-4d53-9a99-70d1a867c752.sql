-- Create function to generate unique slug for sellers
CREATE OR REPLACE FUNCTION public.generate_seller_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  new_slug text;
  counter integer := 0;
BEGIN
  -- Only generate if slug is null or business name changed on update
  IF TG_OP = 'UPDATE' AND OLD.business_name = NEW.business_name AND NEW.slug IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'INSERT' AND NEW.slug IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Generate base slug from business name
  base_slug := lower(regexp_replace(NEW.business_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := regexp_replace(base_slug, '^-|-$', '', 'g');
  
  new_slug := base_slug;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM seller_profiles WHERE slug = new_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := new_slug;
  RETURN NEW;
END;
$$;

-- Create trigger for auto-generating seller slugs
DROP TRIGGER IF EXISTS generate_seller_slug_trigger ON seller_profiles;

CREATE TRIGGER generate_seller_slug_trigger
  BEFORE INSERT OR UPDATE ON seller_profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_seller_slug();

-- Update existing sellers to have slugs
UPDATE seller_profiles SET business_name = business_name WHERE slug IS NULL;