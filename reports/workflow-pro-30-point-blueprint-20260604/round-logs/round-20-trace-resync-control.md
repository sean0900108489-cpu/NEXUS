# Round 20 - Trace Sync Retry Control

Time: 2026-06-04T17:18:40+10:00

## Goal

Make durable workflow trace sync recoverable. Before this round, RuntimeLite could show whether a backend trace sync had failed, but the operator did not have a direct screen-level way to retry the sync for a selected workflow group.

## Completed

1. Added `retryWorkflowRuntimeTraceSync(runId)` to the Nexus store.
2. Preserved the existing runtime result while only updating the `traceSync` evidence state.
3. Recorded retry outcomes as `syncing`, `synced`, or `failed` on the workflow run.
4. Kept the retry path on the same sanitized `publishWorkflowRuntimeTrace` client boundary used by automatic background sync.
5. Added tests for successful retry and failed retry evidence.
6. Added a `Resync Trace` control to the Trace panel Group Inspector.
7. Kept the button disabled when the selected workflow group has no latest local run, so the UI cannot invent retry targets.
8. Preserved the existing read-only workspace mutation gate and backend editor-only write gate.

## Verification

```text
npm test -- src/store/nexus-store.test.ts src/lib/workflow-pro/run-group-inspector.test.ts
```

Result: passed, 2 files / 32 tests.

```text
npm run typecheck
```

Result: passed.

```text
npm run lint
```

Result: passed with 0 errors and 11 existing warnings.

Screen verification:

```text
Chrome / localhost:3000 / Trace panel Group Inspector shows RESYNC TRACE.
The control is disabled for a selected group with no local run, matching the no-run safety rule.
```

## Score

- Construction score: 9.1/10
- Distance to deep Workflow Pro platform: 96/100
- Estimated remaining rounds: 5 to 9

## Next Recommended Gate

Add real compiler adapter contracts for file, audio, image, and future video payloads. The traceability layer is now much stronger; the next leverage point is making each input payload pass through an explicit, swappable compile layer before it enters LLM, image, or video model nodes.
