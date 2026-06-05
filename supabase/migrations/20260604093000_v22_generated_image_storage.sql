-- V22: Durable generated image asset storage.
--
-- Purpose:
-- - Generated-image artifact rows must not depend on Vercel function memory.
-- - Owner/admin/editor users may upload generated assets.
-- - Workspace viewers may download historical generated assets, but cannot
--   mutate the bucket.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'nexus-generated-assets',
  'nexus-generated-assets',
  FALSE,
  20971520,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id)
DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'nexus_generated_assets_select_member'
  ) THEN
    CREATE POLICY nexus_generated_assets_select_member
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'nexus-generated-assets'
      AND public.is_workspace_member(split_part(name, '/', 1))
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'nexus_generated_assets_insert_editor'
  ) THEN
    CREATE POLICY nexus_generated_assets_insert_editor
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'nexus-generated-assets'
      AND public.has_workspace_role(split_part(name, '/', 1), ARRAY['owner', 'admin', 'editor'])
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'nexus_generated_assets_update_editor'
  ) THEN
    CREATE POLICY nexus_generated_assets_update_editor
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'nexus-generated-assets'
      AND public.has_workspace_role(split_part(name, '/', 1), ARRAY['owner', 'admin', 'editor'])
    )
    WITH CHECK (
      bucket_id = 'nexus-generated-assets'
      AND public.has_workspace_role(split_part(name, '/', 1), ARRAY['owner', 'admin', 'editor'])
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'nexus_generated_assets_delete_editor'
  ) THEN
    CREATE POLICY nexus_generated_assets_delete_editor
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'nexus-generated-assets'
      AND public.has_workspace_role(split_part(name, '/', 1), ARRAY['owner', 'admin', 'editor'])
    );
  END IF;
END $$;
