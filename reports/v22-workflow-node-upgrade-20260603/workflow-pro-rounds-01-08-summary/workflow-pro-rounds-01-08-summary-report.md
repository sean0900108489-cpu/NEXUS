# Workflow Pro R1-R8 Total Report

Status: ready for first source implementation batch.  
Date: 2026-06-03  
Branch: `v22`  
Cadence: total report and total audio generated after at least 7-8 high-ROI rounds.

## Executive Summary

This batch converted the Workflow Pro upgrade from a broad visual/product ambition into an engineering-ready contract package. The important result is not a new UI yet. The important result is that the project now has a clean definition of what Workflow Pro is, how it differs from the existing Graph, how a future Workflow Brain should read the entire workflow, and how file-carrying nodes, compiler layers, generated artifacts, Supabase persistence, and Vercel deployment boundaries should fit together.

The current Graph already contains many features that were previously assumed to be missing: React Flow graph editing, click-to-center node creation, drag-to-position node creation, input node start/pause/copy actions, Start All, generated asset history, node and edge deletion, LLM reasoning controls, and image quality/aspect-ratio controls. Therefore the highest ROI route is not to rebuild Graph. The correct route is to add Workflow Pro as a third workspace tab beside Panels and Graph, with its own design-intelligence surface and a canonical `nexus.workflow.v1` contract.

## R1 - Current-State Scan

The repo scan found that NEXUS already has a meaningful runtime foundation. `src/lib/nexus-types.ts` defines workspace view modes, runtime nodes, generated artifacts, and the graph state shape. `src/store/nexus-store.ts` owns workspace state actions and artifact vault state. `src/components/nexus/nexus-ops.tsx` routes the main workspace surface. `src/components/nexus/nexus-graph.tsx` already owns the React Flow graph. Runtime Lite lives under `src/lib/workflow-runtime-lite/*`, while attachment compiler placeholders live under `src/lib/attachments/*`.

The key decision from R1 is that Workflow Pro must not be implemented by randomly expanding `nexus-graph.tsx`. Graph already does execution. Workflow Pro should do design intelligence, workflow explanation, import/export contract work, brain analysis, proposal diff, evidence timeline, file handling policy, and capability inventory.

## R2 - Engineering Launch Report

R2 produced a launch report under `workflow-pro-engineering-launch/`. That report established the 23+5 round plan and documented the source boundaries, Vercel deployment boundaries, Supabase storage/RLS boundaries, and first implementation gate.

The first engineering source batch is intentionally small: add `workflow-pro` as a view mode, route to a new `WorkflowProSurface`, preserve Graph behavior, and add focused tests for view mode persistence and snapshot sanitization. This keeps the blast radius low while opening a professional surface for deeper work.

## R3 - Documentation Pack Consolidation

R3 created `docs/workflow-pro/` as the stable knowledge base for this upgrade. This prevents the next developer or LLM from hunting across scattered planning files. The pack includes:

- `README.md`
- `human-guide.md`
- `llm-guide.md`
- `workflow-contract-v1.md`
- `workflow-contract-v1.schema.json`
- `brain-boot-prompt.md`
- `ui-architecture.md`
- `backend-persistence-plan.md`
- `implementation-rounds.md`
- `file-map.json`

This is the documentation spine. It is deliberately separate from the historical report folder because it is meant to guide future engineering, not just summarize past work.

## R4 - Canonical Workflow Contract

R4 defined `nexus.workflow.v1`, the first canonical contract for workflow design. This is separate from both workspace snapshot and Runtime Lite state:

```text
Workspace snapshot = recovery and portability.
Runtime Lite = executable run state.
nexus.workflow.v1 = brain-readable workflow design.
```

The contract requires workflow intent, success criteria, capability inventory, nodes, edges, outputs, brain settings, and metadata. Each node must include not only type and data, but also purpose, rationale, limits, artifact policy, and model/compiler settings where relevant.

This is the key to your requirement that one JSON file should be enough for an LLM to understand, critique, optimize, and eventually regenerate a workflow.

## R5 - Workflow Brain Boot Prompt

R5 created `brain-boot-prompt.md`. The Workflow Brain is not a generic chatbot and not a passive run summarizer. It must understand the whole workflow before execution.

The prompt forces the brain to read:

- the `nexus.workflow.v1` file
- current capability inventory
- compiler registry
- artifact policy registry
- runtime evidence
- known missing capabilities
- the user's strategic question

The important rule is that the brain must see what is not available yet. That allows it to propose missing capabilities honestly without hallucinating that the platform can already do everything.

## R6 - UI Architecture

R6 translated the visual concepts into an app-native structure. The UI decision is:

```text
Panels | Graph | Workflow Pro
```

Workflow Pro is a sibling tab, not a right sidebar and not a copy of Graph.

The internal Workflow Pro modes should be:

- Design
- Brain
- Evidence
- Proposal Diff
- Files
- Settings

Concept 5 and concept 6 from the V23 report are used as information architecture references only. Their colors should not be copied into production. The production interface should stay inside the current dark, low-saturation NEXUS visual language.

Evidence and Proposal Diff should share a switchable analysis bay instead of appearing side-by-side by default. This directly addresses the density problem: two advanced cognitive panels together would make the interface too crowded.

## R7 - Backend And Persistence Plan

R7 clarified backend boundaries. The platform already has workspace cloud state, artifact service, sync queue, Supabase migrations, RLS hardening history, and generated artifact records.

The first persistence rule is:

```text
workflow design preview -> local workspace state
generated output -> artifact service
workspace recovery -> workspace snapshot
runtime evidence -> runtimeLite run state
```

Only add a new `workflow_contracts` persistence layer later if the contract needs independent versioning, sharing, publishing, or server-side validation.

The file node policy is also now clear:

```text
raw file artifact
-> compiler metadata
-> compiled artifact
-> ContextPacket attachment reference
```

The no-op compiler remains valid. That means every file input can pass through the same conceptual pipeline even before a real zip/pdf/video/image compiler exists.

## R8 - Verification And Batch Close

R8 verified that the new JSON docs parse correctly:

- `docs/workflow-pro/workflow-contract-v1.schema.json`
- `docs/workflow-pro/file-map.json`

The local report server is reachable on `http://localhost:4173/`. The earlier engineering launch report has 14 page sections and remains available. This R1-R8 total report is now the new checkpoint before source implementation begins.

## Current File Map

The new durable planning files live under `docs/workflow-pro/`.

The human-facing historical report lives under:

```text
reports/v22-workflow-node-upgrade-20260603/workflow-pro-rounds-01-08-summary/
```

The LLM handoff manifest is:

```text
reports/v22-workflow-node-upgrade-20260603/workflow-pro-rounds-01-08-summary/workflow-pro-rounds-01-08-manifest.json
```

## Why This Is Ready For Engineering

The next source change no longer needs to invent the product direction while editing code. It has:

- a tab placement
- a protected Graph boundary
- a canonical workflow contract
- a brain boot prompt
- a file node policy
- a backend persistence rule
- a staged implementation order
- a documented test gate

The next implementation can start with a low-risk surface:

```text
Add workflow-pro view mode
-> add skeleton WorkflowProSurface
-> route from NexusOps body
-> preserve Graph behavior
-> add view mode and sanitizer tests
```

## Remaining Rounds

After this batch, the remaining work is estimated at 20-25 rounds:

- 8 source implementation rounds for the first Workflow Pro tab and skeleton
- 7 contract/runtime bridge rounds
- 5 landing and verification rounds
- 3-5 contingency rounds if tests, deployment, or persistence boundaries reveal hidden coupling

## Risk Register

The main risk is accidental coupling. If Workflow Pro mutates Graph behavior too early, it can break already-working runtime features. The second risk is schema inflation: the workflow contract could become too ambitious before the first import/export path exists. The third risk is backend overreach: adding Supabase tables too early would create policy and migration surface before the product actually needs independent workflow contract persistence.

The mitigation is to keep the first source batch narrow and testable.

## Recommended Next Move

Start Stage 2/R9-R16:

1. Add `workflow-pro` to the view mode type.
2. Update workspace sanitizer/import/export survival.
3. Update store view mode handling.
4. Add the third top-left tab label.
5. Create `WorkflowProSurface`.
6. Route body rendering without changing Graph behavior.
7. Add focused tests.
8. Run browser smoke for Panels, Graph, and Workflow Pro.

This is the cleanest path from planning into real product code.
