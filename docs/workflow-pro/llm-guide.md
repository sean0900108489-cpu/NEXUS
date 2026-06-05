# Workflow Pro LLM Guide

This file is for Codex or another LLM that needs to continue Workflow Pro work.

## Operating Rule

Do not start by editing `src/components/nexus/nexus-graph.tsx`. The current graph owns working React Flow behavior. Workflow Pro should be introduced through a new surface and a contract layer.

## Current Architecture Facts

- `WorkspaceViewMode` supports `panels | graph | workflow-pro`.
- `WorkflowProSurface` is mounted from `NexusOps` as the third workspace mode.
- Workflow Pro already has contract draft, JSON paste import, import review, apply plan, proposal diff, brain context, file node contract, foundation benchmark fixtures, and a local active cockpit bay.
- `NexusGraph` already has React Flow nodes, edges, custom delete edge, node delete, toolbar actions, generated history, LLM reasoning controls, image quality/ratio controls.
- Runtime Lite lives in `src/lib/workflow-runtime-lite/*`.
- `src/lib/workflow-pro/runtime-bridge.ts` is the canonical
  `nexus.workflow.v1 -> Runtime Lite` bridge. Apply Plan, future Workflow Brain
  optimized workflow imports, and any one-click JSON workflow creation should
  reuse this bridge instead of building a parallel converter.
- `src/lib/workflow-pro/handoff-package.ts` is the canonical export envelope for
  LLM handoff. It wraps the contract with runtime summary, capability inventory,
  guardrails, required output shape, and import-back rules while preserving the
  top-level `contract` property for existing import compatibility.
- Generated image output already records artifacts through the artifact service.
- Attachment no-op compiler metadata already exists in `src/lib/attachments/*`.
- Supabase migrations already include workspace state, sync, artifacts, observability, and RLS hardening.

## Primary Source Files

1. `src/lib/nexus-types.ts`
2. `src/lib/workspace-kernel.ts`
3. `src/store/nexus-store.ts`
4. `src/components/nexus/nexus-ops.tsx`
5. `src/components/nexus/workflow-pro/*`
6. `src/lib/workflow-pro/*`

## Protected Behavior

Do not change these without a dedicated test gate:

- Graph pan/zoom/drag/connect/delete behavior.
- Existing artifact vault generated history.
- Provider vault and secret handling.
- Workspace export/import recovery semantics.
- Runtime Lite run execution order.
- Supabase service role boundary.

## Completed Foundation Goal

Stage 2/R3-R5 is implemented:

```text
Add workflow-pro view mode
-> add skeleton WorkflowProSurface
-> route from NexusOps body
-> preserve Graph behavior
-> add view mode and sanitizer tests
```

## Next Implementation Goal

Deepen the Workflow Pro cockpit without changing Runtime Lite semantics:

```text
Make each internal mode useful
-> Design: fixture/import/apply path
-> Brain: whole-workflow context pack and questions
-> Evidence: run/artifact/status timeline
-> Proposal Diff: current graph vs imported contract review
-> Files: raw/compiled attachment pipeline
-> Settings: feature flags and capability inventory
```

## R112 Canonical Runtime Bridge

R112 extracted the private Apply Plan conversion into
`src/lib/workflow-pro/runtime-bridge.ts`.

Use it when:

- an imported `nexus.workflow.v1` JSON contract should become a Runtime Lite
  candidate.
- the Workflow Brain returns an optimized workflow draft that must be previewed
  before Graph mutation.
- a future backend workflow-template import needs to normalize nodes, edges, and
  runtime state the same way as the UI.

Do not duplicate the conversion logic in components. The bridge resets runtime
execution state, preserves node data including file compiler metadata and image
settings, and reports dropped nodes/edges after Runtime Lite normalization.

## R113 Handoff Package Export

R113 changed Workflow Pro export from a bare contract download to a
`nexus.workflowPro.handoffPackage.v1` envelope.

The package exists so a strong LLM can read the whole situation at once:

- `contract`: the actual `nexus.workflow.v1` workflow that can be imported back.
- `runtimeSummary`: node counts, edge counts, run status, status buckets, and
  current runtime error state.
- `capabilityInventory`: available and planned node, compiler, and artifact
  capabilities.
- `brainHandoff`: guardrails, system brief, operator question, and required LLM
  output shape.
- `importBack`: accepted JSON shapes and the target schema for optimized
  workflow proposals.

The existing import parser accepts this envelope because it already extracts a
top-level `contract` property. Keep that compatibility: future export envelopes
may add more context, but they must continue carrying a valid
`nexus.workflow.v1` under `contract`.

## R114 Screen Roundtrip Verification

R114 verified the handoff path through the real browser UI on `localhost:3000`:

```text
Workflow Pro export
-> downloaded nexus.workflowPro.handoffPackage.v1
-> inspected envelope and inner nexus.workflow.v1 contract
-> pasted package back into Workflow Pro import textarea
-> import review accepted
-> Apply Preview converted the imported contract back into Graph
```

Evidence screenshots:

- `reports/workflow-pro-source-phase-20260603/assets/r114-handoff-roundtrip-accepted.png`
- `reports/workflow-pro-source-phase-20260603/assets/r114-handoff-roundtrip-graph-ready.png`

Verification commands:

```text
npm test -- src/lib/workflow-pro/handoff-package.test.ts src/lib/workflow-pro/runtime-bridge.test.ts src/lib/workflow-pro/workflow-contract-import.test.ts src/lib/workflow-pro/workflow-contract-apply-plan.test.ts src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx
npm run typecheck
```

Both passed. The remaining UI polish issue is that a large pasted package keeps
focus inside the textarea until the operator jumps back to the page top. The
functional path is valid, but future import UX should provide a compact import
review drawer or auto-scroll to the accepted review.

## R115 Import Review Visibility

R115 fixed the R114 UX friction without changing contract semantics:

- Added an `aria-live` compact import status band immediately under the pasted
  JSON controls.
- Added auto-scroll to the detailed Import Review panel whenever
  `importReview` changes.
- Preserved the same parser and Apply Plan bridge; this is a visibility and
  operator-confidence improvement only.

Screen verification used the same exported handoff package, pasted it back into
Workflow Pro, and confirmed the UI landed on:

```text
IMPORT ACCEPTED
READY TO APPLY PREVIEW
Import Review: accepted
Apply Plan: ready
Candidate nodes: 13
Candidate edges: 12
```

Evidence screenshot:

- `reports/workflow-pro-source-phase-20260603/assets/r115-import-status-autoscroll.png`

## R116 Brain Handoff Protocol

R116 promoted the Workflow Brain handoff instructions into a dedicated protocol
module:

- `src/lib/workflow-pro/brain-handoff.ts`
- `src/lib/workflow-pro/brain-handoff.test.ts`

The handoff package now carries `brainHandoff.schema` as
`nexus.workflowPro.brainHandoff.v1` plus:

- `readingOrder`: how a strong LLM should read the workflow before answering.
- `optimizationRules`: what it may and may not propose.
- `responseChecklist`: what the LLM must cover when explaining or redesigning a
  workflow.

This keeps the future Workflow Brain from relying on scattered component text or
ad hoc prompt strings. `brain-context.ts` still builds the context pack;
`brain-handoff.ts` defines the LLM handoff protocol; `handoff-package.ts`
serializes both into the export envelope.

Screen/export verification confirmed the UI-exported package contains:

```text
package schema: nexus.workflowPro.handoffPackage.v1
brain schema: nexus.workflowPro.brainHandoff.v1
reading order count: 6
optimization rule count: 5
response checklist count: 6
import target: nexus.workflow.v1
```

## R117 Brain Review Proposal Validator

R117 added a local validation boundary for future LLM Brain responses:

- `src/lib/workflow-pro/brain-review-proposal.ts`
- `src/lib/workflow-pro/brain-review-proposal.test.ts`

The proposal schema is `nexus.workflowPro.brainReviewProposal.v1`:

```text
analysis: string
questionsForSean: string[]
missingCapabilities: string[]
optimizedWorkflow: nexus.workflow.v1 | null
source?: { model?: string; createdAt?: string }
```

Use `validateWorkflowProBrainReviewProposal()` or
`parseWorkflowProBrainReviewProposalText()` before a Brain response can affect
Proposal Diff or Apply Plan. If `optimizedWorkflow` is present, it is validated
with the canonical workflow contract validator first. This prevents a model from
returning a plausible-looking but structurally invalid workflow and having it
flow into Graph preview.

## R118 Brain Proposal UI Intake

R118 connected the Brain Review Proposal validator to the actual Workflow Pro UI:

- `src/components/nexus/workflow-pro/workflow-pro-surface.tsx`
- `src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx`

The `Proposal Diff` bay now includes a `Brain proposal intake` panel. Operators
can paste a `nexus.workflowPro.brainReviewProposal.v1` JSON object, validate it,
see accepted/rejected status, issue count, analysis text, and whether an
`optimizedWorkflow` is ready.

If validation passes and `optimizedWorkflow` exists, the panel sends only that
workflow contract into the existing Workflow Pro import path. It does not mutate
Graph directly. The existing import review and apply plan still decide whether
the preview is accepted, ready, and explicitly operator-gated.

Screen verification passed with a Brain proposal containing a valid
`optimizedWorkflow`:

```text
proposal: accepted
optimized workflow: ready
issues: 0
import status: accepted
import source: workflow-brain-proposal.json
apply plan: ready
candidate nodes: 13
candidate edges: 12
mutates now: no
explicit apply: required
```

Evidence screenshot:

- `reports/workflow-pro-source-phase-20260603/assets/r118-brain-proposal-import-preview.png`

## R119 Brain Proposal Stale Guard

R119 tightened the Brain proposal UI intake so an old accepted validation result
cannot be reused after the operator edits the pasted JSON.

Implementation notes:

- The UI stores the exact text that was validated.
- If the textarea changes after validation, the proposal state becomes `stale`.
- Stale proposals show `optimized workflow: none`.
- Stale proposals keep `Import optimized workflow` disabled.
- Revalidating a malformed proposal produces `rejected` with validator errors.

Screen verification covered the positive-to-negative path:

```text
valid proposal: accepted
optimized workflow: ready
operator edits text after validation
proposal: stale
optimized workflow: none
import optimized workflow: disabled
revalidate malformed JSON object
proposal: rejected
issues: 5
import optimized workflow: disabled
```

Evidence screenshot:

- `reports/workflow-pro-source-phase-20260603/assets/r119-brain-proposal-rejected-stale-guard.png`

## R120 Brain Proposal Evidence Manifest

R120 added a machine-readable evidence manifest for the Brain proposal intake
screen work:

- `docs/workflow-pro/brain-proposal-intake-evidence.manifest.json`
- `src/lib/workflow-pro/brain-proposal-intake-evidence.test.ts`

The manifest records a 20/20 screen-operated gate:

```text
valid-brain-proposal-import-preview: pass / 10 points
stale-guard-after-edit: pass / 5 points
malformed-proposal-rejection: pass / 5 points
```

The test verifies:

- manifest schema
- score
- gate order and points
- all gates are screen-operated passes
- source-code references exist
- evidence screenshots exist
- Brain proposals cannot mutate Graph directly
- stale or rejected proposals cannot import

Use this manifest as the stable handoff pointer when another LLM, Codex turn, or
developer needs to know whether the Brain proposal UI intake is actually
grounded in browser evidence.

## R121 Convergence Check

R121 performed the final verification sweep for the R118-R120 Brain proposal UI
intake sequence. No new product behavior was added in this round.

Verification passed:

```text
Workflow Pro broad tests: 15 files / 35 tests passed
Lint on touched TS/TSX files: passed
Typecheck: passed
```

Current status:

- Valid Brain proposal import path is screen verified.
- Stale edit guard is screen verified.
- Malformed proposal rejection is screen verified.
- Evidence manifest is test verified.
- Graph mutation remains behind explicit operator apply.

Recommended next phase: commit and deploy this Workflow Pro source slice, then
start the next product layer: richer proposal diff scoring, proposal preview
comparison, and eventually automated browser screen replay.

## LLM Output Expectations

When proposing code, include:

- exact files
- reason each file exists
- tests to run
- rollback path
- whether source or docs were touched
- whether any backend/Supabase/Vercel behavior changed
