# Round 19 - Run Group Inspector

Time: 2026-06-04T17:09:08+10:00

## Goal

Make the Trace panel useful for canvases that contain many appended Brain workflow groups. The operator should be able to select one workflow group and see group-local run, artifact, and trace status without reading the entire event stream.

## Completed

1. Added `nexus.workflowPro.runGroupInspector.v1`.
2. Added a pure helper that summarizes selected group evidence from RuntimeLite without reading raw prompt text or full model output.
3. Added artifact ID collection for the selected group's latest run.
4. Added durable trace correlation for the selected group's latest run.
5. Made Trace panel Run Groups selectable.
6. Added a Group Inspector surface under Run Groups.
7. Updated trace event loading so selected group trace IDs are not confused with unrelated latest-run trace IDs.

## Verification

```text
npm test -- src/lib/workflow-pro/run-group-inspector.test.ts src/lib/workflow-pro/run-history-groups.test.ts src/lib/workflow-pro/runtime-trace-correlation.test.ts
```

Result: passed, 3 files / 9 tests.

```text
npm run typecheck
```

Result: passed.

Screen verification:

```text
Chrome / localhost:3000 / Trace panel shows Group Inspector.
Clicking GROUP B86B44AE switches the inspector to 14 nodes / 0 runs / no-local-run.
```

## Score

- Construction score: 9.0/10
- Distance to deep Workflow Pro platform: 95/100
- Estimated remaining rounds: 6 to 10

## Next Recommended Gate

Add manual retry or resync controls for failed runtime trace sync, scoped to a workflow group or latest run, so permission/network failures become recoverable from the UI instead of only visible.
