# 07 Supabase Touchpoint Map

No production Supabase was queried. This is local source plus local migration evidence only.

Discovered table signals: `agent_memory_records`, `agent_runtime_events`, `agent_runtime_sessions`, `agent_tasks`, `api_idempotency_keys`, `artifact_references`, `artifacts`, `deployment_checks`, `feature_flags`, `messages`, `notebooks`, `permission_audit_logs`, `prompt_revisions`, `prompts`, `sync_operations`, `system_events`, `tool_permissions`, `tool_runs`, `usage_metrics`, `workflow_templates`, `workspace_memberships`, `workspace_snapshots`, `workspace_state_entities`, `workspaces`

Discovered RPC/function signals: `backfill_message_history_fields`, `has_workspace_role`, `is_workspace_member`, `nexus_ensure_workspace_session`, `record_permission_audit_log`, `set_updated_at`

Storage signals: `nexus-generated-assets`

Env var names only: `NEXTAUTH_SECRET`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

| Layer | Source | Tables | RPC | Storage | Client boundary | Service role risk |
| --- | --- | --- | --- | --- | --- | --- |
| route-handler | [src/app/api/image-gen/route.test.ts](/Users/sean/Documents/FreeChat/src/app/api/image-gen/route.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| route-handler | [src/app/api/image-gen/route.ts](/Users/sean/Documents/FreeChat/src/app/api/image-gen/route.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| route-handler | [src/app/api/memory-compress/route.ts](/Users/sean/Documents/FreeChat/src/app/api/memory-compress/route.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| route-handler | [src/app/api/predictive-intel/route.ts](/Users/sean/Documents/FreeChat/src/app/api/predictive-intel/route.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| route-handler | [src/app/api/v1/providers/verify/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/providers/verify/route.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| route-handler | [src/app/api/v1/workspaces/session/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/workspaces/session/route.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| route-handler | [src/app/api/workflow-pro/brain-draft/route.ts](/Users/sean/Documents/FreeChat/src/app/api/workflow-pro/brain-draft/route.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| ui-component | [src/components/nexus/auth-screen.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/auth-screen.tsx) | - | - | - | browser-public-client | not indicated by static layer |
| ui-component | [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx) | - | - | - | browser-public-client, request-user-token-client | not indicated by static layer |
| ui-component | [src/components/style-engine/nexus-style-lab-surface-style-coverage.test.ts](/Users/sean/Documents/FreeChat/src/components/style-engine/nexus-style-lab-surface-style-coverage.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| ui-component | [src/components/style-engine/nexus-style-lab.tsx](/Users/sean/Documents/FreeChat/src/components/style-engine/nexus-style-lab.tsx) | - | - | - | request-user-token-client | not indicated by static layer |
| shared-lib | [src/lib/adapters/image-adapter.test.ts](/Users/sean/Documents/FreeChat/src/lib/adapters/image-adapter.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| shared-lib | [src/lib/adapters/image-adapter.ts](/Users/sean/Documents/FreeChat/src/lib/adapters/image-adapter.ts) | - | - | - | browser-public-client, request-user-token-client | not indicated by static layer |
| shared-lib | [src/lib/adapters/memory-compression-adapter.ts](/Users/sean/Documents/FreeChat/src/lib/adapters/memory-compression-adapter.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| shared-lib | [src/lib/api/nexus-api-client.ts](/Users/sean/Documents/FreeChat/src/lib/api/nexus-api-client.ts) | - | - | - | browser-public-client, request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/api/agent-stream-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/api/agent-stream-service.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/api/api-auth-test-helper.ts](/Users/sean/Documents/FreeChat/src/lib/backend/api/api-auth-test-helper.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/api/api-contract.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/api/api-contract.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/api/idempotency-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/api/idempotency-repository.ts) | api_idempotency_keys | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/api/memory-compress-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/api/memory-compress-service.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/artifacts/artifact-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/artifacts/artifact-repository.ts) | artifact_references, artifacts | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/artifacts/artifact-service.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/artifacts/artifact-service.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/deployment/deployment-check-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/deployment/deployment-check-service.ts) | deployment_checks | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/deployment/environment-validator.ts](/Users/sean/Documents/FreeChat/src/lib/backend/deployment/environment-validator.ts) | - | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/deployment/feature-flag-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/deployment/feature-flag-service.ts) | feature_flags | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/history/agent-memory-record-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/history/agent-memory-record-repository.ts) | agent_memory_records | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/history/message-history-service.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/history/message-history-service.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/history/message-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/history/message-repository.ts) | messages | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/history/storage-partition-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/history/storage-partition-service.ts) | - | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/image-generation/generated-image-asset-storage.ts](/Users/sean/Documents/FreeChat/src/lib/backend/image-generation/generated-image-asset-storage.ts) | - | - | nexus-generated-assets | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/notebooks/notebook-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/notebooks/notebook-repository.ts) | notebooks, workspace_memberships | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/notebooks/notebook-route.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/notebooks/notebook-route.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/observability/observability-service.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/observability/observability-service.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/observability/system-event-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/observability/system-event-repository.ts) | system_events | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/observability/usage-metrics-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/observability/usage-metrics-repository.ts) | usage_metrics | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/primitives/redaction.ts](/Users/sean/Documents/FreeChat/src/lib/backend/primitives/redaction.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/prompts/prompt-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/prompts/prompt-repository.ts) | prompt_revisions, prompts, workspace_memberships | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/prompts/prompt-route.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/prompts/prompt-route.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/runtime/agent-runtime-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/runtime/agent-runtime-repository.ts) | agent_runtime_events, agent_runtime_sessions, agent_tasks | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/runtime/agent-runtime-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/runtime/agent-runtime-service.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/runtime/agent-runtime.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/runtime/agent-runtime.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/runtime/provider-adapter.ts](/Users/sean/Documents/FreeChat/src/lib/backend/runtime/provider-adapter.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/security/auth-boundary-gate.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/auth-boundary-gate.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/security/auth-session.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/auth-session.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/security/frontend-bundle-safety.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/frontend-bundle-safety.test.ts) | - | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/security/repositories.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/repositories.ts) | permission_audit_logs, workspace_memberships | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/security/route-spoof-boundary.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/route-spoof-boundary.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/security/secret-boundary-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/secret-boundary-service.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/security/security-services.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/security-services.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/sync/sync-operation-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/sync/sync-operation-repository.ts) | sync_operations | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/sync/sync-queue.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/sync/sync-queue.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/tools/tool-permission-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/tools/tool-permission-repository.ts) | tool_permissions | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/tools/tool-run-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/tools/tool-run-repository.ts) | tool_runs | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/workspace/workspace-permission-request.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-permission-request.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/workspace/workspace-permission.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-permission.ts) | workspace_memberships, workspaces | record_permission_audit_log | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/workspace/workspace-session-service.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-session-service.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| backend-service-repository | [src/lib/backend/workspace/workspace-session-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-session-service.ts) | workspace_memberships, workspaces | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/workspace/workspace-snapshot-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-snapshot-repository.ts) | workspace_snapshots | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/workspace/workspace-state-entity-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-state-entity-repository.ts) | workspace_state_entities | - | - | - | not indicated by static layer |
| backend-service-repository | [src/lib/backend/workspace/workspace-state.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-state.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| state-sync-bridge | [src/lib/state-sync.ts](/Users/sean/Documents/FreeChat/src/lib/state-sync.ts) | prompt_revisions, workflow_templates | - | - | browser-public-client, request-user-token-client | not indicated by static layer |
| shared-lib | [src/lib/style-engine/exchange.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/exchange.test.ts) | - | - | - | - | review |
| shared-lib | [src/lib/style-engine/governance.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/governance.test.ts) | - | - | - | - | review |
| shared-lib | [src/lib/style-engine/import-text.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/import-text.test.ts) | - | - | - | - | review |
| shared-lib | [src/lib/style-engine/v2-review-import.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/v2-review-import.test.ts) | - | - | - | - | review |
| shared-lib | [src/lib/style-engine/v2-token-preview.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/v2-token-preview.test.ts) | - | - | - | - | review |
| shared-lib | [src/lib/style-engine/v2-validators.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/v2-validators.ts) | - | - | - | - | review |
| shared-lib | [src/lib/style-engine/validator.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/validator.test.ts) | - | - | - | - | review |
| shared-lib | [src/lib/style-engine/validator.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/validator.ts) | - | - | - | - | review |
| supabase-client-boundary | [src/lib/supabase/admin.ts](/Users/sean/Documents/FreeChat/src/lib/supabase/admin.ts) | - | - | - | - | not indicated by static layer |
| supabase-client-boundary | [src/lib/supabase/client.test.ts](/Users/sean/Documents/FreeChat/src/lib/supabase/client.test.ts) | - | - | - | browser-public-client | not indicated by static layer |
| supabase-client-boundary | [src/lib/supabase/client.ts](/Users/sean/Documents/FreeChat/src/lib/supabase/client.ts) | - | - | - | browser-public-client | not indicated by static layer |
| supabase-client-boundary | [src/lib/supabase/request.ts](/Users/sean/Documents/FreeChat/src/lib/supabase/request.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| supabase-client-boundary | [src/lib/supabase/test-connection.ts](/Users/sean/Documents/FreeChat/src/lib/supabase/test-connection.ts) | workspaces | - | - | browser-public-client | not indicated by static layer |
| shared-lib | [src/lib/sync/local-sync-queue-adapter.test.ts](/Users/sean/Documents/FreeChat/src/lib/sync/local-sync-queue-adapter.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| shared-lib | [src/lib/sync/local-sync-queue-adapter.ts](/Users/sean/Documents/FreeChat/src/lib/sync/local-sync-queue-adapter.ts) | - | - | - | browser-public-client | not indicated by static layer |
| shared-lib | [src/lib/workflow-runtime-lite/llm-client.test.ts](/Users/sean/Documents/FreeChat/src/lib/workflow-runtime-lite/llm-client.test.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| shared-lib | [src/lib/workflow-runtime-lite/llm-client.ts](/Users/sean/Documents/FreeChat/src/lib/workflow-runtime-lite/llm-client.ts) | - | - | - | browser-public-client, request-user-token-client | not indicated by static layer |
| shared-lib | [src/lib/workflow-runtime-lite/state.ts](/Users/sean/Documents/FreeChat/src/lib/workflow-runtime-lite/state.ts) | - | - | - | request-user-token-client | not indicated by static layer |
| state-store | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts) | - | - | - | browser-public-client, request-user-token-client | not indicated by static layer |

## Local Migration / RLS Evidence

| Migration | Tables | Functions | RLS signal | Policies |
| --- | --- | --- | --- | --- |
| [supabase/migrations/20260525000000_create_workflow_templates.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260525000000_create_workflow_templates.sql) | workflow_templates | - | not detected | 0 |
| [supabase/migrations/20260527000000_security_boundary_rls_foundation.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527000000_security_boundary_rls_foundation.sql) | artifacts, messages, notebooks, permission_audit_logs, prompts, workflow_templates, workspace_memberships, workspaces | has_workspace_role, is_workspace_member, set_updated_at | yes | 28 |
| [supabase/migrations/20260527001000_api_idempotency_keys.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527001000_api_idempotency_keys.sql) | api_idempotency_keys | - | yes | 0 |
| [supabase/migrations/20260527002000_workspace_cloud_state.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527002000_workspace_cloud_state.sql) | workspace_snapshots, workspace_state_entities | set_updated_at | yes | 7 |
| [supabase/migrations/20260527003000_durable_sync_queue.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527003000_durable_sync_queue.sql) | sync_operations | - | yes | 3 |
| [supabase/migrations/20260527004000_deployment_safety_gate.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527004000_deployment_safety_gate.sql) | deployment_checks, feature_flags | - | yes | 3 |
| [supabase/migrations/20260527005000_agent_runtime_sessions.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527005000_agent_runtime_sessions.sql) | agent_runtime_events, agent_runtime_sessions, agent_tasks | - | yes | 7 |
| [supabase/migrations/20260527006000_tool_execution_control_plane.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527006000_tool_execution_control_plane.sql) | tool_permissions, tool_runs | - | yes | 6 |
| [supabase/migrations/20260527007000_artifact_asset_layer.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527007000_artifact_asset_layer.sql) | artifact_references, artifacts | - | yes | 3 |
| [supabase/migrations/20260527008000_observability_event_spine.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527008000_observability_event_spine.sql) | system_events, usage_metrics | - | yes | 2 |
| [supabase/migrations/20260527009000_historical_data_paging.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527009000_historical_data_paging.sql) | agent_memory_records, messages | backfill_message_history_fields | yes | 2 |
| [supabase/migrations/20260527010000_notebook_durable_tombstones.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527010000_notebook_durable_tombstones.sql) | notebooks | set_updated_at | yes | 4 |
| [supabase/migrations/20260527011000_prompt_durable_tombstones.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527011000_prompt_durable_tombstones.sql) | prompts | - | yes | 4 |
| [supabase/migrations/20260527012000_message_history_base_table.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527012000_message_history_base_table.sql) | messages | - | yes | 4 |
| [supabase/migrations/20260527013000_prompt_revision_history.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527013000_prompt_revision_history.sql) | prompt_revisions | - | yes | 3 |
| [supabase/migrations/20260529001000_artifacts_tool_runs_live_parity.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260529001000_artifacts_tool_runs_live_parity.sql) | artifacts, tool_permissions, tool_runs | - | yes | 9 |
| [supabase/migrations/20260601001000_v20_auth_boundary_rls_hardening.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260601001000_v20_auth_boundary_rls_hardening.sql) | api_idempotency_keys, permission_audit_logs, workspaces | - | yes | 2 |
| [supabase/migrations/20260601002000_v20_client_grant_hardening.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260601002000_v20_client_grant_hardening.sql) | - | - | not detected | 0 |
| [supabase/migrations/20260601003000_v20_schema_live_parity_repair.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260601003000_v20_schema_live_parity_repair.sql) | agent_memory_records, deployment_checks, feature_flags | - | yes | 5 |
| [supabase/migrations/20260601004000_v20_schema_live_parity_grant_tightening.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260601004000_v20_schema_live_parity_grant_tightening.sql) | - | - | not detected | 0 |
| [supabase/migrations/20260603001000_v22_rls_policy_performance_hardening.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260603001000_v22_rls_policy_performance_hardening.sql) | agent_memory_records, agent_runtime_sessions, tool_runs | - | yes | 6 |
| [supabase/migrations/20260603002000_v22_workspace_session_rpc.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260603002000_v22_workspace_session_rpc.sql) | - | nexus_ensure_workspace_session | not detected | 0 |
| [supabase/migrations/20260604081500_v22_workspace_session_viewer_readable.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260604081500_v22_workspace_session_viewer_readable.sql) | - | nexus_ensure_workspace_session | not detected | 0 |
| [supabase/migrations/20260604093000_v22_generated_image_storage.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260604093000_v22_generated_image_storage.sql) | - | - | not detected | 4 |
| [supabase/migrations/20260604102000_v22_request_scoped_permission_audit_rpc.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260604102000_v22_request_scoped_permission_audit_rpc.sql) | - | record_permission_audit_log | not detected | 0 |
