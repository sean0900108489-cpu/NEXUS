ALTER TABLE public.model_usage_ledger
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS input_tokens int,
  ADD COLUMN IF NOT EXISTS output_tokens int,
  ADD COLUMN IF NOT EXISTS total_tokens int;

ALTER TABLE public.model_usage_ledger
  ALTER COLUMN input_tokens DROP NOT NULL,
  ALTER COLUMN output_tokens DROP NOT NULL,
  ALTER COLUMN total_tokens DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'model_usage_ledger_input_tokens_non_negative'
      AND conrelid = 'public.model_usage_ledger'::regclass
  ) THEN
    ALTER TABLE public.model_usage_ledger
      ADD CONSTRAINT model_usage_ledger_input_tokens_non_negative
      CHECK (input_tokens IS NULL OR input_tokens >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'model_usage_ledger_output_tokens_non_negative'
      AND conrelid = 'public.model_usage_ledger'::regclass
  ) THEN
    ALTER TABLE public.model_usage_ledger
      ADD CONSTRAINT model_usage_ledger_output_tokens_non_negative
      CHECK (output_tokens IS NULL OR output_tokens >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'model_usage_ledger_total_tokens_non_negative'
      AND conrelid = 'public.model_usage_ledger'::regclass
  ) THEN
    ALTER TABLE public.model_usage_ledger
      ADD CONSTRAINT model_usage_ledger_total_tokens_non_negative
      CHECK (total_tokens IS NULL OR total_tokens >= 0);
  END IF;
END $$;

COMMENT ON COLUMN public.model_usage_ledger.source_type IS
  'MVP AI entrypoint source, for example operator_chat, agent_stream, graph_llm, workflow_lite_llm, image_workflow, memory_compress, or predictive_intel.';

COMMENT ON COLUMN public.model_usage_ledger.input_tokens IS
  'Input tokens reported by New API when available, or locally estimated by the backend. Nullable for legacy rows and endpoints without token usage.';

COMMENT ON COLUMN public.model_usage_ledger.output_tokens IS
  'Output tokens reported by New API when available, or locally estimated by the backend. Nullable for legacy rows and endpoints without token usage.';

COMMENT ON COLUMN public.model_usage_ledger.total_tokens IS
  'Total tokens reported by New API when available, or locally estimated by the backend. Nullable for legacy rows and endpoints without token usage.';
