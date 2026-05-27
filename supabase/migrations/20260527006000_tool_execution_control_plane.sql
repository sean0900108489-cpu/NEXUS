-- V7: Tool Execution Control Plane
--
-- Additive-only tool execution migration. This version records tool run control
-- state, permission switches, and high-risk confirmation metadata only.
-- Artifact materialization remains a nullable hook and is intentionally not
-- implemented in this migration.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.tool_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  agent_id text,
  task_id uuid REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  tool_id text NOT NULL,
  executor_id text,
  status text NOT NULL,
  risk_level text NOT NULL,
  input_hash text,
  input_redacted jsonb NOT NULL DEFAULT '{}'::jsonb,
  executable_input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_redacted jsonb,
  output_hash text,
  artifact_id uuid,
  error_code text,
  error_message text,
  cost_estimate numeric,
  confirmation_expires_at timestamptz,
  confirmed_by uuid,
  confirmed_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tool_runs_status_check
    CHECK (status IN (
      'created',
      'blocked',
      'awaiting_confirmation',
      'running',
      'succeeded',
      'failed',
      'cancelled',
      'materialized'
    )),
  CONSTRAINT tool_runs_risk_level_check
    CHECK (risk_level IN ('low', 'medium', 'high'))
);

CREATE INDEX IF NOT EXISTS idx_tool_runs_workspace_agent
  ON public.tool_runs (workspace_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_tool_runs_task
  ON public.tool_runs (task_id);

CREATE INDEX IF NOT EXISTS idx_tool_runs_status
  ON public.tool_runs (status);

CREATE INDEX IF NOT EXISTS idx_tool_runs_tool
  ON public.tool_runs (tool_id);

CREATE TABLE IF NOT EXISTS public.tool_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  tool_id text NOT NULL,
  scope text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  requires_confirmation boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tool_permissions_workspace_tool_scope_unique
    UNIQUE (workspace_id, tool_id, scope)
);

CREATE INDEX IF NOT EXISTS idx_tool_permissions_workspace_tool
  ON public.tool_permissions (workspace_id, tool_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
      AND pronamespace = 'public'::regnamespace
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_tool_permissions_updated_at'
  ) THEN
    CREATE TRIGGER set_tool_permissions_updated_at
    BEFORE UPDATE ON public.tool_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.tool_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tool_runs'
      AND policyname = 'tool_runs_select_member'
  ) THEN
    CREATE POLICY tool_runs_select_member
    ON public.tool_runs
    FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tool_runs'
      AND policyname = 'tool_runs_insert_operator'
  ) THEN
    CREATE POLICY tool_runs_insert_operator
    ON public.tool_runs
    FOR INSERT
    TO authenticated
    WITH CHECK (
      public.has_workspace_role(workspace_id, ARRAY['owner', 'admin'])
      AND (created_by IS NULL OR created_by = auth.uid())
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tool_runs'
      AND policyname = 'tool_runs_update_operator'
  ) THEN
    CREATE POLICY tool_runs_update_operator
    ON public.tool_runs
    FOR UPDATE
    TO authenticated
    USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin']))
    WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin']));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tool_permissions'
      AND policyname = 'tool_permissions_select_member'
  ) THEN
    CREATE POLICY tool_permissions_select_member
    ON public.tool_permissions
    FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tool_permissions'
      AND policyname = 'tool_permissions_insert_admin'
  ) THEN
    CREATE POLICY tool_permissions_insert_admin
    ON public.tool_permissions
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin']));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tool_permissions'
      AND policyname = 'tool_permissions_update_admin'
  ) THEN
    CREATE POLICY tool_permissions_update_admin
    ON public.tool_permissions
    FOR UPDATE
    TO authenticated
    USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin']))
    WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin']));
  END IF;
END $$;

COMMENT ON TABLE public.tool_runs IS
  'V7 tool execution control-plane records. Inputs and outputs must be redacted; artifact_id is only a nullable binding hook.';

COMMENT ON COLUMN public.tool_runs.executable_input IS
  'Normalized non-secret input only. Raw API keys, Authorization headers, provider tokens, and service-role keys must never be stored here.';

COMMENT ON TABLE public.tool_permissions IS
  'V7 workspace-scoped tool permission switches with one row per workspace, tool, and scope.';
