# V23 Predicted High-ROI Command Rounds

This is the planned command map before implementation. It is intentionally
ordered from low-risk understanding to high-leverage source changes.

## Round Budget

Recommended total: 10 rounds.

- Scanning / evidence: 2 rounds.
- Architecture joining: 2 rounds.
- Future capability framing: 1 round.
- Implementation planning: 2 rounds.
- Professional documentation: 1 round.
- Convergence / validation plan: 1 round.
- Browser/UX verification planning: 1 round.

If implementation begins after approval, expect another 6-9 engineering rounds
depending on whether backend persistence is included.

## R1 - Repository and Report State Scan

Goal:

- Confirm branch, dirty files, report folder, existing export/import code, and
  runtimeLite boundaries.

High ROI:

- Prevents planning from targeting nonexistent files.
- Separates report dirtiness from source dirtiness.

Expected output:

- Current-state summary.
- File ownership map.

Status: completed in this planning loop.

## R2 - External and Safari Advisory Scan

Goal:

- Ask Safari NEXUS for strategic blind spots.
- Research workflow graph, checkpointing, JSON envelope, static verification,
  and visual builder references.

High ROI:

- Imports strong ideas without blindly copying frameworks.

Expected output:

- Research notes with source links.
- Filtered project-fit conclusions.

Status: completed in this planning loop.

## R3 - Pain and Value Map

Goal:

- Convert user intent into exact pain points and value promises.

High ROI:

- Avoids building a JSON schema that is technically correct but strategically
  useless.

Output:

- Pain map.
- Value map.
- Non-goals.

## R4 - Canonical Workflow Contract Forecast

Goal:

- Define what `nexus.workflow.v1` must contain in the first real iteration.

High ROI:

- Sets the future validator/importer shape before code exists.

Output:

- Required fields.
- Deferred fields.
- Validation levels.
- Sample import/export lifecycle.

## R5 - Graph UI Intelligence Plan

Goal:

- Reframe the graph from a generated canvas into a design-grade workflow
  builder.

High ROI:

- Helps future UI work avoid random controls and toolbar sprawl.

Output:

- Node inspector model.
- Capability palette.
- Validation overlay.
- Brain critique panel.
- Diff/upgrade proposal flow.

## R6 - Backend Persistence Coexistence Plan

Goal:

- Define how workflow contracts coexist with current workspace snapshots.

High ROI:

- Prevents destructive rewrites of cloud state.

Output:

- Keep current workspace snapshots.
- Add workflow contract entity/table later.
- Define versioning/checksum/publish lifecycle.
- Define RLS and ownership boundaries.

## R7 - Implementation Package Plan

Goal:

- Plan exact source folders before implementation.

High ROI:

- Makes future Codex work precise.

Expected source layout:

```text
src/lib/workflow-contract/
  types.ts
  schema.ts
  validator.ts
  capability-inventory.ts
  from-runtime-lite.ts
  to-runtime-lite.ts
  brain-proposal.ts
  fixtures/
  __tests__/
```

Potential UI files:

```text
src/components/nexus/workflow-contract/
  workflow-contract-export-dialog.tsx
  workflow-contract-import-dialog.tsx
  workflow-brain-panel.tsx
  workflow-validation-panel.tsx
```

## R8 - Risk Register and Wall Plan

Goal:

- Predict likely blockers before implementation.

High ROI:

- Keeps the upgrade from bloating or breaking existing sync.

Output:

- Risk register.
- Fallback decisions.
- Stop/go criteria.

## R9 - Professional Report and HTML Extension

Goal:

- Produce a Sean-facing report and machine handoff manifest.

High ROI:

- Makes the planning durable and reusable by the next Codex run.

Output:

- `v23-strategy-report.md`
- `v23-planning-manifest.json`
- `sean-execution-report.html` extension.

## R10 - Verification and Handoff

Goal:

- Verify JSON parses, report links work, HTML report renders through localhost,
  and no source files were unintentionally changed.

High ROI:

- Makes this planning phase safe to commit or discard.

Output:

- Verification summary.
- Final LINE Keep report.

