# V23 Self Review Q&A

## Round 1

Question:

If `nexus.workflow.v1` becomes the workflow brain's source of truth, how do we
avoid breaking the existing workspace snapshot export?

Answer:

Do not replace the workspace snapshot. The snapshot remains the full recovery
artifact for UI state, agents, panels, settings, runtimeLite, notebooks, and
drafts. `nexus.workflow.v1` should be a smaller design contract that can be
embedded inside the snapshot or stored beside it. The bridge decides how a
validated contract materializes into runtimeLite. This separation keeps current
sync stable while allowing the brain to reason over a clean design language.

## Round 2

Question:

How can the workflow brain design new workflows without hallucinating unavailable
nodes, compilers, models, or artifact behaviors?

Answer:

The contract must include a capability inventory. The brain receives available
node types, available compilers, available model adapters, artifact policies,
and `notAvailableYet[]`. The validator rejects unknown executable features
unless they appear as proposed missing capabilities. The UI should show planned
but unavailable nodes as disabled capabilities with reasons. The brain can then
recommend upgrades without pretending they already exist.

## Round 3

Question:

If the graph becomes a nervous system for a workflow brain, what exactly should
travel through it?

Answer:

Three packet classes should stay distinct:

1. Design packets: intent, purpose, rationale, edge reasons, IO contracts,
   success criteria, and capability limits.
2. Runtime packets: current node state, run id, super-step or execution order,
   logs, errors, and produced context packets.
3. Artifact packets: generated files, thumbnails, metadata, download URLs,
   storage ids, and model settings used.

The brain should read a merged context pack, not mutate runtime directly. Its
write output should be a proposal: optimized workflow JSON, diff summary,
missing capabilities, risks, and suggested Codex tasks.

