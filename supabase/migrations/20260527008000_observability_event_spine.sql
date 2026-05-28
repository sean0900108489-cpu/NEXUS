-- V9: Observability Event Spine
--
-- Adds system-level trace events and usage metrics. V9 does not replace
-- permission_audit_logs, sync_operations, agent_tasks, tool_runs, artifacts, or
-- any domain lifecycle table. It intentionally does not modify message or
-- agent memory historical paging/storage.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id text NOT NULL,
  request_id text,
  workspace_id text,
  user_id uuid,
  event_type text NOT NULL,
  severity text NOT NULL,
  source text NOT NULL,
  resource_type text,
  resource_id text,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT system_events_severity_check
    CHECK (severity IN ('debug', 'info', 'warn', 'error', 'critical')),
  CONSTRAINT system_events_source_check
    CHECK (source IN (
      'api',
      'sync',
      'agent',
      'tool',
      'artifact',
      'database',
      'provider',
      'security',
      'deployment',
      'history'
    ))
);

CREATE INDEX IF NOT EXISTS idx_system_events_trace
  ON public.system_events (trace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_events_workspace_created
  ON public.system_events (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_events_source_severity
  ON public.system_events (source, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_events_resource
  ON public.system_events (resource_type, resource_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text,
  agent_id text,
  task_id uuid,
  tool_run_id uuid,
  provider text,
  model text,
  input_tokens int,
  output_tokens int,
  cost_estimate numeric,
  latency_ms int,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usage_metrics_input_tokens_check
    CHECK (input_tokens IS NULL OR input_tokens >= 0),
  CONSTRAINT usage_metrics_output_tokens_check
    CHECK (output_tokens IS NULL OR output_tokens >= 0),
  CONSTRAINT usage_metrics_cost_estimate_check
    CHECK (cost_estimate IS NULL OR cost_estimate >= 0),
  CONSTRAINT usage_metrics_latency_ms_check
    CHECK (latency_ms IS NULL OR latency_ms >= 0)
);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_workspace_created
  ON public.usage_metrics (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_task
  ON public.usage_metrics (task_id);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_provider_model
  ON public.usage_metrics (provider, model, created_at DESC);

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'system_events'
      AND policyname = 'system_events_select_member'
  ) THEN
    CREATE POLICY system_events_select_member
    ON public.system_events
    FOR SELECT
    TO authenticated
    USING (
      workspace_id IS NOT NULL
      AND public.is_workspace_member(workspace_id)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'usage_metrics'
      AND policyname = 'usage_metrics_select_member'
  ) THEN
    CREATE POLICY usage_metrics_select_member
    ON public.usage_metrics
    FOR SELECT
    TO authenticated
    USING (
      workspace_id IS NOT NULL
      AND public.is_workspace_member(workspace_id)
    );
  END IF;
END $$;

COMMENT ON TABLE public.system_events IS
  'V9 observability trace spine. Does not replace domain lifecycle or audit tables. Metadata must be redacted and size-capped before insert.';

COMMENT ON TABLE public.usage_metrics IS
  'V9 token, latency, and cost metric records for aggregation. Retention is handled by repository cleanup or external jobs.';
