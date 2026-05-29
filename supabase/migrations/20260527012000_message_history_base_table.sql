-- V16: Message History Base Table Guard
--
-- This closes the V16 migration assumption that public.messages already exists.
-- It is additive and recovery-safe: existing rows are not deleted, broad
-- workspace_id NULL visibility is removed from policies, and archive/tombstone
-- style fields remain projections rather than delete proof.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.messages (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id text NOT NULL,
  agent_id text NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'assistant',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL DEFAULT auth.uid(),
  role text NULL,
  task_id uuid NULL,
  source_tool_run_id uuid NULL,
  token_count int NULL,
  content_hash text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active_window boolean NOT NULL DEFAULT true,
  archived_at timestamptz NULL,
  updated_at timestamptz NULL DEFAULT now(),
  CONSTRAINT messages_type_check
    CHECK (type IN ('user', 'assistant', 'system', 'tool')),
  CONSTRAINT messages_role_check
    CHECK (role IS NULL OR role IN ('user', 'assistant', 'system', 'tool')),
  CONSTRAINT messages_token_count_check
    CHECK (token_count IS NULL OR token_count >= 0),
  CONSTRAINT messages_workspace_id_required
    CHECK (workspace_id IS NOT NULL AND btrim(workspace_id) <> '')
);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS workspace_id text,
  ADD COLUMN IF NOT EXISTS agent_id text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'assistant',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS task_id uuid,
  ADD COLUMN IF NOT EXISTS source_tool_run_id uuid,
  ADD COLUMN IF NOT EXISTS token_count int,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active_window boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.messages
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_by SET DEFAULT auth.uid(),
  ALTER COLUMN type SET DEFAULT 'assistant',
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN is_active_window SET DEFAULT true,
  ALTER COLUMN updated_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_workspace_id_required'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_workspace_id_required
      CHECK (workspace_id IS NOT NULL AND btrim(workspace_id) <> '')
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_type_check'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_type_check
      CHECK (type IS NULL OR type IN ('user', 'assistant', 'system', 'tool'))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_role_check'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_role_check
      CHECK (role IS NULL OR role IN ('user', 'assistant', 'system', 'tool'))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_token_count_check'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_token_count_check
      CHECK (token_count IS NULL OR token_count >= 0)
      NOT VALID;
  END IF;

  IF to_regclass('public.agent_tasks') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'messages_task_id_fkey'
        AND conrelid = 'public.messages'::regclass
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
        AND conrelid = 'public.messages'::regclass
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
      AND tgrelid = 'public.messages'::regclass
  ) THEN
    CREATE TRIGGER set_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_workspace_agent_created
  ON public.messages (workspace_id, agent_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_messages_task
  ON public.messages (task_id);

CREATE INDEX IF NOT EXISTS idx_messages_active_window
  ON public.messages (workspace_id, agent_id, is_active_window, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_source_tool_run
  ON public.messages (source_tool_run_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_select_workspace_member ON public.messages;
DROP POLICY IF EXISTS messages_insert_workspace_editor ON public.messages;
DROP POLICY IF EXISTS messages_update_workspace_editor ON public.messages;
DROP POLICY IF EXISTS messages_delete_workspace_editor ON public.messages;

CREATE POLICY messages_select_workspace_member
ON public.messages
FOR SELECT
TO authenticated
USING (
  workspace_id IS NOT NULL
  AND public.is_workspace_member(workspace_id)
);

CREATE POLICY messages_insert_workspace_editor
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IS NOT NULL
  AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
);

CREATE POLICY messages_update_workspace_editor
ON public.messages
FOR UPDATE
TO authenticated
USING (
  workspace_id IS NOT NULL
  AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
)
WITH CHECK (
  workspace_id IS NOT NULL
  AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
);

CREATE POLICY messages_delete_workspace_editor
ON public.messages
FOR DELETE
TO authenticated
USING (
  workspace_id IS NOT NULL
  AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
);

COMMENT ON TABLE public.messages IS
  'V16 durable message history base table. workspace_id is required for visibility; remote empty results are not delete proof.';

COMMENT ON COLUMN public.messages.content_hash IS
  'V16 idempotency guard input for message.id + content hash conflict detection.';

COMMENT ON COLUMN public.messages.archived_at IS
  'Projection hint only; not a delete tombstone and not proof that local visible content should be removed.';
