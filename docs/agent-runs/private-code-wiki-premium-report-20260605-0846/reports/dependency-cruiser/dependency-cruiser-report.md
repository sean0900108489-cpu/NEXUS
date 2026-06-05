# Dependency Cruiser / Import Graph Report

## dependency-cruiser

- Full run output：reports/dependency-cruiser/dependency-cruiser.json
- Internal run output：reports/dependency-cruiser/dependency-cruiser-internal.json
- Limitation：沒有 project config 時，dependency-cruiser 對此 repo 的 TS/path alias 解析不完整，internal dependencies 只有 1。

## Custom import graph

- Files：400
- Internal edges：1317
- Suspected cycles：9

## Top fan-out

- src/components/nexus/nexus-ops.tsx - 50
- src/lib/style-engine/index.ts - 30
- src/lib/backend/api/api-contract.test.ts - 21
- src/store/nexus-store.ts - 19
- src/lib/backend/sync/sync-queue.test.ts - 15
- src/lib/backend/workspace/workspace-state.test.ts - 15
- src/lib/backend/runtime/agent-runtime.test.ts - 13
- src/lib/backend/api/agent-stream-service.ts - 12
- src/lib/backend/api/api-handler.ts - 12
- src/lib/backend/history/message-history-service.test.ts - 12
- src/lib/backend/runtime/agent-runtime-service.ts - 12
- src/lib/backend/observability/index.ts - 11
- src/lib/backend/observability/observability-service.test.ts - 11
- src/lib/backend/sync/sync-queue-service.ts - 11
- src/app/api/image-gen/route.ts - 10

## Top fan-in

- src/lib/nexus-types.ts - 168
- src/lib/backend/api/api-handler.ts - 43
- src/lib/backend/api/api-errors.ts - 35
- src/lib/style-engine/index.ts - 29
- src/lib/backend/workspace/workspace-permission.ts - 27
- src/lib/backend/api/api-request-validator.ts - 27
- src/lib/supabase/database.types.ts - 25
- src/lib/workflow-pro/workflow-contract.ts - 23
- src/lib/backend/security/secret-boundary-service.ts - 21
- src/lib/workflow-pro/capability-inventory.ts - 20
- src/lib/backend/observability/events.ts - 19
- src/lib/supabase/admin.ts - 19
- src/lib/nexus-registry.ts - 18
- src/lib/backend/security/auth-session.ts - 16
- src/lib/style-engine/manifest.ts - 16

## Cycles

- src/lib/backend/observability/events.ts -> src/lib/backend/observability/observability-service.ts -> src/lib/backend/observability/events.ts -> src/lib/backend/observability/events.ts
- src/lib/nexus-types.ts -> src/lib/backend/index.ts -> src/lib/backend/observability/index.ts -> src/lib/backend/observability/events.ts -> src/lib/backend/observability/observability-service.ts -> src/lib/backend/observability/observability-types.ts -> src/lib/nexus-types.ts -> src/lib/nexus-types.ts
- src/lib/nexus-types.ts -> src/lib/backend/index.ts -> src/lib/backend/observability/index.ts -> src/lib/backend/observability/events.ts -> src/lib/backend/observability/observability-service.ts -> src/lib/backend/observability/system-event-repository.ts -> src/lib/nexus-types.ts -> src/lib/nexus-types.ts
- src/lib/nexus-types.ts -> src/lib/backend/index.ts -> src/lib/backend/observability/index.ts -> src/lib/backend/observability/events.ts -> src/lib/backend/observability/observability-service.ts -> src/lib/backend/observability/system-event-repository.ts -> src/lib/supabase/admin.ts -> src/lib/supabase/database.types.ts -> src/lib/nexus-types.ts -> src/lib/nexus-types.ts
- src/lib/nexus-types.ts -> src/lib/backend/index.ts -> src/lib/backend/observability/index.ts -> src/lib/backend/observability/events.ts -> src/lib/backend/observability/observability-service.ts -> src/lib/backend/observability/usage-metrics-repository.ts -> src/lib/nexus-types.ts -> src/lib/nexus-types.ts
- src/lib/nexus-types.ts -> src/lib/backend/index.ts -> src/lib/backend/observability/index.ts -> src/lib/backend/observability/trace-context-middleware.ts -> src/lib/nexus-types.ts -> src/lib/nexus-types.ts
- src/lib/nexus-types.ts -> src/lib/backend/index.ts -> src/lib/backend/observability/index.ts -> src/lib/backend/observability/workflow-group-records.ts -> src/lib/nexus-types.ts -> src/lib/nexus-types.ts
- src/lib/nexus-types.ts -> src/lib/backend/index.ts -> src/lib/backend/observability/index.ts -> src/lib/backend/observability/workflow-runtime-events.ts -> src/lib/nexus-types.ts -> src/lib/nexus-types.ts
- src/store/nexus-store.ts -> src/lib/adapters/memory-compression-adapter.ts -> src/store/nexus-store.ts -> src/store/nexus-store.ts
