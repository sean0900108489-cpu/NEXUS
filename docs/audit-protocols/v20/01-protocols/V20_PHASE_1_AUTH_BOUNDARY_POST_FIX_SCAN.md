# V20 Phase 1 Auth Boundary Post-Fix Scan

## 0. Purpose

Run this protocol only after the phase-one auth-boundary repairs are implemented.
It verifies that the highest-ROI release blockers from the 2026-06-01 audit are
closed without relying on prior conversation context.

Core question:

```txt
Did phase one remove unauthenticated legacy tool access and the v1 stream
permission bypass, while preserving the canonical server-side actor boundary?
```

## 1. Target Outcome

The scan passes only when all of these are true:

- `P0` findings in this protocol: `0`.
- Filesystem scanner is unavailable in production without verified actor and
  explicit permission.
- Web surfer is unavailable in production without verified actor and explicit
  permission.
- v1 stream cannot skip workspace permission from caller-controlled headers.
- Supabase session bearer is not accepted as a runtime/provider API key.
- Protected routes reject spoof-only identity headers.
- Focused regression tests pass.
- Evidence is status-code, boolean, count, schema, or redacted summary only.

Suggested target score: `92+ / 100` with zero `P0`. Do not pass the scan with a
lower score if any phase-one `P0` remains.

## 2. Safety Rules

- Use read-only probes by default.
- Do not export `.env.local`, Vercel env values, Supabase secrets, service-role
  keys, provider keys, Authorization headers, cookies, localStorage, IndexedDB,
  or raw browser auth storage.
- Prefer status codes, booleans, table/policy counts, and redacted excerpts.
- Do not create production records to prove a bypass.
- If a probe could write data, use unauthenticated or intentionally invalid
  credentials so the expected result is `401` or `403`.

## 3. Required Preflight

Record:

- repository root
- branch
- commit
- dirty worktree summary
- package scripts relevant to test/typecheck/lint
- Next.js version
- Supabase project id if available
- Vercel project/deployment id if available
- whether local `.env.local` exists, without reading values

Read before scanning:

- `AGENTS.md`
- `docs/audit-protocols/NEXUS_AUTH_IDENTITY_PERMISSION_BOUNDARY_SCAN_PROTOCOL_98.md`
- this protocol
- relevant local Next.js docs under `node_modules/next/dist/docs/`

## 4. Route Inventory Delta

Build a fresh inventory of all `src/app/**/route.ts` files.

Required classifications:

- public intentional
- auth-only
- permission-gated
- dev-only gated
- removed
- legacy/unwrapped

The scan must specifically account for:

- `/api/tools/fs-scanner`
- `/api/tools/web-surfer`
- `/api/v1/agents/[agentId]/stream`
- `/api/agent-stream`
- `/api/image-gen`
- `/api/memory-compress`
- `/api/predictive-intel`
- `/api/v1/providers/verify`
- `/api/v1/health`
- `/api/v1/public-config`

## 5. Phase-One P0 Signatures

Classify as `P0` if any of these remain:

1. `/api/tools/fs-scanner` returns filesystem data in production without a
   verified actor and permission decision.
2. `/api/tools/web-surfer` performs server-side network reads in production
   without a verified actor and permission decision.
3. `/api/v1/agents/[agentId]/stream` can reach task/session/message/runtime
   writes before workspace permission is proven.
4. Caller-controlled `X-Nexus-Workflow-Runtime`, `X-User-Id`, `X-Workspace-Id`,
   query params, or body fields can bypass workspace membership.
5. Supabase session `Authorization` is reused as a provider/runtime API key for
   a protected route.
6. Production permission checks grant local fallback membership instead of
   failing closed when required service-role membership configuration is absent.

## 6. Actor And Runtime Key Trace

Trace these code paths:

- server actor verification
- `X-User-Id` mismatch rejection
- workspace id resolution
- permission service call
- v1 stream task/session preparation
- runtime/provider key extraction
- service-role repository writes

Required proof points:

- canonical actor comes from server-side Supabase `getUser()` or equivalent
  trusted verifier
- `X-User-Id` is never canonical actor material
- `X-Workspace-Id` is never permission proof
- stream permission check happens before durable writes
- provider/runtime API key source is distinct from Supabase session bearer

## 7. Required Read-Only Probe Matrix

Run against a local server unless the user explicitly asks for production probes.
Do not print sensitive response bodies.

| Probe | Expected |
|---|---|
| `GET /api/v1/health` | `200` |
| `GET /api/v1/public-config` | `200`, public keys only |
| protected artifact route without auth | `401` |
| protected artifact route with spoof headers only | `401` |
| prompt route with spoof `X-User-Id` only | `401` |
| workspace recovery with spoof `X-User-Id` only | `401` |
| v1 stream with spoof headers and no auth | `401` |
| fs scanner without auth in production mode | `401`, `403`, or `404` |
| web surfer without auth in production mode | `401`, `403`, or `404` |
| v1 stream workflow-lite with invalid auth | `401` |

If an authenticated non-member test identity is safely available, also verify:

| Probe | Expected |
|---|---|
| v1 stream workflow-lite with authenticated non-member | `403` before writes |
| v1 stream with Supabase bearer but no runtime key | no provider-key fallback |

## 8. Required Regression Tests

The fix should add or preserve tests for:

- unauthenticated filesystem scanner denied in production
- unauthenticated web surfer denied in production
- v1 stream workflow-lite cannot skip permission
- Supabase bearer is not accepted as provider/runtime key
- spoof-only identity headers rejected on protected routes
- production permission service fails closed without required service-role config

Run the focused auth/security test set. Also run any newly added route tests.

Optional but recommended final live smoke gate:

```bash
AUTH_BOUNDARY_LIVE_BASE_URL=http://127.0.0.1:<port> npm run check:auth-boundary:live
```

This command must record status codes only. It must not capture response bodies,
cookies, Authorization headers, browser storage, or secrets.

## 9. Supabase Check

Use read-only Supabase metadata when available:

- public table count
- RLS enabled count
- tables with zero policies
- anon policies count
- policy summary for workspace/runtime/tool tables
- security advisor summary

Do not export table contents or secrets.

## 10. Required Report Format

Return the report using this structure:

```md
# V20 Phase 1 Auth Boundary Post-Fix Scan

## 1 Executive Summary
## 2 Scope And Preflight
## 3 Phase-One Goal Verdict
## 4 Route Inventory Delta
## 5 Actor And Runtime Key Trace
## 6 Tool Route Boundary Results
## 7 V1 Stream Permission Results
## 8 Spoof Probe Matrix
## 9 Regression Test Results
## 10 Supabase/RLS Sanity Check
## 11 Evidence Matrix
## 12 Remaining Risks
## 13 Release Gate Decision
## 14 Required Follow-Ups
```

## 11. Pass/Fail Rule

Pass:

- zero phase-one `P0`
- all required tests pass
- all required unauthenticated/spoof probes match expected status class
- stream permission cannot be skipped by caller-controlled request fields

Fail:

- any phase-one `P0`
- any protected route accepts spoof-only identity
- fs scanner or web surfer remains public in production
- stream can write before permission
- Supabase bearer still doubles as runtime/provider key

## 12. Notes For Future Executors

Do not assume the prior audit result is still true. Rebuild inventory and rerun
the probes. If implementation intentionally changes a route from public to
dev-only, verify production behavior, not only local development behavior.
