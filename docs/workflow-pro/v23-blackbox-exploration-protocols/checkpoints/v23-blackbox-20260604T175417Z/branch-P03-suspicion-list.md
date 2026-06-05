# Branch P03: Runtime, Durable Output, And Generated Media Suspicion List

## Status

- Branch ID: P03-suspicion
- Protocol: P03
- Secret handling: checked; no raw tokens, cookies, provider keys, prompt bodies, snapshots, or media payloads are stored.
- Basis: E-P03-001 through E-P03-004 plus P02/P05 blocker and provider evidence.

## 12 Falsifiable Suspicions

| ID | Layer | Suspicion | Evidence Needed | Probe | User Impact If True |
|---|---|---|---|---|---|
| S-P03-LONG-001 | long-running workflow | UI may not distinguish queued, running, generating, saving, and stalled states even though API traces can record success. | Computer Use screen evidence of node state transitions during a run. | After auth repair, run a small Workflow Pro group and capture active/completed node labels. | User cannot tell whether to wait, retry, or inspect failure. |
| S-P03-LONG-002 | long-running workflow | Heartbeat exists for agent streams but not for Runtime Lite graph node execution. | Runtime event stream or UI progress heartbeat while a graph run is in progress. | Run a multi-node graph and inspect progress events/logs. | Slow provider calls look frozen. |
| S-P03-LONG-003 | long-running workflow | Paused/interrupted runs may share status names with failed runs and confuse recovery. | Trace with `failed_interrupted` and UI display copy. | Abort a safe local run and inspect sanitized trace/UI state. | User may rerun unnecessarily or lose partial output. |
| S-P03-LONG-004 | long-running workflow | Parallel/fan-out branches may be represented as sequential in UI despite runtime group metadata. | Per-node start/completion times and branch UI ordering. | Run benchmark C after auth repair and compare node timestamps. | Users misread branch progress and cost timing. |
| S-P03-DURABLE-001 | durable output | Runtime trace can reference an artifact ID whose artifact route later returns 404/403. | Trace event plus artifact GET/asset GET after reload. | Create mixed valid/missing artifact trace and verify generated history behavior. | Completed run has broken output link. |
| S-P03-DURABLE-002 | durable output | Group record can be durable while run trace is missing, making inspector report incomplete. | Group record event without matching trace report. | Write group only and inspect durable group/run correlation report. | A workflow appears imported/applied but never run. |
| S-P03-DURABLE-003 | durable output | Trace event can exist while output content is intentionally redacted, leaving only artifact refs. | Inspector explains sanitized trace versus missing text. | Inspect run evidence report for artifact-only ContextPacket. | User may think output was lost. |
| S-P03-DURABLE-004 | durable output | Local browser run history may hide backend write failures until reload. | Pre-reload local run entry versus post-reload backend recovery. | UI run, reload, compare generated history and trace correlation. | False confidence from local-only history. |
| S-P03-MEDIA-001 | generated media | Provider image success can precede artifact DB creation, leaving durable bytes but no history row. | Image storage success plus missing generated-image artifact record. | Simulate artifact POST failure after storage upload. | Downloadable bytes exist but history is empty. |
| S-P03-MEDIA-002 | generated media | Artifact record can exist with memory-only `/api/image-gen/assets` URL that expires. | Artifact metadata durable=false or no storage path. | Generate without workspace, save record if allowed, wait/cache clear, then download. | History item becomes undownloadable. |
| S-P03-MEDIA-003 | generated media | Runtime trace may store artifactVaultRecordId but generated history derives a different transient id. | Trace/output packet ID and history item ID comparison. | Run image workflow and compare trace, artifact vault, generated history. | Clicking history opens wrong or stale asset. |
| S-P03-MEDIA-004 | generated media | Large image branches may create many successful artifacts but UI history pagination only shows a subset without clear cursor affordance. | Count of artifacts versus visible generated history count. | Seed or run controlled multi-artifact workspace; inspect pagination. | Users think some generated media disappeared. |

## Collision Map

| ID | Collision | Current State |
|---|---|---|
| C-P03-001 | node UI says success before durable write | Not-yet-verified in UI; scan/test says backend stream completion should persist before complete. |
| C-P03-002 | trace event exists but output content missing | Possible by design because trace route stores sanitized artifact refs, not raw packets. Needs UI explanation proof. |
| C-P03-003 | generated preview exists but artifact retrieval fails | Partially mitigated by E-P05-004, not UI-verified. |
| C-P03-004 | workflow group exists but run history cannot join it | API probe joined group and trace by shared IDs, but UI inspector not verified. |
| C-P03-005 | provider response succeeded but storage materialization failed | E-P05-002 shows memory fallback; E-P05-004 shows durable path when workspace/token present. |
| C-P03-006 | browser local history hides missing backend record | Not-yet-verified; requires reload/recovery Computer Use proof. |

## Next Probes

1. P0: repair C-P02-001 so the UI account path can reach the same workspace authority used by APIs.
2. P1: run one visible Workflow Pro graph and record active node, completed node count, generated output id, trace id, and artifact id.
3. P1: reload and verify generated history/artifact download survives without relying on current browser memory.
4. P2: seed or run a controlled branch-load workspace and inspect generated history pagination.
