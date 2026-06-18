# Frontend-Backend Coupling Map — NEXUS // AI OPS

## Overview

This map traces the coupling chains from UI components through store actions, API clients, backend services, to Supabase tables.

| Metric | Count |
|---|---|
| Backend library files (non-test) | 111 |
| API route files (route.ts) | 57 |
| Backend service modules | 14 |
| Supabase client files | 5 |

---

## Coupling Architecture

```
┌────────────────────────────────────────────────┐
│  UI COMPONENTS (nexus-ops.tsx, etc.)           │
│    ↓ calls store actions                       │
│  NEXUS STORE (store/nexus-store.ts)            │
│    ↓ calls API client + backend services       │
│  API CLIENT (lib/api/nexus-api-client.ts)      │
│    ↓ HTTP requests                             │
│  API ROUTES (src/app/api/**/route.ts)          │
│    ↓ calls backend services                    │
│  BACKEND SERVICES (src/lib/backend/**)         │
│    ↓ calls Supabase client                     │
│  SUPABASE CLIENT (src/lib/supabase/client.ts)  │
│    ↓ SQL / RPC                                │
│  SUPABASE DATABASE (Postgres)                  │
└────────────────────────────────────────────────┘
```

---

## Coupling Chain 1: Agent Chat → API → Model Gateway

```
NexusOps / NexusAgentWindow
  → store.addMessage / setAgentStatus
  → nexusApiClient.chat() [lib/api/nexus-api-client.ts]
  → POST /api/chat [src/app/api/chat/route.ts]
  → NewApiChatService [lib/backend/models/new-api-chat-service.ts]
  → AiGatewayService [lib/backend/models/ai-gateway-service.ts]
  → HTTP → External Model Provider
  → store.appendToMessage / finishMessage
```

**Files**: `nexus-api-client.ts` → `chat/route.ts` → `new-api-chat-service.ts` → `ai-gateway-service.ts`

---

## Coupling Chain 2: Agent Stream → Real-time Updates

```
NexusOps
  → store.spawnAgent / updateAgentModel
  → nexusApiClient.stream() [lib/api/nexus-api-client.ts]
  → POST /api/agent-stream [src/app/api/agent-stream/route.ts]
  → AgentStreamService [lib/backend/api/agent-stream-service.ts]
  → SSE → store.appendToMessage / appendReasoningToMessage
```

**Files**: `nexus-api-client.ts` → `agent-stream/route.ts` → `agent-stream-service.ts`

---

## Coupling Chain 3: Workspace Snapshots → Cloud Durability

```
NexusOps (export/save)
  → store.saveWorkspaceSnapshot()
  → createWorkspaceSnapshot() [lib/workspace-kernel.ts]
  → supabaseStateSyncManager [lib/state-sync.ts]
  → POST /api/v1/workspaces/session [route]
  → WorkspaceSessionService [lib/backend/workspace/workspace-session-service.ts]
  → Supabase: workspace_snapshots table
```

**Files**: `nexus-store.ts` → `workspace-kernel.ts` → `state-sync.ts` → `workspace-session-service.ts`

---

## Coupling Chain 4: Agent Branching → Memory Compression

```
AgentBranchModal
  → store.branchAgent(sourceAgentId, config)
  → LlmMemoryCompressor [lib/adapters/memory-compression-adapter.ts]
  → POST /api/memory-compress [route]
  → MemoryCompressService [lib/backend/api/memory-compress-service.ts]
  → store: new agent created with compressed context
```

**Files**: `AgentBranchModal.tsx` → `nexus-store.ts` → `memory-compression-adapter.ts` → `memory-compress/route.ts` → `memory-compress-service.ts`

---

## Coupling Chain 5: Artifacts → Cloud Storage

```
NexusOps / Image Generation
  → store.saveArtifactToCloud()
  → POST /api/v1/artifacts [route]
  → ArtifactRouteService [lib/backend/artifacts/artifact-route-service.ts]
  → ArtifactService / ArtifactRepository [lib/backend/artifacts/]
  → Supabase: artifacts table + nexus-generated-assets bucket
```

**Files**: `nexus-store.ts` → `artifacts/route.ts` → `artifact-route-service.ts` → `artifact-service.ts` → `artifact-repository.ts`

---

## Coupling Chain 6: Tool Execution → Control Plane

```
NexusOps (tool invocation)
  → POST /api/v1/tools/[toolId]/run [route]
  → ToolExecutionService [lib/backend/tools/tool-execution-service.ts]
  → ToolExecutorAdapter [lib/backend/tools/tool-executor-adapter.ts]
  → LocalFsScannerExecutor / WebSurferExecutor [lib/tools/]
  → ToolRunRepository [lib/backend/tools/tool-run-repository.ts]
  → Supabase: tool_runs, tool_permissions tables
```

**Files**: `tools/[toolId]/run/route.ts` → `tool-execution-service.ts` → `tool-executor-adapter.ts` → `fs-scanner-executor.ts` / `web-surfer-executor.ts`

---

## Coupling Chain 7: Sync Operations → Conflict Resolution

```
NexusOps (background sync)
  → supabaseStateSyncManager [lib/state-sync.ts]
  → POST /api/v1/sync/operations [route]
  → SyncQueueService [lib/backend/sync/sync-queue-service.ts]
  → SyncOperationRepository → Supabase: sync_operations
  → SyncConflictResolver [lib/backend/sync/sync-conflict-resolver.ts]
  → SyncOperationApplier [lib/backend/sync/sync-operation-applier.ts]
```

**Files**: `state-sync.ts` → `sync/operations/route.ts` → `sync-queue-service.ts` → `sync-conflict-resolver.ts`

---

## Coupling Chain 8: Historical Data → Message Paging

```
NexusAgentSettingsSidebar (history view)
  → store.fetchHistoricalMessages(agentId)
  → HistoricalDataFetcher [lib/backend/history/historical-data-fetcher.ts]
  → GET /api/v1/agents/[agentId]/messages [route]
  → MessageHistoryService [lib/backend/history/message-history-service.ts]
  → MessageRepository → Supabase: messages table
```

**Files**: `nexus-store.ts` → `historical-data-fetcher.ts` → `agents/[agentId]/messages/route.ts` → `message-history-service.ts` → `message-repository.ts`

---

## Coupling Chain 9: Observability → Event Pipeline

```
WorkflowProSurface / NexusOps
  → publishWorkflowRuntimeTrace() [lib/workflow-runtime-lite/trace-client.ts]
  → POST /api/v1/observability/events [route]
  → ObservabilityService [lib/backend/observability/observability-service.ts]
  → SystemEventRepository → Supabase: system_events
  → UsageMetricsRepository → Supabase: usage_metrics
```

**Files**: `trace-client.ts` → `observability/events/route.ts` → `observability-service.ts` → `system-event-repository.ts`

---

## Coupling Chain 10: Feature Flags → Deployment

```
NexusOps (feature activation)
  → GET /api/v1/feature-flags [route]
  → FeatureFlagService [lib/backend/deployment/feature-flag-service.ts]
  → Supabase: feature_flags table
  → DeploymentCheckService [lib/backend/deployment/deployment-check-service.ts]
  → Supabase: deployment_checks table
```

**Files**: `feature-flags/route.ts` → `feature-flag-service.ts` → `deployment-check-service.ts`

---

## Coupling Chain 11: Notebooks/Datapads → Durable Storage

```
DatapadWindow
  → store.createNotebook / updateNotebook / deleteNotebook
  → nexusApiClient
  → GET / POST /api/v1/notebooks [route]
  → NotebookService [lib/backend/notebooks/notebook-service.ts]
  → NotebookRepository → Supabase: notebooks table (with tombstone support)
```

---

## Coupling Chain 12: Prompts → Durable Storage

```
PromptVaultManager
  → store.addPromptToCache / updatePrompt / deletePrompt
  → nexusApiClient
  → GET / POST /api/v1/prompts [route]
  → PromptService [lib/backend/prompts/prompt-service.ts]
  → PromptRepository → Supabase: prompts table (with tombstone + revisions)
```

---

## API Client Layer

The `NexusApiClient` at `src/lib/api/nexus-api-client.ts` is the **single frontend API client** used by the store. It wraps `fetch()` calls to all API routes and handles:

- Error normalization (`NexusApiError`)
- Request/response typing
- Authentication headers

**Source**: `src/store/nexus-store.ts` imports `nexusApiClient` from `@/lib/api/nexus-api-client`

---

## Backend Service Module Map

| Module | Files | Domain |
|---|---|---|
| `api/` | 12 | API framework: handler, auth, errors, idempotency, validation |
| `artifacts/` | 7 | Artifact CRUD, materialization, references |
| `contracts/` | 6 | API envelope, feature flags, idempotency, layering, permission |
| `deployment/` | 6 | Deployment checks, feature flags, env validation, schema drift |
| `history/` | 6 | Message history, memory records, storage partition |
| `image-generation/` | 3 | Generated image cache, storage, postprocess |
| `models/` | 6 | AI gateway, model catalog, chat service, quotas, usage ledger |
| `new-api-admin/` | 1 | Token drift service |
| `new-api-token/` | 2 | Token crypto + user token service |
| `notebooks/` | 2 | Notebook repository + service |
| `observability/` | 9 | Events, metrics, traces, redaction, retention |
| `primitives/` | 5 | Errors, IDs, metadata, redaction, status |
| `prompts/` | 2 | Prompt repository + service |
| `runtime/` | 4 | Agent runtime sessions, provider adapter |
| `security/` | 11 | Auth, permissions, secret boundary, workspace identity |
| `sync/` | 7 | Sync queue, conflict resolution, operation applier |
| `tools/` | 6 | Tool execution, permissions, registry validation |
| `workspace/` | 8 | Session, state, snapshots, hydration, permissions |

---

## Frontend-Backend Coupling File Count

| Layer | File Count |
|---|---|
| Frontend UI components | 26 |
| Frontend store | 1 |
| API client | 1 |
| API routes | 57 |
| Backend services | 111 |
| **Total coupling files** | **196** |

---

*Evidence: Import statements traced from nexus-store.ts, component files, API route files, and backend service files*
*All file paths verified against filesystem scan*
*Supabase client usage traced through import of `getNexusSupabaseClient`*
