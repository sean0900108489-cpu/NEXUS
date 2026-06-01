# Phase 6 Supabase Auth Password Protection Closeout - 2026-06-01

## Scope

Close the remaining external Supabase Auth password-security release gate for
the `NEXUS` project.

Target project:

- Supabase project ref: `xjuglddxwnikvcwxfbzg`
- Product area: Auth provider settings
- Setting: Email provider `Prevent use of leaked passwords`

## Action

The setting was enabled in the Supabase Dashboard under Auth provider settings
after explicit user confirmation.

No secrets, tokens, service-role keys, raw user records, or browser storage were
exported.

## Verification Command

```txt
get_advisors(project_id = xjuglddxwnikvcwxfbzg, type = security)
```

## Advisor Result

`PASS`

The security advisor no longer reports:

- `auth_leaked_password_protection`

Remaining security advisor items:

- `INFO`: `public.api_idempotency_keys` has RLS enabled with no policies.
  Expected: server-only table with no client grants.
- `INFO`: `public.permission_audit_logs` has RLS enabled with no policies.
  Expected: server-only table with no client grants.

These remaining INFO findings do not reopen the password-security gate.

## Release Gate Decision

External Supabase Auth password-security gate: `PASS`

The Phase 5 full check remains the latest full code-quality gate result:

- `npm run check`: `PASS`
- static auth-boundary scan: no blocking findings
- focused auth-boundary and route-spoof tests: passed
- lint, typecheck, unit tests, and build: passed

## Score Impact

Starting anchor: `50/100`

Current overall release readiness: about `94-96/100`.

Remaining non-blocking work:

- optional live HTTP inventory probe against a stable local or preview
  deployment
- final owner sign-off for V20 closeout

Estimated remaining rounds to overall target: `0-1`.
