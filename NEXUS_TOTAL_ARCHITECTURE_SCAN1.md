# NEXUS Total Architecture Scan

Generated: 2026-05-28
Scope: first-pass project scan, generated scan vocabulary, second-pass cross scan, and final frontend/backend/function coupling map.

Latest rescan: 2026-05-28 in `/Users/sean/Documents/FreeChat`
Rescan method: read local Next.js 16 docs, scan existing architecture docs, run first-pass source inventory, merge the user's requirement terms with generated project scan terms, then run a second cross-scan across source, API routes, backend domains, migrations, and boundary keywords.

## 0. How This File Should Be Used

This is the iteration control map for NEXUS // AI OPS.

Before adding or changing any feature, read this file, then inspect the exact source-of-truth files named in the relevant section. If a slot, type, route, service, registry entry, table, or persistence boundary already exists, extend that existing slot. Do not create a parallel map, duplicate lifecycle, second queue, shadow store, or one-off route contract unless the existing container is proven insufficient and this document plus the local architecture docs are updated.

Repo rule reminder: `AGENTS.md` says this Next.js version has breaking changes. Before writing Next.js code, read the relevant guide under `node_modules/next/dist/docs/`. The current project uses Next `16.2.6`, React `19.2.6`, App Router, and Route Handlers under `src/app/api/**/route.ts`.

## 1. Requirement Vocabulary + Project Scan Vocabulary

User requirement words consolidated:

- front end: 前端, UI state, panel, graph, workspace, local state, store
- back end: 後端, API, service, repository, Supabase, RLS, route handler
- function layer: 功能端, feature, tool, agent runtime, artifact, sync, history
- architecture state: 架構, 資料, 定義, 規則, 對接, 交互, 耦合
- iteration safety: 迭代, 掃描, 狀況梳理, 不重複, 不污染, 不越權
- failure signals: 功能不對勁, 架構不清楚, 耦合不完整, Needs verification

Generated project scan terms used in the second pass:

- `src/lib/nexus-types.ts`
- `src/lib/nexus-registry.ts`
- `src/lib/supabase/database.types.ts`
- `src/store/nexus-store.ts`
- `src/components/nexus/nexus-ops.tsx`
- `apiHandler`
- `nexusApiClient`
- `IStateSyncManager`
- `IAsyncDataFetcher`
- `SupabaseStateSyncManager`
- `localSyncQueueAdapter`
- `SyncQueueService`
- `WorkspaceSnapshotSerializer`
- `PermissionService`
- `SecretBoundaryService`
- `AgentRuntimeService`
- `ToolExecutionService`
- `ArtifactService`
- `MessageHistoryService`
- `ObservabilityService`
- `DeploymentCheckService`
- `FeatureFlagService`
- `CAPABILITY_REGISTRY`
- `TOOL_SLOT_REGISTRY`
- `TOOL_EXECUTOR_REGISTRY`
- `NEXUS_MODEL_CATALOG`
- `HANDOFF_RULE_REGISTRY`
- `WorkflowRuntimeLite`
- `agentTemplateProfiles`
- `modelSettings`
- `executionPrompt`
- `profileLocked`
- `PROVIDER_REGISTRY`
- `GRAPH_NODE_REGISTRY`
- `MEMORY_COMPRESSION_PROFILE_REGISTRY`
- `WorkspaceCloudSnapshotPayload`
- `AgentStreamRequest`
- `SyncOperationRequest`
- `ApiEnvelope`
- `SecretBoundaryViolationError`
- `WORKSPACE_SNAPSHOT_MESSAGE_REF_LIMIT`
- `LOCAL_SYNC_QUEUE_MAX_PAYLOAD_BYTES`

Second-pass result summary:

- The project is explicitly schema-first, registry-first, local-first, and z-axis disciplined.
- Frontend active state still lives mainly in Zustand + IndexedDB, but historical/paged data has backend ports.
- Backend V0-V10 domains exist as separate bounded contexts.
- Most `/api/v1` mutation endpoints share `apiHandler`, envelope, idempotency, permission, and observability hooks.
- Legacy routes and streaming routes intentionally sit outside the normal JSON envelope.
- Current unresolved boundaries are already named as `Needs verification`; keep that status when evidence is incomplete.

## 2. Current Scan Evidence

Files counted in this rescan:

| Evidence | Count |
| --- | ---: |
| Relevant repo files scanned (`.ts`, `.tsx`, `.md`, `.sql`, config) | 225 |
| `src` files | 191 |
| `src/lib` TypeScript files | 137 |
| Backend domain files under `src/lib/backend` | 99 |
| `src/components` TSX files | 8 |
| App Router route handlers under `src/app/api/**/route.ts` | 40 |
| Vitest test files under `src` | 22 |
| Supabase migration files | 11 |

Local Next.js docs read before writing this documentation:

- `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md`

Route scan:

- Total route handlers: 40.
- Direct legacy/special routes: `/api/agent-stream`, `/api/image-gen`, `/api/memory-compress`, `/api/predictive-intel`, `/api/system-status`, `/api/tools/fs-scanner`, `/api/tools/web-surfer`, `/api/v1/agents/[agentId]/stream`, `/api/v1/providers/verify`.
- Governed `apiHandler` routes: workspace state, sync, runtime tasks, memory compression, history/memory, tools/tool-runs, artifacts, deployment checks, feature flags, health, public config, observability.
- Next.js route rule confirmed: `route.ts` handlers are public endpoints under `app`, use Web `Request`/`Response`, and cannot share the same route segment with `page.tsx`.

Registry scan:

| Registry/type | Current keys |
| --- | --- |
| `AgentCapabilityType` | `chat`, `image`, `video`, `sandbox`, `audio`, `search`, `data-analysis` |
| `WorkflowGraphNodeType` | `agent-node`, `input.text`, `model.llm`, `output.text`, `tool-node`, `memory-node`, `condition-node` |
| `WorkflowRuntimeNodeType` | `input.text`, `model.llm`, `output.text` |
| `RealToolExecutorType` | `local-fs`, `rest-api`, `db-query` |
| `SyncEntityType` | `workspace`, `agent`, `message`, `prompt`, `notebook`, `artifact_reference` |
| `AgentTaskType` | `chat`, `memory_compress`, `tool_chain`, `handoff`, `branch` |
| `PROVIDER_REGISTRY` | `deepseek`, `openai`, `openai-compatible`, `custom-openai-compatible`, `local-preview`, `local-sandbox` |
| `TOOL_SLOT_REGISTRY` | `real-image-gen`, `mock-image-gen`, `real-video-gen`, `real-file-scanner`, `web-surfer`, `real-db-query` |
| `TOOL_EXECUTOR_REGISTRY` | `local-fs`, `rest-api`, `db-query` |
| `MEMORY_COMPRESSION_PROFILE_REGISTRY` | `default-context-compressor` |

Hard limits and persistence gates found:

| Gate | Source | Limit/behavior |
| --- | --- | --- |
| Cloud active snapshot size | `workspace-snapshot-serializer.ts` | `512 * 1024` bytes |
| Cloud snapshot message refs | `workspace-snapshot-serializer.ts` | last `8` message refs per agent |
| Local sync queue payload | `local-sync-queue-adapter.ts` | `128 * 1024` bytes plus local secret scan |
| Artifact inline content | `artifact-constants.ts` | `64 * 1024` bytes |
| Artifact preview text | `artifact-constants.ts` | `2_000` chars |
| Agent memory record content | `history-constants.ts` | `32 * 1024` bytes plus secret boundary |
| Historical message page | `history-constants.ts` | default `50`, max `100` |
| Active history archive window | `history-constants.ts` | default `80`, max `250` |
| Observability metadata | `redaction-pipeline.ts` | `16 * 1024` bytes after scrub/redact |
| Runtime request message window | `nexus-ops.tsx` | sends recent `.slice(-16)` active messages |

## 3. One-Sentence Architecture

NEXUS is a local-first multi-agent workbench where `NexusWorkspace` and `NexusAgent` power immediate UI interaction, `nexus-registry.ts` owns extension sockets, `/api/v1` owns governed backend domains, and Supabase-backed services gradually receive durable snapshots, sync operations, runtime tasks, tool runs, artifacts, observability, and historical paging.

## 4. Source-of-Truth Map

| Concern | Source of truth | What it owns | Extension rule |
| --- | --- | --- | --- |
| Repo instruction | `AGENTS.md` | Next.js warning and scan-before-code boundary | Read relevant local Next docs before code changes. |
| Core domain contracts | `src/lib/nexus-types.ts` | Agents, workspace, graph, runtime, sync, tools, artifacts, history, observability, API payload types | Add shared fields here before passing them across frontend/backend. |
| Registry sockets | `src/lib/nexus-registry.ts` | Models, providers, capabilities, graph node slots, tool slots, executor groups, compression profiles, handoff registry | Extend the matching slot; do not create parallel registries. |
| DB mirror | `src/lib/supabase/database.types.ts` | Supabase table interfaces and generated-style row/insert types | If a DB column is added, add the corresponding optional frontend/domain property at the same time. |
| Default materialization | `src/lib/nexus-defaults.ts` | Default agents, templates, capabilities, graph nodes, workspace factory | Use factory helpers instead of hand-building agents/workspaces. |
| Active UI state | `src/store/nexus-store.ts` | Zustand workspaces, selection, panels, local caches, view mode, stream status, notebook windows, actions | Keep active interaction here; route durable/history data through sync/fetch ports. |
| Main frontend shell | `src/components/nexus/nexus-ops.tsx` | Top bar, left dock, workspace plane, agent windows, graph mode, settings, tools, streaming actions | Add UI by wiring store actions and existing contracts; preserve z-index lanes. |
| Graph UI | `src/components/nexus/nexus-graph.tsx` | React Flow graph, agent nodes, runtime-lite nodes/edges | Add node types only after schema + registry slots exist. |
| API contract | `src/lib/backend/api/api-handler.ts` | `/api/v1` envelope, validation, idempotency, permission, API event emission | New JSON `/api/v1` routes should use `apiHandler` unless streaming/special. |
| Typed API client | `src/lib/api/nexus-api-client.ts` | Envelope parsing, request/idempotency headers, client errors | Frontend should use this for `/api/v1` JSON APIs. |
| State sync boundary | `src/lib/state-sync.ts` | `IStateSyncManager` implementation, queueing active snapshots/messages/prompts/notebooks, artifact API bridge | Do not directly couple components to Supabase writes. |
| Durable local queue | `src/lib/sync/local-sync-queue-adapter.ts` | IndexedDB sync queue, payload cap, secret scan, flush to `/api/v1/sync/operations` | Do not add a second sync queue. |
| Backend domains | `src/lib/backend/**` | Security, API, workspace, sync, runtime, tools, artifacts, history, observability, deployment | Keep ownership inside domain service/repository boundaries. |

## 5. Frontend System

Frontend entry path:

```text
src/app/page.tsx
  -> src/components/nexus/nexus-ops.tsx
    -> useNexusStore from src/store/nexus-store.ts
    -> AgentWindow / NexusGraph / LeftDock / RightIntel / DatapadWindow / overlays
```

Frontend state rules:

- `useNexusStore` owns immediate workbench interaction: workspaces, active workspace id, selected agent, z-order, stream mode, view mode, local caches, notebooks, historical message cache, transaction history, and agent/window actions.
- Zustand persistence uses IndexedDB through `idb-keyval`, with localStorage only as fallback and legacy migration path.
- zundo temporal history is capped at 50 and partialized around workspace/layout/selection/view signatures.
- `historicalMessages` is explicitly not persisted; it is loaded through `HistoricalDataFetcher`.
- `prepareWorkspacesForLocalPersistence` now classifies active agent messages and memory with V15 `AgentLocalPersistenceMetadata` before local persistence. It currently preserves full active messages/memory with `omittedCount = 0` / `omittedBlockCount = 0` because durable message projection and memory writes remain `Needs verification`.

Primary UI surfaces:

- `NexusOps`: full application shell and orchestration.
- `AgentWindow`: per-agent chat/media/sandbox workstation.
- `NexusGraph`: React Flow visual graph and Workflow Runtime Lite surface.
- `LeftDock`: operators and agent template customization.
- `RightIntel`: workspace intelligence, artifacts, sync status, and agent controls.
- `AgentSettingsSidebar` / `ProviderVaultPanel`: provider credentials, model tuning, templates, theme controls.
- `DatapadWindow`: draggable notebook surface.
- `PromptVaultManager`, `AgentBranchModal`, `CommandPalette`, `MacroComposerModal`: overlay surfaces with fixed z-index expectations.

Z-axis boundaries:

- Workspace base is `z-0 isolate`.
- Minimized rail around `z-[50]`.
- Right intel rail around `z-[80]`.
- Datapad windows around `z-[95]`.
- Settings and prompt vault around `z-[120]`.
- Macro modal around `z-[140]`.
- Command palette around `z-[999]`.
- Agent branch modal around `z-[9999]`.

## 6. Backend System

Backend route model:

- Legacy routes under `src/app/api/*` return direct/plain JSON or streams.
- `/api/v1` routes are the governed API layer.
- Most `/api/v1` JSON routes use `apiHandler`, which standardizes request ids, trace ids, validation, idempotency, permission checks, JSON envelope, and API events.
- Streaming route `/api/v1/agents/[agentId]/stream` intentionally does not use normal JSON envelope because it returns stream events.
- Provider verification `/api/v1/providers/verify` is a special direct JSON probe.

Backend domain ownership:

| Version/domain | Main files | Owns |
| --- | --- | --- |
| V0 primitives/contracts | `src/lib/backend/primitives/*`, `src/lib/backend/contracts/*` | IDs, statuses, metadata, error namespaces, feature flags, idempotency contracts, redaction helpers, layering contract. |
| V1 security | `src/lib/backend/security/*`, `workspace-permission.ts` | Memberships, permission decisions, audit logs, local fallback, secret boundary. |
| V2 API | `src/lib/backend/api/*`, `src/lib/api/nexus-api-client.ts` | Envelope, route handler, request validation, idempotency, client helper. |
| V3 workspace state | `src/lib/backend/workspace/*` | Cloud workspace snapshots, snapshot serializer, validator, projections, hydration. |
| V4 sync | `src/lib/backend/sync/*`, `src/lib/sync/local-sync-queue-adapter.ts` | Local durable queue, backend sync operations, conflict handling, inline applier boundary. |
| V5 deployment | `src/lib/backend/deployment/*` | Environment validation, schema drift, registry consistency, feature flags, deployment checks, health. |
| V6 runtime | `src/lib/backend/runtime/*` | Runtime sessions, agent tasks, provider adapter, stream task lifecycle. |
| V7 tools | `src/lib/backend/tools/*`, `src/lib/tool-executors.ts` | Tool runs, permissions, registry validation, executor adapter, confirmation flow. |
| V8 artifacts | `src/lib/backend/artifacts/*` | Artifact records, references, versions, materialization, content hash/size/secret checks. |
| V9 observability | `src/lib/backend/observability/*` | System events, traces, usage metrics, metadata redaction, retention. |
| V10 history | `src/lib/backend/history/*` | Message paging, archive projection, active window policy, bounded memory records. |

## 7. Route Groups And Data Contracts

| Route group | Examples | Contract behavior |
| --- | --- | --- |
| Legacy stream/media/intel/tools | `/api/agent-stream`, `/api/image-gen`, `/api/memory-compress`, `/api/predictive-intel`, `/api/tools/fs-scanner`, `/api/tools/web-surfer` | Direct Route Handler behavior; some return mock fallback; not the canonical v1 envelope. |
| Health/config/deployment | `/api/v1/health`, `/api/v1/public-config`, `/api/v1/deployment/checks/*` | Deployment/runtime health, public config, preflight/deployment checks. |
| Workspace state | `/api/v1/workspaces/[workspaceId]/state` | GET/PUT cloud active snapshot with checksum and schema version. |
| Sync queue | `/api/v1/sync/operations`, retry/cancel/status | Durable operation intake and queue projection. |
| Agents/runtime | `/api/v1/agents/[agentId]/tasks`, task status/cancel, `/stream`, memory-compress | Runtime task lifecycle and streaming execution. |
| History/memory | `/api/v1/agents/[agentId]/messages`, archive, memory | Paged message reads, archive projection, memory record reads. |
| Tools | `/api/v1/tools/[toolId]/run`, `/api/v1/tool-runs/*` | Registry-backed tool runs, permission gate, idempotency, confirmation/cancel/status. |
| Artifacts | `/api/v1/artifacts`, by-id, archive, references, versions | Artifact create/list/get/version/archive/reference APIs. |
| Observability | `/api/v1/observability/events`, metrics, traces | Event list, metric aggregation, trace view. |
| Provider verification | `/api/v1/providers/verify` | Live provider connectivity probe; special JSON response. |

## 8. Core Interaction Flows

### 8.1 App Boot / Hydration

```text
NexusOps mounts
  -> useNexusStore rehydrates IndexedDB/localStorage state
  -> materializeDefaultWorkspace()
  -> normalizeWorkspaces() + syncPanels()
  -> queueWorkspaceCloudSync()
  -> prompts/notebooks refresh through SupabaseStateSyncManager
```

Important definition chain:

- `createDefaultWorkspace` and default templates come from `nexus-defaults.ts`.
- `NexusWorkspace`, `NexusAgent`, and all nested shapes come from `nexus-types.ts`.
- Model/provider settings normalize through `normalizeAgentModelSettings` in `nexus-registry.ts`.

### 8.2 Chat Streaming

```text
AgentWindow submit
  -> NexusOps.handleSend()
  -> POST /api/v1/agents/[agentId]/tasks
  -> AgentRuntimeService.createTask()
  -> add user + streaming assistant messages to Zustand
  -> POST /api/v1/agents/[agentId]/stream
  -> createAgentStreamResponse()
  -> AgentRuntimeService.prepareStreamTask()
  -> OpenAICompatibleAdapter.createChatStream()
  -> provider stream or mock fallback
  -> stream tokens/reasoning back to AgentWindow
  -> finishMessage() queues final assistant message through state sync
  -> workflow handoff evaluator may dispatch downstream graph agents
```

Safety notes:

- Runtime request sends only a recent `.slice(-16)` message window.
- Agent runtime task is backend-owned; `agent.status` is UI projection.
- Provider/model capability checks use `NEXUS_MODEL_CATALOG` and `ModelCapabilityProfile`.
- Secrets travel in `Authorization` headers at runtime; they must not be persisted on agents, snapshots, logs, tool inputs, artifacts, or observability metadata.

### 8.3 L2 Agent Handoff

```text
Agent completes assistant message
  -> workflow-engine evaluates WorkspaceGraphEdge
  -> toWorkflowEdge()
  -> cycle check
  -> target busy check
  -> target capability check
  -> build handoff prompt
  -> queueWorkflowHandoffDispatches()
```

Current source of truth:

- Persisted visual edges are `WorkspaceGraphEdge`.
- Runtime handoff shape is `IWorkflowEdge`.
- `HANDOFF_RULE_REGISTRY` is still empty and reserved.
- Do not add hidden autonomous routing state outside this registry-backed model.

### 8.4 Media And Tool Execution

```text
Media prompt or run tool
  -> useNexusStore.runTool()
  -> POST /api/v1/tools/[toolId]/run
  -> ToolExecutionService.runTool()
  -> ToolRegistryValidator resolves TOOL_SLOT_REGISTRY / executor aliases / fallbacks
  -> ToolPermissionGate checks PermissionService
  -> SecretBoundaryService rejects/redacts unsafe payloads
  -> ExistingToolExecutorAdapter calls runtime executor
  -> high-risk tools may await confirmation
  -> result projects back into AgentTool + tool message
```

Current executor realities:

- Runtime executor map has `mock.review-mesh`, `mock-image-gen`, `real-image-gen`, `real-file-scanner`, `web-surfer`, `mock-video-gen`.
- Registry has accepted mismatch aliases/fallbacks:
  - `mock-review-mesh` -> `mock.review-mesh`
  - `real-video-gen` -> `mock-video-gen`
- `real-db-query` is reserved, not implemented.

### 8.5 Artifact Flow

```text
Save artifact / tool materialization
  -> SupabaseStateSyncManager.saveArtifact() or ArtifactService.materializeToolRunOutput()
  -> POST /api/v1/artifacts
  -> ArtifactService.createArtifact()
  -> ArtifactMaterializer size/hash/secret checks
  -> ArtifactRepository insert/list/get/version/reference/archive
  -> frontend artifactVault cache receives projection records
```

Artifact rules:

- Artifact identity is separate from content hash dedupe.
- Large text is projected by preview/storage reference rather than full inline content.
- References link artifact to message, notebook, prompt, macro, agent memory, or tool run.
- Archive sets artifact status; reference resolution after archive should be verified before relying on it.

### 8.6 Historical Messages And Memory

```text
AgentWindow asks for history
  -> useNexusStore.fetchHistoricalMessages()
  -> HistoricalDataFetcher
  -> GET /api/v1/agents/[agentId]/messages
  -> MessageHistoryService.listMessages()
  -> MessageRepository + StoragePartitionService signed cursor
  -> frontend stores page under workspaceId::agentId
```

Current boundary:

- Active agent messages still live in `NexusAgent.messages`; V15 local persistence metadata records preserve-full policy and target active-window limits without trimming.
- Historical pages are stored in `historicalMessages` and not persisted.
- Cloud snapshots store only message refs capped by `WORKSPACE_SNAPSHOT_MESSAGE_REF_LIMIT = 8`.
- Memory records have list/read service and repository insertion helpers, but API surface currently exposes GET.
- Historical artifact fetcher is still a stub.

### 8.7 Active Workspace Snapshot And Sync Queue

```text
Workspace changes
  -> queueWorkspaceCloudSync()
  -> SupabaseStateSyncManager.syncActiveUiState()
  -> serializeActiveUiStateSnapshot()
  -> messageWindow.messageRefs, checksum, size cap
  -> localSyncQueueAdapter.enqueue(workspace snapshot)
  -> POST /api/v1/sync/operations
  -> SyncQueueService.createOperation()
  -> SyncOperationApplier applies workspace snapshot inline or leaves other domains queued
```

Current sync boundary:

- Workspace snapshot max size is `512 * 1024`.
- Local sync queue payload max is `128 * 1024`.
- Sync operation applier applies `workspace/snapshot`.
- `agent`, `message`, `prompt`, `notebook`, and `artifact_reference` operations currently return queued rather than domain-table apply.

### 8.8 Workflow Runtime Lite

```text
Graph mode
  -> graph.runtimeLite
  -> input.text / model.llm / output.text nodes
  -> validateWorkflowRuntimeLiteTopology()
  -> runWorkflowRuntimeLite()
  -> model.llm calls existing provider boundary
  -> node executions and ContextPackets stored in runtimeLite.runs
```

Runtime Lite rules:

- Node definitions live in `workflow-runtime-lite/registry.ts`.
- Topology currently requires a single connected `input.text` start and no cycles.
- Output snapshots are truncated for display/persistence boundaries.
- Add new workflow node types through `WorkflowRuntimeNodeType`, `GRAPH_NODE_REGISTRY`, node definitions, and UI renderers together.

## 9. Route-to-Service Ownership Matrix

| Route area | Route handler shape | Primary service/repository | Notes |
| --- | --- | --- | --- |
| Legacy stream/media/intel/tools | Direct `route.ts` handlers | `agent-stream-service`, image adapter, memory compressor, local tools | These are intentional exceptions to the `/api/v1` JSON envelope. |
| `/api/v1/workspaces/[workspaceId]/state` | `apiHandler` GET/PUT | `WorkspaceStateService`, snapshot/entity repositories | Cloud active snapshot only; full active workspace remains local-first. |
| `/api/v1/sync/**` | `apiHandler` GET/POST | `SyncQueueService`, `SyncOperationApplier` | Existing queue only. Applier currently applies workspace snapshots and queues other domains. |
| `/api/v1/agents/[agentId]/tasks/**` | `apiHandler` GET/POST | `AgentRuntimeService`, runtime repository | Durable task/session lifecycle. |
| `/api/v1/agents/[agentId]/stream` | Direct POST stream | `createAgentStreamResponse`, `AgentRuntimeService`, provider adapter | Streaming response; no normal JSON envelope. |
| `/api/v1/agents/[agentId]/messages/**` | `apiHandler` GET/POST | `MessageHistoryService`, message repository | Paged history/archive projection. |
| `/api/v1/agents/[agentId]/memory` | `apiHandler` GET | `MessageHistoryService`, memory repository | Read/list surface; write path remains `Needs verification`. |
| `/api/v1/tools/**`, `/api/v1/tool-runs/**` | `apiHandler` GET/POST | `ToolExecutionService`, permission gate, tool repositories | Registry validation, permission, confirmation, materialization. |
| `/api/v1/artifacts/**` | `apiHandler` GET/POST | `ArtifactService`, materializer, artifact repository | Size/hash/secret boundary and references/versions/archive. |
| `/api/v1/observability/**` | `apiHandler` GET | `ObservabilityService`, event/metric repositories | Redaction pipeline before persistence/output. |
| `/api/v1/deployment/**`, `/api/v1/feature-flags/**`, `/api/v1/health` | `apiHandler` GET/POST | `DeploymentCheckService`, `FeatureFlagService` | Env, schema drift, registry consistency, flags, health. |
| `/api/v1/providers/verify` | Direct POST | Provider adapter probe | Special JSON probe using runtime credentials from headers/body. |

## 10. Database And Migration Ownership

| Migration | Creates/owns |
| --- | --- |
| `20260525000000_create_workflow_templates.sql` | `workflow_templates` |
| `20260527000000_security_boundary_rls_foundation.sql` | `workspace_memberships`, `permission_audit_logs`, RLS and workspace ownership columns |
| `20260527001000_api_idempotency_keys.sql` | `api_idempotency_keys` |
| `20260527002000_workspace_cloud_state.sql` | `workspace_snapshots`, `workspace_state_entities` |
| `20260527003000_durable_sync_queue.sql` | `sync_operations` |
| `20260527004000_deployment_safety_gate.sql` | `feature_flags`, `deployment_checks` |
| `20260527005000_agent_runtime_sessions.sql` | `agent_runtime_sessions`, `agent_tasks`, `agent_runtime_events` |
| `20260527006000_tool_execution_control_plane.sql` | `tool_runs`, `tool_permissions` |
| `20260527007000_artifact_asset_layer.sql` | `artifacts`, `artifact_references` |
| `20260527008000_observability_event_spine.sql` | `system_events`, `usage_metrics` |
| `20260527009000_historical_data_paging.sql` | `agent_memory_records`, message paging/archive columns |

Database type mirror currently includes:

- `Workspaces`, `Messages`, `Artifacts`, `Artifact_References`
- `Workflow_Templates`, `Prompts`, `Prompt_Revisions`, `Notebooks`
- `Workspace_Memberships`, `Permission_Audit_Logs`
- `Api_Idempotency_Keys`
- `Workspace_Snapshots`, `Workspace_State_Entities`
- `Sync_Operations`
- `Feature_Flags`, `Deployment_Checks`
- `Agent_Runtime_Sessions`, `Agent_Tasks`, `Agent_Runtime_Events`
- `Tool_Runs`, `Tool_Permissions`
- `System_Events`, `Usage_Metrics`
- `Agent_Memory_Records`

## 11. Definition And Interaction Index

| Definition | Owner | Consumed by | Interaction meaning |
| --- | --- | --- | --- |
| `NexusAgent` | `nexus-types.ts` | Store, UI, stream payload, snapshots, macros | Core workstation entity; do not attach secrets or permissions to callsign. |
| `NexusWorkspace` | `nexus-types.ts` | Store, serializer, graph, sync, import/export | Active UI root; snapshots must stay bounded. |
| `WorkspaceGraph` | `nexus-types.ts` | NexusGraph, workflow-engine, runtime-lite | Agent edges and runtime-lite graph live together but have different execution semantics. |
| `AgentModelSettings` | `nexus-types.ts` + `nexus-registry.ts` | UI tuning panels, provider adapter, snapshots | Model controls must normalize through registry capability profiles. |
| `AgentTemplateProfile` | `nexus-types.ts` + store | LeftDock and AgentSettingsSidebar | Template custom defaults live in workspace settings; no second template store. |
| `CAPABILITY_REGISTRY` | `nexus-registry.ts` | UI, deployment checker, tool registry validator | Canonical agent capability sockets. |
| `NEXUS_MODEL_CATALOG` | `nexus-registry.ts` | UI, runtime service, provider adapter | Exact provider payload ids; labels are display-only. |
| `TOOL_SLOT_REGISTRY` | `nexus-registry.ts` | Tool registry validator, deployment checker | Canonical tool extension slots. |
| `TOOL_EXECUTOR_REGISTRY` | `nexus-registry.ts` | Registry scan and future executor grouping | Real executors grouped by `local-fs`, `rest-api`, `db-query`. |
| `toolExecutors` | `src/lib/tool-executors.ts` | Store legacy run path, tool adapter | Runtime executor map; keep aliases/fallbacks deliberate. |
| `IStateSyncManager` | `nexus-types.ts` | `state-sync.ts`, store | Only sync boundary components should call for durable persistence. |
| `IAsyncDataFetcher` | `nexus-types.ts` | `HistoricalDataFetcher`, store | Historical paging boundary; do not merge full history into agent messages. |
| `apiHandler` | backend API | `/api/v1` routes | Envelope, idempotency, permission, validation, event hook. |
| `PermissionService` | backend security | API handler, sync, runtime, tools, artifacts, history | Central permission decision owner. |
| `SecretBoundaryService` | backend security | sync, tools, artifacts, observability, deployment, idempotency | Reject/redact secrets before persistence/logging. |
| `AgentRuntimeService` | backend runtime | task routes, stream service | Durable task/session lifecycle owner. |
| `ToolExecutionService` | backend tools | tool routes, store via API | Tool run lifecycle, confirmation, adapter execution. |
| `ArtifactService` | backend artifacts | artifact routes, state sync, tool materialization | Durable artifact asset and provenance owner. |
| `MessageHistoryService` | backend history | history routes, HistoricalDataFetcher | Paged messages, archive projection, memory reads. |
| `ObservabilityService` | backend observability | API/domain events, observability routes | Cross-system events, traces, metrics, redaction. |

## 12. No-Duplicate / No-Pollution Rules

Hard rules already present in code/docs:

- Do not create parallel model maps. Use `NEXUS_MODEL_CATALOG`.
- Do not create parallel provider tuning lists in UI. Use `ModelCapabilityProfile`.
- Do not create parallel capability enums. Use `AgentCapabilityType` and `CAPABILITY_REGISTRY`.
- Do not create parallel graph node enums. Use `WorkflowGraphNodeType` and `GRAPH_NODE_REGISTRY`.
- Do not create parallel tool registries. Use `TOOL_SLOT_REGISTRY`, `TOOL_EXECUTOR_REGISTRY`, and `toolExecutors` with declared aliases/fallbacks.
- Do not create one-off compression prompts. Use `MEMORY_COMPRESSION_PROFILE_REGISTRY`.
- Do not create a second model settings store. Use `NexusAgent.modelSettings`.
- Do not create a second agent custom prompt/profile store. Use `identity`, `mission`, `executionPrompt`, and `profileLocked`.
- Do not create a second template customization store. Use `WorkspaceSettings.agentTemplateProfiles`.
- Do not use `callsign` to grant tools, providers, models, or behavior.
- Do not persist `apiKey`, `baseUrl`, auth tokens, provider tokens, service-role keys, or raw secrets on agents, snapshots, artifacts, logs, sync payloads, or frontend bundle.
- Do not create a second sync queue. Use `localSyncQueueAdapter` and `/api/v1/sync/operations`.
- Do not move full historical pages, artifact binaries, full tool output payloads, full sync queues, or raw observability content into Zustand/IndexedDB root state.
- Do not route new Supabase writes directly from components. Go through `IStateSyncManager`, `nexusApiClient`, or domain services.
- Do not let `/api/v1` routes bypass the API/domain layering unless the route is streaming or a documented special probe.
- Do not add DB columns without updating `database.types.ts` and shared frontend/domain types.
- Do not overwrite existing architecture docs with contradictory rules; update them intentionally if a boundary changes.

## 13. What To Check When Something Feels Wrong

| Symptom | First checks |
| --- | --- |
| UI changed but reload loses it | `nexus-store.ts` partialize/migration, `prepareWorkspacesForLocalPersistence`, `queueWorkspaceCloudSync`, local IndexedDB storage. |
| Backend accepted mutation but UI does not reflect it | Store action projection, `nexusApiClient` envelope parsing, cache key, local sync queue status. |
| `/api/v1` mutation fails with 400 | Missing `X-Idempotency-Key`, validator issue, invalid workspace id, unsupported method. |
| Permission denied unexpectedly | `createWorkspaceStatePermissionService`, `PermissionService`, local-owner fallback, Supabase memberships/RLS. |
| Secret rejection | `SecretBoundaryService`, redaction pipeline, tool input, sync payload, artifact content, idempotency replay. |
| Stream stuck in thinking/streaming | `AgentRuntimeService` task status, `abortControllersRef`, `/stream` route, `finishMessage`, task cancel route. |
| Model setting not applied | `normalizeAgentModelSettings`, `getModelCapabilityProfile`, provider adapter body builder, UI tuning panel. |
| Tool id mismatch | `TOOL_SLOT_REGISTRY`, `toolExecutors`, `TOOL_EXECUTOR_ALIASES`, `TOOL_EXECUTOR_FALLBACKS`, registry consistency check. |
| Artifact content missing | Artifact content size cap, `contentUrl`, `previewText`, `ArtifactMaterializer`, archive status, reference resolution. |
| History duplicates or grows too much | `workspaceId::agentId` cache key, activeIds filtering, message refs cap, active `agent.messages` cap policy. |
| Graph handoff loops | `findWorkflowCyclePath`, `processedHandoffKeys`, `HANDOFF_RULE_REGISTRY`, target status/capability. |
| Workflow Runtime Lite refuses to run | Single `input.text`, no cycles, all nodes connected to start, valid handles. |
| Deployment health warning | `DeploymentCheckService`, environment validator, registry consistency checker, schema drift checker. |

## 14. Current Needs Verification

Keep these as explicit verification items unless a future scan proves otherwise:

- Active `agent.messages` remain inside persisted `workspaces` with V15 `AgentLocalPersistenceMetadata`; local cap/archive enforcement still needs V16 message projection verification for long sessions.
- Active `agent.memory` remains inside persisted workspaces and cloud active snapshots include `memory`; V15 metadata marks stricter memory diet as blocked until durable memory write/update is verified.
- Cloud snapshots use message refs, but import/export snapshots can still include full active messages through `createWorkspaceSnapshot`.
- Local sync queue can temporarily contain message payloads until flushed.
- `SyncOperationApplier` applies workspace snapshots inline; `agent`, `message`, `prompt`, `notebook`, and `artifact_reference` operations currently stay queued.
- Historical artifact fetcher is a stub.
- Memory record repository supports insert/list with size and secret checks, but the current API surface exposes GET for memory records.
- Cursor payloads are signed, not encrypted; do not treat cursor body as secret.
- Supabase message paging tie-break behavior should be checked if duplicate timestamps matter.
- Artifact archive/reference behavior should be verified before relying on archived artifact resolution.
- Tool output artifact materialization can be unavailable; `artifactId` on tool runs is nullable.
- Production permission behavior depends on Supabase memberships and RLS; local fallback grants owner-like access to `local-owner`.
- Observability pages use created-at cursor semantics; stable tie-break may be needed later.

## 15. Iteration Checklist

Before coding:

1. Read `AGENTS.md`.
2. Read relevant Next docs under `node_modules/next/dist/docs/` for the route/UI area being changed.
3. Read this file.
4. Search the exact domain terms in `nexus-types.ts` and `nexus-registry.ts`.
5. Identify whether the change is frontend active state, backend domain state, registry expansion, DB schema, or API contract.

When adding a feature:

1. Add or extend shared type in `nexus-types.ts` if the data crosses a boundary.
2. Add or extend registry slot in `nexus-registry.ts` if it is a model, provider, capability, tool, graph node, compression profile, or handoff behavior.
3. Add DB migration only when durable storage is truly needed.
4. Mirror DB changes in `database.types.ts`.
5. Expose backend behavior through domain service + repository, then route.
6. Use `apiHandler` for normal `/api/v1` JSON endpoints.
7. Use `nexusApiClient` from frontend.
8. Project only bounded data into Zustand.
9. Add tests around the smallest domain boundary that owns the behavior.
10. Mark unclear integration points as `Needs verification` instead of silently guessing.

## 16. Recommended Future Scan Command Set

Use these search clusters before a new iteration:

```bash
rg -n "SCAN FIRST|@rule|@boundary|Do not|不得|禁止|Needs verification" AGENTS.md README.md ARCHITECTURE.md NEXUS_*.md src supabase
```

```bash
rg -n "CAPABILITY_REGISTRY|TOOL_SLOT_REGISTRY|TOOL_EXECUTOR_REGISTRY|NEXUS_MODEL_CATALOG|HANDOFF_RULE_REGISTRY|WorkflowRuntimeLite|modelSettings|agentTemplateProfiles|executionPrompt|profileLocked" src
```

```bash
rg -n "apiHandler|nexusApiClient|IStateSyncManager|IAsyncDataFetcher|localSyncQueueAdapter|PermissionService|SecretBoundaryService|AgentRuntimeService|ToolExecutionService|ArtifactService|MessageHistoryService|ObservabilityService" src
```

```bash
rg -n "create table|alter table|enable row level security|policy" supabase/migrations
```

## 17. Final Boundary Statement

The cleanest future path is additive and socket-based: extend existing contracts, registries, service boundaries, and queues. NEXUS already has places for most future data and behavior. When functionality feels wrong, architecture feels unclear, or coupling feels incomplete, the answer should be discoverable by tracing:

```text
UI action
  -> Zustand action
  -> shared type / registry slot
  -> nexusApiClient or state-sync port
  -> /api/v1 route
  -> apiHandler
  -> domain service
  -> repository / Supabase
  -> observability / sync / projection back to UI
```

If that chain cannot be drawn, the implementation is not ready to land cleanly.
