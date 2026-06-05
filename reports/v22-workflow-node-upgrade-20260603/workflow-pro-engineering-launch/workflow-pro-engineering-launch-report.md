# Workflow Pro Engineering Launch Report

Generated: 2026-06-03  
Mode: engineering launch planning, no product source mutation  
Branch context: v22  
Primary goal: prepare the full Workflow Pro iteration so the next command can start implementation with a clean map, bounded stages, and no unnecessary file sprawl.

## Page 01 - Executive Start Point

This iteration is not starting from a blank canvas. NEXUS already has a working Graph surface powered by `@xyflow/react`, a `runtimeLite` execution layer, generated asset persistence through the artifact service, composer image settings, and a Supabase-backed workspace/state backend. The correct move is therefore not to clone Graph or invent a second runtime. The correct move is to promote the current Graph MVP into a professional Workflow Pro system with a stronger contract layer, a stronger UI shell, and a brain-readable workflow format.

Current Graph already covers several user-requested primitives:

- Add Input, Add LLM, Add Image, Add Output.
- Click-to-create node near canvas center.
- Drag-to-drop node creation through the native drag/drop bridge.
- Start All.
- Input node Start, Pause, Copy.
- LLM model select plus reasoning effort/detail.
- Image model select plus quality and aspect ratio.
- Generated asset history dropdown and download action.
- Node and edge delete controls.

The upgrade should not waste rounds rebuilding those from scratch. The high-ROI path is to reorganize, harden, label, separate concerns, and add missing future-facing contracts.

## Page 02 - Why This Still Needs A Big Iteration

The fact that the MVP exists does not mean the platform is strategically ready. The current Graph is executable, but it is not yet a full design-intelligence system. A Workflow Brain cannot reliably understand the whole workflow if the only durable representation is a UI-flavored graph state. A human can visually infer intent from the graph, but an LLM needs an explicit contract: workflow intent, node purpose, edge rationale, serial/parallel order, artifact policy, compiler capabilities, missing feature boundaries, and optimization authority.

The iteration exists to solve five pain points:

- The graph can run nodes, but does not yet expose a canonical `nexus.workflow.v1` design contract.
- Runtime state records execution packets, but not enough workflow design semantics for a brain model to critique or regenerate a workflow.
- File inputs and compiler layers exist in the composer domain, but not yet as first-class workflow nodes.
- Generated image/video history is present through artifacts, but Workflow Pro needs a clearer asset lane, policy labels, and future downloadable media continuity.
- UI concepts 5 and 6 are strong, but must be integrated as switchable analysis views using the current NEXUS dark visual system, not their colorful concept palette.

## Page 03 - Non-Negotiable Product Goal

The final product direction is:

One JSON file should be able to generate a workflow, explain that workflow to a human, brief a Workflow Brain LLM, validate what the workflow can and cannot do, run through the existing runtime bridge, and let the brain propose a better version.

That means the workflow format must be more than nodes and edges. It needs:

- `intent`: why the workflow exists.
- `successCriteria`: what good output means.
- `capabilityInventory`: what the current app can do and cannot do.
- `nodes`: what each unit does, why it exists, and what settings it carries.
- `edges`: how packets move, why connections exist, and whether they are serial, conditional, parallel, or fallback.
- `artifacts`: whether output is stored, downloadable, historically visible, and linked to a run.
- `compilers`: file conversion slots, including no-op compiler layers.
- `brain`: what the supervising LLM can inspect, propose, and modify.
- `limits`: explicit missing capabilities so the LLM does not hallucinate what the system can do.

This is the difference between a graph editor and an intelligent workflow operating system.

## Page 04 - UI Direction And Reference Boundary

The reference UI direction is concepts 5 and 6 from the V23 report:

- Concept 5: Evidence Timeline Cockpit.
- Concept 6: Proposal Diff War Room.

The implementation rule is strict: use their information architecture, not their color palette. The current NEXUS app is dark, low-saturation, grid-based, glassy, compact, and tool-oriented. Workflow Pro should feel like it belongs inside the existing product.

Design decisions:

- Keep dark background, fine grid, low-contrast glass panels, neutral text, and restrained accent usage.
- Use the concepts as switchable internal views, not side-by-side panels that make the screen crowded.
- Treat Workflow Pro as a professional workbench, not a landing page.
- Keep toolbar density high but readable.
- Avoid decorative gradients, colorful orbs, and unrelated marketing composition.
- Make every visible control earn its space: Design, Brain, Evidence, Proposal Diff, Files, Settings.

## Page 05 - Architecture Anchor Map

The current source anchors are:

- `src/lib/nexus-types.ts`: core types for workspace, graph, runtime nodes, artifacts, model settings.
- `src/store/nexus-store.ts`: workspace state, graph operations, runtime operations, artifact cache, persistence.
- `src/lib/workspace-kernel.ts`: snapshot sanitization/import/export survival.
- `src/components/nexus/nexus-ops.tsx`: main app shell, workspace view routing, composer, graph bridge.
- `src/components/nexus/nexus-graph.tsx`: existing graph implementation and current runtime node UI.
- `src/lib/workflow-runtime-lite/*`: current executable runtime.
- `src/lib/attachments/*`: no-op compiler and attachment input model.
- `src/lib/backend/artifacts/*`: artifact materialization, repository, references, persistence.
- `src/app/api/v1/artifacts/*`: backend artifact routes.
- `supabase/migrations/*`: existing RLS and artifact/state schema history.

Workflow Pro should add new files around these anchors rather than stuffing everything into `nexus-graph.tsx`.

## Page 06 - Proposed File Organization

Recommended source layout for the implementation stage:

```text
src/components/nexus/workflow-pro/
  workflow-pro-surface.tsx
  workflow-pro-mode-switcher.tsx
  workflow-pro-design-canvas.tsx
  workflow-pro-brain-panel.tsx
  workflow-pro-evidence-timeline.tsx
  workflow-pro-proposal-diff.tsx
  workflow-pro-files-panel.tsx
  workflow-pro-node-inspector.tsx
  workflow-pro-contract-panel.tsx

src/lib/workflow-pro/
  contract/types.ts
  contract/schema.ts
  contract/validator.ts
  contract/from-runtime-lite.ts
  contract/to-runtime-lite.ts
  contract/capability-inventory.ts
  brain/boot-prompt.ts
  brain/context-pack.ts
  brain/proposal-schema.ts
  file-node/types.ts
  file-node/compiler-registry.ts
  file-node/context-packet-attachments.ts
```

Documentation should live outside source:

```text
docs/workflow-pro/
  human-guide.md
  llm-guide.md
  file-map.json
  workflow-contract-v1.md
  implementation-rounds.md
```

Reports should remain in:

```text
reports/v22-workflow-node-upgrade-20260603/workflow-pro-engineering-launch/
```

This keeps product code, developer docs, LLM handoff docs, and one-off report artifacts separate.

## Page 07 - Stage Plan And Round Budget

Recommended total: 23 primary high-ROI rounds plus 5 contingency rounds, for a realistic ceiling of 28.

Stage 1: Opening scan and baseline, 2 rounds.

- R1: repo/source/report/deployment scan.
- R2: source anchor map and current capability inventory.

Stage 2: Architecture joining, 3 rounds.

- R3: view mode and workspace state contract.
- R4: Workflow Pro shell route and tab integration.
- R5: runtimeLite bridge decision and no-clone boundary.

Stage 3: Future-facing contract design, 3 rounds.

- R6: `nexus.workflow.v1` schema draft.
- R7: Workflow Brain boot prompt and context pack.
- R8: compiler/file node contract with no-op compiler default.

Stage 4: Implementation, 8 rounds.

- R9: add `workflow-pro` view mode and sanitizer support.
- R10: add top-left Workflow Pro tab and surface skeleton.
- R11: build Workflow Pro design shell and mode switcher.
- R12: add Brain panel and contract inspector.
- R13: add Evidence Timeline view based on concept 5.
- R14: add Proposal Diff view based on concept 6.
- R15: add File Node UI and compiler slot model.
- R16: bridge Workflow Pro contract import/export to runtimeLite without breaking current graph.

Stage 5: Backend and persistence alignment, 3 rounds.

- R17: artifact policy and generated media history hardening.
- R18: file node raw/compiled artifact persistence plan or route.
- R19: Supabase RLS/storage review and migration plan if a new table or bucket becomes necessary.

Stage 6: Professional documentation, 2 rounds.

- R20: human guide and diagrams.
- R21: LLM guide, file map, machine manifest, boot prompt examples.

Stage 7: Convergence and cleanup, 2 rounds.

- R22: remove duplication, tighten file boundaries, verify no old documents conflict.
- R23: source/doc/report consistency sweep.

Stage 8: Real testing and landing, 3 rounds.

- R24: typecheck/lint/focused tests.
- R25: browser verification across Panels, Graph, Workflow Pro.
- R26: Vercel preview deployment and smoke verification.

Landing rounds if tests pass: 2 rounds.

- R27: commit and push.
- R28: final Vercel preview/prod decision, LINE report, audio, completion report.

If tests fail, pause the landing rounds and add 3-6 diagnosis rounds. Re-estimate after the first failed gate, not after repeated retries.

## Page 08 - Vercel And Supabase Boundary

Vercel boundary:

- Use preview deployments for non-main validation.
- Pull or run env-aware builds when production-like behavior matters.
- Keep deployment verification as a gate, not an afterthought.
- Do not promote or deploy to production until local tests and preview smoke pass.

Supabase boundary:

- Existing migrations already cover workflow templates, workspace state, sync queue, artifacts, observability, and RLS hardening.
- Any new public/exposed table must have RLS enabled and policies designed around actual ownership.
- Storage objects need explicit policies; upsert requires more than insert-only permission.
- Service role stays server-side only.
- Generated media can continue through artifact records first; a storage bucket is only needed if we move from data URLs/provider URLs to durable binary storage.

The near-term implementation should first use existing artifact service and workspace state. New Supabase schema is a later gate only if current artifact/state records cannot represent the new Workflow Pro facts.

## Page 09 - Workflow Brain Contract

The Workflow Brain should be able to understand the workflow before execution. It should not be a post-run summarizer only.

The boot context should include:

- App identity and product constraints.
- Current workflow JSON.
- Capability inventory.
- Node definitions.
- Edge semantics.
- Compiler registry and missing compilers.
- Runtime evidence if present.
- Artifact policies.
- Known missing features.
- Allowed proposal actions.

The brain can then answer:

- What is this workflow trying to accomplish?
- Is the order correct?
- Which nodes are serial, parallel, conditional, or fallback?
- Which prompts are weak?
- Which model settings are mismatched to the task?
- Which files need compiler support?
- Which missing features should Codex build next?
- Can the workflow be simplified?
- Can a better workflow JSON be generated?

This is why `capabilityInventory.notAvailableYet` is as important as `availableNodeTypes`. A smart model needs to know the real walls of the system.

## Page 10 - File Node And Compiler Layer

The file node should carry files through the workflow with the text packet, not as a side-channel that the LLM cannot reason about.

First version:

- `input.file` or `input.bundle` node.
- Raw artifact reference.
- Compiler metadata.
- No-op compiler default.
- Target capability list: chat, image, video, audio, tool, data-analysis.
- Attachment packet travels with ContextPacket metadata.

Future compiler slots:

- `zip.extract-text-index`
- `pdf.extract-text-pages`
- `image.vision-caption`
- `audio.transcribe`
- `video.shot-list`
- `csv.profile`
- `docx.extract-structure`
- `figma.manifest`
- `codebase.index`

No-op compiler is not wasted work. It creates the plug-in shape before transformation exists.

## Page 11 - Testing Strategy

Required tests when implementation begins:

- Typecheck for type expansion.
- Focused unit tests for workflow contract validator.
- Existing graph tests to ensure Graph MVP still works.
- Store tests for `viewMode: "workflow-pro"`.
- Workspace kernel tests for import/export/sanitize.
- Runtime adapter tests for contract to runtimeLite conversion.
- Artifact tests if persistence behavior changes.
- Browser smoke for three tabs: Panels, Graph, Workflow Pro.
- Browser smoke for dark visual tone and no layout overlap.
- Vercel preview smoke before any production decision.

Test gates should be honest. If a test is not run, the report must say so.

## Page 12 - Risk Register

Risk 1: `nexus-graph.tsx` grows too large.  
Control: new `workflow-pro` folder and contract libraries.

Risk 2: Workflow Pro becomes a visual duplicate of Graph.  
Control: Graph remains execution view; Workflow Pro becomes design, brain, evidence, proposal, files, settings cockpit.

Risk 3: Brain LLM hallucinates unavailable features.  
Control: explicit capability inventory and missing capability list.

Risk 4: Generated media history splits into a second store.  
Control: continue through artifact vault unless a binary storage gate is approved.

Risk 5: Supabase schema churn creates migration debt.  
Control: use existing tables first; add migrations only after route and RLS design are clear.

Risk 6: Visual direction drifts into colorful concept art.  
Control: copy information architecture only; keep current NEXUS palette.

## Page 13 - Start Criteria For Engineering

Engineering can start when these are true:

- The user approves the 23+5 round budget.
- The user accepts that the first implementation is Workflow Pro foundation, not full brain autonomy.
- Reports, audio, and iCloud copies exist.
- Product source changes are made on the current working branch with dirty report files preserved.
- The implementation starts with type and view-mode foundation before complex UI.

The first engineering command should be:

Start Stage 2/R3-R5: add `workflow-pro` view mode, route to a skeleton Workflow Pro surface, keep Graph unchanged, and add tests for mode persistence and snapshot sanitization.

## Page 14 - Completion Definition

This planning stage is complete when:

- A 10+ page launch report exists.
- A machine manifest exists.
- The report is reachable from localhost.
- The audio briefing is generated and mirrored to iCloud.
- A LINE Keep report is sent with remaining round estimate.
- No product source files were modified during this planning-only stage.

After this stage, the project is ready for implementation. The correct next signal from the user is: start engineering implementation.

