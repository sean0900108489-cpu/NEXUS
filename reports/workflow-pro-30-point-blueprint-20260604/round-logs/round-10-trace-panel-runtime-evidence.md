# R22-10 - Trace Panel Runtime Evidence

## Goal

Move RuntimeLite evidence out of the Graph Brain-only context and into the existing right-side Trace panel.

## Construction

- Reused `createWorkflowProRuntimeEvidenceReport`.
- Computed the report once at the active workspace level in `nexus-ops.tsx`.
- Passed `workflowRuntimeEvidence` into `AgentSettingsSidebar`.
- Added `Local Workflow Evidence` to the existing Trace panel.

## Why This Matters

Workflow Pro needs traceability that is visible to both the operator and the Brain. The previous round made a typed evidence contract; this round gives it a stable UI surface beside existing observability events.

The implementation intentionally keeps two evidence channels separate:

- local workflow evidence: from `runtimeLite.runs`
- backend trace events: from `/api/v1/observability/events`

## Verification

```bash
npm run typecheck
npm test -- src/lib/workflow-pro/runtime-evidence.test.ts src/lib/workflow-pro/graph-brain-planner.test.ts
```

Results:

- Typecheck passed.
- 2 test files passed.
- 7 tests passed.

## Screen Proof

Computer Use verified Chrome at `http://localhost:3000/`.

Visible Trace panel additions:

- `Local Workflow Evidence`
- `local-workspace-runtime-snapshot`
- `Runs`
- `Latest`
- `Artifacts`
- empty-state warning when no runs are recorded

## Current Score

- Construction score: 9/10
- Workflow Pro current 30-point planning layer: 30/30 retained
- Deep Workflow Pro distance: estimated 13-17 rounds remaining

## Next Best ROI

Create a machine-readable run evidence export/manifest path so future screen tests and Brain reviews can reference a stable file, not only visible UI text.
