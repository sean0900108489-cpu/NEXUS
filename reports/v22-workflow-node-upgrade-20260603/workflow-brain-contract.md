# Workflow Brain Contract Amendment

## Corrected Goal

The workflow brain is not primarily a late-stage telemetry monitor.

It should be a design-time and runtime-aware workflow intelligence layer that
can read one canonical JSON file, understand what the whole workflow is doing,
explain the topology, respect current platform capabilities, suggest
optimizations, and generate a revised workflow JSON that Codex can implement or
import.

## What The Project Stores Today

### 1. Left-Top Export / Import

The current Export action downloads a workspace snapshot as
`nexus-ai-ops-*.json`.

Relevant files:

- `src/components/nexus/nexus-ops.tsx`
- `src/store/nexus-store.ts`
- `src/lib/workspace-kernel.ts`

Shape:

```json
{
  "schemaVersion": 1,
  "exportedAt": "iso-date",
  "workspace": {
    "agents": [],
    "panels": [],
    "settings": {},
    "graph": {
      "nodes": [],
      "edges": [],
      "runtimeLite": {}
    }
  },
  "notebooks": [],
  "notebookDrafts": [],
  "deletedNotebooks": []
}
```

This is a workspace recovery and portability format. It is useful, but it is
not yet a clean workflow design contract.

### 2. Backend Workspace State

The backend state route stores a cloud snapshot envelope.

Relevant files:

- `src/app/api/v1/workspaces/[workspaceId]/state/route.ts`
- `src/lib/backend/workspace/workspace-state-service.ts`
- `src/lib/backend/workspace/workspace-snapshot-serializer.ts`
- `src/lib/backend/workspace/workspace-state-entity-repository.ts`

The backend stores the snapshot and also projects it into entity rows such as:

- `graph`
- `settings`
- `theme`
- `agent`
- `memory`
- `tool_state`
- `branch`

This is good for sync, recovery, permission checks, and partial reads. It still
does not encode workflow intent, rationale, capability limits, or optimization
contracts.

### 3. RuntimeLite Graph

`Workflow Runtime Lite` currently stores executable graph state:

- `nodes`
- `edges`
- `runs`
- `ContextPacket`
- `NodeExecution`
- `WorkflowRun`

Current runtime node types:

- `input.text`
- `model.llm`
- `model.image`
- `output.text`

This layer is the execution substrate. It knows how to run a graph, validate
handles, reject cycles, start from one input subgraph, merge multiple upstream
packets, and record run output. It does not yet contain the full semantic
vocabulary needed by the brain.

## Gap

Today, NEXUS has:

- A workspace snapshot format.
- A backend cloud snapshot format.
- A runtime graph format.

What it still needs is:

- A canonical workflow design JSON format.
- A validator for that format.
- Import/export bridges between canonical workflow JSON and current workspace
  graph/runtimeLite state.
- A brain-readable capability inventory.
- A brain output format for optimized workflows and missing feature proposals.

## Canonical Workflow JSON V1

This is the target contract that should eventually become the one-click import,
export, brain-read, and brain-rewrite format.

```json
{
  "schema": "nexus.workflow.v1",
  "workflow": {
    "id": "fashion-board-y2k-v1",
    "name": "Y2K Fashion Board Generator",
    "version": "1.0.0",
    "domain": "fashion-content-generation",
    "intent": "Turn a human fashion brief into a generated 16:9 clothing board.",
    "successCriteria": [
      "Generate one downloadable image artifact",
      "Use standard quality and 16:9 aspect ratio",
      "Preserve prompt rationale for future optimization"
    ]
  },
  "capabilityInventory": {
    "availableNodeTypes": [
      "input.text",
      "model.llm",
      "model.image",
      "output.text"
    ],
    "availableCompilers": [
      {
        "id": "compiler.noop",
        "accepts": ["text/plain", "image/*", "video/*", "application/json"],
        "emits": ["ContextPacket"],
        "limits": ["No transformation; only wraps input as context"]
      }
    ],
    "availableArtifactPolicies": ["persist", "download", "history"],
    "notAvailableYet": [
      "condition.ifElse",
      "model.video",
      "parallel.fanOut",
      "brain.rewrite.apply",
      "workflow.schema.validator"
    ]
  },
  "nodes": [
    {
      "id": "input_brief",
      "type": "input.text",
      "label": "Fashion Brief",
      "purpose": "Collect the operator's fashion prompt.",
      "rationale": "This is the source of truth for the workflow run.",
      "compiler": {
        "id": "compiler.noop",
        "mode": "noop"
      },
      "config": {
        "text": "Y2K 的潮流寬褲，16:9 standard"
      },
      "io": {
        "outputs": [{ "handle": "output", "packet": "ContextPacket.text" }]
      }
    },
    {
      "id": "image_y2k_board",
      "type": "model.image",
      "label": "Y2K Image Generator",
      "purpose": "Generate a fashion image artifact from the prompt.",
      "rationale": "The output is visual, so this node should use the image model rather than an LLM.",
      "config": {
        "modelId": "gpt-image-2",
        "quality": "standard",
        "aspectRatio": "16:9",
        "prompt": "Create a Y2K fashion board focused on trendy wide-leg pants."
      },
      "artifactPolicy": {
        "persist": true,
        "downloadable": true,
        "historyScope": "workspace"
      },
      "limits": [
        "Depends on configured image API key",
        "Cannot perform video generation yet"
      ]
    }
  ],
  "edges": [
    {
      "id": "edge_brief_to_image",
      "source": "input_brief",
      "sourceHandle": "output",
      "target": "image_y2k_board",
      "targetHandle": "input",
      "mode": "always",
      "reason": "The image model needs the original fashion brief.",
      "packetContract": {
        "input": "ContextPacket.text",
        "output": "ContextPacket.imageArtifact"
      }
    }
  ],
  "execution": {
    "startNodes": ["input_brief"],
    "order": ["input_brief", "image_y2k_board"],
    "parallelGroups": [],
    "unsupportedSemantics": []
  },
  "brainContract": {
    "readBeforeRun": true,
    "mustUnderstand": [
      "intent",
      "nodes",
      "edges",
      "execution.order",
      "capabilityInventory",
      "limits",
      "rationale"
    ],
    "canPropose": [
      "prompt rewrite",
      "node insertion",
      "node deletion",
      "model setting changes",
      "missing feature requirements"
    ],
    "outputFormat": {
      "analysis": "markdown",
      "optimizedWorkflow": "nexus.workflow.v1",
      "missingCapabilities": "array"
    }
  }
}
```

## Brain Responsibilities

The brain should be able to do all of this from the JSON alone:

- Understand the workflow's goal before any run starts.
- Explain the exact order, dependencies, serial paths, and parallel paths.
- Understand why each node exists.
- Understand what every edge transfers.
- Know what each node can and cannot do.
- Know which features exist in the platform today.
- Know which desired workflow ideas are impossible today.
- Propose a better workflow without hallucinating unavailable features.
- Emit a new full workflow JSON ready for validation/import.
- Emit missing capability requests that Codex can turn into upgrade tasks.

## Proposed Implementation Path

1. Add `src/lib/workflow-contract/` with:
   - `types.ts`
   - `schema.ts`
   - `validator.ts`
   - `from-runtime-lite.ts`
   - `to-runtime-lite.ts`
   - `capability-inventory.ts`

2. Add UI export choices:
   - Export Workspace Snapshot
   - Export Workflow JSON
   - Import Workflow JSON

3. Add backend storage support:
   - Keep workspace snapshot unchanged for recovery.
   - Add a separate `workflow_contract` entity type or table for canonical
     workflow JSON.
   - Store validator result and checksum.

4. Add brain proposal format:

```json
{
  "schema": "nexus.workflow.brainProposal.v1",
  "sourceWorkflowId": "string",
  "summary": "string",
  "optimizedWorkflow": {},
  "changes": [],
  "missingCapabilities": [
    {
      "id": "condition.ifElse",
      "whyNeeded": "Route image prompts differently from text-only prompts.",
      "suggestedCodexTask": "Implement a condition node with boolean expression validation."
    }
  ]
}
```

## Design Decision

Do not replace the current workspace export.

Keep it as the full recovery snapshot. Add the canonical workflow JSON beside it
as a deliberate workflow design/import/export layer. The brain should read the
canonical workflow first, then optionally use runtime telemetry after execution
to improve future proposals.
