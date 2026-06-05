# Workflow Pro Source Phase Gate Report

Date: 2026-06-03  
Workspace: `/Users/sean/Documents/FreeChat`  
Phase: Workflow Pro source implementation, validation, and local smoke

## 1. Executive Status

This phase moved Workflow Pro from planning/report-only material into real product source. The application now has a third workspace mode, `workflow-pro`, beside `panels` and `graph`; a visible Workflow Pro surface; a brain-readable `nexus.workflow.v1` contract draft; a contract validator; JSON import review; proposal diff; an explicit apply button; and a first real `node.file` runtime node with no-op compiler metadata.

The phase is verified by focused tests, consolidated tests, TypeScript, production build, and a local Chrome smoke on `http://localhost:3000`.

## 2. What Changed

The source now supports:

- `WorkspaceViewMode = "panels" | "graph" | "workflow-pro"`.
- A `WorkflowProSurface` with contract, brain context, file pipeline, validation, apply gate, and export controls.
- A capability inventory under `src/lib/workflow-pro/capability-inventory.ts`.
- A `nexus.workflow.v1` contract bridge from Runtime Lite.
- A `Workflow Brain` context pack for future LLM analysis.
- A `node.file` contract, runtime type, graph palette action, runtime executor, and metadata path.
- A validator for `nexus.workflow.v1`.
- A safe apply preview plan under `nexus.workflowPro.applyPlan.v1`.
- A JSON import review path under `nexus.workflowPro.importReview.v1`.
- A proposal diff path under `nexus.workflowPro.proposalDiff.v1`.
- An explicit operator-gated apply button that writes candidate Runtime Lite only after validation and apply-plan readiness.

## 3. Why This Matters

The user's core requirement is not merely "add another graph tab." The deeper requirement is that a future Workflow Brain can read a whole workflow, understand order/parallelism/intent/capability limits, propose improvements, and eventually produce a new workflow JSON that can be validated before touching the graph.

This phase establishes that chain:

Runtime Lite -> `nexus.workflow.v1` contract -> validator -> export -> apply preview candidate

The second source pass extends that into:

Export/import JSON -> validate -> active review contract -> apply preview -> proposal diff -> explicit apply -> Graph update

Graph mutation now exists only behind the explicit Apply Preview button. That is intentional. The current gate makes the system safer for future Brain-generated workflows because imported/LLM-authored JSON must be validated, previewed, diffed, and operator-applied.

## 4. Source Files Added

- `src/components/nexus/workflow-pro/workflow-pro-surface.tsx`
- `src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx`
- `src/lib/workflow-pro/brain-context.ts`
- `src/lib/workflow-pro/brain-context.test.ts`
- `src/lib/workflow-pro/capability-inventory.ts`
- `src/lib/workflow-pro/capability-inventory.test.ts`
- `src/lib/workflow-pro/file-node-contract.ts`
- `src/lib/workflow-pro/file-node-contract.test.ts`
- `src/lib/workflow-pro/workflow-contract.ts`
- `src/lib/workflow-pro/workflow-contract.test.ts`
- `src/lib/workflow-pro/workflow-contract-validator.ts`
- `src/lib/workflow-pro/workflow-contract-validator.test.ts`
- `src/lib/workflow-pro/workflow-contract-apply-plan.ts`
- `src/lib/workflow-pro/workflow-contract-apply-plan.test.ts`
- `src/lib/workflow-pro/workflow-contract-import.ts`
- `src/lib/workflow-pro/workflow-contract-import.test.ts`
- `src/lib/workflow-pro/proposal-diff.ts`
- `src/lib/workflow-pro/proposal-diff.test.ts`

## 5. Source Files Modified

- `src/components/nexus/nexus-graph.tsx`
- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-workspace-primitive.test.ts`
- `src/lib/nexus-types.ts`
- `src/lib/tool-executors.ts`
- `src/lib/workflow-runtime-lite/executors.ts`
- `src/lib/workflow-runtime-lite/registry.ts`
- `src/lib/workflow-runtime-lite/runner.test.ts`
- `src/lib/workflow-runtime-lite/state.ts`
- `src/lib/workspace-kernel.ts`
- `src/lib/workspace-kernel.test.ts`
- `src/store/nexus-store.test.ts`
- `src/store/nexus-store.ts`

## 6. File Node Contract

`node.file` is now a real Runtime Lite node type. It carries:

- `attachments`
- `compilerId`
- `compilerVersion`
- `note`

The runtime executor passes upstream `ContextPacket.rawText` through unchanged and adds file compiler metadata and attachment references to packet metadata. This creates the replaceable compiler boundary the user wanted: no-op today, zip/pdf/image/video/audio transforms later.

## 7. Metadata Safety

`sanitizePacketMetadata` was upgraded from primitive-only metadata to JSON-safe nested metadata. This allows structured file references to survive runtime snapshots while still filtering sensitive key names such as authorization, api key, token, and secret.

## 8. Workflow Brain Readiness

The current brain context pack contains:

- Contract draft
- Runtime summary
- Missing capabilities
- Guardrails
- Required output expectations
- A system brief for future Workflow Brain prompts

The important design choice: the Brain may analyze and propose, but Graph mutation is only allowed through the explicit, validated, operator-gated apply bridge.

## 9. Verification

Focused source tests:

- `npm test -- src/lib/workflow-runtime-lite/runner.test.ts src/lib/workflow-pro/capability-inventory.test.ts src/lib/workflow-pro/workflow-contract.test.ts src/lib/workflow-pro/brain-context.test.ts src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx src/components/nexus/nexus-workspace-primitive.test.ts`
- Result: 6 files passed, 26 tests passed.

Validator/export/apply tests:

- Result: 4 files passed, 10 tests passed.

Consolidated phase tests:

- `npm test -- [Workflow Pro + Runtime Lite + workspace kernel + store tests]`
- Result: 14 files passed, 83 tests passed.

TypeScript:

- `npm run typecheck -- --pretty false`
- Result: passed.

Production build:

- `npm run build`
- Result: passed.

Local smoke:

- Existing dev server found on `http://localhost:3000`.
- HTTP response: 200 OK.
- Chrome showed Graph toolbar with `ADD FILE`.
- Workspace menu showed `PANELS`, `GRAPH`, `WORKFLOW PRO`.
- Workflow Pro page rendered Contract Draft, Import Review, Proposal Diff, Apply Plan, Available Node Types, File Pipeline, Brain Context, Export Contract, Import Contract, and Apply Preview.
- Export Contract triggered the browser save flow in the previous smoke, and the final smoke confirmed the operator-gated apply controls are visible.

## 10. Known Non-Workflow-Pro Issues

The dev log still reports existing Supabase/auth configuration errors:

- `Authentication is required.`
- `Workspace session service requires Supabase service-role configuration.`

These appear in the existing state sync/session path and were not introduced by this Workflow Pro phase. They should be handled in a later backend/auth configuration round, especially before relying on cloud persistence for workflow contracts.

## 11. Next High-ROI Phase

Recommended next phase:

1. Brain review prompt/API layer: ask a model to critique the current workflow using the brain context pack.
2. Advanced Proposal Diff view: expose grouped node/edge/data changes instead of only summary counts.
3. Workflow contract/proposal persistence: store exported/imported contracts, proposals, apply events, and generated assets.
4. Supabase service-role/session config repair before depending on cloud workflow history.
5. File compiler upgrades: replace no-op compiler slots with zip/pdf/image/video/audio-specific processors.

## 12. Current Score

- Architecture fit: 9/10
- Safety posture: 9/10
- LLM handoff readiness: 8/10
- UI completeness: 7.4/10
- Backend persistence readiness: 5/10

Overall: 8.3/10 for this source phase. The foundation is strong, the first import/diff/apply loop now exists, and the next advantage comes from Brain review plus backend persistence.

## 13. Documentation Rule For Next Phases

Blueprints and technical documents should be produced according to the stage and decision need, not as automatic template output.

- During source construction, documents should stay close to source truth: contract names, file ownership, validation gates, and test evidence.
- During design exploration, documents can be more visual and comparative: UI candidates, tradeoffs, operator workflows, and decision scores.
- During backend/persistence work, documents must become operational: schemas, API routes, auth boundaries, failure modes, migration notes, and recovery plans.
- During LLM handoff work, documents must become machine-readable: JSON contracts, prompt briefs, capability inventories, proposal schemas, and acceptance tests.

This keeps the report useful without turning every phase into a large static blueprint that becomes stale before the code does.
