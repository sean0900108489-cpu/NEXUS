-- S11: User attachment storage bucket and RLS policies.
--
-- Purpose:
-- - Dedicated bucket for user-uploaded attachments (Global Chat + Workspace).
-- - Files are private (NOT public).
-- - Path pattern: {userId}/{scope}/{attachmentId}/{filename}
-- - RLS: owner-only access via storage.foldername().

-- Create or update the bucket
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'user-attachments',
  'user-attachments',
  FALSE,
  20971520,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'application/xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id)
DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  -- SELECT: user can read their own attachments
  -- Path pattern: {userId}/...
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'user_attachments_select_owner'
  ) THEN
    CREATE POLICY user_attachments_select_owner
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'user-attachments'
      AND ((storage.foldername(name))[1])::text = (auth.uid())::text
    );
  END IF;

  -- INSERT: user can upload to their own folder
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'user_attachments_insert_owner'
  ) THEN
    CREATE POLICY user_attachments_insert_owner
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'user-attachments'
      AND ((storage.foldername(name))[1])::text = (auth.uid())::text
    );
  END IF;

  -- UPDATE: user can update their own attachments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'user_attachments_update_owner'
  ) THEN
    CREATE POLICY user_attachments_update_owner
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'user-attachments'
      AND ((storage.foldername(name))[1])::text = (auth.uid())::text
    )
    WITH CHECK (
      bucket_id = 'user-attachments'
      AND ((storage.foldername(name))[1])::text = (auth.uid())::text
    );
  END IF;

  -- DELETE: user can delete their own attachments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'user_attachments_delete_owner'
  ) THEN
    CREATE POLICY user_attachments_delete_owner
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'user-attachments'
      AND ((storage.foldername(name))[1])::text = (auth.uid())::text
    );
  END IF;
END $$;
