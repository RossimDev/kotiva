CREATE TABLE public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('email','sms')),
  destination text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('signup','password_reset','phone')),
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.verification_codes TO service_role;

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to verification codes"
ON public.verification_codes FOR ALL TO authenticated, anon
USING (false) WITH CHECK (false);

CREATE INDEX idx_verification_codes_lookup
  ON public.verification_codes (destination, purpose, created_at DESC);

CREATE TRIGGER verification_codes_updated
BEFORE UPDATE ON public.verification_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();