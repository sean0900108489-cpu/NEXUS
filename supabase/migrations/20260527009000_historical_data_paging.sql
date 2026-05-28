-- V10: Historical Data Paging & Storage Partition
--
-- Additive-only migration for message paging fields and bounded agent memory
-- records. Archive is a projection hint only and does not delete messages,
-- agent task links, tool run links, or artifact references.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF to_regclass('public.messages') IS NOT NULL THEN
    ALTER TABLE public.messages
      ADD COLUMN IF NOT EXISTS role text,
      ADD COLUMN IF NOT EXISTS task_id uuid,
      ADD COLUMN IF NOT EXISTS source_tool_run_id uuid,
      ADD COLUMN IF NOT EXISTS token_count int,
      ADD COLUMN IF NOT EXISTS content_hash text,
      ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS is_active_window boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS archived_at timestamptz,
      ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'messages_role_check'
    ) THEN
      ALTER TABLE public.messages
        ADD CONSTRAINT messages_role_check
        CHECK (role IS NULL OR role IN ('user', 'assistant', 'system', 'tool'));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'messages_token_count_check'
    ) THEN
      ALTER TABLE public.messages
        ADD CONSTRAINT messages_token_count_check
        CHECK (token_count IS NULL OR token_count >= 0);
    END IF;

    IF to_regclass('public.agent_tasks') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'messages_task_id_fkey'
      )
    THEN
      ALTER TABLE public.messages
        ADD CONSTRAINT messages_task_id_fkey
        FOREIGN KEY (task_id)
        REFERENCES public.agent_tasks(id)
        ON DELETE SET NULL;
    END IF;

    IF to_regclass('public.tool_runs') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'messages_source_tool_run_id_fkey'
      )
    THEN
      ALTER TABLE public.messages
        ADD CONSTRAINT messages_source_tool_run_id_fkey
        FOREIGN KEY (source_tool_run_id)
        REFERENCES public.tool_runs(id)
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
      WHERE tgname = 'set_messages_updated_at'
    ) THEN
      CREATE TRIGGER set_messages_updated_at
      BEFORE UPDATE ON public.messages
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
    END IF;
  ELSE
    RAISE NOTICE 'public.messages is absent; V10 message paging columns skipped.';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.messages') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_messages_workspace_agent_created
      ON public.messages (workspace_id, agent_id, created_at DESC, id DESC);

    CREATE INDEX IF NOT EXISTS idx_messages_task
      ON public.messages (task_id);

    CREATE INDEX IF NOT EXISTS idx_messages_active_window
      ON public.messages (workspace_id, agent_id, is_active_window, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_messages_source_tool_run
      ON public.messages (source_tool_run_id);
  END IF;
END $$;

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
      SELECT 1 FROM pg_constraint
      WHERE conname = 'agent_memory_records_source_task_id_fkey'
    )
  THEN
    ALTER TABLE public.agent_memory_records
      ADD CONSTRAINT agent_memory_records_source_task_id_fkey
      FOREIGN KEY (source_task_id)
      REFERENCES public.agent_tasks(id)
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
    WHERE tgname = 'set_agent_memory_records_updated_at'
  ) THEN
    CREATE TRIGGER set_agent_memory_records_updated_at
    BEFORE UPDATE ON public.agent_memory_records
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_memory_workspace_agent_type
  ON public.agent_memory_records (workspace_id, agent_id, memory_type, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_source_task
  ON public.agent_memory_records (source_task_id);

ALTER TABLE public.agent_memory_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
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

-- Backfill helper: deliberately not executed by this migration. Run repeatedly
-- in small batches after deploy, for example:
--   select public.backfill_message_history_fields(1000);
CREATE OR REPLACE FUNCTION public.backfill_message_history_fields(batch_size int DEFAULT 1000)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count int;
BEGIN
  IF to_regclass('public.messages') IS NULL THEN
    RETURN 0;
  END IF;

  WITH batch AS (
    SELECT id
    FROM public.messages
    WHERE role IS NULL
       OR content_hash IS NULL
       OR token_count IS NULL
       OR is_active_window IS NULL
    ORDER BY created_at ASC
    LIMIT GREATEST(1, LEAST(batch_size, 5000))
  )
  UPDATE public.messages messages
  SET
    role = COALESCE(
      messages.role,
      CASE
        WHEN messages.type IN ('user', 'assistant', 'system', 'tool') THEN messages.type
        ELSE 'assistant'
      END
    ),
    content_hash = COALESCE(
      messages.content_hash,
      'sha256:' || encode(digest(COALESCE(messages.content, ''), 'sha256'), 'hex')
    ),
    token_count = COALESCE(
      messages.token_count,
      GREATEST(1, CEIL(length(COALESCE(messages.content, '')) / 4.0)::int)
    ),
    is_active_window = COALESCE(messages.is_active_window, true),
    metadata = COALESCE(messages.metadata, '{}'::jsonb),
    updated_at = COALESCE(messages.updated_at, now())
  FROM batch
  WHERE messages.id = batch.id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END $$;

DO $$
BEGIN
  IF to_regclass('public.messages') IS NOT NULL THEN
    COMMENT ON COLUMN public.messages.is_active_window IS
      'V10 backend-maintained active window projection hint. Frontend must not decide this per row.';
  END IF;
END $$;

COMMENT ON TABLE public.agent_memory_records IS
  'V10 bounded relational memory records. No vector database or semantic search lifecycle is created in V10.';
