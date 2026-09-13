INSERT INTO public.product_images (product_id, url, square_url, alt, sort_order)
SELECT p.id, '/images/products/heavyweight-tee.jpg', '/images/products/heavyweight-tee.jpg', 'Heavyweight Tee', 0 FROM public.products p WHERE p.slug = 'heavyweight-tee';
INSERT INTO public.product_images (product_id, url, square_url, alt, sort_order)
SELECT p.id, '/images/products/heavyweight-tee-back.jpg', '/images/products/heavyweight-tee-back.jpg', 'Heavyweight Tee — dos', 1 FROM public.products p WHERE p.slug = 'heavyweight-tee';
INSERT INTO public.product_images (product_id, url, square_url, alt, sort_order)
SELECT p.id, '/images/products/heavyweight-tee-fabric.jpg', '/images/products/heavyweight-tee-fabric.jpg', 'Heavyweight Tee — tissu', 2 FROM public.products p WHERE p.slug = 'heavyweight-tee';
INSERT INTO public.product_images (product_id, url, square_url, alt, sort_order)
SELECT p.id, '/images/products/' || p.slug || '.jpg', '/images/products/' || p.slug || '.jpg', p.name, 0
FROM public.products p
WHERE p.slug IN ('oversized-wash-tee','boxy-hoodie','cargo-pants-09','fog-sweatshirt','fallen-cap');