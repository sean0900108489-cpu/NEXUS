CREATE TABLE IF NOT EXISTS public.model_usage_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  operator_id text NOT NULL,
  conversation_id text,
  request_id text NOT NULL,
  model_id text NOT NULL,
  new_api_model text NOT NULL,
  provider_family text NOT NULL,
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  total_tokens int NOT NULL DEFAULT 0,
  charged_points int NOT NULL DEFAULT 0,
  status text NOT NULL,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT model_usage_ledger_status_check
    CHECK (status IN ('succeeded', 'failed')),
  CONSTRAINT model_usage_ledger_token_check
    CHECK (input_tokens >= 0 AND output_tokens >= 0 AND total_tokens >= 0),
  CONSTRAINT model_usage_ledger_charged_points_check
    CHECK (charged_points >= 0)
);

CREATE INDEX IF NOT EXISTS idx_model_usage_ledger_user_created
  ON public.model_usage_ledger (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_model_usage_ledger_operator_created
  ON public.model_usage_ledger (operator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_model_usage_ledger_request
  ON public.model_usage_ledger (request_id);

ALTER TABLE public.model_usage_ledger ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'model_usage_ledger'
      AND policyname = 'model_usage_ledger_select_self'
  ) THEN
    CREATE POLICY model_usage_ledger_select_self
    ON public.model_usage_ledger
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;

COMMENT ON TABLE public.model_usage_ledger IS
  'Per-request product model usage ledger. Records the exact model used by each operator request; never stores API keys, provider tokens, prompts, or response bodies.';
