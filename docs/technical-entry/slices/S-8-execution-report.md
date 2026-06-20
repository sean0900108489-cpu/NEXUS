# S-8 Execution Report: Home Shell Entry Route Design

**Date:** 2026-06-20
**Slice:** S-8 — Home Shell Entry Route Design
**Status:** COMPLETE (design only)
**Predecessors:** S-6 (Global Conversations Domain), S-7 (Import Contract)
**Owner Locks:** Deferred D-5 (NexusOps → /workspace/[id]), D-6 (sidebar-heavy layout)
**Supabase Authority:** `xjuglddxwnikvcwxfbzg` (LOCKED)
**Method:** Read-only design. No code writes. No Git changes. No Supabase changes. No deploy.

---

## Purpose

Design the transition from workspace-first (`/` → `NexusOps`) to platform-first (`/` → Home Shell, `/workspace/[id]` → `NexusOps`). Define the Home Shell component tree, left sidebar contract, route map, NexusOps preservation rule, and routing rollback plan.

---

## 1. Platform-First Route Map

### 1.1 Current State (Confirmed in Code)

```
/ → page.tsx → NexusOps (workspace-first)
  No intermediate home/lobby surface.
  User lands directly in full workspace OS.
```

Source: `src/app/page.tsx` SHA `7a8fd2c` — renders `<NexusOps />` with `<NexusProductionPageShellBoundary shellId="workspace">`.

### 1.2 Target State (Design Only)

```
/ → Home Shell (platform-first)
  Account-level surface.
  Left sidebar + main chat area.
  
/workspace/[id] → NexusOps (workspace OS)
  Workspace-level surface.
  Existing functionality preserved.
  
/api/global-chats → Global conversation CRUD (S-6)
  New API routes for main chat.

/api/workspaces → Workspace list/management (may exist, extend if needed)
```

### 1.3 Route Transition

| Current | Target | Change |
|---------|--------|--------|
| `/` → `NexusOps` | `/` → `NexusHome` | New component at root |
| (none) | `/workspace/[id]` → `NexusOps` | NexusOps moved to new route |
| `/api/chat` | Unchanged | Workspace chat stays at existing route |
| (none) | `/api/global-chats`, `/api/global-chat` | New routes (S-6) |

---

## 2. Home Shell Component Tree

### 2.1 Top-Level Structure

```
NexusHome (NEW — replaces NexusOps at /)
  └─ NexusStyleRuntimeProvider (keep, existing)
     └─ NexusProductionPageShellBoundary shellId="home" (reuse pattern, new shellId)
        └─ NexusHomeLayout
           ├─ NexusHomeSidebar (left, fixed width ~280px)
           │   ├─ NexusHomeSidebarHeader
           │   │   ├─ NexusLogo / NEXUS branding
           │   │   └─ NewChatButton
           │   ├─ NexusHomeSidebarSearch
           │   │   └─ SearchInput (filters recent chats + workspaces)
           │   ├─ NexusWorkspaceListSection
           │   │   ├─ SectionLabel "Workspaces"
           │   │   ├─ WorkspaceListItem[] (name, member count, last active)
           │   │   └─ CreateWorkspaceButton
           │   ├─ NexusRecentChatsSection
           │   │   ├─ SectionLabel "Recent Chats"
           │   │   └─ RecentChatItem[] (title, date, model badge, import badge)
           │   └─ NexusHomeSidebarFooter
           │       ├─ WalletBalanceIndicator (credits remaining)
           │       ├─ UserAvatar + UserMenu (account, settings, logout)
           │       └─ ThemeToggle (if applicable)
           └─ NexusHomeMain (center, flexible)
              ├─ NexusTopBar (minimal, mobile-responsive)
              │   ├─ WalletBalanceIndicator (duplicate for mobile)
              │   └─ UserAvatar (duplicate for mobile)
              └─ NexusMainChatArea
                 ├─ EmptyState (when no conversation selected)
                 │   ├─ NEXUS branding / welcome message
                 │   ├─ Model selector
                 │   └─ Chat input (ready to start new conversation)
                 ├─ ChatMessageList (global_messages — S-6)
                 └─ ChatComposer
                    ├─ ModelSelector
                    ├─ MessageInput
                    └─ SendButton
```

### 2.2 Component Inventory

| Component | New/Existing | Responsibility |
|-----------|-------------|----------------|
| `NexusHome` | NEW | Root page component for `/` |
| `NexusHomeLayout` | NEW | Two-column layout (sidebar + main) |
| `NexusHomeSidebar` | NEW | Left sidebar container |
| `NexusHomeSidebarHeader` | NEW | Logo + new chat button |
| `NexusWorkspaceListSection` | NEW | Workspace list with create button |
| `NexusRecentChatsSection` | NEW | Recent global chats list |
| `NexusHomeSidebarFooter` | NEW | Wallet balance + user menu |
| `NexusHomeMain` | NEW | Main content area |
| `NexusMainChatArea` | NEW | Chat interface (reuses chat patterns) |
| `NexusTopBar` | NEW | Minimal top bar for mobile |
| `NexusStyleRuntimeProvider` | EXISTING | Keep — style engine |
| `NexusProductionPageShellBoundary` | EXISTING | Reuse with `shellId="home"` |
| `WalletBalanceIndicator` | NEW | Displays wallet credits (S-2/S-3 data) |
| `NexusOps` | EXISTING | PRESERVED — moved to `/workspace/[id]` |

---

## 3. Left Sidebar Contract

### 3.1 Sidebar Sections (Top to Bottom)

```
┌─────────────────────────┐
│ [NEXUS Logo]  [+ New Chat] │  ← Header (fixed)
├─────────────────────────┤
│ 🔍 Search...              │  ← Search (filters below)
├─────────────────────────┤
│ WORKSPACES            [+] │  ← Section label + create button
│ ───────────────────────── │
│ 📁 NEXUS // AI OPS 2      │  ← Workspace item (click → /workspace/[id])
│ 📁 投資理財                │
│ 📁 ...                     │
│                           │
│ RECENT CHATS              │  ← Section label
│ ───────────────────────── │
│ 💬 Project architecture..  │  ← Active chat (click → load in main area)
│    gpt-4o · 2h ago         │
│ 💬 Wallet system design    │  ← Active chat
│    deepseek-chat · 5h ago  │
│ 💬 Debugging sync issue 📋  │  ← Imported chat (badge)
│    gpt-4o · 1d ago         │
│                           │
│         ...scroll...       │
├─────────────────────────┤
│ 💰 42,850 credits         │  ← Wallet balance (fixed footer)
│ 👤 Sean                   │  ← User menu (fixed footer)
└─────────────────────────┘
```

### 3.2 Sidebar Data Sources

| Section | Data Source | API Endpoint |
|---------|------------|-------------|
| Workspace List | `workspaces` + `workspace_memberships` | `GET /api/workspaces` (existing or new) |
| Recent Chats | `global_conversations` (S-6) | `GET /api/global-chats` (S-6) |
| Wallet Balance | `wallet_balances` (derived — S-2/S-5) | `GET /api/wallet/balance` (future) |
| User Info | Supabase Auth `auth.users` | Client-side session |

### 3.3 Sidebar Behaviors

| Behavior | Description |
|----------|-------------|
| **New Chat click** | Clears main chat area, shows EmptyState with composer. Does NOT create conversation until first message sent. |
| **Workspace click** | Navigates to `/workspace/[id]`. Current main chat state is preserved in Home Shell (browser back returns to it). |
| **Recent chat click** | Loads conversation into main chat area. Fetches messages via `GET /api/global-chats/{id}`. |
| **Search** | Client-side filter of workspace names + chat titles. No server round-trip for search. Debounced input. |
| **Wallet balance** | Polled periodically (e.g., every 30s) or updated via WebSocket/SSE. Shows formatted credits. Click → future wallet management page. |
| **Create Workspace** | Opens inline creation form or modal. Creates workspace → adds to list → navigates to new workspace. |

---

## 4. Main Chat Area Contract

### 4.1 States

| State | When | Display |
|-------|------|---------|
| **Empty** | No conversation selected, or "New Chat" clicked | Welcome message, model selector, chat input ready |
| **Loading** | Fetching conversation messages | Skeleton/spinner |
| **Active** | Conversation loaded, user can chat | Message list + composer |
| **Streaming** | Assistant is responding | Messages + streaming indicator + STOP button |

### 4.2 Chat Composer

```
┌──────────────────────────────────────────┐
│ [Model: gpt-4o ▼]                        │  ← Model selector
│                                           │
│ Type a message...                         │  ← Input field (expandable)
│                                           │
│                              [Reasoning]  │  ← Feature toggles
│                              [Send →]     │  ← Send button
└──────────────────────────────────────────┘
```

The composer reuses existing workspace chat patterns where possible (model selector, reasoning toggle, send). The difference is the API target: `POST /api/global-chat` instead of `POST /api/chat`.

---

## 5. NexusOps Preservation Rule

### 5.1 What Happens to NexusOps

```
NexusOps IS NOT DELETED. It is RE-ROUTED.

CURRENT:  / → page.tsx → <NexusOps />
TARGET:   /workspace/[id] → workspace/[id]/page.tsx → <NexusOps workspaceId={id} />

CHANGES TO NexusOps (Phase 1):
  ✅ Wrap in workspace route with workspaceId param
  ✅ Add "← Back to Home" navigation element
  ✅ Remove workspace switcher (moved to Home sidebar)
  ❌ DO NOT modify panel system, graph editor, workflow engine
  ❌ DO NOT modify agent runtime, chat panels, artifact management
  ❌ DO NOT delete any NexusOps code
```

### 5.2 NexusOps Wrapper

```
// DESIGN ONLY — /workspace/[id]/page.tsx
// Not to be written to code

export default async function WorkspacePage({ params }: { params: { id: string } }) {
  // Validate workspace exists and user is member
  // If not: redirect to / with error
  
  return (
    <NexusStyleRuntimeProvider>
      <NexusProductionPageShellBoundary shellId="workspace">
        <NexusOps workspaceId={params.id} />
      </NexusProductionPageShellBoundary>
    </NexusStyleRuntimeProvider>
  );
}
```

### 5.3 Navigation Changes Inside NexusOps

| Element | Current (in NexusOps) | Target |
|---------|----------------------|--------|
| Workspace switcher | Inside NexusOps | **REMOVED** — now in Home sidebar |
| Global navigation | May exist (Cmd+K palette) | **REMOVED** — scoped to workspace actions |
| Account actions | May exist | **REMOVED** — in Home sidebar footer |
| "Back to Home" | Does not exist | **ADDED** — top-left navigation |
| Workspace name | May exist | **KEPT** — breadcrumb display |
| Panel management | Exists | **KEPT** — unchanged |
| Command palette | Exists | **SCOPED** — workspace actions only |

---

## 6. Routing Rollback Plan

### 6.1 Rollback Strategy

Home Shell is a NEW route at `/`. NexusOps moves to `/workspace/[id]`. Both are additive — the existing `/` behavior is replaced, not deleted. Rollback restores the original route.

### 6.2 Rollback Paths

| Scenario | Rollback Action | Impact |
|----------|----------------|--------|
| **Home Shell broken** | Revert `/` → `NexusOps` (restore original page.tsx). Remove `/workspace/[id]` route. | Workspace users lose Home Shell, regain direct NexusOps. Recent chats inaccessible (no S-6 API). |
| **Workspace route broken** | Keep `/` → Home Shell. Fix `/workspace/[id]` route. | Home Shell works, workspace inaccessible temporarily. |
| **Full rollback** | Git revert to pre-Home-Shell commit. Redeploy. | All S-8 changes reverted. S-6/S-7 designs remain but unused. |

### 6.3 Feature Flag Strategy

```
Home Shell deployment:
  Phase 1: Feature flag "home_shell" = off (default)
           / → NexusOps (unchanged)
           /workspace/[id] → 404 (not deployed)
  
  Phase 2: Feature flag "home_shell" = on for dev/owner
           / → Home Shell (owner only)
           /workspace/[id] → NexusOps (owner only)
  
  Phase 3: Feature flag "home_shell" = on for all
           / → Home Shell (all users)
           /workspace/[id] → NexusOps (all users)
  
  Rollback: Set flag "home_shell" = off
            Instant rollback without redeploy.
```

Feature flag key: `home_shell` in `feature_flags` table (scope: `__global__` or per-user).

---

## 7. Data Flow for Home Shell

### 7.1 Page Load Sequence

```
1. User navigates to /
2. Home Shell renders
3. Parallel data fetches:
   a. GET /api/global-chats?limit=20        → recent chats
   b. GET /api/workspaces                    → workspace list
   c. GET /api/wallet/balance                → wallet credits
   d. Supabase session (client-side, cached) → user info
4. Sidebar populated with results
5. Main area shows EmptyState (ready for new chat)
```

### 7.2 State Management (Design)

```
Home Shell state (adds to nexus-store — design only):
  globalChats: GlobalChatSummary[]       // recent chats
  workspaceList: WorkspaceSummary[]      // workspace list
  activeGlobalChatId: string | null      // currently viewed chat
  walletBalance: number                  // credit balance (polled)
  sidebarOpen: boolean                   // mobile toggle
  searchQuery: string                    // sidebar filter

Actions:
  loadRecentChats()       → GET /api/global-chats
  loadWorkspaceList()     → GET /api/workspaces
  loadWalletBalance()     → GET /api/wallet/balance
  startNewChat()          → clear active, show EmptyState
  selectChat(id)          → GET /api/global-chats/{id}
  navigateToWorkspace(id) → router.push(`/workspace/${id}`)
  sendMessage(content)    → POST /api/global-chat
```

---

## 8. Mobile Responsiveness

### 8.1 Mobile Layout

```
Mobile (< 768px):
  ┌──────────────────────────┐
  │ ☰  NEXUS         💰 42.8K│  ← Top bar (sidebar toggle + wallet)
  ├──────────────────────────┤
  │                          │
  │  Main Chat Area          │  ← Full width
  │                          │
  │                          │
  ├──────────────────────────┤
  │ [Model: gpt-4o ▼]       │  ← Composer
  │ Type a message...  [→]   │
  └──────────────────────────┘
  
  Sidebar: Off-screen. Slides in from left on ☰ tap.
           Overlays main content with backdrop.
```

### 8.2 Mobile Considerations

- Sidebar is hidden by default on mobile
- Workspace navigation: tapping a workspace opens it full-screen (replaces Home Shell)
- "Back to Home" from workspace returns to Home Shell
- Wallet balance always visible in top bar
- New chat button in top bar (not sidebar) on mobile

---

## 9. Blocked Assumptions

| # | Assumption | Severity | Resolution |
|---|-----------|----------|-----------|
| H1 | `NexusOps` can accept `workspaceId` as a prop | LOW | Existing component may already have workspace context |
| H2 | `NexusOps` has no hardcoded root-route assumptions | MEDIUM | Code inspection needed before implementation: does NexusOps assume it's at `/`? |
| H3 | `/api/workspaces` exists or can be created for workspace list | LOW | Workspace CRUD likely exists; may need a list endpoint |
| H4 | `GET /api/wallet/balance` can be designed | LOW | New endpoint, follows S-2/S-5 design |
| H5 | Feature flag system works for route-level gating | LOW | `feature_flags` table exists in database.types.ts |
| H6 | Next.js dynamic route `/workspace/[id]` is supported | LOW | Standard Next.js App Router pattern |
| H7 | `nexus-store.ts` can accommodate Home Shell state slices | MEDIUM | Current store is 144KB — adding slices is feasible but needs care |
| H8 | Mobile layout is Phase 1 scope | DESIGN CHOICE | Basic responsive layout included. Full mobile optimization deferred. |

---

## 10. Excluded from S-8 Scope

| Item | Reason |
|------|--------|
| Home Shell component implementation | No code writes |
| `/workspace/[id]` route implementation | No code writes |
| Sidebar component implementation | No code writes |
| Main chat component implementation | S-6 defines data; S-8 defines layout |
| Wallet balance polling/SSE implementation | Implementation detail |
| Workspace creation modal | Implementation detail |
| Feature flag deployment | Implementation detail |
| NexusOps modification (back button, scope reduction) | S-10 concern |
| Workspace OS navigation simplification | S-10 concern |
| Mobile-optimized components | Phase 2 |

---

## 11. S-9 Readiness

| Prerequisite | Status |
|-------------|--------|
| Platform-first route map defined | ✅ |
| Home Shell component tree designed (14 components) | ✅ |
| Left sidebar contract complete (6 sections, behaviors) | ✅ |
| Main chat area contract defined (4 states) | ✅ |
| NexusOps preservation rule explicit | ✅ |
| Routing rollback plan defined (3 scenarios + feature flag) | ✅ |
| Data flow sequence defined | ✅ |
| Mobile responsiveness sketched | ✅ |
| 8 blocked assumptions cataloged | ✅ |

**S-8 is COMPLETE. S-9 (NOVA Workspace-Scoped P0 Fix) is READY (not yet authorized).**

---

## No Implementation Performed

Design only. No code written. No routes created. No components implemented. No Git changes. No Supabase changes. No deploy. Supabase authority: `xjuglddxwnikvcwxfbzg` (LOCKED).
