CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.user_new_api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  new_api_token_name text,
  encrypted_new_api_token text NOT NULL,
  new_api_token_id text,
  new_api_group text,
  plan text NOT NULL DEFAULT 'free',
  enabled boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT user_new_api_tokens_user_unique UNIQUE (user_id),
  CONSTRAINT user_new_api_tokens_plan_check
    CHECK (plan IN ('free', 'basic', 'pro', 'team'))
);

CREATE INDEX IF NOT EXISTS idx_user_new_api_tokens_user_id
  ON public.user_new_api_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_user_new_api_tokens_enabled
  ON public.user_new_api_tokens (enabled);

CREATE OR REPLACE FUNCTION public.set_user_new_api_tokens_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_new_api_tokens_updated_at
  ON public.user_new_api_tokens;

CREATE TRIGGER trg_user_new_api_tokens_updated_at
BEFORE UPDATE ON public.user_new_api_tokens
FOR EACH ROW
EXECUTE FUNCTION public.set_user_new_api_tokens_updated_at();

ALTER TABLE public.user_new_api_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_new_api_tokens FROM anon;
REVOKE ALL ON TABLE public.user_new_api_tokens FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.user_new_api_tokens
  TO service_role;

COMMENT ON TABLE public.user_new_api_tokens IS
  'Server-only mapping from NEXUS user to encrypted New API downstream token. Backend service role reads encrypted_new_api_token; frontend must never receive it.';

COMMENT ON COLUMN public.user_new_api_tokens.encrypted_new_api_token IS
  'AES-GCM encrypted New API downstream token. Never expose through frontend queries or API responses.';
