# R22-11 - Runtime Evidence Export

## Goal

Make local workflow runtime evidence downloadable as a machine-readable JSON manifest.

## Construction

- Added `WorkflowProRuntimeEvidenceManifest`.
- Added `createWorkflowProRuntimeEvidenceManifest`.
- Added manifest regression metadata:
  - screen sections
  - empty-state warning
  - source of truth: `runtimeLite.runs`
- Added `Export Evidence` to the right-side Trace panel.
- The export uses the existing `downloadTextPayload` helper and does not modify workspace state.

## Verification

```bash
npm test -- src/lib/workflow-pro/runtime-evidence.test.ts
npm run typecheck
```

Results:

- 1 test file passed.
- 3 tests passed.
- Typecheck passed.

## Screen And File Proof

Computer Use verified Chrome at `http://localhost:3000/`.

- `Export Evidence` button is visible in the Trace panel.
- Clicking the button opened the browser save dialog.
- The file was saved to Downloads.
- Shell verification confirmed:

```text
nexus.workflowPro.runtimeEvidenceManifest.v1
runtimeLite.runs
nexus.workflowPro.runtimeEvidence.v1
```

## Current Score

- Construction score: 9.5/10
- Workflow Pro current 30-point planning layer: 30/30 retained
- Deep Workflow Pro distance: estimated 12-16 rounds remaining

## Next Best ROI

Start durable trace persistence design or build a run-history detail view grouped by workflow group. The safer next step is the grouped run-history view because it continues to reuse local evidence before backend persistence is added.
