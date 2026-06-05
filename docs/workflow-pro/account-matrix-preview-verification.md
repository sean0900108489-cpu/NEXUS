# Workflow Pro Account Matrix And Preview Verification

Status: source-guarded with R89 live audit; new-account preview A screen pass
recorded in R95; owner/editor/viewer matrix still pending.  
Date: 2026-06-04.  
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

## Executable Source Guard

The manifest is not only planning text. It is read by:

```bash
npm test -- src/lib/backend/security/security-services.test.ts
```

Protected source behavior:

- the manifest actor list must stay aligned with the expected Workflow Pro
  roles and edge cases.
- owner/admin/editor can perform core runtime write actions where appropriate.
- viewer can read but cannot run workflows, mutate graph state, save workspace
  state, or create generated artifacts.
- editor can create workflow/artifact assets but cannot manage membership,
  provider settings, or tool execution.
- admin cannot delete workspaces or transfer ownership.
- non-members and unauthenticated requests fail closed with traceable reason
  codes.

This guard does not replace real preview UI verification. It prevents the
authorization contract from drifting while the account-matrix screen run is
being prepared.

## R89 Live Supabase And Local Probe Evidence

R89 added a read-only live evidence manifest:

- `account-matrix-live-audit.manifest.json`

What it proves:

- The active local project points to Supabase project `xjuglddxwnikvcwxfbzg`
  (`NEXUS`), and that project is active healthy.
- Core tables for workspace membership, workspace state, snapshots, sync,
  artifacts, tool runs, and permission audit logs exist live with RLS enabled.
- Live policies align with the source model: members can read, editors can write
  workspace/assets, owner/admin manage higher-risk areas, and viewer/non-member
  mutation paths are denied.
- Supabase security advisor findings are limited to expected server-only tables
  with no browser policies: `api_idempotency_keys`, `deployment_checks`, and
  `permission_audit_logs`.
- A local live auth-boundary probe against `http://127.0.0.1:3000` ran 49
  probes with 0 blocking findings. Spoof-only protected requests were rejected;
  local legacy-route warnings are expected because production 404 enforcement is
  intentionally disabled for localhost.
- Recent live permission audit logs are traceable and include both allowed and
  denied decisions. Denials are not automatically failures; they become failures
  only if the next screen matrix proves a valid actor was blocked.

What it does not prove yet:

- It does not replace strict preview URL probing.
- It does not prove owner/editor/viewer/new-account behavior through the real UI.
- It does not prove non-owner generated asset download.
- It does not prove that every recent live `PERMISSION_DENIED` row was the
  expected actor outcome.

## R90 Strict Preview Probe Readiness

R90 added a second live evidence manifest:

- `strict-preview-live-probe.manifest.json`

What changed:

- `scripts/live-auth-boundary-probe.mjs` now supports Vercel Deployment
  Protection bypass for automation. If `VERCEL_AUTOMATION_BYPASS_SECRET` is
  configured, the probe sends `x-vercel-protection-bypass` on every request.
- The probe reports only whether the bypass header is present; it must never
  print, store, or commit the secret.
- The probe now emits `platformProtectionLikely` so preview-level `401`
  responses are not confused with NEXUS app-layer permission failures.

R90 remote findings:

- Latest ready `v22` preview:
  `https://nexus-csi61m51s-sean-s-projects10.vercel.app`
  returned `401` for public, protected, and legacy probes. Because public
  health and public config were also blocked, this is classified as Vercel
  deployment protection until a bypass secret is configured and the app layer
  can be reached.
- Public production domain:
  `https://nexus-swart-ten.vercel.app` reached the app layer. Public health and
  public config returned `200`; spoof-only protected routes were rejected; legacy
  routes returned `404` except `/api/image-gen`, which returned `400`.

The `/api/image-gen` result is not treated as an auth pass. It records an
explicit product/security decision that remains open:

- Either `/api/image-gen` stays a dev-only/legacy route and production image
  execution moves behind an authenticated v1 route.
- Or `/api/image-gen` becomes a formal production route with authenticated
  workspace access and provider credentials separated from Supabase
  `Authorization`.

## R91 Image Generation Production Boundary

R91 closes the source-side decision:

- `image-generation-production-boundary.manifest.json`

## R95 New Account Preview Screen Evidence

R95 tested the failure mode that originally made this matrix necessary:

```text
Owner account can run generation, but a newly created authenticated account
hits Permission denied when it uses Workflow Pro or runtime nodes.
```

Preview deployment:

- `https://nexus-3hsrmfl45-sean-s-projects10.vercel.app`
- Deployment id: `dpl_HWCL4HskmT72xLGvBNsqSXD9twLH`

Screen path completed through Chrome / Computer Use:

1. Created a fresh authenticated account in the preview UI.
2. Confirmed the workspace menu showed `Workspace cloud session linked`.
3. Opened Workflow Pro.
4. Loaded `A / Input -> LLM -> LLM -> Output` from the foundation benchmark
   button.
5. Imported the pasted JSON contract and confirmed the draft held 4 nodes,
   3 edges, and 1 output.
6. Applied the Workflow Pro preview into Graph.
7. Clicked `Start All` from the graph UI.
8. Confirmed `bench-a-input`, both LLM nodes, `bench-a-output`, and Workflow
   Runtime Lite reached `SUCCESS`.

Backend trace for the same fresh account and workspace:

- membership count: 1.
- membership role: `owner`.
- runtime sessions: 1.
- agent tasks: 2.
- persisted messages: 2.
- failed sync operation rows for the tested workspace/user pair: 0.

What this proves:

- The new-account workspace bootstrap no longer falls into the old
  `Permission denied` loop.
- Preview deployments without service-role fallback can authorize runtime
  execution through the authenticated Supabase request client.
- Server-side model credentials are now separated from Supabase
  `Authorization`, so a normal browser session can run LLM nodes without
  pasting provider keys into the client.

Remaining account-matrix gaps:

- Owner preview A/B/C plus generated-history/download smoke.
- Editor preview A/B/C plus generated-history/download smoke.
- Viewer read-only inspection plus clean mutation denial.
- B and C for non-owner writable actors, especially image artifact history and
  long-running fan-out behavior.
- Chrome still showed one sync issue after the successful run, while Supabase
  showed no failed sync operation rows for this tested workspace. That counter
  needs a UI/local-queue reconciliation pass, but it did not block runtime
  execution.

## R98 New Account Preview Benchmark B Evidence

R98 continued the same failure-mode hunt from A into the image path:

```text
New authenticated account -> Workflow Pro B -> Import -> Apply Preview ->
Graph -> Start All
```

Preview deployment:

- `https://nexus-gj5lo0w3w-sean-s-projects10.vercel.app`
- Deployment id: `dpl_5nkwVZ7ui6hN6NVt4u7rNiRiwjQz`

Screen path completed through Chrome / Computer Use:

1. Opened Workflow Pro on the protected preview.
2. Loaded `B / Input -> LLM -> Image Model -> Output` from the foundation
   benchmark button.
3. Imported the pasted JSON contract and confirmed the draft held 4 nodes,
   3 edges, and 2 outputs.
4. Applied the Workflow Pro preview into Graph.
5. Clicked `Start All` from the graph UI.
6. Waited for the long-running image node without imposing an artificial
   timeout.
7. Confirmed `bench-b-input`, `bench-b-llm-prompt`, `bench-b-image`,
   `bench-b-output`, and Workflow Runtime Lite all reached `SUCCESS`.
8. Confirmed the graph rendered a real `img2` generated image for a
   `standard`, `16:9`, Y2K wide-pants fashion board.

Backend trace from Vercel logs:

- `POST /api/v1/agents/agent-nexus-1/stream`: `200`.
- `POST /api/image-gen`: `200`.
- `POST /api/v1/artifacts`: `200`.
- `GET /api/image-gen/assets/:assetId`: `200`.

What this proves:

- The earlier `/api/image-gen` request-scoped permission fix lets the new
  authenticated account reach the image provider boundary.
- The artifact API request-scoped permission fix lets the same browser session
  persist the generated image instead of failing with `Permission denied`.
- Supabase `Authorization` remains user/session auth, while runtime provider
  credentials stay separated behind the server-side image route boundary.

What remains:

- Toolbar sync/state 403s still appeared on the preview. They did not block
  Benchmark B, but they are still a real authorization cleanup item.
- The first direct Supabase connector lookup for generated artifacts by this
  workspace id returned no rows, so the next traceability round should map
  exactly where the generated-media record is stored and make that evidence
  obvious to the operator.
- Benchmark C and the owner/editor/viewer matrix still need real screen runs.

## R99 Active Workspace Sync Queue Cleanup

R99 fixed the remaining toolbar sync issue that appeared after R98:

```text
New authenticated account -> session workspace rebound -> stale local failed
operation from a previous workspace -> toolbar showed sync issue
```

Root cause:

- The backend route fix worked for the active session, but the browser's local
  sync queue counted every failed/conflicted operation across all workspaces.
- The toolbar retry action also selected the first failed/conflicted operation
  globally, not the first issue for the active workspace.
- After a new account was rebound from the default local workspace to its own
  writable cloud workspace, an old pre-auth/default-workspace operation could
  still show `1 SYNC ISSUE` and retry into a clean `403` for the wrong
  workspace.

Changes:

- `LocalSyncQueueAdapter.getStatus()` now accepts an optional `workspaceId` and
  filters queue counts to that workspace.
- `NexusOps` now asks for sync status using `activeWorkspaceId`.
- The toolbar retry handler now searches failed/conflicted operations only
  within the active workspace.
- `auth-boundary-scan` now has a request-scoped workspace permission gate for
  image, artifact, sync, and workspace-state routes.

Screen verification:

- Deployed preview:
  `https://nexus-o52h1uqy8-sean-s-projects10.vercel.app`
- Deployment id: `dpl_8XxEsxCAvWwL9sUiSUqmaDdkGQq7`
- Signed in with a disposable test actor.
- The toolbar showed `SYNCED`, not `1 SYNC ISSUE`.

Backend trace from the same preview after login:

- `POST /api/v1/workspaces/session`: `200`.
- `GET /api/v1/workspaces/recovery`: `200`.
- `GET /api/v1/workspaces/recovery/latest`: `200`.
- `GET /api/v1/prompts`: `200`.
- `GET /api/v1/workspaces/:workspaceId/state`: `404`, expected for a fresh
  workspace with no snapshot yet.
- `POST /api/v1/sync/operations`: `200`.
- No new app-layer `403` appeared after the authenticated session was active.

Verification commands:

- `npm test -- src/lib/backend/workspace/workspace-state.test.ts src/lib/backend/sync/sync-queue.test.ts src/lib/backend/security/auth-boundary-gate.test.ts`
  passed: 3 files / 48 tests.
- `npm test -- src/lib/sync/local-sync-queue-adapter.test.ts src/lib/backend/sync/sync-queue.test.ts src/lib/backend/security/auth-boundary-gate.test.ts`
  passed: 3 files / 40 tests.
- `npm run typecheck` passed.
- `npm run build` passed.

What this proves:

- New-account session routing, workspace-state access, sync enqueue, and toolbar
  status now line up for the active workspace.
- Stale operations from another workspace are still inspectable in the local
  queue, but they no longer make the current workspace look broken.

Remaining:

- Benchmark C still needs a real preview screen run.
- Owner/editor/viewer matrix is still pending.
- Generated media database traceability still needs a focused follow-up so
  HTTP success, visible history, and durable DB evidence all point to the same
  artifact identity.

Decision:

- `/api/image-gen` is a formal production image generation capability, not a
  legacy route that should always return `404`.
- In production, the route must verify a Supabase session and writable workspace
  permission before using either a server image key or a browser-supplied
  provider key.
- Supabase session auth remains in `Authorization`.
- Provider/runtime image keys move to `X-Nexus-Runtime-Authorization`, matching
  the existing v1 tool execution convention.
- `X-User-Id` is accepted only as a declared actor hint and must match the
  authenticated session.
- Viewer, non-member, spoof-only, and unauthenticated requests must fail before
  any provider request is made.

R91 verification:

- Image route and adapter focused tests passed.
- Static auth-boundary scan now treats `/api/image-gen` as a protected formal
  route and verifies the runtime credential header split.
- Local live auth probe reports `/api/image-gen` as
  `protectedRejectsSpoofOnly` with 0 blocking findings.

Remaining remote work:

- Deploy or access the latest protected v22 preview with
  `VERCEL_AUTOMATION_BYPASS_SECRET`.
- Rerun strict preview live probe and confirm the public production drift is
  gone on the deployed commit.

## R92 Strict Preview Deployment Verification

R92 moves the preview gate from "tool ready but blocked by Vercel protection" to
"strict preview app boundary verified."

Deployment:

- Preview URL:
  `https://nexus-dzr5x2rl3-sean-s-projects10.vercel.app`
- Deployment id: `dpl_5SNJR4mQQQ8dKkVaTuWM2UobHEUo`
- Deployment source: local CLI working-tree preview from branch `v22`
- Upload size: `341.7KB` incremental upload after the initial clean preview
  deployment
- Deployment hygiene: `.vercelignore` excludes local `reports/` and `.codex/`
  artifacts so preview builds stay focused on product source.

Probe access:

- Vercel deployment protection blocked unauthenticated probe traffic with 401.
- A temporary Vercel share URL was used to create a local cookie jar.
- `scripts/live-auth-boundary-probe.mjs` now supports
  `AUTH_BOUNDARY_LIVE_COOKIE_JAR` / `AUTH_BOUNDARY_LIVE_COOKIE` for protected
  preview probing without printing cookie values.
- The parser supports Netscape cookie jars with `#HttpOnly_` Vercel cookies.

R92 strict preview result:

- Total probes: `49`
- Blocking findings: `0`
- Warnings: `0`
- Public routes: `2 / 2` returned `200`
- Legacy routes: `8 / 8` returned production `404`
- Protected spoof-only routes: `39 / 39` rejected with non-success statuses
- `/api/image-gen` returned `401` for unauthenticated spoof-only access, which
  confirms the provider is not reached without Supabase session and writable
  workspace permission.

Remaining remote work:

- Run the owner/editor/viewer/new-authenticated-account screen matrix against
  the strict-preview-green deployment.
- Replace temporary share-cookie access with either documented
  `VERCEL_AUTOMATION_BYPASS_SECRET` usage or a repeatable authenticated preview
  verification setup.
- Promote to production only after screen matrix and generated-media download
  checks pass for non-owner writable accounts.

## Preview Verification Command Shape

Existing strict live route probe:

```bash
AUTH_BOUNDARY_LIVE_BASE_URL=https://preview-url.example \
npm run check:auth-boundary:live
```

For a Vercel protected preview accessed through a temporary share URL:

```bash
AUTH_BOUNDARY_LIVE_BASE_URL=https://preview-url.example \
AUTH_BOUNDARY_LIVE_COOKIE_JAR=/path/to/local/cookies.txt \
npm run check:auth-boundary:live
```

For local development only:

```bash
AUTH_BOUNDARY_LIVE_BASE_URL=http://127.0.0.1:3000 \
AUTH_BOUNDARY_LIVE_EXPECT_LEGACY_404=false \
npm run check:auth-boundary:live
```

Do not use the local development flag for preview or production.

For protected Vercel previews, configure the bypass secret in the shell or CI
environment first:

```bash
VERCEL_AUTOMATION_BYPASS_SECRET=<configured-secret> \
AUTH_BOUNDARY_LIVE_BASE_URL=https://preview-url.example \
npm run check:auth-boundary:live
```

The probe records only `header-present`; never store the secret in manifests,
docs, logs, screenshots, or LINE reports.

## Gaps Before 10 / 10 Auth Score

Current auth score: 9.3 / 10.

Missing:

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

## R93 Account Matrix Screen-Run Harness

R93 adds a screen-run evidence harness. It does not replace real browser
operation and does not mark any actor as passed by default.

Files:

- `scripts/workflow-pro-account-matrix-runner.mjs`
- `account-matrix-screen-run.manifest.json`

What it adds:

- A 100-point account screen matrix scoring model.
- Required actor lanes: owner, editor, viewer, and new authenticated account.
- Per-task fields for result, route status on failure, generated asset count,
  download result, trace/request id, screenshot path, and manual note.
- Secret-like text detection so tokens, cookies, API keys, and raw credentials
  are not accidentally stored in evidence.
- `init` mode for generating a pending screen-run manifest.
- `validate` mode for computing score and listing pending/failed findings.

Command shape:

```bash
node scripts/workflow-pro-account-matrix-runner.mjs \
  --preview-url https://preview-url.example \
  --out docs/workflow-pro/account-matrix-screen-run.manifest.json
```

After screen evidence has been filled:

```bash
node scripts/workflow-pro-account-matrix-runner.mjs \
  --evidence docs/workflow-pro/account-matrix-screen-run.manifest.json \
  --strict
```

Current R93 generated state:

- Screen-run preview URL:
  `https://nexus-18zerfafc-sean-s-projects10.vercel.app`
- Score: `0 / 100`
- Status: `pending-or-failed`
- This is correct because no real owner/editor/viewer/new-account screen run has
  been performed yet.

## Machine-Readable Verification Manifests

The machine-readable verification manifests live in:

- `account-matrix-preview-verification.manifest.json`
- `account-matrix-screen-run.manifest.json`

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

## R101 New Account C And Durable Artifact Traceability

R101 adds the missing generated-media database traceability proof for the fresh
authenticated-account lane.

Preview:

- URL: `https://nexus-l6qngklm4-sean-s-projects10.vercel.app`.
- Deployment id: `dpl_94S7au6L9ZwRe6scVGi9QNotCmKt`.
- Workspace id: `workspace_427edd5d7a4c452582eed3fcd99e0d29`.
- Actor class: new account created directly from the Chrome screen during the
  run.

Screen evidence:

- Sign-up completed and the app opened a writable cloud workspace without a
  permission loop.
- Toolbar reached `SYNCED`.
- Workflow Pro loaded C / Image Reference Reverse Fan-Out benchmark JSON from
  the screen.
- Import Pasted JSON accepted the C contract with 13 nodes, 12 edges, and
  6 outputs.
- Apply Preview opened Graph with the C runtime graph.
- Start All completed from the screen.
- All 13 C nodes reached `SUCCESS`.
- Runtime badge reached `SUCCESS WORKFLOW RUNTIME LITE`.
- Generated counter reached `GENERATED 4`.

Backend trace:

- `POST /api/v1/workspaces/session`: `200`.
- `GET /api/v1/workspaces/recovery`: `200`.
- `GET /api/v1/workspaces/recovery/latest`: `200`.
- `GET /api/v1/prompts`: `200`.
- `POST /api/v1/sync/operations`: `200`.
- `POST /api/v1/agents/agent-nexus-1/stream`: five successful calls.
- `POST /api/image-gen`: four successful calls.
- `POST /api/v1/artifacts`: four successful calls.
- `GET /api/image-gen/assets/:assetId`: successful final reads for generated
  image assets.

Supabase durable evidence:

- `public.workspaces` contains the tested workspace with an owner.
- `public.workspace_memberships` contains one `owner` membership for the fresh
  account.
- `public.artifacts` contains four `generated-image` rows for the tested
  workspace.
- Artifact metadata records `source=workflow-runtime-lite`.
- Artifact metadata records node ids `bench-c-seed-image`, `bench-c-image-1`,
  `bench-c-image-2`, and `bench-c-image-3`.
- Artifact metadata records `modelId=img2`, `quality=standard`, and
  `aspectRatio=16:9`.

Source changes that enabled the durable trace:

- `src/lib/backend/artifacts/artifact-repository.ts`
- `src/lib/backend/artifacts/artifact-route-service.ts`
- `src/lib/backend/security/auth-session.ts`
- `src/lib/backend/workspace/workspace-permission.ts`
- `src/app/api/v1/artifacts/route.ts`
- `src/app/api/v1/artifacts/[artifactId]/route.ts`
- `src/app/api/v1/artifacts/[artifactId]/versions/route.ts`
- `src/app/api/v1/artifacts/[artifactId]/references/route.ts`
- `src/app/api/v1/artifacts/[artifactId]/archive/route.ts`

Verification:

- `npm test -- src/lib/backend/artifacts/artifact-service.test.ts src/lib/backend/security/auth-boundary-gate.test.ts src/lib/backend/workspace/workspace-permission-request.test.ts`
  passed: 3 files / 14 tests.
- `npm run typecheck` passed.
- `npm run build` passed.
- Vercel preview deployment completed and the screen run passed on the deployed
  build.

Score impact:

- Foundation 30-point gate: 30 / 30 for the screen-operated A/B/C path.
- New authenticated account lane: upgraded from "A and B screen evidence, C
  pending traceability" to "C screen evidence and durable generated artifact
  evidence present".
- Remaining account-matrix work: owner/editor/viewer lanes still need the same
  screen-operated evidence before the full 100-point account matrix is complete.

## R102 New Account B Strict Download Revalidation

R102 revalidates the generated-history and download lane after R101. The goal
was not to prove that img2 can return any image; that was already true. The
goal was to prove that the product can ask for `16:9 standard`, persist the
generated image, show it in the right-side generated history panel, and download
a real PNG whose saved dimensions are actually strict 16:9.

Preview:

- URL: `https://nexus-7o1t190yz-sean-s-projects10.vercel.app`.
- Deployment id: `dpl_vVuVN5m9HS7bypFdkH9mDyxNzEBc`.
- Workspace id: `workspace_48552da0d4364da797280ef407a1a2d8`.
- Actor class: newly created authenticated account, signed in through the
  Chrome screen.

Screen evidence:

- Workflow Pro loaded B / Input -> LLM -> Image Model -> Output benchmark JSON.
- Import Pasted JSON accepted 4 nodes, 3 edges, and 2 outputs.
- Apply Preview opened Graph with the B runtime graph.
- Start All completed from the screen.
- Input, LLM, Image Model, and Output nodes reached `SUCCESS`.
- Runtime badge reached `SUCCESS WORKFLOW RUNTIME LITE`.
- The image node rendered a real img2 generated Y2K wide-pants fashion board.
- Right-side `生成紀錄` displayed one `GENERATED-IMAGE` record.
- Chrome/macOS download completed from the generated-history panel.

Downloaded-file evidence:

- Saved file:
  `/Users/sean/Downloads/img_dd2be30b-7b7c-433a-9130-168e50c422b5.png`.
- Recheck file:
  `/Users/sean/Downloads/img_dd2be30b-7b7c-433a-9130-168e50c422b5 (1).png`.
- Both files are PNG image data at `1536 x 864`.
- This confirms strict 16:9 output after the server-side postprocess.

Backend trace:

- `POST /api/v1/workspaces/session`: `200`.
- `POST /api/v1/agents/agent-nexus-1/stream`: `200`.
- `POST /api/image-gen`: `200`.
- `POST /api/v1/artifacts`: `200`.
- `GET /api/image-gen/assets/img_dd2be30b-7b7c-433a-9130-168e50c422b5`:
  `200`.
- Supabase `public.workspace_memberships` has `role=owner` for this workspace.
- Supabase `public.artifacts` has one `generated-image` row for
  `bench-b-image` with `modelId=img2`, `quality=standard`,
  `aspectRatio=16:9`, and `source=workflow-runtime-lite`.

Source changes in this lane:

- `package.json`
- `package-lock.json`
- `src/app/api/image-gen/route.ts`
- `src/app/api/image-gen/route.test.ts`
- `src/lib/backend/image-generation/generated-image-asset-cache.ts`
- `src/lib/backend/image-generation/generated-image-postprocess.ts`

Verification:

- `npm test -- src/app/api/image-gen/route.test.ts src/lib/media/image-generation-adapter-map.test.ts src/lib/adapters/image-adapter.test.ts`
  passed: 3 files / 15 tests.
- `npm run typecheck` passed.
- `npm run build` passed.
- Vercel preview deployment completed.
- Computer Use screen run completed on Chrome.
- Supabase connector query confirmed the generated artifact row.

Score impact:

- New authenticated account lane now has screen evidence for A, B, and C across
  the accumulated rounds.
- B now has the stricter generated-history download proof.
- Full account matrix is still not complete until owner/editor/viewer lanes are
  screen-operated under their intended permissions.

## R103 Route-Level Generated History Role Guard

R103 adds a source-level guard before the next real owner/editor/viewer screen
matrix. The goal is to make the role boundary mechanically testable at the API
route layer, so a later browser failure can be diagnosed as UI, route, or data
setup instead of a vague permission problem.

Added guard:

- `src/lib/backend/artifacts/artifact-service.test.ts` now covers
  `/api/v1/artifacts` as a generated-history route.
- An editor actor can create a `generated-image` artifact in the test workspace.
- A viewer actor can list generated-image history through `GET /api/v1/artifacts`.
- The same viewer actor is denied when trying to create a generated-image
  artifact through `POST /api/v1/artifacts`.

Why this matters:

- The intended product rule is now explicit: viewer can inspect generated
  history, but cannot run generation or create artifacts.
- This mirrors the real UI target for the next screen matrix: editor should be
  able to run and download, while viewer should be read-only.
- It also narrows future bugs. If the screen later shows a permission failure,
  route-level behavior already has a passing source guard.

Verification:

- `npm test -- src/lib/backend/artifacts/artifact-service.test.ts src/lib/backend/security/security-services.test.ts src/app/api/image-gen/route.test.ts`
  passed: 3 files / 33 tests.
- `npm run typecheck` passed.
- `npm run build` passed with the existing edge-runtime static-generation
  warning only.

Score impact:

- Construction score for this round: 8.8 / 10.
- Account matrix readiness improves, but the 100-point role matrix does not
  advance until the same owner/editor/viewer behavior is proven from the screen.

## R104 Viewer-Readable Workspace Session Repair

R104 fixes the next blocker for real viewer screen testing. Before this repair,
workspace session resolution only selected `owner`, `admin`, or `editor`
memberships. A user who only had a `viewer` membership could be routed into a
new personal owner workspace instead of the shared workspace they were supposed
to inspect. That made the planned "viewer can see generated history but cannot
start or generate" test unreliable.

Runtime repair:

- `src/lib/nexus-types.ts` now allows workspace session role `viewer`.
- `src/lib/nexus-types.ts` adds `existing_readable_workspace` as an explicit
  session reason.
- `src/lib/backend/workspace/workspace-session-service.ts` now treats
  `owner/admin/editor/viewer` as readable roles.
- Preferred workspace resolution accepts viewer memberships.
- If no writable workspace is available, an existing viewer membership is used
  as a read-only session instead of creating a new owner workspace.

Database repair:

- `supabase/migrations/20260604081500_v22_workspace_session_viewer_readable.sql`
  adds the same behavior to the authenticated `nexus_ensure_workspace_session`
  RPC fallback.
- Supabase migration `v22_workspace_session_viewer_readable` was applied to the
  live project.
- A live Postgres check confirmed the function source contains
  `existing_readable_workspace` and preferred membership support for viewer.

Preview:

- URL: `https://nexus-d0dt6pf3m-sean-s-projects10.vercel.app`.
- Deployment id: `dpl_DdNpfkRUJMiBwBn8Efp8tinTYeYt`.
- Ready state: `READY`.

Verification:

- `npm test -- src/lib/backend/workspace/workspace-session-service.test.ts src/lib/backend/workspace/workspace-permission-request.test.ts src/lib/backend/security/security-services.test.ts src/lib/backend/artifacts/artifact-service.test.ts`
  passed: 4 files / 36 tests.
- `npm run typecheck` passed.
- `npm run build` passed with the existing edge-runtime static-generation
  warning only.
- Vercel preview deployment passed.
- Supabase migration list includes `v22_workspace_session_viewer_readable`.

Score impact:

- Construction score for this round: 9.2 / 10.
- Viewer screen testing is now structurally possible: a viewer can remain in the
  shared workspace as read-only instead of being redirected into a new owner
  workspace.
- The next gate remains a real browser run with editor and viewer accounts.

## R105 Editor Screen Benchmark B Evidence

R105 starts the real owner/editor/viewer screen matrix with the non-owner
writable lane. This round proves that an `editor` member on a shared workspace
can run the image workflow from the visible UI, create a generated-image
artifact, see it in generated history, and download a strict 16:9 PNG.

Preview:

- URL: `https://nexus-d0dt6pf3m-sean-s-projects10.vercel.app`.
- Deployment id: `dpl_DdNpfkRUJMiBwBn8Efp8tinTYeYt`.
- Shared workspace:
  `workspace_48552da0d4364da797280ef407a1a2d8`.

Screen path completed through Chrome / Computer Use:

1. Signed in as a clean `editor` actor already attached to the shared
   workspace.
2. Confirmed the workspace menu resolved the shared workspace without a
   permission loop.
3. Opened Workflow Pro.
4. Loaded `B / Input -> LLM -> Image Model -> Output` from the foundation
   benchmark button.
5. Imported the pasted JSON contract and confirmed the draft held 4 nodes,
   3 edges, and 2 outputs.
6. Applied the Workflow Pro preview into Graph.
7. Clicked `Start All` from the graph UI.
8. Waited for the image node without imposing a short timeout.
9. Confirmed `bench-b-input`, `bench-b-llm-prompt`, `bench-b-image`,
   `bench-b-output`, and Workflow Runtime Lite all reached `SUCCESS`.
10. Opened generated history and confirmed `GENERATED 1`.
11. Downloaded the generated image from the history panel.

Screen evidence:

- Screenshot:
  `reports/workflow-pro-source-phase-20260603/assets/r105-editor-b-success-generated-history.png`.
- The graph rendered a real `img2` image for a `standard`, `16:9`, Y2K
  wide-pants fashion board.
- Downloaded file:
  `/Users/sean/Downloads/img_6466c160-4373-49b4-94ee-f2206f86359b.png`.
- Downloaded PNG dimensions: `1536 x 864`.
- Product ratio: strict `16:9`.

Backend trace:

- Membership distribution for the shared workspace: `owner=1`, `editor=1`,
  `viewer=1`.
- Supabase `public.artifacts` latest generated-image row:
  - artifact id: `ff86e1ce-89f7-4464-856f-d350f702489e`.
  - type: `generated-image`.
  - content URL:
    `/api/image-gen/assets/img_6466c160-4373-49b4-94ee-f2206f86359b`.
  - node id: `bench-b-image`.
  - run id: `run_9b85ec93-f863-48a0-a0d3-379b89f8c851`.
  - model id: `img2`.
  - quality: `standard`.
  - aspect ratio: `16:9`.
  - source: `workflow-runtime-lite`.
- Vercel runtime logs for the same run:
  - `POST /api/v1/agents/agent-nexus-1/stream`: `200`.
  - `POST /api/image-gen`: `200`.
  - `POST /api/v1/artifacts`: `200`.
  - `GET /api/image-gen/assets/img_6466c160-4373-49b4-94ee-f2206f86359b`:
    `200`.

Notes:

- The Supabase schema uses `public.artifacts.type` for generated-image
  filtering, not `kind`. Future queries and LLM handoff prompts should use the
  live schema name.
- Terminal HTTP probes to the protected preview can return Vercel-auth `401`
  HTML without representing an app-layer permission failure. Browser-screen
  testing is still the trusted evidence path for this matrix.
- Editor A and C remain pending; this round only scores the editor B/history/
  download slice.

Score impact:

- Construction score for this round: 9.4 / 10.
- Account matrix score increases from `25 / 100` to `39 / 100`.
- The next gate is the `viewer` screen lane: view shared history, attempt a
  mutation, receive clean denial, and prove no generated artifact is created.

## R106 Viewer Read-Only UI And Local Sync Suppression

R106 completed the viewer denial lane enough to prove the highest-risk failure
mode is now controlled from both the visible UI and the local sync layer. The
viewer can resolve the shared workspace, the app shows the account as
`ROLE: VIEWER`, and mutation controls are disabled before any workflow run or
sync write can hit the backend.

Preview:

- URL: `https://nexus-15g0gc1rz-sean-s-projects10.vercel.app`.
- Deployment id: `dpl_Hxd1Civ1Tr3yKbRjsF9yuSwNGRcV`.
- Shared workspace:
  `workspace_48552da0d4364da797280ef407a1a2d8`.

Screen path completed through Chrome / Computer Use:

1. Signed in as a clean `viewer` actor already attached to the shared
   workspace.
2. Confirmed the workspace menu resolved the shared workspace and displayed
   `ROLE: VIEWER`.
3. Confirmed the top-right sync badge stayed `SYNCED` after login and recovery.
4. Opened the Graph view from the workspace menu.
5. Confirmed the graph displayed `VIEWER READ ONLY`.
6. Confirmed Add Input, Add LLM, Add File, Add Image, Add Output, Start All,
   Delete Agent, Rename, Spawn, Save, and Import were disabled with the
   read-only explanation.

Screen evidence:

- Screenshot:
  `reports/workflow-pro-source-phase-20260603/assets/r106-viewer-readonly-synced-graph.png`.

Backend and sync trace:

- Post-login Vercel logs on the R106 preview showed session/recovery/prompts
  reads only:
  - `POST /api/v1/workspaces/session`: `200`.
  - `GET /api/v1/workspaces/recovery`: `200`.
  - `GET /api/v1/workspaces/recovery/latest`: `200`.
  - `GET /api/v1/prompts`: `200`.
- No post-login viewer `POST /api/v1/sync/operations` `403` was emitted on the
  final R106 preview.
- No post-login viewer `POST /api/v1/agents/*/stream` `403` was emitted.
- Supabase `public.artifacts` count for generated images in the shared
  workspace remained `2` after the viewer screen attempt.

Source changes:

- `src/components/nexus/nexus-ops.tsx` now remembers the server-issued
  workspace role, displays it in the workspace menu, and wraps workspace
  mutations with a read-only guard.
- `src/components/nexus/nexus-graph.tsx` now receives read-only workspace state
  and disables graph add/connect/delete/move/start/edit surfaces.
- `src/lib/sync/local-sync-queue-adapter.ts` now compacts local sync operations
  for known read-only workspaces as `WORKSPACE_READ_ONLY` instead of flushing
  them into backend 403 failures.
- `src/components/nexus/nexus-workspace-readonly-gate.test.ts` pins the UI
  wiring.
- `src/lib/sync/local-sync-queue-adapter.test.ts` pins the local sync
  suppression behavior.

Verification:

- `npm test -- src/components/nexus/nexus-workspace-readonly-gate.test.ts`
  passed.
- `npm test -- src/lib/backend/workspace/workspace-session-service.test.ts src/lib/backend/workspace/workspace-permission-request.test.ts`
  passed.
- `npm test -- src/lib/sync/local-sync-queue-adapter.test.ts src/components/nexus/nexus-workspace-readonly-gate.test.ts`
  passed, `17 / 17`.
- `npm run typecheck` passed.
- `npm run build` passed.
- `npx vercel deploy --yes` produced the ready R106 preview.
- Chrome / Computer Use verified the visible viewer lane.
- Supabase verified generated-image count remained unchanged.

Score impact:

- Construction score for this round: `9.3 / 10`.
- Account matrix score increases from `39 / 100` to `58 / 100`.
- Viewer generated-history inspection remains pending because the clean preview
  displayed `GENERATED 0`; the next viewer round should hydrate generated
  history from durable artifacts or document why history is intentionally local
  only.

## R107-R108 Generated History Hydration And Durable Asset Download

R107 and R108 close the viewer generated-history gap left by R106. The system
now hydrates generated history from cloud artifacts for read-only viewers, and
new generated images are persisted into a private Supabase Storage bucket before
the generated artifact record is created. This changes image generation from a
memory-preview feature into a traceable downloadable asset path.

Preview:

- URL: `https://nexus-j78jwuczs-sean-s-projects10.vercel.app`.
- Deployment id: `dpl_2frW4TmEgZkr3rSy4nXUunwvETqR`.
- Shared workspace:
  `workspace_48552da0d4364da797280ef407a1a2d8`.

Storage and permission boundary:

- New private storage bucket: `nexus-generated-assets`.
- New migration:
  `supabase/migrations/20260604093000_v22_generated_image_storage.sql`.
- Storage object path is namespaced by workspace id:
  `{workspaceId}/image-gen/{assetId}`.
- Bucket policies allow authenticated workspace members to read generated
  assets and restrict writes to owner/admin/editor roles.
- Generated artifact metadata now carries `generatedAsset` details including
  bucket, durable flag, MIME type, storage path, provider, byte size, and
  browser URL.
- Artifact binary download now goes through
  `/api/v1/artifacts/:artifactId/asset`, which checks the signed-in actor's
  workspace read permission before returning an attachment.

Screen path completed through Chrome / Computer Use:

1. Signed in as an `editor` actor on the final preview.
2. Switched composer to image generation mode with model `img2`, `standard`
   quality, and `16:9` ratio.
3. Generated a real R108 Y2K wide-pants fashion-board image.
4. Confirmed the new generated artifact appeared in the UI.
5. Signed in as a clean `viewer` actor on the same preview and shared
   workspace.
6. Confirmed the workspace menu displayed `ROLE: VIEWER` and viewer controls
   remained read-only.
7. Opened the generated history panel as viewer.
8. Confirmed the panel listed three generated-image records, including the new
   R108 durable storage verification image.
9. Downloaded the newest generated image from the viewer's generated history
   panel.
10. Confirmed macOS saved the file successfully.

Screen evidence:

- Latest downloaded file:
  `/Users/sean/Downloads/Generated-image---R108-durable-storage-verification-Y2K-streetwea.png`.
- Downloaded file size: `1,990,514` bytes.
- Chrome displayed two older legacy generated-image records as unable to
  retrieve the file. Those records were produced before durable storage existed
  and remain tracked as legacy debt, not as a failure of the new R108 path.

Backend trace:

- Vercel runtime log on the final preview:
  - `GET /api/v1/artifacts/9942b59c-ffcb-43f3-822c-5e05a48e9e64/asset`:
    `200`.
  - `GET /api/v1/artifacts`: `200`.
  - `POST /api/v1/workspaces/session`: `200`.
- Supabase evidence:
  - Generated-image artifact count for the shared workspace: `3`.
  - Durable generated asset count: `1`.
  - Durable generated asset byte total: `1,990,514`.
- Supabase advisors were rechecked after the storage migration. No new
  storage-policy finding was introduced. Existing unrelated advisor findings
  remain documented separately.

Source changes:

- `src/lib/backend/image-generation/generated-image-asset-storage.ts` adds the
  request-scoped Supabase Storage gateway.
- `src/lib/backend/image-generation/generated-image-asset-cache.ts` separates
  transient browser cache assets from durable generated-asset metadata.
- `src/app/api/image-gen/route.ts` now persists successful generated images to
  Storage when workspace/session context is present.
- `src/app/api/image-gen/assets/[assetId]/route.ts` can fall back from memory
  cache to Supabase Storage.
- `src/app/api/v1/artifacts/[artifactId]/asset/route.ts` provides the
  authenticated artifact download route.
- `src/components/nexus/nexus-ops.tsx` hydrates generated history from cloud
  artifacts for viewers and downloads generated assets through the authenticated
  artifact route.
- `src/lib/workflow-runtime-lite/image-client.ts` propagates generated-asset
  metadata from runtime image nodes into artifact metadata.
- `src/lib/backend/artifacts/artifact-materializer.ts` records actual generated
  asset bytes when durable metadata is available.

Verification:

- `npm test -- src/app/api/image-gen/route.test.ts src/lib/backend/artifacts/artifact-service.test.ts src/components/nexus/nexus-generated-history-hydration.test.ts src/components/nexus/nexus-workspace-readonly-gate.test.ts src/lib/sync/local-sync-queue-adapter.test.ts`
  passed, `39 / 39`.
- `npm run typecheck` passed.
- `npm run build` passed.
- `npx vercel deploy --yes` produced the ready R108 preview.
- Chrome / Computer Use verified editor generation, viewer history hydration,
  and viewer download from the generated history panel.
- Vercel logs verified the viewer artifact asset download route returned `200`.
- Supabase verified generated-image count and durable asset byte count.

Score impact:

- Construction score for this round: `9.1 / 10`.
- Account matrix score increases from `58 / 100` to `64 / 100`.
- Deep Workflow Pro distance is reduced, but not closed. The next foundation
  gate is returning to the screen-operated JSON benchmark suite: A, B, and C
  must be imported, applied, and run through the UI without relying on code-only
  execution.

## R109 Editor Full Foundation Screen Gate

R109 completes the editor lane's missing foundation benchmark coverage. The run
used the final preview and the actual Chrome UI. No code-only runner was counted
as the proof path.

Preview:

- URL: `https://nexus-j78jwuczs-sean-s-projects10.vercel.app`.
- Deployment id: `dpl_2frW4TmEgZkr3rSy4nXUunwvETqR`.
- Actor lane: `editor`.
- Screenshot evidence:
  `reports/workflow-pro-source-phase-20260603/assets/r109-editor-b-success-foundation-30of30.png`.

Screen-operated path:

1. Signed in as an editor actor and confirmed the workspace was editable.
2. Opened Workflow Pro.
3. Loaded C / Image Reference Reverse Fan-Out benchmark JSON.
4. Imported the pasted JSON, applied preview, opened Graph, and clicked
   `Start All`.
5. Waited without imposing a hidden timeout until all C nodes reached
   `SUCCESS`.
6. Returned to Workflow Pro and repeated the import/apply/run sequence for A.
7. Returned to Workflow Pro and repeated the import/apply/run sequence for B.

Observed results:

- C: 13 nodes, 12 edges, 6 outputs, all nodes `SUCCESS`; generated counter
  moved from `3` to `7`.
- A: 4 nodes, 3 edges, 1 output, all nodes `SUCCESS`; final text output rendered
  in the graph.
- B: 4 nodes, 3 edges, 2 outputs, all nodes `SUCCESS`; the `img2` node rendered
  a real `standard` / `16:9` Y2K wide-pants fashion-board image and generated
  counter moved from `7` to `8`.

Backend trace:

- Generated-image artifacts: `8`.
- Durable generated-image artifacts: `6`.
- Durable generated-image bytes: `18,818,400`.
- Storage objects in `nexus-generated-assets`: `6`.
- Storage metadata bytes: `18,818,400`.

Score impact:

- Editor lane moves from partial to full foundation pass.
- Account matrix score increases from `64 / 100` to `75 / 100`.
- Construction score for this round: `9.4 / 10`.

Remaining account-matrix work:

- Owner lane still needs the same screen-operated A/B/C plus generated-history
  download path.
- Viewer lane is read-only/download verified, but the next hardening pass should
  add a targeted mutation-route stress check so UI blocking and backend denial
  are both traceable.
- Admin lane is documented in the model but has not yet been screen-operated as
  a separate actor.

## R110 Viewer Mutation Route Stress And Audit Trace

R110 hardens the viewer lane beyond visible UI blocking. The goal was to prove
that a read-only actor cannot bypass disabled buttons by calling backend routes
directly, and that every denial has an auditable trace instead of disappearing
into a local no-op logger.

Preview:

- URL: `https://nexus-ik5hscmen-sean-s-projects10.vercel.app`.
- Deployment id: `dpl_CnpjVg7nkNxbLK78JTNx9wXU3tg4`.
- Actor lane: `viewer`.

Route stress result:

- `GET /api/v1/artifacts?...type=generated-image&limit=1`: `200`.
- `POST /api/v1/artifacts`: `403`.
- `POST /api/v1/sync/operations`: `403`.
- `PUT /api/v1/workspaces/:workspaceId/state`: `403`.
- `POST /api/v1/agents/agent-nexus-1/stream`: `403`.
- `POST /api/image-gen`: `403`.

The image-generation denial happened before the provider boundary. No image
model call or generated artifact was created by the viewer route stress.

Traceability repair:

- The first R110 probe confirmed backend denial worked, but recent
  `permission_audit_logs` and `system_events` did not receive request-scoped
  rows on preview deployments without a service-role key.
- `supabase/migrations/20260604102000_v22_request_scoped_permission_audit_rpc.sql`
  adds the authenticated `record_permission_audit_log` security-definer RPC.
- `src/lib/backend/workspace/workspace-permission.ts` now uses the authenticated
  Supabase request client for both membership lookup and permission audit
  writes when the service-role client is not available.
- `src/lib/backend/workspace/workspace-permission-request.test.ts` pins both
  allowed and denied request-scoped audit RPC calls.

Live Supabase evidence after redeploy:

- Permission audit rows for the shared workspace in the R110 window:
  `5 denied`, `1 allowed`, `6 total`.
- Shared workspace artifacts remained unchanged:
  `8` total artifacts, `8` generated-image artifacts.
- Shared workspace storage objects in `nexus-generated-assets` remained
  unchanged: `6`.

Verification:

- Supabase migration `v22_request_scoped_permission_audit_rpc` was applied.
- `npm test -- src/lib/backend/workspace/workspace-permission-request.test.ts src/lib/backend/security/security-services.test.ts`
  passed, `16 / 16`.
- `npm run typecheck` passed.
- `npx vercel deploy --yes` produced the ready R110 preview.
- Viewer route stress passed against the R110 preview after redeploy.
- Supabase verified the audit row counts and unchanged artifact/storage counts.

Score impact:

- Construction score for this round: `9.5 / 10`.
- Account matrix score remains `75 / 100` because the viewer lane had already
  earned its points, but confidence improves materially: the lane is now
  protected at the UI, API, provider-boundary, and audit-record layers.
- Deep Workflow Pro distance is reduced. The next highest-ROI scoring gate is
  the owner lane's screen-operated A/B/C plus generated-history/download run.

## R111 Owner Full Foundation Screen Gate

R111 closes the account-matrix scoring gate from the owner side. The test was
deliberately screen-operated in Chrome: Workflow Pro loaded the benchmark JSON,
imported it through the UI, applied the preview to Graph, and used Start All
instead of a code-only runner.

Preview:

- URL: `https://nexus-ik5hscmen-sean-s-projects10.vercel.app`.
- Deployment id: `dpl_CnpjVg7nkNxbLK78JTNx9wXU3tg4`.
- Actor lane: `owner`.

Screen-operated workflow result:

- Benchmark A: `Input -> LLM -> LLM -> Output`.
  - Load, import, apply, graph run, and Runtime Lite all reached `SUCCESS`.
- Benchmark B: `Input -> LLM -> Image Model -> Output`.
  - Load, import, apply, graph run, and Runtime Lite all reached `SUCCESS`.
  - The `img2` node produced a real `16:9` `Standard` image.
- Benchmark C:
  `Input -> LLM -> Image Model -> Reverse LLM -> 3x LLM -> 3x Image Model -> 3x Output`.
  - Load, import, apply, graph run, and Runtime Lite all reached `SUCCESS`.
  - All `13` nodes reached `SUCCESS` without imposing a hidden timeout.
  - The graph produced one seed image plus three branch images.
  - The generated counter reached `5`.

Generated history and download:

- The right-side generated-history panel listed `5` generated-image records for
  the owner workspace.
- Chrome/macOS downloaded the latest generated-image record from the panel.
- The downloaded file was verified as PNG, `1536 x 864`, strict `16:9`.
- Evidence screenshots and the downloaded asset copy were saved under
  `reports/workflow-pro-source-phase-20260603/assets/`.

Live Supabase evidence after the screen run:

- Owner workspace artifacts: `5`.
- Owner workspace generated-image artifacts: `5`.
- Owner workspace storage objects in `nexus-generated-assets`: `5`.
- Generated-image bytes / storage metadata bytes: `17,002,150`.
- Permission audit rows for the owner workspace: `26 allowed`, `0 denied`.

Traceability note:

- The generated artifact rows currently expose image assets through the
  `/api/image-gen/assets/...` facade while the asset bytes are backed by the
  `nexus-generated-assets` storage bucket.
- This passed the user-facing history/download gate. A future durability
  refinement should make the storage pointer explicit in artifact metadata, so
  the database row itself is self-describing without relying on route
  conventions.

Score impact:

- Account matrix score increases from `75 / 100` to `100 / 100`.
- Construction score for this round: `9.6 / 10`.
- Deep Workflow Pro distance is reduced materially: the permission and
  foundation-runtime floor is now strong enough to move from account-gate work
  into deeper Workflow Pro page construction, contract import/export, file
  node compiler lanes, and brain-readable workflow intelligence.
