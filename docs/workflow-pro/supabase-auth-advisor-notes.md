# Supabase Auth Advisor Notes

Status: v22 live hardening note.  
Scope: Workflow Pro auth, RLS, artifact, runtime, and generated-output durability boundaries.  
Last verified: 2026-06-03 against Supabase project `xjuglddxwnikvcwxfbzg`.

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
