-- Product photos are public catalogue content: allow anyone to read them.
-- Custom design uploads stay private (admin-only) as before.
CREATE POLICY "public read product images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'product-images');