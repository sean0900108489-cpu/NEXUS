# V20 Final Technical Signoff - 2026-06-01

## Decision

Technical V20 auth-boundary release gate: `PASS`

## Evidence Summary

- Static auth-boundary scan: `PASS`
- Focused auth-boundary tests: `22/22` passed
- Final full project check after Phase 7: `PASS`
- Supabase Auth leaked password protection: `PASS`
- Supabase security advisor release-blocking WARN count: `0`
- Post-build live HTTP inventory probe: `48` probes, `0` blocking findings,
  `0` warnings

## Closed Release Blockers

- Legacy filesystem scanner unavailable in production.
- Legacy web surfer unavailable in production.
- Legacy provider/runtime utility routes unavailable in production.
- v1 stream cannot use caller-controlled workflow/runtime or workspace headers
  to bypass workspace permission.
- Supabase session `Authorization` is not reused as a runtime/provider key.
- Protected routes reject spoof-only identity headers.
- Production permission checks fail closed when required server-side membership
  configuration is absent.
- Browser-readable persistence no longer stores raw provider/API keys.
- Supabase RLS/client grants are hardened for V20 protected tables.
- Supabase Auth leaked password protection is enabled and advisor-verified.

## Remaining Non-Blocking Notes

- `api_idempotency_keys` and `permission_audit_logs` intentionally have RLS
  enabled with no policies because they are server-only and have no client
  grants.
- Some live mutation smoke probes return `400` before auth because the probe
  payload is intentionally minimal. Focused regression tests cover the stronger
  authorization-order guarantees.

## Score

Starting anchor: `50/100`

Current technical release readiness: about `97-98/100`.

Remaining rounds to technical target: `0`.

Owner/product sign-off can now happen without another V20 auth-boundary repair
round.
