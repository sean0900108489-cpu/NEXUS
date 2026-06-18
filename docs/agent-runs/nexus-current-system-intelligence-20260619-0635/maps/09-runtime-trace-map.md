# Runtime Trace Map — NEXUS // AI OPS

## Overview

This map identifies routes and operations that would benefit from runtime trace capture. No actual traces were performed — this is a planning artifact for future `nexus-runtime-trace-recorder` use.

---

## Routes Requiring Runtime Trace

### Priority 1 — Core User Flows

| Route | Method | Trace Points | Risk Area |
|---|---|---|---|
| `POST /api/chat` | POST | Request → NewApiChatService → Provider call → Stream → Response | Model gateway, rate limiting, error handling |
| `POST /api/agent-stream` | POST | Request → AgentStreamService → SSE setup → Token streaming → Completion | Streaming reliability, reconnection |
| `POST /api/v1/workspaces/session` | POST | Auth check → WorkspaceSessionService → RPC call → Session binding | Auth boundary, workspace ownership |
| `POST /api/v1/tools/[toolId]/run` | POST | Authorization → ToolExecutionService → Executor adapter → Tool run record | Tool permission, execution timeout |
| `POST /api/memory-compress` | POST | Input validation → MemoryCompressService → LLM compression → Response | Compression quality, token limits |

### Priority 2 — Data Sync Flows

| Route | Method | Trace Points | Risk Area |
|---|---|---|---|
| `GET /api/v1/sync/operations` | GET | SyncQueueService → Operation polling → Conflict detection | Sync staleness, conflict resolution |
| `POST /api/v1/sync/operations/[operationId]/retry` | POST | Operation lookup → ConflictResolver → Replay | Idempotency, duplicate operations |
| `GET /api/v1/workspaces/recovery/latest` | GET | Snapshot lookup → Validation → Materialization | Snapshot integrity, data loss |

### Priority 3 — Observability & Admin

| Route | Method | Trace Points | Risk Area |
|---|---|---|---|
| `POST /api/v1/observability/events` | POST | Event validation → RedactionPipeline → SystemEventRepository | Event throughput, redaction safety |
| `GET /api/admin/new-api-token-drift` | GET | TokenDriftService → Token group comparison → Drift report | Security, credential exposure |
| `POST /api/v1/providers/verify` | POST | Provider config → HTTP health check → Status update | Network errors, timeout |

---

## Key Runtime State Machines (to trace)

### Agent Status Machine
```
idle → thinking → streaming → idle
                  ↘ error → idle
```

### Tool Run Status Machine
```
available → queued → running → done
                           ↘ error
                           ↘ cancelled
```

### Sync Operation Status Machine
```
pending → locked → completed
        ↘ failed → retry → ...
```

### Agent Branching Status Machine
```
idle → compressing → creating → done
                           ↘ error
```

### Deployment Check Flow
```
init → environment_validation → schema_drift_check → registry_consistency → complete
                                                                    ↘ failed
```

---

## Backend Services with Critical Runtime Paths

| Service | File | Runtime Dependencies |
|---|---|---|
| `NewApiChatService` | `backend/models/new-api-chat-service.ts` | AiGatewayService, QuotaGate, UsageLedger |
| `AgentStreamService` | `backend/api/agent-stream-service.ts` | Provider adapter, SSE transport |
| `WorkspaceSessionService` | `backend/workspace/workspace-session-service.ts` | Supabase RPC, auth.uid() |
| `ToolExecutionService` | `backend/tools/tool-execution-service.ts` | ToolExecutorAdapter, ToolPermissionGate, ToolRunRepository |
| `SyncQueueService` | `backend/sync/sync-queue-service.ts` | SyncOperationRepository, SyncConflictResolver |
| `ObservabilityService` | `backend/observability/observability-service.ts` | RedactionPipeline, SystemEventRepository |
| `MemoryCompressService` | `backend/api/memory-compress-service.ts` | LlmMemoryCompressor |
| `ArtifactService` | `backend/artifacts/artifact-service.ts` | ArtifactRepository, ArtifactMaterializer, Storage bucket |
| `DeploymentCheckService` | `backend/deployment/deployment-check-service.ts` | EnvironmentValidator, SchemaDriftChecker, RegistryConsistencyChecker |

---

## Trace Capture Points (recommended)

### Frontend-side
- Store action dispatches (zustand middleware)
- API client requests (nexusApiClient interceptor)
- Component render cycles (React DevTools or custom hook)
- View mode transitions (panels ↔ graph ↔ workflow-pro)

### Backend-side
- API route handler entry/exit
- Supabase query execution
- External provider HTTP calls
- Error boundaries and error normalization
- Idempotency key verification

---

## Current Observability Infrastructure

NEXUS already has an observability pipeline:
- `system_events` table — structured event storage
- `usage_metrics` table — aggregated metrics
- `trace-context-middleware.ts` — trace ID propagation
- `redaction-pipeline.ts` — PII/secret redaction before storage
- `observability-service.ts` — event ingestion service

Additional runtime trace recording would complement this existing infrastructure.

---

## Browser-side Trace Points

For `nexus-runtime-trace-recorder`:
- `localhost:3000/` — Main workspace page (core UX flow)
- `localhost:3000/style-lab` — Style lab (theme editing flow)
- All API calls visible in browser network tab
- Console messages from store, components
- DOM mutations from view mode switches

---

*Evidence: Route files from `src/app/api/**/route.ts`; backend service files from `src/lib/backend/**`; store action names from `src/store/nexus-store.ts`*
*No actual runtime traces performed — this is a planning map for future trace recording*
