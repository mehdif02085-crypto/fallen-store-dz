CREATE POLICY "admins manage product images" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "anyone can upload custom designs" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'custom-designs');

CREATE POLICY "admins read custom designs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'custom-designs' AND public.is_admin());

CREATE POLICY "admins delete custom designs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'custom-designs' AND public.is_admin());