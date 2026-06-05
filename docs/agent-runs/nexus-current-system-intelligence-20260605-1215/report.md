# NEXUS Current System Intelligence

Run ID: `nexus-current-system-intelligence-20260605-1215`

Scope: static local analysis only. No production Supabase calls were made, and no `src` business logic was modified. The unavailable named skill `$nexus-current-system-cartographer` was replaced with the confirmed available `private-codebase-wiki` skill because it matches private Next.js + Supabase system cartography.

## Executive Snapshot

| Signal | Count |
| --- | --- |
| App route files | 55 |
| Pages | 2 |
| Layouts | 1 |
| Route handlers | 52 |
| UI/component files scanned | 41 |
| Interaction signals | 576 |
| Frontend/backend coupling files | 89 |
| Supabase source touchpoint files | 80 |
| Local migration files | 25 |

Evidence-first reading: NEXUS is a two-page App Router product surface with a large primary operations console at `/`, a dedicated style lab at `/style-lab`, and a wide API/control-plane layer under `/api` and `/api/v1`. The system is currently dominated by a few very large orchestration files; that is workable for mapping, but future implementation should start with responsibility inventories rather than direct broad edits.

## Route/Page Map

| Route | Type | Methods | File | Primary signals |
| --- | --- | --- | --- | --- |
| /api/agent-stream | route-handler | POST | [src/app/api/agent-stream/route.ts](/Users/sean/Documents/FreeChat/src/app/api/agent-stream/route.ts:10) | - |
| /api/image-gen/assets/[assetId] | route-handler | GET | [src/app/api/image-gen/assets/[assetId]/route.ts](/Users/sean/Documents/FreeChat/src/app/api/image-gen/assets/[assetId]/route.ts:7) | - |
| /api/image-gen | route-handler | POST | [src/app/api/image-gen/route.ts](/Users/sean/Documents/FreeChat/src/app/api/image-gen/route.ts:70) | ImageAdapterResult, PermissionService |
| /api/memory-compress | route-handler | POST | [src/app/api/memory-compress/route.ts](/Users/sean/Documents/FreeChat/src/app/api/memory-compress/route.ts:12) | - |
| /api/predictive-intel | route-handler | POST | [src/app/api/predictive-intel/route.ts](/Users/sean/Documents/FreeChat/src/app/api/predictive-intel/route.ts:120) | - |
| /api/system-status | route-handler | GET | [src/app/api/system-status/route.ts](/Users/sean/Documents/FreeChat/src/app/api/system-status/route.ts:5) | - |
| /api/tools/fs-scanner | route-handler | GET, POST | [src/app/api/tools/fs-scanner/route.ts](/Users/sean/Documents/FreeChat/src/app/api/tools/fs-scanner/route.ts:190) | FileSystemScanResult, FileSystemTreeNode |
| /api/tools/web-surfer | route-handler | GET, POST | [src/app/api/tools/web-surfer/route.ts](/Users/sean/Documents/FreeChat/src/app/api/tools/web-surfer/route.ts:110) | - |
| /api/v1/agents/[agentId]/memory | route-handler | GET | [src/app/api/v1/agents/[agentId]/memory/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/agents/[agentId]/memory/route.ts:15) | apiHandler |
| /api/v1/agents/[agentId]/messages/archive | route-handler | POST | [src/app/api/v1/agents/[agentId]/messages/archive/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/agents/[agentId]/messages/archive/route.ts:19) | MessageArchiveRequest, apiHandler |
| /api/v1/agents/[agentId]/messages | route-handler | GET | [src/app/api/v1/agents/[agentId]/messages/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/agents/[agentId]/messages/route.ts:11) | apiHandler |
| /api/v1/agents/[agentId]/stream | route-handler | POST | [src/app/api/v1/agents/[agentId]/stream/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/agents/[agentId]/stream/route.ts:14) | - |
| /api/v1/agents/[agentId]/tasks/[taskId]/cancel | route-handler | POST | [src/app/api/v1/agents/[agentId]/tasks/[taskId]/cancel/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/agents/[agentId]/tasks/[taskId]/cancel/route.ts:22) | CancelTaskRequest, apiHandler |
| /api/v1/agents/[agentId]/tasks/[taskId] | route-handler | GET | [src/app/api/v1/agents/[agentId]/tasks/[taskId]/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/agents/[agentId]/tasks/[taskId]/route.ts:14) | apiHandler |
| /api/v1/agents/[agentId]/tasks | route-handler | POST | [src/app/api/v1/agents/[agentId]/tasks/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/agents/[agentId]/tasks/route.ts:23) | AgentTaskCreateRequest, apiHandler |
| /api/v1/agents/memory-compress | route-handler | POST | [src/app/api/v1/agents/memory-compress/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/agents/memory-compress/route.ts:15) | apiHandler |
| /api/v1/artifacts/[artifactId]/archive | route-handler | POST | [src/app/api/v1/artifacts/[artifactId]/archive/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/artifacts/[artifactId]/archive/route.ts:18) | ArtifactArchiveRequest, apiHandler |
| /api/v1/artifacts/[artifactId]/asset | route-handler | GET | [src/app/api/v1/artifacts/[artifactId]/asset/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/artifacts/[artifactId]/asset/route.ts:15) | - |
| /api/v1/artifacts/[artifactId]/references | route-handler | POST | [src/app/api/v1/artifacts/[artifactId]/references/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/artifacts/[artifactId]/references/route.ts:18) | ArtifactReferenceCreateRequest, apiHandler |
| /api/v1/artifacts/[artifactId] | route-handler | GET | [src/app/api/v1/artifacts/[artifactId]/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/artifacts/[artifactId]/route.ts:12) | apiHandler |
| /api/v1/artifacts/[artifactId]/versions | route-handler | POST | [src/app/api/v1/artifacts/[artifactId]/versions/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/artifacts/[artifactId]/versions/route.ts:18) | ArtifactVersionCreateRequest, apiHandler |
| /api/v1/artifacts | route-handler | GET, POST | [src/app/api/v1/artifacts/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/artifacts/route.ts:15) | CreateArtifactRequest, apiHandler |
| /api/v1/deployment/checks/latest | route-handler | GET | [src/app/api/v1/deployment/checks/latest/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/deployment/checks/latest/route.ts:10) | apiHandler |
| /api/v1/deployment/checks/run | route-handler | POST | [src/app/api/v1/deployment/checks/run/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/deployment/checks/run/route.ts:24) | DeploymentEnvironment, apiHandler |
| /api/v1/feature-flags/[flagKey]/toggle | route-handler | POST | [src/app/api/v1/feature-flags/[flagKey]/toggle/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/feature-flags/[flagKey]/toggle/route.ts:22) | FeatureFlagToggleRequest, apiHandler |
| /api/v1/feature-flags | route-handler | GET | [src/app/api/v1/feature-flags/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/feature-flags/route.ts:10) | apiHandler |
| /api/v1/health | route-handler | GET | [src/app/api/v1/health/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/health/route.ts:9) | apiHandler |
| /api/v1/notebooks | route-handler | GET | [src/app/api/v1/notebooks/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/notebooks/route.ts:17) | apiHandler |
| /api/v1/observability/events | route-handler | GET | [src/app/api/v1/observability/events/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/observability/events/route.ts:16) | apiHandler |
| /api/v1/observability/metrics | route-handler | GET | [src/app/api/v1/observability/metrics/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/observability/metrics/route.ts:12) | apiHandler |
| /api/v1/observability/traces/[traceId] | route-handler | GET | [src/app/api/v1/observability/traces/[traceId]/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/observability/traces/[traceId]/route.ts:16) | apiHandler |
| /api/v1/prompts | route-handler | GET | [src/app/api/v1/prompts/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/prompts/route.ts:17) | apiHandler |
| /api/v1/providers/status | route-handler | GET | [src/app/api/v1/providers/status/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/providers/status/route.ts:5) | - |
| /api/v1/providers/verify | route-handler | POST | [src/app/api/v1/providers/verify/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/providers/verify/route.ts:32) | - |
| /api/v1/public-config | route-handler | GET | [src/app/api/v1/public-config/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/public-config/route.ts:6) | apiHandler |
| /api/v1/sync/operations/[operationId]/cancel | route-handler | POST | [src/app/api/v1/sync/operations/[operationId]/cancel/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/sync/operations/[operationId]/cancel/route.ts:23) | CancelRequestBody, apiHandler |
| /api/v1/sync/operations/[operationId]/retry | route-handler | POST | [src/app/api/v1/sync/operations/[operationId]/retry/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/sync/operations/[operationId]/retry/route.ts:24) | RetryRequestBody, apiHandler |
| /api/v1/sync/operations | route-handler | POST | [src/app/api/v1/sync/operations/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/sync/operations/route.ts:15) | SyncOperationRequest, apiHandler |
| /api/v1/sync/status | route-handler | GET | [src/app/api/v1/sync/status/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/sync/status/route.ts:10) | apiHandler |
| /api/v1/tool-runs/[toolRunId]/cancel | route-handler | POST | [src/app/api/v1/tool-runs/[toolRunId]/cancel/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/tool-runs/[toolRunId]/cancel/route.ts:20) | ToolRunCancelRequest, apiHandler |
| /api/v1/tool-runs/[toolRunId]/confirm | route-handler | POST | [src/app/api/v1/tool-runs/[toolRunId]/confirm/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/tool-runs/[toolRunId]/confirm/route.ts:21) | ToolRunConfirmRequest, apiHandler |
| /api/v1/tool-runs/[toolRunId] | route-handler | GET | [src/app/api/v1/tool-runs/[toolRunId]/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/tool-runs/[toolRunId]/route.ts:13) | apiHandler |
| /api/v1/tool-runs | route-handler | GET | [src/app/api/v1/tool-runs/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/tool-runs/route.ts:9) | apiHandler |
| /api/v1/tools/[toolId]/run | route-handler | POST | [src/app/api/v1/tools/[toolId]/run/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/tools/[toolId]/run/route.ts:19) | ToolRunRequest, apiHandler |
| /api/v1/workflows/groups | route-handler | POST | [src/app/api/v1/workflows/groups/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/workflows/groups/route.ts:66) | NonNullable, WorkflowGroupRecordWriteRequest, WorkflowRuntimeGroupRef, WorkflowRuntimeNodeStatus, WorkflowRuntimeNodeType, apiHandler |
| /api/v1/workflows/runtime-trace | route-handler | POST | [src/app/api/v1/workflows/runtime-trace/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/workflows/runtime-trace/route.ts:64) | NonNullable, WorkflowRuntimeGroupRef, WorkflowRuntimeNodeStatus, WorkflowRuntimeRunStatus, WorkflowRuntimeTraceWriteRequest, apiHandler |
| /api/v1/workspaces/[workspaceId]/state | route-handler | GET, PUT | [src/app/api/v1/workspaces/[workspaceId]/state/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/workspaces/[workspaceId]/state/route.ts:30) | WorkspaceCloudSnapshotType, WorkspaceStatePutRequest, apiHandler |
| /api/v1/workspaces/recovery/[workspaceId] | route-handler | GET | [src/app/api/v1/workspaces/recovery/[workspaceId]/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/workspaces/recovery/[workspaceId]/route.ts:20) | apiHandler |
| /api/v1/workspaces/recovery/latest | route-handler | GET | [src/app/api/v1/workspaces/recovery/latest/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/workspaces/recovery/latest/route.ts:13) | apiHandler |
| /api/v1/workspaces/recovery | route-handler | GET | [src/app/api/v1/workspaces/recovery/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/workspaces/recovery/route.ts:17) | apiHandler |
| /api/v1/workspaces/session | route-handler | POST | [src/app/api/v1/workspaces/session/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/workspaces/session/route.ts:27) | WorkspaceSessionEnsureRequest, WorkspaceSessionEnsureResponse, apiHandler |
| /api/workflow-pro/brain-draft | route-handler | POST | [src/app/api/workflow-pro/brain-draft/route.ts](/Users/sean/Documents/FreeChat/src/app/api/workflow-pro/brain-draft/route.ts:26) | WorkflowGraphBrainModelSettings, WorkflowGraphBrainPlannerResult |
| / | layout | - | [src/app/layout.tsx](/Users/sean/Documents/FreeChat/src/app/layout.tsx:22) | ThemeProvider |
| / | page | - | [src/app/page.tsx](/Users/sean/Documents/FreeChat/src/app/page.tsx:12) | NexusOps, NexusProductionPageShellBoundary, NexusProductionPreviewController, NexusStyleRuntimeProvider |
| /style-lab | page | - | [src/app/style-lab/page.tsx](/Users/sean/Documents/FreeChat/src/app/style-lab/page.tsx:4) | NexusStyleLab, NexusStyleRuntimeProvider |

## UI Surface Map

| File | Role | Lines | Events | Buttons | Components / responsibilities |
| --- | --- | --- | --- | --- | --- |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx) | primary-production-command-surface | 9654 | 290 | 67 | AgentActionToolbar, AgentModelTuningPanel, AgentSettingsSidebar, AgentTemplateProfilePanel, AgentWindow, CollapsedSidebarRail, /api/v1/providers/status, /api/v1/providers/verify, nexusApiClient.get |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx) | graph-orchestration-surface | 2346 | 63 | 15 | AgentNode, BlueprintEdge, FileRuntimeEditor, InputTextRuntimeEditor, ModelImageRuntimeEditor, ModelRuntimeEditor, /api/workflow-pro/brain-draft |
| [src/components/nexus/workflow-pro/workflow-pro-surface.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/workflow-pro/workflow-pro-surface.tsx) | workflow-pro-operator-surface | 1722 | 23 | 12 | WorkflowProActiveModeBay, WorkflowProActiveModeDetails, WorkflowProBrainProposalIntake, WorkflowProCapabilityRegistry, WorkflowProDesignGate, WorkflowProDetailGrid |
| [src/components/style-engine/nexus-style-lab.tsx](/Users/sean/Documents/FreeChat/src/components/style-engine/nexus-style-lab.tsx) | style-system-lab-surface | 5966 | 33 | 30 | Icon, NexusStyleLab |
| [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts) | global-client-state-store | 4815 | 0 | 0 | DEFAULT_AUTH_VAULT, EMPTY_ARTIFACT_VAULT_CACHE, HISTORY_FETCH_DEBOUNCE_MS, LEGACY_LOCAL_STORAGE_KEYS, OMITTED_IMAGE_DATA_URL_FOR_LOCAL_PERSISTENCE, PERSIST_STORAGE_NAME, nexusApiClient.post |
| [src/lib/state-sync.ts](/Users/sean/Documents/FreeChat/src/lib/state-sync.ts) | state-to-cloud-sync-bridge | 1355 | 0 | 0 | nexusApiClient.get, nexusApiClient.post |
| [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx) | supporting-ui | 490 | 19 | 8 | AgentBranchModal, DEFAULT_PROFILE |
| [src/components/nexus/DatapadWindow.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/DatapadWindow.tsx) | supporting-ui | 157 | 8 | 3 | DatapadWindow |
| [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx) | supporting-ui | 323 | 9 | 7 | PromptVaultManager |
| [src/components/nexus/auth-screen.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/auth-screen.tsx) | supporting-ui | 171 | 4 | 2 | AUTH_PROMPT_MESSAGE, AuthScreen, CHECKING_SESSION_MESSAGE |
| [src/components/nexus/dynamic-icon.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/dynamic-icon.tsx) | supporting-ui | 42 | 0 | 0 | DynamicIcon, Icon |
| [src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts) | supporting-ui | 95 | 4 | 0 | AgentBranchModal |
| [src/components/nexus/nexus-agent-window-chrome-primitive.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-agent-window-chrome-primitive.test.ts) | supporting-ui | 119 | 2 | 0 | AgentWindow, SandboxCanvas |
| [src/components/nexus/nexus-command-palette-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-command-palette-shell-selector.test.ts) | supporting-ui | 125 | 4 | 0 | CommandPalette |
| [src/components/nexus/nexus-control-primitive-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-control-primitive-selector.test.ts) | supporting-ui | 57 | 1 | 0 | supporting-ui |
| [src/components/nexus/nexus-datapad-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-datapad-shell-selector.test.ts) | supporting-ui | 94 | 8 | 0 | DatapadWindow |
| [src/components/nexus/nexus-generated-history-hydration.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-generated-history-hydration.test.ts) | supporting-ui | 15 | 0 | 0 | supporting-ui |
| [src/components/nexus/nexus-message-bubble-primitive.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-message-bubble-primitive.test.ts) | supporting-ui | 97 | 0 | 0 | MessageBubble, WorkspaceChatComposerShell |
| [src/components/nexus/nexus-ops-body-frame.test.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-body-frame.test.tsx) | primary-production-command-surface | 110 | 0 | 0 | primary-production-command-surface |
| [src/components/nexus/nexus-ops-body-frame.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-body-frame.tsx) | primary-production-command-surface | 19 | 0 | 0 | NexusOpsBodyFrame |
| [src/components/nexus/nexus-ops-extraction-map.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-extraction-map.test.ts) | primary-production-command-surface | 135 | 0 | 0 | primary-production-command-surface |
| [src/components/nexus/nexus-ops-outer-shell-frame.test.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-outer-shell-frame.test.tsx) | primary-production-command-surface | 131 | 0 | 0 | primary-production-command-surface |
| [src/components/nexus/nexus-ops-outer-shell-frame.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-outer-shell-frame.tsx) | primary-production-command-surface | 16 | 0 | 0 | NexusOpsOuterShellFrame |
| [src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx) | primary-production-command-surface | 147 | 0 | 4 | primary-production-command-surface |
| [src/components/nexus/nexus-ops-right-floating-dock-frame.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-right-floating-dock-frame.tsx) | primary-production-command-surface | 21 | 0 | 0 | NexusOpsRightFloatingDockFrame |
| [src/components/nexus/nexus-ops-top-bar-frame.test.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-top-bar-frame.test.tsx) | primary-production-command-surface | 146 | 0 | 3 | primary-production-command-surface |
| [src/components/nexus/nexus-ops-top-bar-frame.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-top-bar-frame.tsx) | primary-production-command-surface | 26 | 0 | 0 | NexusOpsTopBarFrame |
| [src/components/nexus/nexus-production-page-shell-boundary.test.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-production-page-shell-boundary.test.tsx) | supporting-ui | 105 | 0 | 0 | supporting-ui |
| [src/components/nexus/nexus-production-page-shell-boundary.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-production-page-shell-boundary.tsx) | supporting-ui | 32 | 0 | 0 | NEXUS_PRODUCTION_PAGE_SHELL_BOUNDARY_VERSION_V1, NEXUS_PRODUCTION_PAGE_SHELL_IDS_V1, NexusProductionPageShellBoundary |
| [src/components/nexus/nexus-production-preview-controller.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-production-preview-controller.test.ts) | supporting-ui | 76 | 0 | 0 | supporting-ui |
| [src/components/nexus/nexus-production-preview-controller.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-production-preview-controller.tsx) | supporting-ui | 460 | 2 | 2 | NexusProductionPreviewController |
| [src/components/nexus/nexus-production-style-layer-contract.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-production-style-layer-contract.test.ts) | supporting-ui | 149 | 0 | 0 | NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR |
| [src/components/nexus/nexus-theme-panel-live-style-controls.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-theme-panel-live-style-controls.test.ts) | supporting-ui | 333 | 0 | 0 | WorkspaceStyleControlsPanel |
| [src/components/nexus/nexus-workspace-chat-composer-shell.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-workspace-chat-composer-shell.test.ts) | supporting-ui | 231 | 4 | 0 | supporting-ui |
| [src/components/nexus/nexus-workspace-primitive.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-workspace-primitive.test.ts) | supporting-ui | 75 | 0 | 0 | supporting-ui |
| [src/components/nexus/nexus-workspace-readonly-gate.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-workspace-readonly-gate.test.ts) | supporting-ui | 33 | 0 | 0 | supporting-ui |
| [src/components/nexus/nexus-workspace-style-payload-export-import.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-workspace-style-payload-export-import.test.ts) | supporting-ui | 88 | 0 | 0 | supporting-ui |
| [src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx) | workflow-pro-operator-surface | 237 | 6 | 0 | workflow-pro-operator-surface |

Large-file inventory:

| File | Lines | Inventory needed | Migration map needed | Responsibility signals |
| --- | --- | --- | --- | --- |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx) | 9654 | yes | yes | agent/chat/composer orchestration; cloud sync/workspace/artifact persistence bridge; global state mutation and persistence; provider/model configuration; style/runtime preview controls; workflow graph and Brain proposal operations |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx) | 2346 | yes | no | agent/chat/composer orchestration; cloud sync/workspace/artifact persistence bridge; provider/model configuration; style/runtime preview controls; workflow graph and Brain proposal operations |
| [src/components/nexus/workflow-pro/workflow-pro-surface.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/workflow-pro/workflow-pro-surface.tsx) | 1722 | yes | no | agent/chat/composer orchestration; cloud sync/workspace/artifact persistence bridge; provider/model configuration; style/runtime preview controls; workflow graph and Brain proposal operations |
| [src/components/style-engine/nexus-style-lab.tsx](/Users/sean/Documents/FreeChat/src/components/style-engine/nexus-style-lab.tsx) | 5966 | yes | yes | agent/chat/composer orchestration; cloud sync/workspace/artifact persistence bridge; global state mutation and persistence; provider/model configuration; style/runtime preview controls; workflow graph and Brain proposal operations |
| [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts) | 4815 | yes | yes | agent/chat/composer orchestration; cloud sync/workspace/artifact persistence bridge; global state mutation and persistence; provider/model configuration; style/runtime preview controls; workflow graph and Brain proposal operations |
| [src/lib/state-sync.ts](/Users/sean/Documents/FreeChat/src/lib/state-sync.ts) | 1355 | yes | no | agent/chat/composer orchestration; cloud sync/workspace/artifact persistence bridge; global state mutation and persistence; style/runtime preview controls; workflow graph and Brain proposal operations |

## Button Interaction Map

| Domain | Event | Label / handler signal | File |
| --- | --- | --- | --- |
| agent-chat | button | Close branch agent interface | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:136) |
| agent-chat | onClick | Close branch agent interface | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:137) |
| agent-chat | onClick | onClose | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:140) |
| agent-chat | onClick | () | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:162) |
| agent-chat | onClick | () | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:164) |
| agent-chat | onClick | () | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:172) |
| agent-chat | onClick | () | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:174) |
| agent-chat | onClick | onClose | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:182) |
| agent-chat | onClick | onClose | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:184) |
| agent-chat | button | </div> <div className="grid gap-2 sm:grid-cols-2"> <button className={`border px-4 py-3 text-left tr | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:216) |
| agent-chat | onClick | () | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:223) |
| agent-chat | button | </span> </button> <button className={`border px-4 py-3 text-left transition ${ mode === "summary" ?  | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:233) |
| agent-chat | onClick | () | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:240) |
| agent-chat | onChange | (event) | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:267) |
| agent-chat | onChange | (event) | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:287) |
| agent-chat | onChange | (event) | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:307) |
| agent-chat | onChange | (event) | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:334) |
| agent-chat | onChange | (event) | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:367) |
| agent-chat | onChange | (event) | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:400) |
| agent-chat | onChange | (event) | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:433) |
| agent-chat | onClick | onClose | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:462) |
| agent-chat | onClick | onClose | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:465) |
| agent-chat | onClick | () | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:470) |
| agent-chat | onClick | () | [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx:473) |
| style-system | onDragStart | bringToFront | [src/components/nexus/DatapadWindow.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/DatapadWindow.tsx:92) |
| style-system | onDragStart | bringToFront | [src/components/nexus/DatapadWindow.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/DatapadWindow.tsx:93) |
| general-ui | onChange | Datapad title | [src/components/nexus/DatapadWindow.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/DatapadWindow.tsx:100) |
| general-ui | onChange | Datapad title | [src/components/nexus/DatapadWindow.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/DatapadWindow.tsx:102) |
| general-ui | onClick | Close datapad | [src/components/nexus/DatapadWindow.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/DatapadWindow.tsx:106) |
| general-ui | onClick | Close datapad | [src/components/nexus/DatapadWindow.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/DatapadWindow.tsx:107) |
| general-ui | onClick | Close datapad | [src/components/nexus/DatapadWindow.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/DatapadWindow.tsx:109) |
| general-ui | onChange | Datapad content | [src/components/nexus/DatapadWindow.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/DatapadWindow.tsx:117) |
| general-ui | onChange | Datapad content | [src/components/nexus/DatapadWindow.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/DatapadWindow.tsx:119) |
| general-ui | onClick | saveNotebook | [src/components/nexus/DatapadWindow.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/DatapadWindow.tsx:135) |
| general-ui | onClick | saveNotebook | [src/components/nexus/DatapadWindow.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/DatapadWindow.tsx:137) |
| general-ui | onClick | Delete datapad | [src/components/nexus/DatapadWindow.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/DatapadWindow.tsx:143) |
| general-ui | onClick | Delete datapad | [src/components/nexus/DatapadWindow.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/DatapadWindow.tsx:145) |
| general-ui | onClick | Delete datapad | [src/components/nexus/DatapadWindow.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/DatapadWindow.tsx:146) |
| provider-vault | onClick | Close Prompt Vault Manager | [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:150) |
| provider-vault | onClick | Close Prompt Vault Manager | [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:151) |
| provider-vault | onClick | Close Prompt Vault Manager | [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:153) |
| provider-vault | button |  return ( <button key={prompt.id} className={cx( "border p-3 text-left transition", | [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:168) |
| workflow-pro | onClick | () | [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:176) |
| provider-vault | onClick | startEdit | [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:227) |
| provider-vault | onClick | startEdit | [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:229) |
| provider-vault | onClick | )}  | [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:236) |
| provider-vault | onClick | copySelectedPrompt | [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:238) |
| provider-vault | onClick | removeSelectedPrompt | [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:248) |
| provider-vault | onClick | removeSelectedPrompt | [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:250) |
| provider-vault | onChange | (event) | [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:269) |
| provider-vault | onChange | (event) | [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:279) |
| provider-vault | onClick | cancelEdit | [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:284) |
| provider-vault | onClick | cancelEdit | [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:286) |
| provider-vault | onClick | saveEdit | [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:291) |
| provider-vault | onClick | saveEdit | [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx:293) |
| general-ui | onSubmit | handleSubmit | [src/components/nexus/auth-screen.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/auth-screen.tsx:111) |
| general-ui | onChange | (event) | [src/components/nexus/auth-screen.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/auth-screen.tsx:120) |
| general-ui | onChange | (event) | [src/components/nexus/auth-screen.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/auth-screen.tsx:135) |
| general-ui | button | </label> <button className="mt-1 flex items-center justify-center gap-2 border border-neutral-300/40 | [src/components/nexus/auth-screen.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/auth-screen.tsx:142) |
| agent-chat | onClick | () | [src/components/nexus/auth-screen.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/auth-screen.tsx:154) |
| agent-chat | onClick | () | [src/components/nexus/auth-screen.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/auth-screen.tsx:156) |
| agent-chat | onClick | Close branch agent interface | [src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts:34) |
| agent-chat | onClick | Close branch agent interface | [src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts:35) |
| agent-chat | onClick | Close branch agent interface | [src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts:36) |
| agent-chat | onClick | onClose | [src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts:37) |
| agent-chat | onChange | (event) | [src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts:38) |
| general-ui | onMouseDown | close | [src/components/nexus/nexus-command-palette-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-command-palette-shell-selector.test.ts:16) |
| general-ui | onMouseDown | close | [src/components/nexus/nexus-command-palette-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-command-palette-shell-selector.test.ts:18) |
| workflow-pro | onChange | (event) | [src/components/nexus/nexus-command-palette-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-command-palette-shell-selector.test.ts:34) |
| workflow-pro | onChange | (event) | [src/components/nexus/nexus-command-palette-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-command-palette-shell-selector.test.ts:36) |
| general-ui | onClick | onClick | [src/components/nexus/nexus-control-primitive-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-control-primitive-selector.test.ts:11) |
| general-ui | onClick | onClick | [src/components/nexus/nexus-control-primitive-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-control-primitive-selector.test.ts:13) |
| general-ui | onClick | onClick | [src/components/nexus/nexus-control-primitive-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-control-primitive-selector.test.ts:14) |
| style-system | onDragStart | () | [src/components/nexus/nexus-datapad-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-datapad-shell-selector.test.ts:31) |
| style-system | onDragStart | () | [src/components/nexus/nexus-datapad-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-datapad-shell-selector.test.ts:32) |
| style-system | onClick | bringToFront | [src/components/nexus/nexus-datapad-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-datapad-shell-selector.test.ts:35) |
| style-system | onClick | () | [src/components/nexus/nexus-datapad-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-datapad-shell-selector.test.ts:36) |
| general-ui | onClick | () | [src/components/nexus/nexus-datapad-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-datapad-shell-selector.test.ts:37) |
| general-ui | onChange | (event) | [src/components/nexus/nexus-datapad-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-datapad-shell-selector.test.ts:38) |
| general-ui | onChange | (event) | [src/components/nexus/nexus-datapad-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-datapad-shell-selector.test.ts:39) |
| graph | onClick | (event) | [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:266) |
| graph | onClick | (event) | [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:267) |
| graph | onClick | (event) | [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:269) |
| graph | ui-attribute | Open agent | [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:273) |
| graph | button | /> </button> <button aria-label={`Delete ${agent.callsign}`} className="grid h-6 w-6 place-items-cen | [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:283) |
| graph | onClick | (event) | [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:284) |
| graph | onClick | (event) | [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:287) |
| graph | ui-attribute | onRemoveAgent(agent.id); }} title={readOnly ? readOnlyMessage : `Delete ${agent.callsign}`} type="bu | [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:294) |
| graph | button | {node.status} </span> <button aria-label={`Delete ${definition.label}`} className="nodrag nopan grid | [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:356) |
| graph | onClick | (event) | [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx:357) |

Interpretation: the interaction layer is not a small set of buttons; it is a dense operations surface. The heaviest domains are graph/workflow-pro, agent-chat, style-system, provider/model configuration, and general workspace controls. The JSON map contains all detected signals, not just this abbreviated table.

## Frontend-Backend Coupling Map

| Layer | File | API client / route refs | Supabase refs |
| --- | --- | --- | --- |
| route-handler | [src/app/api/image-gen/route.test.ts](/Users/sean/Documents/FreeChat/src/app/api/image-gen/route.test.ts) | /api/image-gen | - |
| route-handler | [src/app/api/v1/agents/[agentId]/memory/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/agents/[agentId]/memory/route.ts) | /api/v1/agents/[agentId]/memory | - |
| route-handler | [src/app/api/v1/agents/[agentId]/messages/archive/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/agents/[agentId]/messages/archive/route.ts) | /api/v1/agents/[agentId]/messages/archive | - |
| route-handler | [src/app/api/v1/agents/[agentId]/messages/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/agents/[agentId]/messages/route.ts) | /api/v1/agents/[agentId]/messages | - |
| route-handler | [src/app/api/v1/agents/[agentId]/stream/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/agents/[agentId]/stream/route.ts) | /api/v1/agents/[agentId]/stream | - |
| route-handler | [src/app/api/v1/agents/[agentId]/tasks/[taskId]/cancel/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/agents/[agentId]/tasks/[taskId]/cancel/route.ts) | /api/v1/agents/[agentId]/tasks/[taskId]/cancel | - |
| route-handler | [src/app/api/v1/agents/[agentId]/tasks/[taskId]/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/agents/[agentId]/tasks/[taskId]/route.ts) | /api/v1/agents/[agentId]/tasks/[taskId] | - |
| route-handler | [src/app/api/v1/agents/[agentId]/tasks/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/agents/[agentId]/tasks/route.ts) | /api/v1/agents/[agentId]/tasks | - |
| route-handler | [src/app/api/v1/agents/memory-compress/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/agents/memory-compress/route.ts) | /api/v1/agents/memory-compress | - |
| route-handler | [src/app/api/v1/artifacts/[artifactId]/archive/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/artifacts/[artifactId]/archive/route.ts) | /api/v1/artifacts/[artifactId]/archive | - |
| route-handler | [src/app/api/v1/artifacts/[artifactId]/references/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/artifacts/[artifactId]/references/route.ts) | /api/v1/artifacts/[artifactId]/references | - |
| route-handler | [src/app/api/v1/artifacts/[artifactId]/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/artifacts/[artifactId]/route.ts) | /api/v1/artifacts/[artifactId] | - |
| route-handler | [src/app/api/v1/artifacts/[artifactId]/versions/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/artifacts/[artifactId]/versions/route.ts) | /api/v1/artifacts/[artifactId]/versions | - |
| route-handler | [src/app/api/v1/artifacts/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/artifacts/route.ts) | /api/v1/artifacts | - |
| route-handler | [src/app/api/v1/deployment/checks/latest/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/deployment/checks/latest/route.ts) | /api/v1/deployment/checks/latest | - |
| route-handler | [src/app/api/v1/deployment/checks/run/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/deployment/checks/run/route.ts) | /api/v1/deployment/checks/run | - |
| route-handler | [src/app/api/v1/feature-flags/[flagKey]/toggle/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/feature-flags/[flagKey]/toggle/route.ts) | /api/v1/feature-flags/[flagKey]/toggle | - |
| route-handler | [src/app/api/v1/feature-flags/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/feature-flags/route.ts) | /api/v1/feature-flags | - |
| route-handler | [src/app/api/v1/health/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/health/route.ts) | /api/v1/health | - |
| route-handler | [src/app/api/v1/notebooks/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/notebooks/route.ts) | /api/v1/notebooks | - |
| route-handler | [src/app/api/v1/observability/events/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/observability/events/route.ts) | /api/v1/observability/events | - |
| route-handler | [src/app/api/v1/observability/metrics/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/observability/metrics/route.ts) | /api/v1/observability/metrics | - |
| route-handler | [src/app/api/v1/observability/traces/[traceId]/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/observability/traces/[traceId]/route.ts) | /api/v1/observability/traces/[traceId] | - |
| route-handler | [src/app/api/v1/prompts/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/prompts/route.ts) | /api/v1/prompts | - |
| route-handler | [src/app/api/v1/providers/status/route.test.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/providers/status/route.test.ts) | /api/v1/providers/status | - |
| route-handler | [src/app/api/v1/public-config/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/public-config/route.ts) | /api/v1/public-config | - |
| route-handler | [src/app/api/v1/sync/operations/[operationId]/cancel/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/sync/operations/[operationId]/cancel/route.ts) | /api/v1/sync/operations/[operationId]/cancel | - |
| route-handler | [src/app/api/v1/sync/operations/[operationId]/retry/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/sync/operations/[operationId]/retry/route.ts) | /api/v1/sync/operations/[operationId]/retry | - |
| route-handler | [src/app/api/v1/sync/operations/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/sync/operations/route.ts) | /api/v1/sync/operations | - |
| route-handler | [src/app/api/v1/sync/status/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/sync/status/route.ts) | /api/v1/sync/status | - |
| route-handler | [src/app/api/v1/tool-runs/[toolRunId]/cancel/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/tool-runs/[toolRunId]/cancel/route.ts) | /api/v1/tool-runs/[toolRunId]/cancel | - |
| route-handler | [src/app/api/v1/tool-runs/[toolRunId]/confirm/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/tool-runs/[toolRunId]/confirm/route.ts) | /api/v1/tool-runs/[toolRunId]/confirm | - |
| route-handler | [src/app/api/v1/tool-runs/[toolRunId]/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/tool-runs/[toolRunId]/route.ts) | /api/v1/tool-runs/[toolRunId] | - |
| route-handler | [src/app/api/v1/tool-runs/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/tool-runs/route.ts) | /api/v1/tool-runs | - |
| route-handler | [src/app/api/v1/tools/[toolId]/run/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/tools/[toolId]/run/route.ts) | /api/v1/tools/[toolId]/run | - |
| route-handler | [src/app/api/v1/workflows/groups/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/workflows/groups/route.ts) | /api/v1/workflows/groups | - |
| route-handler | [src/app/api/v1/workflows/runtime-trace/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/workflows/runtime-trace/route.ts) | /api/v1/workflows/runtime-trace | - |
| route-handler | [src/app/api/v1/workspaces/[workspaceId]/state/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/workspaces/[workspaceId]/state/route.ts) | /api/v1/workspaces/[workspaceId]/state | - |
| route-handler | [src/app/api/v1/workspaces/recovery/[workspaceId]/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/workspaces/recovery/[workspaceId]/route.ts) | /api/v1/workspaces/recovery/[workspaceId] | - |
| route-handler | [src/app/api/v1/workspaces/recovery/latest/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/workspaces/recovery/latest/route.ts) | /api/v1/workspaces/recovery/latest | - |
| route-handler | [src/app/api/v1/workspaces/recovery/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/workspaces/recovery/route.ts) | /api/v1/workspaces/recovery | - |
| route-handler | [src/app/api/v1/workspaces/session/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/workspaces/session/route.ts) | /api/v1/workspaces/session | - |
| route-handler | [src/app/api/workflow-pro/brain-draft/route.ts](/Users/sean/Documents/FreeChat/src/app/api/workflow-pro/brain-draft/route.ts) | https://api.openai.com/v1/responses | - |
| ui-component | [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx) | /api/workflow-pro/brain-draft, /api/workflow-pro/brain-draft | - |
| ui-component | [src/components/nexus/nexus-ops-extraction-map.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-extraction-map.test.ts) | /api/v1/agents/${agentId}/stream | - |
| ui-component | [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx) | get, post, /api/v1/providers/status, /api/v1/providers/verify, /api/v1/artifacts, /api/v1/providers/status, /api/v1/providers/verify | - |
| ui-component | [src/components/nexus/nexus-workspace-chat-composer-shell.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-workspace-chat-composer-shell.test.ts) | /api/v1/artifacts, /api/v1/artifacts/${encodeURIComponent(artifact.id)}/asset, /api/v1/workspaces/session | - |
| source | [src/lib/adapters/image-adapter.test.ts](/Users/sean/Documents/FreeChat/src/lib/adapters/image-adapter.test.ts) | /api/image-gen | - |
| source | [src/lib/adapters/image-adapter.ts](/Users/sean/Documents/FreeChat/src/lib/adapters/image-adapter.ts) | /api/image-gen, /api/image-gen | - |
| source | [src/lib/adapters/memory-compression-adapter.ts](/Users/sean/Documents/FreeChat/src/lib/adapters/memory-compression-adapter.ts) | post, /api/v1/agents/memory-compress | - |
| backend-service-repository | [src/lib/backend/api/api-contract.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/api/api-contract.test.ts) | post, /api/v1/test-client, /api/v1/test-idempotency, /api/v1/test-idempotency-conflict, /api/v1/test-protected, /api/v1/test-request-scoped-permission, /api/v1/test-spoofed, /api/v1/test-throw, /api/v1/test-validation, /api/v1/test-verified-actor | - |
| backend-service-repository | [src/lib/backend/api/idempotency-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/api/idempotency-repository.ts) | - | api_idempotency_keys |
| backend-service-repository | [src/lib/backend/artifacts/artifact-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/artifacts/artifact-repository.ts) | - | artifact_references, artifacts |
| backend-service-repository | [src/lib/backend/artifacts/artifact-service.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/artifacts/artifact-service.test.ts) | /api/image-gen/assets/img_route_matrix, /api/image-gen/assets/img_viewer_denied | - |
| backend-service-repository | [src/lib/backend/deployment/deployment-check-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/deployment/deployment-check-service.ts) | - | deployment_checks |
| backend-service-repository | [src/lib/backend/deployment/feature-flag-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/deployment/feature-flag-service.ts) | - | feature_flags |
| backend-service-repository | [src/lib/backend/history/agent-memory-record-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/history/agent-memory-record-repository.ts) | - | agent_memory_records |
| backend-service-repository | [src/lib/backend/history/historical-data-fetcher.ts](/Users/sean/Documents/FreeChat/src/lib/backend/history/historical-data-fetcher.ts) | get | - |
| backend-service-repository | [src/lib/backend/history/message-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/history/message-repository.ts) | - | messages |
| backend-service-repository | [src/lib/backend/notebooks/notebook-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/notebooks/notebook-repository.ts) | - | notebooks, workspace_memberships |
| backend-service-repository | [src/lib/backend/observability/observability-service.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/observability/observability-service.test.ts) | /api/v1/agents/a/stream, /api/v1/test | - |
| backend-service-repository | [src/lib/backend/observability/system-event-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/observability/system-event-repository.ts) | - | system_events |
| backend-service-repository | [src/lib/backend/observability/usage-metrics-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/observability/usage-metrics-repository.ts) | - | usage_metrics |
| backend-service-repository | [src/lib/backend/prompts/prompt-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/prompts/prompt-repository.ts) | - | prompt_revisions, prompts, workspace_memberships |
| backend-service-repository | [src/lib/backend/runtime/agent-runtime-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/runtime/agent-runtime-repository.ts) | - | agent_runtime_events, agent_runtime_sessions, agent_tasks |
| backend-service-repository | [src/lib/backend/security/repositories.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/repositories.ts) | - | permission_audit_logs, workspace_memberships |
| backend-service-repository | [src/lib/backend/sync/sync-operation-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/sync/sync-operation-repository.ts) | - | sync_operations |
| backend-service-repository | [src/lib/backend/sync/sync-queue-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/sync/sync-queue-service.ts) | /api/v1/artifacts/[artifactId]/references | - |
| backend-service-repository | [src/lib/backend/sync/sync-queue.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/sync/sync-queue.test.ts) | /api/v1/artifacts/[artifactId]/references | - |
| backend-service-repository | [src/lib/backend/tools/tool-permission-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/tools/tool-permission-repository.ts) | - | tool_permissions |
| backend-service-repository | [src/lib/backend/tools/tool-run-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/tools/tool-run-repository.ts) | - | tool_runs |
| backend-service-repository | [src/lib/backend/workspace/workspace-permission.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-permission.ts) | - | workspace_memberships, workspaces, record_permission_audit_log |
| backend-service-repository | [src/lib/backend/workspace/workspace-session-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-session-service.ts) | - | workspace_memberships, workspaces |
| backend-service-repository | [src/lib/backend/workspace/workspace-snapshot-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-snapshot-repository.ts) | - | workspace_snapshots |
| backend-service-repository | [src/lib/backend/workspace/workspace-state-entity-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-state-entity-repository.ts) | - | workspace_state_entities |
| source | [src/lib/public-config.ts](/Users/sean/Documents/FreeChat/src/lib/public-config.ts) | /api/v1/public-config | - |
| sync-bridge | [src/lib/state-sync.ts](/Users/sean/Documents/FreeChat/src/lib/state-sync.ts) | get, post, /api/v1/artifacts, /api/v1/notebooks, /api/v1/workspaces/session | prompt_revisions, workflow_templates |
| source | [src/lib/style-engine/validator.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/validator.test.ts) | /api/v1/style-packs | - |
| supabase-client | [src/lib/supabase/client.test.ts](/Users/sean/Documents/FreeChat/src/lib/supabase/client.test.ts) | /api/v1/public-config | - |
| supabase-client | [src/lib/supabase/test-connection.ts](/Users/sean/Documents/FreeChat/src/lib/supabase/test-connection.ts) | - | workspaces |

Core coupling inference from evidence:

- `src/lib/api/nexus-api-client.ts` is the browser-side request wrapper and trace/header/token bridge.
- `src/lib/backend/api/api-handler.ts` is the backend envelope, auth, permission, idempotency, and observability boundary.
- `src/lib/state-sync.ts` is a mixed local/cloud synchronization bridge and still contains direct Supabase/RPC touchpoints, so it is the highest-risk frontend-to-cloud coupling point.
- `src/store/nexus-store.ts` holds large client state responsibilities and feeds the visible command surfaces.

## Supabase Touchpoint Map

No live Supabase project was queried. This map is local source + local migration evidence only.

Discovered tables: `agent_memory_records`, `agent_runtime_events`, `agent_runtime_sessions`, `agent_tasks`, `api_idempotency_keys`, `artifact_references`, `artifacts`, `deployment_checks`, `feature_flags`, `messages`, `notebooks`, `permission_audit_logs`, `prompt_revisions`, `prompts`, `sync_operations`, `system_events`, `tool_permissions`, `tool_runs`, `usage_metrics`, `workflow_templates`, `workspace_memberships`, `workspace_snapshots`, `workspace_state_entities`, `workspaces`

Discovered RPC/functions: `backfill_message_history_fields`, `has_workspace_role`, `is_workspace_member`, `nexus_ensure_workspace_session`, `record_permission_audit_log`, `set_updated_at`

Storage signals: `agent_runtime_events`, `nexus-generated-assets`

| Layer | File | Tables | RPC/functions | Client boundary |
| --- | --- | --- | --- | --- |
| api-route | [src/app/api/image-gen/route.test.ts](/Users/sean/Documents/FreeChat/src/app/api/image-gen/route.test.ts) | - | - | request/user-token boundary |
| api-route | [src/app/api/image-gen/route.ts](/Users/sean/Documents/FreeChat/src/app/api/image-gen/route.ts) | - | - | request/user-token boundary |
| api-route | [src/app/api/memory-compress/route.ts](/Users/sean/Documents/FreeChat/src/app/api/memory-compress/route.ts) | - | - | request/user-token boundary |
| api-route | [src/app/api/predictive-intel/route.ts](/Users/sean/Documents/FreeChat/src/app/api/predictive-intel/route.ts) | - | - | request/user-token boundary |
| api-route | [src/app/api/v1/providers/verify/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/providers/verify/route.ts) | - | - | request/user-token boundary |
| api-route | [src/app/api/v1/workspaces/session/route.ts](/Users/sean/Documents/FreeChat/src/app/api/v1/workspaces/session/route.ts) | - | - | request/user-token boundary |
| api-route | [src/app/api/workflow-pro/brain-draft/route.ts](/Users/sean/Documents/FreeChat/src/app/api/workflow-pro/brain-draft/route.ts) | - | - | request/user-token boundary |
| client-or-shared | [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx) | - | - | request/user-token boundary |
| client-or-shared | [src/components/style-engine/nexus-style-lab-surface-style-coverage.test.ts](/Users/sean/Documents/FreeChat/src/components/style-engine/nexus-style-lab-surface-style-coverage.test.ts) | - | - | request/user-token boundary |
| client-or-shared | [src/components/style-engine/nexus-style-lab.tsx](/Users/sean/Documents/FreeChat/src/components/style-engine/nexus-style-lab.tsx) | - | - | request/user-token boundary |
| client-or-shared | [src/lib/adapters/image-adapter.test.ts](/Users/sean/Documents/FreeChat/src/lib/adapters/image-adapter.test.ts) | - | - | request/user-token boundary |
| client-or-shared | [src/lib/adapters/image-adapter.ts](/Users/sean/Documents/FreeChat/src/lib/adapters/image-adapter.ts) | - | - | request/user-token boundary |
| client-or-shared | [src/lib/adapters/memory-compression-adapter.ts](/Users/sean/Documents/FreeChat/src/lib/adapters/memory-compression-adapter.ts) | - | - | request/user-token boundary |
| client-or-shared | [src/lib/api/nexus-api-client.ts](/Users/sean/Documents/FreeChat/src/lib/api/nexus-api-client.ts) | - | - | request/user-token boundary |
| backend | [src/lib/backend/api/agent-stream-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/api/agent-stream-service.ts) | - | - | request/user-token boundary |
| backend | [src/lib/backend/api/api-auth-test-helper.ts](/Users/sean/Documents/FreeChat/src/lib/backend/api/api-auth-test-helper.ts) | - | - | request/user-token boundary |
| backend | [src/lib/backend/api/api-contract.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/api/api-contract.test.ts) | - | - | request/user-token boundary |
| backend | [src/lib/backend/api/idempotency-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/api/idempotency-repository.ts) | api_idempotency_keys | - | - |
| backend | [src/lib/backend/api/memory-compress-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/api/memory-compress-service.ts) | - | - | request/user-token boundary |
| backend | [src/lib/backend/artifacts/artifact-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/artifacts/artifact-repository.ts) | artifact_references, artifacts | - | - |
| backend | [src/lib/backend/artifacts/artifact-service.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/artifacts/artifact-service.test.ts) | - | - | admin/service-role boundary, request/user-token boundary |
| backend | [src/lib/backend/deployment/deployment-api.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/deployment/deployment-api.test.ts) | - | - | admin/service-role boundary |
| backend | [src/lib/backend/deployment/deployment-check-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/deployment/deployment-check-service.ts) | deployment_checks | - | - |
| backend | [src/lib/backend/deployment/environment-validator.ts](/Users/sean/Documents/FreeChat/src/lib/backend/deployment/environment-validator.ts) | - | - | admin/service-role boundary |
| backend | [src/lib/backend/deployment/feature-flag-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/deployment/feature-flag-service.ts) | feature_flags | - | - |
| backend | [src/lib/backend/history/agent-memory-record-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/history/agent-memory-record-repository.ts) | agent_memory_records | - | - |
| backend | [src/lib/backend/history/message-history-service.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/history/message-history-service.test.ts) | - | - | request/user-token boundary |
| backend | [src/lib/backend/history/message-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/history/message-repository.ts) | messages | - | - |
| backend | [src/lib/backend/history/storage-partition-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/history/storage-partition-service.ts) | - | - | admin/service-role boundary |
| backend | [src/lib/backend/notebooks/notebook-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/notebooks/notebook-repository.ts) | notebooks, workspace_memberships | - | - |
| backend | [src/lib/backend/notebooks/notebook-route.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/notebooks/notebook-route.test.ts) | - | - | request/user-token boundary |
| backend | [src/lib/backend/observability/observability-service.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/observability/observability-service.test.ts) | - | - | request/user-token boundary |
| backend | [src/lib/backend/observability/system-event-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/observability/system-event-repository.ts) | system_events | - | - |
| backend | [src/lib/backend/observability/usage-metrics-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/observability/usage-metrics-repository.ts) | usage_metrics | - | - |
| backend | [src/lib/backend/primitives/redaction.ts](/Users/sean/Documents/FreeChat/src/lib/backend/primitives/redaction.ts) | - | - | admin/service-role boundary, request/user-token boundary |
| backend | [src/lib/backend/prompts/prompt-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/prompts/prompt-repository.ts) | prompt_revisions, prompts, workspace_memberships | - | - |
| backend | [src/lib/backend/prompts/prompt-route.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/prompts/prompt-route.test.ts) | - | - | request/user-token boundary |
| backend | [src/lib/backend/runtime/agent-runtime-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/runtime/agent-runtime-repository.ts) | agent_runtime_events, agent_runtime_sessions, agent_tasks | - | - |
| backend | [src/lib/backend/runtime/agent-runtime-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/runtime/agent-runtime-service.ts) | - | - | request/user-token boundary |
| backend | [src/lib/backend/runtime/agent-runtime.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/runtime/agent-runtime.test.ts) | - | - | request/user-token boundary |
| backend | [src/lib/backend/runtime/provider-adapter.ts](/Users/sean/Documents/FreeChat/src/lib/backend/runtime/provider-adapter.ts) | - | - | request/user-token boundary |
| backend | [src/lib/backend/security/auth-boundary-gate.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/auth-boundary-gate.test.ts) | - | - | request/user-token boundary |
| backend | [src/lib/backend/security/auth-session.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/auth-session.ts) | - | - | request/user-token boundary |
| backend | [src/lib/backend/security/frontend-bundle-safety.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/frontend-bundle-safety.test.ts) | - | - | admin/service-role boundary |
| backend | [src/lib/backend/security/repositories.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/repositories.ts) | permission_audit_logs, workspace_memberships | - | - |
| backend | [src/lib/backend/security/route-spoof-boundary.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/route-spoof-boundary.test.ts) | - | - | request/user-token boundary |
| backend | [src/lib/backend/security/secret-boundary-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/secret-boundary-service.ts) | - | - | request/user-token boundary |
| backend | [src/lib/backend/security/security-migration.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/security-migration.test.ts) | - | - | admin/service-role boundary |
| backend | [src/lib/backend/security/security-services.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/security/security-services.test.ts) | - | - | admin/service-role boundary, request/user-token boundary |
| backend | [src/lib/backend/sync/sync-operation-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/sync/sync-operation-repository.ts) | sync_operations | - | - |
| backend | [src/lib/backend/sync/sync-queue.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/sync/sync-queue.test.ts) | - | - | request/user-token boundary |
| backend | [src/lib/backend/tools/tool-permission-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/tools/tool-permission-repository.ts) | tool_permissions | - | - |
| backend | [src/lib/backend/tools/tool-run-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/tools/tool-run-repository.ts) | tool_runs | - | - |
| backend | [src/lib/backend/workspace/workspace-permission-request.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-permission-request.test.ts) | - | - | admin/service-role boundary, request/user-token boundary |
| backend | [src/lib/backend/workspace/workspace-permission.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-permission.ts) | workspace_memberships, workspaces | record_permission_audit_log | - |
| backend | [src/lib/backend/workspace/workspace-session-service.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-session-service.test.ts) | - | - | admin/service-role boundary, request/user-token boundary |
| backend | [src/lib/backend/workspace/workspace-session-service.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-session-service.ts) | workspace_memberships, workspaces | - | - |
| backend | [src/lib/backend/workspace/workspace-snapshot-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-snapshot-repository.ts) | workspace_snapshots | - | - |
| backend | [src/lib/backend/workspace/workspace-state-entity-repository.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-state-entity-repository.ts) | workspace_state_entities | - | - |
| backend | [src/lib/backend/workspace/workspace-state.test.ts](/Users/sean/Documents/FreeChat/src/lib/backend/workspace/workspace-state.test.ts) | - | - | request/user-token boundary |
| sync-bridge | [src/lib/state-sync.ts](/Users/sean/Documents/FreeChat/src/lib/state-sync.ts) | prompt_revisions, workflow_templates | - | request/user-token boundary |
| client-or-shared | [src/lib/style-engine/exchange.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/exchange.test.ts) | - | - | admin/service-role boundary |
| client-or-shared | [src/lib/style-engine/governance.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/governance.test.ts) | - | - | admin/service-role boundary |
| client-or-shared | [src/lib/style-engine/import-text.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/import-text.test.ts) | - | - | admin/service-role boundary |
| client-or-shared | [src/lib/style-engine/intent-manifest.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/intent-manifest.test.ts) | - | - | admin/service-role boundary |
| client-or-shared | [src/lib/style-engine/intent-normalizer.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/intent-normalizer.test.ts) | - | - | admin/service-role boundary |
| client-or-shared | [src/lib/style-engine/v2-review-import.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/v2-review-import.test.ts) | - | - | admin/service-role boundary |
| client-or-shared | [src/lib/style-engine/v2-token-preview.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/v2-token-preview.test.ts) | - | - | admin/service-role boundary |
| client-or-shared | [src/lib/style-engine/v2-validators.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/v2-validators.ts) | - | - | admin/service-role boundary |
| client-or-shared | [src/lib/style-engine/validator.test.ts](/Users/sean/Documents/FreeChat/src/lib/style-engine/validator.test.ts) | - | - | admin/service-role boundary |
| supabase-client | [src/lib/supabase/admin.ts](/Users/sean/Documents/FreeChat/src/lib/supabase/admin.ts) | - | - | admin/service-role boundary |
| supabase-client | [src/lib/supabase/client.test.ts](/Users/sean/Documents/FreeChat/src/lib/supabase/client.test.ts) | - | - | browser-public-client boundary |
| supabase-client | [src/lib/supabase/client.ts](/Users/sean/Documents/FreeChat/src/lib/supabase/client.ts) | - | - | browser-public-client boundary |
| supabase-client | [src/lib/supabase/request.ts](/Users/sean/Documents/FreeChat/src/lib/supabase/request.ts) | - | - | request/user-token boundary |
| supabase-client | [src/lib/supabase/test-connection.ts](/Users/sean/Documents/FreeChat/src/lib/supabase/test-connection.ts) | workspaces | - | - |
| client-or-shared | [src/lib/sync/local-sync-queue-adapter.test.ts](/Users/sean/Documents/FreeChat/src/lib/sync/local-sync-queue-adapter.test.ts) | - | - | request/user-token boundary |
| client-or-shared | [src/lib/workflow-runtime-lite/llm-client.test.ts](/Users/sean/Documents/FreeChat/src/lib/workflow-runtime-lite/llm-client.test.ts) | - | - | request/user-token boundary |
| client-or-shared | [src/lib/workflow-runtime-lite/llm-client.ts](/Users/sean/Documents/FreeChat/src/lib/workflow-runtime-lite/llm-client.ts) | - | - | request/user-token boundary |
| client-or-shared | [src/lib/workflow-runtime-lite/state.ts](/Users/sean/Documents/FreeChat/src/lib/workflow-runtime-lite/state.ts) | - | - | request/user-token boundary |
| client-or-shared | [src/store/nexus-store.ts](/Users/sean/Documents/FreeChat/src/store/nexus-store.ts) | - | - | request/user-token boundary |

Local migration spine:

| Migration | Tables | Functions | Policy signals |
| --- | --- | --- | --- |
| [supabase/migrations/20260525000000_create_workflow_templates.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260525000000_create_workflow_templates.sql) | workflow_templates | - | 0 |
| [supabase/migrations/20260527000000_security_boundary_rls_foundation.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527000000_security_boundary_rls_foundation.sql) | artifacts, messages, notebooks, permission_audit_logs, prompts, workflow_templates, workspace_memberships, workspaces | has_workspace_role, is_workspace_member, set_updated_at | 20 |
| [supabase/migrations/20260527001000_api_idempotency_keys.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527001000_api_idempotency_keys.sql) | api_idempotency_keys | - | 0 |
| [supabase/migrations/20260527002000_workspace_cloud_state.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527002000_workspace_cloud_state.sql) | workspace_snapshots, workspace_state_entities | set_updated_at | 7 |
| [supabase/migrations/20260527003000_durable_sync_queue.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527003000_durable_sync_queue.sql) | sync_operations | - | 3 |
| [supabase/migrations/20260527004000_deployment_safety_gate.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527004000_deployment_safety_gate.sql) | deployment_checks, feature_flags | - | 3 |
| [supabase/migrations/20260527005000_agent_runtime_sessions.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527005000_agent_runtime_sessions.sql) | agent_runtime_events, agent_runtime_sessions, agent_tasks | - | 7 |
| [supabase/migrations/20260527006000_tool_execution_control_plane.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527006000_tool_execution_control_plane.sql) | tool_permissions, tool_runs | - | 6 |
| [supabase/migrations/20260527007000_artifact_asset_layer.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527007000_artifact_asset_layer.sql) | artifact_references, artifacts | - | 3 |
| [supabase/migrations/20260527008000_observability_event_spine.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527008000_observability_event_spine.sql) | system_events, usage_metrics | - | 2 |
| [supabase/migrations/20260527009000_historical_data_paging.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527009000_historical_data_paging.sql) | agent_memory_records, messages | backfill_message_history_fields | 2 |
| [supabase/migrations/20260527010000_notebook_durable_tombstones.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527010000_notebook_durable_tombstones.sql) | notebooks | set_updated_at | 4 |
| [supabase/migrations/20260527011000_prompt_durable_tombstones.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527011000_prompt_durable_tombstones.sql) | prompts | - | 4 |
| [supabase/migrations/20260527012000_message_history_base_table.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527012000_message_history_base_table.sql) | messages | - | 4 |
| [supabase/migrations/20260527013000_prompt_revision_history.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260527013000_prompt_revision_history.sql) | prompt_revisions | - | 3 |
| [supabase/migrations/20260529001000_artifacts_tool_runs_live_parity.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260529001000_artifacts_tool_runs_live_parity.sql) | artifacts, tool_permissions, tool_runs | - | 9 |
| [supabase/migrations/20260601001000_v20_auth_boundary_rls_hardening.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260601001000_v20_auth_boundary_rls_hardening.sql) | api_idempotency_keys, permission_audit_logs, workspaces | - | 2 |
| [supabase/migrations/20260601002000_v20_client_grant_hardening.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260601002000_v20_client_grant_hardening.sql) | - | - | 0 |
| [supabase/migrations/20260601003000_v20_schema_live_parity_repair.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260601003000_v20_schema_live_parity_repair.sql) | agent_memory_records, deployment_checks, feature_flags | - | 5 |
| [supabase/migrations/20260601004000_v20_schema_live_parity_grant_tightening.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260601004000_v20_schema_live_parity_grant_tightening.sql) | - | - | 0 |
| [supabase/migrations/20260603001000_v22_rls_policy_performance_hardening.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260603001000_v22_rls_policy_performance_hardening.sql) | agent_memory_records, agent_runtime_sessions, tool_runs | - | 6 |
| [supabase/migrations/20260603002000_v22_workspace_session_rpc.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260603002000_v22_workspace_session_rpc.sql) | - | nexus_ensure_workspace_session | 0 |
| [supabase/migrations/20260604081500_v22_workspace_session_viewer_readable.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260604081500_v22_workspace_session_viewer_readable.sql) | - | nexus_ensure_workspace_session | 0 |
| [supabase/migrations/20260604093000_v22_generated_image_storage.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260604093000_v22_generated_image_storage.sql) | - | - | 4 |
| [supabase/migrations/20260604102000_v22_request_scoped_permission_audit_rpc.sql](/Users/sean/Documents/FreeChat/supabase/migrations/20260604102000_v22_request_scoped_permission_audit_rpc.sql) | - | record_permission_audit_log | 0 |

## Current-System Context Pack

Use this pack before future NEXUS implementation rounds:

- Product shell: `/` renders the production Nexus Ops console via `NexusOps`; `/style-lab` renders `NexusStyleLab`.
- Navigation model: App Router pages are minimal wrappers; most UX state and interactions live inside component/store files.
- API model: `/api/v1/**` endpoints form the durable backend control plane; route handlers should stay behind `apiHandler` where possible.
- Auth/data model: Supabase has three visible client boundaries: browser public client, request-token client, and admin/service-role client. Preserve this separation.
- Sync model: `state-sync.ts` and `nexus-store.ts` are critical bridge/state files; modify them only with targeted tests and a responsibility map.
- Workflow model: Workflow Pro, graph, Brain proposal intake, runtime traces, and artifacts are connected across UI, lightweight runtime, observability, and API routes.
- Style model: style runtime/provider and style lab are separate but related; style changes should be checked against both `/` and `/style-lab`.

## Narrative Intelligence Pass

The system is not a loose collection of screens. It reads as an operator cockpit: a single dense production surface with graph/workflow/agent/style/provider controls, backed by a growing durable backend spine. The risk is not lack of capability; the risk is that many capabilities meet inside a small number of oversized files. For future rounds, the highest leverage is to preserve the existing API/Supabase boundaries while carving changes by responsibility: graph operations, agent chat/composer, provider vault, style runtime, sync, and observability.

## Meaning Quality Gate

| Gate | Result |
| --- | --- |
| Evidence separated from inference | pass |
| Production Supabase untouched | pass |
| No `src` business logic modified | pass |
| Route/page map included | pass |
| UI surface map included | pass |
| Button interaction map included | pass |
| Frontend/backend coupling map included | pass |
| Supabase touchpoint map included | pass |
| Markdown/HTML/JSON reports generated | pass |

## ROI / Completed / Remaining / Next Round

Completed: generated static architecture maps and a context pack for NEXUS Current System Intelligence.

Highest ROI next round: create a responsibility-level refactor plan for `nexus-ops.tsx`, `nexus-store.ts`, and `state-sync.ts` without changing behavior.

Remaining risk: static scans cannot prove runtime reachability, current production data state, or whether every UI signal is visible in a particular account/session. Browser/runtime verification would be a separate round.

## Output Files

- `report.md`: this narrative report.
- `index.html`: browser-readable dashboard.
- `machine-manifest.json`: run metadata and counts.
- `route-map.json`, `ui-surface-map.json`, `button-interaction-map.json`, `frontend-backend-coupling-map.json`, `supabase-touchpoints.json`, `agent-usage-map.json`: machine-readable maps.
- `current-system-context-pack.md`: compact handoff context for future rounds.
