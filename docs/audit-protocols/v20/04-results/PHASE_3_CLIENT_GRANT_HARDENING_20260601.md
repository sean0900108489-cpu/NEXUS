# Phase 3 Client Grant Hardening Result - 2026-06-01

## Scope

Project: `NEXUS` (`xjuglddxwnikvcwxfbzg`)

This round classified nullable workspace/global surfaces and hardened table
grants for protected client-facing tables. It did not mutate application data,
drop columns, or export secrets.

## High ROI Action

Added and applied:

- `supabase/migrations/20260601002000_v20_client_grant_hardening.sql`

The migration:

- revokes all table privileges from `anon` and `PUBLIC` on protected client
  tables
- resets `authenticated` table privileges
- rebuilds `authenticated` grants from explicit DML allowlists aligned with the
  current RLS command surface
- leaves server-only tables protected by the prior V20 hardening migration

Remote migration history now includes:

- `20260601025846` - `v20_auth_boundary_rls_hardening`
- `20260601030708` - `v20_client_grant_hardening`

## Nullable Workspace Classification

| Surface | Live nullable column | Boundary classification | Evidence |
| --- | --- | --- | --- |
| `notebooks` | `workspace_id` | Intentional account-scoped global rows | Global rows require `created_by = auth.uid()` in RLS; `created_by` default is `auth.uid()` |
| `workflow_templates` | `workspace_id` | Intentional account-scoped global rows | Global rows require `created_by = auth.uid()` in RLS; `created_by` default is `auth.uid()` |
| `system_events` | `workspace_id` | Workspace-only client read; null rows are server/global telemetry | Client SELECT policy requires `workspace_id IS NOT NULL AND is_workspace_member(workspace_id)` |
| `usage_metrics` | `workspace_id` | Workspace-only client read; null rows are server/global telemetry | Client SELECT policy requires `workspace_id IS NOT NULL AND is_workspace_member(workspace_id)` |
| `permission_audit_logs` | `workspace_id` | Server-only audit surface | No anon/authenticated grants and no client RLS policies |

## Post-Apply Grant Matrix

Read-only SQL verification after applying `v20_client_grant_hardening`:

- protected client table count: `19`
- `anon` grant count across protected client tables: `0`
- `authenticated` non-DML grant count (`TRUNCATE`, `TRIGGER`, `REFERENCES`): `0`
- matching allowlist table count: `19 / 19`
- exceptions: `null`

Server-only table check:

- `api_idempotency_keys`: no `anon` or `authenticated` table grants
- `permission_audit_logs`: no `anon` or `authenticated` table grants

## Local Gates

- `npm run check:auth-boundary` passed with no blocking findings.
- `npm test -- src/lib/backend/security/security-migration.test.ts src/lib/backend/security/auth-boundary-gate.test.ts` passed.
- `git diff --check` passed.

## Advisor Status

Supabase security advisors still report:

- `INFO`: `api_idempotency_keys` has RLS enabled with no policies. Expected:
  server-only table.
- `INFO`: `permission_audit_logs` has RLS enabled with no policies. Expected:
  server-only table.
- `WARN`: Supabase Auth leaked password protection is disabled. This remains an
  external dashboard/configuration gate.

## Decision

Phase 3 client grant hardening: `PASS`

Release remains blocked on the external Supabase Auth leaked password protection
gate unless an owner records a dated exception.

## Next Recommended ROI

Run a route-level spoof probe for protected API v1 routes against the local app:
verify unauthenticated requests, spoofed `X-User-Id`, spoofed `X-Workspace-Id`,
query/body workspace IDs, and protected mutation paths return expected
`401/403/404` style failures without trusting caller-controlled identity.

Estimated remaining rounds to overall target: `2-3`.
