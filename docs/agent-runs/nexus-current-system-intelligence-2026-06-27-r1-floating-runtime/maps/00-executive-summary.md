# R1 Workspace Floating Runtime Inventory - Executive Summary

## Run Position

This run advances the corrected NEXUS roadmap from `nexus_obsidian_vault/08 Roadmap.md` into R1: inventory the existing Workspace floating windows and compare them with the `/desktop` proof-of-concept window runtime.

Run type: read-only current-system mapping plus documentation.

No production source files were modified. No DB migration was made. `/desktop` was not deleted or promoted.

## Already Confirmed, Not Redone

- R0 login landing is already corrected in current source: `/` renders `NexusOps` and is documented as the default post-login destination in `src/app/page.tsx:5-20`.
- `/desktop` is explicitly documented as experimental and not the default login destination in `src/app/desktop/page.tsx:1-15`.
- `/workspace/[id]` still hosts `NexusOps` under the workspace route without a rewrite in `src/app/workspace/[id]/page.tsx:8-30`.
- Existing `/desktop` POC phase history and current registered apps are already documented in `docs/window-os.md:122-203`.
- Phase 5B feed/interaction primitive is already represented in `docs/window-os.md:122-130`; R1 did not re-test or reimplement it.

## Core Findings

### 1. Workspace already has floating windows, but they are agent-centric

Workspace floating behavior currently centers on `NexusAgent` and `AgentWindow`, not a generic app runtime.

Evidence:

- `NexusAgent` owns `layout`, `previousLayout`, `minimized`, and `maximized` in `src/lib/nexus-types.ts:199-229`.
- `AgentLayout` carries `x`, `y`, `width`, `height`, and `zIndex` in `src/lib/nexus-types.ts:138-144`.
- `NexusOps` renders visible agents as `AgentWindow` instances and passes focus, minimize, maximize, close, duplicate, sandbox, and layout callbacks in `src/components/nexus/nexus-ops.tsx:3421-3458`.
- `AgentWindow` uses `react-rnd` for drag/resize within the workspace stage in `src/components/nexus/nexus-agent-window.tsx:536-559`.

### 2. Workspace window state is mixed into the main workspace store

Workspace window lifecycle is not isolated in a runtime store. It is part of `src/store/nexus-store.ts`, which also owns workspace, auth vault, artifacts, notebook cache, prompts, workflow runtime, agents, messages, sync, and tools.

Evidence:

- Store actions expose `minimizeAgent`, `restoreAgent`, `toggleMaximizeAgent`, `minimizeAll`, `restoreAll`, and `arrangeAgents` in `src/store/nexus-store.ts:529-534`.
- `focusAgent` updates `selectedAgentId`, `activeAgentId`, and `zIndex` together in `src/store/nexus-store.ts:2590-2611`.
- `updateLayout` mutates agent layout and clears maximize state in `src/store/nexus-store.ts:2625-2639`.
- Persisted workspace state includes `workspaces`, `selectedAgentId`, `nextZIndex`, and `viewMode` in `src/store/nexus-store.ts:4547-4559`.

### 3. `/desktop` already has a cleaner generic runtime kernel

The `/desktop` POC has a generic window kernel with types, store, registry, frame, manager, launcher, command palette, notification center, and localStorage persistence.

Evidence:

- `NexusWindow` is generic and includes `kind`, `scope`, `layout`, `minimized`, `maximized`, and optional app `state` in `src/kernel/window/window-types.ts:90-126`.
- `NexusWindowAppDefinition` defines the registry shape with `kind`, `title`, `scope`, sizing, `component`, singleton/multiple behavior, icon, capabilities, archetype, and lifecycle in `src/kernel/window/window-types.ts:148-230`.
- `window-store.ts` states that it knows nothing about feature business logic and owns open/close/focus/min/max/move/resize/persist in `src/kernel/window/window-store.ts:1-14`.
- `WindowManager` resolves content through the registry and wraps it in `WindowFrame` in `src/kernel/window/WindowManager.tsx:128-160`.
- `NexusDesktopShell` measures bounds, hydrates window state, registers commands, constrains windows, renders a taskbar, and launches registry apps in `src/kernel/window/NexusDesktopShell.tsx:93-232` and `src/kernel/window/NexusDesktopShell.tsx:381-455`.

### 4. Workspace sandbox exists, but not as a registry app

The Workspace sandbox is currently an agent capability path inside `AgentWindow`, not a first-class floating app registry entry.

Evidence:

- `AgentWindow` detects sandbox capability and renders `SandboxCanvas` for sandbox agents in `src/components/nexus/nexus-agent-window.tsx:465-468` and `src/components/nexus/nexus-agent-window.tsx:635-644`.
- `NexusWindowKind` includes `"sandbox"` in `src/kernel/window/window-types.ts:23-38`.
- `DEFAULT_WINDOW_APPS` does not register a `"sandbox"` app; it registers global chat, account, workspace link-out, notes, feed, forum, profile preview, artifact windows, and developer inspector in `src/kernel/window/default-window-apps.ts:133-289`.

### 5. R2 should be a boundary plan, not a rewrite

R1 shows the reusable pieces are real, but the two systems are still different enough that the next progress should be a boundary plan before implementation.

Recommended next packet:

R2 Shared Floating Runtime Boundary Plan.

R2 should define the boundary between:

- Workspace shell responsibilities already present in `NexusOps`.
- Generic floating runtime responsibilities already present in `src/kernel/window`.
- Workspace-specific app context needed by agent/sandbox/datapad windows.
- Registry bridge rules for opening future apps inside Workspace without turning `NexusOps` into a god file.

## Large File Responsibility Inventory

### `src/store/nexus-store.ts` - 4679 lines

Responsibilities observed:

- Workspace persistence, import/export, recovery, and active workspace selection.
- Agent spawning, selection, focus, layout, messages, branch state, sandbox content, and tool execution.
- Window-like agent state: layout, minimize, maximize, restore, arrange, and z-index.
- Auth vault, artifact vault/cache, prompts, notebooks/datapad state, transaction history.
- Workflow runtime lite graph/node/group state.

R2 input: do not add a second generic runtime into this store. Plan an adapter boundary that can read/write workspace-owned agent state until a safe extraction exists.

### `src/components/nexus/nexus-ops.tsx` - 3684 lines

Responsibilities observed:

- Primary Workspace shell and route surface.
- Top bar, left dock, right floating dock, workspace stage, bottom composer, command palette, macro modal, prompt vault, branch modal.
- Workspace bounds measurement and window rendering host.
- Agent message send/stop/media/image generation orchestration.
- Workspace sync/recovery/import/export and style/theme review.
- View modes: panels, graph, workflow-pro.

R2 input: `NexusOps` should remain the Workspace shell host. Floating runtime extraction should reduce future imports here, not move new product business logic into it.

### `src/components/nexus/nexus-agent-window.tsx` - 675 lines

Responsibilities observed:

- `react-rnd` drag/resize frame for agent windows.
- Capability-dependent content switching: chat transcript, sandbox canvas, media canvas.
- Sandbox editor collapse, interaction lock, and save-artifact controls.
- Agent action toolbar wiring.

R2 input: split frame responsibilities from agent content before turning sandbox/chat/media into registry apps.

### `src/components/nexus/nexus-panels.tsx` - 938 lines

Responsibilities observed:

- Workspace top bar, right floating dock, macro modal, right intel/settings panels.
- Current right dock panel list and UI metadata.

R2 input: dock/launcher affordances should be treated as Workspace shell UI, not as app runtime internals.

