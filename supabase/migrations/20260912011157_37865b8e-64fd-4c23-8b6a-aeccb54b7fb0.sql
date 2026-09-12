-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
CREATE TYPE public.order_status AS ENUM ('pending','confirmed','preparing','shipped','delivered','cancelled');
CREATE TYPE public.payment_status AS ENUM ('unpaid','pending','paid','failed','refunded');

-- ============ UTIL ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_fr text NOT NULL,
  name_ar text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  subtitle text,
  description_fr text,
  description_ar text,
  price_da int NOT NULL CHECK (price_da >= 0),
  sale_price_da int CHECK (sale_price_da >= 0),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_new boolean NOT NULL DEFAULT false,
  is_best_seller boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "products admin write" ON public.products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  square_url text,
  alt text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "images public read" ON public.product_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "images admin write" ON public.product_images FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size text NOT NULL,
  color_name text NOT NULL DEFAULT 'Noir',
  color_hex text NOT NULL DEFAULT '#0a0a0b',
  stock int NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, size, color_name)
);
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variants public read" ON public.product_variants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "variants admin write" ON public.product_variants FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ DELIVERY ============
CREATE TABLE public.wilayas (
  code int PRIMARY KEY,
  name_fr text NOT NULL,
  name_ar text NOT NULL,
  delivery_fee_da int NOT NULL DEFAULT 600 CHECK (delivery_fee_da >= 0)
);
GRANT SELECT ON public.wilayas TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.wilayas TO authenticated;
GRANT ALL ON public.wilayas TO service_role;
ALTER TABLE public.wilayas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wilayas public read" ON public.wilayas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "wilayas admin write" ON public.wilayas FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.delivery_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  default_fee_da int NOT NULL DEFAULT 600,
  free_shipping_threshold_da int,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.delivery_settings TO authenticated;
GRANT ALL ON public.delivery_settings TO service_role;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery public read" ON public.delivery_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "delivery admin write" ON public.delivery_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
INSERT INTO public.delivery_settings (id, default_fee_da, free_shipping_threshold_da) VALUES (true, 600, 15000);

-- ============ PAYMENT METHODS ============
CREATE TABLE public.payment_methods (
  code text PRIMARY KEY,
  name_fr text NOT NULL,
  name_ar text NOT NULL,
  description_fr text,
  description_ar text,
  is_enabled boolean NOT NULL DEFAULT false,
  requires_credentials boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.payment_methods TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment methods public read" ON public.payment_methods FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "payment methods admin write" ON public.payment_methods FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
INSERT INTO public.payment_methods (code, name_fr, name_ar, description_fr, description_ar, is_enabled, requires_credentials, sort_order) VALUES
  ('cod','Paiement à la livraison','الدفع عند الاستلام','Payez en espèces à la réception de votre commande.','ادفع نقدا عند استلام طلبك.', true, false, 1),
  ('cib','Carte CIB','بطاقة CIB','Paiement en ligne par carte CIB.','الدفع الإلكتروني ببطاقة CIB.', false, true, 2),
  ('edahabia','Edahabia','الذهبية','Paiement en ligne par carte Edahabia (Algérie Poste).','الدفع الإلكتروني ببطاقة الذهبية.', false, true, 3),
  ('card','Carte bancaire internationale','بطاقة بنكية دولية','Visa / Mastercard.','فيزا / ماستركارد.', false, true, 4);

-- ============ CUSTOM SHIRT ============
CREATE TABLE public.custom_shirt_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  base_price_da int NOT NULL DEFAULT 4500,
  image_print_surcharge_da int NOT NULL DEFAULT 700,
  text_print_surcharge_da int NOT NULL DEFAULT 400,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.custom_shirt_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.custom_shirt_settings TO authenticated;
GRANT ALL ON public.custom_shirt_settings TO service_role;
ALTER TABLE public.custom_shirt_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom settings public read" ON public.custom_shirt_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "custom settings admin write" ON public.custom_shirt_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
INSERT INTO public.custom_shirt_settings (id) VALUES (true);

CREATE TABLE public.custom_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shirt_model text NOT NULL,
  shirt_color_name text NOT NULL,
  shirt_color_hex text NOT NULL,
  size text NOT NULL,
  design_image_url text,
  custom_text text,
  text_color text,
  position text NOT NULL DEFAULT 'center',
  price_da int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.custom_designs TO service_role;
GRANT SELECT ON public.custom_designs TO authenticated;
ALTER TABLE public.custom_designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "designs admin read" ON public.custom_designs FOR SELECT TO authenticated USING (public.is_admin());

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid,
  customer_name text NOT NULL,
  phone text NOT NULL,
  wilaya_code int NOT NULL REFERENCES public.wilayas(code),
  wilaya_name text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  delivery_notes text,
  payment_method text NOT NULL REFERENCES public.payment_methods(code),
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  status public.order_status NOT NULL DEFAULT 'pending',
  subtotal_da int NOT NULL,
  delivery_fee_da int NOT NULL,
  total_da int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders admin read" ON public.orders FOR SELECT TO authenticated USING (public.is_admin() OR user_id = auth.uid());
CREATE POLICY "orders admin update" ON public.orders FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  custom_design_id uuid REFERENCES public.custom_designs(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  size text,
  color_name text,
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price_da int NOT NULL,
  line_total_da int NOT NULL
);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order items admin read" ON public.order_items FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'unpaid',
  amount_da int NOT NULL,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments admin read" ON public.payments FOR SELECT TO authenticated USING (public.is_admin());

-- ============ ORDER PLACEMENT (server-side pricing) ============
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
    delivery_notes, payment_method, payment_status, status, subtotal_da, delivery_fee_da, total_da)
  VALUES (v_number, auth.uid(), v_name, v_phone, v_wilaya, v_wilaya_name, v_city, v_address, v_notes,
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

  SELECT default_fee_da, free_shipping_threshold_da INTO v_threshold, v_threshold FROM public.delivery_settings WHERE id;
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

CREATE OR REPLACE FUNCTION public.get_order_by_number(p_order_number text, p_phone text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders; v_items jsonb;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE order_number = upper(trim(p_order_number)) AND phone = trim(p_phone);
  IF v_order IS NULL THEN RETURN NULL; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('product_name', product_name, 'size', size,
    'color_name', color_name, 'quantity', quantity, 'unit_price_da', unit_price_da, 'line_total_da', line_total_da)), '[]'::jsonb)
  INTO v_items FROM public.order_items WHERE order_id = v_order.id;
  RETURN jsonb_build_object('order_number', v_order.order_number, 'customer_name', v_order.customer_name,
    'wilaya_name', v_order.wilaya_name, 'city', v_order.city, 'address', v_order.address,
    'payment_method', v_order.payment_method, 'payment_status', v_order.payment_status,
    'status', v_order.status, 'subtotal_da', v_order.subtotal_da, 'delivery_fee_da', v_order.delivery_fee_da,
    'total_da', v_order.total_da, 'created_at', v_order.created_at, 'items', v_items);
END; $$;
REVOKE ALL ON FUNCTION public.get_order_by_number(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_order_by_number(text, text) TO anon, authenticated, service_role;

-- ============ WILAYAS SEED ============
INSERT INTO public.wilayas (code, name_fr, name_ar, delivery_fee_da) VALUES
(1,'Adrar','أدرار',900),(2,'Chlef','الشلف',600),(3,'Laghouat','الأغواط',800),(4,'Oum El Bouaghi','أم البواقي',700),
(5,'Batna','باتنة',700),(6,'Béjaïa','بجاية',600),(7,'Biskra','بسكرة',700),(8,'Béchar','بشار',900),
(9,'Blida','البليدة',500),(10,'Bouira','البويرة',600),(11,'Tamanrasset','تمنراست',1200),(12,'Tébessa','تبسة',800),
(13,'Tlemcen','تلمسان',700),(14,'Tiaret','تيارت',700),(15,'Tizi Ouzou','تيزي وزو',600),(16,'Alger','الجزائر',400),
(17,'Djelfa','الجلفة',800),(18,'Jijel','جيجل',600),(19,'Sétif','سطيف',600),(20,'Saïda','سعيدة',700),
(21,'Skikda','سكيكدة',600),(22,'Sidi Bel Abbès','سيدي بلعباس',700),(23,'Annaba','عنابة',600),(24,'Guelma','قالمة',700),
(25,'Constantine','قسنطينة',600),(26,'Médéa','المدية',600),(27,'Mostaganem','مستغانم',600),(28,'MSila','المسيلة',700),
(29,'Mascara','معسكر',700),(30,'Ouargla','ورقلة',900),(31,'Oran','وهران',600),(32,'El Bayadh','البيض',900),
(33,'Illizi','إليزي',1200),(34,'Bordj Bou Arreridj','برج بوعريريج',600),(35,'Boumerdès','بومرداس',500),
(36,'El Tarf','الطارف',700),(37,'Tindouf','تندوف',1200),(38,'Tissemsilt','تيسمسيلت',700),(39,'El Oued','الوادي',900),
(40,'Khenchela','خنشلة',800),(41,'Souk Ahras','سوق أهراس',800),(42,'Tipaza','تيبازة',500),(43,'Mila','ميلة',600),
(44,'Aïn Defla','عين الدفلى',600),(45,'Naâma','النعامة',900),(46,'Aïn Témouchent','عين تموشنت',700),
(47,'Ghardaïa','غرداية',900),(48,'Relizane','غليزان',600),(49,'Timimoun','تيميمون',1100),
(50,'Bordj Badji Mokhtar','برج باجي مختار',1300),(51,'Ouled Djellal','أولاد جلال',900),
(52,'Béni Abbès','بني عباس',1100),(53,'In Salah','عين صالح',1300),(54,'In Guezzam','عين قزام',1300),
(55,'Touggourt','تقرت',900),(56,'Djanet','جانت',1300),(57,'El MGhair','المغير',900),(58,'El Meniaa','المنيعة',1000);

-- ============ CATEGORIES SEED ============
INSERT INTO public.categories (slug, name_fr, name_ar, sort_order) VALUES
('t-shirts','T-shirts','تي شيرت',1),
('oversized','T-shirts Oversized','تي شيرت واسع',2),
('hoodies','Hoodies','هوديز',3),
('sweatshirts','Sweatshirts','سويت شيرت',4),
('pants','Pantalons','بناطيل',5),
('accessories','Accessoires','إكسسوارات',6);

-- ============ PRODUCTS SEED ============
INSERT INTO public.products (slug, name, subtitle, description_fr, description_ar, price_da, sale_price_da, category_id, is_new, is_best_seller, is_featured) VALUES
('heavyweight-tee','Heavyweight Tee','350 GSM','Coton peigné 350 GSM. Coupe boxy, épaules tombantes. Imprimé à Alger.','قطن ممشط 350 غرام. قصة واسعة وأكتاف منسدلة. مطبوع في الجزائر.',4500,NULL,(SELECT id FROM public.categories WHERE slug='t-shirts'),true,true,true),
('oversized-wash-tee','Oversized Wash Tee','Drop shoulder','Délavage acide, coupe oversized, coutures renforcées.','غسيل حمضي، قصة واسعة، خياطة مقواة.',4400,3900,(SELECT id FROM public.categories WHERE slug='oversized'),true,true,false),
('boxy-hoodie','Boxy Hoodie','Fleece 400g','Molleton 400g gratté, capuche doublée, poche kangourou.','صوف داخلي 400 غرام، غطاء رأس مبطن، جيب أمامي.',6900,5200,(SELECT id FROM public.categories WHERE slug='hoodies'),false,true,true),
('cargo-pants-09','Cargo Pants 09','Stone / 6-pocket','Toile ripstop, six poches, bas ajustable.','قماش ريبستوب، ستة جيوب، أسفل قابل للتعديل.',7200,NULL,(SELECT id FROM public.categories WHERE slug='pants'),true,false,false),
('fog-sweatshirt','Fog Sweatshirt','Crewneck 380g','Col rond, coton bouclette, broderie poitrine.','رقبة دائرية، قطن، تطريز على الصدر.',5900,NULL,(SELECT id FROM public.categories WHERE slug='sweatshirts'),false,true,true),
('fallen-cap','Fallen Cap','6-panel','Casquette 6 panneaux, logo brodé, fermeture métal.','قبعة 6 قطع، شعار مطرز، إغلاق معدني.',2200,1800,(SELECT id FROM public.categories WHERE slug='accessories'),true,false,false);

INSERT INTO public.product_variants (product_id, size, color_name, color_hex, stock)
SELECT p.id, s.size, c.name, c.hex, 12
FROM public.products p
CROSS JOIN (VALUES ('S'),('M'),('L'),('XL')) AS s(size)
CROSS JOIN (VALUES ('Noir','#0a0a0b'),('Os','#d6d3ca')) AS c(name,hex)
WHERE p.slug IN ('heavyweight-tee','oversized-wash-tee','boxy-hoodie','fog-sweatshirt');

INSERT INTO public.product_variants (product_id, size, color_name, color_hex, stock)
SELECT p.id, s.size, 'Stone', '#8a8a7f', 8
FROM public.products p CROSS JOIN (VALUES ('28'),('30'),('32'),('34')) AS s(size)
WHERE p.slug = 'cargo-pants-09';

INSERT INTO public.product_variants (product_id, size, color_name, color_hex, stock)
SELECT p.id, 'Unique', 'Noir', '#0a0a0b', 25 FROM public.products p WHERE p.slug = 'fallen-cap';