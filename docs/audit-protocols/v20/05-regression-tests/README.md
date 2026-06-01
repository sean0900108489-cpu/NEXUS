# Regression Test Workspace

Track required and observed regression tests for the phase-one repair.

Minimum expected coverage:

- `npm run check:auth-boundary`
- filesystem scanner denied in production without auth
- web surfer denied in production without auth
- v1 stream workflow-lite cannot skip workspace permission
- Supabase session bearer is not used as provider/runtime key
- spoof-only identity headers are rejected on protected routes
- production permission service fails closed without required service-role config
- browser-readable persistence does not store raw provider/API keys
- V20 Supabase hardening migration removes ownerless workspace writes and
  revokes client grants on server-only tables
- `npm run check:auth-boundary:live` against a local or preview deployment
  returns zero blocking findings and zero warnings

Keep this folder focused on test inventory and redacted results, not full logs.
