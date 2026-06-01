# Supabase Auth Password Security Gate

## Purpose

Track the Supabase Auth password-security setting that cannot be verified by
local source scanning alone.

Historical live advisor finding on `NEXUS` before the Phase 6 closeout:

- `auth_leaked_password_protection`
- Level: `WARN`
- Status: leaked password protection disabled

Latest verified advisor status on 2026-06-01:

- `auth_leaked_password_protection`: absent
- Gate status: `PASS`

## Source Of Truth

Supabase official docs:

- `https://supabase.com/docs/guides/auth/password-security`

Relevant documented behavior:

- Supabase Auth can reject known leaked passwords.
- The check uses the HaveIBeenPwned Pwned Passwords API.
- The setting is configured in project Auth settings.
- The feature is available on Pro Plan and above.

## Gate

Phase 2 cannot be marked fully complete until one of these is true:

1. Leaked password protection is enabled in the target Supabase project and the
   security advisor warning disappears.
2. The project is not on a plan that supports the feature, and an owner accepts
   the risk with a dated note and compensating controls.
3. Password-based login is intentionally disabled for the product, and an owner
   records the supported auth methods and risk decision.

## Verification Command

Use the Supabase security advisor against the target project:

```txt
get_advisors(project_id = NEXUS, type = security)
```

Pass condition:

- no `auth_leaked_password_protection` WARN remains

Fail condition:

- `auth_leaked_password_protection` remains without an owner decision

## Current Status

As of 2026-06-01:

- status: PASS
- Email provider `Prevent use of leaked passwords` was enabled in the Supabase
  Dashboard after explicit user confirmation.
- Supabase security advisors no longer report
  `auth_leaked_password_protection`.

## Next Actions

1. Keep this gate in the recurring auth-boundary maintenance checklist.
2. If Auth provider settings are changed later, re-run security advisors.
3. Treat any return of `auth_leaked_password_protection` as a release blocker
   unless an owner records a dated exception.
