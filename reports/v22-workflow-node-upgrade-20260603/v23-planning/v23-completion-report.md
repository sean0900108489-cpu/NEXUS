# V23 Planning Completion Report

## 1. Completion Status

This planning package is complete as a planning artifact.

It does not implement the V23 product runtime yet. It upgrades the planning
quality so the next engineering loop can start from a precise architecture
instead of a fuzzy idea.

Primary readable entry:

`v23-planning-report.html`

This HTML report is now structured as a 30-page planning document, with one
clear idea per page and a convergence path in the final five pages.

## 2. What Was Wrong With The Previous Version

The previous V23 Planning Forecast had the right direction but compressed too
much signal into too few sections.

The missing pieces were:

- A clear separation of workspace snapshot, canonical workflow contract, and
  runtime execution state.
- A concrete definition of what the Workflow Brain reads and writes.
- A field-by-field explanation of why `nexus.workflow.v1` exists.
- A safety model for validators, capability inventory, missing capabilities,
  and human review.
- A stronger bridge between graph UI, backend persistence, artifact history,
  and runtimeLite.
- A smoother landing from strategy into the first engineering command.

The 30-page report fixes those gaps by walking from current-state truth to the
first source package to build.

## 3. Core Decision

V23 should not begin by adding a generic "brain monitor."

The correct first architecture move is:

> Build `nexus.workflow.v1` as the canonical workflow design contract.

This contract becomes the language that connects:

- human planning
- LLM workflow design
- graph rendering
- validation
- runtimeLite materialization
- backend persistence
- artifact history
- Workflow Brain proposals

## 4. Architecture Boundary

Three layers must remain separate.

### Workspace Snapshot

Purpose:

- Full recovery and portability.
- Includes workspace UI state, agents, panels, settings, graph state,
  runtimeLite, notebooks, and drafts.

Decision:

- Keep it.
- Do not turn it into the brain contract.

### Canonical Workflow Contract

Purpose:

- Brain-readable design language.
- Describes intent, topology, node purpose, edge packet contracts, capability
  limits, compiler layers, artifact policy, validation targets, and proposal
  output.

Decision:

- Add `nexus.workflow.v1`.
- Store and version it separately later.

### RuntimeLite

Purpose:

- Execute nodes, edges, runs, signals, packets, and artifacts.

Decision:

- Keep it execution-focused.
- Let it consume validated contracts through `to-runtime-lite`.

## 5. 30-Page Report Structure

The new report is structured as:

1. Starting point.
2. Why the previous report felt unclear.
3. V22 baseline.
4. Correct Workflow Brain definition.
5. Design principles.
6. Snapshot / Contract / Runtime separation.
7. `nexus.workflow.v1` target.
8. Core schema.
9. Node definition.
10. Edge and packet contract.
11. Execution topology.
12. Capability inventory.
13. Compiler layer.
14. Graph UI redesign.
15. Import/export lifecycle.
16. Backend persistence.
17. Generated artifact history.
18. RuntimeLite bridge.
19. Brain Context Pack.
20. Brain Proposal.
21. Validator ladder.
22. Security and permissions.
23. Run evidence.
24. Media model nodes.
25. Control brain and if/else.
26. External research fit.
27. Future file map.
28. Engineering implementation rounds.
29. Risks and stop/go criteria.
30. Smooth convergence into the first engineering package.

## 6. First Engineering Entry

The next engineering loop should begin with:

```text
src/lib/workflow-contract/
  types.ts
  schema.ts
  validator.ts
  capability-inventory.ts
  packet-contract.ts
  from-runtime-lite.ts
  to-runtime-lite.ts
  brain-context-pack.ts
  brain-proposal.ts
  fixtures/
  __tests__/
```

The first command should not touch backend migrations or autonomous brain
application.

First engineering goal:

> Make a valid `nexus.workflow.v1` parse, validate, and materialize into a
> minimal runtimeLite workflow.

## 7. Implementation Rounds Estimate

After approval, expect 6-9 high-ROI engineering rounds.

Recommended order:

1. Contract types, schema, fixtures, tests.
2. Validator ladder.
3. Capability inventory.
4. Runtime bridge.
5. Import/export UI preview.
6. Node inspector and validation overlays.
7. Brain context pack and proposal schema.
8. Backend persistence.
9. End-to-end verification.

## 8. Non-Goals For The First Engineering Pass

Do not start with:

- Full backend migration.
- Public workflow marketplace.
- Arbitrary code execution nodes.
- Full durable runtime replacement.
- Automatic brain apply.
- Complex billing or cost accounting.
- Full loop engine.
- Multi-user real-time editing.

Those are future capabilities and should appear in `missingCapabilities[]` or
`notAvailableYet[]`, not in the first executable workflow contract.

## 9. Verification Expectations For The Next Loop

The first implementation loop should pass:

- TypeScript typecheck.
- Focused unit tests for schema and validator.
- Fixture tests for valid/invalid workflows.
- Runtime bridge snapshot tests.
- Browser smoke for import/validation preview if UI is touched.
- No secrets in client bundle.
- No backend migration unless the contract is already stable.

## 10. Final Completion Statement

The planning phase is now strong enough to begin engineering.

The report no longer stops at "we need a workflow brain." It now defines:

- what the brain reads
- what the brain writes
- what the contract contains
- how graph UI should expose it
- how runtime should consume it
- how backend should persist it later
- how validators prevent unsafe imports
- how generated artifacts connect to the workflow
- how the plan converges into the first source package
- how 10 ranked smart UI concepts can visualize workflow design, brain
  analysis, logic graphs, evidence, proposals, and ask-brain interaction
- how `NEXUS Brain Boot Prompt v1` can keep different LLM sessions aligned
  even when memory/model identity changes

## 11. UI Concept Appendix

The report now includes a bottom appendix:

`v23-planning-report.html#ui-concepts`

It contains 10 ranked interface directions:

1. Mission Control Quad Pane.
2. Logic Twin View.
3. Contract Inspector Studio.
4. Brain Briefing Room.
5. Evidence Timeline Cockpit.
6. Proposal Diff War Room.
7. Capability Palette Lab.
8. Prompt / Context Forge.
9. Media Artifact Observatory.
10. Compact Command Deck.

Each direction includes:

- score
- layout explanation
- why it fits NEXUS
- implementation fit
- img2-ready prompt
- a generated img2 concept image embedded below the layout introduction

The highest ROI candidate is **Mission Control Quad Pane**, because it keeps the
workflow canvas, brain summary, evidence, and ask-brain composer visible without
forcing the user to switch contexts.

Generated images are stored in:

`assets/v23-ui-concepts/`

The metadata index is:

`assets/v23-ui-concepts/index.metadata.json`

Planning stage: complete.

Next stage: build the V23 workflow contract core.
