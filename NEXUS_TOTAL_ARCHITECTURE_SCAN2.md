# Nexus Total Architecture Scan 2

Date: 2026-05-29

This document is generated from a two-pass scan of the current project. It merges the original user demand terms with project-specific scan terms, then maps the usable definitions, durable data, frontend/backend connections, rules, boundaries, and likely failure-diagnosis paths.

## 0. Purpose

The goal of this file is to make future iterations safer:

- Know which data definitions already exist.
- Know which registries are canonical and should be extended instead of duplicated.
- Know which frontend, backend, sync, and database layers own each function.
- Know which boundaries must stay clean, especially secrets, large history, artifacts, and durable sync.
- Make unclear behavior, incomplete coupling, and architecture drift easier to read from code.

This is a documentation-only scan. It does not change runtime behavior.

## 1. Demand Terms And Second Scan Terms

### 1.1 User Demand Terms

The user's requirement text was normalized into these scan terms:

`前端`, `後端`, `功能端`, `架構`, `資料`, `定義`, `規則`, `重複`, `污染`, `耦合`, `狀況`, `掃描`, `迭代`, `對接`, `交互`, `清楚`, `功能不對勁`, `架構不清楚`, `不能污染`, `已經有定義`, `不要做重複`, `總md檔`

### 1.2 Project-Specific Scan Terms

After reading the project, the generated scan vocabulary was:

`SCAN FIRST`, `TIERED_STATE`, `canonical`, `registry`, `slot`, `source of truth`, `NexusWorkspace`, `NexusAgent`, `WorkspaceSnapshot`, `WorkspaceCloudSnapshot`, `ActiveUiStateSnapshot`, `IStateSyncManager`, `IAsyncDataFetcher`, `SyncOperation`, `LocalSyncQueue`, `WorkspaceRecovery`, `MessageHistory`, `Artifact`, `PromptRecord`, `NotebookRecord`, `AgentTask`, `ToolRun`, `SystemEvent`, `UsageMetric`, `FeatureFlag`, `DeploymentCheck`, `apiHandler`, `PermissionService`, `idempotency`, `SecretBoundary`, `RLS`, `workspace_memberships`, `sync_operations`, `workspace_snapshots`, `artifact_references`, `prompt_revisions`

### 1.3 Second Scan Pattern

The second scan combined both sets and searched:

- Existing architecture documents.
- `src/lib/nexus-types.ts`, `src/lib/nexus-registry.ts`, `src/lib/tool-executors.ts`, `src/store/nexus-store.ts`.
- Frontend components under `src/components/nexus`.
- API routes under `src/app/api`.
- Backend contracts, services, repositories, security, sync, runtime, deployment, observability.
- Supabase migrations under `supabase/migrations`.

The second scan confirmed that this project already contains strong source-of-truth rules. The main risk is not missing architecture; the main risk is creating parallel definitions or bypassing the existing boundaries.

## 2. One-Sentence Architecture

Nexus is a local-first multi-agent AI IDE where the frontend Zustand store owns active UI state, `nexus-types.ts` and `nexus-registry.ts` own cross-layer definitions, API routes stay thin behind `apiHandler`, backend services own business behavior, repositories own persistence, and Supabase tables plus RLS own durable state.

## 3. Canonical Flow

```text
UI component
  -> useNexusStore action
  -> state-sync manager or nexusApiClient
  -> /api/v1 route
  -> apiHandler / validation / permission / idempotency
  -> domain service
  -> repository
  -> Supabase table or in-memory fallback
  -> observability event or usage metric
```

For local/offline durable writes, the path is:

```text
UI/store action
  -> supabaseStateSyncManager
  -> localSyncQueueAdapter in IndexedDB
  -> /api/v1/sync/operations
  -> SyncQueueService
  -> SyncOperationApplier
  -> owning domain service
  -> owning repository/table
```

## 4. Source-Of-Truth Map

| Area | Canonical definitions | Frontend owner | Backend owner | Durable tables | Must not duplicate or pollute |
| --- | --- | --- | --- | --- | --- |
| Agent and workspace shape | `src/lib/nexus-types.ts`, `src/lib/nexus-defaults.ts` | `src/store/nexus-store.ts`, `NexusOps` | Workspace services, runtime services | `workspaces`, `workspace_snapshots`, `workspace_state_entities` | Do not invent a second workspace schema in components or API routes. |
| Model, provider, capability | `src/lib/nexus-registry.ts` | Agent model/profile UI through store | Provider adapter, runtime service | Mostly config/code; metrics record usage | Do not hardcode model/provider maps in UI or services. Extend the registry. |
| Graph and workflow | `GRAPH_NODE_REGISTRY`, `WorkflowGraph`, runtime-lite definitions | `nexus-graph.tsx`, graph actions in store | `workflow-runtime-lite`, stream boundary | Runtime records and workspace snapshots | Do not create hidden autonomous routing state outside graph/runtime definitions. |
| Chat streaming and tasks | `AgentTaskRecord`, `AgentRuntimeSessionRecord`, model registry | `NexusOps` send/stream flow | `AgentRuntimeService`, `agent-stream-service`, provider adapter | `agent_tasks`, `agent_runtime_sessions`, `agent_runtime_events`, `messages` | Do not store provider deltas, secrets, or unbounded transcripts in snapshots. |
| Workspace cloud state | `WorkspaceSnapshot`, `WorkspaceCloudSnapshotPayload`, serializer/validator | Store active UI snapshot and recovery actions | `WorkspaceStateService` | `workspace_snapshots`, `workspace_state_entities` | Snapshot is bounded active UI only, not full history, binaries, tasks, tool runs, or queue state. |
| Sync queue | `SyncEntityType`, `LocalSyncQueueOperation`, queue adapter | `supabaseStateSyncManager`, `localSyncQueueAdapter` | `SyncQueueService`, `SyncOperationApplier` | `sync_operations` | Do not create a second queue. Do not treat queued as synced. |
| Message history and memory | `MessageHistoryRecord`, `AgentMemoryRecord`, `IAsyncDataFetcher` | Active message window in store | `MessageHistoryService` | `messages`, `agent_memory_records` | Full history must page through history APIs, not workspace snapshot/localStorage. |
| Artifacts | `ArtifactRecord`, `ArtifactVaultRecord`, artifact requests/responses | Artifact vault cache and panels | `ArtifactService`, materializer, reference resolver | `artifacts`, `artifact_references` | No raw secrets, huge binaries, or direct artifact-reference sync through generic queue. |
| Tool execution | `TOOL_SLOT_REGISTRY`, `TOOL_EXECUTOR_REGISTRY`, `toolExecutors` | Store `executeTool` action | `ToolExecutionService`, registry validator | `tool_runs`, `tool_permissions` | Do not bypass slot registry. Redact inputs/outputs. Confirm high-risk runs. |
| Prompt Vault | `PromptRecord`, `PromptRevisionRecord` | `PromptVaultManager`, prompt cache actions | `PromptService` | `prompts`, `prompt_revisions` | Do not erase local newer/pending prompts from an empty remote response. |
| Datapad / notebooks | `NotebookRecord`, `NotebookDraftRecord` | `DatapadWindow`, notebook cache/draft/open-window actions | `NotebookService` | `notebooks` | Drafts, tombstones, and local newer records are meaningful. Do not overwrite casually. |
| Observability | `SystemEventRecord`, `UsageMetricRecord` | Mostly read/status UI | `ObservabilityService` | `system_events`, `usage_metrics` | Observability is secondary evidence, not the lifecycle source of truth. |
| Deployment safety | Deployment/feature flag types and services | Health/config checks | `DeploymentCheckService` | `feature_flags`, `deployment_checks` | Do not expose secrets in check details. |
| Auth and permissions | Supabase auth, permission contracts, RLS migrations | `auth-screen.tsx`, auth vault in store | `PermissionService`, `auth-session`, `workspace-permission` | `workspace_memberships`, `permission_audit_logs`, RLS policies | Do not bypass route permission checks or table RLS assumptions. |

## 5. Core Data Definitions

### 5.1 `nexus-types.ts`

This file is the main cross-layer type contract. Before adding data that crosses UI, API, sync, or persistence boundaries, check here first.

Important groups:

- UI/domain: `NexusAgent`, `NexusWorkspace`, `WorkspacePanel`, `WorkspaceGraph`, `WorkspaceGraphEdge`.
- Active workspace persistence: `WorkspaceSnapshot`, `WorkspaceCloudSnapshotPayload`, `WorkspaceStatePutRequest`, `WorkspaceRecoveryStateResponse`.
- Sync: `SyncEntityType`, `SyncOperationKind`, `SyncOperationStatus`, `LocalSyncQueueOperation`.
- Runtime: `AgentTaskRecord`, `AgentRuntimeSessionRecord`, `ToolRunRecord`.
- History/artifacts: `MessageHistoryRecord`, `AgentMemoryRecord`, `ArtifactVaultRecord`, `ArtifactRecord`.
- Prompt/notebook: `PromptRecord`, `PromptRevisionRecord`, `NotebookRecord`, `NotebookDraftRecord`.
- Observability: `SystemEventRecord`, `UsageMetricRecord`.
- Boundaries: `IAsyncDataFetcher`, `IStateSyncManager`.

Rule: if the data must survive reload, cross API boundaries, sync to cloud, or appear in multiple subsystems, add or extend a typed contract here first.

### 5.2 `nexus-registry.ts`

This file is the canonical registry layer.

Important registries:

- `PROVIDER_REGISTRY`: model provider definitions.
- `NEXUS_MODEL_CATALOG`: supported model IDs and capability profiles.
- `CAPABILITY_REGISTRY`: capability IDs such as chat, image, video, sandbox, audio, search, data-analysis.
- `GRAPH_NODE_REGISTRY`: graph/runtime node definitions.
- `TOOL_EXECUTOR_REGISTRY`: executor metadata.
- `TOOL_SLOT_REGISTRY`: user-facing tool slots and fallbacks.
- `MEMORY_COMPRESSION_PROFILE_REGISTRY`: compression profiles.
- `HANDOFF_RULE_REGISTRY`: reserved handoff rules.

Rule: if a feature needs a new model, provider, capability, graph node, tool slot, executor, compression profile, or handoff rule, extend this file instead of creating local maps.

### 5.3 `tool-executors.ts`

This file maps executable tool IDs to concrete executor implementations.

Current executor IDs include:

- `mock.review-mesh`
- `mock-image-gen`
- `real-image-gen`
- `real-file-scanner`
- `web-surfer`
- `mock-video-gen`

Rule: adding a tool is a two-part operation. Register the slot/metadata in `nexus-registry.ts`, then wire the executable implementation in `tool-executors.ts` or the backend tool execution boundary.

### 5.4 `nexus-store.ts`

The Zustand store owns active UI behavior, local-first caches, optimistic actions, and bridge calls to durable services.

Major responsibilities:

- Workspace creation, import, export, recovery, and active UI snapshot enqueue.
- Agent creation, branching, model/profile updates, layout, and theme.
- Active chat message windows and streaming state.
- Artifact vault cache.
- Prompt cache and prompt sync actions.
- Notebook cache, drafts, open windows, and tombstones.
- Graph editing, workflow execution, runtime-lite state.
- Tool run initiation and status tracking.
- Auth vault and provider credentials.

Rule: the store can cache active UI and local-first state, but durable history, artifacts, and sync status must flow through the defined manager/service layers.

## 6. Functional Interaction Map

### 6.1 Chat Stream

Path:

```text
NexusOps
  -> useNexusStore addMessage/updateAgentStatus/updateStreamingMessage
  -> POST /api/v1/agents/[agentId]/tasks
  -> AgentRuntimeService.createTask
  -> POST /api/v1/agents/[agentId]/stream
  -> agent-stream-service
  -> OpenAICompatibleAdapter or configured mock fallback
  -> stream tokens back to NexusOps
  -> store updates active message window
  -> supabaseStateSyncManager queues completed durable message
```

Data used:

- Agent profile and model from `NexusAgent`.
- Model/provider validation from `NEXUS_MODEL_CATALOG`.
- Task/session records from runtime services.
- Completed messages through message history sync.

Failure reading:

- Model rejected: inspect `NEXUS_MODEL_CATALOG` and provider capability profile.
- Stream opens but no durable history: inspect message sync queue and `MessageHistoryService`.
- Permission failure: inspect route auth, `PermissionService`, workspace membership, and RLS.

### 6.2 Workspace Cloud State And Recovery

Path:

```text
useNexusStore active UI changes
  -> createActiveUiStateSnapshot
  -> supabaseStateSyncManager.syncActiveUiState
  -> workspace snapshot serializer
  -> localSyncQueueAdapter
  -> /api/v1/sync/operations
  -> SyncOperationApplier
  -> WorkspaceStateService.saveState
  -> workspace_snapshots / workspace_state_entities
```

Data used:

- `WorkspaceSnapshot` and `WorkspaceCloudSnapshotPayload`.
- Serializer checksum and bounded snapshot rules.
- Recovery routes and `WorkspaceStateService`.

Rules:

- Snapshot max is 512 KB.
- Snapshot contains active UI and compact references, not full transcripts or binary artifact data.
- `baseChecksum` is used to detect conflicts.

Failure reading:

- Recovery conflict: inspect checksum, `baseChecksum`, and latest remote snapshot.
- State missing after reload: inspect local store persistence first, then cloud snapshot queue, then workspace recovery route.

### 6.3 Durable Sync Queue

Path:

```text
state-sync manager
  -> localSyncQueueAdapter in IndexedDB
  -> POST /api/v1/sync/operations
  -> SyncQueueService.createOperation
  -> SyncOperationApplier.apply
  -> owning domain service
```

Entity routing:

- `workspace` + `snapshot`: `WorkspaceStateService`.
- `notebook`: `NotebookService`.
- `message`: `MessageHistoryService`.
- `prompt`: `PromptService`.
- `agent`: currently accepted but remains queued/not directly applied.
- `artifact_reference`: blocked from generic sync queue; use artifact reference routes.

Rules:

- Payload max is 128 KB.
- Payload must be secret-free.
- Idempotency uses client mutation ID and payload hash.
- Queued, synced, failed, conflict, and canceled are distinct states.

Failure reading:

- Operation stuck queued: inspect local queue status, `/api/v1/sync/operations`, sync service logs, and applier support for that entity type.
- Operation conflict: inspect remote record updated time/hash and domain service stale update protection.

### 6.4 Datapad / Notebook

Path:

```text
DatapadWindow
  -> useNexusStore saveNotebookDraft/updateNotebook/deleteNotebook
  -> notebook cache, draft cache, deleted tombstone cache
  -> supabaseStateSyncManager.upsertNotebook/deleteNotebook
  -> local sync queue
  -> NotebookService
  -> notebooks table
```

Rules:

- Drafts are unsynced local working state.
- Deletes are tombstones, not simple cache removal.
- Remote empty fetch is not authoritative enough to erase local-only or newer records.
- Export/import includes notebooks, drafts, deleted notebook tombstones, and recovery metadata.

Failure reading:

- Window content differs from cloud: inspect local draft first, cache second, queue third, durable table last.
- Deleted notebook returns: inspect tombstone sync and merge logic.

### 6.5 Prompt Vault

Path:

```text
PromptVaultManager
  -> useNexusStore updatePrompt/deletePrompt
  -> prompt cache
  -> supabaseStateSyncManager
  -> local sync queue
  -> PromptService
  -> prompts / prompt_revisions
```

Rules:

- Current prompt content remains canonical in `prompts`.
- Revisions are history, not the current prompt source of truth.
- Stale updates are protected.
- Secret scanning applies before durable writes.

Failure reading:

- Prompt disappears: inspect deleted tombstone state and merge rules.
- Revision missing: inspect `fetchPromptRevisions`, which currently reads Supabase directly as a special path.

### 6.6 Artifact Layer

Path:

```text
UI/store artifact action
  -> supabaseStateSyncManager.saveArtifact or artifact API
  -> /api/v1/artifacts
  -> ArtifactService
  -> materializer / reference resolver
  -> artifacts / artifact_references
```

Rules:

- Artifact content, preview, and metadata must be bounded and redacted.
- Artifact references are their own route/service path.
- Artifact versions and archives belong to `ArtifactService`, not the sync queue.

Failure reading:

- Artifact exists but UI cannot find it: inspect artifact vault cache and reference route.
- Artifact create blocked: inspect secret boundary and materialization size/content limits.

### 6.7 Tool Execution

Path:

```text
useNexusStore.executeTool
  -> nexusApiClient POST /api/v1/tools/[toolId]/run
  -> ToolExecutionService
  -> ToolRegistryValidator
  -> PermissionService
  -> registered executor adapter
  -> tool_runs
  -> optional durable tool message
```

Rules:

- Tool slot metadata belongs in `TOOL_SLOT_REGISTRY`.
- Executable implementation belongs in `tool-executors.ts` or backend executor adapters.
- High-risk tools require explicit confirmation.
- Tool inputs and outputs must be redacted before durable persistence.

Failure reading:

- Tool not found: inspect slot registry, executor registry, alias/fallback checker, then `tool-executors.ts`.
- Tool runs but output not visible: inspect `tool_runs`, store tool result handling, and optional message sync.

### 6.8 Workflow And Runtime-Lite

Two workflow paths exist:

- L2 auto-handoff uses workspace graph edges and store-level workflow engine logic.
- Runtime-lite uses registered nodes such as `input.text`, `model.llm`, and `output.text`.

Path:

```text
NexusGraph / store graph actions
  -> WorkspaceGraph
  -> workflow-engine or workflow-runtime-lite runner
  -> graph node registry validation
  -> stream boundary for LLM node
  -> compact runtime state in store/snapshot
```

Rules:

- Graph node types come from `GRAPH_NODE_REGISTRY`.
- Runtime context packets are compacted before snapshotting.
- Do not add hidden workflow state that bypasses graph edges or runtime-lite records.

Failure reading:

- Handoff does not happen: inspect graph edge, source/target agent status, completed assistant message, cycle guard, and target agent capability.
- Runtime-lite node fails: inspect graph node registry, topology validation, and LLM stream call.

### 6.9 Observability

Path:

```text
services and API handlers
  -> emitBackendEvent / ObservabilityService
  -> system_events / usage_metrics
```

Rules:

- Observability is secondary evidence.
- Events must be redacted.
- Event write failures must not recursively emit more events.
- Do not use observability tables as domain lifecycle tables.

Failure reading:

- No event: inspect sampling, permission, redaction, and repository fallback.
- Domain object missing: inspect the domain table/service, not only observability.

### 6.10 Auth, Permissions, And RLS

Path:

```text
auth-screen / auth vault / bearer token
  -> route auth resolution
  -> PermissionService
  -> workspace_memberships
  -> RLS policy
  -> permission_audit_logs when applicable
```

Rules:

- API route permission is not a replacement for RLS; both matter.
- Mutations generally need idempotency.
- Workspace membership is the canonical authorization anchor.
- Recovery routes use bearer auth verification; many `apiHandler` routes also consider `X-User-Id`.

Failure reading:

- `401`: inspect bearer/session resolution.
- `403`: inspect permission role, workspace membership, and RLS policy.
- Works locally but not in Supabase: inspect service role availability and migration policies.

## 7. Existing Rules Future Iterations Must Obey

1. Read relevant Next.js docs from `node_modules/next/dist/docs/` before writing Next.js code. This repo explicitly warns that the installed Next.js version has breaking changes.
2. Before feature work, scan `src/lib/nexus-types.ts`, `src/lib/nexus-registry.ts`, `src/lib/tool-executors.ts`, and `src/store/nexus-store.ts`.
3. If data crosses UI/API/sync/persistence boundaries, extend `nexus-types.ts` first.
4. If behavior depends on model/provider/capability/tool/graph/compression/handoff identity, extend `nexus-registry.ts`.
5. API routes should stay thin. Use `apiHandler`, request validation, permission checks, idempotency for mutations, and domain services.
6. Components should not write directly to Supabase domain tables.
7. Do not create a second sync queue, second registry, shadow store, hidden workflow state, or local-only model/tool maps.
8. Active UI state can live in Zustand. Durable history and large artifacts must use async fetchers/services.
9. Snapshots must remain bounded and secret-free. They are recovery anchors, not full database dumps.
10. Sync payloads must remain bounded and secret-free. Queued is not synced.
11. Deletes for prompt/notebook-style durable records should preserve tombstone semantics.
12. Remote empty responses must not erase local newer, pending, or draft state without explicit conflict logic.
13. Observability must redact sensitive data and must not become the only source of truth.
14. Migrations and RLS policies are part of the architecture. Backend service behavior must match them.

## 8. Diagnostic Map

| Symptom | First places to inspect | Reason |
| --- | --- | --- |
| Feature exists in UI but not after reload | Store partialize, active snapshot queue, recovery route | Local active UI and cloud recovery are separate layers. |
| Chat streams but history is missing | `NexusOps`, message sync queue, `MessageHistoryService`, `messages` table | Streaming UI update and durable message write are separate. |
| Tool says unsupported | `TOOL_SLOT_REGISTRY`, `TOOL_EXECUTOR_REGISTRY`, `tool-executors.ts`, registry consistency checker | Tool identity has registry and executable layers. |
| Model rejected | `NEXUS_MODEL_CATALOG`, provider adapter, model capability profile | Runtime service validates model identity before execution. |
| Sync stuck queued | IndexedDB queue adapter, `/api/v1/sync/operations`, `SyncQueueService`, `SyncOperationApplier` | Queue acceptance does not guarantee domain apply support. |
| Recovery conflict | Workspace snapshot checksum, `baseChecksum`, `WorkspaceStateService` | Cloud state uses optimistic conflict detection. |
| Notebook deleted then reappears | Tombstone cache, notebook merge logic, `NotebookService.deleteNotebook` | Deletes are durable tombstones. |
| Prompt update overwritten | Prompt stale update protection, revisions, local cache merge | Current prompt and revisions have different roles. |
| Artifact not linked | Artifact vault cache, `ArtifactService`, `artifact_references` route | Artifact body and reference are separate concerns. |
| API returns `401` | Auth bearer/session resolver | Identity was not established. |
| API returns `403` | Permission service, `workspace_memberships`, RLS | Identity exists but lacks role/access. |
| Build/deploy health unclear | `DeploymentCheckService`, feature flags, deployment checks | Deployment gates are their own service/table path. |

## 9. Current Watch Points

- `nexus-store.ts` still preserves full messages/memory in local persistence with explicit metadata stating this is temporary until durable projection is proven. Treat this as a known transition point, not a pattern to expand.
- `agent` sync operations are currently accepted but not fully applied by the sync applier. Do not assume agent sync is durable unless that path is extended.
- `artifact_reference` is intentionally blocked from the generic sync queue. Use artifact reference APIs.
- Some registry entries are reserved or fallback-backed, such as audio, data-analysis, db-query, condition nodes, memory nodes, and real video. Check implementation before surfacing them as fully operational.
- Global Datapad creation currently uses `workspace_id: null` in the store path. Be precise before changing workspace scoping.
- Recovery routes use bearer auth verification. Other API routes may also use `X-User-Id` through `apiHandler` and permission services. Do not assume a single auth path for every route.
- `fetchPromptRevisions` currently reads Supabase directly as a special client-side path. Avoid adding more direct table reads unless there is a deliberate architecture reason.
- Existing docs such as `NEXUS_CODEX_EXECUTION_MAP.md` and `NEXUS_TOTAL_ARCHITECTURE_SCAN1.md` remain relevant. Update them intentionally if source-of-truth rules change.

## 10. Iteration Checklist

Use this checklist before and during future feature work:

1. Classify the feature: UI-only, model/provider, graph/runtime, tool, sync, artifact, prompt, notebook, workspace recovery, observability, deployment, or security.
2. Search exact domain terms in types, registry, store, route, service, repository, migration, tests, and docs.
3. Identify the source of truth before editing.
4. Extend an existing type, registry slot, action, service, or table instead of creating a parallel shape.
5. Wire the whole path: UI -> store -> state-sync/client -> route -> service -> repository -> Supabase.
6. Add or verify validation, permission, idempotency, RLS fit, payload bounds, and secret redaction.
7. Add tests at the owning boundary rather than only testing the caller.
8. Run focused verification for the touched area.
9. Check `git diff` to confirm no unrelated architecture surface was modified.
10. Update architecture docs when a source-of-truth rule or durable data path changes.

## 11. Suggested Verification By Change Type

| Change type | Suggested checks |
| --- | --- |
| Documentation only | `git diff --stat` |
| Type/registry change | `npm run typecheck` |
| Store-only state change | `npm run typecheck`, focused store tests if present |
| API/service change | Focused backend tests for the service or route |
| Sync change | Sync queue and local queue adapter tests |
| Workspace recovery change | Workspace state service and workspace kernel tests |
| Tool execution change | Tool execution service tests and registry consistency check |
| Frontend UI change | Typecheck plus browser verification of the affected UI |
| Migration/RLS change | Supabase migration review, RLS smoke checks, related backend tests |

## 12. Practical Search Recipes

When unsure where a behavior lives, use these searches:

```sh
rg -n "YourDomainTerm" src supabase -g '!node_modules'
rg -n "YourTypeName|YourEntityName" src/lib src/store src/app/api supabase
rg -n "apiHandler|PermissionService|idempotency|SecretBoundary|RLS" src supabase
rg -n "TOOL_SLOT_REGISTRY|TOOL_EXECUTOR_REGISTRY|toolExecutors|GRAPH_NODE_REGISTRY|NEXUS_MODEL_CATALOG" src
rg -n "workspace_snapshots|sync_operations|artifact_references|prompt_revisions|workspace_memberships" supabase src
```

## 13. Clean Architecture Reading Order

For a fresh iteration, read in this order:

1. `src/lib/nexus-types.ts`
2. `src/lib/nexus-registry.ts`
3. `src/lib/tool-executors.ts`
4. `src/store/nexus-store.ts`
5. The relevant component under `src/components/nexus`
6. The relevant route under `src/app/api/v1`
7. The relevant backend service under `src/lib/backend`
8. The relevant repository and Supabase migration
9. The focused tests for that layer
10. Existing architecture docs if the change touches source-of-truth rules

## 14. Final Summary

The project already has the architecture needed for clean iteration. The safest development pattern is not to invent new data paths, but to extend the existing contracts:

- Types define cross-layer data.
- Registries define valid capabilities and executable identities.
- Store defines active UI and local-first behavior.
- State-sync and local queue define offline-to-durable writes.
- API handlers enforce validation, permission, and idempotency.
- Domain services define behavior.
- Repositories and migrations define durable storage.
- Observability records evidence without becoming the source of truth.

If a future feature feels unclear, the fastest way to diagnose it is to ask which source-of-truth row it belongs to, then walk the canonical flow from UI to Supabase and back.
