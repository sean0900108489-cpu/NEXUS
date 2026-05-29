# NEXUS Current State Model Context

Generated: 2026-05-29 AEST

This document is a current-state nutrition scan for language-model context. It scores files by how much they help a future model understand the project's architecture, logic, cross-layer contracts, and failure boundaries.

This is not a code-quality score. A high score means "read this early because it compresses a lot of system truth." A low score can still be important for a local bug, but it is less useful as general model orientation.

## Scan Scope

Included:

- Source files under `src`.
- Supabase migrations under `supabase/migrations`.
- Project architecture/checkpoint/planning markdown.
- Tests, routes, services, repositories, UI components, config files.

Excluded for safety or low architecture signal:

- `.git`, `node_modules`, `.next`, `.vercel`, generated caches, binary/static image assets.
- `.env*` files and other local secret-bearing files.
- `package-lock.json`, `tsconfig.tsbuildinfo`, `.DS_Store`.

Scan result:

- Files scored: 252.
- Files above 80: 108.
- Main use: feed the 80+ catalogue to a model before large refactors, especially sync, storage, backend boundaries, style-system work, and UI shell rewrites.

## Scoring Rubric

- 95-100: Canonical source of truth or full-system orchestration. Read first.
- 90-94: Core service, adapter, API boundary, or operational spine. Read before touching that domain.
- 81-89: High-signal supporting files: repositories, migrations, route surfaces, UI shells, style foundations, or older architecture maps.
- 70-80: Useful secondary context, tests, constants, or narrow infrastructure.
- 60-69: Situational context for a specific route, helper, or edge case.
- Below 60: Low general-context nutrition, usually wrappers, config, test utilities, simple routes, or local implementation detail.

## Recommended Read Order For Future Models

1. `NEXUS_TOTAL_ARCHITECTURE_SCAN2.md`
2. `NEXUS_ARCHITECTURE_BLUEPRINT.md`
3. `src/lib/nexus-types.ts`
4. `src/lib/nexus-registry.ts`
5. `src/lib/nexus-defaults.ts`
6. `src/store/nexus-store.ts`
7. `src/components/nexus/nexus-ops.tsx`
8. `src/lib/state-sync.ts`
9. `src/lib/sync/local-sync-queue-adapter.ts`
10. `src/lib/workspace-kernel.ts`
11. Domain-specific services/repositories/routes/migrations from the catalogue below.

## 80+ High-Nutrition Catalogue

### Canonical Architecture And Model Orientation

| Score | File | Context Signal |
| --- | --- | --- |
| 97 | `NEXUS_ARCHITECTURE_BLUEPRINT.md` | Broad architecture, UI shell, routes, data boundaries, and operational rules. |
| 96 | `NEXUS_TOTAL_ARCHITECTURE_SCAN2.md` | Current canonical source-of-truth map and cross-layer interaction scan. |
| 94 | `NEXUS_V16_IMPLEMENTATION_CHECKPOINT.md` | Current V16 work state, dirty-worktree awareness, sync/recovery findings. |
| 89 | `NEXUS_POST_V10_ARCHITECTURE_SCAN.md` | Earlier architecture scan, useful for drift comparison. |
| 89 | `NEXUS_TOTAL_ARCHITECTURE_SCAN1.md` | Prior total scan; useful to compare with scan 2. |
| 88 | `NEXUS_V15_IMPLEMENTATION_CHECKPOINT.md` | Prior implementation checkpoint and historical context. |
| 88 | `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN3.md` | Detailed sync applier completion planning. |
| 86 | `NEXUS_V16_SYNC_OPERATION_APPLIER_COMPLETION_PLAN.md` | Earlier sync applier completion plan. |
| 82 | `NEXUS_CODEX_EXECUTION_MAP.md` | Human-readable execution map across major UI and backend pieces. |
| 82 | `NEXUS最新一次更新.md` | Historical prompt/update log with useful implementation sequence clues. |
| 82 | `後端校正nexus.md` | Backend correction notes and implementation instructions. |

### Cross-Layer Type, Registry, Defaults, And Kernel

| Score | File | Context Signal |
| --- | --- | --- |
| 100 | `src/lib/nexus-types.ts` | Main cross-layer data contract for UI, API, sync, runtime, history, artifacts, prompts, notebooks, observability. |
| 95 | `src/lib/nexus-registry.ts` | Canonical registry for providers, models, capabilities, graph nodes, tools, memory profiles, handoff rules. |
| 95 | `src/lib/workspace-kernel.ts` | Workspace import/export/snapshot sanitation, active-state boundaries, and validation. |
| 90 | `src/lib/nexus-defaults.ts` | Default workspace, agent, graph, and template state. |
| 90 | `src/lib/tool-executors.ts` | Maps tool executor IDs to concrete implementations and tool execution affordances. |
| 88 | `src/lib/workflow-engine.ts` | Workflow graph execution logic and handoff behavior. |
| 88 | `src/lib/workflow-runtime-lite/registry.ts` | Runtime-lite node definitions and registry. |
| 88 | `src/lib/workflow-runtime-lite/runner.ts` | Runtime-lite execution flow. |
| 87 | `src/lib/workflow-runtime-lite/llm-client.ts` | Runtime-lite LLM boundary. |
| 86 | `src/lib/workspace-recovery-local.ts` | Local workspace recovery helper. |
| 81 | `src/lib/supabase/database.types.ts` | Generated durable schema surface; high signal for table/column reality. |

### Frontend Orchestration, UI Shell, And Style Surface

| Score | File | Context Signal |
| --- | --- | --- |
| 99 | `src/store/nexus-store.ts` | Zustand source for active UI, local-first caches, optimistic actions, sync bridge calls, auth vault, tools, notebooks, prompts. |
| 98 | `src/components/nexus/nexus-ops.tsx` | Full app shell and orchestration: top bar, docks, agent windows, streaming, theme controls, overlays. |
| 93 | `src/components/nexus/nexus-graph.tsx` | React Flow graph surface, runtime nodes, edge behavior, graph UI contracts. |
| 86 | `src/components/nexus/DatapadWindow.tsx` | Notebook/datapad UI, draft behavior, save/delete entry points. |
| 85 | `src/app/globals.css` | Theme tokens, Tailwind v4 token bridge, global UI style hooks, React Flow overrides. |
| 85 | `src/components/nexus/AgentBranchModal.tsx` | Branching/compression modal UI and memory branch flow. |
| 85 | `src/components/nexus/PromptVaultManager.tsx` | Prompt vault UI and prompt editing flow. |
| 84 | `src/components/nexus/auth-screen.tsx` | Supabase auth gate and login/signup UX boundary. |
| 84 | `tailwind.config.ts` | Tailwind theme extension to CSS variables. |
| 82 | `src/app/layout.tsx` | Root layout, font setup, global CSS import, theme provider boundary. |
| 82 | `src/components/theme-provider.tsx` | `next-themes` theme list and `data-theme` attribute contract. |
| 81 | `src/app/page.tsx` | Top-level render entry into `NexusOps`. |

### Sync, State, Workspace, And Recovery Spine

| Score | File | Context Signal |
| --- | --- | --- |
| 96 | `src/lib/state-sync.ts` | Client-side Supabase state sync manager, local queue bridging, cloud sync actions. |
| 94 | `src/lib/backend/sync/sync-operation-applier.ts` | Durable sync operation dispatch and domain applier behavior. |
| 94 | `src/lib/backend/sync/sync-queue-service.ts` | Sync operation creation/status/business service. |
| 94 | `src/lib/backend/workspace/workspace-state-service.ts` | Workspace state read/write service and snapshot persistence boundary. |
| 93 | `src/lib/sync/local-sync-queue-adapter.ts` | IndexedDB-backed local sync queue, flush/status projection. |
| 92 | `src/lib/backend/workspace/workspace-hydration-service.ts` | Hydration conflict logic and newer-local protection. |
| 89 | `src/lib/backend/sync/sync-operation-repository.ts` | Durable sync operation persistence. |
| 89 | `src/lib/backend/workspace/workspace-snapshot-serializer.ts` | Workspace snapshot serialization rules. |
| 89 | `src/lib/backend/workspace/workspace-snapshot-validator.ts` | Workspace snapshot validation rules. |
| 88 | `src/lib/backend/sync/sync-conflict-resolver.ts` | Sync conflict resolution behavior. |
| 88 | `src/lib/backend/workspace/workspace-snapshot-repository.ts` | Workspace snapshot persistence. |
| 85 | `src/lib/backend/workspace/workspace-state-entity-repository.ts` | Workspace state entity projection persistence. |

### Backend API, Runtime, Streaming, And Contracts

| Score | File | Context Signal |
| --- | --- | --- |
| 94 | `src/lib/backend/api/api-handler.ts` | Route wrapper, request context, permission/idempotency/error boundary. |
| 92 | `src/lib/backend/api/agent-stream-service.ts` | Agent stream route service and stream orchestration. |
| 92 | `src/lib/backend/runtime/agent-runtime-service.ts` | Agent task/runtime service and provider execution lifecycle. |
| 90 | `src/lib/backend/api/api-errors.ts` | API error vocabulary and normalized error helpers. |
| 90 | `src/lib/backend/api/idempotency-repository.ts` | Idempotency key persistence and request replay protection. |
| 89 | `src/lib/backend/api/api-request-validator.ts` | Shared route validation helpers. |
| 85 | `src/lib/backend/api/memory-compress-service.ts` | Memory compression backend service. |
| 85 | `src/lib/backend/runtime/provider-adapter.ts` | Provider adapter boundary and model stream conversion. |

### Security, Permissions, And Secret Boundary

| Score | File | Context Signal |
| --- | --- | --- |
| 92 | `src/lib/backend/security/permission-service.ts` | Workspace permission checks and audit behavior. |
| 92 | `src/lib/backend/security/secret-boundary-service.ts` | Secret storage/redaction boundary. |
| 88 | `src/lib/backend/security/repositories.ts` | Security repository implementations. |

### Domain Services And Repositories

| Score | File | Context Signal |
| --- | --- | --- |
| 92 | `src/lib/backend/history/message-history-service.ts` | Durable message history behavior and paging service. |
| 92 | `src/lib/backend/notebooks/notebook-service.ts` | Durable notebook service and safe merge/delete semantics. |
| 92 | `src/lib/backend/prompts/prompt-service.ts` | Prompt service and prompt revision behavior. |
| 91 | `src/lib/backend/artifacts/artifact-service.ts` | Artifact service and asset/reference rules. |
| 91 | `src/lib/backend/observability/observability-service.ts` | System events, usage metrics, trace read/write service. |
| 91 | `src/lib/backend/tools/tool-execution-service.ts` | Tool run lifecycle, permissions, confirmation, execution. |
| 90 | `src/lib/backend/deployment/deployment-check-service.ts` | Deployment safety checks and readiness logic. |
| 88 | `src/lib/backend/artifacts/artifact-repository.ts` | Artifact persistence. |
| 88 | `src/lib/backend/deployment/environment-validator.ts` | Environment variable/config validation. |
| 88 | `src/lib/backend/deployment/feature-flag-service.ts` | Feature flag service behavior. |
| 88 | `src/lib/backend/deployment/registry-consistency-checker.ts` | Registry consistency checks. |
| 88 | `src/lib/backend/deployment/schema-drift-checker.ts` | Schema drift checks. |
| 88 | `src/lib/backend/history/message-repository.ts` | Message persistence. |
| 88 | `src/lib/backend/notebooks/notebook-repository.ts` | Notebook persistence. |
| 88 | `src/lib/backend/observability/system-event-repository.ts` | System event persistence. |
| 88 | `src/lib/backend/observability/usage-metrics-repository.ts` | Usage metric persistence. |
| 88 | `src/lib/backend/prompts/prompt-repository.ts` | Prompt persistence. |
| 88 | `src/lib/backend/runtime/agent-runtime-repository.ts` | Agent runtime/task persistence. |
| 88 | `src/lib/backend/tools/tool-executor-adapter.ts` | Tool executor adapter boundary. |
| 88 | `src/lib/backend/tools/tool-permission-gate.ts` | Tool risk/permission gate. |
| 88 | `src/lib/backend/tools/tool-run-repository.ts` | Tool run persistence. |
| 81 | `src/lib/backend/history/agent-memory-record-repository.ts` | Agent memory record persistence. |
| 81 | `src/lib/backend/tools/tool-permission-repository.ts` | Tool permission persistence. |

### High-Signal API Routes

| Score | File | Context Signal |
| --- | --- | --- |
| 87 | `src/app/api/v1/agents/[agentId]/stream/route.ts` | Agent stream route entrypoint. |
| 87 | `src/app/api/v1/agents/[agentId]/tasks/route.ts` | Agent task create/list route. |
| 87 | `src/app/api/v1/sync/operations/route.ts` | Sync operation create/list route. |
| 87 | `src/app/api/v1/workspaces/[workspaceId]/state/route.ts` | Workspace state GET/PUT route. |
| 86 | `src/app/api/v1/artifacts/route.ts` | Artifact vault route. |
| 86 | `src/app/api/v1/notebooks/route.ts` | Notebook route. |
| 86 | `src/app/api/v1/observability/events/route.ts` | Observability event route. |
| 86 | `src/app/api/v1/prompts/route.ts` | Prompt vault route. |
| 86 | `src/app/api/v1/tool-runs/route.ts` | Tool run route. |
| 86 | `src/app/api/v1/tools/[toolId]/run/route.ts` | Tool execution route. |
| 86 | `src/app/api/v1/workspaces/recovery/[workspaceId]/route.ts` | Workspace recovery by id. |
| 86 | `src/app/api/v1/workspaces/recovery/latest/route.ts` | Latest workspace recovery route. |
| 86 | `src/app/api/v1/workspaces/recovery/route.ts` | Workspace recovery index route. |

### Durable Database Shape And RLS Migrations

| Score | File | Context Signal |
| --- | --- | --- |
| 88 | `supabase/migrations/20260527000000_security_boundary_rls_foundation.sql` | Workspace membership, permissions, RLS/security foundation. |
| 88 | `supabase/migrations/20260527003000_durable_sync_queue.sql` | Durable sync queue schema. |
| 87 | `supabase/migrations/20260527002000_workspace_cloud_state.sql` | Workspace cloud state and snapshot schema. |
| 87 | `supabase/migrations/20260527012000_message_history_base_table.sql` | Message history durable table. |
| 87 | `supabase/migrations/20260527013000_prompt_revision_history.sql` | Prompt revision/history schema. |
| 86 | `supabase/migrations/20260527005000_agent_runtime_sessions.sql` | Agent runtime/session schema. |
| 86 | `supabase/migrations/20260527006000_tool_execution_control_plane.sql` | Tool execution schema. |
| 86 | `supabase/migrations/20260527007000_artifact_asset_layer.sql` | Artifact/reference schema. |
| 86 | `supabase/migrations/20260527008000_observability_event_spine.sql` | Observability event/metric schema. |
| 86 | `supabase/migrations/20260527010000_notebook_durable_tombstones.sql` | Notebook tombstone schema. |
| 86 | `supabase/migrations/20260527011000_prompt_durable_tombstones.sql` | Prompt tombstone schema. |
| 85 | `supabase/migrations/20260527001000_api_idempotency_keys.sql` | API idempotency persistence schema. |
| 85 | `supabase/migrations/20260527004000_deployment_safety_gate.sql` | Deployment safety schema. |
| 85 | `supabase/migrations/20260527009000_historical_data_paging.sql` | Historical data paging support schema. |
| 84 | `supabase/migrations/20260525000000_create_workflow_templates.sql` | Workflow template table. |

## Full Score Ledger For Scanned Files

The files above 80 are the recommended "model context pack." The remaining scanned files are scored below for completeness.

| Score | Lines | File |
| --- | ---: | --- |
| 73 | 221 | `src/lib/backend/security/workspace-identity-repair-service.ts` |
| 73 | 247 | `src/lib/backend/workspace/workspace-permission.ts` |
| 72 | 713 | `NEXUS_V15_ACTIVE_STATE_HYGIENE_AND_LOCAL_PERSISTENCE_DIET.md` |
| 72 | 375 | `NEXUS_V16_SUPABASE_DEEP_READINESS_REPORT.md` |
| 70 | 301 | `NEXUS_V14_CODEX_EXECUTION_MAP_PROMPT.md` |
| 68 | 112 | `src/app/api/v1/feature-flags/[flagKey]/toggle/route.ts` |
| 68 | 770 | `src/lib/backend/workspace/workspace-state.test.ts` |
| 67 | 119 | `src/lib/backend/sync/sync-constants.ts` |
| 66 | 102 | `src/app/api/v1/deployment/checks/run/route.ts` |
| 66 | 772 | `src/lib/backend/sync/sync-queue.test.ts` |
| 66 | 733 | `src/store/nexus-store.test.ts` |
| 65 | 82 | `src/app/api/v1/agents/[agentId]/tasks/[taskId]/cancel/route.ts` |
| 65 | 59 | `src/app/api/v1/artifacts/[artifactId]/archive/route.ts` |
| 65 | 53 | `src/app/api/v1/artifacts/[artifactId]/references/route.ts` |
| 65 | 53 | `src/app/api/v1/artifacts/[artifactId]/versions/route.ts` |
| 65 | 74 | `src/app/api/v1/sync/operations/[operationId]/cancel/route.ts` |
| 65 | 83 | `src/app/api/v1/sync/operations/[operationId]/retry/route.ts` |
| 65 | 137 | `src/lib/backend/artifacts/artifact-materializer.ts` |
| 65 | 161 | `src/lib/backend/observability/redaction-pipeline.ts` |
| 65 | 469 | `src/lib/workflow-runtime-lite/state.ts` |
| 64 | 1717 | `NEXUS最新一次更新` |
| 64 | 40 | `src/lib/backend/contracts/layering.ts` |
| 64 | 494 | `src/lib/backend/runtime/agent-runtime.test.ts` |
| 63 | 46 | `src/app/api/v1/agents/[agentId]/memory/route.ts` |
| 63 | 38 | `src/app/api/v1/agents/[agentId]/tasks/[taskId]/route.ts` |
| 63 | 37 | `src/app/api/v1/artifacts/[artifactId]/route.ts` |
| 63 | 140 | `src/lib/backend/history/storage-partition-service.ts` |
| 63 | 135 | `src/lib/backend/tools/tool-registry-validator.ts` |
| 62 | 101 | `src/app/api/v1/agents/memory-compress/route.ts` |
| 62 | 134 | `src/app/api/v1/artifacts/artifact-route-validation.ts` |
| 62 | 459 | `src/lib/backend/api/api-contract.test.ts` |
| 62 | 96 | `src/lib/backend/observability/observability-types.ts` |
| 62 | 86 | `src/lib/backend/primitives/ids.ts` |
| 62 | 88 | `src/lib/backend/security/auth-session.ts` |
| 61 | 115 | `NEXUS_ITERATION_UPGRADE_RANKING.md` |
| 61 | 32 | `src/app/api/v1/sync/status/route.ts` |
| 61 | 37 | `src/app/api/v1/tool-runs/[toolRunId]/route.ts` |
| 61 | 164 | `src/lib/backend/primitives/redaction.ts` |
| 60 | 51 | `src/lib/backend/primitives/metadata.ts` |
| 60 | 78 | `src/lib/backend/security/types.ts` |
| 60 | 31 | `src/lib/backend/sync/sync-retention-service.ts` |
| 59 | 73 | `src/app/api/v1/agents/[agentId]/messages/archive/route.ts` |
| 59 | 41 | `src/app/api/v1/agents/[agentId]/messages/route.ts` |
| 59 | 29 | `src/app/api/v1/deployment/checks/latest/route.ts` |
| 59 | 39 | `src/app/api/v1/feature-flags/route.ts` |
| 59 | 44 | `src/app/api/v1/observability/observability-route-helpers.ts` |
| 59 | 40 | `src/app/api/v1/observability/traces/[traceId]/route.ts` |
| 59 | 73 | `src/app/api/v1/tool-runs/[toolRunId]/cancel/route.ts` |
| 59 | 75 | `src/app/api/v1/tool-runs/[toolRunId]/confirm/route.ts` |
| 59 | 128 | `src/lib/backend/primitives/errors.ts` |
| 59 | 300 | `src/lib/backend/tools/tool-execution.test.ts` |
| 58 | 211 | `src/lib/adapters/memory-compression-adapter.ts` |
| 58 | 30 | `src/lib/backend/artifacts/artifact-constants.ts` |
| 58 | 70 | `src/lib/backend/contracts/idempotency.ts` |
| 58 | 32 | `src/lib/backend/observability/event-retention-worker.ts` |
| 58 | 330 | `src/lib/backend/security/security-services.test.ts` |
| 57 | 33 | `src/app/api/v1/observability/metrics/route.ts` |
| 56 | 162 | `src/app/api/v1/providers/verify/route.ts` |
| 56 | 248 | `src/lib/adapters/image-adapter.ts` |
| 56 | 60 | `src/lib/backend/api/idempotency-middleware.ts` |
| 56 | 85 | `src/lib/backend/api/request-hash.ts` |
| 56 | 66 | `src/lib/backend/artifacts/artifact-reference-resolver.ts` |
| 56 | 56 | `src/lib/backend/contracts/api-envelope.ts` |
| 56 | 33 | `src/lib/backend/deployment/deployment-types.ts` |
| 56 | 66 | `src/lib/backend/history/historical-data-fetcher.ts` |
| 56 | 43 | `src/lib/backend/history/history-constants.ts` |
| 56 | 62 | `src/lib/backend/observability/trace-context-middleware.ts` |
| 56 | 61 | `src/lib/backend/runtime/runtime-constants.ts` |
| 55 | 227 | `src/lib/backend/artifacts/artifact-service.test.ts` |
| 54 | 91 | `ARCHITECTURE.md` |
| 54 | 26 | `src/lib/backend/primitives/status.ts` |
| 54 | 144 | `src/lib/workflow-runtime-lite/executors.ts` |
| 53 | 28 | `src/app/api/v1/public-config/route.ts` |
| 52 | 276 | `src/lib/workflow-runtime-lite/topology.ts` |
| 51 | 229 | `src/lib/backend/deployment/deployment-api.test.ts` |
| 51 | 267 | `src/lib/backend/history/message-history-service.test.ts` |
| 51 | 271 | `src/lib/backend/observability/observability-service.test.ts` |
| 50 | 187 | `src/lib/api/nexus-api-client.ts` |
| 50 | 104 | `src/lib/supabase/client.ts` |
| 48 | 19 | `src/lib/backend/observability/events.ts` |
| 47 | 42 | `src/components/nexus/dynamic-icon.tsx` |
| 47 | 133 | `src/lib/backend/deployment/deployment-services.test.ts` |
| 47 | 163 | `src/lib/backend/notebooks/notebook-route.test.ts` |
| 47 | 110 | `src/lib/backend/prompts/prompt-route.test.ts` |
| 46 | 17 | `src/lib/backend/contracts/feature-flags.ts` |
| 46 | 23 | `src/lib/backend/contracts/permission.ts` |
| 46 | 22 | `src/lib/backend/sync/sync-hash.ts` |
| 46 | 131 | `src/lib/stream-retry.ts` |
| 45 | 108 | `src/lib/backend/security/security-migration.test.ts` |
| 45 | 37 | `src/lib/supabase/admin.ts` |
| 45 | 415 | `src/lib/workspace-kernel.test.ts` |
| 44 | 178 | `src/app/api/predictive-intel/route.ts` |
| 44 | 225 | `src/app/api/tools/fs-scanner/route.ts` |
| 44 | 9 | `src/lib/backend/api/api-contract-service.ts` |
| 44 | 19 | `src/lib/backend/observability/trace-context.ts` |
| 44 | 168 | `src/lib/embed-url.ts` |
| 43 | 14 | `src/app/api/v1/health/route.ts` |
| 43 | 85 | `src/lib/tools/fs-scanner-executor.ts` |
| 43 | 338 | `src/lib/workflow-runtime-lite/runner.test.ts` |
| 42 | 135 | `src/app/api/tools/web-surfer/route.ts` |
| 42 | 6 | `src/lib/backend/artifacts/index.ts` |
| 42 | 6 | `src/lib/backend/history/index.ts` |
| 42 | 4 | `src/lib/backend/index.ts` |
| 42 | 10 | `src/lib/backend/observability/index.ts` |
| 42 | 7 | `src/lib/backend/tools/index.ts` |
| 42 | 168 | `src/lib/workflow-runtime-lite/llm-client.test.ts` |
| 41 | 81 | `src/app/api/image-gen/route.ts` |
| 41 | 47 | `src/lib/predictive-intel.ts` |
| 41 | 72 | `src/lib/tools/web-surfer-executor.ts` |
| 40 | 9 | `src/lib/backend/api/index.ts` |
| 40 | 24 | `src/lib/backend/api/route-compatibility.ts` |
| 40 | 6 | `src/lib/backend/contracts/index.ts` |
| 40 | 6 | `src/lib/backend/primitives/index.ts` |
| 40 | 6 | `src/lib/backend/security/index.ts` |
| 40 | 8 | `src/lib/backend/sync/index.ts` |
| 40 | 8 | `src/lib/backend/workspace/index.ts` |
| 39 | 87 | `src/lib/supabase/test-connection.ts` |
| 38 | 55 | `README.md` |
| 37 | 30 | `src/app/api/memory-compress/route.ts` |
| 36 | 58 | `src/lib/backend/security/frontend-bundle-safety.test.ts` |
| 33 | 5 | `src/lib/workflow-runtime-lite/constants.ts` |
| 32 | 270 | `src/lib/sync/local-sync-queue-adapter.test.ts` |
| 32 | 258 | `src/lib/workflow-engine.test.ts` |
| 31 | 19 | `src/app/api/agent-stream/route.ts` |
| 31 | 18 | `src/lib/mock-stream.ts` |
| 29 | 109 | `scripts/check-preflight.mjs` |
| 29 | 10 | `src/lib/public-config.ts` |
| 27 | 14 | `src/app/api/system-status/route.ts` |
| 25 | 7 | `next-env.d.ts` |
| 25 | 8 | `next.config.ts` |
| 25 | 16 | `vitest.config.ts` |
| 23 | 55 | `src/lib/supabase/client.test.ts` |
| 23 | 37 | `src/lib/workspace-recovery-local.test.ts` |
| 21 | 33 | `src/lib/mock-stream.test.ts` |
| 20 | 22 | `SECURITY_NOTES.md` |
| 18 | 6 | `AGENTS.md` |
| 18 | 2 | `CLAUDE.md` |
| 17 | 96 | `src/lib/embed-url.test.ts` |
| 17 | 61 | `src/lib/stream-retry.test.ts` |
| 5 | 43 | `.gitignore` |
| 5 | 19 | `eslint.config.mjs` |
| 5 | 42 | `package.json` |
| 5 | 8 | `postcss.config.mjs` |
| 5 | 35 | `tsconfig.json` |

## Practical Notes

- For architecture or large refactor work, start with the 95+ group before reading implementation details.
- For sync/recovery work, read `state-sync`, local queue adapter, sync routes, sync services, workspace services, notebook/prompt repositories, and related migrations together.
- For style-system work, read `globals.css`, `tailwind.config.ts`, `theme-provider.tsx`, `layout.tsx`, `nexus-ops.tsx`, `nexus-graph.tsx`, and the modal/window components together.
- For backend route work, read the route, `api-handler.ts`, the domain service, repository, permission/secret boundary, and migration table definition as one chain.
- Keep this file additive: future scans can append a dated delta rather than replacing the score ledger unless the scoring rubric changes.
