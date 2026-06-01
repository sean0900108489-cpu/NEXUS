# Phase 4 Route Spoof Probe Result - 2026-06-01

## Scope

This round converted the route spoof matrix into a repeatable regression gate.
The probes call representative route handlers directly in-process; they do not
start a browser session, mutate production data, or export secrets.

## High ROI Action

Added:

- `src/lib/backend/security/route-spoof-boundary.test.ts`

Updated:

- `package.json` `check:auth-boundary` now runs:
  - `node scripts/auth-boundary-scan.mjs`
  - `src/lib/backend/security/auth-boundary-gate.test.ts`
  - `src/lib/backend/security/route-spoof-boundary.test.ts`

## Probe Matrix

Representative routes covered:

- `GET /api/v1/artifacts?workspaceId=...`
- `POST /api/v1/artifacts`
- `GET /api/v1/feature-flags?workspaceId=...`
- `GET /api/v1/notebooks?workspaceId=...`
- `GET /api/v1/observability/events` with `X-Workspace-Id`
- `GET /api/v1/prompts?workspaceId=...`
- `POST /api/v1/sync/operations`
- `GET /api/v1/tool-runs` with `X-Workspace-Id`

Identity boundary probes:

- caller supplies only `X-User-Id` with no verified auth
- caller supplies a valid session but mismatched `X-User-Id`
- caller supplies a valid session and spoofed workspace identity for permission
  routes

Expected outcomes:

- unauthenticated caller-controlled identity: `401 AUTH_REQUIRED`
- mismatched caller-controlled user identity: `401 AUTH_INVALID_CREDENTIAL`
- spoofed workspace without membership in production-mode permission gates:
  `403 PERMISSION_*` or `403 WORKSPACE_*`

## Verification

- `npm test -- src/lib/backend/security/route-spoof-boundary.test.ts`
  - `21 passed`
- `npm run check:auth-boundary`
  - no blocking findings
  - `22 passed` across auth boundary gate + route spoof boundary tests
- `git diff --check`
  - passed

## Decision

Route spoof regression gate: `PASS`

Protected representative routes do not accept caller-controlled user identity as
proof of actor. Workspace spoofing is denied by representative permission
gates.

## Residual Risk

This is a representative in-process route matrix, not an exhaustive live-server
probe of every route variant. Remaining route risk should be reduced by adding a
full inventory-driven live HTTP probe once a stable local/dev deployment target
is available.

## Next Recommended ROI

Run a full test/check pass after the new gate is wired into `check`, then do a
release-readiness sweep of remaining blockers:

- Supabase Auth leaked password protection dashboard setting
- full live HTTP route inventory probe
- final V20 evidence ledger and release gate sign-off

Estimated remaining rounds to overall target: `1-2`.
