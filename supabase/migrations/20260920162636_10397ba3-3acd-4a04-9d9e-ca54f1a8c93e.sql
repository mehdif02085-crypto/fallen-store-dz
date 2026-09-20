ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'payment_pending' AFTER 'pending';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'paid' AFTER 'payment_pending';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'payment_failed';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'expired';