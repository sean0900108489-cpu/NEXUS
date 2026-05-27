-- V3: Canonical Cloud Workspace State
--
-- Additive-only migration. This creates cloud snapshot and projection tables
-- without changing existing workspaces id/name upsert compatibility.
-- workspace_snapshots is the durable restore/hydration anchor.
-- workspace_state_entities is rebuildable projection cache only.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.workspace_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  user_id uuid NOT NULL,
  schema_version int NOT NULL,
  snapshot_type text NOT NULL,
  payload jsonb NOT NULL,
  checksum text NOT NULL,
  payload_size_bytes int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_snapshots_type_check
    CHECK (snapshot_type IN ('active', 'checkpoint', 'imported', 'recovered')),
  CONSTRAINT workspace_snapshots_payload_size_nonnegative
    CHECK (payload_size_bytes >= 0),
  CONSTRAINT workspace_snapshots_checksum_not_empty
    CHECK (length(trim(checksum)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_workspace_updated
  ON public.workspace_snapshots (workspace_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_user_workspace
  ON public.workspace_snapshots (user_id, workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_checksum
  ON public.workspace_snapshots (workspace_id, checksum);

CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_type_updated
  ON public.workspace_snapshots (workspace_id, snapshot_type, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.workspace_state_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  schema_version int NOT NULL,
  payload jsonb NOT NULL,
  checksum text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_state_entities_type_check
    CHECK (entity_type IN ('agent', 'graph', 'settings', 'theme', 'memory', 'tool_state', 'branch')),
  CONSTRAINT workspace_state_entities_unique
    UNIQUE (workspace_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_state_entities_workspace_type
  ON public.workspace_state_entities (workspace_id, entity_type);

CREATE INDEX IF NOT EXISTS idx_workspace_state_entities_entity
  ON public.workspace_state_entities (workspace_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_workspace_state_entities_updated
  ON public.workspace_state_entities (workspace_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_workspace_snapshots_updated_at'
  ) THEN
    CREATE TRIGGER set_workspace_snapshots_updated_at
    BEFORE UPDATE ON public.workspace_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_workspace_state_entities_updated_at'
  ) THEN
    CREATE TRIGGER set_workspace_state_entities_updated_at
    BEFORE UPDATE ON public.workspace_state_entities
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.workspace_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_state_entities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workspace_snapshots'
      AND policyname = 'workspace_snapshots_select_member'
  ) THEN
    CREATE POLICY workspace_snapshots_select_member
    ON public.workspace_snapshots
    FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workspace_snapshots'
      AND policyname = 'workspace_snapshots_insert_editor'
  ) THEN
    CREATE POLICY workspace_snapshots_insert_editor
    ON public.workspace_snapshots
    FOR INSERT
    TO authenticated
    WITH CHECK (
      public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
      AND user_id = auth.uid()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workspace_snapshots'
      AND policyname = 'workspace_snapshots_update_editor'
  ) THEN
    CREATE POLICY workspace_snapshots_update_editor
    ON public.workspace_snapshots
    FOR UPDATE
    TO authenticated
    USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']))
    WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workspace_state_entities'
      AND policyname = 'workspace_state_entities_select_member'
  ) THEN
    CREATE POLICY workspace_state_entities_select_member
    ON public.workspace_state_entities
    FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workspace_state_entities'
      AND policyname = 'workspace_state_entities_insert_editor'
  ) THEN
    CREATE POLICY workspace_state_entities_insert_editor
    ON public.workspace_state_entities
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workspace_state_entities'
      AND policyname = 'workspace_state_entities_update_editor'
  ) THEN
    CREATE POLICY workspace_state_entities_update_editor
    ON public.workspace_state_entities
    FOR UPDATE
    TO authenticated
    USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']))
    WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workspace_state_entities'
      AND policyname = 'workspace_state_entities_delete_editor'
  ) THEN
    CREATE POLICY workspace_state_entities_delete_editor
    ON public.workspace_state_entities
    FOR DELETE
    TO authenticated
    USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
  END IF;
END $$;

COMMENT ON TABLE public.workspace_snapshots IS
  'V3 canonical cloud workspace restore/hydration anchor. Payload must be bounded, redacted, and free of secrets, artifact binaries, full transcripts, agent tasks, tool runs, and sync queue records.';

COMMENT ON TABLE public.workspace_state_entities IS
  'V3 workspace projection cache rebuilt from workspace_snapshots. Not canonical truth; latest valid snapshot checksum wins.';
