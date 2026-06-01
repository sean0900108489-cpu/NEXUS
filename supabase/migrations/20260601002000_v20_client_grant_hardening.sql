-- V20 auth boundary hardening: remove unauthenticated table access grants and
-- keep authenticated grants aligned with client-facing RLS commands.
--
-- This migration is intentionally grant-only. It does not mutate table data,
-- drop columns, or alter policies.

DO $$
DECLARE
    table_name text;
    dml_privileges text;
BEGIN
    FOR table_name, dml_privileges IN
        VALUES
            ('agent_runtime_events', 'SELECT'),
            ('agent_runtime_sessions', 'SELECT, INSERT, UPDATE'),
            ('agent_tasks', 'SELECT, INSERT, UPDATE'),
            ('artifact_references', 'SELECT, INSERT, DELETE'),
            ('artifacts', 'SELECT, INSERT, UPDATE, DELETE'),
            ('messages', 'SELECT, INSERT, UPDATE, DELETE'),
            ('notebooks', 'SELECT, INSERT, UPDATE, DELETE'),
            ('prompt_revisions', 'SELECT, INSERT, UPDATE'),
            ('prompts', 'SELECT, INSERT, UPDATE, DELETE'),
            ('sync_operations', 'SELECT, INSERT, UPDATE'),
            ('system_events', 'SELECT'),
            ('tool_permissions', 'SELECT, INSERT, UPDATE'),
            ('tool_runs', 'SELECT, INSERT, UPDATE'),
            ('usage_metrics', 'SELECT'),
            ('workflow_templates', 'SELECT, INSERT, UPDATE, DELETE'),
            ('workspace_memberships', 'SELECT, INSERT, UPDATE, DELETE'),
            ('workspace_snapshots', 'SELECT, INSERT, UPDATE'),
            ('workspace_state_entities', 'SELECT, INSERT, UPDATE, DELETE'),
            ('workspaces', 'SELECT, INSERT, UPDATE, DELETE')
    LOOP
        IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
            EXECUTE format(
                'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, PUBLIC',
                table_name
            );
            EXECUTE format(
                'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM authenticated',
                table_name
            );
            EXECUTE format(
                'GRANT %s ON TABLE public.%I TO authenticated',
                dml_privileges,
                table_name
            );
            EXECUTE format(
                'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role',
                table_name
            );
        END IF;
    END LOOP;
END $$;

COMMENT ON SCHEMA public IS
  'V20 auth boundary: protected public tables keep anon table grants revoked; authenticated table grants are limited to client-facing DML and RLS remains the row boundary.';
