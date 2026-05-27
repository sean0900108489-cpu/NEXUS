import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20260527000000_security_boundary_rls_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);

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
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = public");
    expect(migration).toContain("auth.uid()");
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
