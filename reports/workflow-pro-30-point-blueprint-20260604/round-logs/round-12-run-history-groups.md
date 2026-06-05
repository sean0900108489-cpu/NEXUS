# Round 12 - Run History Groups

Timestamp: 2026-06-04T16:07:04+10:00

## Goal

Workflow Pro can hold many appended workflow groups on the same canvas. The local runtime evidence panel already showed aggregate runs, but it did not group the canvas and run evidence by workflow group. This round adds a first run-history grouping layer so operators can see which appended workflow families exist and where future run evidence should attach.

## What Changed

- Added `src/lib/workflow-pro/run-history-groups.ts`.
- Added `src/lib/workflow-pro/run-history-groups.test.ts`.
- Connected the report into the right-side Trace panel in `src/components/nexus/nexus-ops.tsx`.
- The Trace panel now shows a `Run Groups` section under `Local Workflow Evidence`.

## Technical Shape

The new report schema is:

```text
nexus.workflowPro.runHistoryGroups.v1
```

It reads the local `WorkflowRuntimeLite` snapshot and groups evidence by inferred workflow group ID:

- appended Brain groups use IDs such as `wf_group_<uuid>`
- non-grouped legacy nodes fall back to `workspace-root`
- latest run information is preserved when a run exists
- node count, run count, status counts, and artifact count are summarized per group

## Why This Matters

The user clarified that the canvas can contain many workflow groups at the same time, and a generated workflow should append a new group instead of rewriting old nodes. That makes group-level evidence necessary. Without it, the Trace panel can show "runs exist" but not which workflow family they belong to.

This is also a foundation for the future Brain to answer questions like:

- Which workflow group failed?
- Which group generated which artifacts?
- Which generated workflow needs missing capability work next?
- Which groups are only designed versus actually executed?

## Verification

```text
npm test -- src/lib/workflow-pro/run-history-groups.test.ts src/lib/workflow-pro/runtime-evidence.test.ts
```

Result: passed, 2 files / 5 tests.

```text
npm run typecheck
```

Result: passed.

Computer Use / Chrome verification:

- Opened `http://localhost:3000/`.
- Opened the right-side `Trace` panel.
- Verified `Run Groups` is visible.
- Verified the current canvas is grouped as `5 groups / 0 runs`.
- Verified the group list renders while local runtime has no completed run history yet.

## Construction Score

- Runtime evidence traceability: 8/10
- Multi-workflow canvas grouping: 9/10
- Screen proof: 10/10
- Overall round score: 9/10

## Remaining Gaps

- Group detail currently shows compact summary, not a full drill-down timeline per group.
- Group IDs are inferred from the current appended node naming convention. A future durable workflow manifest should store group ID explicitly.
- Runs are still local RuntimeLite evidence, not backend durable trace persistence.

## Next Recommended ROI

Add a durable workflow trace boundary plan and adapter shape so this local evidence can later be stored per workspace/account without repeating the previous permission problems.
