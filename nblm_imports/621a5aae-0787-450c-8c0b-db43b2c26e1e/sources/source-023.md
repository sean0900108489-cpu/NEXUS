# Source 023 - maps__04-component-inventory.md

## NotebookLM Source Metadata

- notebook_id: 621a5aae-0787-450c-8c0b-db43b2c26e1e
- project: 1022174375734
- source_id: cd835e19-5c7a-4bcd-893a-1205f9b8b1bb
- title: maps__04-component-inventory.md
- status: SOURCE_STATUS_COMPLETE
- word_count: 858
- token_count: 2153
- source_name: projects/1022174375734/locations/global/notebooks/621a5aae-0787-450c-8c0b-db43b2c26e1e/sources/cd835e19-5c7a-4bcd-893a-1205f9b8b1bb
- source_added_timestamp: 2026-06-05T05:50:51.455755Z

## Source-Level Read Result

- api_full_text: DATA_GAP
- api_note: NotebookLM source API returned metadata only; no full source text was present in the API response.
- local_mirror_status: FOUND
- local_mirror_path: /Users/sean/Documents/FreeChat/docs/agent-runs/nexus-current-system-intelligence-20260605-1347/maps/04-component-inventory.md
- local_mirror_estimated_word_count: 1247

## Local Mirror Content

```md
# 04 Component Inventory

| File | Lines | Components | Props types | Events | Store/API | Large | Domain logic |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [src/components/nexus/AgentBranchModal.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/AgentBranchModal.tsx) | 490 | AgentBranchModal, DEFAULT_PROFILE | AgentBranchModalProps | onBranchComplete, onChange, onClick, onClose, onInput | useNexusStore | no | yes/static signal |
| [src/components/nexus/DatapadWindow.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/DatapadWindow.tsx) | 157 | DatapadWindow | - | onChange, onClick, onDragStart, onMouseDown, onTouchStart | useNexusStore | no | yes/static signal |
| [src/components/nexus/PromptVaultManager.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/PromptVaultManager.tsx) | 323 | PromptVaultManager | - | onChange, onClick | useNexusStore | no | yes/static signal |
| [src/components/nexus/auth-screen.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/auth-screen.tsx) | 171 | AUTH_PROMPT_MESSAGE, AuthScreen, CHECKING_SESSION_MESSAGE | AuthScreenProps | onAuthenticated, onChange, onClick, onSubmit | useNexusStore | no | yes/static signal |
| [src/components/nexus/dynamic-icon.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/dynamic-icon.tsx) | 42 | DynamicIcon, Icon | DynamicIconProps, LucideProps | - | - | no | not indicated |
| [src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-agent-branch-modal-shell-selector.test.ts) | 95 | AgentBranchModal | - | onBranchComplete, onChange, onClick, onClose | useNexusStore | no | yes/static signal |
| [src/components/nexus/nexus-agent-window-chrome-primitive.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-agent-window-chrome-primitive.test.ts) | 119 | AgentWindow, SandboxCanvas | - | onDragStop, onResizeStop | - | no | not indicated |
| [src/components/nexus/nexus-command-palette-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-command-palette-shell-selector.test.ts) | 125 | CommandPalette | - | onChange, onClick, onClose, onMouseDown | - | no | not indicated |
| [src/components/nexus/nexus-control-primitive-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-control-primitive-selector.test.ts) | 57 | - | - | onClick | - | no | not indicated |
| [src/components/nexus/nexus-datapad-shell-selector.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-datapad-shell-selector.test.ts) | 94 | DatapadWindow | - | onChange, onClick, onDragStart, onMouseDown, onTouchStart | useNexusStore | no | yes/static signal |
| [src/components/nexus/nexus-generated-history-hydration.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-generated-history-hydration.test.ts) | 15 | - | - | - | - | no | yes/static signal |
| [src/components/nexus/nexus-graph.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-graph.tsx) | 2346 | AgentNode, BlueprintEdge, FileRuntimeEditor, InputTextRuntimeEditor, ModelImageRuntimeEditor, ModelRuntimeEditor, NexusGraph, RuntimeHandles | EdgeProps, NodeProps | onAddWorkflowNode, onAppendWorkflowContractText, onChange, onClick, onClose | - | yes | yes/static signal |
| [src/components/nexus/nexus-message-bubble-primitive.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-message-bubble-primitive.test.ts) | 97 | MessageBubble, WorkspaceChatComposerShell | - | - | - | no | yes/static signal |
| [src/components/nexus/nexus-ops-body-frame.test.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-body-frame.test.tsx) | 110 | - | NexusOpsBodyFrameProps | - | - | no | yes/static signal |
| [src/components/nexus/nexus-ops-body-frame.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-body-frame.tsx) | 19 | NexusOpsBodyFrame | NexusOpsBodyFrameProps | - | - | no | not indicated |
| [src/components/nexus/nexus-ops-extraction-map.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-extraction-map.test.ts) | 135 | - | - | onDragStop, onResizeStop | useNexusStore | no | yes/static signal |
| [src/components/nexus/nexus-ops-outer-shell-frame.test.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-outer-shell-frame.test.tsx) | 131 | - | NexusOpsOuterShellFrameProps | - | - | no | yes/static signal |
| [src/components/nexus/nexus-ops-outer-shell-frame.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-outer-shell-frame.tsx) | 16 | NexusOpsOuterShellFrame | NexusOpsOuterShellFrameProps | - | - | no | not indicated |
| [src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx) | 147 | - | NexusOpsRightFloatingDockFrameProps | - | - | no | yes/static signal |
| [src/components/nexus/nexus-ops-right-floating-dock-frame.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-right-floating-dock-frame.tsx) | 21 | NexusOpsRightFloatingDockFrame | NexusOpsRightFloatingDockFrameProps | - | - | no | not indicated |
| [src/components/nexus/nexus-ops-top-bar-frame.test.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-top-bar-frame.test.tsx) | 146 | - | NexusOpsTopBarFrameProps | - | - | no | yes/static signal |
| [src/components/nexus/nexus-ops-top-bar-frame.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops-top-bar-frame.tsx) | 26 | NexusOpsTopBarFrame | NexusOpsTopBarFrameProps | - | - | no | not indicated |
| [src/components/nexus/nexus-ops.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-ops.tsx) | 9654 | AgentActionToolbar, AgentModelTuningPanel, AgentSettingsSidebar, AgentTemplateProfilePanel, AgentWindow, CollapsedSidebarRail, CommandPalette, EMPTY_AGENTS | - | onAddAgent, onAddWorkflowNode, onAppendWorkflowContractText, onApplyPlan, onAttachmentSaved | getState,setState,useNexusStore / get,post | yes | yes/static signal |
| [src/components/nexus/nexus-production-page-shell-boundary.test.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-production-page-shell-boundary.test.tsx) | 105 | - | NexusProductionPageShellBoundaryProps | - | - | no | yes/static signal |
| [src/components/nexus/nexus-production-page-shell-boundary.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-production-page-shell-boundary.tsx) | 32 | NEXUS_PRODUCTION_PAGE_SHELL_BOUNDARY_VERSION_V1, NEXUS_PRODUCTION_PAGE_SHELL_IDS_V1, NexusProductionPageShellBoundary | NexusProductionPageShellBoundaryProps | - | - | no | not indicated |
| [src/components/nexus/nexus-production-preview-controller.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-production-preview-controller.test.ts) | 76 | - | - | - | - | no | yes/static signal |
| [src/components/nexus/nexus-production-preview-controller.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-production-preview-controller.tsx) | 460 | NexusProductionPreviewController | NexusProductionPreviewControllerProps | onClick | setState | no | yes/static signal |
| [src/components/nexus/nexus-production-style-layer-contract.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-production-style-layer-contract.test.ts) | 149 | NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR | - | - | - | no | yes/static signal |
| [src/components/nexus/nexus-theme-panel-live-style-controls.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-theme-panel-live-style-controls.test.ts) | 333 | WorkspaceStyleControlsPanel | - | - | - | no | yes/static signal |
| [src/components/nexus/nexus-workspace-chat-composer-shell.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-workspace-chat-composer-shell.test.ts) | 231 | - | - | onComposerModeChange, onDownloadArtifact, onFillPrompt, onFocusAgent, onGenerateImage | - | no | yes/static signal |
| [src/components/nexus/nexus-workspace-primitive.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-workspace-primitive.test.ts) | 75 | - | - | - | - | no | yes/static signal |
| [src/components/nexus/nexus-workspace-readonly-gate.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-workspace-readonly-gate.test.ts) | 33 | - | - | - | - | no | yes/static signal |
| [src/components/nexus/nexus-workspace-style-payload-export-import.test.ts](/Users/sean/Documents/FreeChat/src/components/nexus/nexus-workspace-style-payload-export-import.test.ts) | 88 | - | - | - | - | no | not indicated |
| [src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx) | 237 | - | WorkflowProSurfaceProps | onApplyPlan, onClearImportedContract, onExportContract, onImportContractText, onOpenGraph | - | no | yes/static signal |
| [src/components/nexus/workflow-pro/workflow-pro-surface.tsx](/Users/sean/Documents/FreeChat/src/components/nexus/workflow-pro/workflow-pro-surface.tsx) | 1722 | WorkflowProActiveModeBay, WorkflowProActiveModeDetails, WorkflowProBrainProposalIntake, WorkflowProCapabilityRegistry, WorkflowProDesignGate, WorkflowProDetailGrid, WorkflowProEvidenceGateSummary, WorkflowProFilePipelinePath | WorkflowProSurfaceProps | onApplyPlan, onBrainProposalSourceNameChange, onBrainProposalTextChange, onChange, onClearImportedContract | - | yes | yes/static signal |
| [src/components/style-engine/nexus-style-lab-imported-workspace-style.test.ts](/Users/sean/Documents/FreeChat/src/components/style-engine/nexus-style-lab-imported-workspace-style.test.ts) | 133 | - | - | - | - | no | not indicated |
| [src/components/style-engine/nexus-style-lab-production-chrome-smoke.test.ts](/Users/sean/Documents/FreeChat/src/components/style-engine/nexus-style-lab-production-chrome-smoke.test.ts) | 108 | - | - | - | - | no | yes/static signal |
| [src/components/style-engine/nexus-style-lab-surface-style-coverage.test.ts](/Users/sean/Documents/FreeChat/src/components/style-engine/nexus-style-lab-surface-style-coverage.test.ts) | 325 | - | - | - | - | no | yes/static signal |
| [src/components/style-engine/nexus-style-lab.tsx](/Users/sean/Documents/FreeChat/src/components/style-engine/nexus-style-lab.tsx) | 5966 | Icon, NexusStyleLab | - | onChange, onClick | - | yes | yes/static signal |
| [src/components/style-engine/nexus-style-runtime-provider.tsx](/Users/sean/Documents/FreeChat/src/components/style-engine/nexus-style-runtime-provider.tsx) | 148 | NexusStyleRuntimeContext, NexusStyleRuntimeProvider | - | - | - | no | yes/static signal |
| [src/components/theme-provider.tsx](/Users/sean/Documents/FreeChat/src/components/theme-provider.tsx) | 19 | ThemeProvider | - | - | - | no | yes/static signal |
```

## Raw API Shape

The raw source API JSON is saved under `_raw-source-api/` for audit. It is metadata-only for this notebook source in the current API response.
