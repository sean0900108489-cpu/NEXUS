# Phase 2 Supabase Hardening Apply - 2026-06-01

## Scope

Applied the V20 auth-boundary hardening migration to the `NEXUS` Supabase
target environment.

- Project ref: `xjuglddxwnikvcwxfbzg`
- Migration applied by Supabase migration API.
- Migration name: `v20_auth_boundary_rls_hardening`
- Remote migration version observed after apply: `20260601025846`

No table data was exported. Verification used redacted read-only counts and
schema/policy facts.

## Applied Change

Migration applied:

- `supabase/migrations/20260601001000_v20_auth_boundary_rls_hardening.sql`

Safety shape:

- no `DROP TABLE`
- no `DROP COLUMN`
- no `TRUNCATE`
- no `DELETE FROM`
- DDL only:
  - replace legacy workspace write policies
  - remove server-only table client policies if any exist
  - revoke server-only table grants from `anon`, `authenticated`, and `PUBLIC`
  - restore service-role grants required by server repositories

## Post-Apply Verification

Remote migration history:

- `v20_auth_boundary_rls_hardening` is present.

Workspace policy verification:

- ownerless workspace policy count: `0`
- `workspaces_insert_owner_or_legacy`: removed
- `workspaces_update_editor_or_legacy`: removed
- remaining workspace write policies require:
  - `owner_user_id = auth.uid()`, or
  - `public.has_workspace_role(...)`

Server-only grant verification:

- `api_idempotency_keys` + `permission_audit_logs` client grant count: `0`
- `anon`: no table privileges on these server-only tables
- `authenticated`: no table privileges on these server-only tables
- `PUBLIC`: no table privileges on these server-only tables

Server-only policy verification:

- `api_idempotency_keys`: no client RLS policies
- `permission_audit_logs`: no client RLS policies

## Remaining Supabase Advisor Items

Still observed:

- INFO: `api_idempotency_keys` has RLS enabled and no policies.
- INFO: `permission_audit_logs` has RLS enabled and no policies.
- WARN: Supabase Auth leaked password protection is disabled.

Interpretation:

- The two no-policy findings are expected for server-only tables after grant
  removal.
- The leaked password protection warning should move into the next ROI round
  because it is an Auth configuration hardening item, not an RLS/policy bug.

## Phase 2 Gate Verdict

Phase 2 DB hardening blocker is cleared for:

- ownerless workspace write bridge
- server-only table client grants

Phase 2 still has follow-up work:

- decide and apply Supabase Auth leaked password protection setting
- classify remaining nullable `workspace_id` surfaces for Phase 3
- optionally narrow broad default table grants on workspace tables after
  route/client compatibility review

## Score Impact

- First-stage local repair + framework: about 90/100.
- Phase 2 DB hardening: moved from blocked to mostly passed.
- Overall upgrade readiness: about 78-80/100.

Estimated remaining rounds to overall target: 3-4.
