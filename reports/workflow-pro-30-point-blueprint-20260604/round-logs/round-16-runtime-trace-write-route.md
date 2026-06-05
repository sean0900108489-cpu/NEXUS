# Round 16 - Runtime Trace Write Route

Time: 2026-06-04T16:35:50+10:00

## High-ROI Action

R22-16 added the first authenticated server write route for Workflow Runtime trace events.

## Changes

- Added `POST /api/v1/workflows/runtime-trace`.
- Added `WorkflowRuntimeTraceWriteRequest` and `WorkflowRuntimeTraceWriteResponse` API contracts.
- The route accepts only a narrow run summary and artifact references.
- The route rejects raw context snapshots, prompts, data URLs, binary payload hints, and key-like fields.
- Editor or higher is required through `workflow.trace.write`.
- Viewer denial leaves security audit evidence but does not create a workflow runtime trace event.
- The route writes into the existing `ObservabilityService` / `system_events` path using `nexus.workflowRuntime.traceEvent.v1`.

## Why This Matters

This moves Workflow Pro from local-only runtime evidence toward durable backend traceability without creating a second observability system. It also directly addresses account permission risk: invalid writes are denied with traceable security evidence, while successful writes follow the same sanitized event spine as the rest of the backend.

## Verification

```text
npm test -- src/app/api/v1/workflows/runtime-trace/route.test.ts src/app/api/v1/observability/observability-route-helpers.test.ts src/lib/backend/observability/workflow-runtime-events.test.ts src/lib/backend/observability/observability-service.test.ts
```

Result:

```text
Passed: 4 files / 18 tests
```

```text
npm run typecheck
```

Result:

```text
Passed
```

```text
npm run lint
```

Result:

```text
Passed with 11 existing warnings and 0 errors
```

## Score

- Construction score: 9.3/10
- Deep Workflow Pro distance: 90/100
- Estimated remaining rounds: 9 to 13

## Next Suggested Round

Wire RuntimeLite run completion to the server write route and expose local-vs-durable trace status in the Trace panel.
