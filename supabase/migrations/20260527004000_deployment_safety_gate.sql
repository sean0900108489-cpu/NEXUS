-- V5: Deployment Safety Gate & Runtime Health System
--
-- Additive-only migration for deployment preflight records and feature flags.
-- This migration does not create Agent Task, Tool Run, Artifact Layer,
-- deployment gate lifecycle tables beyond deployment_checks, or observability
-- tables.

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_feature_flags_updated_at'
  ) THEN
    CREATE TRIGGER set_feature_flags_updated_at
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_checks ENABLE ROW LEVEL SECURITY;

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
END $$;

-- deployment_checks intentionally has no authenticated client read/write
-- policy. Runtime/admin APIs use server-side repository paths and must sanitize
-- details before persisting check output.

COMMENT ON TABLE public.feature_flags IS
  'V5 feature flag table. scope_key __global__ is global; workspace-scoped flags use the workspace id. metadata must be sanitized and secret-free.';

COMMENT ON TABLE public.deployment_checks IS
  'V5 deployment preflight and admin check result table. details must never contain raw env values, API keys, tokens, connection strings, stack traces, or service-role keys.';
