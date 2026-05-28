-- V16: RLS initplan policy optimization
--
-- Supabase's performance advisor recommends wrapping auth.uid() calls used by
-- row-level security policies in SELECT so PostgreSQL can evaluate the value
-- once per statement instead of per row. This migration keeps the same access
-- boundaries and only rewrites policy expressions / helper internals.

CREATE OR REPLACE FUNCTION private.is_workspace_member(target_workspace_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    WITH request_user AS (
        SELECT auth.uid() AS user_id
    )
    SELECT target_workspace_id IS NOT NULL
        AND request_user.user_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.workspace_memberships AS wm
            WHERE wm.workspace_id = target_workspace_id
              AND wm.user_id = request_user.user_id
        )
    FROM request_user;
$$;

CREATE OR REPLACE FUNCTION private.has_workspace_role(
    target_workspace_id TEXT,
    allowed_roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    WITH request_user AS (
        SELECT auth.uid() AS user_id
    )
    SELECT target_workspace_id IS NOT NULL
        AND request_user.user_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.workspace_memberships AS wm
            WHERE wm.workspace_id = target_workspace_id
              AND wm.user_id = request_user.user_id
              AND wm.role = ANY(allowed_roles)
        )
    FROM request_user;
$$;

ALTER POLICY workspace_memberships_select_self_or_manager
ON public.workspace_memberships
USING (
    user_id = (SELECT auth.uid())
    OR public.has_workspace_role(workspace_id, ARRAY['owner', 'admin'])
);

ALTER POLICY workspaces_select_member
ON public.workspaces
USING (
    public.is_workspace_member(id)
    OR owner_user_id = (SELECT auth.uid())
);

ALTER POLICY workspaces_insert_owner_or_legacy
ON public.workspaces
WITH CHECK (
    owner_user_id IS NULL
    OR owner_user_id = (SELECT auth.uid())
    OR public.has_workspace_role(id, ARRAY['owner', 'admin'])
);

ALTER POLICY workspaces_update_editor_or_legacy
ON public.workspaces
USING (
    owner_user_id IS NULL
    OR owner_user_id = (SELECT auth.uid())
    OR public.has_workspace_role(id, ARRAY['owner', 'admin', 'editor'])
)
WITH CHECK (
    owner_user_id IS NULL
    OR owner_user_id = (SELECT auth.uid())
    OR public.has_workspace_role(id, ARRAY['owner', 'admin', 'editor'])
);

ALTER POLICY workspaces_delete_owner_admin
ON public.workspaces
USING (
    owner_user_id = (SELECT auth.uid())
    OR public.has_workspace_role(id, ARRAY['owner', 'admin'])
);

ALTER POLICY workspace_snapshots_select_member
ON public.workspace_snapshots
USING (
    user_id = (SELECT auth.uid())
    OR public.is_workspace_member(workspace_id)
);

ALTER POLICY workspace_snapshots_insert_editor
ON public.workspace_snapshots
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
);

ALTER POLICY workspace_snapshots_update_editor
ON public.workspace_snapshots
USING (
    user_id = (SELECT auth.uid())
    AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
)
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
);

ALTER POLICY sync_operations_insert_editor
ON public.sync_operations
WITH CHECK (
    public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])
    AND (created_by IS NULL OR created_by = (SELECT auth.uid()))
);

ALTER POLICY notebooks_select_workspace_member
ON public.notebooks
USING (
    (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
    OR (workspace_id IS NULL AND created_by = (SELECT auth.uid()))
);

ALTER POLICY notebooks_insert_workspace_editor
ON public.notebooks
WITH CHECK (
    (workspace_id IS NOT NULL AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']))
    OR (workspace_id IS NULL AND created_by = (SELECT auth.uid()))
);

ALTER POLICY notebooks_update_workspace_editor
ON public.notebooks
USING (
    (workspace_id IS NOT NULL AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']))
    OR (workspace_id IS NULL AND created_by = (SELECT auth.uid()))
)
WITH CHECK (
    (workspace_id IS NOT NULL AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']))
    OR (workspace_id IS NULL AND created_by = (SELECT auth.uid()))
);

ALTER POLICY notebooks_delete_workspace_editor
ON public.notebooks
USING (
    (workspace_id IS NOT NULL AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']))
    OR (workspace_id IS NULL AND created_by = (SELECT auth.uid()))
);

ALTER POLICY workflow_templates_select_workspace_member
ON public.workflow_templates
USING (
    (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
    OR (workspace_id IS NULL AND created_by = (SELECT auth.uid()))
);

ALTER POLICY workflow_templates_insert_workspace_editor
ON public.workflow_templates
WITH CHECK (
    (workspace_id IS NOT NULL AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']))
    OR (workspace_id IS NULL AND created_by = (SELECT auth.uid()))
);

ALTER POLICY workflow_templates_update_workspace_editor
ON public.workflow_templates
USING (
    (workspace_id IS NOT NULL AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']))
    OR (workspace_id IS NULL AND created_by = (SELECT auth.uid()))
)
WITH CHECK (
    (workspace_id IS NOT NULL AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']))
    OR (workspace_id IS NULL AND created_by = (SELECT auth.uid()))
);

ALTER POLICY workflow_templates_delete_workspace_editor
ON public.workflow_templates
USING (
    (workspace_id IS NOT NULL AND public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor']))
    OR (workspace_id IS NULL AND created_by = (SELECT auth.uid()))
);
