# Protocol Router

Use this router before selecting a black-box protocol. The router prevents an
agent from choosing the easiest document instead of the protocol chain that the
task actually needs.

## Router Output

Every run must write a routing decision into
`00-active-checkpoint.md` before the first scan:

```json
{
  "schema": "nexus.workflowPro.blackbox.router.v1",
  "taskSummary": "",
  "primaryProtocol": "01",
  "secondaryProtocols": [],
  "mandatoryLiveEvidence": false,
  "mandatoryComputerUseEvidence": false,
  "mandatoryRealProviderEvidence": false,
  "reason": "",
  "blockedProtocols": [],
  "checkpointRunId": ""
}
```

## Decision Rules

Start with the first matching rule, then add secondary protocols for any
cross-cutting concern.

| Signal In Task | Primary Protocol | Secondary Protocols |
|---|---|---|
| Unknown system state, broad audit, unclear start | `01` | Add any protocol discovered as relevant |
| Auth, account role, workspace, route authority, artifact access | `02` | `06` when preview/production/account parity matters |
| Slow workflow, long generation, progress, run history, durable output | `03` | `02` when permission affects persistence |
| Large file pressure, state owner, refactor, extraction plan | `04` | `03` when runtime state is involved |
| LLM/image/audio/vision/provider/storage/load/branch count | `05` | `03` for runtime, `02` for credential or storage authority |
| Local/preview/production, Vercel, Supabase account parity, release readiness | `06` | `02` for authority, `03` for runtime evidence |

## Required Chains

Use these chains when the task spans several risk surfaces:

- New feature can affect accounts or generated files: `01 -> 02 -> 03`.
- Workflow Pro runtime or graph generation: `01 -> 03 -> 05`.
- Multimodal provider work: `01 -> 05 -> 03 -> 02`.
- Release or new-account validation: `01 -> 06 -> 02`.
- Modularization before feature work: `01 -> 04`, then rerun the affected
  specialist protocol.

## Live Evidence Routing

Set `mandatoryLiveEvidence: true` when the task asks whether something works,
can be clicked, can be generated, can be downloaded, can be used by an account,
or can survive reload/deployment.

Set `mandatoryComputerUseEvidence: true` when the task asks whether a visible UI
workflow works, when a user must click/type/drag/import/export/download, or when
the final claim would otherwise depend on seeing the app behave on screen.

Set `mandatoryRealProviderEvidence: true` when the task asks whether an LLM,
image, audio, vision, artifact-generation, or provider-backed workflow actually
works and configured provider credentials are available.

If mandatory live evidence is true, the final verdict must satisfy
[Live Evidence Gate](live-evidence-gate.md), or it must clearly say `blocked`
and list the missing prerequisite.

## Router Completion Gate

Routing is complete only when:

- A primary protocol is named.
- Secondary protocols are named or explicitly rejected.
- The reason does not rely on prior chat history.
- The checkpoint run id is created.
- The live evidence requirement is decided before the first scan.
- The Computer Use evidence requirement is decided before the first scan.
- The real provider evidence requirement is decided before the first scan.
