# Round 18 - Runtime Trace Correlation

Time: 2026-06-04T16:58:41+10:00

## Goal

Close the gap between local RuntimeLite evidence and durable backend observability by making the Trace panel show whether the latest local run has a matching backend `workflow.runtime_lite.*` event.

## Completed

1. Added `nexus.workflowPro.runtimeTraceCorrelation.v1`.
2. Added correlation statuses for `no-local-run`, `local-only`, `syncing`, `failed`, `synced-unloaded`, `matched`, and `missing`.
3. Wired the Trace panel to fetch `/api/v1/observability/events?traceId=<latestRun.traceSync.traceId>`.
4. Added a `Durable Trace Match` section above `Local Workflow Evidence`.
5. Kept local runtime evidence and backend trace evidence visually separate so the operator can see exactly which layer is proven.

## Verification

```text
npm test -- src/lib/workflow-pro/runtime-trace-correlation.test.ts src/lib/workflow-runtime-lite/trace-client.test.ts src/lib/workflow-pro/runtime-evidence.test.ts src/store/nexus-store.test.ts src/app/api/v1/workflows/runtime-trace/route.test.ts
```

Result: passed, 5 files / 39 tests.

```text
npm run typecheck
```

Result: passed.

Screen verification:

```text
Chrome / localhost:3000 / Trace panel shows Durable Trace Match above Local Workflow Evidence.
```

## Score

- Construction score: 9.1/10
- Distance to deep Workflow Pro platform: 94/100
- Estimated remaining rounds: 7 to 11

## Next Recommended Gate

Add a group-level detail or run-inspection surface so each appended workflow group can show latest run, output refs, trace sync, and durable correlation without forcing the operator to read the full Trace panel.
