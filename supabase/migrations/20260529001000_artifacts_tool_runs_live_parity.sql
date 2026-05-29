-- R3 live schema parity repair: artifacts and tool_runs
--
-- Additive-only repair migration for live environments that have the legacy
-- artifacts table but are missing V7/V8 tool execution and artifact columns.
-- This migration intentionally avoids data rewrites and destructive DDL.

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

CREATE TABLE IF NOT EXISTS public.artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text,
  source_message_id text,
  content_url text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'document',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.artifacts
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS content_text text,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS content_size_bytes int,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS preview_text text,
  ADD COLUMN IF NOT EXISTS source_agent_id text,
  ADD COLUMN IF NOT EXISTS source_task_id uuid,
  ADD COLUMN IF NOT EXISTS source_tool_run_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS version int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS root_artifact_id uuid,
  ADD COLUMN IF NOT EXISTS parent_artifact_id uuid,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'saved',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'artifacts_status_check'
  ) THEN
    ALTER TABLE public.artifacts
      ADD CONSTRAINT artifacts_status_check
      CHECK (status IN (
        'draft',
        'saving',
        'saved',
        'indexed',
        'failed',
        'archived',
        'deleted'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'artifacts_version_check'
  ) THEN
    ALTER TABLE public.artifacts
      ADD CONSTRAINT artifacts_version_check
      CHECK (version IS NULL OR version >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'artifacts_content_size_bytes_check'
  ) THEN
    ALTER TABLE public.artifacts
      ADD CONSTRAINT artifacts_content_size_bytes_check
      CHECK (content_size_bytes IS NULL OR content_size_bytes >= 0);
  END IF;

  IF to_regclass('public.agent_tasks') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'artifacts_source_task_id_fkey'
    )
  THEN
    ALTER TABLE public.artifacts
      ADD CONSTRAINT artifacts_source_task_id_fkey
      FOREIGN KEY (source_task_id)
      REFERENCES public.agent_tasks(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'artifacts_source_tool_run_id_fkey'
  ) THEN
    ALTER TABLE public.artifacts
      ADD CONSTRAINT artifacts_source_tool_run_id_fkey
      FOREIGN KEY (source_tool_run_id)
      REFERENCES public.tool_runs(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'artifacts_root_artifact_id_fkey'
  ) THEN
    ALTER TABLE public.artifacts
      ADD CONSTRAINT artifacts_root_artifact_id_fkey
      FOREIGN KEY (root_artifact_id)
      REFERENCES public.artifacts(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'artifacts_parent_artifact_id_fkey'
  ) THEN
    ALTER TABLE public.artifacts
      ADD CONSTRAINT artifacts_parent_artifact_id_fkey
      FOREIGN KEY (parent_artifact_id)
      REFERENCES public.artifacts(id)
      ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
      AND pronamespace = 'public'::regnamespace
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_artifacts_updated_at'
  ) THEN
    CREATE TRIGGER set_artifacts_updated_at
    BEFORE UPDATE ON public.artifacts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
      AND pronamespace = 'public'::regnamespace
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_tool_permissions_updated_at'
  ) THEN
    CREATE TRIGGER set_tool_permissions_updated_at
    BEFORE UPDATE ON public.tool_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_artifacts_workspace_type_created
  ON public.artifacts (workspace_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_artifacts_source_task
  ON public.artifacts (source_task_id);

CREATE INDEX IF NOT EXISTS idx_artifacts_source_tool_run
  ON public.artifacts (source_tool_run_id);

CREATE INDEX IF NOT EXISTS idx_artifacts_parent
  ON public.artifacts (parent_artifact_id);

CREATE INDEX IF NOT EXISTS idx_artifacts_root
  ON public.artifacts (root_artifact_id);

CREATE INDEX IF NOT EXISTS idx_artifacts_content_hash
  ON public.artifacts (workspace_id, content_hash);

ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifacts'
      AND policyname = 'artifacts_select_workspace_member'
  ) THEN
    CREATE POLICY artifacts_select_workspace_member
    ON public.artifacts
    FOR SELECT
    TO authenticated
    USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifacts'
      AND policyname = 'artifacts_insert_workspace_editor'
  ) THEN
    CREATE POLICY artifacts_insert_workspace_editor
    ON public.artifacts
    FOR INSERT
    TO authenticated
    WITH CHECK (
      workspace_id IS NULL
      OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifacts'
      AND policyname = 'artifacts_update_workspace_editor'
  ) THEN
    CREATE POLICY artifacts_update_workspace_editor
    ON public.artifacts
    FOR UPDATE
    TO authenticated
    USING (
      workspace_id IS NULL
      OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
    )
    WITH CHECK (
      workspace_id IS NULL
      OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
    );
  END IF;

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
  'R3 repair: V7 tool execution control-plane rows with redacted input/output only.';

COMMENT ON TABLE public.tool_permissions IS
  'R3 repair: V7 workspace-scoped tool permission switches.';

COMMENT ON TABLE public.artifacts IS
  'R3 repair: V8 artifact assets with content/provenance parity for generated and user-authored assets.';
