-- V16: Durable Prompts & Recoverable Tombstones
--
-- Additive prompt durability support. Deletes are represented as tombstones
-- so remote absence is never treated as delete proof.

CREATE TABLE IF NOT EXISTS public.prompts (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Prompt',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  CONSTRAINT prompts_workspace_id_not_blank
    CHECK (length(trim(workspace_id)) > 0),
  CONSTRAINT prompts_title_not_blank
    CHECK (length(trim(title)) > 0),
  CONSTRAINT prompts_deleted_by_requires_tombstone
    CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL)
);

ALTER TABLE public.prompts
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS idx_prompts_workspace_visible_updated
  ON public.prompts (workspace_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_prompts_workspace_deleted
  ON public.prompts (workspace_id, deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
      AND pronamespace = 'public'::regnamespace
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_prompts_updated_at'
  ) THEN
    CREATE TRIGGER set_prompts_updated_at
    BEFORE UPDATE ON public.prompts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prompts_select_workspace_member ON public.prompts;
DROP POLICY IF EXISTS prompts_insert_workspace_editor ON public.prompts;
DROP POLICY IF EXISTS prompts_update_workspace_editor ON public.prompts;
DROP POLICY IF EXISTS prompts_delete_workspace_editor ON public.prompts;

CREATE POLICY prompts_select_workspace_member
ON public.prompts
FOR SELECT
TO authenticated
USING (
  workspace_id IS NOT NULL
  AND public.is_workspace_member(workspace_id)
);

CREATE POLICY prompts_insert_workspace_editor
ON public.prompts
FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IS NOT NULL
  AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
);

CREATE POLICY prompts_update_workspace_editor
ON public.prompts
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

CREATE POLICY prompts_delete_workspace_editor
ON public.prompts
FOR DELETE
TO authenticated
USING (
  workspace_id IS NOT NULL
  AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
);

COMMENT ON COLUMN public.prompts.deleted_at IS
  'Recoverable tombstone timestamp. Visible prompt fetches should filter this column.';
