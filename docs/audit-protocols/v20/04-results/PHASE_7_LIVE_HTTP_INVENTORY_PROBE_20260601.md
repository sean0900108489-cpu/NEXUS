# Phase 7 Live HTTP Inventory Probe - 2026-06-01

## Scope

Run the final V20 status-only live HTTP smoke probe against a local production
Next.js server.

The probe verifies that protected API routes do not accept caller-controlled
identity headers without server-side authentication, and that production-blocked
legacy routes are not publicly reachable.

## Commands

Production server:

```bash
npm run start -- -p 3120
```

Live probe:

```bash
AUTH_BOUNDARY_LIVE_BASE_URL=http://127.0.0.1:3120 npm run check:auth-boundary:live
```

## Safety Controls

- No Authorization header was sent.
- No cookies were sent.
- No response bodies were captured.
- No public-config body was printed.
- No browser storage, service-role keys, provider keys, Supabase secrets, or
  user records were exported.
- Mutation probes used unauthenticated, intentionally non-authoritative payloads
  and expected rejection.

## Result

`PASS`

Summary:

- total probes: `48`
- public reachable probes: `2`
- legacy production-block probes: `9`
- protected spoof-only probes: `37`
- blocking findings: `0`
- warnings: `0`

Route inventory:

- API route files: `45`
- protected routes classified by static gate: `36`

## Key Status Outcomes

- `GET /api/v1/health`: `200`
- `GET /api/v1/public-config`: `200`
- `/api/tools/fs-scanner` GET/POST: `404`
- `/api/tools/web-surfer` GET/POST: `404`
- `/api/agent-stream` POST: `404`
- `/api/image-gen` POST: `404`
- `/api/memory-compress` POST: `404`
- `/api/predictive-intel` POST: `404`
- `/api/v1/providers/verify` POST: `404`
- `/api/v1/agents/:agentId/stream` POST with spoof-only headers: `401`

All probed protected routes returned non-success statuses under spoof-only
identity headers.

Some mutation routes returned `400` because validation rejected the intentionally
minimal unauthenticated payload before authorization. These are not treated as
proof of permission authorization ordering; the focused in-process regression
tests remain the stronger proof for those flows.

## Supabase Advisor Cross-Check

Latest security advisor snapshot:

- `auth_leaked_password_protection`: absent
- `INFO`: `public.api_idempotency_keys` has RLS enabled with no policies.
  Expected: server-only table with no client grants.
- `INFO`: `public.permission_audit_logs` has RLS enabled with no policies.
  Expected: server-only table with no client grants.

No Supabase security advisor `WARN` remains in the V20 release-blocking scope.

## Release Gate Decision

V20 live HTTP inventory gate: `PASS`

Current overall release readiness: about `97-98/100`.

Estimated remaining rounds to overall target: `0`.
