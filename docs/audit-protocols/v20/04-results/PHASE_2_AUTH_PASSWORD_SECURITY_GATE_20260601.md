# Phase 2 Auth Password Security Gate - 2026-06-01

## Scope

Follow-up on the remaining Supabase security advisor warning after V20 DB
hardening:

- `auth_leaked_password_protection`

No Supabase Auth settings were changed in this step.

## Documentation Check

Supabase documentation says leaked password protection:

- rejects passwords known to be leaked
- uses HaveIBeenPwned Pwned Passwords API
- is configured in project Auth settings
- is available on Pro Plan and above

## Tool Capability Check

Current available Supabase tools can:

- read project advisors
- read project metadata
- apply SQL migrations
- run read-only SQL checks

Current available Supabase tools do not expose a safe Auth configuration update
operation for leaked password protection.

## Gate Added

Added:

- `docs/audit-protocols/v20/06-release-gates/SUPABASE_AUTH_PASSWORD_SECURITY_GATE.md`

Updated:

- `docs/audit-protocols/v20/06-release-gates/README.md`

## Current Verdict

Phase 2 DB hardening is mostly passed, but Phase 2 Auth config is not fully
passed until one of these happens:

- leaked password protection is enabled and the advisor warning disappears
- an owner records a dated plan/plan-limitation exception
- password-based auth is declared unsupported and documented

## Score Impact

- Overall readiness remains about 78-80/100.
- This round reduces process risk but does not raise the score much because the
  external Auth setting is still disabled.

Estimated remaining rounds to overall target: 3-4.
