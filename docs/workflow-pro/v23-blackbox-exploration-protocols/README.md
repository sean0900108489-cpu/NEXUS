# V23 Blackbox Exploration Protocols

## Purpose

This folder contains six black-box, multi-command technical protocols for
Workflow Pro / NEXUS exploration, risk mapping, and checkpointed debugging.

These protocols are designed for agents that must discover the project state
from the repository and safe live surfaces. They must not depend on prior chat
history, previously observed failures, or hidden context.

## Black-Box Rules

- Do not tell the executing agent what the current suspected issue is.
- Do not mention previous findings, prior scan results, or known weak files.
- Require the agent to discover architecture, routes, storage, state owners, and
  runtime behavior from first principles.
- Allow configured provider tests when credentials are already available, but
  never print, persist, or copy secret values.
- When a provider-backed behavior is being verified, do not replace the real
  provider with mock/dry-run evidence unless the run is explicitly blocked and
  the blocked reason is recorded.
- Route every task through [Protocol Router](protocol-router.md) before choosing
  a protocol.
- Prefer checkpointed exploration over one-shot final reports.
- Create the active checkpoint before exploration begins. Do not wait until the
  end of a phase.
- Read the active checkpoint before every new phase or branch, then append the
  new evidence, inference, contradiction, and next probe.
- Append one machine-readable event to `events.ndjson` for each meaningful
  checkpoint, evidence, inference, contradiction, live evidence, verdict, and
  final report update.
- Apply [Live Evidence Mandatory Gate](live-evidence-gate.md) before claiming a
  user-visible behavior works.
- For visible Workflow Pro behavior, direct Computer Use screen evidence is the
  default required proof. Browser/API/static evidence can support it, but cannot
  replace it for a final usability verdict unless the report marks the verdict
  as blocked or not yet verified.
- Every report must separate evidence, inference, contradiction, and unknowns.

## Active Checkpoint Rule

Every protocol run must start by creating a checkpoint workspace:

```txt
docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>/
```

Required files:

- `00-active-checkpoint.md`: the living checkpoint that every phase reads first.
- `events.ndjson`: one JSON line per important evidence/inference/update event.
- `branch-<id>.md`: detailed branch notes when a branch becomes large.
- `final-report.md`: the final synthesis, written only after checkpoints exist.

Execution order:

1. Create `00-active-checkpoint.md` before running the first scan.
2. Write initial scope, assumptions, tool availability, and planned first probe.
3. Append the first `checkpoint.created` event to `events.ndjson`.
4. Before each phase, read `00-active-checkpoint.md`.
5. Append a `checkpoint.read` event, then a `phase.started` event.
6. During each phase, append evidence immediately when it changes the risk map.
7. At phase end, append contradictions, open questions, and the next command.
8. Final report may summarize checkpoints, but must not replace them.
9. Run the checkpoint validator before treating the run as complete.

Machine-readable event schema:

- [events.schema.json](events.schema.json)

Validator:

```bash
node scripts/validate-blackbox-checkpoint.mjs docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>
```

## Protocol Set

| Rank | Protocol | Primary Focus | Best Used When |
|---:|---|---|---|
| 1 | [System Terrain Risk Compass](01-system-terrain-risk-compass.md) | Whole-project reconnaissance and risk map | Starting a fresh audit with no assumptions |
| 2 | [Permission Artifact Authority Labyrinth](02-permission-artifact-authority-labyrinth.md) | Identity, workspace, route, artifact, storage authority | Validating account-specific and resource-specific behavior |
| 3 | [Runtime Heartbeat Durable Ledger](03-runtime-heartbeat-durable-ledger.md) | Long-task progress, trace, durable outputs | Proving that slow workflows are alive and recoverable |
| 4 | [Surgical Modularization State Cartography](04-surgical-modularization-state-cartography.md) | Large-file extraction and state ownership | Before refactoring frontend/store surfaces |
| 5 | [Multimodal Provider Storage Load Probe](05-multimodal-provider-storage-load-probe.md) | LLM/image/audio/vision provider bridge, storage, load | Before adding multimodal or many-branch workflows |
| 6 | [Deployment Account Parity Recovery Drill](06-deployment-account-parity-recovery-drill.md) | Local/preview/production parity and recovery | Before release or external account testing |

Shared checkpoint template:

- [Checkpoint Template](checkpoint-template.md)
- [Protocol Router](protocol-router.md)
- [Live Evidence Gate](live-evidence-gate.md)
- [Event Schema](events.schema.json)

## Recommended Execution Order

1. Run Protocol 01 to build the neutral terrain map.
2. Run Protocol 02 if any route, artifact, account, workspace, or provider access
   behavior matters.
3. Run Protocol 03 before judging long workflows as broken.
4. Run Protocol 04 before any modularization work.
5. Run Protocol 05 before image/audio/vision or high branch-count workflows.
6. Run Protocol 06 before release, preview sharing, or external account testing.

## Final Black-Box Command

```txt
Read /Users/sean/Documents/FreeChat/docs/workflow-pro/v23-blackbox-exploration-protocols/README.md.

Use protocol-router.md to select the primary and secondary protocols. Do not
rely on prior chat history or previously observed findings. Start with
first-principles exploration. Create an active checkpoint before the first scan,
append checkpoint.created to events.ndjson, read the active checkpoint before
each phase, append checkpoint.read and phase.started events, append updates
during the work, and separate evidence, inference, contradiction, and unknowns.

Use available tools when useful: local shell, Browser, Chrome, Computer Use,
Supabase, GitHub, and Vercel. Real provider/API tests may run when credentials
are configured, but do not print, persist, or copy secret values.
Do not downgrade provider-backed verification to mock-only or dry-run-only when
configured credentials are available and the task requires real behavior.

Before claiming any user-visible behavior works, satisfy live-evidence-gate.md
or mark the verdict as blocked/not-yet-verified. Before completion, run:

node scripts/validate-blackbox-checkpoint.mjs docs/workflow-pro/v23-blackbox-exploration-protocols/checkpoints/<run-id>
```
