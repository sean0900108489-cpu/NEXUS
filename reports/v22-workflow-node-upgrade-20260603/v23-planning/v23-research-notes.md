# V23 Research Notes

## Local Project Findings

Current NEXUS has three adjacent but distinct layers:

- Workspace export/import: full `WorkspaceSnapshot`, useful for recovery and
  portability.
- Backend state: cloud workspace snapshot plus entity projection rows such as
  `graph`, `settings`, `agent`, `memory`, `tool_state`, and `branch`.
- `Workflow Runtime Lite`: execution graph with runtime nodes, edges, runs,
  `ContextPacket`, and node execution state.

The missing layer is a canonical workflow design contract:

- It should not replace workspace snapshots.
- It should not replace runtimeLite execution state.
- It should sit between design, import/export, brain reasoning, validation, and
  runtime materialization.

## Safari NEXUS Advisory Signal

Safari NEXUS was used as a planning-only external critic. Its useful signal:

- Treat the canonical manifest as the single source of workflow truth.
- Keep graph UI, runtime, and backend persistence as consumers of the manifest.
- Put validation before import and before runtime mutation.
- Track snapshot timing explicitly: manual export, before run, after successful
  run, before migration, before agent edit, scheduled, publish/release.
- Consider backend tables/entities for workflow identity, versions, runs,
  node-runs, and snapshots.

Filtered decision:

Do not blindly add all those tables in V23. NEXUS already has workspace
snapshots and artifact persistence. The first high-ROI move is a local
contract/validator/bridge layer, then persistence can be added as a separate
migration once the contract is stable.

## External References

- Safari visible research query:
  `agent workflow graph JSON schema validation LangGraph n8n React Flow AgentSPEX`.
  This was used to keep the research path visible in the desktop environment.
- LangGraph persistence: checkpoints, threads, super-steps, pending writes,
  time travel, and fault tolerance.
  Source: https://docs.langchain.com/oss/javascript/langgraph/persistence
- n8n data structure: workflow data passes as item arrays with `json` and
  `binary` channels.
  Source: https://docs.n8n.io/data/data-flow-nodes/
- React Flow node API: node `id`, `position`, `data`, handles, drag handles,
  parent grouping, and accessibility fields support a richer graph editor.
  Source: https://reactflow.dev/api-reference/types/node
- Vercel Workflows: durable functions can pause/resume and retry long-running
  steps. This is future runtime infrastructure, not the V23 first cut.
  Source: https://vercel.com/docs/workflows
- Supabase JSON/JSONB: use JSONB for flexible schema data, but avoid overusing
  JSON where relational integrity and indexing matter.
  Source: https://supabase.com/docs/guides/database/json
- Supabase security/RLS: keep user data behind RLS and never expose service role
  keys to the frontend.
  Source: https://supabase.com/docs/guides/database/secure-data
- Agentproof: static verification of agent workflow graphs catches topology
  defects before runtime.
  Source: https://arxiv.org/abs/2603.20356
- AgentSPEX: explicit workflow specs with branching, loops, parallel execution,
  reusable modules, state, checkpointing, verification, logging, and synchronized
  graph/workflow views.
  Source: https://arxiv.org/abs/2604.13346
- GraphFlow: unified workflow graph primitives can support task-specific
  workflow generation and efficient state management.
  Source: https://arxiv.org/abs/2605.22566
- Flowise/Langflow/n8n/React Flow ecosystem: useful as design references for
  visual authoring, but NEXUS should avoid becoming a generic node toy. The
  differentiator should be brain-readable contracts plus upgrade proposals.

## Chrome Tool Status

Chrome automation was requested but unavailable in the current profile:

- Chrome is running.
- Native host manifest is present and correct.
- Codex Chrome Extension is not installed/enabled in the detected Profile 3.

Research therefore used official docs and web search rather than Chrome
automation.
