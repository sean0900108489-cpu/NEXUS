# S-10: Workspace OS Navigation Simplification

**Phase:** H (Workspace OS Navigation Simplification)
**Depends on:** S-8 (Home Shell entry defined)
**Owner Locks:** Deferred D-5 (NexusOps → /workspace/[id])
**Status:** Design only — no implementation authorized

## Objective
Design the simplified workspace OS navigation after Home Shell takes over global navigation. NexusOps internal navigation is reduced to workspace-scoped actions only.

## Code Domains Touched (Design Reference Only)
- `src/components/nexus/nexus-ops.tsx` — current workspace shell (reference for what needs to change)
- `src/components/nexus/nexus-command-palette.tsx` — command palette (reference for scope reduction)
- `src/components/nexus/nexus-context-menu-registry.tsx` — context menus (reference)

## Data Domains Touched (Design Reference Only)
None. This is a UI navigation restructure, not a data model change.

## What This Slice Designs

### 10.1 Navigation Ownership Transfer

```
CURRENT (in NexusOps):
  - Workspace switcher (in workspace)
  - Global navigation elements (may exist in palette/menus)
  - "Back to home" may not exist

TARGET:
  Home Shell owns:
    - Workspace list & switching
    - Global search
    - Account settings
  
  Workspace OS (/workspace/[id]) owns:
    - Panel management (add/remove/resize panels)
    - Panel mode switching (chat/graph/workflow)
    - Workspace-level save/rename
    - Workspace notebook entry (NOVA)
    - Artifact browser
    - "Back to Home" navigation
    - Command palette (workspace-scoped only)
```

### 10.2 NexusOps Change Map (Design, Not Implementation)

```
Elements to REMOVE from NexusOps (moved to Home Shell):
  - Workspace list/switcher
  - Any global navigation
  - Any account-level actions

Elements to ADD to NexusOps (previously missing):
  - "← Back to Home" navigation element
  - Workspace name display (breadcrumb)
  - Workspace notebook entry point (NOVA launcher)

Elements to KEEP in NexusOps:
  - Panel system (chat, graph, workflow)
  - Panel management (add, remove, resize, rearrange)
  - Workspace-level save/rename
  - Artifact management
  - Command palette (scoped to workspace actions only)
  - Context menus (scoped to workspace actions only)
```

### 10.3 Command Palette Scope Reduction

```
Current palette (may include global actions):
Target palette (workspace-scoped only):
  - "New panel" → chat/graph/workflow
  - "Save workspace"
  - "Rename workspace"
  - "Open notebook"
  - "Toggle panel mode"
  - "Back to Home"
  - Panel-specific commands

REMOVED from palette:
  - "Switch workspace" (moved to Home sidebar)
  - "Account settings" (moved to Home sidebar)
  - "New workspace" (moved to Home sidebar)
  - Any global/account-level command
```

### 10.4 Workspace Route Contract

```
/workspace/[id]
  - Loads workspace by ID
  - Validates user is member (via workspace_memberships)
  - Renders NexusOps with workspace context
  - No global navigation elements

/workspace/[id]?panel=chat
  - Opens workspace with specific panel active

/workspace/[id]?panel=notebook
  - Opens workspace with NOVA notebook panel active
```

## Validation Method
- Navigation ownership map is unambiguous (Home owns vs Workspace owns)
- Every element in current NexusOps navigation is classified: REMOVE, ADD, or KEEP
- Command palette scope reduction list is complete
- Workspace route contract is explicit

## Forbidden Areas
- Do not modify NexusOps.tsx
- Do not modify command palette or context menu code
- Do not create /workspace/[id] route
- Do not change any data model
- Do not remove any existing code — this slice only classifies what should change

## Dependency Order
After S-8 (Home Shell design). Before S-11 (CLI/MCP integration references workspace context).

## Rollback / No-Op Validation
Only a design document produced. No code changed. No navigation modified. No state changed.
