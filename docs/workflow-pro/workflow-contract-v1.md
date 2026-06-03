# `nexus.workflow.v1` Contract

## Purpose

`nexus.workflow.v1` is the canonical workflow design contract. It is not the same as the workspace snapshot and not the same as Runtime Lite execution state.

```text
Workspace snapshot = recovery and portability.
Runtime Lite = executable run state.
nexus.workflow.v1 = brain-readable workflow design.
```

## Required Top-Level Fields

- `schema`: always `nexus.workflow.v1`
- `id`
- `name`
- `intent`
- `successCriteria`
- `capabilityInventory`
- `nodes`
- `edges`
- `outputs`
- `brain`
- `metadata`

## Node Requirements

Each node must say not only what it is, but why it exists.

Required node fields:

- `id`
- `type`
- `label`
- `purpose`
- `rationale`
- `position`
- `data`
- `limits`

Model nodes also need:

- provider
- modelId
- reasoning effort/detail where applicable
- quality/aspect ratio for image nodes
- artifact policy for generated media

File nodes also need:

- accepted MIME types
- raw artifact reference policy
- compiler id and mode
- compiled artifact reference policy

## Edge Requirements

Each edge must describe packet flow, not just visual connection.

Required edge fields:

- `id`
- `source`
- `sourceHandle`
- `target`
- `targetHandle`
- `mode`
- `reason`
- `packetContract`

Supported first-pass edge modes:

- `always`
- `fallback`
- `guard`
- `manual`

Reserved future modes:

- `if`
- `else`
- `parallel-join`
- `brain-decision`

## Brain Requirements

The `brain` block defines what the supervising model is allowed to do.

Recommended first-pass fields:

- `enabled`
- `readBeforeRun`
- `mustUnderstand`
- `runtimeEvidence`
- `canPropose`
- `outputFormat`

The brain should always see `capabilityInventory.notAvailableYet` so it can propose missing capabilities without hallucinating that they already exist.

