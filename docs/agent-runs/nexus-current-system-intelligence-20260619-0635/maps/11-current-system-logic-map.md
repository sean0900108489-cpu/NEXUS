# Current System Logic Map — NEXUS // AI OPS

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (CLIENT)                            │
│                                                                     │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────────┐  │
│  │  React UI   │───▶│  Zustand Store   │───▶│  NexusApiClient   │  │
│  │  NexusOps   │◀───│  (nexus-store)   │◀───│  (fetch wrapper)  │  │
│  └─────────────┘    └──────┬───────────┘    └────────┬──────────┘  │
│                            │                          │             │
│                   ┌────────▼──────────┐               │             │
│                   │  IndexedDB        │               │             │
│                   │  (idb-keyval)     │               │             │
│                   │  Local Persist    │               │             │
│                   └───────────────────┘               │             │
│                                                       │             │
│  ┌────────────────────────────────────────────────────▼──────────┐  │
│  │  State Sync Manager (state-sync.ts)                           │  │
│  │  - MockStateSyncManager (fallback)                            │  │
│  │  - SupabaseStateSyncManager (cloud)                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       NEXT.JS SERVER                                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  App Router API Routes (57 route.ts files)                   │   │
│  │                                                              │   │
│  │  /api/chat ─────────────────▶ NewApiChatService              │   │
│  │  /api/agent-stream ─────────▶ AgentStreamService             │   │
│  │  /api/v1/agents/* ──────────▶ MessageHistoryService          │   │
│  │  /api/v1/artifacts/* ───────▶ ArtifactService                │   │
│  │  /api/v1/sync/* ────────────▶ SyncQueueService               │   │
│  │  /api/v1/tools/* ───────────▶ ToolExecutionService           │   │
│  │  /api/v1/workspaces/* ──────▶ WorkspaceSessionService        │   │
│  │  /api/v1/observability/* ───▶ ObservabilityService           │   │
│  │  /api/v1/feature-flags/* ───▶ FeatureFlagService             │   │
│  │  /api/v1/notebooks ─────────▶ NotebookService                │   │
│  │  /api/v1/prompts ───────────▶ PromptService                  │   │
│  │  /api/v1/providers/* ───────▶ Provider verification          │   │
│  │  /api/v1/workflows/* ───────▶ Workflow runtime trace         │   │
│  │  /api/memory-compress ──────▶ MemoryCompressService          │   │
│  │  /api/model-gateway/* ──────▶ AiGatewayService               │   │
│  │  /api/admin/* ──────────────▶ TokenDriftService              │   │
│  │  /api/tools/fs-scanner ─────▶ LocalFsScannerExecutor         │   │
│  │  /api/tools/web-surfer ─────▶ WebSurferExecutor              │   │
│  └──────────────┬───────────────────────────────────────────────┘   │
│                 │                                                    │
│  ┌──────────────▼───────────────────────────────────────────────┐   │
│  │  Backend Services (src/lib/backend/)                          │   │
│  │  - api/        (framework: handler, auth, errors, idempotency)│   │
│  │  - models/     (AI gateway, chat, quotas, usage ledger)       │   │
│  │  - sync/       (queue, conflicts, operations)                 │   │
│  │  - artifacts/  (CRUD, materialization, references)            │   │
│  │  - history/    (messages, memory, storage partition)          │   │
│  │  - tools/      (execution, permissions, validation)           │   │
│  │  - workspace/  (session, state, snapshots, hydration)         │   │
│  │  - observability/ (events, metrics, traces, redaction)        │   │
│  │  - deployment/ (checks, feature flags, drift detection)       │   │
│  │  - notebooks/  (CRUD, tombstone support)                      │   │
│  │  - prompts/    (CRUD, revisions, tombstone support)           │   │
│  │  - runtime/    (agent sessions, provider adapter)              │   │
│  │  - security/   (auth, permissions, secret boundary)           │   │
│  │  - new-api-token/ (crypto, user token service)               │   │
│  └──────────────┬───────────────────────────────────────────────┘   │
│                 │                                                    │
└─────────────────┼────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SUPABASE (Postgres)                           │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  26 Database Tables                                          │   │
│  │                                                              │   │
│  │  IDENTITY:          workspaces, workspace_memberships,        │   │
│  │                     workspace_agents, agent_profiles           │   │
│  │  STATE:             workspace_snapshots, state_entities       │   │
│  │  MESSAGING:         messages, agent_memory_records            │   │
│  │  RUNTIME:           agent_runtime_sessions, agent_tasks,      │   │
│  │                     agent_runtime_events                      │   │
│  │  TOOLS:             tool_runs, tool_permissions               │   │
│  │  ARTIFACTS:         artifacts, artifact_references            │   │
│  │  CONTENT:           notebooks, prompts, prompt_revisions,     │   │
│  │                     workflow_templates                        │   │
│  │  SYNC:              sync_operations, api_idempotency_keys     │   │
│  │  OPS:               feature_flags, deployment_checks          │   │
│  │  OBSERVABILITY:     system_events, usage_metrics              │   │
│  │  BILLING:           model_usage_ledger, user_new_api_tokens   │   │
│  │  AUDIT:             permission_audit_logs                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Storage Buckets                                             │   │
│  │  - nexus-generated-assets (images, 20MB limit)               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  RPC Functions (SECURITY DEFINER)                            │   │
│  │  - nexus_ensure_workspace_session()                          │   │
│  │  - record_permission_audit_log()                             │   │
│  │  - set_user_new_api_tokens_updated_at()                      │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Control Flow: Agent Chat (primary flow)

```
1. User types message in WorkspaceChatComposerShell
2. Click Send → store.addMessage(agentId, userMessage)
3. Store → nexusApiClient.chat({ messages, model, ... })
4. HTTP POST /api/chat
5. Route handler → NewApiChatService.chat()
6. NewApiChatService → AiGatewayService (select provider)
7. AiGatewayService → QuotaGate.check() (rate limiting)
8. AiGatewayService → HTTP to external model provider
9. Response stream → store.appendToMessage() per token
10. On complete → store.finishMessage()
11. Ui updates → NexusAgentWindow re-renders
12. UsageLedger.record() → model_usage_ledger table (async)
```

---

## Control Flow: Agent Branching

```
1. User clicks branch button on agent window
2. AgentBranchModal opens
3. User configures compression (mode, ratio, profile)
4. Submit → store.branchAgent(sourceAgentId, config)
5. Store → LlmMemoryCompressor.compress(messages, config)
6. Compressor → POST /api/memory-compress
7. Server → MemoryCompressService → LLM call
8. Compressed result → ICompressedMemoryResult
9. Store → spawnAgent with compressed context
10. UI → new agent window appears
```

---

## Control Flow: Workspace Sync

```
Background (periodic or on action):
1. store.saveWorkspaceSnapshot()
2. createWorkspaceSnapshot(workspace) → WorkspaceSnapshot
3. supabaseStateSyncManager.push(snapshot)
4. HTTP POST /api/v1/workspaces/session (if needed)
5. SupabaseStateSyncManager → upsert workspace_snapshots
6. Response → sync status update in store
7. On conflict → SyncConflictResolver.resolve()
8. Resolution → SyncOperationApplier.apply()
```

---

## Control Flow: Tool Execution

```
1. Agent requests tool execution
2. POST /api/v1/tools/[toolId]/run
3. ToolExecutionService.validate()
4. ToolPermissionGate.check() → tool_permissions table
5. If high risk → requires confirmation
6. ToolExecutorAdapter.execute(input)
7. If local-fs → LocalFsScannerExecutor
8. If rest-api → WebSurferExecutor
9. ToolRunRepository.create() → tool_runs table
10. Response → tool run result back to agent
```

---

## State Machine: View Modes

```
         ┌──────────┐
    ┌───▶│  panels  │◀───┐
    │    └─────┬────┘    │
    │          │         │
    │    ┌─────▼────┐    │
    ├────│  graph   │────┤
    │    └─────┬────┘    │
    │          │         │
    │    ┌─────▼────┐    │
    └───▶│workflow- │◀───┘
         │   pro    │
         └──────────┘
```

Transition via store.setViewMode() triggered by top bar toggle buttons.

---

## Error Flow Architecture

```
Component Error
  → store action error handling
  → NexusApiError normalization (nexus-api-client.ts)
  → API route error → ApiErrorResponse (api-errors.ts)
  → Backend service → typed error codes
  → Supabase error → PostgreSQL error codes
  → Observability event (system_events table)
```

---

## Authentication Flow

```
1. AuthScreen renders → Supabase auth UI
2. User logs in via Supabase Auth
3. store.login(user) → sets authVault.user
4. API calls → include Supabase session token
5. Server routes → validate via auth-session.ts
6. RLS policies → check auth.uid() against owner/role
7. Optional: provider API keys → set via auth vault
```

---

*Evidence: Data flow traced from component imports → store calls → API client → route handlers → backend services → Supabase client*
*Control flows inferred from store action implementations and route handler patterns*
*State machines from type definitions in `nexus-types.ts` and store logic*
