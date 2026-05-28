# NEXUS Codex Execution Map

Generated: 2026-05-28
Version: V14
Scope: Codex Execution Map / 施作索引層。This file is documentation only and does not change app behavior.

## 1. Purpose

This map is the execution navigation layer for future Codex work on NEXUS // AI OPS. It is not a roadmap and not a replacement for the architecture scans. Its job is to translate a demand into the right implementation path:

需求類型 -> 應讀檔案 -> source of truth -> 應改定義 -> 應接 API/service -> 應碰前端狀態 -> 應補測試 -> 禁止污染

Use this file when a change mentions frontend/backend/function architecture, iteration safety, already-defined data/definitions/rules, no duplicate internal expansion, no pollution boundaries, unclear coupling, or future zero-friction maintainability.

## 2. Starting State

- Framework state: Next.js 16.2.6, React 19.2.6, App Router route handlers under `src/app/api/**/route.ts`. Per local `AGENTS.md`, relevant docs under `node_modules/next/dist/docs/` must be read before writing Next.js code.
- Current architecture foundation: V1 security, V2 API envelope/idempotency, V3 cloud snapshots, V4 durable sync queue, V5 deployment/flags, V6 runtime sessions/tasks, V7 tool runs/permissions, V8 artifacts, V9 observability, V10 history/memory.
- Current customization foundation: V11/V13 model/profile customization lives on `NexusAgent.modelSettings`, `NexusAgent.executionPrompt`, `NexusAgent.profileLocked`, and `WorkspaceSettings.agentTemplateProfiles`.
- Current state hygiene foundation: V15 bumped Zustand persist to version `14` and adds `NexusAgent.localPersistence` metadata so local persistence records preserve-full message/memory policy while durability remains unproven.
- Current source-of-truth rule: schema-first, registry-first, local-first, service-first. Extend an existing slot before adding a new container.
- Current unresolved state: multiple items remain `Needs verification`; this map carries them forward instead of treating them as solved.

## 3. Goal

Every future implementation should be easy for Codex and maintainers to land without friction:

- Identify the demand class before coding.
- Read the exact source files for that class.
- Extend canonical types, registries, services, routes, store actions, and UI surfaces in the existing order.
- Avoid duplicate registries, second queues, shadow stores, direct Supabase writes from UI, and secret persistence.
- Route verification to the smallest useful test set plus type/lint/build checks when risk requires.
- Mark unclear links as `Needs verification` instead of guessing.

## 4. V14 Content Weights

| Weight | Area | How this file applies it |
| --- | --- | --- |
| 18% | Source-of-truth routing | Every demand class points to canonical files, types, registries, services, and route boundaries. |
| 16% | No-duplicate / no-pollution | Explicit bans cover second sync queue, parallel registry, shadow store, direct DB writes, and secret persistence. |
| 14% | Frontend/backend/function coupling | Route maps connect UI surfaces, Zustand state, API clients, route handlers, services, repositories, and durable records. |
| 13% | Demand-type playbooks | Fifteen demand classes include first-read files, source of truth, steps, bans, and verification. |
| 11% | Verification/test routing | Verification matrix maps change type to tests and command levels. |
| 10% | Current Needs Verification integration | Existing unresolved items are preserved and attached to relevant playbooks. |
| 8% | Performance/state hygiene | Zustand, IndexedDB, history, sync, streaming, and render boundaries are called out. |
| 6% | Visual/theme customization boundaries | Theme/customization has its own source-of-truth path and pollution bans. |
| 4% | Maintainer/Codex readability | The file is structured as a first-pass execution index for new threads. |

Total: 100%.

## 5. Process Description

The user's demand terms and the generated scan terms were merged before writing this map.

User demand terms:

- 前端後端功能端架構
- 迭代行動
- 有哪些資料、哪些定義、哪些規則
- 已經有定義了不要重複
- 網內深入擴充
- 不能污染
- 新版落地時狀況梳理乾淨
- 功能不對勁、架構不清楚、耦合不完整都要讀得出或推理得出
- 零摩擦性、穩定性、強架構邏輯
- 額外功能、前端梳理、速度、功能層、擴充層、後端溝通、系統循環、外觀可客製化、Codex 可讀性

Generated scan terms:

- `SCAN FIRST`, `@rule`, `@boundary`, `Do not`, `禁止`, `Needs verification`
- `CAPABILITY_REGISTRY`, `TOOL_SLOT_REGISTRY`, `TOOL_EXECUTOR_REGISTRY`, `NEXUS_MODEL_CATALOG`, `HANDOFF_RULE_REGISTRY`
- `WorkflowRuntimeLite`, `modelSettings`, `agentTemplateProfiles`, `executionPrompt`, `profileLocked`
- `apiHandler`, `nexusApiClient`, `IStateSyncManager`, `IAsyncDataFetcher`, `localSyncQueueAdapter`
- `PermissionService`, `SecretBoundaryService`, `AgentRuntimeService`, `ToolExecutionService`, `ArtifactService`, `MessageHistoryService`, `ObservabilityService`

## 6. Process Rules

1. Read this file first, then the demand-specific files below.
2. If the task touches Next.js route handlers, read the local Next.js docs before coding:
   - `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
   - `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
3. Use existing source-of-truth definitions before adding a new definition.
4. Normal `/api/v1` JSON routes should use `apiHandler`; exceptions are streaming routes and documented special probes such as provider verification.
5. Components should not write directly to Supabase. Use `nexusApiClient`, `IStateSyncManager`, local sync queue adapter, or domain services.
6. Historical data must not enter Zustand root persistence or IndexedDB root state as unbounded transcript/artifact/tool-output payloads.
7. Do not create a second sync queue, parallel registry, shadow store, hidden autonomous routing state, or one-off route contract.
8. Do not persist `apiKey`, `baseUrl`, auth tokens, provider tokens, service-role keys, or raw secrets on agents, snapshots, artifacts, sync payloads, logs, or frontend bundle.
9. If a full path cannot be proven from source, mark it `Needs verification` and stop short of behavioral implementation.
10. Documentation-only tasks must verify that TypeScript, TSX, API route, migration, Zustand store, and app behavior files were not modified.

## 7. Universal First-Read Checklist

Before implementation, read in this order:

1. `AGENTS.md`
2. This file: `NEXUS_CODEX_EXECUTION_MAP.md`
3. `ARCHITECTURE.md`
4. `NEXUS_TOTAL_ARCHITECTURE_SCAN.md`
5. `NEXUS_POST_V10_ARCHITECTURE_SCAN.md`
6. `src/lib/nexus-types.ts`
7. `src/lib/nexus-registry.ts`
8. Demand-specific service, route, store, component, and test files from the playbook below.

For routing/API tasks, also inspect:

- `src/lib/backend/contracts/layering.ts`
- `src/lib/backend/api/api-handler.ts`
- `src/lib/api/nexus-api-client.ts`
- `src/app/api/**/route.ts`

## 8. Demand Classifier

| # | Demand class | Typical signal | Primary landing zone |
| --- | --- | --- | --- |
| 1 | New agent capability | New agent kind, capability, operator, role, tool access | Types + capability registry + defaults + UI spawn path |
| 2 | New model/provider | New provider, model id, model tuning, provider verify | Model catalog + provider registry + runtime adapter |
| 3 | New tool/executor | Real tool, executor, web/file/image/video integration | Tool slot/executor registry + tool service |
| 4 | New API route | New backend endpoint or client contract | Shared types + `apiHandler` + domain service + client |
| 5 | New DB field/table | Durable backend data, migration, RLS, repository | Migration + database types + backend repository/service |
| 6 | New UI panel/surface | Panel, rail, modal, window, settings UI | `nexus-ops.tsx` surfaces + store action/selectors |
| 7 | New graph/runtime node | Visual workflow node, runtime node, handoff edge | Graph/runtime types + registries + runtime lite |
| 8 | Streaming/runtime change | Agent stream, runtime sessions/tasks, retry, provider invocation | Runtime service + stream route + adapter |
| 9 | Artifact flow change | Artifact create/list/get/archive/reference/version/materialize | Artifact types + service + routes + fetcher |
| 10 | History/memory change | Historical messages, memory records, compression, archive | History service + fetchers + memory profile registry |
| 11 | Sync change | Queue, offline/local persistence, snapshot, flush/retry/cancel | `IStateSyncManager` + local sync queue + sync services |
| 12 | Observability/deployment change | Events, metrics, traces, feature flags, checks | Observability/deployment services + routes |
| 13 | Theme/customization change | Visual theme, model/profile custom settings, template tuning | Theme config + V11/V13 profile fields |
| 14 | Performance/render upgrade | Speed, render churn, root state size, pagination | Store selectors + component boundaries + data paging |
| 15 | Codex/documentation-only upgrade | Better execution docs, scan maps, prompts | Markdown architecture docs only |

## 9. Execution Playbooks

### 9.1 New Agent Capability

- Signal: new agent type, new operator behavior, new capability tag, or new default tool access.
- First-read files: `src/lib/nexus-types.ts`, `src/lib/nexus-registry.ts`, `src/lib/nexus-defaults.ts`, `src/store/nexus-store.ts`, `src/components/nexus/nexus-ops.tsx`, `src/lib/workspace-kernel.test.ts`.
- Source of truth: `AgentCapabilityType`, `AgentCreationCapabilityType`, `CAPABILITY_REGISTRY`, `NexusAgent.capabilities`, `AgentTool`, default agent factories and templates.
- Correct steps: add or extend shared type; add `CAPABILITY_REGISTRY` entry; wire default model/tool slots; update defaults/templates; expose UI only through existing spawn/customization paths; add tests for defaults and workspace sanitization.
- Bans: no parallel capability enum, no callsign-based grants, no one-off UI-only capability map, no direct backend behavior before registry/type exists.
- Verification: `npm run typecheck`; targeted `npm run test -- src/lib/workspace-kernel.test.ts`; capability/default behavior test or manual spawn check.

### 9.2 New Model Or Provider

- Signal: new model id, provider, reasoning/verbosity control, provider verification, or model selection UI change.
- First-read files: `src/lib/nexus-registry.ts`, `src/lib/nexus-types.ts`, `src/lib/backend/runtime/provider-adapter.ts`, `src/lib/backend/runtime/agent-runtime-service.ts`, `src/app/api/v1/providers/verify/route.ts`, `src/components/nexus/nexus-ops.tsx`.
- Source of truth: `PROVIDER_REGISTRY`, `NEXUS_MODEL_CATALOG`, `ModelCapabilityProfile`, `normalizeAgentModelSettings`, `NexusAgent.modelSettings`.
- Correct steps: register provider/model; extend capability profile if needed; normalize settings in shared helper; connect runtime adapter; keep UI lists derived from registry; keep provider verification as a documented special probe when it cannot use the normal API envelope.
- Bans: no provider/model tuning list inside UI components, no second model settings store, no provider secret on agents/snapshots/logs/frontend bundle, no unregistered model id accepted by runtime.
- Verification: `npm run typecheck`; `npm run test -- src/lib/backend/runtime/agent-runtime.test.ts src/lib/workflow-runtime-lite/llm-client.test.ts`; provider verify manual/API check when credentials are involved.

### 9.3 New Tool Or Executor

- Signal: new executable tool, real provider integration, local scanner, web surfer, image/video generator, or tool alias.
- First-read files: `src/lib/nexus-registry.ts`, `src/lib/tool-executors.ts`, `src/lib/backend/tools/tool-execution-service.ts`, `src/lib/backend/tools/tool-registry-validator.ts`, `src/app/api/v1/tools/[toolId]/run/route.ts`, `src/app/api/v1/tool-runs/**/route.ts`.
- Source of truth: `TOOL_SLOT_REGISTRY`, `TOOL_EXECUTOR_REGISTRY`, `toolExecutors`, `RealToolExecutorType`, `ToolExecutionService`, `ToolPermissionGate`.
- Correct steps: add shared executor type if needed; register slot and executor; validate aliases/fallbacks; route execution through `ToolExecutionService`; connect permission gate; add UI trigger through existing agent/tool surfaces.
- Bans: no second executor map, no direct component-to-tool execution bypass, no tool output secrets in logs/artifacts/sync, no route that bypasses permission and confirmation requirements.
- Verification: `npm run test -- src/lib/backend/tools/tool-execution.test.ts`; registry consistency checker if slot aliases change; `npm run typecheck`.

### 9.4 New API Route

- Signal: new `/api/v1` endpoint, new frontend API call, new contract envelope, or new backend action.
- First-read files: Next route handler docs, `src/lib/backend/contracts/layering.ts`, `src/lib/backend/api/api-handler.ts`, `src/lib/api/nexus-api-client.ts`, `src/lib/nexus-types.ts`, nearest existing route under `src/app/api/v1/**/route.ts`.
- Source of truth: shared request/response types in `nexus-types.ts`, `apiHandler`, `NexusApiResponse`, `nexusApiClient`, domain service/repository.
- Correct steps: define shared contract; implement validation and permission path; call domain service; expose route through `apiHandler`; call from frontend with `nexusApiClient`; add idempotency if mutation semantics require it.
- Bans: no ad-hoc JSON envelope for normal `/api/v1`; no direct DB writes from route when a service exists; no direct Supabase writes from components; no route segment that conflicts with a `page.tsx`.
- Verification: `npm run test -- src/lib/backend/api/api-contract.test.ts`; targeted service tests; `npm run typecheck`.

### 9.5 New DB Field Or Table

- Signal: durable data, multi-user state, persistent workflow/runtime record, audit table, or backend-owned relationship.
- First-read files: `supabase/**`, `src/lib/supabase/database.types.ts`, `src/lib/nexus-types.ts`, relevant backend repository/service, route, and tests.
- Source of truth: migration SQL, generated-style `database.types.ts`, shared domain types, backend repository/service, RLS/permission policy.
- Correct steps: add migration; update DB TypeScript shape; update shared contract; update repository and service; add permission and secret boundary checks; update snapshot/import/export only when durable semantics require it.
- Bans: no DB column without domain type alignment, no route direct-to-table write when service/repository owns it, no secret-bearing column unless explicitly backend-only and redacted, no migration-like behavior hidden in app code.
- Verification: schema/type tests where present; `npm run test -- src/lib/backend/security/security-migration.test.ts src/lib/backend/workspace/workspace-state.test.ts`; `npm run typecheck`.

### 9.6 New UI Panel Or Surface

- Signal: new left/right rail section, settings sidebar, modal, window, datapad view, graph overlay, or control surface.
- First-read files: `src/components/nexus/nexus-ops.tsx`, `src/components/nexus/nexus-graph.tsx`, `src/store/nexus-store.ts`, `src/lib/nexus-types.ts`, nearby UI tests if added later.
- Source of truth: existing component surface ownership, store actions/selectors, z-index tiers, workspace layout types.
- Correct steps: place the UI in the existing surface; add typed store action only if state is shared; derive data from existing selectors/API client; preserve panel geometry and accessibility patterns; keep backend effects behind services/actions.
- Bans: no shadow store for panel state, no permanent canvas UI above established z tiers unless it must cover the target rail, no app-wide behavior inside presentational leaf components, no hard-coded provider/model/capability lists.
- Verification: `npm run lint`; `npm run typecheck`; browser/manual verification for layout, overflow, and interaction.

### 9.7 New Graph Or Runtime Node

- Signal: new visual graph node, workflow step, runtime node, edge/handoff behavior, or execution topology.
- First-read files: `src/lib/nexus-types.ts`, `src/lib/nexus-registry.ts`, `src/lib/workflow-runtime-lite/state.ts`, `src/lib/workflow-runtime-lite/registry.ts`, `src/lib/workflow-runtime-lite/runner.ts`, `src/lib/workflow-runtime-lite/topology.ts`, `src/components/nexus/nexus-graph.tsx`, `src/store/nexus-store.ts`.
- Source of truth: `WorkflowGraphNodeType`, `WorkflowRuntimeNodeType`, `GRAPH_NODE_REGISTRY`, `HANDOFF_RULE_REGISTRY`, `WorkflowRuntimeLiteState`, runtime-lite registry.
- Correct steps: add shared type; register graph node; add runtime-lite node definition if executable; update topology validation; update UI renderer; connect store actions and run path; test topology and runner behavior.
- Bans: no React Flow node before schema/registry exists, no hidden autonomous routing outside registry-backed workflow model, no handoff behavior encoded only in UI.
- Verification: `npm run test -- src/lib/workflow-runtime-lite/runner.test.ts src/lib/workflow-engine.test.ts`; `npm run typecheck`; graph manual check if UI changes.

### 9.8 Streaming Or Runtime Change

- Signal: agent stream, task lifecycle, cancellation, retry, provider adapter change, runtime session, or stream observability.
- First-read files: `src/lib/nexus-types.ts`, `src/lib/backend/api/agent-stream-service.ts`, `src/lib/backend/runtime/agent-runtime-service.ts`, `src/lib/backend/runtime/provider-adapter.ts`, `src/app/api/v1/agents/[agentId]/stream/route.ts`, `src/app/api/agent-stream/route.ts`, `src/lib/stream-retry.test.ts`.
- Source of truth: `AgentStreamRequest`, `AgentRuntimeService`, provider adapter, task/session types, stream routes, stream retry helper.
- Correct steps: update shared stream contract; keep task lifecycle in runtime service; handle permission and secret redaction; emit observability safely; project only active UI state into Zustand.
- Bans: no full raw stream/event history in Zustand root persistence, no provider response secrets in logs, no runtime lifecycle keyed only to `agent.status`, no unregistered model execution.
- Verification: `npm run test -- src/lib/backend/runtime/agent-runtime.test.ts src/lib/stream-retry.test.ts src/lib/mock-stream.test.ts`; manual stream check when UI/route changes.

### 9.9 Artifact Flow Change

- Signal: create/list/get/archive/reference/version/materialize artifact, tool output artifact, or historical artifact fetch.
- First-read files: `src/lib/nexus-types.ts`, `src/lib/backend/artifacts/artifact-service.ts`, `src/lib/backend/artifacts/artifact-materializer.ts`, `src/app/api/v1/artifacts/**`, `src/lib/state-sync.ts`, `src/lib/backend/history/historical-data-fetcher.ts`.
- Source of truth: artifact domain types, `ArtifactService`, artifact repository/materializer, artifact routes, artifact references and versions.
- Correct steps: extend artifact type/status/reference contract; update service and route validation; wire materializer if tool/runtime output creates artifacts; keep frontend access through API/fetcher; update sync only with bounded references.
- Bans: no binary/full artifact payloads in Zustand root state, no duplicate archive semantics, no tool output materialization bypassing secret checks, no historical artifact assumption until fetcher stub is resolved.
- Verification: `npm run test -- src/lib/backend/artifacts/artifact-service.test.ts`; route/API tests if contract changes; mark historical artifact path `Needs verification` if unresolved.

### 9.10 History Or Memory Change

- Signal: historical messages, memory records, memory compression, archive window, cursor paging, context carry-forward.
- First-read files: `src/lib/nexus-types.ts`, `src/lib/backend/history/message-history-service.ts`, `src/lib/backend/history/historical-data-fetcher.ts`, `src/lib/backend/history/agent-memory-record-repository.ts`, `src/lib/backend/api/memory-compress-service.ts`, `src/lib/nexus-registry.ts`.
- Source of truth: `IAsyncDataFetcher`, `HistoricalDataFetcher`, `MessageHistoryService`, `AgentMemoryRecordRepository`, `MEMORY_COMPRESSION_PROFILE_REGISTRY`, message archive routes.
- Correct steps: add/extend shared history/memory types; route pagination through history service; use memory compression profile registry; keep active UI cache bounded; store durable history/memory in backend-owned paths.
- Bans: no full historical messages/memory/artifacts in Zustand or IndexedDB root state, no one-off compression prompt, no memory write endpoint assumption while current API exposes only GET, no cursor tie-breaker assumption without verification.
- Verification: `npm run test -- src/lib/backend/history/message-history-service.test.ts`; memory compression tests if touched; preserve related `Needs verification` notes.

### 9.11 Sync Change

- Signal: offline queue, local persistence, snapshot sync, retry/cancel, conflict resolver, state flush, import/export sync interaction.
- First-read files: `src/lib/nexus-types.ts`, `src/lib/state-sync.ts`, `src/lib/sync/local-sync-queue-adapter.ts`, `src/lib/backend/sync/sync-queue-service.ts`, `src/lib/backend/sync/sync-conflict-resolver.ts`, `src/app/api/v1/sync/**`, `src/store/nexus-store.ts`.
- Source of truth: `IStateSyncManager`, `SupabaseStateSyncManager`, `localSyncQueueAdapter`, `SyncQueueService`, `SyncOperationApplier`, sync operation types.
- Correct steps: extend existing sync entity/operation types; enqueue via `localSyncQueueAdapter`; flush through `/api/v1/sync/operations`; handle status/retry/cancel through existing routes; run secret/payload guards.
- Bans: no second sync queue, no duplicate local IndexedDB queue, no unbounded payloads, no direct component-to-Supabase writes, no claim that message operation application is complete without checking `SyncOperationApplier`.
- Verification: `npm run test -- src/lib/backend/sync/sync-queue.test.ts src/lib/sync/local-sync-queue-adapter.test.ts`; queue status manual check if UI changes.

### 9.12 Observability Or Deployment Change

- Signal: system events, usage metrics, traces, feature flags, deployment checks, health/config route.
- First-read files: `src/lib/backend/observability/observability-service.ts`, `src/lib/backend/observability/redaction-pipeline.ts`, `src/app/api/v1/observability/**`, `src/lib/backend/deployment/**`, `src/app/api/v1/deployment/**`, `src/app/api/v1/feature-flags/**`.
- Source of truth: `ObservabilityService`, redaction pipeline, deployment check service, feature flag service, public config route, permission service.
- Correct steps: add event/metric/trace contract; redact before storage/output; route list/aggregate through observability service; update deployment/flag service instead of UI-only toggles; keep checks permissioned.
- Bans: no raw prompt/tool/provider secrets in telemetry, no second audit log for permission events, no cursor ordering assumption for duplicate timestamps without verification.
- Verification: `npm run test -- src/lib/backend/observability/observability-service.test.ts src/lib/backend/deployment/deployment-services.test.ts src/lib/backend/deployment/deployment-api.test.ts`; `npm run typecheck`.

### 9.13 Theme Or Customization Change

- Signal: visual theme, app appearance customization, per-agent prompt/model tuning, template profile settings, theme engine controls.
- First-read files: `src/lib/nexus-types.ts`, `src/lib/nexus-registry.ts`, `src/lib/nexus-defaults.ts`, `src/store/nexus-store.ts`, `src/components/nexus/nexus-ops.tsx`, global style files if changing tokens.
- Source of truth: `WorkspaceThemeConfig`, `LegoThemeEngineControls`, semantic CSS variables, `NexusAgent.modelSettings`, `NexusAgent.executionPrompt`, `NexusAgent.profileLocked`, `WorkspaceSettings.agentTemplateProfiles`.
- Correct steps: decide whether the change is visual theme or agent/model customization; add typed config field; normalize through defaults/store; render through existing controls; keep provider/model options registry-driven.
- Bans: no second model settings store, no second custom prompt/profile store, no second template customization store, no hard-coded global colors when a semantic variable exists, no secret-bearing provider config in customization payloads.
- Verification: `npm run typecheck`; `npm run lint`; browser/manual theme and settings persistence check when UI changes.

### 9.14 Performance Or Render Upgrade

- Signal: speed, render churn, scroll lag, graph lag, stream UI pressure, large persisted state, pagination/caching issue.
- First-read files: `src/store/nexus-store.ts`, `src/lib/nexus-types.ts`, `src/lib/state-sync.ts`, `src/components/nexus/nexus-ops.tsx`, `src/components/nexus/nexus-graph.tsx`, `src/lib/backend/history/message-history-service.ts`.
- Source of truth: tiered state boundary in `nexus-types.ts`, Zustand store partialization, history/artifact pagination, component selectors, runtime-lite state normalization.
- Correct steps: measure the hot path; move durable or historical data behind fetchers/services; narrow selectors; preserve active interaction state only; avoid sync effect patterns rejected by React lint; keep graph/runtime updates typed.
- Bans: no unbounded canvas/history/tool output in Zustand persist, no effect that only mirrors `checked` into state, no frontend cache that duplicates backend history as canonical, no performance fix that skips source-of-truth contracts.
- Verification: `npm run lint`; `npm run typecheck`; targeted tests for touched state/service; browser profiling or manual stress check when visual interaction changes.

### 9.15 Codex Or Documentation-Only Upgrade

- Signal: prompt/map/readability upgrade, scan consolidation, architecture index, execution guide, no behavior change requested.
- First-read files: `AGENTS.md`, requested prompt file, architecture scans, `ARCHITECTURE.md`, relevant source files only for inspection.
- Source of truth: existing Markdown architecture docs plus inspected code reality.
- Correct steps: read prompt; scan required terms; generate/update Markdown; preserve unresolved `Needs verification`; include demand classes, source-of-truth routes, bans, and verification; confirm no code changes.
- Bans: no TypeScript/TSX/API route/migration/Zustand/app behavior edits, no pretending unresolved items are solved, no contradictory rules unless the architecture docs are intentionally updated.
- Verification: `rg` headings/keywords in generated doc; `git status --short`; confirm no code diff.

## 10. Frontend Route Map

| Surface | File | Role | Coupling rules |
| --- | --- | --- | --- |
| App entry | `src/app/page.tsx` | Mounts NEXUS workbench | Keep page as entry; route behavior belongs in App Router files. |
| Main shell | `src/components/nexus/nexus-ops.tsx` | Coordinates top bar, panels, windows, stream actions, artifact/history fetches | Do not turn shell into new source of truth; connect through store/API/services. |
| Top bar | `TopBar` in `nexus-ops.tsx` | Global workspace controls and status | Use existing store actions and status projections. |
| Left dock | `LeftDock` in `nexus-ops.tsx` | Operators, templates, model/profile tuning entry points | Model/provider lists must derive from registry. |
| Agent window | `AgentWindow` in `nexus-ops.tsx` | Active chat/agent interaction | Keep historical pages behind history APIs/fetchers. |
| Center canvas | `SandboxCanvas` in `nexus-ops.tsx` | Main workbench and media/artifact surface | Do not persist unbounded canvas history in root Zustand. |
| Graph | `src/components/nexus/nexus-graph.tsx` | Visual workflow and runtime graph | Node types must exist in shared types/registries first. |
| Right intel | `RightIntel` in `nexus-ops.tsx` | Metrics, sync, events, artifacts, status | Data comes from APIs/projections, not direct backend access. |
| Settings sidebar | `AgentSettingsSidebar` in `nexus-ops.tsx` | Per-agent profile/model/tool controls | Use `NexusAgent.modelSettings`, `executionPrompt`, `profileLocked`. |
| Theme controls | `LegoThemeEngineControls` in `nexus-ops.tsx` | Appearance/theme controls | Use typed theme config and semantic variables. |
| Branch modal | `src/components/nexus/AgentBranchModal.tsx` | Agent branching/model selection | Use `NEXUS_MODEL_CATALOG`; no local model map. |

## 11. Backend Route Map

Normal `/api/v1` JSON routes should use `apiHandler`, shared request/response types, permission checks, and domain services. Streaming routes and documented special probes are exceptions.

| Route group | Files | Normal service path | Notes |
| --- | --- | --- | --- |
| Legacy stream/tools | `src/app/api/agent-stream`, `image-gen`, `memory-compress`, `predictive-intel`, `system-status`, `tools/**` | Legacy/mock/specialized handlers | Prefer `/api/v1` for new stable contracts. |
| Agent history | `src/app/api/v1/agents/[agentId]/messages/**`, `memory` | `MessageHistoryService`, `AgentMemoryRecordRepository` | Memory records currently expose GET path; write path remains `Needs verification`. |
| Agent stream | `src/app/api/v1/agents/[agentId]/stream/route.ts` | `AgentRuntimeService` / stream service | Streaming exception to normal JSON envelope. |
| Agent tasks | `src/app/api/v1/agents/[agentId]/tasks/**` | `AgentRuntimeService` | Create/status/cancel task lifecycle. |
| Memory compress | `src/app/api/v1/agents/memory-compress/route.ts` | memory compression service | Profiles come from `MEMORY_COMPRESSION_PROFILE_REGISTRY`. |
| Artifacts | `src/app/api/v1/artifacts/**` | `ArtifactService` | Create/list/get/archive/references/versions. |
| Deployment | `src/app/api/v1/deployment/checks/**` | deployment check service | Permissioned check runs/latest result. |
| Feature flags | `src/app/api/v1/feature-flags/**` | feature flag service | Do not duplicate toggle state in UI as canonical. |
| Health/config | `src/app/api/v1/health`, `public-config` | public health/config handlers | Public config must not expose secrets. |
| Observability | `src/app/api/v1/observability/**` | `ObservabilityService` | Redact before persistence/response. |
| Provider verify | `src/app/api/v1/providers/verify/route.ts` | provider verification path | Documented special probe; do not persist provided secrets. |
| Sync | `src/app/api/v1/sync/**` | `SyncQueueService`, conflict resolver, operation applier | Single durable queue path; no second queue. |
| Tool runs | `src/app/api/v1/tool-runs/**` | `ToolExecutionService` | Runs, confirmation, cancellation. |
| Tool execute | `src/app/api/v1/tools/[toolId]/run/route.ts` | `ToolExecutionService` | Validate against tool registries and permission gate. |
| Workspace state | `src/app/api/v1/workspaces/[workspaceId]/state/route.ts` | workspace state service/permission | Snapshot/state boundary; no direct component writes. |

## 12. Data Boundary Map

| Data class | Allowed location | Not allowed |
| --- | --- | --- |
| Active UI interaction | Zustand store, component state, typed workspace layout | Treating root Zustand/IndexedDB as durable history database. |
| Active agent messages | V15 local persistence metadata plus future bounded active window after durability is proven | Full historical transcript treated as durable just because it is in Zustand root persistence. |
| Historical messages | `MessageHistoryService`, message routes, `HistoricalDataFetcher` | Component-local permanent history cache as canonical source. |
| Agent memory records | Backend memory repository/service and explicit routes | Assuming durable memory writes exist beyond scanned API surface. |
| Artifacts | `ArtifactService`, artifact routes, materializer, references/versions | Full artifact binaries/tool outputs in root state or sync queue. |
| Sync operations | `localSyncQueueAdapter`, `/api/v1/sync/operations`, backend sync services | Second queue, shadow queue, duplicate IndexedDB queue. |
| Runtime sessions/tasks | `AgentRuntimeService`, task/session tables/types/routes | Lifecycle encoded only as `agent.status`. |
| Tool runs/permissions | `ToolExecutionService`, permission gate, tool run routes | Component-triggered execution without permission/confirmation path. |
| Provider/model settings | `NEXUS_MODEL_CATALOG`, provider registry, `NexusAgent.modelSettings` | UI-local model maps, secret-bearing settings on agents. |
| Theme/customization | `WorkspaceThemeConfig`, semantic variables, existing theme controls | Untyped global colors or hidden appearance stores. |
| Observability | `ObservabilityService`, redaction pipeline, observability routes | Raw prompts, provider secrets, unredacted tool input/output. |
| Secrets | Backend-only env/provider vault verification path | Agents, snapshots, sync payloads, artifacts, logs, frontend bundle. |

## 13. Registry Map

| Registry/source | File | Owns | Add here before |
| --- | --- | --- | --- |
| `PROVIDER_REGISTRY` | `src/lib/nexus-registry.ts` | Provider ids, labels, provider-level metadata | Provider UI lists or verify paths. |
| `NEXUS_MODEL_CATALOG` | `src/lib/nexus-registry.ts` | Exact model ids and capability profiles | Model selectors, runtime acceptance, workflow nodes. |
| `MEMORY_COMPRESSION_PROFILE_REGISTRY` | `src/lib/nexus-registry.ts` | Compression prompts/profiles | Memory compression UI/service variants. |
| `CAPABILITY_REGISTRY` | `src/lib/nexus-registry.ts` | Agent capability slots and default tool slots | Agent defaults, spawn UI, tool grants. |
| `GRAPH_NODE_REGISTRY` | `src/lib/nexus-registry.ts` | Visual workflow node slots | React Flow renderers or runtime nodes. |
| `TOOL_EXECUTOR_REGISTRY` | `src/lib/nexus-registry.ts` | Real executor implementations by executor type | Tool execution services/routes. |
| `TOOL_SLOT_REGISTRY` | `src/lib/nexus-registry.ts` | Tool slot ids, aliases, providers, fallbacks | UI tool buttons or executor aliases. |
| `HANDOFF_RULE_REGISTRY` | `src/lib/nexus-registry.ts` | L2 handoff routing starting point | Autonomous routing or edge logic. |
| Runtime-lite registry | `src/lib/workflow-runtime-lite/registry.ts` | Executable runtime-lite node definitions | Runner behavior and graph UI execution. |

## 14. Verification Matrix

| Change type | Minimum verification | Expand verification when |
| --- | --- | --- |
| Documentation-only | `rg` key headings/terms; `git status --short`; confirm no code diff | Docs alter architecture rules or contradict prior scans. |
| Type/registry/defaults | `npm run typecheck`; targeted registry/default tests | A registry drives backend/runtime behavior. |
| API route/contract | `npm run test -- src/lib/backend/api/api-contract.test.ts`; targeted service tests | Route mutates durable data, permission, sync, or secrets. |
| DB/migration | Schema/security/workspace tests; `npm run typecheck` | RLS, permissions, snapshots, or import/export are touched. |
| Tool execution | `npm run test -- src/lib/backend/tools/tool-execution.test.ts`; registry checker | Confirmation, permissions, artifact materialization, or external provider changes. |
| Runtime/streaming | `agent-runtime`, `stream-retry`, `mock-stream`, workflow runtime tests | Provider adapter, task lifecycle, cancellation, or observability changes. |
| Artifact | `artifact-service` tests; route/API tests | Tool outputs or historical artifact fetching are changed. |
| History/memory | `message-history-service` tests; memory compression tests | Cursoring, archive windows, active local state, or memory writes change. |
| Sync | `sync-queue` and `local-sync-queue-adapter` tests | Offline, conflict, retry/cancel, or payload cap changes. |
| UI panel/theme | `npm run lint`; `npm run typecheck`; browser/manual check | Responsive layout, z-index, interaction flow, or persistence changes. |
| Performance/render | Lint/typecheck; targeted touched tests; manual profiling/stress check | Store partialization, selectors, graph, stream, or history size changes. |
| Whole-system risk | `npm run check` | Multiple layers or durable behavior change. |

Available scripts:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run check`

## 15. Needs Verification Carry-Forward

These are intentionally unresolved until a future task proves them from source and tests:

1. Cursor tokens are signed, but the body is base64url JSON, not encrypted; strict opacity may not be fully satisfied.
2. Supabase message paging applies `created_at < cursor.createdAt` but may not apply the same `id` tie-breaker as the in-memory repository.
3. Active window is backend-controlled during archive, but automatic active-window enforcement for newly inserted active messages was not confirmed.
4. Message sync operations are queued through V4, but scanned V4 applier only applied workspace snapshots inline; message operation application to `messages` was not found.
5. Memory records have repository insert logic, size cap, and secret boundary, but scanned API surface exposes only `GET`.
6. Active `agent.messages` remain in Zustand workspaces and local IndexedDB persistence, now classified by V15 `AgentLocalPersistenceMetadata`; destructive trimming still needs V16 message projection verification.
7. Active `agent.memory` remains in Zustand workspaces and cloud active snapshots include `memory`; V15 metadata marks durable memory writes as `Needs verification`.
8. Local sync queue can temporarily contain message payloads until flushed; this is the existing V4 queue, not a new queue.
9. Artifact archive sets status to `archived`; reference behavior after archive should be verified before depending on archived artifact resolution.
10. Tool run `artifactId` is nullable and materialization can be unavailable; V7-to-V8 materialization path should be verified before relying on it.
11. Local permission fallback grants owner-like access to `local-owner`; production behavior depends on Supabase memberships and RLS.
12. Historical artifacts fetcher is still an empty stub while historical message fetcher is implemented.
13. Observability pages use cursor by `createdAt` only; duplicate timestamp behavior may need stable tie-breaker verification.
14. Workspace import/export snapshots still include full active messages through `createWorkspaceSnapshot`, separate from cloud snapshot serializer.

## 16. Final Codex Operating Rule

For every future change, follow this chain:

1. classify demand
2. read source of truth
3. extend existing slot
4. connect frontend -> store -> API client -> route -> service -> repository
5. keep historical/durable data out of Zustand root persistence
6. keep secrets out of persisted/client/log payloads
7. verify with targeted tests and commands
8. mark unclear links as `Needs verification`

## 17. V14 Scoring Rules

Score future execution quality from 0 to 10 using these weighted categories:

| Category | Weight | Scoring question |
| --- | --- | --- |
| Future execution zero friction | 20% | Can a new thread classify the task, find the files, and know the landing order without guessing? |
| No duplicate / no pollution | 20% | Does the path extend existing slots and block duplicate queues, registries, stores, and secret persistence? |
| Frontend/backend data coupling clarity | 15% | Is the UI -> store -> API client -> route -> service -> repository/data boundary clear? |
| Function/extension locatability | 15% | Are extension points, registries, services, and tests easy to locate? |
| Codex new-thread readability | 15% | Can Codex start from this file and avoid repeating architecture discovery? |
| Verification/test orientation | 10% | Does each change type point to useful targeted verification? |
| Appearance/performance/state hygiene | 5% | Are theme, render, performance, and persisted-state boundaries protected? |

Target acceptance score: 9.2 / 10 or higher.

## 18. V14 Acceptance Standard

- File exists at `NEXUS_CODEX_EXECUTION_MAP.md`.
- At least 10 demand class playbooks exist; this file includes 15.
- Each playbook includes signal, first-read files, source of truth, correct steps, bans, and verification.
- The file includes Starting State, Goal, content weights, process description, process rules, scoring rules, and acceptance standard.
- `Needs verification` items are preserved and not treated as solved.
- The file explicitly bans second sync queue, parallel registry, shadow store, and secret persistence.
- The file states normal `/api/v1` JSON routes use `apiHandler`, with streaming and documented special probes as exceptions.
- The file states historical data must not enter Zustand root persistence.
- Documentation-only work must not modify TypeScript, TSX, API route, migration, Zustand store, or app behavior files.

## 19. V14 Self Score

| Category | Weight | Score | Rationale |
| --- | --- | --- | --- |
| Future execution zero friction | 20% | 9.6 | Demand classes point to concrete files, source-of-truth definitions, and landing order. |
| No duplicate / no pollution | 20% | 9.7 | Explicitly bans second sync queue, parallel registry, shadow store, direct writes, and secret persistence. |
| Frontend/backend data coupling clarity | 15% | 9.4 | Frontend, backend route, service, repository, sync, and data boundaries are mapped. |
| Function/extension locatability | 15% | 9.5 | Registries, route groups, services, and tests are named by demand class. |
| Codex new-thread readability | 15% | 9.4 | File is structured as a first-read execution index with process rules and checklist. |
| Verification/test orientation | 10% | 9.3 | Matrix routes each class to targeted tests and commands. |
| Appearance/performance/state hygiene | 5% | 9.1 | Theme, customization, render, persisted state, and pagination boundaries are covered. |

Weighted total: 9.49 / 10.

Demand classes covered: 15.
