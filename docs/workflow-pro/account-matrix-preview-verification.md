# Workflow Pro Account Matrix And Preview Verification

Status: verification blueprint.  
Date: 2026-06-03.  
Scope: Workflow Pro, Runtime Lite, generated media, workspace state, auth and
permission boundary.

## Purpose

The 30-point foundation benchmark proves the workflow can run on the local
screen. The next platform risk is account asymmetry: the owner account works,
but a new or lower-permission account receives `Permission denied` or cannot
generate/use nodes.

This document defines the expected matrix before Workflow Pro is considered
preview-ready.

## Current Permission Model

Roles:

- `owner`
- `admin`
- `editor`
- `viewer`

Observed backend policy:

- `owner`: allowed for all workspace actions.
- `admin`: allowed except owner transfer and workspace delete.
- `editor`: read/write workspace and asset resources.
- `viewer`: read only.
- no membership: deny.
- unauthenticated: 401.
- spoof-only headers without a valid session: reject.

Workspace session policy:

- If the preferred workspace is writable by the session user, keep it.
- If the preferred workspace belongs elsewhere, use another writable workspace
  for that session user.
- If the session user has no writable workspace, create an owned workspace.
- Production must fail closed when Supabase service-role configuration is
  missing.
- Local development may use a traceable in-memory fallback.

## Account Matrix

| Actor | Workspace membership | Expected baseline access | Expected Workflow Pro behavior |
| --- | --- | --- | --- |
| Owner | `owner` | read/write/manage | Can import benchmark JSON, apply preview, run A/B/C, generate/download assets. |
| Admin | `admin` | read/write/manage except owner transfer/workspace delete | Can run workflows and manage assets; cannot perform owner-only destructive actions. |
| Editor | `editor` | read/write workspace and assets | Can run workflows, create generated artifacts, and save workspace state. |
| Viewer | `viewer` | read only | Can view workflow state and generated history; cannot run generation, mutate graph, save state, or create assets. |
| New authenticated account | no prior workspace | should receive a new owned workspace or valid fallback workspace | Must not land in a broken permission-denied state. First session should become usable. |
| Authenticated non-member opening another workspace | none for that workspace | deny or reroute to own writable workspace | Must not bootstrap ownership over another user's workspace. |
| Spoof-only request | fake `X-User-Id` / `X-Workspace-Id`, no valid session | reject | Must not execute protected route behavior. |
| Unauthenticated request | none | 401 | Must not expose protected data or mutate state. |

## Route Expectations

Minimum route groups to probe:

- Workspace session: `/api/v1/workspaces/session`
- Workspace state: `/api/v1/workspaces/:workspaceId/state`
- Agent stream: `/api/v1/agents/:agentId/stream`
- Artifacts list/create: `/api/v1/artifacts`
- Artifact item/version/reference/archive routes
- Generated image legacy route behavior: `/api/image-gen`
- Generated image asset route: `/api/image-gen/assets/:assetId`
- Public health/config routes

Expected status families:

- Public routes: 200.
- Protected routes with no valid session: 401.
- Protected routes with valid session but insufficient role: 403 or structured
  permission deny.
- Invalid payloads before permission reaches business logic: 400 is acceptable
  only when the request is rejected before mutation.
- Legacy tool routes in production/preview strict mode: 404.

## Workflow Pro Screen Matrix

Each accepted actor should be tested through the actual UI, not only route
calls.

### Owner / Editor Required Screen Path

1. Open preview URL.
2. Sign in as actor.
3. Ensure workspace session resolves without permission error.
4. Switch to Workflow Pro.
5. Load benchmark A JSON, import, apply, run, confirm success.
6. Load benchmark B JSON, import, apply, run, confirm real image output.
7. Load benchmark C JSON, import, apply, run, wait without hidden timeout,
   confirm all 13 nodes succeed.
8. Open generated history.
9. Download at least one generated asset.

### Viewer Required Screen Path

1. Open preview URL.
2. Sign in as viewer on an existing workspace.
3. Confirm viewer can inspect workflow state.
4. Attempt a mutation such as run/start/save.
5. Confirm the UI blocks it or the backend returns a clean permission-denied
   state with traceable error metadata.
6. Confirm no generated asset is created.

### New Account Required Screen Path

1. Open preview URL in a clean session or different account.
2. Sign in as a newly created account.
3. Confirm `/api/v1/workspaces/session` creates or resolves a writable
   workspace.
4. Confirm the UI does not remain stuck on `Permission denied`.
5. Run benchmark A at minimum.
6. Run benchmark B if image API budget and preview env are available.

## Evidence To Capture

For each actor:

- actor label, not private email.
- role.
- workspace id.
- preview URL.
- benchmark attempted.
- result: pass/fail.
- route status if failed.
- request id / trace id if available.
- screenshot path or manual note.
- generated asset count and download result when relevant.

Do not store access tokens, API keys, refresh tokens, cookies, or raw secrets in
the report.

## Preview Verification Command Shape

Existing strict live route probe:

```bash
AUTH_BOUNDARY_LIVE_BASE_URL=https://preview-url.example \
npm run check:auth-boundary:live
```

For local development only:

```bash
AUTH_BOUNDARY_LIVE_BASE_URL=http://127.0.0.1:3000 \
AUTH_BOUNDARY_LIVE_EXPECT_LEGACY_404=false \
npm run check:auth-boundary:live
```

Do not use the local development flag for preview or production.

## Gaps Before 10 / 10 Auth Score

Current auth score: 9 / 10.

Missing:

- Real preview URL strict live probe.
- Real owner/editor/viewer/new-account UI matrix.
- Evidence that a new account can resolve a writable workspace and run at least
  benchmark A.
- Evidence that a viewer cannot mutate workflows or create generated assets.

## Acceptance For Preview-Ready Status

Workflow Pro can be considered preview-ready when:

- Local tests and typecheck pass.
- Production build passes.
- Strict live auth probe passes on preview URL with zero warnings.
- Owner/editor screen paths pass.
- Viewer denial path is clean and traceable.
- New account first-run path does not permission-loop.
- Generated history and download work for at least one non-owner writable
  actor.

## Next Implementation Option

The machine-readable verification manifest lives in:

- `account-matrix-preview-verification.manifest.json`

Shape:

```json
{
  "schema": "nexus.workflowPro.accountMatrix.v1",
  "previewUrl": "",
  "actors": [
    { "label": "owner", "role": "owner", "requiresScreen": true },
    { "label": "editor", "role": "editor", "requiresScreen": true },
    { "label": "viewer", "role": "viewer", "requiresScreen": true },
    { "label": "new-account", "role": "owner-after-session", "requiresScreen": true }
  ],
  "benchmarks": ["A", "B", "C"],
  "requiredEvidence": ["route-status", "trace-id", "screenshot", "generated-download"]
}
```

This can later drive a checklist UI, a script, or a Codex runbook without
changing the product runtime.
