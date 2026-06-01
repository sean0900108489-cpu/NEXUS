import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20260527000000_security_boundary_rls_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);

const v20HardeningMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20260601001000_v20_auth_boundary_rls_hardening.sql",
    import.meta.url,
  ),
  "utf8",
);

const v20ClientGrantHardeningMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20260601002000_v20_client_grant_hardening.sql",
    import.meta.url,
  ),
  "utf8",
);

const v20ProtectedClientTables = [
  "agent_runtime_events",
  "agent_runtime_sessions",
  "agent_tasks",
  "artifact_references",
  "artifacts",
  "messages",
  "notebooks",
  "prompt_revisions",
  "prompts",
  "sync_operations",
  "system_events",
  "tool_permissions",
  "tool_runs",
  "usage_metrics",
  "workflow_templates",
  "workspace_memberships",
  "workspace_snapshots",
  "workspace_state_entities",
  "workspaces",
];

describe("V1 security migration", () => {
  it("creates workspace_memberships with unique workspace/user and role constraints", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.workspace_memberships",
    );
    expect(migration).toContain(
      "CONSTRAINT workspace_memberships_workspace_user_unique",
    );
    expect(migration).toContain(
      "CHECK (role IN ('owner', 'admin', 'editor', 'viewer'))",
    );
    expect(migration).toContain("idx_workspace_memberships_user_workspace");
    expect(migration).toContain("idx_workspace_memberships_workspace_role");
    expect(migration).toContain("idx_workspace_memberships_workspace");
  });

  it("creates permission_audit_logs with decision constraint and indexes", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.permission_audit_logs",
    );
    expect(migration).toContain(
      "CHECK (decision IN ('allowed', 'denied', 'requires_confirmation'))",
    );
    expect(migration).toContain("idx_permission_audit_workspace_created");
    expect(migration).toContain("idx_permission_audit_actor_created");
    expect(migration).toContain("idx_permission_audit_resource");
    expect(migration).toContain("idx_permission_audit_decision_created");
  });

  it("keeps migration additive and repeatable", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS");
    expect(migration).toContain("ON CONFLICT (workspace_id, user_id) DO NOTHING");
    expect(migration).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(migration).not.toMatch(/\bDROP\s+COLUMN\b/i);
    expect(migration).not.toMatch(/\bapi_idempotency_keys\b/i);
    expect(migration).not.toMatch(/\bfeature_flags\b/i);
    expect(migration).not.toMatch(/\bsystem_events\b/i);
    expect(migration).not.toMatch(/\bworkspace_snapshots\b/i);
    expect(migration).not.toMatch(/\bsync_operations\b/i);
    expect(migration).not.toMatch(/\btool_runs\b/i);
  });

  it("defines non-recursive RLS helper functions with fixed search_path", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.is_workspace_member");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.has_workspace_role");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION private.is_workspace_member");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION private.has_workspace_role");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("SET search_path = public, auth");
    expect(migration).toContain("SET search_path = public, private");
    expect(migration).toContain("auth.uid()");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION private.is_workspace_member(TEXT) FROM PUBLIC",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION private.is_workspace_member(TEXT) TO authenticated, service_role",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.is_workspace_member(TEXT) TO authenticated, service_role",
    );
  });
});

describe("V20 auth boundary RLS hardening migration", () => {
  it("removes legacy ownerless workspace write policies", () => {
    expect(v20HardeningMigration).toContain(
      "DROP POLICY IF EXISTS workspaces_insert_owner_or_legacy ON public.workspaces",
    );
    expect(v20HardeningMigration).toContain(
      "DROP POLICY IF EXISTS workspaces_update_editor_or_legacy ON public.workspaces",
    );
    expect(v20HardeningMigration).toContain(
      "CREATE POLICY workspaces_insert_owner",
    );
    expect(v20HardeningMigration).toContain(
      "CREATE POLICY workspaces_update_editor",
    );
    expect(v20HardeningMigration).not.toMatch(/owner_user_id\s+IS\s+NULL/i);
  });

  it("requires workspace writes to be owner or member scoped", () => {
    expect(v20HardeningMigration).toContain(
      "owner_user_id = (SELECT auth.uid())",
    );
    expect(v20HardeningMigration).toContain(
      "public.has_workspace_role(id, ARRAY['owner', 'admin'])",
    );
    expect(v20HardeningMigration).toContain(
      "public.has_workspace_role(id, ARRAY['owner', 'admin', 'editor'])",
    );
    expect(v20HardeningMigration).not.toContain(
      "public.has_workspace_role(id, ARRAY['owner', 'admin', 'editor', 'viewer'])",
    );
  });

  it("revokes client grants from server-only tables", () => {
    expect(v20HardeningMigration).toContain(
      "'DROP POLICY IF EXISTS %I ON public.api_idempotency_keys'",
    );
    expect(v20HardeningMigration).toContain(
      "'DROP POLICY IF EXISTS %I ON public.permission_audit_logs'",
    );
    expect(v20HardeningMigration).toContain(
      "REVOKE ALL PRIVILEGES ON TABLE public.api_idempotency_keys FROM anon, authenticated, PUBLIC",
    );
    expect(v20HardeningMigration).toContain(
      "REVOKE ALL PRIVILEGES ON TABLE public.permission_audit_logs FROM anon, authenticated, PUBLIC",
    );
    expect(v20HardeningMigration).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.api_idempotency_keys TO service_role",
    );
    expect(v20HardeningMigration).toContain(
      "GRANT SELECT, INSERT ON TABLE public.permission_audit_logs TO service_role",
    );
    expect(v20HardeningMigration).toContain(
      "No anon/authenticated table grants or client RLS policies",
    );
  });

  it("keeps the hardening migration repeatable and non-destructive", () => {
    expect(v20HardeningMigration).toContain(
      "IF to_regclass('public.workspaces') IS NOT NULL",
    );
    expect(v20HardeningMigration).toContain(
      "IF to_regclass('public.api_idempotency_keys') IS NOT NULL",
    );
    expect(v20HardeningMigration).toContain(
      "IF to_regclass('public.permission_audit_logs') IS NOT NULL",
    );
    expect(v20HardeningMigration).toContain("DROP POLICY IF EXISTS");
    expect(v20HardeningMigration).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(v20HardeningMigration).not.toMatch(/\bDROP\s+COLUMN\b/i);
    expect(v20HardeningMigration).not.toMatch(/\bTRUNCATE\b/i);
    expect(v20HardeningMigration).not.toMatch(/\bDELETE\s+FROM\b/i);
  });
});

describe("V20 client grant hardening migration", () => {
  it("removes anon table grants from protected client tables", () => {
    for (const table of v20ProtectedClientTables) {
      expect(v20ClientGrantHardeningMigration).toContain(`('${table}',`);
    }

    expect(v20ClientGrantHardeningMigration).toContain(
      "'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, PUBLIC'",
    );
  });

  it("rebuilds authenticated grants from explicit DML allowlists", () => {
    expect(v20ClientGrantHardeningMigration).toContain(
      "'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM authenticated'",
    );
    expect(v20ClientGrantHardeningMigration).toContain(
      "'GRANT %s ON TABLE public.%I TO authenticated'",
    );
    expect(v20ClientGrantHardeningMigration).toContain(
      "('system_events', 'SELECT')",
    );
    expect(v20ClientGrantHardeningMigration).toContain(
      "('usage_metrics', 'SELECT')",
    );
    expect(v20ClientGrantHardeningMigration).toContain(
      "('workspaces', 'SELECT, INSERT, UPDATE, DELETE')",
    );
  });

  it("keeps the client grant hardening migration repeatable and data-safe", () => {
    expect(v20ClientGrantHardeningMigration).toContain("to_regclass");
    expect(v20ClientGrantHardeningMigration).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(v20ClientGrantHardeningMigration).not.toMatch(/\bDROP\s+COLUMN\b/i);
    expect(v20ClientGrantHardeningMigration).not.toMatch(/\bTRUNCATE\s+TABLE\b/i);
    expect(v20ClientGrantHardeningMigration).not.toMatch(/\bDELETE\s+FROM\b/i);
  });
});

describe("V1 RLS smoke policy coverage", () => {
  it("uses workspace membership policies for workspace, notebooks, and workflow templates", () => {
    expect(migration).toContain("workspaces_select_member");
    expect(migration).toContain("notebooks_select_workspace_member");
    expect(migration).toContain("workflow_templates_select_workspace_member");
    expect(migration).toContain("public.is_workspace_member(workspace_id)");
  });

  it("allows editor writes to workspace assets but excludes viewers", () => {
    expect(migration).toContain(
      "public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor'])",
    );
    expect(migration).not.toContain(
      "public.has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'editor', 'viewer'])",
    );
  });

  it("prevents admins from creating, updating, or deleting owner memberships", () => {
    expect(migration).toContain("workspace_memberships_insert_manager");
    expect(migration).toContain("workspace_memberships_update_manager");
    expect(migration).toContain("workspace_memberships_delete_manager");
    expect(migration).toContain("AND role <> 'owner'");
  });

  it("keeps permission audit logs server-side only", () => {
    expect(migration).toContain(
      "permission_audit_logs intentionally has no authenticated client policies",
    );
    expect(migration).not.toContain("CREATE POLICY permission_audit");
  });
});
