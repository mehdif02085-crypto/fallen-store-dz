-- 1. payment provider mapping + baridimob method
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS provider_key text NOT NULL DEFAULT 'manual';
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;

UPDATE public.payment_methods SET provider_key='cod', is_online=false WHERE code='cod';
UPDATE public.payment_methods SET provider_key='chargily', is_online=true WHERE code IN ('cib','edahabia');
UPDATE public.payment_methods SET provider_key='satim', is_online=true WHERE code='card';

INSERT INTO public.payment_methods (code, name_fr, name_ar, description_fr, description_ar, is_enabled, requires_credentials, sort_order, provider_key, is_online)
VALUES ('baridimob','BaridiMob','بريدي موب','Virement BaridiMob, confirmé manuellement par le magasin.','تحويل بريدي موب، يتم تأكيده يدويا من المتجر.', false, true, 40, 'baridimob', false)
ON CONFLICT (code) DO NOTHING;

-- 2. duplicate order protection
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_uidx ON public.orders (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON public.payments (order_id);

-- 3. payments: provider tracking (never card data)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_ref text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS checkout_url text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'test';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS failure_reason text;
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_ref_uidx ON public.payments (provider, provider_ref) WHERE provider_ref IS NOT NULL;

-- 4. webhook event log (dedup + retries)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  payload jsonb,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);
GRANT ALL ON public.payment_events TO service_role;
GRANT SELECT ON public.payment_events TO authenticated;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment events admin read" ON public.payment_events FOR SELECT TO authenticated USING (public.is_admin());

-- 5. order status history (audit of status changes)
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.order_status,
  payment_status public.payment_status,
  changed_by uuid,
  source text NOT NULL DEFAULT 'admin',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.order_status_history TO service_role;
GRANT SELECT ON public.order_status_history TO authenticated;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order history admin read" ON public.order_status_history FOR SELECT TO authenticated USING (public.is_admin());
CREATE INDEX IF NOT EXISTS order_status_history_order_idx ON public.order_status_history (order_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.track_order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO public.order_status_history (order_id, status, payment_status, changed_by, source)
    VALUES (NEW.id, NEW.status, NEW.payment_status, auth.uid(), CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'admin' END);
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_track_order_status ON public.orders;
CREATE TRIGGER trg_track_order_status BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.track_order_status_change();
