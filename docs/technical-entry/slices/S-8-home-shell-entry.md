# S-8: Home Shell Entry Route Design

**Phase:** D (NEXUS Home Shell Entry)
**Depends on:** S-1 (Deduplication & Naming), S-6 (Global conversations schema)
**Owner Locks:** Deferred D-5 (NexusOps → /workspace/[id]), D-6 (sidebar-heavy layout)
**Status:** Design only — no implementation authorized

## Objective
Design the new `/` route that presents the account-level Home Shell instead of NexusOps. Define the sidebar component tree, the main chat surface, workspace list integration, and wallet balance display. NexusOps is NOT deleted — it moves to `/workspace/[id]`.

## Code Domains Touched (Design Reference Only)
- `src/app/page.tsx` — current entry point (to be redesigned, not modified)
- `src/components/nexus/nexus-ops.tsx` — to be rerouted, not deleted
- `src/app/layout.tsx` — reference for root layout

## Data Domains Touched (Design Reference Only)
- Future `global_conversations` (from S-6) — recent chats data source
- Existing `workspaces` table — workspace list data source
- Future `wallet_balances` (from S-2) — wallet balance data source

## What This Slice Designs

### 8.1 Route Map (Design)

```
CURRENT:
  / → NexusOps (workspace-first)

TARGET:
  / → NEXUS Home Shell (platform-first)
  /workspace/[id] → NexusOps (workspace OS)
  
  New routes:
  / → Home Shell (NEW)
  /workspace/[id] → NexusOps (RE-ROUTED, not deleted)
  /api/global-chats → Global conversation CRUD (S-6)
  /api/workspaces → Workspace list (may already exist, extend if needed)
```

### 8.2 Home Shell Component Tree (Design)

```
NexusHomeShell
├─ NexusHomeLayout
│   ├─ NexusSidebar (left, fixed width)
│   │   ├─ NewChatButton
│   │   ├─ SearchInput
│   │   ├─ WorkspaceList
│   │   │   ├─ WorkspaceListItem (name, member count, last active)
│   │   │   └─ CreateWorkspaceButton
│   │   ├─ RecentChatsList
│   │   │   └─ RecentChatItem (title, date, model, import badge)
│   │   └─ SidebarFooter
│   │       ├─ WalletBalanceIndicator (credits remaining)
│   │       └─ UserMenu (account, settings, logout)
│   └─ MainContent (center, flexible)
│       ├─ MainChatArea
│       │   ├─ ChatMessageList (global messages)
│       │   ├─ ChatComposer (model selector, input, send)
│       │   └─ EmptyState (when no conversation selected)
│       └─ TopBar (wallet balance, user avatar — mobile responsive)
```

### 8.3 Shell Boundary Rules

| Home Shell Owns | Workspace OS Owns |
|----------------|-------------------|
| Main chat input & messages | Workspace panels (chat, graph, workflow) |
| Sidebar navigation | Panel management (add/remove/resize) |
| Workspace list | Graph/flow editor |
| Recent global chats | Workspace artifacts |
| Wallet balance display | Workspace-level settings |
| Account settings link | Workspace notebook (NOVA entry) |
| Global search | Workspace-internal search |

| Home Shell must NOT own | Workspace OS must NOT own |
|-------------------------|---------------------------|
| Workspace panel internals | Global navigation |
| NOVA notebook | Account settings |
| Tool runtime | Wallet management |
| Graph/workflow editor | Recent global chats |

### 8.4 NexusOps Preservation Rule

```
NexusOps is NOT deleted. It is re-routed.

Current: page.tsx → NexusOps
Target: workspace/[id]/page.tsx → NexusOps

If NexusOps has hardcoded assumptions about being the root route:
  - Identify those assumptions (read-only code inspection)
  - Design adapter/wrapper that provides workspace context
  - Do NOT modify NexusOps internals in this slice

NexusOps modifications (if any) belong in S-10 (Workspace OS Navigation Simplification),
not in this slice.
```

### 8.5 State Management Design

```
Add to nexus-store.ts (design only — no code modification):

Home Slice:
  - globalChats: GlobalConversation[]
  - activeGlobalChatId: string | null
  - workspaceList: WorkspaceSummary[]
  - walletBalance: number
  - sidebarOpen: boolean

Actions:
  - loadRecentChats()
  - loadWorkspaceList()
  - loadWalletBalance()
  - createGlobalChat()
  - selectGlobalChat(id)
  - navigateToWorkspace(id)
```

## Validation Method
- Route map is unambiguous (3 routes: /, /workspace/[id], /api/*)
- Component tree is complete (every sidebar element defined)
- Shell boundary rules distinguish Home owns vs Workspace owns
- NexusOps preservation rule is explicit
- State slice design covers all data needed by Home Shell

## Forbidden Areas
- Do not modify page.tsx or layout.tsx
- Do not delete NexusOps
- Do not modify NexusOps internals (that's S-10)
- Do not create new component files
- Do not modify nexus-store.ts
- Do not write /api/global-chats route (designed in S-6)

## Dependency Order
After S-1 and S-6. Before S-10 (Navigation Simplification).

## Rollback / No-Op Validation
Only a design document produced. No routes changed. No components created. No state changed.
