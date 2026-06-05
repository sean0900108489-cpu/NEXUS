# R22-09 - Runtime Evidence Panel

## Goal

Move Workflow Pro beyond planning-only evidence by exposing the existing RuntimeLite run history as a small, typed, Brain-readable evidence report.

## Construction

- Added `src/lib/workflow-pro/runtime-evidence.ts`.
- Added `src/lib/workflow-pro/runtime-evidence.test.ts`.
- Extended `WorkflowGraphBrainPlannerResult` with `architect.runtimeEvidenceReport`.
- Added runtime evidence lines to the Brain proposal analysis.
- Added a `Runtime Evidence` section inside the Graph Brain panel.

## Why This Matters

The current system already records `WorkflowRun` and `NodeExecution` data inside `runtimeLite.runs`. This round does not invent a new trace system. It turns the existing data into a stable contract so the Brain can later reason about:

- latest run status
- node execution timeline
- node errors
- output previews
- generated artifact references
- whether there is enough real run evidence to debug

## Verification

```bash
npm test -- src/lib/workflow-pro/runtime-evidence.test.ts src/lib/workflow-pro/graph-brain-planner.test.ts src/lib/workflow-pro/capability-inventory.test.ts
npm run typecheck
```

Results:

- 3 test files passed.
- 10 tests passed.
- Typecheck passed.

## Screen Proof

Computer Use verified Chrome at `http://localhost:3000/`.

Visible Graph Brain additions:

- `Runtime Evidence`
- `Runs`
- `Latest`
- `Artifacts`
- `local snapshot`
- empty-state warning when there are no runtime runs yet

## Current Score

- Construction score: 9.5/10
- Workflow Pro current 30-point planning layer: 30/30 retained
- Deep Workflow Pro distance: estimated 14-18 rounds remaining

## Next Best ROI

Add a run-history/trace detail surface that can show the latest run evidence outside the Brain panel and prepare it for durable backend persistence.
