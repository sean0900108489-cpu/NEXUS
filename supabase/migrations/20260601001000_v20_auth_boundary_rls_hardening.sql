-- V20: Auth boundary hardening for Phase 1 repair.
--
-- This migration removes legacy ownerless workspace write policy bridges and
-- explicitly keeps server-only tables out of anon/authenticated Data API grants.
-- It is intentionally schema-safe: no data is deleted or rewritten.

DO $$
BEGIN
    IF to_regclass('public.workspaces') IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'workspaces'
              AND column_name = 'owner_user_id'
        )
    THEN
        ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS workspaces_insert_owner_or_legacy ON public.workspaces;
        DROP POLICY IF EXISTS workspaces_insert_owner ON public.workspaces;

        CREATE POLICY workspaces_insert_owner
        ON public.workspaces
        FOR INSERT
        TO authenticated
        WITH CHECK (
            owner_user_id = (SELECT auth.uid())
            OR public.has_workspace_role(id, ARRAY['owner', 'admin'])
        );

        DROP POLICY IF EXISTS workspaces_update_editor_or_legacy ON public.workspaces;
        DROP POLICY IF EXISTS workspaces_update_editor ON public.workspaces;

        CREATE POLICY workspaces_update_editor
        ON public.workspaces
        FOR UPDATE
        TO authenticated
        USING (
            owner_user_id = (SELECT auth.uid())
            OR public.has_workspace_role(id, ARRAY['owner', 'admin', 'editor'])
        )
        WITH CHECK (
            owner_user_id = (SELECT auth.uid())
            OR public.has_workspace_role(id, ARRAY['owner', 'admin', 'editor'])
        );
    END IF;
END $$;

DO $$
DECLARE
    policy_record record;
BEGIN
    IF to_regclass('public.api_idempotency_keys') IS NOT NULL THEN
        ALTER TABLE public.api_idempotency_keys ENABLE ROW LEVEL SECURITY;

        FOR policy_record IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'api_idempotency_keys'
        LOOP
            EXECUTE format(
                'DROP POLICY IF EXISTS %I ON public.api_idempotency_keys',
                policy_record.policyname
            );
        END LOOP;

        REVOKE ALL PRIVILEGES ON TABLE public.api_idempotency_keys FROM anon, authenticated, PUBLIC;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.api_idempotency_keys TO service_role;

        COMMENT ON TABLE public.api_idempotency_keys IS
            'Server-only idempotency ledger. No anon/authenticated table grants or client RLS policies; accessed through trusted server service-role repositories only.';
    END IF;

    IF to_regclass('public.permission_audit_logs') IS NOT NULL THEN
        ALTER TABLE public.permission_audit_logs ENABLE ROW LEVEL SECURITY;

        FOR policy_record IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'permission_audit_logs'
        LOOP
            EXECUTE format(
                'DROP POLICY IF EXISTS %I ON public.permission_audit_logs',
                policy_record.policyname
            );
        END LOOP;

        REVOKE ALL PRIVILEGES ON TABLE public.permission_audit_logs FROM anon, authenticated, PUBLIC;
        GRANT SELECT, INSERT ON TABLE public.permission_audit_logs TO service_role;

        COMMENT ON TABLE public.permission_audit_logs IS
            'Server-only permission audit log. No anon/authenticated table grants or client RLS policies; accessed through trusted server service-role repositories only.';
    END IF;
END $$;
