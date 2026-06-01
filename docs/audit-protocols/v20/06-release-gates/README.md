# Release Gates Workspace

Use this folder for final sign-off checklists after the post-fix scan.

Phase-one release gate:

- no phase-one `P0`
- `npm run check:auth-boundary` exits with no blocking findings
- focused regression tests pass
- protected route spoof probes reject caller-controlled identity
- legacy tool routes are not public in production
- v1 stream cannot write before workspace permission
- browser-readable persistence does not retain raw provider/API keys
- V20 Supabase hardening migration is applied to the target environment and
  the post-apply RLS/grant matrix has no server-only client grants
- V20 client grant hardening migration is applied to the target environment:
  protected tables have no `anon` table grants, and `authenticated` grants are
  limited to explicit client-facing DML
- Supabase Auth leaked password protection is enabled and verified by the
  security advisor, or an owner has recorded a dated exception in
  `SUPABASE_AUTH_PASSWORD_SECURITY_GATE.md`
- live HTTP inventory probe returns zero blocking findings and zero warnings
- remaining `P1/P2` issues are documented with owners or next-phase placement

Latest technical signoff:

- `V20_FINAL_TECHNICAL_SIGNOFF_20260601.md`
