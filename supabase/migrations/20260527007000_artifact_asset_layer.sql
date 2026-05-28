-- V8: Artifact Asset Layer & Provenance Graph
--
-- Additive-only artifact migration. This extends the existing artifacts table
-- with bounded content metadata, provenance fields, same-table version links,
-- and a separate reference table. It intentionally does not create V9 system
-- observability tables or V10 historical paging tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text,
  source_message_id text,
  content_url text NOT NULL DEFAULT '',
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

DO $$
BEGIN
  IF to_regclass('public.artifacts') IS NOT NULL THEN
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
      ADD COLUMN IF NOT EXISTS created_by uuid,
      ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

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

    IF to_regclass('public.tool_runs') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'artifacts_source_tool_run_id_fkey'
      )
    THEN
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
  ELSE
    RAISE NOTICE 'public.artifacts is absent; V8 additive artifact columns skipped.';
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

CREATE TABLE IF NOT EXISTS public.artifact_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  referenced_by_type text NOT NULL,
  referenced_by_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT artifact_references_referrer_type_check
    CHECK (referenced_by_type IN (
      'message',
      'notebook',
      'prompt',
      'macro',
      'agent_memory',
      'tool_run'
    )),
  CONSTRAINT artifact_references_unique_referrer
    UNIQUE (workspace_id, artifact_id, referenced_by_type, referenced_by_id)
);

CREATE INDEX IF NOT EXISTS idx_artifact_references_artifact
  ON public.artifact_references (artifact_id);

CREATE INDEX IF NOT EXISTS idx_artifact_references_referrer
  ON public.artifact_references (workspace_id, referenced_by_type, referenced_by_id);

ALTER TABLE public.artifact_references ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifact_references'
      AND policyname = 'artifact_references_select_member'
  ) THEN
    CREATE POLICY artifact_references_select_member
    ON public.artifact_references
    FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifact_references'
      AND policyname = 'artifact_references_insert_editor'
  ) THEN
    CREATE POLICY artifact_references_insert_editor
    ON public.artifact_references
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifact_references'
      AND policyname = 'artifact_references_delete_editor'
  ) THEN
    CREATE POLICY artifact_references_delete_editor
    ON public.artifact_references
    FOR DELETE
    TO authenticated
    USING (public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
  END IF;
END $$;

COMMENT ON TABLE public.artifacts IS
  'V8 artifact assets. content_text and preview_text must be size-bounded, redacted, and free of raw secrets.';

COMMENT ON COLUMN public.artifacts.content_hash IS
  'Content hash is for payload dedupe only. Artifact identity remains per provenance source.';

COMMENT ON TABLE public.artifact_references IS
  'V8 provenance/reference table linking artifacts to messages, notebooks, prompts, macros, agent memory, and tool runs.';
