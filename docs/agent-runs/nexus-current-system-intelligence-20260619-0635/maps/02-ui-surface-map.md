# UI Surface Map — NEXUS // AI OPS

## Overview

NEXUS has a **single-page application (SPA)** architecture within Next.js App Router. All UI surfaces are rendered client-side via the `NexusOps` component tree.

| Surface Type | Count | Evidence |
|---|---|---|
| **Routes (page.tsx)** | 2 | `/`, `/style-lab` |
| **Root Layout** | 1 | `src/app/layout.tsx` |
| **View Modes** (within main workspace) | 3 | panels, graph, workflow-pro |
| **Modals** | 2 | AgentBranchModal, VaultManager |
| **Sidebars** | 2 | AgentSettingsSidebar, Chrome sidebars |
| **Floating Panels** | 1 | WorkspaceStyleControlsPanel |
| **Windows** | 2 | DatapadWindow, AgentWindow |

---

## Route Pages

### `/` — Main Workspace Page
- **File**: `src/app/page.tsx`
- **Type**: Server component (async)
- **Renders**: `NexusOps` inside production shell and style runtime
- **Query Param**: `?nexusPreviewFirstCut=1` enables production preview controller
- **Wrappers**: `NexusStyleRuntimeProvider` → `NexusProductionPageShellBoundary` → `NexusProductionPreviewController` → `NexusOps`

### `/style-lab` — Style Laboratory
- **File**: `src/app/style-lab/page.tsx`
- **Type**: Client page
- **Purpose**: Isolated workspace for theme/style experimentation
- **Renders**: `NexusStyleLab` component

---

## UI Surfaces within `NexusOps` (3684 lines)

`NexusOps` is the main workspace container. It renders multiple surface modes:

### 1. View Mode: Panels (`viewMode: "panels"`)
- **Component**: `NexusPanels` — `src/components/nexus/nexus-panels.tsx`
- **Layout**: Free-form draggable agent windows with RND (React Resizable & Draggable)
- **Agent Windows**: `NexusAgentWindow` — `src/components/nexus/nexus-agent-window.tsx`
- **Windows rendered as**:
  - `NexusAgentWindow` — main draggable agent chat window
  - `DatapadWindow` — notebook/datapad floating window
  - `PromptVaultManager` — prompt vault overlay

### 2. View Mode: Graph (`viewMode: "graph"`)
- **Component**: `NexusGraph` — `src/components/nexus/nexus-graph.tsx` (2409 lines)
- **Framework**: React Flow (`@xyflow/react`)
- **Nodes**: Agent nodes rendered on an interactive graph canvas
- **Edges**: Agent-to-agent connections

### 3. View Mode: Workflow Pro (`viewMode: "workflow-pro"`)
- **Component**: `WorkflowProSurface` — `src/components/nexus/workflow-pro/workflow-pro-surface.tsx` (1721 lines)
- **Framework**: React Flow
- **Purpose**: Advanced workflow builder with runtime execution

---

## Chrome & Shell Surfaces

### Chrome (Frame & Tooling)
- **Component**: `NexusChrome` — `src/components/nexus/nexus-chrome.tsx`
- **Sub-components**:
  - `CommandPalette` — system command palette (⌘K style)
  - `MinimizedRail` — minimized agent sidebar rail
  - `AgentActionToolbar` — per-agent action buttons
  - `SidebarToggleButton` — toggle sidebar visibility
  - `CollapsedSidebarRail` — collapsed sidebar state

### Production Page Shell Boundary
- **Component**: `NexusProductionPageShellBoundary` — `src/components/nexus/nexus-production-page-shell-boundary.tsx`
- **Purpose**: Wraps page content with style-engine layout shell, with `shellId` prop

### Ops Frame Composition
`NexusOps` decomposes into frame sub-components:
- `NexusOpsOuterShellFrame` — outer page chrome `src/components/nexus/nexus-ops-outer-shell-frame.tsx`
- `NexusOpsTopBarFrame` — top toolbar bar `src/components/nexus/nexus-ops-top-bar-frame.tsx`
- `NexusOpsBodyFrame` — main content area `src/components/nexus/nexus-ops-body-frame.tsx`
- `NexusOpsRightFloatingDockFrame` — right-side floating dock `src/components/nexus/nexus-ops-right-floating-dock-frame.tsx`

---

## Sidebars

### Agent Settings Sidebar
- **Component**: `NexusAgentSettingsSidebar` — `src/components/nexus/nexus-agent-settings-sidebar.tsx` (1987 lines)
- **Purpose**: Detailed agent configuration (model, capabilities, memory, branching, tools)

### Settings Panels
- **Component**: `NexusSettingsPanels` — `src/components/nexus/nexus-settings-panels.tsx`
- **Purpose**: Global workspace settings

### Workspace Style Controls Panel
- **Component**: `WorkspaceStyleControlsPanel` — `src/components/nexus/workspace-style-controls-panel.tsx`
- **Purpose**: Theme/style live controls

---

## Modals

### Agent Branch Modal
- **Component**: `AgentBranchModal` — `src/components/nexus/AgentBranchModal.tsx`
- **Purpose**: Configure and execute agent forking/branching with compression

### Auth Screen
- **Component**: `AuthScreen` — `src/components/nexus/auth-screen.tsx`
- **Purpose**: Login/authentication overlay

### Vault Manager
- **State toggle**: `isVaultManagerOpen` in store
- **Component**: `PromptVaultManager` — `src/components/nexus/PromptVaultManager.tsx`

---

## Special UI Components

### Chat Composer Shell
- **Component**: `WorkspaceChatComposerShell` — `src/components/nexus/workspace-chat-composer-shell.tsx`
- **Purpose**: Message input, model selector, send button, attachment area

### Dynamic Icon
- **Component**: `DynamicIcon` — `src/components/nexus/dynamic-icon.tsx`
- **Purpose**: Animated capability-aware icon for agents

### Production Preview Controller
- **Component**: `NexusProductionPreviewController` — `src/components/nexus/nexus-production-preview-controller.tsx`
- **Purpose**: Controls production style preview mode (first-cut)

---

## Style Engine Surfaces

### Style Lab
- **Component**: `NexusStyleLab` — `src/components/style-engine/nexus-style-lab.tsx` (5965 lines — largest file in project)
- **Purpose**: Full theme/style design, testing, and import/export

### Style Runtime Provider
- **Component**: `NexusStyleRuntimeProvider` — `src/components/style-engine/nexus-style-runtime-provider.tsx`
- **Purpose**: Wraps app with style runtime context for token bridge and CSS variable injection

---

## Theme Provider
- **Component**: `ThemeProvider` — `src/components/theme-provider.tsx`
- **Used in**: Root layout
- **Purpose**: Next.js theme hydration wrapper (dark/light mode)

---

## UI Shell Hierarchy

```
<html> (RootLayout)
  <ThemeProvider>
    <NexusStyleRuntimeProvider>          [style-engine layer]
      <NexusProductionPageShellBoundary> [layout shell]
        <NexusProductionPreviewController> [preview mode]
          <NexusOps>                     [main workspace]
            <NexusChrome>                [frame chrome]
              <CommandPalette>
              <MinimizedRail>
            <NexusOpsOuterShellFrame>    [outer frame]
              <NexusOpsTopBarFrame>      [top bar]
              <NexusOpsBodyFrame>        [body]
                [view mode factory]:
                - <NexusPanels>
                  - <NexusAgentWindow> X N
                  - <DatapadWindow>
                - <NexusGraph>
                - <WorkflowProSurface>
              <NexusOpsRightFloatingDockFrame> [right dock]
            <NexusAgentSettingsSidebar>  [settings drawer]
            <AgentBranchModal>           [modal overlay]
            <AuthScreen>                 [auth overlay]
            <PromptVaultManager>         [vault overlay]
```

---

*Evidence: Component imports traced from `src/components/nexus/nexus-ops.tsx` and `src/app/page.tsx`*
*All file paths verified against filesystem scan*
