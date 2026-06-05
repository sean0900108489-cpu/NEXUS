# Round 14 - Workflow Runtime Trace Boundary

Timestamp: 2026-06-04T16:19:32+10:00

## Goal

Create a group-aware backend trace boundary without adding an unnecessary new table or route before the permission matrix is tested.

## What Changed

- Added `src/lib/backend/observability/workflow-runtime-events.ts`.
- Added `src/lib/backend/observability/workflow-runtime-events.test.ts`.
- Exported the adapter through `src/lib/backend/observability/index.ts`.
- Added `docs/workflow-pro/workflow-runtime-trace-boundary.md`.

## Contract

The adapter schema is:

```text
nexus.workflowRuntime.traceEvent.v1
```

It converts a `WorkflowRun` into a `BackendEvent` compatible with the existing `ObservabilityService`.

## Captured Fields

- workflow run ID
- workflow ID
- workflow group ID
- workflow group label
- workflow group source
- run status
- duration
- node count
- node status counts
- artifact count

## Redaction Boundary

The adapter intentionally avoids copying:

- raw packet text
- raw prompt text
- full model output
- provider keys
- API tokens
- binary assets
- data URLs

The tests assert that raw packet text containing an API key-like string does not appear in the serialized backend event.

## Verification

```text
npm test -- src/lib/backend/observability/workflow-runtime-events.test.ts src/lib/backend/observability/observability-service.test.ts src/lib/workflow-runtime-lite/runner.test.ts
```

Result: passed, 3 files / 28 tests.

```text
npm run typecheck
```

Result: passed.

## Construction Score

- Backend fit: 9/10
- Permission safety: 8.5/10
- Redaction discipline: 9.5/10
- Overall round score: 9/10

## Remaining Gaps

- The adapter is not yet posted through a server write route.
- No Supabase migration was added because existing `system_events` should be used first.
- Workspace role write matrix still needs explicit tests before enabling client-triggered durable trace writes.

## Next Recommended ROI

Build permission matrix tests around workspace owner/editor/viewer/new-account behavior before adding the trace write route.
