# S-8 Addendum: Route Hydration, Preview Controller, API Boundary, Rollback Default

**Date:** 2026-06-20
**Slice:** S-8 Addendum
**Appends to:** S-8 Execution Report (Home Shell Entry Route Design)
**Status:** Implementation safety clarifications. No code changes.

---

## 1. Route Hydration: Do Not Break Existing Workspace Loading

### Issue

S-8 proposes moving NexusOps to `/workspace/[id]`. NexusOps currently loads at `/` and may depend on workspace context being available immediately. The hydration path — how workspace state is loaded on first render — must be preserved.

### Clarification

**The existing workspace hydration path must be audited before `/workspace/[id]` is implemented.** Specifically:

1. **How does NexusOps get its workspace ID today?** Does it read from URL params, from store state, from a default workspace, or from a session ensure call?
2. **`NexusWorkspace` hydration:** The store likely calls `ensureWorkspaceSession` or loads workspace state on mount. If this is triggered by the `/` route mounting, it must be adapted to receive `workspaceId` from the route param at `/workspace/[id]`.
3. **No double-load:** When user navigates `/workspace/[id1]` → `/workspace/[id2]`, the workspace must rehydrate with the new ID without reloading the entire page.
4. **Direct link support:** `/workspace/[id]` must work as a direct URL (bookmark, shared link). The page must load workspace state from the server or from cache without requiring prior navigation through Home.

### Hydration Contract

```
WHEN /workspace/[id] mounts:
  1. Read workspaceId from route params
  2. Validate user is workspace member (server-side or client-side)
  3. Load workspace state:
     a. From localStore cache (if available + checksum match)
     b. From cloud snapshot (if no cache or checksum mismatch)
  4. Hydrate NexusOps with loaded state
  5. Render workspace UI

WHEN workspaceId changes (navigation to different workspace):
  Repeat steps 1-5 for new workspaceId.
  Do NOT full page reload — client-side navigation only.
```

---

## 2. Preview Controller Preservation

### Issue

`page.tsx` currently renders `<NexusProductionPreviewController enabled={productionPreviewFirstCutEnabled} />` alongside `<NexusOps />`. This preview controller reads `?nexusPreviewFirstCut=1` from search params. It must be preserved in the new route architecture.

### Clarification

**`NexusProductionPreviewController` is a production debugging/sandbox tool.** It must remain functional after the route split.

### Preservation Plan

| Route | Preview Controller | Search Param |
|-------|-------------------|-------------|
| `/` (Home Shell) | **Include** — may have Home-specific preview features in future | `?nexusPreviewFirstCut=1` (inherited) |
| `/workspace/[id]` (NexusOps) | **Include** — existing preview behavior preserved | `?nexusPreviewFirstCut=1` (inherited) |

Both routes render `<NexusProductionPreviewController />` with the same search param logic. The controller is a cross-cutting concern, not tied to any specific shell.

### Current Code to Preserve

```typescript
// From page.tsx — this pattern must be replicated in BOTH / and /workspace/[id]
const productionPreviewFirstCutEnabled =
  getFirstSearchParamValue(params.nexusPreviewFirstCut) === "1";

<NexusProductionPreviewController enabled={productionPreviewFirstCutEnabled} />
```

---

## 3. Home Sidebar API Dependency Boundary

### Issue

S-8's sidebar depends on three API endpoints (`/api/global-chats`, `/api/workspaces`, `/api/wallet/balance`). If any of these fail, the sidebar must degrade gracefully — not block the entire Home Shell.

### Clarification

**The Home Shell must render even if sidebar data APIs fail.** The sidebar is an enhancement, not a requirement for the main chat area to function.

### Degradation Contract

| API Failure | Sidebar Behavior | Main Chat Behavior |
|------------|-----------------|-------------------|
| `GET /api/global-chats` fails | Recent chats section: "Unable to load recent chats. [Retry]" | Unaffected — new chat still works |
| `GET /api/workspaces` fails | Workspace list: "Unable to load workspaces. [Retry]" | Unaffected |
| `GET /api/wallet/balance` fails | Wallet indicator: "--" or hidden | Unaffected — gate check still works server-side |
| All three fail | Sidebar renders with error states. New Chat button still functional. | Fully functional — user can start new chat |
| Auth session missing | Redirect to login | N/A |

### Loading States

| State | Sidebar Display |
|-------|----------------|
| **Initial load** | Skeleton placeholders for each section |
| **Data loaded** | Populated lists |
| **Error** | Section-specific error with retry button |
| **Empty** | "No recent chats" / "No workspaces" with create CTA |
| **Refreshing** (polling wallet) | Subtle indicator on balance, no layout shift |

### API Boundary Rule

```
The Home Shell MUST NOT:
  - Block rendering while waiting for sidebar data
  - Show a full-page error if sidebar APIs fail
  - Require workspace data to start a new main chat
  - Require wallet balance for the gate to function (gate is server-side)

The Home Shell MUST:
  - Render the main chat area immediately (empty state)
  - Show per-section error states in the sidebar
  - Allow retry of failed sidebar data fetches
  - Cache sidebar data in client state to avoid refetch on every navigation
```

---

## 4. Home Shell Rollback Default-Safe

### Issue

S-8 §6.3 proposes a feature flag strategy. The default flag state must be safe — if the flag system is unavailable, the system must fall back to the current workspace-first behavior.

### Clarification

**If the feature flag cannot be read, the system MUST default to the current workspace-first behavior (`/` → `NexusOps`).** Home Shell is opt-in, not opt-out.

### Default-Safe Logic

```
FUNCTION resolveRoute():
  TRY:
    flag = readFeatureFlag("home_shell")
  CATCH:
    flag = false  // DEFAULT: flag unavailable → workspace-first

  IF flag == true AND user is in rollout percentage:
    / → Home Shell
  ELSE:
    / → NexusOps (current behavior, unchanged)

  /workspace/[id] → 404 IF flag == false
                  → NexusOps IF flag == true
```

### Why This Matters

1. **New deployment with no feature flag row:** Must not break existing users. Default false → existing behavior preserved.
2. **Feature flag table unavailable (DB down):** Must not break routing. Default false → existing behavior.
3. **Flag parsing error (malformed JSON):** Must not break routing. Default false.
4. **Rollback:** Set flag to false → instant restoration of `/` → NexusOps. No code deploy needed.

### Feature Flag Row (Default)

```
INSERT INTO feature_flags (flag_key, scope_key, enabled, rollout_percentage)
VALUES ('home_shell', '__global__', false, 0);
-- Default: OFF. No user sees Home Shell.
-- To enable: UPDATE feature_flags SET enabled = true, rollout_percentage = 100;
-- To rollback: UPDATE feature_flags SET enabled = false;
```

---

## 5. Route-Level Error Boundary

### Issue

If the Home Shell component throws an unhandled error, the entire `/` route becomes a white screen. This is worse than the current stable NexusOps.

### Clarification

**The Home Shell route must have an error boundary that falls back to NexusOps on unhandled errors.**

```
// DESIGN ONLY
export default function HomePage() {
  const flag = useFeatureFlag("home_shell");
  
  if (!flag) {
    return <NexusOps />;  // Fallback: current behavior
  }
  
  return (
    <ErrorBoundary fallback={<NexusOps />}>
      <NexusHome />
    </ErrorBoundary>
  );
}
```

If `NexusHome` throws, `NexusOps` renders instead. The user sees the familiar workspace interface, not a crash screen. Console logs the error for debugging.

---

## Impact on S-8

- S-8 §5: Add NexusOps hydration audit requirement before implementation
- S-8 §2: Add `NexusProductionPreviewController` to both `/` and `/workspace/[id]` component trees
- S-8 §3: Add API degradation contract and loading states
- S-8 §6.3: Strengthen feature flag default-safe logic with explicit `false` fallback
- S-8: Add route-level error boundary requirement

---

## No Implementation Performed

Safety clarifications only. No code written. No Git changes. No Supabase changes.
