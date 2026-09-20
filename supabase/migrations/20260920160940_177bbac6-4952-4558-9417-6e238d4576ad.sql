-- Super admin registry
CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.super_admins TO authenticated;
GRANT ALL ON public.super_admins TO service_role;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Admin requests
CREATE TABLE IF NOT EXISTS public.admin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid,
  decision_note text,
  CONSTRAINT admin_requests_status_chk CHECK (status IN ('pending','approved','rejected','revoked'))
);
CREATE UNIQUE INDEX IF NOT EXISTS admin_requests_one_pending
  ON public.admin_requests (user_id) WHERE status = 'pending';
GRANT SELECT ON public.admin_requests TO authenticated;
GRANT ALL ON public.admin_requests TO service_role;
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;

-- Audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target_user_id uuid,
  target_email text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Identity helpers
CREATE OR REPLACE FUNCTION public.current_verified_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT lower(u.email) FROM auth.users u
  WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.current_verified_email() = 'mehdif02085@gmail.com'
    OR EXISTS (SELECT 1 FROM public.super_admins s WHERE s.user_id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin()
    OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin');
$$;

-- Seed the super admin
INSERT INTO public.super_admins (user_id, email)
SELECT u.id, lower(u.email) FROM auth.users u WHERE lower(u.email) = 'mehdif02085@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role FROM auth.users u WHERE lower(u.email) = 'mehdif02085@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Policies
DROP POLICY IF EXISTS "super admins readable by admins" ON public.super_admins;
CREATE POLICY "super admins readable by admins" ON public.super_admins
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "requests readable" ON public.admin_requests;
CREATE POLICY "requests readable" ON public.admin_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "audit readable by super admin" ON public.admin_audit_log;
CREATE POLICY "audit readable by super admin" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- Lock role self-service: only super admin may touch user_roles directly
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
CREATE POLICY "read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "super admin manages roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Admins can read customer profiles for fulfilment
DROP POLICY IF EXISTS "admins read profiles" ON public.profiles;
CREATE POLICY "admins read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin());

-- Audit writer
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action text, p_target_user uuid, p_target_email text, p_details jsonb
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.admin_audit_log (actor_id, actor_email, action, target_user_id, target_email, details)
  VALUES (auth.uid(), public.current_verified_email(), p_action, p_target_user, p_target_email, coalesce(p_details, '{}'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.log_admin_action(text, uuid, text, jsonb) FROM anon, authenticated;

-- Status for the signed-in user
CREATE OR REPLACE FUNCTION public.my_admin_status()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'user_id', auth.uid(),
    'email', public.current_verified_email(),
    'is_admin', public.is_admin(),
    'is_super_admin', public.is_super_admin(),
    'request_status', (SELECT r.status FROM public.admin_requests r WHERE r.user_id = auth.uid()
                        ORDER BY r.created_at DESC LIMIT 1)
  );
$$;

-- Request admin access
CREATE OR REPLACE FUNCTION public.request_admin_access(p_full_name text DEFAULT NULL, p_message text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  v_email := public.current_verified_email();
  IF v_email IS NULL THEN RAISE EXCEPTION 'EMAIL_NOT_VERIFIED'; END IF;
  IF public.is_admin() THEN RAISE EXCEPTION 'ALREADY_ADMIN'; END IF;
  IF EXISTS (SELECT 1 FROM public.admin_requests WHERE user_id = auth.uid() AND status = 'pending') THEN
    RAISE EXCEPTION 'REQUEST_PENDING';
  END IF;
  INSERT INTO public.admin_requests (user_id, email, full_name, message)
  VALUES (auth.uid(), v_email, nullif(trim(coalesce(p_full_name,'')),''), left(nullif(trim(coalesce(p_message,'')),''), 500))
  RETURNING id INTO v_id;
  PERFORM public.log_admin_action('request_created', auth.uid(), v_email, jsonb_build_object('request_id', v_id));
  RETURN jsonb_build_object('request_id', v_id, 'status', 'pending');
END; $$;

-- Approve
CREATE OR REPLACE FUNCTION public.approve_admin_request(p_request_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req public.admin_requests;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO v_req FROM public.admin_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'REQUEST_NOT_FOUND'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'REQUEST_NOT_PENDING'; END IF;
  IF v_req.user_id = auth.uid() THEN RAISE EXCEPTION 'CANNOT_APPROVE_OWN_REQUEST'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_req.user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  UPDATE public.admin_requests
    SET status = 'approved', decided_at = now(), decided_by = auth.uid(), decision_note = left(p_note, 500)
    WHERE id = p_request_id;
  PERFORM public.log_admin_action('request_approved', v_req.user_id, v_req.email,
    jsonb_build_object('request_id', p_request_id, 'note', p_note));
  RETURN jsonb_build_object('status', 'approved');
END; $$;

-- Reject
CREATE OR REPLACE FUNCTION public.reject_admin_request(p_request_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req public.admin_requests;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO v_req FROM public.admin_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'REQUEST_NOT_FOUND'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'REQUEST_NOT_PENDING'; END IF;
  IF v_req.user_id = auth.uid() THEN RAISE EXCEPTION 'CANNOT_DECIDE_OWN_REQUEST'; END IF;
  UPDATE public.admin_requests
    SET status = 'rejected', decided_at = now(), decided_by = auth.uid(), decision_note = left(p_note, 500)
    WHERE id = p_request_id;
  PERFORM public.log_admin_action('request_rejected', v_req.user_id, v_req.email,
    jsonb_build_object('request_id', p_request_id, 'note', p_note));
  RETURN jsonb_build_object('status', 'rejected');
END; $$;

-- Revoke
CREATE OR REPLACE FUNCTION public.revoke_admin_access(p_user_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'CANNOT_REVOKE_SELF'; END IF;
  IF EXISTS (SELECT 1 FROM public.super_admins s WHERE s.user_id = p_user_id) THEN
    RAISE EXCEPTION 'CANNOT_REVOKE_SUPER_ADMIN';
  END IF;
  SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = p_user_id;
  IF v_email = 'mehdif02085@gmail.com' THEN RAISE EXCEPTION 'CANNOT_REVOKE_SUPER_ADMIN'; END IF;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  UPDATE public.admin_requests SET status = 'revoked', decided_at = now(), decided_by = auth.uid(),
    decision_note = left(p_note, 500) WHERE user_id = p_user_id AND status = 'approved';
  PERFORM public.log_admin_action('admin_revoked', p_user_id, v_email, jsonb_build_object('note', p_note));
  RETURN jsonb_build_object('status', 'revoked');
END; $$;

-- Admin & customer listings (emails live in auth schema)
CREATE OR REPLACE FUNCTION public.list_admins()
RETURNS TABLE (user_id uuid, email text, role app_role, is_super boolean, granted_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT r.user_id, lower(u.email), r.role,
    (s.user_id IS NOT NULL OR lower(u.email) = 'mehdif02085@gmail.com'), r.created_at
  FROM public.user_roles r
  JOIN auth.users u ON u.id = r.user_id
  LEFT JOIN public.super_admins s ON s.user_id = r.user_id
  WHERE public.is_admin()
  ORDER BY r.created_at;
$$;

CREATE OR REPLACE FUNCTION public.list_customers()
RETURNS TABLE (user_id uuid, email text, full_name text, phone text, created_at timestamptz,
               orders_count bigint, total_spent_da bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT u.id, lower(u.email), p.full_name, p.phone, u.created_at,
    (SELECT count(*) FROM public.orders o WHERE o.user_id = u.id),
    (SELECT coalesce(sum(o.total_da),0) FROM public.orders o WHERE o.user_id = u.id)
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.is_admin()
  ORDER BY u.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.request_admin_access(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.approve_admin_request(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.reject_admin_request(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.revoke_admin_access(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.list_admins() FROM anon;
REVOKE ALL ON FUNCTION public.list_customers() FROM anon;
REVOKE ALL ON FUNCTION public.my_admin_status() FROM anon;