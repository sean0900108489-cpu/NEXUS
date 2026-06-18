# Button & Interaction Map — NEXUS // AI OPS

## Overview

NEXUS interactions are distributed across component files. The primary interaction surface is concentrated in `nexus-ops.tsx` (3684 lines), `nexus-chrome.tsx`, `nexus-agent-settings-sidebar.tsx` (1987 lines), and `nexus-graph.tsx` (2409 lines).

| Interaction Category | Approximate Count | Primary Location |
|---|---|---|
| Button clicks (onClick) | ~250+ | nexus-ops.tsx, nexus-chrome.tsx, nexus-agent-settings-sidebar.tsx |
| Dropdown/Menu items | ~40+ | nexus-ops.tsx, nexus-chrome.tsx |
| Keyboard shortcuts | ~20+ | nexus-ops.tsx (Command palette) |
| Drag & drop | [agent windows] | nexus-ops.tsx (react-rnd) |
| Graph interactions | [React Flow nodes/edges] | nexus-graph.tsx |

---

## Icon Inventory (lucide-react)

**Source**: `src/components/nexus/nexus-ops.tsx` imports from lucide-react:

| Icon | Likely Use |
|---|---|
| `Check` | Confirm actions |
| `ChevronDown` | Dropdown toggle |
| `ChevronLeft/Right` | Navigation, sidebar toggle |
| `Command` | Command palette indicator |
| `Copy` | Copy to clipboard |
| `Download` | Export/download |
| `ExternalLink` | Open external link |
| `FileUp` | File upload |
| `Fullscreen` | Fullscreen toggle |
| `GitBranch` | Agent branching |
| `Layers3` | Layer management |
| `Lock/Unlock` | Auth vault lock/unlock |
| `Maximize2/Minimize2` | Window maximize/minimize |
| `Menu` | Hamburger menu |
| `PanelLeftClose/Open` | Sidebar panel toggle |
| `Plus` | Add agent/template |
| `RefreshCcw` | Refresh/reload |
| `Search` | Search trigger |
| `SendHorizontal` | Send message |
| `ShieldCheck` | Security/permission indicator |
| `SlidersHorizontal` | Settings control |
| `Save` | Save action |
| `Settings` | Settings panel |
| `Square` | Stop generation |
| `Trash2` | Delete agent |
| `Upload` | Upload action |
| `Workflow` | Workflow view mode |
| `X` | Close/dismiss |
| `Zap` | Quick action/execute |

---

## Top Bar Interactions

**Source**: `src/components/nexus/nexus-ops-top-bar-frame.tsx`

- **View Mode Toggle**: panels / graph / workflow-pro selector
- **Workspace Selector**: dropdown to switch active workspace
- **Undo**: Ctrl+Z (zundo temporal store middleware)
- **Redo**: Ctrl+Shift+Z
- **Export**: workspace snapshot export
- **Import**: workspace snapshot import
- **Save**: snapshot save to cloud
- **Settings**: global settings panel toggle

---

## Agent Window Interactions

**Source**: `src/components/nexus/nexus-agent-window.tsx`

Per-agent window chrome:
- **Minimize**: collapse agent to minimized rail
- **Maximize**: full workspace mode
- **Close**: close agent
- **Focus/Select**: click to select agent
- **Drag**: reposition agent window (react-rnd)
- **Resize**: resize agent window (react-rnd)
- **Settings**: open agent-specific settings sidebar
- **Duplicate**: clone agent
- **Branch**: fork agent with compression
- **Model Selector**: dropdown to change agent model
- **Send**: submit message

---

## Chat Composer Shell

**Source**: `src/components/nexus/workspace-chat-composer-shell.tsx`

- **Message Input**: textarea for chat input
- **Send Button**: submit with Enter or click
- **Model Selector**: change current model
- **Attachment Area**: file/image attachment
- **Mention/AI**: @-mention or AI directive

---

## Chrome Interactions

**Source**: `src/components/nexus/nexus-chrome.tsx`

- **Command Palette**: ⌘K / Ctrl+K to open
  - Search agents
  - Search commands
  - Quick actions
- **Minimized Rail**: click to restore minimized agents
- **Agent Action Toolbar**: per-agent quick actions
- **Sidebar Toggle**: open/close sidebars
- **Collapsed Sidebar Rail**: compact sidebar mode

---

## Agent Settings Sidebar

**Source**: `src/components/nexus/nexus-agent-settings-sidebar.tsx` (1987 lines, ~73 interactions)

- **Model Selection**: dropdown with model categories
- **Reasoning Effort**: slider/dropdown (none/minimal/low/medium/high/xhigh)
- **Verbosity**: slider/dropdown (low/medium/high)
- **Reasoning Detail**: control (low/medium/high)
- **Temperature**: slider (0-2)
- **Callsign**: text input
- **Mission**: textarea
- **Profile Lock**: toggle
- **Memory Blocks**: add/edit/delete
- **Tools**: enable/disable agent tools
- **Branching**: configure compression mode & ratio
- **Capability**: view agent capability type

---

## Graph Interactions

**Source**: `src/components/nexus/nexus-graph.tsx` (2409 lines, ~73 interactions)

- **Node Selection**: click to select
- **Node Drag**: reposition nodes
- **Node Connect**: draw edges between nodes
- **Edge Remove**: remove connections
- **Zoom**: scroll to zoom
- **Pan**: drag canvas to pan
- **Node Add**: add new agent node
- **Canvas Save as Macro**: save arrangement as template
- **Instantiate Macro**: create agents from template

---

## Workflow Pro Interactions

**Source**: `src/components/nexus/workflow-pro/workflow-pro-surface.tsx` (1721 lines, ~48 interactions)

- **Node Add**: text input, LLM, image, output nodes
- **Node Connect**: wire nodes in workflow
- **Run Workflow**: execute workflow
- **Group Operations**: group nodes into run groups
- **Runtime Trace**: view execution trace
- **Template Operations**: save/load workflow templates

---

## Auth Screen Interactions

**Source**: `src/components/nexus/auth-screen.tsx`

- **Login**: Supabase auth login
- **API Key Input**: global API key entry
- **Provider Credentials**: per-provider key entry
- **Lock/Unlock Vault**: security toggle

---

## Datapad (Notebook) Interactions

**Source**: `src/components/nexus/DatapadWindow.tsx`

- **Create Note**: new notebook
- **Edit Note**: inline editing
- **Delete Note**: with tombstone
- **Open/Close**: toggle notebook window
- **Focus Window**: bring to front

---

## Prompt Vault Interactions

**Source**: `src/components/nexus/PromptVaultManager.tsx`

- **Create Prompt**: new prompt entry
- **Edit Prompt**: title + content
- **Delete Prompt**: with tombstone
- **Search/Filter**: prompt list search

---

## Keyboard Shortcuts (inferred from Command Palette pattern)

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Open Command Palette |
| `Ctrl+Z` | Undo (zundo temporal) |
| `Ctrl+Shift+Z` | Redo |
| `Enter` | Send message |
| `Shift+Enter` | Newline in composer |
| `Escape` | Close modal/palette |

---

## Store-Driven UI State (view/visibility toggles)

| State Field | Type | Controls |
|---|---|---|
| `viewMode` | `"panels" \| "graph" \| "workflow-pro"` | View mode toggle in top bar |
| `isVaultManagerOpen` | `boolean` | Prompt vault overlay visibility |
| `selectedAgentId` | `string?` | Which agent's settings are shown |
| `streamMode` | `"mock" \| "live" \| "mixed"` | Agent streaming behavior |
| `branchingStatus` | `AgentBranchingStatus` | Branch modal state |

---

*Evidence: Grep counts across component files; lucide-react imports from nexus-ops.tsx; store state fields from nexus-store.ts*
*Interaction counts are approximate due to dynamic component rendering patterns*
