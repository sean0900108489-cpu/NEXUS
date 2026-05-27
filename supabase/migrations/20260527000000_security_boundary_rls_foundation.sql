-- V1: Backend Security Boundary & RLS Foundation
--
-- This migration is additive-first:
-- - New security tables are created with IF NOT EXISTS.
-- - Existing tables are modified only when they exist.
-- - All new columns on existing tables are nullable-first.
-- - No tables/columns are dropped and no destructive type changes are made.
-- - Legacy rows that cannot be safely attributed remain nullable for the
--   WorkspaceIdentityRepairService; ownership is never guessed.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.workspace_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT workspace_memberships_role_check
        CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    CONSTRAINT workspace_memberships_workspace_user_unique
        UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_memberships_user_workspace
    ON public.workspace_memberships (user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_memberships_workspace_role
    ON public.workspace_memberships (workspace_id, role);
CREATE INDEX IF NOT EXISTS idx_workspace_memberships_workspace
    ON public.workspace_memberships (workspace_id);

DO $$
BEGIN
    IF to_regclass('public.workspaces') IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'workspaces'
              AND column_name = 'id'
              AND data_type = 'text'
        )
        AND NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'workspace_memberships_workspace_id_fkey'
        )
    THEN
        ALTER TABLE public.workspace_memberships
            ADD CONSTRAINT workspace_memberships_workspace_id_fkey
            FOREIGN KEY (workspace_id)
            REFERENCES public.workspaces(id)
            ON DELETE CASCADE;
    ELSE
        -- FK intentionally skipped when public.workspaces is absent or not text-id
        -- shaped. This keeps fresh/local schemas from failing the migration.
    END IF;

    IF to_regclass('auth.users') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'workspace_memberships_user_id_fkey'
        )
    THEN
        ALTER TABLE public.workspace_memberships
            ADD CONSTRAINT workspace_memberships_user_id_fkey
            FOREIGN KEY (user_id)
            REFERENCES auth.users(id)
            ON DELETE CASCADE;
    ELSE
        -- FK intentionally skipped outside Supabase/auth-enabled schemas.
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.permission_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NULL,
    actor_user_id UUID NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NULL,
    decision TEXT NOT NULL,
    reason_code TEXT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT permission_audit_logs_decision_check
        CHECK (decision IN ('allowed', 'denied', 'requires_confirmation'))
);

CREATE INDEX IF NOT EXISTS idx_permission_audit_workspace_created
    ON public.permission_audit_logs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permission_audit_actor_created
    ON public.permission_audit_logs (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permission_audit_resource
    ON public.permission_audit_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_decision_created
    ON public.permission_audit_logs (decision, created_at DESC);

COMMENT ON TABLE public.permission_audit_logs IS
    'V1 security audit log. metadata must be redacted and must never contain raw request bodies, API keys, Authorization headers, provider tokens, service-role keys, raw secrets, stack traces, or .env values.';

DO $$
BEGIN
    IF to_regclass('public.workspaces') IS NOT NULL THEN
        ALTER TABLE public.workspaces
            ADD COLUMN IF NOT EXISTS owner_user_id UUID NULL,
            ADD COLUMN IF NOT EXISTS created_by UUID NULL,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NULL DEFAULT NOW();
    ELSE
        -- public.workspaces does not exist in this schema; V1 skips additive
        -- workspace owner columns until the table owner creates it.
    END IF;

    IF to_regclass('public.messages') IS NOT NULL THEN
        ALTER TABLE public.messages
            ADD COLUMN IF NOT EXISTS created_by UUID NULL;
        -- messages already has workspace_id in the generated project type.
        -- If a deployed schema lacks workspace_id, this migration does not
        -- invent ownership; that repair belongs to the message schema owner.
    END IF;

    IF to_regclass('public.artifacts') IS NOT NULL THEN
        ALTER TABLE public.artifacts
            ADD COLUMN IF NOT EXISTS workspace_id TEXT NULL,
            ADD COLUMN IF NOT EXISTS created_by UUID NULL;
        -- workspace_id is nullable-first for legacy artifacts; safe backfill
        -- happens only when a workspace owner is already known.
    END IF;

    IF to_regclass('public.prompts') IS NOT NULL THEN
        ALTER TABLE public.prompts
            ADD COLUMN IF NOT EXISTS workspace_id TEXT NULL,
            ADD COLUMN IF NOT EXISTS created_by UUID NULL;
    END IF;

    IF to_regclass('public.notebooks') IS NOT NULL THEN
        ALTER TABLE public.notebooks
            ADD COLUMN IF NOT EXISTS workspace_id TEXT NULL,
            ADD COLUMN IF NOT EXISTS created_by UUID NULL;
    END IF;

    IF to_regclass('public.workflow_templates') IS NOT NULL THEN
        ALTER TABLE public.workflow_templates
            ADD COLUMN IF NOT EXISTS workspace_id TEXT NULL,
            ADD COLUMN IF NOT EXISTS created_by UUID NULL;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_workspace_memberships_updated_at'
    ) THEN
        CREATE TRIGGER set_workspace_memberships_updated_at
        BEFORE UPDATE ON public.workspace_memberships
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
    END IF;

    IF to_regclass('public.workspaces') IS NOT NULL
        AND NOT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = 'set_workspaces_updated_at'
        )
    THEN
        CREATE TRIGGER set_workspaces_updated_at
        BEFORE UPDATE ON public.workspaces
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
    END IF;
END $$;

-- Conservative, repeatable backfill. We only derive ownership from existing
-- owner_user_id values. Unknown ownership stays NULL for explicit repair.
DO $$
BEGIN
    IF to_regclass('public.workspaces') IS NOT NULL THEN
        UPDATE public.workspaces
        SET updated_at = COALESCE(updated_at, NOW())
        WHERE updated_at IS NULL;

        UPDATE public.workspaces
        SET created_by = owner_user_id
        WHERE created_by IS NULL
          AND owner_user_id IS NOT NULL;

        INSERT INTO public.workspace_memberships (workspace_id, user_id, role)
        SELECT id, owner_user_id, 'owner'
        FROM public.workspaces
        WHERE owner_user_id IS NOT NULL
        ON CONFLICT (workspace_id, user_id) DO NOTHING;
    END IF;

    IF to_regclass('public.workspaces') IS NOT NULL
        AND to_regclass('public.messages') IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'messages'
              AND column_name = 'workspace_id'
        )
    THEN
        UPDATE public.messages AS m
        SET created_by = w.owner_user_id
        FROM public.workspaces AS w
        WHERE m.created_by IS NULL
          AND m.workspace_id = w.id
          AND w.owner_user_id IS NOT NULL;
    END IF;

    IF to_regclass('public.workspaces') IS NOT NULL
        AND to_regclass('public.artifacts') IS NOT NULL
    THEN
        UPDATE public.artifacts AS a
        SET created_by = w.owner_user_id
        FROM public.workspaces AS w
        WHERE a.created_by IS NULL
          AND a.workspace_id = w.id
          AND w.owner_user_id IS NOT NULL;
    END IF;

    IF to_regclass('public.workspaces') IS NOT NULL
        AND to_regclass('public.prompts') IS NOT NULL
    THEN
        UPDATE public.prompts AS p
        SET created_by = w.owner_user_id
        FROM public.workspaces AS w
        WHERE p.created_by IS NULL
          AND p.workspace_id = w.id
          AND w.owner_user_id IS NOT NULL;
    END IF;

    IF to_regclass('public.workspaces') IS NOT NULL
        AND to_regclass('public.notebooks') IS NOT NULL
    THEN
        UPDATE public.notebooks AS n
        SET created_by = w.owner_user_id
        FROM public.workspaces AS w
        WHERE n.created_by IS NULL
          AND n.workspace_id = w.id
          AND w.owner_user_id IS NOT NULL;
    END IF;

    IF to_regclass('public.workspaces') IS NOT NULL
        AND to_regclass('public.workflow_templates') IS NOT NULL
    THEN
        UPDATE public.workflow_templates AS wt
        SET created_by = w.owner_user_id
        FROM public.workspaces AS w
        WHERE wt.created_by IS NULL
          AND wt.workspace_id = w.id
          AND w.owner_user_id IS NOT NULL;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_workspace_member(target_workspace_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT target_workspace_id IS NOT NULL
        AND auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.workspace_memberships AS wm
            WHERE wm.workspace_id = target_workspace_id
              AND wm.user_id = auth.uid()
        );
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(
    target_workspace_id TEXT,
    allowed_roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT target_workspace_id IS NOT NULL
        AND auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.workspace_memberships AS wm
            WHERE wm.workspace_id = target_workspace_id
              AND wm.user_id = auth.uid()
              AND wm.role = ANY(allowed_roles)
        );
$$;

REVOKE ALL ON FUNCTION public.is_workspace_member(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_workspace_role(TEXT, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_workspace_role(TEXT, TEXT[]) TO anon, authenticated, service_role;

ALTER TABLE public.workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'workspace_memberships'
          AND policyname = 'workspace_memberships_select_self_or_manager'
    ) THEN
        CREATE POLICY workspace_memberships_select_self_or_manager
        ON public.workspace_memberships
        FOR SELECT
        TO authenticated
        USING (
            user_id = auth.uid()
            OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin'])
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'workspace_memberships'
          AND policyname = 'workspace_memberships_insert_manager'
    ) THEN
        CREATE POLICY workspace_memberships_insert_manager
        ON public.workspace_memberships
        FOR INSERT
        TO authenticated
        WITH CHECK (
            public.has_workspace_role(workspace_id, ARRAY['owner'])
            OR (
                public.has_workspace_role(workspace_id, ARRAY['admin'])
                AND role <> 'owner'
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'workspace_memberships'
          AND policyname = 'workspace_memberships_update_manager'
    ) THEN
        CREATE POLICY workspace_memberships_update_manager
        ON public.workspace_memberships
        FOR UPDATE
        TO authenticated
        USING (
            public.has_workspace_role(workspace_id, ARRAY['owner'])
            OR (
                public.has_workspace_role(workspace_id, ARRAY['admin'])
                AND role <> 'owner'
            )
        )
        WITH CHECK (
            public.has_workspace_role(workspace_id, ARRAY['owner'])
            OR (
                public.has_workspace_role(workspace_id, ARRAY['admin'])
                AND role <> 'owner'
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'workspace_memberships'
          AND policyname = 'workspace_memberships_delete_manager'
    ) THEN
        CREATE POLICY workspace_memberships_delete_manager
        ON public.workspace_memberships
        FOR DELETE
        TO authenticated
        USING (
            public.has_workspace_role(workspace_id, ARRAY['owner'])
            OR (
                public.has_workspace_role(workspace_id, ARRAY['admin'])
                AND role <> 'owner'
            )
        );
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.workspaces') IS NOT NULL THEN
        ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'workspaces'
              AND policyname = 'workspaces_select_member'
        ) THEN
            CREATE POLICY workspaces_select_member
            ON public.workspaces
            FOR SELECT
            TO authenticated
            USING (
                public.is_workspace_member(id)
                OR owner_user_id = auth.uid()
            );
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'workspaces'
              AND policyname = 'workspaces_insert_owner_or_legacy'
        ) THEN
            CREATE POLICY workspaces_insert_owner_or_legacy
            ON public.workspaces
            FOR INSERT
            TO authenticated
            WITH CHECK (
                owner_user_id IS NULL
                OR owner_user_id = auth.uid()
                OR public.has_workspace_role(id, ARRAY['owner', 'admin'])
            );
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'workspaces'
              AND policyname = 'workspaces_update_editor_or_legacy'
        ) THEN
            CREATE POLICY workspaces_update_editor_or_legacy
            ON public.workspaces
            FOR UPDATE
            TO authenticated
            USING (
                owner_user_id IS NULL
                OR owner_user_id = auth.uid()
                OR public.has_workspace_role(id, ARRAY['owner', 'admin', 'editor'])
            )
            WITH CHECK (
                owner_user_id IS NULL
                OR owner_user_id = auth.uid()
                OR public.has_workspace_role(id, ARRAY['owner', 'admin', 'editor'])
            );
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'workspaces'
              AND policyname = 'workspaces_delete_owner_admin'
        ) THEN
            CREATE POLICY workspaces_delete_owner_admin
            ON public.workspaces
            FOR DELETE
            TO authenticated
            USING (
                owner_user_id = auth.uid()
                OR public.has_workspace_role(id, ARRAY['owner', 'admin'])
            );
        END IF;
    END IF;
END $$;

-- Shared policy shape for workspace-scoped mutable tables. NULL workspace_id
-- remains a legacy compatibility bridge until V1 smoke tests and repair plans
-- pass; strict enforcement can later remove the NULL fallback.
DO $$
BEGIN
    IF to_regclass('public.messages') IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'messages'
              AND column_name = 'workspace_id'
        )
    THEN
        ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_select_workspace_member') THEN
            CREATE POLICY messages_select_workspace_member ON public.messages FOR SELECT TO authenticated USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_insert_workspace_editor') THEN
            CREATE POLICY messages_insert_workspace_editor ON public.messages FOR INSERT TO authenticated WITH CHECK (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_update_workspace_editor') THEN
            CREATE POLICY messages_update_workspace_editor ON public.messages FOR UPDATE TO authenticated USING (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])) WITH CHECK (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_delete_workspace_editor') THEN
            CREATE POLICY messages_delete_workspace_editor ON public.messages FOR DELETE TO authenticated USING (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
        END IF;
    END IF;

    IF to_regclass('public.artifacts') IS NOT NULL THEN
        ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'artifacts' AND policyname = 'artifacts_select_workspace_member') THEN
            CREATE POLICY artifacts_select_workspace_member ON public.artifacts FOR SELECT TO authenticated USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'artifacts' AND policyname = 'artifacts_insert_workspace_editor') THEN
            CREATE POLICY artifacts_insert_workspace_editor ON public.artifacts FOR INSERT TO authenticated WITH CHECK (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'artifacts' AND policyname = 'artifacts_update_workspace_editor') THEN
            CREATE POLICY artifacts_update_workspace_editor ON public.artifacts FOR UPDATE TO authenticated USING (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])) WITH CHECK (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'artifacts' AND policyname = 'artifacts_delete_workspace_editor') THEN
            CREATE POLICY artifacts_delete_workspace_editor ON public.artifacts FOR DELETE TO authenticated USING (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
        END IF;
    END IF;

    IF to_regclass('public.prompts') IS NOT NULL THEN
        ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prompts' AND policyname = 'prompts_select_workspace_member') THEN
            CREATE POLICY prompts_select_workspace_member ON public.prompts FOR SELECT TO authenticated USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prompts' AND policyname = 'prompts_insert_workspace_editor') THEN
            CREATE POLICY prompts_insert_workspace_editor ON public.prompts FOR INSERT TO authenticated WITH CHECK (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prompts' AND policyname = 'prompts_update_workspace_editor') THEN
            CREATE POLICY prompts_update_workspace_editor ON public.prompts FOR UPDATE TO authenticated USING (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])) WITH CHECK (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prompts' AND policyname = 'prompts_delete_workspace_editor') THEN
            CREATE POLICY prompts_delete_workspace_editor ON public.prompts FOR DELETE TO authenticated USING (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
        END IF;
    END IF;

    IF to_regclass('public.notebooks') IS NOT NULL THEN
        ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notebooks' AND policyname = 'notebooks_select_workspace_member') THEN
            CREATE POLICY notebooks_select_workspace_member ON public.notebooks FOR SELECT TO authenticated USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notebooks' AND policyname = 'notebooks_insert_workspace_editor') THEN
            CREATE POLICY notebooks_insert_workspace_editor ON public.notebooks FOR INSERT TO authenticated WITH CHECK (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notebooks' AND policyname = 'notebooks_update_workspace_editor') THEN
            CREATE POLICY notebooks_update_workspace_editor ON public.notebooks FOR UPDATE TO authenticated USING (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])) WITH CHECK (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notebooks' AND policyname = 'notebooks_delete_workspace_editor') THEN
            CREATE POLICY notebooks_delete_workspace_editor ON public.notebooks FOR DELETE TO authenticated USING (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
        END IF;
    END IF;

    IF to_regclass('public.workflow_templates') IS NOT NULL THEN
        ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workflow_templates' AND policyname = 'workflow_templates_select_workspace_member') THEN
            CREATE POLICY workflow_templates_select_workspace_member ON public.workflow_templates FOR SELECT TO authenticated USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workflow_templates' AND policyname = 'workflow_templates_insert_workspace_editor') THEN
            CREATE POLICY workflow_templates_insert_workspace_editor ON public.workflow_templates FOR INSERT TO authenticated WITH CHECK (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workflow_templates' AND policyname = 'workflow_templates_update_workspace_editor') THEN
            CREATE POLICY workflow_templates_update_workspace_editor ON public.workflow_templates FOR UPDATE TO authenticated USING (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])) WITH CHECK (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workflow_templates' AND policyname = 'workflow_templates_delete_workspace_editor') THEN
            CREATE POLICY workflow_templates_delete_workspace_editor ON public.workflow_templates FOR DELETE TO authenticated USING (workspace_id IS NULL OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']));
        END IF;
    END IF;
END $$;

-- permission_audit_logs intentionally has no authenticated client policies.
-- It is written through server-side service-role/RPC paths only. Service role
-- remains server-only and must never be exposed to the frontend bundle.
