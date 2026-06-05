# Current-System Context Pack

Run: `nexus-current-system-intelligence-20260605-1215`

Static-only boundary: no production Supabase, no `src` business-logic edits.

## Carry Forward

- `/` is the primary Nexus Ops command surface: `src/app/page.tsx` -> `NexusOps`.
- `/style-lab` is the style system workbench: `src/app/style-lab/page.tsx` -> `NexusStyleLab`.
- Backend contract boundary: `src/lib/backend/api/api-handler.ts`.
- Browser/API request boundary: `src/lib/api/nexus-api-client.ts`.
- Supabase client boundaries: `src/lib/supabase/client.ts`, `src/lib/supabase/request.ts`, `src/lib/supabase/admin.ts`.
- Critical large files: src/components/nexus/nexus-ops.tsx (9654); src/components/nexus/nexus-graph.tsx (2346); src/components/nexus/workflow-pro/workflow-pro-surface.tsx (1722); src/components/style-engine/nexus-style-lab.tsx (5966); src/store/nexus-store.ts (4815); src/lib/state-sync.ts (1355).
- Primary local Supabase durable spine: agent_memory_records, agent_runtime_events, agent_runtime_sessions, agent_tasks, api_idempotency_keys, artifact_references, artifacts, deployment_checks, feature_flags, messages, notebooks, permission_audit_logs, prompt_revisions, prompts, sync_operations, system_events, tool_permissions, tool_runs, usage_metrics, workflow_templates, workspace_memberships, workspace_snapshots, workspace_state_entities, workspaces.

## Future-Round Guardrails

- Start with responsibility inventory before editing any file over 1000 lines.
- Start with migration map before restructuring any file over 3000 lines.
- Keep admin/service-role Supabase use on server-side backend boundaries only.
- Treat `state-sync.ts` as a cross-boundary file requiring tests for cloud/local sync behavior.
- Validate UI changes in both production shell and style lab when style/runtime tokens are involved.
