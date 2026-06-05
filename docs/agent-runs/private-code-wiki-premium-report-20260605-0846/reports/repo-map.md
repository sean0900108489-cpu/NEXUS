# Repo Map

## Compact Overview

- App Router/API：src/app/**
- NEXUS UI：src/components/nexus/**
- Workflow Pro：src/components/nexus/workflow-pro/**, src/lib/workflow-pro/**, src/lib/workflow-runtime-lite/**
- Store：src/store/nexus-store.ts
- Backend services：src/lib/backend/**
- Supabase：src/lib/supabase/**, supabase/migrations/**
- Style engine：src/lib/style-engine/**, src/components/style-engine/**

## Top Fan-out

- src/components/nexus/nexus-ops.tsx - 50 internal deps
- src/lib/style-engine/index.ts - 30 internal deps
- src/lib/backend/api/api-contract.test.ts - 21 internal deps
- src/store/nexus-store.ts - 19 internal deps
- src/lib/backend/sync/sync-queue.test.ts - 15 internal deps
- src/lib/backend/workspace/workspace-state.test.ts - 15 internal deps
- src/lib/backend/runtime/agent-runtime.test.ts - 13 internal deps
- src/lib/backend/api/agent-stream-service.ts - 12 internal deps
- src/lib/backend/api/api-handler.ts - 12 internal deps
- src/lib/backend/history/message-history-service.test.ts - 12 internal deps
- src/lib/backend/runtime/agent-runtime-service.ts - 12 internal deps
- src/lib/backend/observability/index.ts - 11 internal deps

## Top Fan-in

- src/lib/nexus-types.ts - 168 incoming
- src/lib/backend/api/api-handler.ts - 43 incoming
- src/lib/backend/api/api-errors.ts - 35 incoming
- src/lib/style-engine/index.ts - 29 incoming
- src/lib/backend/workspace/workspace-permission.ts - 27 incoming
- src/lib/backend/api/api-request-validator.ts - 27 incoming
- src/lib/supabase/database.types.ts - 25 incoming
- src/lib/workflow-pro/workflow-contract.ts - 23 incoming
- src/lib/backend/security/secret-boundary-service.ts - 21 incoming
- src/lib/workflow-pro/capability-inventory.ts - 20 incoming
- src/lib/backend/observability/events.ts - 19 incoming
- src/lib/supabase/admin.ts - 19 incoming

## Suspected Cycles

- src/lib/backend/observability/events.ts -> src/lib/backend/observability/observability-service.ts -> src/lib/backend/observability/events.ts -> src/lib/backend/observability/events.ts
- src/lib/nexus-types.ts -> src/lib/backend/index.ts -> src/lib/backend/observability/index.ts -> src/lib/backend/observability/events.ts -> src/lib/backend/observability/observability-service.ts -> src/lib/backend/observability/observability-types.ts -> src/lib/nexus-types.ts -> src/lib/nexus-types.ts
- src/lib/nexus-types.ts -> src/lib/backend/index.ts -> src/lib/backend/observability/index.ts -> src/lib/backend/observability/events.ts -> src/lib/backend/observability/observability-service.ts -> src/lib/backend/observability/system-event-repository.ts -> src/lib/nexus-types.ts -> src/lib/nexus-types.ts
- src/lib/nexus-types.ts -> src/lib/backend/index.ts -> src/lib/backend/observability/index.ts -> src/lib/backend/observability/events.ts -> src/lib/backend/observability/observability-service.ts -> src/lib/backend/observability/system-event-repository.ts -> src/lib/supabase/admin.ts -> src/lib/supabase/database.types.ts -> src/lib/nexus-types.ts -> src/lib/nexus-types.ts
- src/lib/nexus-types.ts -> src/lib/backend/index.ts -> src/lib/backend/observability/index.ts -> src/lib/backend/observability/events.ts -> src/lib/backend/observability/observability-service.ts -> src/lib/backend/observability/usage-metrics-repository.ts -> src/lib/nexus-types.ts -> src/lib/nexus-types.ts
- src/lib/nexus-types.ts -> src/lib/backend/index.ts -> src/lib/backend/observability/index.ts -> src/lib/backend/observability/trace-context-middleware.ts -> src/lib/nexus-types.ts -> src/lib/nexus-types.ts
- src/lib/nexus-types.ts -> src/lib/backend/index.ts -> src/lib/backend/observability/index.ts -> src/lib/backend/observability/workflow-group-records.ts -> src/lib/nexus-types.ts -> src/lib/nexus-types.ts
- src/lib/nexus-types.ts -> src/lib/backend/index.ts -> src/lib/backend/observability/index.ts -> src/lib/backend/observability/workflow-runtime-events.ts -> src/lib/nexus-types.ts -> src/lib/nexus-types.ts
- src/store/nexus-store.ts -> src/lib/adapters/memory-compression-adapter.ts -> src/store/nexus-store.ts -> src/store/nexus-store.ts

## Agent 必讀檔

- package.json
- AGENTS.md
- .codewikiignore
- .agentignore
- src/lib/supabase/client.ts
- src/lib/supabase/admin.ts
- src/lib/supabase/request.ts
- src/lib/supabase/database.types.ts
- supabase/migrations/
- src/components/nexus/nexus-ops.tsx
- src/components/nexus/nexus-graph.tsx
- src/components/nexus/workflow-pro/workflow-pro-surface.tsx
- src/store/nexus-store.ts
- src/lib/backend/image-generation/generated-image-asset-storage.ts
- src/lib/backend/security/frontend-bundle-safety.test.ts

## 不要整份讀，應 symbol-level 讀

- src/components/nexus/nexus-ops.tsx (9653 lines)
- src/components/nexus/nexus-graph.tsx (2345 lines)
- src/components/nexus/workflow-pro/workflow-pro-surface.tsx (1721 lines)
- src/store/nexus-store.ts (4814 lines)
