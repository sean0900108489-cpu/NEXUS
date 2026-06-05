# Workflow Pro LLM / Codex Blueprint

## Mission

Implement a third workspace mode:

```ts
type WorkspaceViewMode = "panels" | "graph" | "workflow-pro";
```

The mode renders a new `WorkflowProSurface`, not `NexusGraph`.

## Non-Goals For First Engineering Loop

- Do not replace `NexusGraph`.
- Do not migrate backend tables yet.
- Do not auto-apply Workflow Brain proposals.
- Do not implement real zip extraction yet.
- Do not create a second artifact system.

## Existing Anchors

- Workspace mode type: `src/lib/nexus-types.ts`
- Store setter: `src/store/nexus-store.ts`
- Main UI shell: `src/components/nexus/nexus-ops.tsx`
- Graph reference only: `src/components/nexus/nexus-graph.tsx`
- Runtime definitions: `src/lib/workflow-runtime-lite/registry.ts`
- Runtime state: `src/lib/workflow-runtime-lite/state.ts`
- Runtime executors: `src/lib/workflow-runtime-lite/executors.ts`
- Attachments: `src/lib/attachments/*`
- Artifacts backend: `src/lib/backend/artifacts/*`
- Artifacts API: `src/app/api/v1/artifacts/*`

## Required Architectural Split

```text
workspace mode
  panels
  graph
  workflow-pro

workflow pro internal view
  design
  brain
  evidence
  proposal-diff
  files
  settings
```

## Data Flow For File Node

```text
file selected
  -> artifact raw save
  -> file packet metadata
  -> compiler route
  -> compiled artifact or reference
  -> ContextPacket.attachments[]
  -> downstream LLM/image/video node
```

## LLM Continuity Contract

Every Workflow Pro session should be able to generate a `WorkflowBrainContextPack`:

```ts
type WorkflowBrainContextPack = {
  workspaceSummary: string;
  workflowContract: NexusWorkflowV1;
  workflowProState: WorkflowProUiState;
  runtimeEvidence: WorkflowRunEvidence[];
  artifactHistory: ArtifactVaultRecord[];
  filePackets: WorkflowFilePacket[];
  capabilityInventory: WorkflowCapabilityInventory;
  unavailableCapabilities: MissingCapability[];
};
```

This pack is the handoff object for any LLM model.

## First Implementation Pass

1. Add mode type.
2. Add tab UI.
3. Add empty `WorkflowProSurface`.
4. Add internal view toggle shell.
5. Add planning-only file node card.
6. Add evidence/proposal toggle using concept 5/6 layout references.
7. Add tests that prove no existing graph/panels mode broke.

