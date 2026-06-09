# 11 Current System Logic Map

## Main Path

1. User enters `/`, which mounts the production shell and `NexusOps` through style runtime providers. Evidence: [src/app/page.tsx](/Users/sean/Documents/FreeChat/src/app/page.tsx), [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx).
2. The cockpit reads/writes global workspace, agent, graph, provider, style, and workflow state through `src/store/nexus-store.ts`.
3. Graph/workflow interactions pass through `nexus-graph`, Workflow Pro surface, runtime-lite modules, and workflow API routes.
4. Backend route handlers under `/api/v1` generally converge on `apiHandler`, which wraps validation, permission, idempotency, envelope, and observability behavior.
5. Durable persistence is mediated through backend repositories and Supabase clients; `state-sync.ts` is the visible cross-boundary bridge between local state and cloud sync/session behavior.

## Sync / Async / Side Effects

| Area | Current behavior | Evidence | Risk |
| --- | --- | --- | --- |
| UI state | Mostly client-side state and event handlers | `nexus-ops`, `nexus-graph`, `workflow-pro-surface`, `nexus-store` | large files mix UI and domain control |
| Async API | nexusApiClient/fetch route calls | coupling map JSON | network behavior needs localhost trace |
| Supabase writes | Backend repositories, RPC, storage, sync bridge | Supabase touchpoint map | production not queried; RLS inferred from migrations only |
| Deterministic brain | Workflow Brain planner/template/validator modules | workflow-pro files | needs runtime proposal trace |
| Agent context | messages, memory, history, branch/context compression | agent/message/memory routes and repos | daily data requires live read-only audit |
