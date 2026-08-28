DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Public read seller assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload seller assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update seller assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete seller assets" ON storage.objects;

CREATE POLICY "Public read product images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Public read seller assets"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'seller-assets');

CREATE POLICY "Authenticated upload seller assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'seller-assets');

CREATE POLICY "Authenticated update seller assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'seller-assets')
WITH CHECK (bucket_id = 'seller-assets');

CREATE POLICY "Authenticated delete seller assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'seller-assets');