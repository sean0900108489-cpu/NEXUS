# Phase 2 Read-Only Supabase Matrix - 2026-06-01

## Scope

Read-only Supabase inspection for the likely target project:

- Project name: `NEXUS`
- Project ref: `xjuglddxwnikvcwxfbzg`
- Region: `ap-southeast-2`
- Status: `ACTIVE_HEALTHY`

No migrations were applied. No data was exported. Findings below use counts,
booleans, schema facts, policy names, and redacted summaries only.

## Remote Migration Status

Remote migration history currently includes 8 migrations and does not include
the local V20 hardening migration:

- Missing locally prepared migration:
  `20260601001000_v20_auth_boundary_rls_hardening.sql`

## RLS Matrix Summary

- Public tables inspected: 21
- Tables with RLS enabled: 21/21
- Force RLS enabled: 0/21
- Supabase security advisor findings: 3

Security advisor findings:

- INFO: `api_idempotency_keys` has RLS enabled and no policies.
- INFO: `permission_audit_logs` has RLS enabled and no policies.
- WARN: leaked password protection is disabled for Supabase Auth.

The two no-policy server-only tables are expected from a row-access
perspective, but their table grants still need hardening.

## Policy Findings

`public.workspaces` still has legacy ownerless write bridges:

- `workspaces_insert_owner_or_legacy`
  - `WITH CHECK` includes `owner_user_id IS NULL`
- `workspaces_update_editor_or_legacy`
  - `USING` includes `owner_user_id IS NULL`
  - `WITH CHECK` includes `owner_user_id IS NULL`

This means the prepared V20 migration is still required in the target
environment before Phase 2 can pass.

## Grant Findings

The following server-only tables still expose table privileges to
`anon` and `authenticated`:

- `public.api_idempotency_keys`
- `public.permission_audit_logs`

Observed privilege families include:

- `SELECT`
- `INSERT`
- `UPDATE`
- `DELETE`
- `REFERENCES`
- `TRIGGER`
- `TRUNCATE`

Even with RLS enabled and no client policies, these grants are too broad for
server-only tables and should be revoked by the V20 hardening migration.

## Workspace Nullability Snapshot

Workspace-scoped tables are mostly non-nullable. Nullable `workspace_id`
surfaces remain on intentionally global or observability-style tables:

- `notebooks`
- `permission_audit_logs`
- `system_events`
- `usage_metrics`
- `workflow_templates`

These need Phase 3 classification: intentionally global, server-only,
observability-only, or migration candidate.

## Phase 2 Gate Verdict

BLOCK RELEASE for Phase 2 until the V20 hardening migration is applied to the
target environment and re-scanned.

Required next ROI action:

1. Apply `20260601001000_v20_auth_boundary_rls_hardening.sql` to the `NEXUS`
   target environment during an approved DB change window.
2. Re-run read-only policy/grant queries.
3. Confirm:
   - no `workspaces_*_or_legacy` policies remain
   - no `owner_user_id IS NULL` workspace write bridge remains
   - no `anon/authenticated` grants remain on server-only tables
   - Supabase Auth leaked password protection has an owner/setting decision

## Score Impact

- First-stage local repair remains about 90/100.
- Overall upgrade readiness remains about 72-74/100 until Phase 2 live DB
  hardening is applied and verified.

Estimated remaining rounds to overall target: 4-5.
