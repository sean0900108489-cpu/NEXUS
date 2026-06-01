-- V20 schema live parity repair.
--
-- Additive-only repair for live Supabase drift found by Protocol 95.
-- Creates contract objects that already exist in local repositories/types but
-- were absent from the audited live project. No data is deleted or rewritten.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL,
  scope_key text NOT NULL DEFAULT '__global__',
  enabled boolean NOT NULL DEFAULT false,
  rollout_percentage int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feature_flags_key_scope_unique
    UNIQUE (flag_key, scope_key),
  CONSTRAINT feature_flags_rollout_percentage_check
    CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  CONSTRAINT feature_flags_key_not_empty
    CHECK (length(trim(flag_key)) > 0),
  CONSTRAINT feature_flags_scope_not_empty
    CHECK (length(trim(scope_key)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key_scope
  ON public.feature_flags (flag_key, scope_key);

CREATE TABLE IF NOT EXISTS public.deployment_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_version text,
  environment text NOT NULL,
  check_type text NOT NULL,
  status text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deployment_checks_environment_check
    CHECK (environment IN ('local', 'staging', 'production')),
  CONSTRAINT deployment_checks_status_check
    CHECK (status IN ('pending', 'running', 'passed', 'warning', 'failed', 'blocked')),
  CONSTRAINT deployment_checks_type_not_empty
    CHECK (length(trim(check_type)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_deployment_checks_release_created
  ON public.deployment_checks (release_version, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deployment_checks_status
  ON public.deployment_checks (status);

CREATE INDEX IF NOT EXISTS idx_deployment_checks_type_created
  ON public.deployment_checks (check_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_memory_records (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  agent_id text NOT NULL,
  memory_type text NOT NULL,
  content text NOT NULL,
  content_hash text,
  intensity int,
  source_task_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_memory_records_type_check
    CHECK (memory_type IN ('active', 'compressed', 'archived', 'context_note')),
  CONSTRAINT agent_memory_records_intensity_check
    CHECK (intensity IS NULL OR (intensity >= 0 AND intensity <= 100))
);

DO $$
BEGIN
  IF to_regclass('public.agent_tasks') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'agent_memory_records_source_task_id_fkey'
    )
  THEN
    ALTER TABLE public.agent_memory_records
      ADD CONSTRAINT agent_memory_records_source_task_id_fkey
      FOREIGN KEY (source_task_id)
      REFERENCES public.agent_tasks(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_memory_workspace_agent_type
  ON public.agent_memory_records (workspace_id, agent_id, memory_type, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_source_task
  ON public.agent_memory_records (source_task_id);

DO $$
BEGIN
  IF to_regclass('public.workspace_state_entities') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM pg_proc
      WHERE proname = 'set_updated_at'
        AND pronamespace = 'public'::regnamespace
    )
    AND NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'set_workspace_state_entities_updated_at'
        AND tgrelid = 'public.workspace_state_entities'::regclass
    )
  THEN
    CREATE TRIGGER set_workspace_state_entities_updated_at
    BEFORE UPDATE ON public.workspace_state_entities
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
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'set_feature_flags_updated_at'
        AND tgrelid = 'public.feature_flags'::regclass
    )
  THEN
    CREATE TRIGGER set_feature_flags_updated_at
    BEFORE UPDATE ON public.feature_flags
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
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'set_agent_memory_records_updated_at'
        AND tgrelid = 'public.agent_memory_records'::regclass
    )
  THEN
    CREATE TRIGGER set_agent_memory_records_updated_at
    BEFORE UPDATE ON public.agent_memory_records
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'feature_flags'
      AND policyname = 'feature_flags_select_visible_scope'
  ) THEN
    CREATE POLICY feature_flags_select_visible_scope
    ON public.feature_flags
    FOR SELECT
    TO authenticated
    USING (
      scope_key = '__global__'
      OR public.is_workspace_member(scope_key)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'feature_flags'
      AND policyname = 'feature_flags_insert_workspace_admin'
  ) THEN
    CREATE POLICY feature_flags_insert_workspace_admin
    ON public.feature_flags
    FOR INSERT
    TO authenticated
    WITH CHECK (
      scope_key <> '__global__'
      AND public.has_workspace_role(scope_key, ARRAY['owner', 'admin'])
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'feature_flags'
      AND policyname = 'feature_flags_update_workspace_admin'
  ) THEN
    CREATE POLICY feature_flags_update_workspace_admin
    ON public.feature_flags
    FOR UPDATE
    TO authenticated
    USING (
      scope_key <> '__global__'
      AND public.has_workspace_role(scope_key, ARRAY['owner', 'admin'])
    )
    WITH CHECK (
      scope_key <> '__global__'
      AND public.has_workspace_role(scope_key, ARRAY['owner', 'admin'])
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_memory_records'
      AND policyname = 'agent_memory_records_select_member'
  ) THEN
    CREATE POLICY agent_memory_records_select_member
    ON public.agent_memory_records
    FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_memory_records'
      AND policyname = 'agent_memory_records_write_editor'
  ) THEN
    CREATE POLICY agent_memory_records_write_editor
    ON public.agent_memory_records
    FOR ALL
    TO authenticated
    USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']))
    WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
  END IF;
END $$;

REVOKE ALL PRIVILEGES ON TABLE public.feature_flags FROM anon, PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.deployment_checks FROM anon, authenticated, PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.agent_memory_records FROM anon, PUBLIC;

GRANT SELECT, INSERT, UPDATE ON TABLE public.feature_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agent_memory_records TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.feature_flags TO service_role;
GRANT SELECT, INSERT ON TABLE public.deployment_checks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agent_memory_records TO service_role;

COMMENT ON TABLE public.feature_flags IS
  'V20 parity repair: feature flag table. scope_key __global__ is global; workspace-scoped flags use the workspace id.';

COMMENT ON TABLE public.deployment_checks IS
  'V20 parity repair: server-only deployment preflight records. No anon/authenticated table grants or client policies.';

COMMENT ON TABLE public.agent_memory_records IS
  'V20 parity repair: bounded relational memory records. No vector database or semantic search lifecycle is created here.';
