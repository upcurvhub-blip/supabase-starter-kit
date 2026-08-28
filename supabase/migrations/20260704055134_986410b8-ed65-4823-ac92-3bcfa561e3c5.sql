DROP POLICY IF EXISTS "Public read marketplace media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload marketplace media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update marketplace media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete marketplace media" ON storage.objects;
DROP POLICY IF EXISTS "Public upload requirement attachments" ON storage.objects;

CREATE POLICY "Public read marketplace media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('product-images','seller-assets','requirement-attachments','media','products','company-logos'));

CREATE POLICY "Authenticated upload marketplace media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('product-images','seller-assets','media','products','company-logos'));

CREATE POLICY "Authenticated update marketplace media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id IN ('product-images','seller-assets','media','products','company-logos'))
WITH CHECK (bucket_id IN ('product-images','seller-assets','media','products','company-logos'));

CREATE POLICY "Authenticated delete marketplace media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id IN ('product-images','seller-assets','media','products','company-logos'));

CREATE POLICY "Public upload requirement attachments"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'requirement-attachments');