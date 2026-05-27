# NEXUS POST-V10 ARCHITECTURE SCAN

## 1. Current System Status

- Scope: read-only lightweight architecture scan of the current V0-V10 foundation.
- One artifact created: this Markdown report.
- No TypeScript, TSX, migration, schema, or API implementation files were modified.
- The current system is a Next.js App Router workspace centered on `NexusOps`.
- V0-V10 is now acting as a layered backend foundation, not a single monolith.
- V1 provides workspace membership, permission decisions, audit records, and secret boundaries.
- V2 provides typed API envelopes, request validation, idempotency, and client helpers.
- V3 provides bounded cloud workspace snapshots and projection entities.
- V4 provides the durable sync queue and local IndexedDB queue bridge.
- V5 appears represented by deployment checks and feature flags.
- V6 provides runtime sessions, agent tasks, and runtime events.
- V7 provides tool run records, permission gates, registry validation, and confirmation flow.
- V8 provides artifact assets, artifact versions, and artifact references.
- V9 provides system events, usage metrics, trace views, and redaction.
- V10 adds message history paging, archive projection, and bounded relational memory records.
- The current architecture is schema-first and registry-first.
- The UI remains panel/workstation-first, with a graph mode backed by React Flow.
- No Vector DB, semantic search lifecycle, or second sync queue was found in the scanned V10 layer.
- Historical messages and artifacts are intended to be fetched through paged adapters, not cloud snapshots.
- Important nuance: local active UI state still contains active agent `messages` and `memory` blocks.
- Cloud snapshots reduce messages to bounded refs, but local IndexedDB persistence still needs cap verification.

## 2. Files Scanned

- `AGENTS.md` - repo-level instruction boundary and Next.js warning.
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` - App Router route handler convention.
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` - route context and params convention.
- `node_modules/next/dist/docs/01-app/02-guides/data-security.md` - data access and security guidance.
- `src/lib/nexus-types.ts` - core frontend/backend contracts and V10 history types.
- `src/lib/nexus-registry.ts` - model, capability, graph node, tool, and memory profile registries.
- `src/lib/supabase/database.types.ts` - Supabase table contracts and schema mirror.
- `src/store/nexus-store.ts` - Zustand active state, IndexedDB persistence, zundo history, sync ports.
- `src/lib/state-sync.ts` - active snapshot sync, message/artifact sync, Supabase/local queue bridge.
- `src/lib/workspace-kernel.ts` - workspace sanitize/import/export behavior.
- `src/lib/backend/workspace/workspace-snapshot-serializer.ts` - cloud snapshot serialization and message refs.
- `src/lib/backend/workspace/workspace-snapshot-validator.ts` - snapshot validation, registry checks, payload rejection.
- `src/lib/backend/workspace/workspace-state-service.ts` - cloud workspace state save/read and projection rebuild.
- `src/lib/backend/workspace/workspace-permission.ts` - workspace permission service factory and local fallback.
- `src/lib/backend/history/history-constants.ts` - history limits, active window limits, memory size cap.
- `src/lib/backend/history/storage-partition-service.ts` - signed cursor and active window policy normalization.
- `src/lib/backend/history/message-history-service.ts` - message paging, archive, memory list, permission checks.
- `src/lib/backend/history/message-repository.ts` - in-memory and Supabase message history repositories.
- `src/lib/backend/history/agent-memory-record-repository.ts` - memory record list/insert, size cap, secret boundary.
- `src/lib/backend/history/historical-data-fetcher.ts` - frontend historical message paging adapter.
- `src/app/api/v1/agents/[agentId]/messages/route.ts` - V10 paged message route.
- `src/app/api/v1/agents/[agentId]/messages/archive/route.ts` - V10 message archive route.
- `src/app/api/v1/agents/[agentId]/memory/route.ts` - V10 memory record read route.
- `src/lib/api/nexus-api-client.ts` - typed API client and V2 envelope handling.
- `src/lib/backend/api/api-handler.ts` - V2 route handler, envelope, idempotency, observability hook.
- `src/lib/backend/contracts/api-envelope.ts` - API success/failure envelope contract.
- `src/lib/backend/security/permission-service.ts` - V1 permission and audit decision service.
- `src/lib/backend/security/secret-boundary-service.ts` - secret scan, redaction, audit metadata sanitation.
- `src/lib/sync/local-sync-queue-adapter.ts` - IndexedDB local durable queue adapter.
- `src/lib/backend/sync/sync-queue-service.ts` - V4 backend sync operation service.
- `src/lib/backend/sync/sync-operation-applier.ts` - server-side operation applier boundary.
- `src/lib/backend/runtime/agent-runtime-service.ts` - V6 runtime session and task lifecycle.
- `src/app/api/v1/agents/[agentId]/tasks/route.ts` - task create API route.
- `src/lib/backend/tools/tool-execution-service.ts` - V7 tool execution lifecycle.
- `src/lib/backend/tools/tool-permission-gate.ts` - tool permission and confirmation gate.
- `src/lib/backend/tools/tool-registry-validator.ts` - registry-backed tool resolution.
- `src/app/api/v1/tools/[toolId]/run/route.ts` - tool run API route.
- `src/app/api/v1/tool-runs/[toolRunId]/confirm/route.ts` - tool run confirmation route.
- `src/app/api/v1/tool-runs/[toolRunId]/cancel/route.ts` - tool run cancellation route.
- `src/lib/backend/artifacts/artifact-service.ts` - V8 artifact create/list/version/archive service.
- `src/lib/backend/artifacts/artifact-repository.ts` - artifact and artifact reference persistence.
- `src/lib/backend/artifacts/artifact-materializer.ts` - artifact materialization, size, hash, secret checks.
- `src/lib/backend/artifacts/artifact-reference-resolver.ts` - artifact reference creation and cascade policy.
- `src/app/api/v1/artifacts/[artifactId]/archive/route.ts` - artifact archive route.
- `src/lib/backend/observability/events.ts` - V9 event emitter boundary.
- `src/lib/backend/observability/observability-service.ts` - system event and metric service.
- `src/lib/backend/observability/redaction-pipeline.ts` - observability metadata redaction and truncation.
- `src/components/nexus/nexus-ops.tsx` - main shell, workstations, chat, sidebars, overlays, settings.
- `src/components/nexus/nexus-graph.tsx` - React Flow graph/canvas mode.
- `src/components/nexus/DatapadWindow.tsx` - draggable global datapad window.
- `src/components/nexus/PromptVaultManager.tsx` - prompt vault overlay.
- `src/components/nexus/AgentBranchModal.tsx` - branch modal overlay.
- `src/app/page.tsx` - top-level render entry to `NexusOps`.
- `supabase/migrations/20260527000000_security_boundary_rls_foundation.sql` - V1 RLS and membership foundation.
- `supabase/migrations/20260527002000_workspace_cloud_state.sql` - V3 workspace snapshot tables.
- `supabase/migrations/20260527003000_durable_sync_queue.sql` - V4 sync operations table.
- `supabase/migrations/20260527005000_agent_runtime_sessions.sql` - V6 runtime session/task tables.
- `supabase/migrations/20260527006000_tool_execution_control_plane.sql` - V7 tool run tables.
- `supabase/migrations/20260527007000_artifact_asset_layer.sql` - V8 artifact/reference tables.
- `supabase/migrations/20260527008000_observability_event_spine.sql` - V9 event/metric tables.
- `supabase/migrations/20260527009000_historical_data_paging.sql` - V10 message history and memory records.

## 3. Core Architecture Boundaries

- Schema-first contracts:
  `nexus-types.ts` exports shared domain types for agents, messages, sync, runtime, tools, artifacts, history, and observability.
- Supabase mirror:
  `database.types.ts` mirrors the V1-V10 tables, enums, and insert types.
- Registry-first extension:
  `nexus-registry.ts` is the canonical slot map for models, capabilities, graph nodes, tool slots, executors, and memory compression profiles.
- Zustand active UI state:
  `nexus-store.ts` keeps workspace layout, selected/focused agents, panels, view mode, stream status, local artifact cache, prompt/notebook caches, and runtime UI state.
- IndexedDB local persistence:
  Zustand persistence uses `idb-keyval` under `nexus-ai-ops/workspace-state`, with legacy localStorage as fallback.
- zundo temporal history:
  temporal state is limited to workspace/layout/selection/view signatures, with a 50-state history limit.
- Supabase durable backend state:
  cloud workspace snapshots, sync operations, runtime tasks, tool runs, artifacts, events, messages, and memory records are durable backend domains.
- Sync queue:
  the V4 local queue is `nexus-local-sync-queue-v4`; payloads are size checked and scanned for secrets.
- Runtime tasks:
  V6 agent tasks and runtime sessions own durable task status, stream events, and usage metric handoff.
- Tool runs:
  V7 tool runs own risk level, input/output redaction, confirmation, status, and optional artifact linkage.
- Artifacts:
  V8 artifact records own materialized content, versions, content hashes, and reference records.
- Observability:
  V9 system events and usage metrics receive events from API, permission, sync, runtime, tool, artifact, and history layers.
- Historical paging:
  V10 message pages use a signed cursor service, bounded page sizes, archive projection, and an external frontend fetcher.
- Memory records:
  V10 `agent_memory_records` are bounded relational records, not vector stores or semantic search documents.
- Boundary to protect:
  cloud workspace snapshots must not contain full transcripts, artifact binaries, agent tasks, tool runs, or sync queue records.
- Needs verification:
  local IndexedDB workspace persistence still appears to retain active `agent.messages` and `agent.memory` inside `workspaces`.

## 4. Post-V10 Message & Memory Flow

- Active messages remain in frontend agent state during live interaction.
- `handleSend` creates a user message and streaming assistant message, then appends them to the active agent.
- Chat streaming sends only a recent active slice to the runtime request: `.slice(-16)`.
- Non-streaming messages are queued through `supabaseStateSyncManager.insertMessage`.
- `finishMessage` queues the finalized assistant message after streaming completion.
- Active chat composer and streaming status remain immediate UI concerns in `AgentWindow`.
- Historical messages load separately through `fetchHistoricalMessages(agentId)`.
- The frontend history cache key is `workspaceId::agentId`.
- History fetches are debounced and stored in `historicalMessages`, not merged into `agent.messages`.
- The UI renders `historicalPage.items` plus current `agent.messages` after filtering duplicate active message ids.
- Zustand persist `partialize` does not include `historicalMessages`.
- Zustand migration resets `historicalMessages` to `{}`.
- Cloud workspace snapshots serialize agent messages as `messageWindow.messageRefs`, capped by `WORKSPACE_SNAPSHOT_MESSAGE_REF_LIMIT = 8`.
- The message ref contains id, role, createdAt, content length, and media summary, not full content.
- Backend historical pages come from `GET /api/v1/agents/[agentId]/messages`.
- Page limit clamps to default 50 and max 100.
- Cursor tokens are HMAC-signed and scoped to workspace, agent, direction, id, createdAt, and expiry.
- Archive is a projection update: `is_active_window = false` and `archived_at` is set.
- Archive does not delete message rows.
- Migration comments explicitly say archive must not delete task links, tool run links, or artifact references.
- Active window policy clamps to default 80 and max 250.
- Backend archive keeps the latest active messages and archives older active messages.
- Memory records are read from `GET /api/v1/agents/[agentId]/memory`.
- Memory record type is one of `active`, `compressed`, `archived`, or `context_note`.
- Memory record repository enforces a 32 KB content cap and `SecretBoundaryService.assertNoSecrets`.
- Memory record list defaults to 50 records and can filter by type.
- Active agent memory blocks still live in `agent.memory`.
- Cloud snapshots currently include agent `memory` in `WorkspaceCloudSnapshotAgent`.
- Data that should not enter full Zustand/IndexedDB root state:
  unbounded historical message pages, full artifact content, binary media, full sync queues, tool run output payloads, and observability raw content.
- Needs verification:
  active `agent.messages` and `agent.memory` need an explicit local cap or archive policy to avoid unbounded local hydration over long sessions.

## 5. Integration Map

- Permission:
  V10 history uses `MessageHistoryService.assertPermission`, backed by `createWorkspaceStatePermissionService` and V1 `PermissionService`.
- Permission:
  V6 task routes and V8 artifact routes also use `apiHandler.permission` with workspace/artifact resource types.
- Permission:
  V7 tool execution uses `ToolPermissionGate`, which calls the same V1 permission service.
- Secret boundary:
  memory records reject secrets before insert.
- Secret boundary:
  sync queue, tool execution, artifact materialization, idempotency replay, and observability all redact or reject secret-bearing payloads.
- API handler / typed client:
  V10 message and memory routes use `apiHandler`, and the frontend `HistoricalDataFetcher` uses `nexusApiClient`.
- API envelope:
  V2 success/failure envelopes provide `ok`, `data`, `error`, and `meta` with request/trace ids.
- Idempotency:
  archive, task create, tool run, tool confirm/cancel, artifact create/archive, and sync operations use mutation idempotency.
- Sync queue:
  active snapshots and messages enqueue through the existing V4 local queue; no second queue was found.
- Sync queue:
  server `SyncQueueService` stores operations, checks payload hash, checks secrets, and may inline apply supported domains.
- Runtime task:
  chat send creates a V6 `chat` task before streaming.
- Runtime task:
  runtime service records stream start, first token, completion, failure, fallback, and usage metrics.
- Tool run:
  V7 tool runs validate registry slots, gate permission, redact input/output, and require confirmation for high risk tools.
- Artifact reference:
  V8 artifacts can point to source message, source agent, source task, and source tool run.
- Artifact reference:
  artifact references can link artifacts to messages, notebooks, prompts, macros, agent memory, and tool runs.
- Observability event:
  API, permission, sync, runtime, tool, artifact, workspace state, and history emit best-effort V9 events.
- Observability event:
  redaction pipeline scrubs raw content keys and truncates metadata over 16 KB.

## 6. UI / Z-Axis / Layout Rules

- Main shell:
  `NexusOps` owns the full viewport, top bar, left agent dock, center workspace, right intel sidebar, and overlays.
- Top bar:
  fixed height header at the top of the shell; workspace menu dropdown uses `z-[90]`.
- Left sidebar:
  collapsible agent bay width is 44 px collapsed or 266 px expanded.
- Right intel/sidebar:
  collapsible ops matrix width is 44 px collapsed or 306 px expanded and uses `z-[80]`.
- Center workspace:
  `nexus-workspace` is `relative z-0 isolate`, and is the primary surface for panel windows, graph mode, and datapads.
- Chat panels / agent workstations:
  each `AgentWindow` is an absolute `Rnd` child bounded to the workspace.
- Agent z-order:
  agent windows use `style={{ zIndex: agent.layout.zIndex }}` and focus updates the active window ordering.
- Agent toolbar:
  per-agent action toolbar uses internal `z-40`; prompt vault/intel popovers use internal `z-30`.
- Minimized rail:
  minimized agents appear at the bottom of the workspace with `z-[50]`.
- Global datapads:
  datapad windows are draggable `Rnd` windows bounded to the workspace and use `z-[95]`.
- Prompt vault manager:
  full overlay uses `z-[120]`.
- Settings sidebar:
  fixed right overlay uses `z-[120]`, above workspace and sidebars.
- Macro composer:
  modal overlay uses `z-[140]`.
- Command palette:
  global command overlay uses `z-[999]`.
- Agent branch modal:
  branch interface uses `z-[9999]`, currently the top priority overlay.
- React Flow / canvas area:
  graph mode replaces panel rendering inside the center workspace using `NexusGraph`.
- React Flow:
  nodes are agent-backed, draggable, connectable, and persist positions through `updateGraphNodePosition`.
- Future Infinite Canvas / tldraw rule:
  preserve the center workspace as the primary canvas plane.
- Future Infinite Canvas / tldraw rule:
  do not break the left dock, right intel sidebar, top bar, settings overlay, datapad layer, or branch modal priority.
- Future Infinite Canvas / tldraw rule:
  keep chat composer and live agent streaming responsive even when graph/canvas mode is active.
- Future Infinite Canvas / tldraw rule:
  do not move full historical pages into agent messages or workspace snapshot state.

## 7. Stable Extension Sockets

- `NEXUS_MODEL_CATALOG` for model additions.
- `CAPABILITY_REGISTRY` for agent capability sockets.
- `GRAPH_NODE_REGISTRY` for future visual workflow node types.
- `TOOL_SLOT_REGISTRY` for tool slot additions.
- `TOOL_EXECUTOR_REGISTRY` and `toolExecutors` aliases for executor wiring.
- `MEMORY_COMPRESSION_PROFILE_REGISTRY` for branch/memory compression profiles.
- `AgentTaskType` for runtime task types such as chat, memory compression, tool chain, handoff, and branch.
- `SyncEntityType` for queue-backed entity domains.
- `ArtifactStatus`, `CreateArtifactRequest`, and artifact reference types for asset expansion.
- `ArtifactReferenceResolver.getCascadePolicy()` for reference retention semantics.
- `HistoricalDataFetcher` for historical message and future artifact paging.
- `MessageHistoryService` for backend-controlled paging/archive/memory reads.
- `AgentMemoryRecordRepository` for bounded memory record insertion/listing.
- `WorkspaceSnapshotSerializer` for active UI cloud snapshot boundaries.
- `ObservabilityService.emit` and `recordUsageMetric` for event and metrics expansion.
- `AgentWindow` for per-agent workstation controls.
- `SandboxCanvas` for code/preview workstation expansion.
- `NexusGraph` for graph/canvas mode.
- `DatapadWindow` for global note surfaces.
- `LeftDock`, `RightIntel`, and `AgentSettingsSidebar` for panel/sidebar slots.

## 8. Risks / Needs Verification

- Needs verification: cursor tokens are signed, but the body is base64url JSON, not encrypted; if strict opacity means non-decodable, this is not fully opaque.
- Needs verification: Supabase message paging applies `created_at < cursor.createdAt` but does not apply the `id` tie-breaker used by the in-memory repository.
- Needs verification: active window is backend-controlled during archive, but newly inserted messages default to active and automatic active-window enforcement was not found.
- Needs verification: message sync operations are queued through V4, but the scanned V4 applier only applies workspace snapshots inline; message operation application to `messages` was not found.
- Needs verification: memory records have repository insert logic, size cap, and secret boundary, but the scanned API surface exposes only `GET` for memory records.
- Needs verification: active `agent.messages` remain in Zustand workspaces and are included in local IndexedDB persistence.
- Needs verification: active `agent.memory` remains in Zustand workspaces and cloud active snapshots include `memory`.
- Needs verification: local sync queue can temporarily contain message payloads until flushed; this is the existing V4 queue, not a new queue.
- Needs verification: artifact archive sets status to `archived`; references appear retained, but archived artifact resolution should be checked after archive.
- Needs verification: tool run `artifactId` is nullable and materialization can be unavailable; V7-to-V8 tool output artifact materialization path should be verified before relying on it.
- Needs verification: local permission fallback grants owner-like access to `local-owner`; production behavior depends on Supabase memberships and RLS.
- Needs verification: historical artifacts fetcher is still an empty stub, while historical message fetcher is implemented.
- Needs verification: observability pages use cursor by createdAt only; acceptable for events, but duplicate timestamp behavior may need a stable tie-breaker.
- Needs verification: workspace import/export snapshots still include full active messages via `createWorkspaceSnapshot`, separate from cloud snapshot serializer.

## 9. Recommended Next-Step Prompt

```text
You are extending NEXUS // AI OPS after V10. First read NEXUS_POST_V10_ARCHITECTURE_SCAN.md, then inspect the relevant registry and UI files before coding. Implement the next feature as an additive extension socket, for example Infinite Canvas / tldraw inside the center workspace, while preserving V1-V10 boundaries: no Vector DB, no semantic search lifecycle, no second sync queue, no full historical messages/memory/artifacts in Zustand or IndexedDB root state, and no rewrite of the backend foundation. If an integration point is unclear, mark it Needs verification before implementing.
```
