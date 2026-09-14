ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS clothing_size text;

CREATE OR REPLACE FUNCTION public.place_order(p_customer jsonb, p_items jsonb, p_payment_method text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := trim(coalesce(p_customer->>'phone',''));
  v_name text := trim(coalesce(p_customer->>'full_name',''));
  v_wilaya int := nullif(p_customer->>'wilaya_code','')::int;
  v_city text := trim(coalesce(p_customer->>'city',''));
  v_address text := trim(coalesce(p_customer->>'address',''));
  v_notes text := nullif(trim(coalesce(p_customer->>'delivery_notes','')), '');
  v_size text := nullif(trim(coalesce(p_customer->>'clothing_size','')), '');
  v_wilaya_name text;
  v_fee int;
  v_threshold int;
  v_subtotal int := 0;
  v_order_id uuid;
  v_number text;
  v_item jsonb;
  v_qty int;
  v_variant record;
  v_product record;
  v_settings record;
  v_price int;
  v_design_id uuid;
  v_design_price int;
  v_line int;
  v_count int := 0;
BEGIN
  IF v_name = '' OR length(v_name) > 120 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
  IF v_phone !~ '^(0(5|6|7)[0-9]{8})$' THEN RAISE EXCEPTION 'INVALID_PHONE'; END IF;
  IF v_wilaya IS NULL THEN RAISE EXCEPTION 'INVALID_WILAYA'; END IF;
  IF v_city = '' OR length(v_city) > 120 THEN RAISE EXCEPTION 'INVALID_CITY'; END IF;
  IF length(v_address) < 5 OR length(v_address) > 400 THEN RAISE EXCEPTION 'INVALID_ADDRESS'; END IF;
  IF v_size IS NULL OR length(v_size) > 20 THEN RAISE EXCEPTION 'INVALID_SIZE'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'EMPTY_CART'; END IF;

  SELECT name_fr, delivery_fee_da INTO v_wilaya_name, v_fee FROM public.wilayas WHERE code = v_wilaya;
  IF v_wilaya_name IS NULL THEN RAISE EXCEPTION 'INVALID_WILAYA'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE code = p_payment_method AND is_enabled) THEN
    RAISE EXCEPTION 'PAYMENT_METHOD_UNAVAILABLE';
  END IF;
  IF p_payment_method <> 'cod' THEN RAISE EXCEPTION 'PAYMENT_METHOD_NOT_CONFIGURED'; END IF;

  SELECT * INTO v_settings FROM public.custom_shirt_settings WHERE id;

  v_number := 'FS-' || to_char(now(), 'YYMMDD') || '-' || lpad((floor(random()*100000))::int::text, 5, '0');

  INSERT INTO public.orders (order_number, user_id, customer_name, phone, wilaya_code, wilaya_name, city, address,
    delivery_notes, clothing_size, payment_method, payment_status, status, subtotal_da, delivery_fee_da, total_da)
  VALUES (v_number, auth.uid(), v_name, v_phone, v_wilaya, v_wilaya_name, v_city, v_address, v_notes, v_size,
    p_payment_method, 'unpaid', 'pending', 0, 0, 0)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := coalesce((v_item->>'quantity')::int, 0);
    IF v_qty < 1 OR v_qty > 20 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    v_count := v_count + 1;
    IF v_count > 40 THEN RAISE EXCEPTION 'TOO_MANY_ITEMS'; END IF;

    IF (v_item->>'kind') = 'custom' THEN
      IF NOT v_settings.is_enabled THEN RAISE EXCEPTION 'CUSTOM_DISABLED'; END IF;
      v_design_price := v_settings.base_price_da
        + CASE WHEN nullif(v_item->>'design_image_url','') IS NOT NULL THEN v_settings.image_print_surcharge_da ELSE 0 END
        + CASE WHEN nullif(v_item->>'custom_text','') IS NOT NULL THEN v_settings.text_print_surcharge_da ELSE 0 END;

      INSERT INTO public.custom_designs (shirt_model, shirt_color_name, shirt_color_hex, size,
        design_image_url, custom_text, text_color, position, price_da)
      VALUES (
        coalesce(nullif(v_item->>'shirt_model',''), 'Heavyweight Tee'),
        coalesce(nullif(v_item->>'shirt_color_name',''), 'Noir'),
        coalesce(nullif(v_item->>'shirt_color_hex',''), '#0a0a0b'),
        coalesce(nullif(v_item->>'size',''), 'M'),
        left(nullif(v_item->>'design_image_url',''), 600),
        left(nullif(v_item->>'custom_text',''), 60),
        nullif(v_item->>'text_color',''),
        coalesce(nullif(v_item->>'position',''), 'center'),
        v_design_price)
      RETURNING id INTO v_design_id;

      v_line := v_design_price * v_qty;
      v_subtotal := v_subtotal + v_line;
      INSERT INTO public.order_items (order_id, custom_design_id, product_name, size, color_name, quantity, unit_price_da, line_total_da)
      VALUES (v_order_id, v_design_id, 'Custom Shirt — ' || coalesce(nullif(v_item->>'shirt_model',''), 'Heavyweight Tee'),
        coalesce(nullif(v_item->>'size',''), 'M'), coalesce(nullif(v_item->>'shirt_color_name',''), 'Noir'),
        v_qty, v_design_price, v_line);
    ELSE
      SELECT * INTO v_variant FROM public.product_variants WHERE id = (v_item->>'variant_id')::uuid;
      IF v_variant IS NULL THEN RAISE EXCEPTION 'VARIANT_NOT_FOUND'; END IF;
      SELECT * INTO v_product FROM public.products WHERE id = v_variant.product_id AND is_active;
      IF v_product IS NULL THEN RAISE EXCEPTION 'PRODUCT_UNAVAILABLE'; END IF;
      IF v_variant.stock < v_qty THEN RAISE EXCEPTION 'OUT_OF_STOCK:%', v_product.name; END IF;

      v_price := coalesce(v_product.sale_price_da, v_product.price_da);
      v_line := v_price * v_qty;
      v_subtotal := v_subtotal + v_line;

      UPDATE public.product_variants SET stock = stock - v_qty WHERE id = v_variant.id;

      INSERT INTO public.order_items (order_id, product_id, variant_id, product_name, size, color_name, quantity, unit_price_da, line_total_da)
      VALUES (v_order_id, v_product.id, v_variant.id, v_product.name, v_variant.size, v_variant.color_name, v_qty, v_price, v_line);
    END IF;
  END LOOP;

  SELECT free_shipping_threshold_da INTO v_threshold FROM public.delivery_settings WHERE id;
  IF v_threshold IS NOT NULL AND v_subtotal >= v_threshold THEN v_fee := 0; END IF;

  UPDATE public.orders SET subtotal_da = v_subtotal, delivery_fee_da = v_fee, total_da = v_subtotal + v_fee
  WHERE id = v_order_id;

  INSERT INTO public.payments (order_id, provider, status, amount_da)
  VALUES (v_order_id, p_payment_method, 'unpaid', v_subtotal + v_fee);

  RETURN jsonb_build_object('order_number', v_number, 'total_da', v_subtotal + v_fee,
    'subtotal_da', v_subtotal, 'delivery_fee_da', v_fee, 'phone', v_phone);
END; $$;

REVOKE ALL ON FUNCTION public.place_order(jsonb, jsonb, text) FROM public;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb, jsonb, text) TO anon, authenticated, service_role;