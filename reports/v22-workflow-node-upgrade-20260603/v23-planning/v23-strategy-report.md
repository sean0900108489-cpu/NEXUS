# V23 Strategy Report: Canonical Workflow JSON + Workflow Brain

## Starting Point

NEXUS is currently strong enough to justify a real workflow contract layer.

V22 gave the graph workspace practical runtime controls:

- Input-specific start.
- Abort-backed pause.
- Start All.
- Drag/click node creation.
- LLM reasoning controls.
- Generated artifact history.

The corrected V23 direction is not "add a brain that watches telemetry."

The real direction is:

> Build a canonical workflow design contract that the brain reads before a run,
> understands deeply, validates, critiques, and can rewrite into an optimized
> workflow.

## Current System Truth

### Workspace Snapshot

The existing export/import format is a recovery and portability snapshot.

It should remain the full workspace backup:

- agents
- panels
- settings
- graph nodes/edges
- runtimeLite
- notebooks and drafts

Do not turn this into the workflow brain format.

### Backend Cloud State

The backend stores cloud snapshots and projection rows. This is good for sync,
recovery, permission checks, and partial state access.

Do not overload the projection rows with design-brain semantics too early.

### RuntimeLite

`Workflow Runtime Lite` is the execution substrate. It should keep owning:

- executable nodes
- edges
- runs
- node execution state
- context packets

RuntimeLite should consume canonical workflow contracts through a bridge. It
should not become the canonical design language itself.

## Pain Points To Solve

1. The current export is too broad for a brain to reason cleanly about workflow
   design.
2. RuntimeLite is too execution-focused to explain intent, rationale,
   capability limits, and upgrade needs.
3. The graph UI exposes controls, but not enough semantic guidance.
4. Future LLMs can hallucinate unavailable node types or model capabilities.
5. Backend state can preserve data, but not yet distinguish draft workflow,
   published workflow, optimized proposal, and runtime run.
6. Without validation, "one-click import" becomes dangerous.
7. Without diff/proposal artifacts, brain-generated upgrades cannot be reviewed.
8. Without capability inventory, the brain cannot know what NEXUS can and cannot
   do today.
9. Without schema versioning, old workflows become migration hazards.
10. Without a storage strategy, reports, manifests, runtime state, and workspace
    snapshots will blur together.

## Value To Create

The upgrade should create four kinds of value:

### 1. Design Value

Sean can describe a desired automation and receive a structured workflow plan,
not just a chat answer.

### 2. Engineering Value

Codex can implement future nodes, compilers, and graph behaviors from explicit
`missingCapabilities[]` instead of vague product requests.

### 3. Product Value

NEXUS becomes a workflow design cockpit: each node has purpose, limits,
settings, history, and validation state.

### 4. Runtime Value

The executor can stay conservative while the design layer grows. This avoids
breaking current v22 behavior.

## Core Logic Chain

1. A user or LLM produces `nexus.workflow.v1`.
2. The contract validator checks schema, ids, handles, node types, model
   capabilities, compiler availability, artifact policy, and security boundary.
3. The graph UI renders the contract as an editable workflow.
4. A bridge materializes the validated contract into runtimeLite state.
5. RuntimeLite executes and records runs/context packets/artifacts.
6. The brain reads the original contract plus runtime evidence.
7. The brain emits:
   - analysis
   - optimized workflow JSON
   - diff summary
   - missing capabilities
   - suggested Codex upgrade tasks
8. A human reviews and applies or rejects the proposal.

## Research Inputs And Fit Decisions

- LangGraph persistence influenced the run-evidence model: checkpoints,
  super-steps, replay, and pending writes are useful concepts for later runtime
  history. It should not replace `runtimeLite` in V23.
- n8n data-flow structure influenced the packet envelope idea: JSON payloads and
  binary payloads should remain distinct. NEXUS should not clone n8n's workflow
  format.
- React Flow node/handle APIs reinforce that canvas nodes should have stable
  UI identity and explicit input/output handles. NEXUS should add semantic
  validation above the UI layer.
- Supabase JSONB/RLS guidance supports storing variable contract documents in
  `jsonb` later, but only alongside relational ownership/version metadata.
- Vercel Workflows can become future durable execution infrastructure for
  long-running media pipelines. It is not the first V23 move.
- AgentSPEX, Agentproof, and GraphFlow support the direction of explicit specs,
  static verification, and workflow graph primitives.

## Required V1 Fields

Minimum useful `nexus.workflow.v1`:

- `schema`
- `workflow.id`
- `workflow.name`
- `workflow.version`
- `workflow.intent`
- `workflow.successCriteria`
- `capabilityInventory.availableNodeTypes`
- `capabilityInventory.availableCompilers`
- `capabilityInventory.availableArtifactPolicies`
- `capabilityInventory.notAvailableYet`
- `nodes[].id`
- `nodes[].type`
- `nodes[].label`
- `nodes[].purpose`
- `nodes[].rationale`
- `nodes[].config`
- `nodes[].io.inputs`
- `nodes[].io.outputs`
- `nodes[].limits`
- `edges[].id`
- `edges[].source`
- `edges[].sourceHandle`
- `edges[].target`
- `edges[].targetHandle`
- `edges[].mode`
- `edges[].reason`
- `edges[].packetContract`
- `execution.startNodes`
- `execution.order`
- `execution.parallelGroups`
- `artifactPolicy`
- `brainContract.mustUnderstand`
- `brainContract.canPropose`
- `brainContract.outputFormat`

## Defer From V1

Do not start with these unless implementation later proves they are necessary:

- Full arbitrary loops.
- Custom code execution nodes.
- Public workflow marketplace.
- Multi-user real-time workflow editing.
- Automatic brain apply without human review.
- Database migrations for every possible workflow object.
- Full Temporal/Vercel Workflow runtime replacement.
- Complex cost billing.
- Visual diff engine beyond simple JSON/graph diff.

## Graph UI Re-Design Forecast

The current graph should evolve into four coordinated areas:

### 1. Canvas

The canvas should show topology and state, not every setting.

Recommended overlays:

- validation status
- missing capability warning
- run status
- artifact output indicator
- brain proposal indicator

### 2. Node Inspector

Clicking a node should open an inspector with:

- purpose
- rationale
- config
- input/output contract
- model settings
- compiler layer
- artifact policy
- limits
- run history

### 3. Capability Palette

The add-node toolbar should become schema-driven:

- current available nodes
- planned but unavailable nodes
- disabled reasons
- capability docs

### 4. Brain Panel

The brain panel should not be a chat box only.

It should show:

- workflow summary
- topology explanation
- warnings
- optimization proposal
- missing capabilities
- "generate improved workflow JSON"
- "compare with current workflow"

## Backend Persistence Strategy

Keep:

- `workspace_snapshots` for full recovery.
- `workspace_state_entities` for projections.
- `artifacts` for generated outputs.

Add later, after the contract is validated locally:

- workflow contract entity or table
- workflow version metadata
- workflow proposal artifact
- workflow validation result
- workflow publish snapshot

Recommended first backend shape:

```text
workflow_contracts
  id
  workspace_id
  owner_user_id
  name
  schema_version
  status draft|published|archived
  contract_json jsonb
  validation_json jsonb
  checksum
  created_at
  updated_at

workflow_contract_versions
  id
  workflow_contract_id
  version
  contract_json jsonb
  validation_json jsonb
  checksum
  created_at
```

Do not add this in the planning-only phase.

## Expected Wall Hits

### Wall 1: JSON Schema Gets Too Large

Risk:

- The first schema tries to encode all future features.

Response:

- Define a strict V1 and a `notAvailableYet[]` section.

### Wall 2: RuntimeLite And Contract Fight For Ownership

Risk:

- Runtime nodes and canonical nodes diverge.

Response:

- Use explicit adapters: `to-runtime-lite` and `from-runtime-lite`.

### Wall 3: Brain Hallucinates Unavailable Capabilities

Risk:

- It proposes condition/video/compiler nodes before they exist.

Response:

- Make `capabilityInventory` required.
- Validate proposals against inventory.

### Wall 4: Graph UI Becomes Too Busy

Risk:

- Every schema field appears on the canvas.

Response:

- Canvas shows topology; inspector shows detail.

### Wall 5: Backend Migration Too Early

Risk:

- The database commits to a bad schema before product learning.

Response:

- Start local-first with fixtures and validators.
- Persist only after sample workflows pass.

### Wall 6: Report / Source Pollution

Risk:

- Planning artifacts scatter across source folders.

Response:

- Keep all planning files under:
  `reports/v22-workflow-node-upgrade-20260603/v23-planning/`

## File Storage Plan

Planning artifacts:

```text
reports/v22-workflow-node-upgrade-20260603/v23-planning/
```

Future implementation:

```text
src/lib/workflow-contract/
src/components/nexus/workflow-contract/
src/store/...
src/app/api/v1/workflows/...
supabase/migrations/...
```

Testing:

```text
src/lib/workflow-contract/__tests__/
src/components/nexus/...test.tsx
src/store/nexus-store.test.ts
```

Sample workflows:

```text
src/lib/workflow-contract/fixtures/
```

## Recommended Next Implementation Order

1. Add workflow contract types and fixtures.
2. Add validator.
3. Add capability inventory.
4. Add runtimeLite export bridge.
5. Add runtimeLite import/materialization bridge.
6. Add Export Workflow JSON.
7. Add Import Workflow JSON with validation preview.
8. Add brain proposal JSON format.
9. Add Graph UI validation overlay.
10. Add backend persistence only after local schema stabilizes.

## High-ROI Instructions Not Explicitly Requested But Important

- Add a static graph verification pass before import.
- Add a simple visual diff between current contract and brain proposal.
- Add a "not available yet" disabled node palette so the brain and user see
  future capability boundaries.
- Add fixtures for at least five workflows:
  - text to LLM to output
  - text to image artifact
  - LLM prompt enhancer to image artifact
  - invalid missing node type
  - invalid edge handle
- Add a migration story before adding DB tables.
- Add a compatibility story for old workspace exports.
- Add schema changelog in the report.
- Add a prompt budget/cost estimate placeholder, even if not implemented.

## Recommendation

V23 should be a contract-first upgrade.

Do not start by making the graph prettier. Do not start by adding backend
tables. Do not start by making the brain autonomous.

Start by making a workflow JSON that is:

- human readable
- LLM readable
- validator friendly
- runtime materializable
- graph renderable
- versionable
- honest about missing capabilities
