# Phase 5 Full Check And Release Readiness - 2026-06-01

Superseded note: the external Supabase Auth leaked password protection blocker
recorded in this Phase 5 snapshot was closed in
`PHASE_6_SUPABASE_AUTH_PASSWORD_PROTECTION_CLOSEOUT_20260601.md`.

## Scope

This round verified that all V20 auth boundary hardening work is wired into the
normal project quality gate.

## Command

```bash
npm run check
```

## Result

`PASS`

Completed stages:

- `npm run check:auth-boundary`
  - static auth-boundary scan: no blocking findings
  - `auth-boundary-gate.test.ts`: passed
  - `route-spoof-boundary.test.ts`: passed
- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm run test`: `80` files passed, `631` tests passed
- `npm run build`: passed

Build warning observed:

- `Using edge runtime on a page currently disables static generation for that page`

This warning existed outside the auth-boundary repair scope and does not indicate
a failed check.

## Final Supabase Advisor Snapshot

Security advisors still report:

- `INFO`: `api_idempotency_keys` has RLS enabled with no policies. Expected:
  server-only table with no client grants.
- `INFO`: `permission_audit_logs` has RLS enabled with no policies. Expected:
  server-only table with no client grants.
- `WARN`: Supabase Auth leaked password protection is disabled. This remains the
  only security advisor item that is not closed by code or SQL migration.

## Release Readiness Decision

Code and database hardening readiness: `PASS`

External release gate: `BLOCKED`

Reason:

- Supabase Auth leaked password protection must be enabled in the Supabase
  dashboard, or a dated owner exception must be recorded in
  `docs/audit-protocols/v20/06-release-gates/SUPABASE_AUTH_PASSWORD_SECURITY_GATE.md`.

## Remaining Actions

1. Enable Supabase Auth leaked password protection for project
   `xjuglddxwnikvcwxfbzg`, then rerun security advisors.
2. Optionally run a live HTTP inventory probe against a stable local or preview
   deployment for extra assurance beyond the in-process route regression.
3. Finalize the V20 release gate sign-off.

Estimated remaining rounds to overall target: `1`.
