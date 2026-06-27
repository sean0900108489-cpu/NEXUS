# R1 Feature And Capability Map

## Route And Surface Map

| Surface | Current role | Evidence |
|---|---|---|
| `/` | Primary NEXUS Workspace entry and default post-login destination | `src/app/page.tsx:5-20` |
| `/workspace/[id]` | Full workspace route, still rendering `NexusOps` under a workspace nav frame | `src/app/workspace/[id]/page.tsx:8-30` |
| `/desktop` | Explicit experimental Window OS POC, not default landing | `src/app/desktop/page.tsx:1-15`, `src/app/desktop/page.tsx:134-170` |
| Workspace stage | Hosts agent windows and datapads inside the Workspace shell | `src/components/nexus/nexus-ops.tsx:3421-3605` |
| `/desktop` desktop area | Hosts generic registry windows through `WindowManager` | `src/kernel/window/NexusDesktopShell.tsx:293-305` |

## Workspace Floating Window Inventory

| Unit | Current behavior | State owner | Runtime mechanics | Evidence |
|---|---|---|---|---|
| Agent window | Floating workstation for chat/media/sandbox agents | `NexusAgent` inside `nexus-store` | `react-rnd`, bounded to parent, drag handle, resize stop callback | `src/components/nexus/nexus-agent-window.tsx:416-459`, `src/components/nexus/nexus-agent-window.tsx:502-559` |
| Sandbox window | Capability-specific agent content inside `AgentWindow` | `NexusAgent.sandboxCode` / `sandboxUrl` | Same `AgentWindow` frame; sandbox-specific editor/iframe and lock controls | `src/components/nexus/nexus-agent-window.tsx:303-408`, `src/components/nexus/nexus-agent-window.tsx:604-644` |
| Media window | Capability-specific agent content inside `AgentWindow` | `NexusAgent.messages` media artifacts | Same `AgentWindow` frame; media canvas branch | `src/components/nexus/nexus-agent-window.tsx:392-409`, `src/components/nexus/nexus-agent-window.tsx:645-648` |
| Datapad window | Floating notebook editor | Notebook cache, drafts, `openNotebookIds`, `notebookWindowLayers` | Separate `react-rnd` window with drag handle and independent z-index | `src/components/nexus/DatapadWindow.tsx:13-36`, `src/components/nexus/DatapadWindow.tsx:84-150` |
| Minimized rail | Restores minimized agent windows | `agent.minimized` | Floating rail anchored to bottom-left of workspace stage | `src/components/nexus/nexus-chrome.tsx:296-331` |
| Right floating dock | Workspace side launcher/panel switcher | `activeRightPanel` in `NexusOps` | Fixed/floating dock buttons, not part of window runtime | `src/components/nexus/nexus-panels.tsx:28-118` |
| Command palette | Workspace command launcher | local `paletteOpen` plus command list in `NexusOps` | Modal command list with spawn/arrange/minimize/restore/import/export/reset | `src/components/nexus/nexus-ops.tsx:3119-3254`, `src/components/nexus/nexus-chrome.tsx:346-445` |
| Prompt vault manager | Workspace modal, not a draggable window | `isVaultManagerOpen` in store | Fixed modal overlay | `src/components/nexus/PromptVaultManager.tsx:37-126`, `src/components/nexus/nexus-ops.tsx:3659-3661` |

## Workspace Window State Shape

Workspace floating state is currently embedded in workspace and agent records:

- `AgentLayout`: `x`, `y`, `width`, `height`, `zIndex` in `src/lib/nexus-types.ts:138-144`.
- `NexusAgent`: `layout`, `previousLayout`, `minimized`, `maximized` in `src/lib/nexus-types.ts:199-229`.
- `WorkspacePanel`: legacy/derived panel shape mirrors agent layout/minimized/maximized in `src/lib/nexus-types.ts:231-238`.
- `sanitizeWorkspace` rebuilds `panels` from `workspace.agents` in `src/store/nexus-store.ts:1427-1436`.
- Persisted state includes `workspaces`, `selectedAgentId`, `nextZIndex`, and `viewMode` in `src/store/nexus-store.ts:4547-4559`.

## `/desktop` Runtime Inventory

| Unit | Current behavior | Evidence |
|---|---|---|
| Window types | Generic window kind, scope, layout, snapshot, app props, app definition | `src/kernel/window/window-types.ts:23-230` |
| Window store | Pure lifecycle store with localStorage snapshot persistence | `src/kernel/window/window-store.ts:1-14`, `src/kernel/window/window-store.ts:40-91`, `src/kernel/window/window-store.ts:221-467` |
| App registry | Map from `NexusWindowKind` to app definition; no shell hardcoded rendering | `src/kernel/window/window-registry.ts:1-70` |
| Default app registry | Central list of registered app definitions and lazy components | `src/kernel/window/default-window-apps.ts:1-24`, `src/kernel/window/default-window-apps.ts:133-289` |
| Window frame | Generic chrome: title bar, controls, drag, resize, focus, slot | `src/kernel/window/WindowFrame.tsx:1-14`, `src/kernel/window/WindowFrame.tsx:46-265` |
| Window manager | Reads open windows, resolves app component, wraps content in error boundary and frame | `src/kernel/window/WindowManager.tsx:1-14`, `src/kernel/window/WindowManager.tsx:128-193` |
| Desktop shell | Bounds measurement, launcher, commands, taskbar, notifications, viewport constraint | `src/kernel/window/NexusDesktopShell.tsx:1-20`, `src/kernel/window/NexusDesktopShell.tsx:93-232`, `src/kernel/window/NexusDesktopShell.tsx:381-455` |

## `/desktop` Registered App Capabilities

Registered apps from `DEFAULT_WINDOW_APPS`:

| Kind | Status in registry | Capability/archetype metadata |
|---|---|---|
| `global-chat` | Active, multiple allowed | chat, composer, media-upload, resource-preview, notes-capture; chat-app |
| `global-user` | Singleton | profiles; admin-app |
| `workspace` | Link-out launcher, multiple allowed | workspace; workspace-app |
| `notes-demo` | Demo | no capability metadata |
| `forum-demo` | Demo | no capability metadata |
| `artifact-preview` | Active, multiple allowed | resource-preview; resource-app |
| `artifact-library` | Singleton | resource-library, resource-preview, search, media-upload; resource-app |
| `notes` | Singleton | composer, notes-capture, resource-preview; knowledge-app |
| `feed` | Singleton | feed, composer, profiles, resource-preview, notes-capture; social-feed-app |
| `forum` | Singleton | feed, thread, composer, comments, media-upload, notes-capture, profiles; community-app |
| `profile-preview` | Multiple allowed | profiles; admin-app |
| `developer-inspector` | Singleton/internal | commands; admin-app |

Evidence: `src/kernel/window/default-window-apps.ts:133-289`.

Gaps:

- `NexusWindowKind` still includes `marketplace-demo`, `sandbox`, and `settings`, but those kinds are not registered in `DEFAULT_WINDOW_APPS`; see `src/kernel/window/window-types.ts:23-38` and `src/kernel/window/default-window-apps.ts:133-289`.
- Workspace sandbox exists as agent capability content, not as a reusable window app.

## Shared Runtime Candidate Capability Map

| Capability | Workspace current | `/desktop` current | R2 extraction signal |
|---|---|---|---|
| Open window/app | `spawnAgent`, `toggleNotebookOpen`, hardcoded render paths | `openWindow(kind)` through registry | Needs app/open adapter, not direct shell imports |
| Close | `removeAgent`, `toggleNotebookOpen` | `closeWindow(windowId)` | Generic close action is reusable |
| Drag | `react-rnd` bounded parent | manual mousemove in `WindowFrame` | Prefer one implementation in shared frame |
| Resize | `react-rnd` resize stop | manual corner resize | Needs touch/mobile/accessibility decision |
| Focus/z-index | `focusAgent` increments `nextZIndex` | `focusWindow` increments `maxZIndex` | Same conceptual model, different store |
| Minimize/restore | `agent.minimized` plus `MinimizedRail` | `win.minimized` plus taskbar item | Reusable lifecycle, different UI host |
| Maximize/restore | `previousLayout` preserved for agents | no `previousLayout` in `NexusWindow` | Workspace behavior is safer; desktop has restore-risk |
| Bounds | Workspace `ResizeObserver` plus interval | Desktop `ResizeObserver` plus viewport constrain | Shared bounds adapter likely useful |
| Layout persistence | Zustand IndexedDB state | localStorage snapshot | Needs adapter, not one hardcoded persistence backend |
| Registry | not used for Workspace floating content | app definitions in registry | Registry bridge is core R3 input |
| Toolbar/chrome | `AgentActionToolbar` feature-specific | generic title bar | Need split generic frame controls from app toolbar |
| App content slot | `AgentWindow` switches by capability | registry component slot | Shared runtime should use slot model |
| Capability metadata | mostly `/desktop` app definitions | metadata on app registry | Keep metadata-only; do not make runtime engine |

