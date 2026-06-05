# Workflow Pro Foundation Benchmark Verification

Status: local 30/30 screen gate verified; R95 preview new-account A pass
recorded.  
Date: 2026-06-04.  
Score: 30 / 30.

## Purpose

This document records the Workflow Pro foundation benchmark validated through
the actual Chrome UI with Computer Use. It is intentionally separate from unit
tests: the point of this gate is to prove that the JSON contract, Workflow Pro
import/apply UI, Runtime Lite execution, image generation backend, and generated
asset history are connected in the product surface.

The latest R83 pass did not use a code-only shortcut. Each benchmark was loaded
from the Workflow Pro benchmark JSON buttons, imported through the paste review
bay, applied through Apply Preview, opened in Graph, and started from the
screen.

## Baseline Tests

### A. Linear Text Chain

Flow:

```text
Input -> LLM -> LLM -> Output
```

Acceptance:

- Load the A benchmark JSON through the Workflow Pro benchmark import panel.
- Apply the preview into the graph.
- Start the workflow from the screen.
- Confirm both LLM nodes and the output node reach `SUCCESS`.

Result: passed by screen operation.

### B. LLM To Image Chain

Flow:

```text
Input -> LLM -> Image Model -> Output
```

Acceptance:

- Load the B benchmark JSON through the Workflow Pro benchmark import panel.
- Apply the preview into the graph.
- Start the workflow from the screen.
- Confirm the image model node calls `img2`, renders a real image, and the
  output node carries the generated image artifact.

Result: passed by screen operation.

### C. Reverse Fan-Out Image Chain

Flow:

```text
Input
  -> LLM
  -> Image Model
  -> Reverse LLM
  -> 3x Style LLM fan-out
  -> 3x Image Model fan-out
  -> 3x Output
```

Acceptance:

- Load the C benchmark JSON through the Workflow Pro benchmark import panel.
- Apply the preview into the graph.
- Start the workflow from the screen.
- Confirm all 13 nodes reach `SUCCESS`.
- Confirm the seed image and the three branch image nodes all render real
  `img2` image outputs.
- Confirm all three output nodes carry image artifacts.
- Confirm the runtime badge shows `SUCCESS WORKFLOW RUNTIME LITE`.

Result: passed by screen operation.

## R83 Screen Evidence Summary

Environment:

- URL: `http://localhost:3000`.
- Branch: `v22`.
- Operator path: Workflow Pro fixture button -> Import Pasted JSON -> Apply
  Preview -> Graph -> Start All.
- Sync status after runs: `SYNCED`.
- Runtime status after C: `SUCCESS WORKFLOW RUNTIME LITE`.
- Generated counter: `GENERATED 6` before C and `GENERATED 10` after C.
- Download smoke: R88 revalidated from the actual Chrome UI. The operator opened
  the right-side `生成紀錄` panel, clicked the first generated-image `Download`
  button, accepted the browser save dialog, and confirmed the saved PNG on disk.

Observed A result:

- Flow: `Input -> LLM -> LLM -> Output`.
- Result: 10 / 10.
- All Runtime Lite nodes reached `SUCCESS`.

Observed B result:

- Flow: `Input -> LLM -> Image Model -> Output`.
- Result: 10 / 10.
- Image model: `img2`.
- Quality: `standard`.
- Aspect ratio: `16:9`.
- Result: real image rendered in the graph and output node.

Observed C result:

Observed in Chrome on `localhost:3000`:

- `bench-c-input`: `SUCCESS`.
- `bench-c-llm-seed`: `SUCCESS`.
- `bench-c-seed-image`: `SUCCESS` with rendered workflow image.
- `bench-c-llm-reverse`: `SUCCESS`.
- `bench-c-llm-style-1`: `SUCCESS`.
- `bench-c-llm-style-2`: `SUCCESS`.
- `bench-c-llm-style-3`: `SUCCESS`.
- `bench-c-image-1`: `SUCCESS` with rendered workflow image.
- `bench-c-image-2`: `SUCCESS` with rendered workflow image.
- `bench-c-image-3`: `SUCCESS` with rendered workflow image.
- `bench-c-output-1`: `SUCCESS` with rendered generated image.
- `bench-c-output-2`: `SUCCESS` with rendered generated image.
- `bench-c-output-3`: `SUCCESS` with rendered generated image.
- Runtime badge: `SUCCESS WORKFLOW RUNTIME LITE`.
- Generated history: `GENERATED 10`.
- R83 observed no `Permission denied`, provider API denial,
  `SYNC_PAYLOAD_TOO_LARGE`, schema mismatch, or runtime timeout.

Generated download evidence:

- R88 Chrome / Computer Use path: Workflow Pro -> Evidence -> right dock
  `生成紀錄` -> first generated-image `Download` -> macOS save dialog -> `Save`.
- Saved file:
  `~/Downloads/img_5b4969f6-5c8c-47cc-9ea7-9aea2f95d577.png`.
- Shell verification: PNG image data, `1536 x 1024`, 8-bit RGB,
  non-interlaced, approximately `1.9M`.
- Chrome download shelf showed the same filename, `1,937 KB`, status complete.

Generated asset route guard:

- Transient generated images are served from `/api/image-gen/assets/:assetId`.
- The asset response includes `Content-Type`, `Content-Disposition`,
  `X-Content-Type-Options`, `X-Nexus-Generated-Asset-Id`, and
  `X-Nexus-Generated-Asset-Byte-Length`.
- R88 confirmed the route-backed browser download path through the actual UI.
- Remaining preview-ready gaps are the strict preview live auth probe and the
  owner/editor/viewer/new-account screen matrix.

## Protected Runtime Rule

Workflow executions must not fail because of a fixed default runtime duration.
Long workflows are expected. Image models, video models, compiler nodes, and
future external tools may legitimately run for a long time.

Protected behavior:

- Do not impose a default timeout on workflow image nodes.
- A model node may fail when the user explicitly aborts the run.
- A model node may fail when the API, backend, auth boundary, or storage layer
  returns a real error.
- A future UI may expose optional user-configured time budgets, but those
  budgets must be explicit workflow policy, not hidden runtime defaults.

Regression risk this protects against:

- A valid long `img2` generation being marked failed after an arbitrary
  120-second timer.
- Downstream fan-out branches being skipped even though the upstream model
  would have completed successfully.

## Auth And Permission Boundary

The benchmark is not considered trustworthy unless user-level access and
backend service boundaries are explicit.

Current foundation policy:

- Browser users should call application routes, not raw provider APIs.
- API keys must remain server-side.
- Production must fail closed when required workspace/session credentials are
  missing.
- Local development may use a traceable in-memory fallback only when the app is
  not running in production.
- Legacy image routes must not become an unrestricted production bypass.
- Generated media should be materialized into addressable asset records so UI
  history and browser downloads do not depend on unstable inline payloads.

The earlier failure mode to keep out:

```text
Owner account can generate/use nodes, but new accounts hit permission denied.
```

Required continuation:

- Keep auth boundary tests attached to route changes.
- Add account-matrix verification before promoting Workflow Pro from local
  foundation to production readiness.
- Record errors with enough trace context to distinguish auth, provider,
  storage, prompt, and runtime abort failures.

## R95 Preview New Account A Revalidation

R95 revalidated the first 10-point foundation path against a real Vercel
preview with a freshly created authenticated account:

```text
Workflow Pro JSON A -> Import -> Apply Preview -> Graph -> Start All
```

Result:

- Preview URL: `https://nexus-3hsrmfl45-sean-s-projects10.vercel.app`.
- Workspace session: linked to a new owned cloud workspace.
- A graph generated from the Workflow Pro contract: 4 nodes, 3 edges, 1 output.
- `bench-a-input`: `SUCCESS`.
- `bench-a-llm-brief`: `SUCCESS`, live model output observed.
- `bench-a-llm-final`: `SUCCESS`, live model output observed.
- `bench-a-output`: `SUCCESS`, final production plan rendered in the output
  node.
- Runtime badge: `SUCCESS WORKFLOW RUNTIME LITE`.

Backend trace:

- one owner membership for the tested workspace.
- one runtime session.
- two runtime tasks.
- two persisted messages.
- no failed `sync_operations` rows for the tested workspace/user pair.

This closes the specific preview failure where a new authenticated account could
resolve a workspace but then receive `Permission denied` on runtime execution.

## R109 Editor Preview A/B/C Revalidation

R109 returned to the actual Chrome screen gate after the durable storage repair
and re-ran all three foundation benchmarks as an `editor` actor on the final
preview.

Preview:

- URL: `https://nexus-j78jwuczs-sean-s-projects10.vercel.app`.
- Deployment id: `dpl_2frW4TmEgZkr3rSy4nXUunwvETqR`.
- Actor lane: shared-workspace `editor`.
- Operator path: Workflow Pro fixture button -> Import Pasted JSON -> Apply
  Preview -> Graph -> Start All.

Screen result:

- Benchmark C was executed first. The imported graph had 13 nodes, 12 edges, and
  6 outputs. All nodes reached `SUCCESS`, including the seed image node, reverse
  LLM, three style LLM branches, three image branches, and three output nodes.
  The generated counter moved from `3` to `7`.
- Benchmark A was executed second. The imported graph had 4 nodes, 3 edges, and
  1 output. The input node, both LLM nodes, the output node, and Runtime Lite all
  reached `SUCCESS`.
- Benchmark B was executed third. The imported graph had 4 nodes, 3 edges, and
  2 outputs. The input node, LLM prompt enhancer, `img2` image model, output
  node, and Runtime Lite all reached `SUCCESS`. The image model used
  `standard` quality and `16:9` ratio, rendered a real Y2K wide-pants fashion
  board, and moved the generated counter from `7` to `8`.

Backend trace:

- `public.artifacts` generated-image count: `8`.
- Durable generated-image artifact count: `6`.
- Durable generated-image bytes: `18,818,400`.
- `nexus-generated-assets` storage objects for the workspace: `6`.
- Storage metadata bytes: `18,818,400`.

Score impact:

- Foundation benchmark score remains `30 / 30`, now revalidated on the deployed
  preview by a shared-workspace editor.
- Account matrix score increases from `64 / 100` to `75 / 100`.
- No `Permission denied`, provider API denial, schema mismatch,
  `SYNC_PAYLOAD_TOO_LARGE`, or hidden runtime timeout was observed.

Remaining foundation risk:

- Owner lane has not yet been screen-operated on this matrix.
- Viewer lane is read-only/download verified, but not a mutation route stress
  probe beyond the current UI-blocked controls.
- Runtime Lite still executes fan-out sequentially today; true parallel groups,
  joins, and resumable long-running workflow jobs remain future deep Workflow
  Pro work.
It does not replace the full 30-point preview gate: B and C still need to be
run through the same preview UI path with generated image artifacts, history,
and downloads.

## R98 Preview New Account B Image Revalidation

R98 revalidated the second 10-point foundation path against a real Vercel
preview with the same class of freshly authenticated, non-owner-history account:

```text
Workflow Pro JSON B -> Import -> Apply Preview -> Graph -> Start All
```

Result:

- Preview URL: `https://nexus-gj5lo0w3w-sean-s-projects10.vercel.app`.
- Workspace session: linked to a writable cloud workspace.
- A graph generated from the Workflow Pro contract: 4 nodes, 3 edges, 2 outputs.
- `bench-b-input`: `SUCCESS`.
- `bench-b-llm-prompt`: `SUCCESS`, live prompt-enhancement output observed.
- `bench-b-image`: `SUCCESS`, `img2` image rendered in the image node.
- `bench-b-output`: `SUCCESS`, output node carried the generated image.
- Runtime badge: `SUCCESS WORKFLOW RUNTIME LITE`.
- Generated counter: `GENERATED 1`.
- Image settings observed on screen: `img2`, `standard`, `16:9`.

Backend trace:

- `POST /api/v1/agents/agent-nexus-1/stream`: `200`.
- `POST /api/image-gen`: `200`.
- `POST /api/v1/artifacts`: `200`.
- `GET /api/image-gen/assets/:assetId`: `200`.

This closes the immediate preview failure where B reached image generation but
then failed at artifact persistence with `Permission denied`. The fix requires
both request-scoped image route permission and request-scoped artifact route
permission.

Remaining issue deliberately not hidden by this pass:

- The preview still showed sync/state permission issues in the toolbar and
  Vercel logs. Those did not block B image generation or artifact creation, but
  they remain part of the broader authorization/cardinality cleanup before the
  platform is considered deep Workflow Pro-ready.
- A direct Supabase artifact table lookup for the current workspace did not yet
  produce a row through the connector. That means the HTTP image/artifact chain
  is proven, while database traceability for generated media still needs a
  focused follow-up round.

## R101 Preview New Account C Durable Artifact Revalidation

R101 revalidated the heaviest 10-point foundation path against a new Vercel
preview after repairing artifact persistence selection:

```text
Workflow Pro JSON C -> Import -> Apply Preview -> Graph -> Start All
```

Source repair:

- `src/lib/backend/artifacts/artifact-repository.ts` now prefers the
  service-role Supabase repository when available, then falls back to a
  request-scoped Supabase repository created from the authenticated user's
  access token, and uses in-memory storage only when no Supabase credentials are
  available.
- `src/lib/backend/artifacts/artifact-route-service.ts` centralizes
  request-scoped artifact service creation for artifact API routes.
- `src/lib/backend/security/auth-session.ts` exposes a request access-token
  helper that supports both bearer headers and Supabase cookie sessions.
- `src/lib/backend/workspace/workspace-permission.ts` uses the same
  request-token path so cookie-authenticated sessions do not diverge from
  bearer-authenticated sessions.

Preview result:

- Preview URL: `https://nexus-l6qngklm4-sean-s-projects10.vercel.app`.
- Deployment id: `dpl_94S7au6L9ZwRe6scVGi9QNotCmKt`.
- Actor class: freshly created authenticated account on the new preview.
- Workspace id: `workspace_427edd5d7a4c452582eed3fcd99e0d29`.
- Workspace session: linked to an owned cloud workspace and displayed
  `SYNCED`.
- Workflow Pro import review accepted C with 13 nodes, 12 edges, and 6 outputs.
- Graph apply created the runtime C graph from the screen.
- `bench-c-input`: `SUCCESS`.
- `bench-c-llm-seed`: `SUCCESS`.
- `bench-c-seed-image`: `SUCCESS`, `img2`, `standard`, `16:9`.
- `bench-c-llm-reverse`: `SUCCESS`.
- `bench-c-llm-style-1`: `SUCCESS`.
- `bench-c-llm-style-2`: `SUCCESS`.
- `bench-c-llm-style-3`: `SUCCESS`.
- `bench-c-image-1`: `SUCCESS`, `img2`, `standard`, `16:9`.
- `bench-c-image-2`: `SUCCESS`, `img2`, `standard`, `16:9`.
- `bench-c-image-3`: `SUCCESS`, `img2`, `standard`, `16:9`.
- `bench-c-output-1`: `SUCCESS`, generated image rendered.
- `bench-c-output-2`: `SUCCESS`, generated image rendered.
- `bench-c-output-3`: `SUCCESS`, generated image rendered.
- Runtime badge: `SUCCESS WORKFLOW RUNTIME LITE`.
- Generated counter: `GENERATED 4`.

Evidence:

- Screenshot:
  `reports/workflow-pro-source-phase-20260603/assets/r101-benchmark-c-success-request-scoped-artifacts.png`.
- Vercel logs showed 5 successful agent stream calls, 4 successful
  `/api/image-gen` calls, 4 successful `/api/v1/artifacts` calls, and
  generated asset reads returning 200 after creation.
- A transient pre-creation asset read returned 404 for an image asset that was
  later created and read successfully. This is not treated as a failure because
  the final workflow state, artifact writes, and final asset reads all passed.

Supabase trace:

- `public.workspaces` contains the tested workspace with an owner.
- `public.workspace_memberships` contains the fresh actor as `owner`.
- `public.artifacts` contains 4 `generated-image` rows for the tested
  workspace.
- The generated rows have source metadata `workflow-runtime-lite`, node ids
  `bench-c-seed-image`, `bench-c-image-1`, `bench-c-image-2`, and
  `bench-c-image-3`.
- The generated rows record `modelId=img2`, `quality=standard`, and
  `aspectRatio=16:9`.

Verification commands:

```bash
npm test -- src/lib/backend/artifacts/artifact-service.test.ts src/lib/backend/security/auth-boundary-gate.test.ts src/lib/backend/workspace/workspace-permission-request.test.ts
npm run typecheck
npm run build
npx vercel deploy --yes
```

Result:

- Focused tests: 3 files passed, 14 tests passed.
- Typecheck: passed.
- Local production build: passed with the existing edge-runtime
  static-generation warning only.
- Vercel preview build: passed.

R101 closes the generated-media database traceability gap from R98. The 30-point
foundation gate now has both screen-level success and durable Supabase artifact
evidence for the hardest C path on a fresh authenticated account.

## Auth Probe Verification

Focused source verification:

```bash
npm run check:auth-boundary
```

Result:

- `blockingFindings: []`.
- Legacy production-block scan: 7 / 7 required routes marked.
- Security tests: 2 files passed, 22 tests passed.

Local development live probe:

```bash
AUTH_BOUNDARY_LIVE_BASE_URL=http://127.0.0.1:3000 \
AUTH_BOUNDARY_LIVE_EXPECT_LEGACY_404=false \
npm run check:auth-boundary:live
```

Result:

- `blockingFindings: []`.
- Total live probes: 49.
- Protected spoof-only probes: 38.
- Public reachable probes: 2.
- Warnings: 9 legacy routes are allowed to resolve in development mode.

The live probe defaults to strict production legacy checks. The
`AUTH_BOUNDARY_LIVE_EXPECT_LEGACY_404=false` flag is only for local development
servers where legacy routes are intentionally still reachable. Production or
Vercel preview verification should omit that flag so legacy tool routes must
return 404.

Local production live probe:

```bash
npm run build
npm run start -- -p 4300
AUTH_BOUNDARY_LIVE_BASE_URL=http://127.0.0.1:4300 \
npm run check:auth-boundary:live
```

Result:

- `blockingFindings: []`.
- Total live probes: 49.
- Legacy production 404 probes: 9.
- Protected spoof-only probes: 38.
- Public reachable probes: 2.
- Warnings: 0.

This confirms the strict production path blocks legacy tool routes while still
rejecting spoof-only protected access.

## Benchmark JSON Source

Machine-readable verification summary:

- `docs/workflow-pro/foundation-benchmark-verification.manifest.json`

The screen tests are backed by source fixtures in:

- `src/lib/workflow-pro/foundation-benchmark-fixtures.ts`

The import and preview UI lives in:

- `src/components/nexus/workflow-pro/workflow-pro-surface.tsx`

Runtime execution and image model behavior live in:

- `src/lib/workflow-runtime-lite/executors.ts`
- `src/lib/workflow-runtime-lite/runner.ts`
- `src/lib/workflow-runtime-lite/image-client.ts`

Generated asset materialization and history are connected through:

- `src/app/api/image-gen/route.ts`
- `src/app/api/image-gen/assets/[assetId]/route.ts`
- `src/lib/backend/image-generation/generated-image-asset-cache.ts`
- `src/store/nexus-store.ts`

## Minimum Retest Checklist

Run source checks:

```bash
npm test -- src/lib/workflow-pro/foundation-benchmark-fixtures.test.ts src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx src/store/nexus-store.test.ts
npm run typecheck
npm run build
```

Run screen checks:

1. Open `localhost:3000`.
2. Switch to Workflow Pro.
3. Load A JSON, import, apply, start, confirm success.
4. Load B JSON, import, apply, start, confirm real image and output success.
5. Load C JSON, import, apply, start, wait without imposing a timeout, confirm
   all 13 nodes succeed.
6. Open generated history and confirm the asset count.
7. Download one generated PNG and confirm the browser download completes.

## Current Gate Result

The 30-point foundation gate is passed:

- A: 10 / 10.
- B: 10 / 10.
- C: 10 / 10.

This does not mean Workflow Pro is fully production-ready. It means the
foundation path is now real enough to continue into the next engineering
phase: account-matrix authorization, persistent workflow history, richer
trace inspection, compiler/file-node upgrades, and production deployment
verification.

R83 verification commands:

- `npm test -- src/lib/workflow-pro/foundation-benchmark-fixtures.test.ts src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx src/store/nexus-store.test.ts`
  passed: 3 files / 33 tests.
- `npm run typecheck` passed.
- `npm run build` passed with the existing edge-runtime static-generation
  warning only.
- `npm test -- src/app/api/image-gen/route.test.ts` passed: 1 file / 3 tests,
  including generated asset route headers.

## R102 Strict 16:9 Generated Asset Download Gate

R102 closes a product-contract gap found during the generated-history download
gate. The screen UI already labeled the image node as `16:9`, but an earlier
downloaded generated asset proved that the raw provider output could still be
`1536 x 1024` under the hood. That is a 3:2 PNG, so the label was correct at
the request level but not yet correct at the saved-product level.

Fix:

- Added `sharp` as the server-side image postprocess dependency.
- Added `src/lib/backend/image-generation/generated-image-postprocess.ts`.
- Added byte-level asset materialization in
  `src/lib/backend/image-generation/generated-image-asset-cache.ts`.
- Updated `src/app/api/image-gen/route.ts` so base64 PNG results are normalized
  to the requested product ratio before `/api/image-gen/assets/:assetId` is
  created.
- Added a regression test that starts with a 153x102 PNG, requests `16:9`, and
  confirms the stored asset becomes 153x86.

Preview evidence:

- URL: `https://nexus-7o1t190yz-sean-s-projects10.vercel.app`.
- Deployment id: `dpl_vVuVN5m9HS7bypFdkH9mDyxNzEBc`.
- Workspace id: `workspace_48552da0d4364da797280ef407a1a2d8`.
- Actor class: newly created authenticated account, used from the Chrome
  screen.
- Screenshot:
  `reports/workflow-pro-source-phase-20260603/assets/r102-benchmark-b-strict-16x9-generated-history.png`.

Screen-operated flow:

- Signed in with a fresh authenticated test actor.
- Opened Workflow Pro.
- Loaded B / Input -> LLM -> Image Model -> Output benchmark JSON.
- Imported pasted JSON from the screen.
- Applied the preview to Graph.
- Started the workflow from the screen with `START ALL`.
- Confirmed Input, LLM, Image Model, and Output all reached `SUCCESS`.
- Confirmed the runtime badge reached `SUCCESS WORKFLOW RUNTIME LITE`.
- Opened right-side `生成紀錄`.
- Confirmed one generated-image record was present.
- Clicked `DOWNLOAD` and saved the file through Chrome/macOS UI.

Downloaded-file evidence:

- Saved file:
  `/Users/sean/Downloads/img_dd2be30b-7b7c-433a-9130-168e50c422b5.png`.
- Duplicate saved during recheck:
  `/Users/sean/Downloads/img_dd2be30b-7b7c-433a-9130-168e50c422b5 (1).png`.
- `file` result: PNG image data, `1536 x 864`.
- `sips` result: `pixelWidth=1536`, `pixelHeight=864`.
- Product ratio: strict `16:9`.

Vercel log evidence after login:

- `POST /api/v1/workspaces/session`: `200`.
- `POST /api/v1/agents/agent-nexus-1/stream`: `200`.
- `POST /api/image-gen`: `200`.
- `POST /api/v1/artifacts`: `200`.
- `POST /api/v1/sync/operations`: `200`.
- `GET /api/image-gen/assets/img_dd2be30b-7b7c-433a-9130-168e50c422b5`:
  `200`.
- Pre-login `401` rows against the default workspace remain expected and are
  not counted as post-auth failures.

Supabase durable evidence:

- `public.workspace_memberships` contains an `owner` membership for
  `workspace_48552da0d4364da797280ef407a1a2d8`.
- `public.artifacts` contains a `generated-image` row for `bench-b-image`.
- Artifact metadata records `runId=run_6d4e80d1-2144-4b4b-aa0d-752f0105ac68`.
- Artifact metadata records `modelId=img2`, `quality=standard`,
  `aspectRatio=16:9`, and `source=workflow-runtime-lite`.
- Artifact `content_url` points to
  `/api/image-gen/assets/img_dd2be30b-7b7c-433a-9130-168e50c422b5`.

Verification commands:

- `npm test -- src/app/api/image-gen/route.test.ts src/lib/media/image-generation-adapter-map.test.ts src/lib/adapters/image-adapter.test.ts`
  passed: 3 files / 15 tests.
- `npm run typecheck` passed.
- `npm run build` passed with the existing edge-runtime static-generation
  warning only.

Score impact:

- Foundation 30-point gate remains 30 / 30.
- B benchmark generated-history/download lane is upgraded from "download
  exists" to "download exists and product-ratio output is verified".
- Remaining deep Workflow Pro distance is mostly role matrix, workflow history,
  trace UX, file/compiler node, workflow JSON import/export hardening, and
  durable long-running orchestration.
