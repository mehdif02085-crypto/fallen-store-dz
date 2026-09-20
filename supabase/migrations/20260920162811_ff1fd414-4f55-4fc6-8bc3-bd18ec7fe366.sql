REVOKE ALL ON FUNCTION public.track_order_status_change() FROM anon, authenticated, PUBLIC;

-- place_order v2: idempotency + online payment methods
CREATE OR REPLACE FUNCTION public.place_order(p_customer jsonb, p_items jsonb, p_payment_method text, p_idempotency_key text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text := trim(coalesce(p_customer->>'phone',''));
  v_name text := trim(coalesce(p_customer->>'full_name',''));
  v_wilaya int := nullif(p_customer->>'wilaya_code','')::int;
  v_city text := trim(coalesce(p_customer->>'city',''));
  v_address text := trim(coalesce(p_customer->>'address',''));
  v_notes text := nullif(trim(coalesce(p_customer->>'delivery_notes','')), '');
  v_size text := nullif(trim(coalesce(p_customer->>'clothing_size','')), '');
  v_key text := nullif(trim(coalesce(p_idempotency_key,'')), '');
  v_method record;
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
  v_existing record;
  v_status public.order_status;
  v_pay public.payment_status;
BEGIN
  IF v_key IS NOT NULL THEN
    IF length(v_key) > 100 THEN RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY'; END IF;
    SELECT order_number, total_da, subtotal_da, delivery_fee_da, phone, payment_method
      INTO v_existing FROM public.orders WHERE idempotency_key = v_key;
    IF v_existing.order_number IS NOT NULL THEN
      RETURN jsonb_build_object('order_number', v_existing.order_number, 'total_da', v_existing.total_da,
        'subtotal_da', v_existing.subtotal_da, 'delivery_fee_da', v_existing.delivery_fee_da,
        'phone', v_existing.phone, 'payment_method', v_existing.payment_method, 'duplicate', true);
    END IF;
  END IF;

  IF v_name = '' OR length(v_name) > 120 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
  IF v_phone !~ '^(0(5|6|7)[0-9]{8})$' THEN RAISE EXCEPTION 'INVALID_PHONE'; END IF;
  IF v_wilaya IS NULL THEN RAISE EXCEPTION 'INVALID_WILAYA'; END IF;
  IF v_city = '' OR length(v_city) > 120 THEN RAISE EXCEPTION 'INVALID_CITY'; END IF;
  IF length(v_address) < 5 OR length(v_address) > 400 THEN RAISE EXCEPTION 'INVALID_ADDRESS'; END IF;
  IF v_size IS NULL OR length(v_size) > 20 THEN RAISE EXCEPTION 'INVALID_SIZE'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'EMPTY_CART'; END IF;

  SELECT name_fr, delivery_fee_da INTO v_wilaya_name, v_fee FROM public.wilayas WHERE code = v_wilaya;
  IF v_wilaya_name IS NULL THEN RAISE EXCEPTION 'INVALID_WILAYA'; END IF;

  SELECT * INTO v_method FROM public.payment_methods WHERE code = p_payment_method AND is_enabled;
  IF v_method.code IS NULL THEN RAISE EXCEPTION 'PAYMENT_METHOD_UNAVAILABLE'; END IF;

  IF v_method.provider_key = 'cod' THEN
    v_status := 'pending'; v_pay := 'unpaid';
  ELSE
    v_status := 'payment_pending'; v_pay := 'pending';
  END IF;

  SELECT * INTO v_settings FROM public.custom_shirt_settings WHERE id;

  v_number := 'FS-' || to_char(now(), 'YYMMDD') || '-' || lpad((floor(random()*100000))::int::text, 5, '0');

  INSERT INTO public.orders (order_number, user_id, customer_name, phone, wilaya_code, wilaya_name, city, address,
    delivery_notes, clothing_size, payment_method, payment_status, status, subtotal_da, delivery_fee_da, total_da, idempotency_key)
  VALUES (v_number, auth.uid(), v_name, v_phone, v_wilaya, v_wilaya_name, v_city, v_address, v_notes, v_size,
    p_payment_method, v_pay, v_status, 0, 0, 0, v_key)
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
      SELECT * INTO v_variant FROM public.product_variants WHERE id = (v_item->>'variant_id')::uuid FOR UPDATE;
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
  VALUES (v_order_id, p_payment_method, v_pay, v_subtotal + v_fee);

  INSERT INTO public.order_status_history (order_id, status, payment_status, changed_by, source, note)
  VALUES (v_order_id, v_status, v_pay, auth.uid(), 'checkout', 'Commande créée');

  RETURN jsonb_build_object('order_number', v_number, 'total_da', v_subtotal + v_fee,
    'subtotal_da', v_subtotal, 'delivery_fee_da', v_fee, 'phone', v_phone,
    'payment_method', p_payment_method, 'requires_payment', (v_method.provider_key <> 'cod'), 'duplicate', false);
END; $function$;

REVOKE ALL ON FUNCTION public.place_order(jsonb, jsonb, text) FROM anon, authenticated, PUBLIC;
DROP FUNCTION IF EXISTS public.place_order(jsonb, jsonb, text);
GRANT EXECUTE ON FUNCTION public.place_order(jsonb, jsonb, text, text) TO anon, authenticated, service_role;

-- server-only: attach provider reference / checkout url to a pending payment
CREATE OR REPLACE FUNCTION public.attach_payment_intent(
  p_order_number text, p_provider text, p_provider_ref text, p_checkout_url text, p_mode text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order record;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE order_number = p_order_number;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF v_order.payment_status IN ('paid','refunded') THEN RAISE EXCEPTION 'ALREADY_PAID'; END IF;

  UPDATE public.payments
     SET provider = p_provider, provider_ref = p_provider_ref, checkout_url = p_checkout_url,
         mode = coalesce(p_mode,'test'), status = 'pending', updated_at = now()
   WHERE order_id = v_order.id;

  RETURN jsonb_build_object('order_id', v_order.id, 'amount_da', v_order.total_da);
END; $$;
REVOKE ALL ON FUNCTION public.attach_payment_intent(text, text, text, text, text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_payment_intent(text, text, text, text, text) TO service_role;

-- server-only: apply a verified provider result, idempotently
CREATE OR REPLACE FUNCTION public.confirm_payment(
  p_provider text, p_provider_ref text, p_event_id text, p_result text,
  p_amount_da int DEFAULT NULL, p_payload jsonb DEFAULT NULL, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payment record; v_order record; v_item record; v_new_pay public.payment_status; v_new_status public.order_status;
BEGIN
  IF p_event_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.payment_events (provider, event_id, event_type, payload) VALUES (p_provider, p_event_id, p_result, p_payload);
    EXCEPTION WHEN unique_violation THEN
      RETURN jsonb_build_object('status','duplicate_event');
    END;
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE provider = p_provider AND provider_ref = p_provider_ref FOR UPDATE;
  IF v_payment.id IS NULL THEN RAISE EXCEPTION 'PAYMENT_NOT_FOUND'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = v_payment.order_id FOR UPDATE;

  IF p_amount_da IS NOT NULL AND p_result = 'paid' AND p_amount_da <> v_order.total_da THEN
    UPDATE public.payments SET status='failed', failure_reason='AMOUNT_MISMATCH', updated_at=now() WHERE id=v_payment.id;
    UPDATE public.orders SET payment_status='failed', status='payment_failed' WHERE id=v_order.id;
    RETURN jsonb_build_object('status','amount_mismatch');
  END IF;

  IF v_order.payment_status = 'paid' AND p_result = 'paid' THEN
    RETURN jsonb_build_object('status','already_paid');
  END IF;

  v_new_pay := CASE p_result
    WHEN 'paid' THEN 'paid'::public.payment_status
    WHEN 'failed' THEN 'failed'::public.payment_status
    WHEN 'cancelled' THEN 'cancelled'::public.payment_status
    WHEN 'expired' THEN 'expired'::public.payment_status
    ELSE 'pending'::public.payment_status END;

  v_new_status := CASE p_result
    WHEN 'paid' THEN 'paid'::public.order_status
    WHEN 'failed' THEN 'payment_failed'::public.order_status
    WHEN 'cancelled' THEN 'cancelled'::public.order_status
    WHEN 'expired' THEN 'cancelled'::public.order_status
    ELSE 'payment_pending'::public.order_status END;

  UPDATE public.payments SET status = v_new_pay, failure_reason = p_reason, updated_at = now() WHERE id = v_payment.id;
  UPDATE public.orders SET payment_status = v_new_pay, status = v_new_status WHERE id = v_order.id;

  -- release reserved stock when the payment will never complete
  IF p_result IN ('failed','cancelled','expired') AND v_order.status = 'payment_pending' THEN
    FOR v_item IN SELECT variant_id, quantity FROM public.order_items WHERE order_id = v_order.id AND variant_id IS NOT NULL LOOP
      UPDATE public.product_variants SET stock = stock + v_item.quantity WHERE id = v_item.variant_id;
    END LOOP;
  END IF;

  UPDATE public.payment_events SET processed_at = now(), order_id = v_order.id
   WHERE provider = p_provider AND event_id = p_event_id;

  RETURN jsonb_build_object('status','applied','order_number', v_order.order_number, 'payment_status', v_new_pay);
END; $$;
REVOKE ALL ON FUNCTION public.confirm_payment(text, text, text, text, int, jsonb, text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_payment(text, text, text, text, int, jsonb, text) TO service_role;

-- public payment state for the confirmation page (no secrets)
CREATE OR REPLACE FUNCTION public.get_payment_state(p_order_number text, p_phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  SELECT jsonb_build_object('order_number', o.order_number, 'status', o.status, 'payment_status', o.payment_status,
    'total_da', o.total_da, 'payment_method', o.payment_method, 'checkout_url', p.checkout_url)
    INTO v
  FROM public.orders o LEFT JOIN public.payments p ON p.order_id = o.id
  WHERE o.order_number = p_order_number AND o.phone = p_phone;
  IF v IS NULL THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  RETURN v;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_payment_state(text, text) TO anon, authenticated, service_role;