DROP POLICY IF EXISTS "public read product images" ON storage.objects;
CREATE POLICY "public read listed product images" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.product_images pi
    JOIN public.products p ON p.id = pi.product_id AND p.is_active
    WHERE pi.url = 'storage:product-images/' || storage.objects.name
       OR pi.square_url = 'storage:product-images/' || storage.objects.name
  )
);

DROP POLICY IF EXISTS "anyone can upload custom designs" ON storage.objects;
CREATE POLICY "users upload own custom designs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'custom-designs'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
  AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpe?g|webp)$'
);
CREATE POLICY "guests upload custom designs" ON storage.objects
FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'custom-designs'
  AND (storage.foldername(name))[1] = 'guest'
  AND name ~ '^guest/[0-9a-f-]{36}\.(png|jpe?g|webp)$'
);