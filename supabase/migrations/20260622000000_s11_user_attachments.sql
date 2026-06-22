-- S11: User attachment storage and metadata table.
--
-- Purpose:
-- - Store attachment metadata for Global Chat and Workspace uploads.
-- - RLS ensures users can only access their own attachments.
-- - Soft-delete support via deleted_at.

CREATE TABLE IF NOT EXISTS public.user_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('global-chat', 'workspace')),
  workspace_id UUID,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploading', 'uploaded', 'processing', 'ready', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Index for user-scoped queries
CREATE INDEX IF NOT EXISTS idx_user_attachments_user_id ON public.user_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_attachments_scope ON public.user_attachments(scope);
CREATE INDEX IF NOT EXISTS idx_user_attachments_workspace_id ON public.user_attachments(workspace_id);

-- Enable RLS
ALTER TABLE public.user_attachments ENABLE ROW LEVEL SECURITY;

-- Users can SELECT their own attachments
DROP POLICY IF EXISTS user_attachments_select_owner ON public.user_attachments;
CREATE POLICY user_attachments_select_owner ON public.user_attachments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can INSERT their own attachments
DROP POLICY IF EXISTS user_attachments_insert_owner ON public.user_attachments;
CREATE POLICY user_attachments_insert_owner ON public.user_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can UPDATE (soft-delete) their own attachments
DROP POLICY IF EXISTS user_attachments_update_owner ON public.user_attachments;
CREATE POLICY user_attachments_update_owner ON public.user_attachments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can DELETE their own attachments (soft-delete preferred, but hard delete allowed)
DROP POLICY IF EXISTS user_attachments_delete_owner ON public.user_attachments;
CREATE POLICY user_attachments_delete_owner ON public.user_attachments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
