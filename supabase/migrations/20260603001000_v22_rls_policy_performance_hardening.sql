-- V22: RLS Policy Performance Hardening
--
-- This migration addresses Supabase advisor RLS performance warnings without
-- changing data, indexes, grants, or server-only table boundaries.
-- - Wrap fixed auth.uid() calls with SELECT so Postgres can use an initPlan.
-- - Split agent_memory_records write policy so SELECT does not evaluate both
--   the read policy and a broad all-actions write policy.

DO $$
BEGIN
  IF to_regclass('public.agent_runtime_sessions') IS NOT NULL THEN
    ALTER TABLE public.agent_runtime_sessions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS agent_runtime_sessions_insert_editor
      ON public.agent_runtime_sessions;

    CREATE POLICY agent_runtime_sessions_insert_editor
    ON public.agent_runtime_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (
      public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
      AND user_id = (SELECT auth.uid())
    );
  END IF;

  IF to_regclass('public.tool_runs') IS NOT NULL THEN
    ALTER TABLE public.tool_runs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS tool_runs_insert_operator
      ON public.tool_runs;

    CREATE POLICY tool_runs_insert_operator
    ON public.tool_runs
    FOR INSERT
    TO authenticated
    WITH CHECK (
      public.has_workspace_role(workspace_id, ARRAY['owner', 'admin'])
      AND (created_by IS NULL OR created_by = (SELECT auth.uid()))
    );
  END IF;

  IF to_regclass('public.agent_memory_records') IS NOT NULL THEN
    ALTER TABLE public.agent_memory_records ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
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

    DROP POLICY IF EXISTS agent_memory_records_write_editor
      ON public.agent_memory_records;
    DROP POLICY IF EXISTS agent_memory_records_insert_editor
      ON public.agent_memory_records;
    DROP POLICY IF EXISTS agent_memory_records_update_editor
      ON public.agent_memory_records;
    DROP POLICY IF EXISTS agent_memory_records_delete_editor
      ON public.agent_memory_records;

    CREATE POLICY agent_memory_records_insert_editor
    ON public.agent_memory_records
    FOR INSERT
    TO authenticated
    WITH CHECK (
      public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
    );

    CREATE POLICY agent_memory_records_update_editor
    ON public.agent_memory_records
    FOR UPDATE
    TO authenticated
    USING (
      public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
    )
    WITH CHECK (
      public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
    );

    CREATE POLICY agent_memory_records_delete_editor
    ON public.agent_memory_records
    FOR DELETE
    TO authenticated
    USING (
      public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
    );
  END IF;
END $$;
