# Round 13 - Workflow Group Metadata Contract

Timestamp: 2026-06-04T16:14:50+10:00

## Goal

Round 12 made workflow groups visible in Trace, but group identity still depended on parsing node IDs such as `wf_group_<id>_node_<name>`. That is useful as a fallback but weak as a product contract. This round adds explicit group metadata to RuntimeLite nodes, edges, and runs.

## What Changed

- Added `WorkflowRuntimeGroupRef` to `src/lib/nexus-types.ts`.
- Added `createWorkflowRuntimeGroupRef()` and `normalizeWorkflowRuntimeGroupRef()` to `src/lib/workflow-runtime-lite/state.ts`.
- Updated `appendWorkflowRuntimeGroupToRuntime()` so appended nodes and edges receive explicit group metadata.
- Updated `runWorkflowRuntimeLite()` so runs can preserve group metadata.
- Updated the store runtime runner so a single selected group is attached to the resulting run.
- Updated Graph Brain append wiring so Brain-generated groups are marked with `source: "brain"` and the contract name as the group label.
- Updated `Run Groups` reporting so explicit metadata wins before node ID inference.

## Why This Matters

The user clarified that a canvas can contain multiple workflow groups and that generated workflows should add another full group instead of mutating existing groups. Explicit group metadata makes that rule durable.

This also prepares future backend work:

- trace rows can store group identity directly
- permission audit can say which group attempted a mutation or run
- Brain can ask about a group by semantic label instead of reading node IDs
- exported evidence can stay stable even if node naming changes later

## Verification

```text
npm test -- src/lib/workflow-runtime-lite/group-append.test.ts src/lib/workflow-runtime-lite/runner.test.ts src/lib/workflow-pro/run-history-groups.test.ts src/store/nexus-store.test.ts
```

Result: passed, 4 files / 48 tests.

```text
npm run typecheck
```

Result: passed.

Computer Use / Chrome verification:

- Opened `http://localhost:3000/`.
- Opened Graph Brain.
- Used the on-screen `Append` button.
- Verified the canvas appended `Brain Draft / Image Or File Input To Two LLMs`.
- Verified Trace `Run Groups` changed from `5 groups / 0 runs` to `6 groups / 0 runs`.
- Verified the new group label rendered in Trace instead of only a generated ID label.

## Construction Score

- Contract durability: 9/10
- Backward compatibility: 9/10
- Screen proof: 10/10
- Overall round score: 9.2/10

## Remaining Gaps

- Existing old groups loaded from IndexedDB still rely on ID inference until they are re-appended or migrated.
- Backend durable trace tables do not yet store `workflowGroupId`.
- Group detail drill-down still needs a dedicated UI.

## Next Recommended ROI

Add a backend trace persistence boundary document and adapter contract for group-aware workflow events. Keep it additive first, then decide whether to add a Supabase migration.
