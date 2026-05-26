# NEXUS // AI OPS Architecture

## Mandatory Rule: Scan First

Future AI agents must scan the existing schemas and registries before adding any new feature.

Required scan targets:

- `src/lib/nexus-types.ts`
- `src/lib/nexus-registry.ts`
- `src/lib/tool-executors.ts`
- `src/store/nexus-store.ts`

If a slot already exists, extend or fill that slot. Do not create ad-hoc enums, duplicate registries, one-off tool maps, or parallel workflow state unless the existing container is clearly insufficient and this document is updated to explain why.

## Empty Containers

`src/lib/nexus-types.ts` defines the future-facing contracts:

- `AgentCapabilityType`: `chat`, `image`, `video`, `audio`, `search`, `data-analysis`
- `WorkflowGraphNodeType`: `agent-node`, `tool-node`, `memory-node`, `condition-node`
- `IWorkflowGraphNode`: reserved union for future visual graph node payloads
- `IToolExecutor`: real tool executor contract for `local-fs`, `rest-api`, and `db-query`
- `IWorkflowEdge`: L2 handoff contract with optional condition and explicit context passing

`src/lib/nexus-registry.ts` is the central socket board:

- `CAPABILITY_REGISTRY`: canonical capability slots and provider/tool socket names
- `GRAPH_NODE_REGISTRY`: visual graph node slots for L3/L4 expansion
- `TOOL_EXECUTOR_REGISTRY`: executor arrays grouped by executor type; empty arrays are intentional future sockets
- `TOOL_SLOT_REGISTRY`: named not-implemented tool integration sockets
- `HANDOFF_RULE_REGISTRY`: empty L2 routing/handoff rule container

## Where Future Features Plug In

Tiered State Architecture:

- Zustand handles only active UI interaction state: panel geometry, graph viewport/edges, selected and active agents, stream lifecycle, draft/runtime state, and a small current working set.
- Historical Messages and Artifacts must move through `IAsyncDataFetcher` and `IStateSyncManager` in `src/lib/nexus-types.ts`.
- Empty/mock slots live in `src/lib/state-sync.ts`.
- Large transcripts, media artifact URLs, generated payloads, and long-term history must not be routed into localStorage after L4 backend sync is enabled.
- Future L2 autonomous workflows should fetch historical context through `IAsyncDataFetcher` instead of assuming the whole transcript is present in Zustand.
- Future L4 Supabase writes should flow through `IStateSyncManager` so UI state, messages, and artifacts can be synchronized without coupling components to database calls.

Real DALL-E or image API:

- Use the `image` entry in `CAPABILITY_REGISTRY`.
- Use `TOOL_SLOT_REGISTRY["real-image-gen"]`.
- Register a `rest-api` executor in `TOOL_EXECUTOR_REGISTRY["rest-api"]`.
- Current adapter path: `src/lib/adapters/image-adapter.ts` plus `src/app/api/image-gen/route.ts`.

Real Sora, Runway, or video API:

- Use the `video` entry in `CAPABILITY_REGISTRY`.
- Fill `TOOL_SLOT_REGISTRY["real-video-gen"]`.
- Register a `rest-api` executor in `TOOL_EXECUTOR_REGISTRY["rest-api"]`.

Local file scanner:

- Use the `search` entry in `CAPABILITY_REGISTRY`.
- Use `TOOL_SLOT_REGISTRY["real-file-scanner"]`.
- Current executor path: `src/lib/tools/fs-scanner-executor.ts`.
- Current secure route path: `src/app/api/tools/fs-scanner/route.ts`.
- Register additional local scanners as `local-fs` executors in `TOOL_EXECUTOR_REGISTRY["local-fs"]`.
- Add any visual representation through `GRAPH_NODE_REGISTRY["tool-node"]`.

Database query or data analysis:

- Use the `data-analysis` entry in `CAPABILITY_REGISTRY`.
- Fill `TOOL_SLOT_REGISTRY["real-db-query"]`.
- Register a `db-query` executor in `TOOL_EXECUTOR_REGISTRY["db-query"]`.

L2 handoffs and routing:

- Start with `IWorkflowEdge`.
- Populate `HANDOFF_RULE_REGISTRY`.
- Do not add autonomous loops or hidden routing state outside the registry-backed workflow model.
- Current L2 Phase 1 uses persisted `WorkspaceGraphEdge` records as runtime
  handoff conduits, adapts them through `src/lib/workflow-engine.ts`, and
  blocks cyclic dispatch before triggering downstream agents.

New graph node UI:

- Start with `WorkflowGraphNodeType`.
- Fill the relevant entry in `GRAPH_NODE_REGISTRY`.
- Add React Flow components only after the schema slot and registry slot both exist.

## Current Boundary

The current app implements reliable panels, persisted chat agents, mock chat streaming, per-agent API settings, graph planning, L2 Phase 1 auto-handoff across directed graph edges with DAG guards, mock video generation, mock image fallback, real DALL-E image generation through the image adapter route, and a real bounded local project file scanner. Full workflow scheduling, backend persistence, auth, real video provider execution, and broad external tool execution remain intentionally unimplemented.
