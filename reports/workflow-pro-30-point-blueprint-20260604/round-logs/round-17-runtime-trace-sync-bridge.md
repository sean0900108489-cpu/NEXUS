# Round 17 - Runtime Trace Sync Bridge

Time: 2026-06-04T16:50:45+10:00

## High-ROI Action

R22-17 wired completed RuntimeLite runs to the durable backend trace write route without blocking workflow execution.

## Changes

- Added `WorkflowRuntimeTraceSyncState` on `WorkflowRun`.
- Added `src/lib/workflow-runtime-lite/trace-client.ts`.
- The trace client converts a full `WorkflowRun` into the narrow `WorkflowRuntimeTraceWriteRequest` body.
- Raw packet text, display text, snapshots, data URLs, and prompts are not posted.
- `runWorkflowRuntimeLiteFlow()` now marks runs as `traceSync: syncing`, then updates to `synced` or `failed` after the background POST completes.
- Trace sync updates are scoped by workspace ID so async completion cannot write to the wrong active workspace.
- `normalizeWorkflowRuntimeLiteState()` now preserves `traceSync`.
- Runtime Evidence now reports the latest run's durable trace status.
- The Trace panel now shows a fourth evidence card: `Trace`, with `local`, `syncing`, `synced`, or `failed`.

## Why This Matters

This is the first real bridge from local RuntimeLite execution into durable backend observability. It keeps workflow execution independent from backend trace persistence: a trace write failure is visible and recoverable, but it does not turn a successful workflow run into a failed workflow.

## Verification

```text
npm test -- src/lib/workflow-runtime-lite/trace-client.test.ts src/lib/workflow-pro/runtime-evidence.test.ts src/store/nexus-store.test.ts src/app/api/v1/workflows/runtime-trace/route.test.ts
```

Result:

```text
Passed: 4 files / 35 tests
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

```text
jq empty docs/workflow-pro/graph-brain-30-point-screen-run.manifest.json
```

Result:

```text
Passed
```

Screen verification:

```text
Chrome / localhost:3000 / Trace panel shows Local Workflow Evidence with Trace = local.
```

## Score

- Construction score: 9.2/10
- Deep Workflow Pro distance: 92/100
- Estimated remaining rounds: 8 to 12

## Next Suggested Round

Add durable trace refresh correlation: after a run syncs, Trace panel should be able to fetch and highlight the matching `workflow.runtime_lite.*` backend event by trace ID or run ID.
