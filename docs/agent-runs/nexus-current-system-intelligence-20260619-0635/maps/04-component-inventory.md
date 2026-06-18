# Component Inventory — NEXUS // AI OPS

## Overview

| Metric | Count |
|---|---|
| Total NEXUS components (non-test) | 23 |
| Total Style Engine components (non-test) | 2 |
| Total other components | 1 |
| **Component total** | **26** |

---

## NEXUS Components — Full Catalog

### 1. `NexusOps`
- **File**: `src/components/nexus/nexus-ops.tsx`
- **Size**: 3684 lines (**>3000 lines — needs migration-map input**)
- **Export**: `export function NexusOps()`
- **Type**: Client component with `"use client"`
- **Props**: None (reads store directly)
- **Responsibility**: **Main workspace orchestration surface.** Renders all agent windows, manages view modes (panels/graph/workflow-pro), animation orchestration, production preview, theme application, workspace snapshot import/export, agent lifecycle (spawn/duplicate/remove/branch), layout management, and style payload normalization.
- **Key Dependencies**: `nexus-store`, `nexus-chrome`, react-rnd, framer-motion, lucide-react, style-engine
- **Risk**: Very high — 3684 lines is past the mutation safety threshold. Responsibility coalescence risk: combines layout, view mode switching, style application, workspace management, agent management, and animation orchestration.

### 2. `NexusChrome`
- **File**: `src/components/nexus/nexus-chrome.tsx`
- **Export**: Multiple named exports (`CommandPalette`, `MinimizedRail`, `AgentActionToolbar`, `SidebarToggleButton`, `CollapsedSidebarRail`)
- **Responsibility**: Chrome/frame UI elements — command palette, minimized agent rail, toolbar, sidebar toggles

### 3. `NexusGraph`
- **File**: `src/components/nexus/nexus-graph.tsx`
- **Size**: 2409 lines (**>1000 lines — needs responsibility inventory**)
- **Export**: `export function NexusGraph({...})`
- **Type**: Client component
- **Framework**: React Flow (`@xyflow/react`)
- **Props**: workspace, agents, edges, agent templates, macros, selection state
- **Responsibility**: Interactive agent graph visualization. React Flow nodes/edges, drag-to-connect, node positioning, macro creation, template instantiation, zoom/pan.

### 4. `NexusAgentWindow`
- **File**: `src/components/nexus/nexus-agent-window.tsx`
- **Export**: `NexusAgentWindow`
- **Type**: Client component
- **Framework**: react-rnd (Resizable & Draggable)
- **Props**: agent, workspace, layout, bounds, chat composer shell
- **Responsibility**: Individual draggable/resizable agent chat window with chroming, message display, composer integration.

### 5. `NexusAgentSettingsSidebar`
- **File**: `src/components/nexus/nexus-agent-settings-sidebar.tsx`
- **Size**: 1987 lines (**>1000 lines — needs responsibility inventory**)
- **Export**: `NexusAgentSettingsSidebar`
- **Responsibility**: Full agent configuration panel — model selection, reasoning/verbosity controls, temperature, callsign, mission, memory blocks, tool toggles, branching config, capability display.

### 6. `NexusOpsOuterShellFrame`
- **File**: `src/components/nexus/nexus-ops-outer-shell-frame.tsx`
- **Export**: `NexusOpsOuterShellFrame`
- **Responsibility**: Outer page-level chrome wrapper for NexusOps

### 7. `NexusOpsBodyFrame`
- **File**: `src/components/nexus/nexus-ops-body-frame.tsx`
- **Export**: `NexusOpsBodyFrame`
- **Responsibility**: Main content area container within NexusOps

### 8. `NexusOpsTopBarFrame`
- **File**: `src/components/nexus/nexus-ops-top-bar-frame.tsx`
- **Export**: `NexusOpsTopBarFrame`
- **Responsibility**: Top toolbar with view mode switcher, workspace controls, undo/redo, export/import

### 9. `NexusOpsRightFloatingDockFrame`
- **File**: `src/components/nexus/nexus-ops-right-floating-dock-frame.tsx`
- **Export**: `NexusOpsRightFloatingDockFrame`
- **Responsibility**: Right-side floating dock for style controls and auxiliary panels

### 10. `NexusPanels`
- **File**: `src/components/nexus/nexus-panels.tsx`
- **Export**: `NexusPanels`
- **Responsibility**: Panel view mode — renders free-form draggable agent windows and datapad windows

### 11. `NexusSettingsPanels`
- **File**: `src/components/nexus/nexus-settings-panels.tsx`
- **Export**: `NexusSettingsPanels`
- **Responsibility**: Global workspace settings panel

### 12. `NexusProductionPageShellBoundary`
- **File**: `src/components/nexus/nexus-production-page-shell-boundary.tsx`
- **Export**: `NexusProductionPageShellBoundary`
- **Props**: `shellId: string`, `children`
- **Responsibility**: Layout shell boundary for style-engine page shell integration

### 13. `NexusProductionPreviewController`
- **File**: `src/components/nexus/nexus-production-preview-controller.tsx`
- **Export**: `NexusProductionPreviewController`
- **Props**: `enabled: boolean`
- **Responsibility**: Controls production style preview mode (first-cut)

### 14. `WorkflowProSurface`
- **File**: `src/components/nexus/workflow-pro/workflow-pro-surface.tsx`
- **Size**: 1721 lines (**>1000 lines — needs responsibility inventory**)
- **Export**: `WorkflowProSurface`
- **Framework**: React Flow
- **Responsibility**: Advanced workflow builder surface with runtime execution, node types (text input, LLM, image, output), group operations, trace viewing.

### 15. `AgentBranchModal`
- **File**: `src/components/nexus/AgentBranchModal.tsx`
- **Export**: `AgentBranchModal`
- **Responsibility**: Modal for configuring and executing agent branching/forking with memory compression

### 16. `DatapadWindow`
- **File**: `src/components/nexus/DatapadWindow.tsx`
- **Export**: `DatapadWindow`
- **Responsibility**: Floating notebook/datapad editor window

### 17. `PromptVaultManager`
- **File**: `src/components/nexus/PromptVaultManager.tsx`
- **Export**: `PromptVaultManager`
- **Responsibility**: Prompt vault management overlay — CRUD for stored prompts

### 18. `AuthScreen`
- **File**: `src/components/nexus/auth-screen.tsx`
- **Export**: `AuthScreen`
- **Responsibility**: Authentication/login overlay with Supabase auth, API key entry, provider credential management

### 19. `DynamicIcon`
- **File**: `src/components/nexus/dynamic-icon.tsx`
- **Export**: `DynamicIcon`
- **Responsibility**: Animated capability-aware icon for agents (chat/image/video/sandbox/etc)

### 20. `NexusUtils`
- **File**: `src/components/nexus/nexus-utils.tsx`
- **Export**: Multiple utility functions
- **Responsibility**: Shared component utilities, hooks, helpers

### 21. `WorkspaceChatComposerShell`
- **File**: `src/components/nexus/workspace-chat-composer-shell.tsx`
- **Export**: `WorkspaceChatComposerShell`
- **Responsibility**: Message input compose area with model selector, send button, attachments

### 22. `WorkspaceStyleControlsPanel`
- **File**: `src/components/nexus/workspace-style-controls-panel.tsx`
- **Export**: `WorkspaceStyleControlsPanel`
- **Responsibility**: Live theme/style control panel for workspace

### 23. `useNexusConnectorProps`
- **File**: `src/components/nexus/use-nexus-connector-props.ts`
- **Export**: `useNexusConnectorProps` (hook)
- **Responsibility**: Hook providing connection props for agent edges

---

## Style Engine Components

### 1. `NexusStyleLab`
- **File**: `src/components/style-engine/nexus-style-lab.tsx`
- **Size**: 5965 lines (**>3000 lines — needs migration-map input**)
- **Export**: `export function NexusStyleLab()`
- **Type**: Client component
- **Responsibility**: Complete theme/style design laboratory. Skin pack creation, asset pack management, recipe registry, layout preset designer, performance budget configuration, import/export of style payloads, token preview, render plan visualization, production token bridge, recipe specimen preview, review of imported styles.
- **Risk**: Highest — 5965 lines is well past the mutation safety threshold. This file is the single largest in the entire codebase. Combines design tool, preview renderer, validation engine, import/export, and administration in one component.

### 2. `NexusStyleRuntimeProvider`
- **File**: `src/components/style-engine/nexus-style-runtime-provider.tsx`
- **Export**: `NexusStyleRuntimeProvider`
- **Props**: `children`
- **Responsibility**: Context provider for style runtime — token bridge initialization, CSS variable injection

---

## Other Components

### 1. `ThemeProvider`
- **File**: `src/components/theme-provider.tsx`
- **Export**: `ThemeProvider`
- **Responsibility**: Next.js theme hydration wrapper (dark/light mode via next-themes or similar)

---

## Files >1000 Lines — Responsibility Inventory

| File | Lines | Primary Responsibility | Split Candidates |
|---|---|---|---|
| `nexus-style-lab.tsx` | 5965 | Theme/style design lab + preview + import/export + validation | Skin pack designer, asset manager, layout preset editor, preview renderer, import/export service |
| `nexus-store.ts` | 4679 | Single zustand state store | Agent slice, workspace slice, sync slice, auth slice, notebook slice, prompt slice, workflow slice |
| `nexus-ops.tsx` | 3684 | Workspace orchestration surface | Layout manager, view mode router, style applicator, agent lifecycle manager, snapshot handler |
| `nexus-graph.tsx` | 2409 | Agent graph canvas | Node renderer, edge manager, macro manager, template handler |
| `nexus-agent-settings-sidebar.tsx` | 1987 | Agent configuration panel | Model config section, memory section, tool section, profile section |
| `v2-validators.ts` | 1863 | Style engine validation | Skin pack validator, asset pack validator, recipe validator, layout validator |
| `nexus-types.ts` | 1854 | Type definitions | Could split by domain: agent types, workspace types, sync types, workflow types |
| `nexus-store.test.ts` | 1818 | Store test suite | Per-slice test files |
| `workflow-pro-surface.tsx` | 1721 | Workflow builder surface | Node palette, canvas controls, debug panel, group manager |
| `state-sync.ts` | 1392 | State sync manager | Mock adapter, Supabase adapter, conflict resolver |
| `agent-stream-service.ts` | 1089 | Agent streaming | Stream parser, event emitter, reconnect logic |
| `graph-brain-planner.ts` | 1072 | Workflow planning | Plan generator, node sorter, dependency resolver |
| `v2-workspace-style-payload.ts` | 1067 | Style payload schema | Payload types, normalizer, validator, serializer |
| `v2-layout-boundary.ts` | 1030 | Layout boundary contract | Slot registry, preset factory, arrangement definitions |

---

## Files >3000 Lines — Migration Map Input

### `nexus-style-lab.tsx` (5965 lines)
- **Current**: Single monolithic component handling all style laboratory functions
- **Suggested split**: 
  - `style-lab/SkinPackDesigner.tsx` — skin pack creation/edit
  - `style-lab/AssetPackManager.tsx` — asset upload/management
  - `style-lab/LayoutPresetEditor.tsx` — layout preset configuration
  - `style-lab/StylePreviewRenderer.tsx` — preview rendering
  - `style-lab/StyleImportExport.tsx` — import/export workflow
  - `style-lab/RecipeRegistryViewer.tsx` — recipe management
  - `style-lab/PerformanceBudgetPanel.tsx` — budget configuration
  - `style-lab/useStyleLabState.ts` — shared state hook

### `nexus-store.ts` (4679 lines)
- **Current**: Single zustand store with all state and actions
- **Suggested split** (via zustand slices):
  - `store/slices/agent-slice.ts` — agent CRUD, messages, streaming
  - `store/slices/workspace-slice.ts` — workspace CRUD, snapshots, view mode
  - `store/slices/sync-slice.ts` — cloud sync, historical data
  - `store/slices/auth-slice.ts` — auth vault, credentials
  - `store/slices/notebook-slice.ts` — notebooks/datapads
  - `store/slices/prompt-slice.ts` — prompt vault
  - `store/slices/workflow-slice.ts` — workflow runtime state
  - `store/slices/style-slice.ts` — theme/style state

### `nexus-ops.tsx` (3684 lines)
- **Current**: Single component handling all workspace UI orchestration
- **Suggested split**:
  - `nexus-ops/NexusOpsLayoutManager.tsx` — layout/animation management
  - `nexus-ops/NexusOpsViewRouter.tsx` — view mode switching
  - `nexus-ops/NexusOpsStyleApplicator.tsx` — theme/style application
  - `nexus-ops/NexusOpsAgentManager.tsx` — agent lifecycle hooks
  - `nexus-ops/NexusOpsSnapshotManager.tsx` — workspace import/export
  - `nexus-ops/useNexusOpsState.ts` — shared state/derived values

---

*Evidence: Filesystem `find` scan, `wc -l` counts, export/import analysis*
*Responsibility inferred from imports/exports and component naming conventions*
*Migration map suggestions are architectural observations only — no implementation provided*
