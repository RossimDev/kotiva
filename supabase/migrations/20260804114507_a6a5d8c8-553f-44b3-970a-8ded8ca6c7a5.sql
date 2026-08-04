-- Auditoria de ações administrativas
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL,
  target_email text,
  target_user_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);

-- Rate limiting de rotas sensíveis (somente backend)
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  identifier text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, identifier)
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Sem policies: apenas o backend com service_role acessa.

CREATE OR REPLACE FUNCTION public.check_rate_limit(_bucket text, _identifier text, _limit integer, _window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur public.rate_limits%ROWTYPE;
BEGIN
  SELECT * INTO cur FROM public.rate_limits WHERE bucket = _bucket AND identifier = _identifier FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (bucket, identifier, window_start, count) VALUES (_bucket, _identifier, now(), 1);
    RETURN true;
  END IF;
  IF cur.window_start < now() - make_interval(secs => _window_seconds) THEN
    UPDATE public.rate_limits SET window_start = now(), count = 1, updated_at = now() WHERE id = cur.id;
    RETURN true;
  END IF;
  IF cur.count >= _limit THEN
    RETURN false;
  END IF;
  UPDATE public.rate_limits SET count = cur.count + 1, updated_at = now() WHERE id = cur.id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;

-- Admins podem consultar assinaturas (leitura) para suporte no painel
CREATE POLICY "Admins read subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));