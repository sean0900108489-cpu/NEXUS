-- V16: Durable Notebooks & Recoverable Tombstones
--
-- Additive migration for Datapad/Notebook durable sync. Deletes are represented
-- as tombstones so a remote empty result is never treated as delete proof.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.notebooks (
  id text PRIMARY KEY,
  workspace_id text,
  title text NOT NULL DEFAULT 'Untitled Datapad',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  CONSTRAINT notebooks_workspace_id_not_blank
    CHECK (workspace_id IS NULL OR length(trim(workspace_id)) > 0),
  CONSTRAINT notebooks_title_not_blank
    CHECK (length(trim(title)) > 0),
  CONSTRAINT notebooks_title_length_check
    CHECK (char_length(title) <= 200),
  CONSTRAINT notebooks_content_size_check
    CHECK (octet_length(content) <= 131072),
  CONSTRAINT notebooks_deleted_by_requires_tombstone
    CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

ALTER TABLE public.notebooks
  ADD COLUMN IF NOT EXISTS workspace_id text,
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Untitled Datapad',
  ADD COLUMN IF NOT EXISTS content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notebooks_workspace_id_not_blank'
  ) THEN
    ALTER TABLE public.notebooks
      ADD CONSTRAINT notebooks_workspace_id_not_blank
      CHECK (workspace_id IS NULL OR length(trim(workspace_id)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notebooks_title_not_blank'
  ) THEN
    ALTER TABLE public.notebooks
      ADD CONSTRAINT notebooks_title_not_blank
      CHECK (length(trim(title)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notebooks_title_length_check'
  ) THEN
    ALTER TABLE public.notebooks
      ADD CONSTRAINT notebooks_title_length_check
      CHECK (char_length(title) <= 200);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notebooks_content_size_check'
  ) THEN
    ALTER TABLE public.notebooks
      ADD CONSTRAINT notebooks_content_size_check
      CHECK (octet_length(content) <= 131072);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notebooks_deleted_by_requires_tombstone'
  ) THEN
    ALTER TABLE public.notebooks
      ADD CONSTRAINT notebooks_deleted_by_requires_tombstone
      CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notebooks_global_created_by_required'
  ) THEN
    ALTER TABLE public.notebooks
      ADD CONSTRAINT notebooks_global_created_by_required
      CHECK (workspace_id IS NOT NULL OR created_by IS NOT NULL)
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notebooks_workspace_visible_updated
  ON public.notebooks (workspace_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notebooks_workspace_deleted
  ON public.notebooks (workspace_id, deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notebooks_global_owner_visible_updated
  ON public.notebooks (created_by, updated_at DESC)
  WHERE workspace_id IS NULL AND deleted_at IS NULL;

ALTER TABLE public.notebooks
  ALTER COLUMN created_by SET DEFAULT auth.uid();

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
    WHERE tgname = 'set_notebooks_updated_at'
  ) THEN
    CREATE TRIGGER set_notebooks_updated_at
    BEFORE UPDATE ON public.notebooks
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS notebooks_select_workspace_member ON public.notebooks;
  DROP POLICY IF EXISTS notebooks_insert_workspace_editor ON public.notebooks;
  DROP POLICY IF EXISTS notebooks_update_workspace_editor ON public.notebooks;
  DROP POLICY IF EXISTS notebooks_delete_workspace_editor ON public.notebooks;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notebooks'
      AND policyname = 'notebooks_select_workspace_member'
  ) THEN
    CREATE POLICY notebooks_select_workspace_member
    ON public.notebooks
    FOR SELECT
    TO authenticated
    USING (
      (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
      OR (workspace_id IS NULL AND created_by = auth.uid())
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notebooks'
      AND policyname = 'notebooks_insert_workspace_editor'
  ) THEN
    CREATE POLICY notebooks_insert_workspace_editor
    ON public.notebooks
    FOR INSERT
    TO authenticated
    WITH CHECK (
      (workspace_id IS NOT NULL AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']))
      OR (workspace_id IS NULL AND created_by = auth.uid())
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notebooks'
      AND policyname = 'notebooks_update_workspace_editor'
  ) THEN
    CREATE POLICY notebooks_update_workspace_editor
    ON public.notebooks
    FOR UPDATE
    TO authenticated
    USING (
      (workspace_id IS NOT NULL AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']))
      OR (workspace_id IS NULL AND created_by = auth.uid())
    )
    WITH CHECK (
      (workspace_id IS NOT NULL AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']))
      OR (workspace_id IS NULL AND created_by = auth.uid())
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notebooks'
      AND policyname = 'notebooks_delete_workspace_editor'
  ) THEN
    CREATE POLICY notebooks_delete_workspace_editor
    ON public.notebooks
    FOR DELETE
    TO authenticated
    USING (
      (workspace_id IS NOT NULL AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']))
      OR (workspace_id IS NULL AND created_by = auth.uid())
    );
  END IF;
END $$;

COMMENT ON TABLE public.notebooks IS
  'V16 durable Datapad/Notebook table. Deletes use deleted_at tombstones; remote empty results are not delete proof.';

COMMENT ON COLUMN public.notebooks.deleted_at IS
  'Recoverable tombstone timestamp. Visible fetches should filter this column instead of treating absence as deletion proof.';

COMMENT ON CONSTRAINT notebooks_global_created_by_required ON public.notebooks IS
  'V16 account-scoped Global Datapads: new workspace_id NULL rows must have an owner. Legacy null-owner rows are preserved but hidden until backfilled.';
