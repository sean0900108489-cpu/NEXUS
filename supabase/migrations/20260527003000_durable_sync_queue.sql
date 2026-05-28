-- V4: Durable Sync Queue & Conflict Resolution
--
-- Additive-only migration for sync operation control-plane state.
-- This table tracks local-first sync operations; it does not create Agent Task,
-- Tool Run, Artifact Layer, feature flag, deployment check, or observability tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.sync_operations (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  operation_type text NOT NULL,
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  base_version text,
  remote_version text,
  status text NOT NULL,
  attempt_count int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  last_error_code text,
  last_error_message text,
  conflict_summary jsonb,
  next_retry_at timestamptz,
  locked_at timestamptz,
  lease_expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz,
  compacted_at timestamptz,
  cancelled_at timestamptz,
  CONSTRAINT sync_operations_entity_type_check
    CHECK (entity_type IN ('workspace', 'agent', 'message', 'prompt', 'notebook', 'artifact_reference')),
  CONSTRAINT sync_operations_operation_type_check
    CHECK (operation_type IN ('create', 'update', 'delete', 'upsert', 'patch', 'reorder', 'snapshot')),
  CONSTRAINT sync_operations_status_check
    CHECK (status IN ('pending', 'queued', 'syncing', 'synced', 'retrying', 'failed', 'conflicted', 'cancelled', 'compacted')),
  CONSTRAINT sync_operations_payload_hash_not_empty
    CHECK (length(trim(payload_hash)) > 0),
  CONSTRAINT sync_operations_payload_size_check
    CHECK (octet_length(payload::text) <= 131072),
  CONSTRAINT sync_operations_attempts_check
    CHECK (attempt_count >= 0 AND max_attempts > 0 AND attempt_count <= max_attempts)
);

CREATE INDEX IF NOT EXISTS idx_sync_operations_workspace_status
  ON public.sync_operations (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_sync_operations_next_retry
  ON public.sync_operations (next_retry_at)
  WHERE status IN ('queued', 'retrying');

CREATE INDEX IF NOT EXISTS idx_sync_operations_entity
  ON public.sync_operations (workspace_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_sync_operations_created_at
  ON public.sync_operations (created_at);

CREATE INDEX IF NOT EXISTS idx_sync_operations_lease
  ON public.sync_operations (lease_expires_at)
  WHERE status IN ('queued', 'retrying', 'syncing');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_sync_operations_updated_at'
  ) THEN
    CREATE TRIGGER set_sync_operations_updated_at
    BEFORE UPDATE ON public.sync_operations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.sync_operations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sync_operations'
      AND policyname = 'sync_operations_select_member'
  ) THEN
    CREATE POLICY sync_operations_select_member
    ON public.sync_operations
    FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sync_operations'
      AND policyname = 'sync_operations_insert_editor'
  ) THEN
    CREATE POLICY sync_operations_insert_editor
    ON public.sync_operations
    FOR INSERT
    TO authenticated
    WITH CHECK (
      public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
      AND (created_by IS NULL OR created_by = auth.uid())
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sync_operations'
      AND policyname = 'sync_operations_update_editor'
  ) THEN
    CREATE POLICY sync_operations_update_editor
    ON public.sync_operations
    FOR UPDATE
    TO authenticated
    USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']))
    WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
  END IF;
END $$;

COMMENT ON TABLE public.sync_operations IS
  'V4 durable sync queue control-plane table. Payloads must be bounded, secret-free, and limited to workspace, agent, message, prompt, notebook, and artifact reference operations.';
