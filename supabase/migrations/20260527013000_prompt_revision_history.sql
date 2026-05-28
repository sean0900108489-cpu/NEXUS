-- V16: Prompt Revision Durability
--
-- Revisions are an append/idempotent projection of prompt edits. They protect
-- edit history without creating a second prompt store and without turning
-- remote empty results into delete proof.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.prompt_revisions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  prompt_id text NOT NULL,
  previous_content text NOT NULL DEFAULT '',
  new_content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prompt_revisions_prompt_id_not_blank
    CHECK (length(trim(prompt_id)) > 0)
);

ALTER TABLE public.prompt_revisions
  ADD COLUMN IF NOT EXISTS prompt_id text,
  ADD COLUMN IF NOT EXISTS previous_content text DEFAULT '',
  ADD COLUMN IF NOT EXISTS new_content text DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.prompt_revisions
  ALTER COLUMN previous_content SET DEFAULT '',
  ALTER COLUMN new_content SET DEFAULT '',
  ALTER COLUMN created_at SET DEFAULT now();

DO $$
BEGIN
  IF to_regclass('public.prompts') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'prompt_revisions_prompt_id_fkey'
        AND conrelid = 'public.prompt_revisions'::regclass
    )
  THEN
    ALTER TABLE public.prompt_revisions
      ADD CONSTRAINT prompt_revisions_prompt_id_fkey
      FOREIGN KEY (prompt_id)
      REFERENCES public.prompts(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prompt_revisions_prompt_id_not_blank'
      AND conrelid = 'public.prompt_revisions'::regclass
  ) THEN
    ALTER TABLE public.prompt_revisions
      ADD CONSTRAINT prompt_revisions_prompt_id_not_blank
      CHECK (length(trim(prompt_id)) > 0)
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prompt_revisions_prompt_created
  ON public.prompt_revisions (prompt_id, created_at DESC, id DESC);

ALTER TABLE public.prompt_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prompt_revisions_select_workspace_member ON public.prompt_revisions;
DROP POLICY IF EXISTS prompt_revisions_insert_workspace_editor ON public.prompt_revisions;
DROP POLICY IF EXISTS prompt_revisions_update_workspace_editor ON public.prompt_revisions;

CREATE POLICY prompt_revisions_select_workspace_member
ON public.prompt_revisions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.prompts prompts
    WHERE prompts.id = prompt_revisions.prompt_id
      AND public.is_workspace_member(prompts.workspace_id)
  )
);

CREATE POLICY prompt_revisions_insert_workspace_editor
ON public.prompt_revisions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.prompts prompts
    WHERE prompts.id = prompt_revisions.prompt_id
      AND public.has_workspace_role(prompts.workspace_id, ARRAY['owner', 'admin', 'editor'])
  )
);

CREATE POLICY prompt_revisions_update_workspace_editor
ON public.prompt_revisions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.prompts prompts
    WHERE prompts.id = prompt_revisions.prompt_id
      AND public.has_workspace_role(prompts.workspace_id, ARRAY['owner', 'admin', 'editor'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.prompts prompts
    WHERE prompts.id = prompt_revisions.prompt_id
      AND public.has_workspace_role(prompts.workspace_id, ARRAY['owner', 'admin', 'editor'])
  )
);

COMMENT ON TABLE public.prompt_revisions IS
  'V16 prompt revision projection. Current prompt content remains canonical in public.prompts; revisions are edit history only.';
