# Workflow Pro Foundation Benchmark Verification

Status: screen-verified foundation gate.  
Date: 2026-06-03.  
Score: 30 / 30.

## Purpose

This document records the first Workflow Pro foundation benchmark that was
validated through the actual Chrome UI with Computer Use. It is intentionally
separate from unit tests: the point of this gate is to prove that the JSON
contract, Workflow Pro import/apply UI, Runtime Lite execution, image
generation backend, generated asset history, and browser download path are
connected in the product surface.

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

## Screen Evidence Summary

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
- Generated history: `GENERATED 5`, `HISTORY 5 ASSETS`.
- Download controls: one `DOWNLOAD` control per generated asset.
- Browser download: one generated workflow PNG saved successfully to
  `~/Downloads/Workflow-image---ARCHIVIST-received-the-packet.-I-am-binding-the (1).png`
  at approximately 2.0 MB.

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
npm test -- src/lib/workflow-pro/foundation-benchmark-fixtures.test.ts src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx src/lib/workflow-runtime-lite/runner.test.ts src/store/nexus-store.test.ts src/lib/backend/workspace/workspace-session-service.test.ts src/lib/backend/api/api-contract.test.ts
npm run typecheck -- --pretty false
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
