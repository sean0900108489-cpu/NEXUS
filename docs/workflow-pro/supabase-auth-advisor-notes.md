# Supabase Auth Advisor Notes

Status: v22 live hardening note with R89 account-matrix audit.  
Scope: Workflow Pro auth, RLS, artifact, runtime, and generated-output durability boundaries.  
Last verified: 2026-06-04 against Supabase project `xjuglddxwnikvcwxfbzg`.

## Why This File Exists

Workflow Pro must work for owner, admin, editor, viewer, new-account, and unauthenticated preview cases without depending on hidden account privilege. Supabase advisors are useful, but some advisory findings are intentionally acceptable for this project. This file records which findings are real defects, which are expected security boundaries, and which should be deferred until query traffic proves they matter.

The goal is to prevent two failure modes:

1. A normal account is blocked because a route, RLS policy, or membership path only works for the strongest existing account.
2. A future repair accidentally opens server-only ledgers to browser clients because an advisor says "RLS enabled no policy."

## Live Project Anchor

- Local environment source: `.env.local`.
- Public Supabase URL ref: `xjuglddxwnikvcwxfbzg`.
- Secrets policy: keys must not be printed, logged, copied into reports, or committed.
- Live migration applied for this note: `v22_rls_policy_performance_hardening`.
- Local migration file: `supabase/migrations/20260603001000_v22_rls_policy_performance_hardening.sql`.

## Expected Server-Only Advisor Findings

The following advisor finding is expected for these tables:

- Finding: `rls_enabled_no_policy`.
- Tables: `api_idempotency_keys`, `permission_audit_logs`, `deployment_checks`.
- Reason: these tables are server-only ledgers. They should not have anon or authenticated Data API policies.
- Required grants: `service_role` only.
- Do not fix by adding permissive authenticated policies.
- Correct access path: trusted server repositories and routes that use server-side auth/permission gates.

These tables are intentionally fail-closed. If a browser client cannot read or write them, that is the desired behavior.

## R89 Live Account-Matrix Audit Snapshot

Machine-readable evidence lives in:

- `docs/workflow-pro/account-matrix-live-audit.manifest.json`

R89 read-only Supabase checks confirmed:

- project `xjuglddxwnikvcwxfbzg` is active healthy;
- core tables for workspace membership, workspace state, snapshots, sync,
  artifacts, tool runs, and permission audit logs exist live with RLS enabled;
- live policies match the source permission model at the table-policy level;
- security advisor has zero blocking findings, with only the expected
  server-only no-policy INFO findings listed above;
- recent permission audit rows are traceable and include both allowed and denied
  decisions.

R89 local live auth-boundary probe:

- command:
  `AUTH_BOUNDARY_LIVE_BASE_URL=http://127.0.0.1:3000 AUTH_BOUNDARY_LIVE_EXPECT_LEGACY_404=false npm run check:auth-boundary:live`;
- result: 49 probes, 0 blocking findings, 38 protected spoof-only probes;
- 9 local legacy-route warnings are expected because localhost does not enforce
  production legacy 404 behavior in that probe mode.

This still does not replace the strict preview URL probe or the
owner/editor/viewer/new-account screen matrix.

## Fixed V22 RLS Performance Findings

The live project previously reported:

- `auth_rls_initplan` on `agent_runtime_sessions_insert_editor`.
- `auth_rls_initplan` on `tool_runs_insert_operator`.
- `multiple_permissive_policies` on `agent_memory_records` SELECT.

The v22 migration fixed these by:

- Replacing `user_id = auth.uid()` with `user_id = (SELECT auth.uid())`.
- Replacing `created_by = auth.uid()` with `created_by = (SELECT auth.uid())`.
- Splitting `agent_memory_records_write_editor` into separate insert, update, and delete policies so SELECT does not also evaluate a write policy.

This keeps the permission model unchanged while reducing row-by-row policy overhead.

## Deferred Advisor Findings

Unused-index findings are not treated as immediate defects during Workflow Pro foundation work. Many indexes exist for upcoming artifact, task, session, graph, paging, observability, and generated-history flows. Do not remove them without:

1. A live query inventory.
2. A route-level usage map.
3. A before/after query plan.
4. A rollback migration.

The Auth connection strategy INFO finding is an operations setting, not a schema defect. It can be revisited before higher-traffic production rollout.

## Verification Commands

Run these after changing auth, permissions, Supabase migrations, route guards, or Workflow Pro persistence:

```bash
npm run check:auth-boundary
npm test -- src/lib/backend/security/security-migration.test.ts
```

Live Supabase verification should include:

- list applied migrations and confirm `v22_rls_policy_performance_hardening`;
- inspect policies for `agent_runtime_sessions`, `tool_runs`, and `agent_memory_records`;
- rerun security and performance advisors;
- confirm no high-risk security advisor finding is introduced.

## Multi-Account Rule

Workflow Pro is not ready to claim production-grade auth until the preview matrix proves these accounts through the actual UI/API path:

- owner can create and run allowed workflows;
- admin can operate workspace-scoped runtime features where permitted;
- editor can edit/run allowed workspace workflows;
- viewer can read allowed workspace state but cannot mutate protected resources;
- new account cannot access another workspace and receives traceable denied decisions;
- unauthenticated requests are redirected or rejected predictably;
- spoof-only workspace headers cannot bypass session identity.

Until that matrix is screen-verified, consider Workflow Pro foundation strong but not fully production-landed.
