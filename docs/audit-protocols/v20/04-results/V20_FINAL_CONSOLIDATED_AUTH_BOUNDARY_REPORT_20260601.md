# V20 Final Consolidated Auth Boundary Report - 2026-06-01

## 1. Executive Summary

V20 auth, identity, and permission-boundary technical remediation is complete.

Final technical verdict:

- release-blocking `P0` in V20 scope: `0`
- technical release gate: `PASS`
- current technical readiness: about `97-98/100`
- remaining technical repair rounds: `0`

This report consolidates the staged V20 results into the required protocol
format from the original boundary scan.

## 2. Scope And Preflight

Repository:

- root: `/Users/sean/Documents/FreeChat`
- branch: `main`
- starting commit observed during final closeout: `926ec9c`
- framework: Next.js `16.2.6`
- Supabase project: `xjuglddxwnikvcwxfbzg`

Safety rule followed:

- no secrets, service-role keys, provider keys, cookies, Authorization headers,
  raw browser storage, table contents, or sensitive response bodies were
  exported.

Local evidence note:

- `docs/audit-protocols/` is currently excluded by `.git/info/exclude`.
  The V20 evidence workspace exists locally; force-add or move it if the
  evidence must be included in a PR.

## 3. Scorecard

Baseline anchor requested by owner: `50/100`.

Current technical score:

- V20 technical release readiness: `97-98/100`
- phase-one technical repair target: met
- owner/product sign-off: pending outside technical gate

Score drivers:

- route inventory became repeatable
- spoof-only identity probes became repeatable
- legacy production blocks landed
- Supabase RLS/client grants were hardened
- Supabase Auth leaked password protection was enabled and advisor-verified
- full project gate and post-build live probe passed

## 4. Route Inventory

Latest static inventory:

- route files: `45`
- protected routes: `36`
- auth-required routes: `17`
- permission routes: `17`
- legacy production-blocked route handlers: `7` source files, `9` live method
  probes

Important public routes:

- `GET /api/v1/health`
- `GET /api/v1/public-config`

Important production-blocked legacy/tool/provider routes:

- `/api/tools/fs-scanner`
- `/api/tools/web-surfer`
- `/api/agent-stream`
- `/api/image-gen`
- `/api/memory-compress`
- `/api/predictive-intel`
- `/api/v1/providers/verify`

## 5. Actor Source Trace

Canonical actor source:

- server-side Supabase bearer/cookie verification through
  `createSupabaseBearerAuthSessionVerifier()`
- `resolveApiActor()` rejects mismatched `X-User-Id` values after session
  verification

Untrusted caller-controlled values:

- `X-User-Id`
- `X-Workspace-Id`
- query/body `workspaceId`
- workflow/runtime headers

Boundary status:

- `X-User-Id` is a mismatch-check input, not the canonical actor.
- `X-Workspace-Id` is a routing/scope hint, not proof of workspace membership.
- v1 stream now proves actor and workspace permission before durable
  task/session/runtime writes.

## 6. Spoof Matrix Results

Focused in-process spoof matrix:

- test files: `2`
- focused tests: `22/22` passed

Post-build live HTTP matrix:

- total probes: `48`
- protected spoof-only probes: `37`
- blocking findings: `0`
- warnings: `0`
- v1 stream spoof-only result: `401`

Observed protected route statuses were non-success. Some mutation probes returned
`400` due intentionally minimal invalid bodies; focused tests cover those deeper
authorization-order assertions.

## 7. Permission Service Review

Production permission behavior:

- local fallback membership no longer grants production access
- missing production service-role membership configuration fails closed
- permission checks remain required before service-role-backed protected data
  paths

Regression coverage:

- production fail-closed behavior is covered in security service tests
- route spoof boundary tests cover no-auth, spoofed user, and verified
  non-member paths

## 8. Repository And Service-Role Review

V20 service-role risk was reduced by:

- revoking client grants from server-only tables
- keeping idempotency and audit-log tables server-only
- enforcing actor/permission proof before protected repository writes
- removing workflow-lite permission bypass from the stream path

Server-only tables intentionally retaining RLS with no policies:

- `api_idempotency_keys`
- `permission_audit_logs`

These are expected to remain unavailable to `anon` and `authenticated` client
roles.

## 9. Supabase RLS And Policy Matrix

Applied migrations:

- `20260601001000_v20_auth_boundary_rls_hardening.sql`
- `20260601002000_v20_client_grant_hardening.sql`

Remote migration records observed:

- `20260601025846` for auth-boundary RLS hardening
- `20260601030708` for client grant hardening

Post-hardening status:

- protected client tables covered: `19`
- protected table `anon` grants: `0`
- authenticated grants reset to explicit DML allowlists
- server-only table client grants removed

Supabase advisor status:

- `auth_leaked_password_protection`: absent
- remaining INFO only: RLS enabled with no policy on the two server-only tables

## 10. Legacy Route And Tool Boundary Sweep

Production behavior:

- legacy/tool/provider route live probes: `9`
- expected production block result: `404`
- observed production block result: `9/9` returned `404`

Closed high-risk surfaces:

- local filesystem scan route
- server-side web surf route
- legacy agent/provider/runtime utility routes

## 11. Browser/Client Storage Boundary

Browser-readable persistence now scrubs raw auth secrets:

- persistence version advanced to `15`
- persisted `authVault` goes through a local persistence scrubber
- raw global/provider API keys are nulled before persistence

Regression coverage:

- store persistence tests verify scrubbed local storage shape
- static auth-boundary gate checks for raw auth vault persistence regression

## 12. Evidence Matrix

Primary evidence:

- `npm run check`: `PASS`
- `npm run check:auth-boundary`: `PASS`
- `npm run check:auth-boundary:live`: `PASS`
- `git diff --check`: `PASS`
- Supabase security advisor: no V20 release-blocking WARN

Detailed local evidence:

- `PHASE_5_FULL_CHECK_RELEASE_READINESS_20260601.md`
- `PHASE_6_SUPABASE_AUTH_PASSWORD_PROTECTION_CLOSEOUT_20260601.md`
- `PHASE_7_LIVE_HTTP_INVENTORY_PROBE_20260601.md`
- `PHASE_8_FINAL_FULL_CHECK_AND_SIGNOFF_20260601.md`
- `V20_FINAL_TECHNICAL_SIGNOFF_20260601.md`

## 13. P0/P1 Risk Register

P0:

- none open in V20 technical scope

P1/P2 or operational notes:

- owner/product sign-off remains outside the technical repair gate
- keep `api_idempotency_keys` and `permission_audit_logs` server-only
- docs evidence is locally ignored by Git unless explicitly force-added or moved
- rerun live probe after preview/prod deployment because deployment
  configuration can differ from local production mode

## 14. Repair Plan

Repair plan status:

- legacy route production blocks: complete
- v1 stream permission bypass fix: complete
- runtime/provider key separation: complete
- permission fail-close: complete
- browser persistence scrub: complete
- Supabase RLS/client grant hardening: complete
- Supabase Auth leaked password protection: complete
- repeatable static and live gates: complete

No additional V20 technical repair round is required.

## 15. Required Tests

Passing test gates:

- focused auth-boundary tests: `22/22`
- full test suite: `80` files, `631` tests
- lint: pass
- typecheck: pass
- build: pass

New/updated repeatable gates:

- `npm run check:auth-boundary`
- `npm run check:auth-boundary:live`

## 16. Release Gates

Technical gate decision: `PASS`

Required V20 gates now met:

- zero V20 P0
- protected spoof-only routes reject
- legacy tool routes unavailable in production
- v1 stream permission path protected
- browser-readable storage scrubbed
- Supabase RLS/client grants hardened
- Supabase Auth leaked password protection advisor-verified
- full project check passed
- post-build live HTTP probe passed

## 17. Untested Or Blocked Boundaries

Not performed in this final local closeout:

- authenticated live non-member probe with a real test account
- preview/production deployment probe after pushing the branch
- GitHub PR review/CI because no commit or PR was requested

These do not block the V20 local technical gate, but they are good follow-up
checks after deploy.

## 18. Final Verdict

V20 auth-boundary technical remediation is complete.

Final decision:

- `PASS`
- technical readiness: `97-98/100`
- remaining technical repair rounds: `0`

Next natural step:

- create a branch/commit/PR and run CI plus preview live probe, or move to the
  next maintenance phase.
