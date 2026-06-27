# NEXUS Window OS

## Architecture Purpose

NEXUS is evolving from a single-page workspace into an **AI Window OS** — a desktop-like environment where every feature (chat, notes, forum, marketplace, workspace) is a window app that can be opened, closed, minimized, maximized, moved, resized, and saved independently.

## Phase History

### Phase 1 — Foundation
- Window Kernel (open/close/focus/min/max/move/resize)
- App Registry (register/get/list)
- WindowFrame (shared chrome), WindowManager, NexusDesktopShell
- GlobalChatWindow, GlobalUserWindow, NotesDemoWindow, ForumDemoWindow

### Phase 1.5 — Hardening
- localStorage persistence, singleton/allowMultiple, ErrorBoundary
- Icons in app definitions, centralized `default-window-apps.ts`

### Phase 2 — Production Readiness
- Auth Gate on `/desktop`, Global Chat conversation list/switching/history
- Workspace Window (link-out), Feature API clients, Mobile hardening

### Phase 2.5 — Desktop Hardening & Anti-God-File Refactor
- GlobalChatWindow: 229L orchestrator + 4 sub-components
- GlobalUserWindow: 138L orchestrator + 5 panels
- Window Layout Utilities, Command Registry (Cmd+K), Notification Center

### Phase 3A — Global Chat Attachments + Artifact Bridge
- Attachment picker/preview in GlobalChatComposer
- Message attachments in conversation view
- Feature-level attachments module (api, preview card)
- Resource Ref kernel (type-safe cross-app resource linking)
- ArtifactPreviewWindow (image preview, metadata, download)
- Reuses existing composer-attachments infra + /api/attachments
- Zero DB migration

### Phase 3A.5 — Artifact Bridge Hardening
- Notification center integration (upload success/fail, file too large, unsupported type)
- Attachment lifecycle: queued → uploading → ready | failed, with File ref tracking
- Retry failed uploads (reuses stored File reference)
- Signed URL auto-refresh on image load error (canonical identity = attachment ID)
- ArtifactPreviewWindow: full loading/error/retry/expired URL states
- Resource actions: never crashes, all failures → notification center
- Unknown resource types get fallback preview window

### Phase 3B — Artifact Library Window MVP
- `GET /api/attachments` list route (query, mimeType, scope, cursor pagination)
- ArtifactLibraryWindow: grid browse, search, type filter (all/images/documents/other)
- Thumbnail grid with lazy signed URL loading per image item
- Click item → openResource() → ArtifactPreviewWindow
- Cmd+K ⌘4 → open library, Global User Shortcuts panel entry
- Singleton window (one library at a time)

### Phase 3C — Notes Window MVP
- Notes feature folder with localStorage-first persistence
- NotesWindow: create, edit title/content, auto-save on blur, delete
- Sidebar note list + editor + linked resource panel
- Resource Ref integration: linked resources open via openResource()
- Cmd+K ⌘5 → open Notes, Global User Shortcuts panel entry
- Singleton window, zero DB migration

### Phase 3D — Knowledge Capture Bridge
- Current note store (Zustand bridge) for cross-app note operations
- Chat → Note: Save as Note / Append to Current Note per message
- Artifact Library → Note: Add to Current Note on each item card
- Artifact Preview → Note: Add to Note button in metadata bar
- Notes Toolbar: Open Artifact Library button
- Resource dedup: same type+id won't be added twice
- NotesWindow: 245L → 149L (split NotesToolbar, bridge integration)
- All cross-app operations go through notes bridge, never direct API access

### Phase 4A — Forum Window MVP
- localStorage-first forum: threads, replies, attachments
- Thread list sidebar + thread detail view + reply composer
- Attachments via shared GlobalChatAttachmentPicker/PreviewList
- ForumPostActions: Save as Note / Append to Current Note via bridge
- Attachment clicks → openResource() → ArtifactPreviewWindow
- Cmd+K ⌘6 → open Forum, Global User Shortcuts panel entry
- ForumWindow 152L, zero DB migration

### Phase 4B — Data Migration Readiness & Backend Contract Plan
- Comprehensive data contracts document: `docs/window-os-data-contracts.md`
- Notes/Forum Supabase table designs (user_notes, note_resources, forum_threads, forum_replies, forum_post_resources)
- Marketplace future table designs (marketplace_tasks, marketplace_offers)
- API route contracts for Notes, Forum, Marketplace
- RLS/ownership model design (account-first + workspace-scoped)
- LocalStorage → Supabase migration path (additive, non-destructive)
- Repository interface types: NotesRepository, ForumRepository
- Backend contract types: notes-backend-types.ts, forum-backend-types.ts
- Zero destructive migrations executed

### Phase 4C — Capability Registry & Product Archetype Map
- Capability types: 24 reusable product capabilities (chat, feed, thread, etc.)
- Capability registry: register, list, query by maturity/app/provider
- Default capabilities: all capabilities defined with maturity (stable/mvp/planned)
- Product archetypes: 9 archetypes (chat-app, community-app, marketplace-app, etc.)
- Window apps annotated with capabilities + archetype fields
- Gap analysis: which capabilities are missing for Instagram-like, Canva-like, etc.
- `docs/window-os-capabilities.md` — full capability documentation
- Zero new UI. Metadata/architecture layer only.

### Phase 4D — Developer Inspector / Capability Dashboard
- DeveloperInspectorWindow: 3-tab internal tool (Apps, Capabilities, Archetypes)
- Apps tab: all registered apps with capabilities, archetype, lifecycle, validation
- Capabilities tab: all 24 capabilities with maturity, owner, used-by apps
- Archetypes tab: 9 archetypes with readiness analysis and gap detection
- `lifecycle` field on app definitions (active/demo/legacy/planned/internal)
- Demo apps annotated, dev inspector registered as internal tool
- Cmd+K palette entry + Global User dev shortcuts section
- DeveloperInspectorWindow: 78L orchestrator

### Phase 5A — Profile Primitive / Author Identity System
- Shared profile feature folder with `NexusProfile` and `NexusAuthorRef`
- ProfileAvatar, ProfileBadge, ProfileCard, ProfilePreviewWindow primitives
- `profile` Resource Ref support opens ProfilePreviewWindow through `openResource`
- Forum posts/replies can carry author refs and render ProfileBadge without profile storage access
- Global User and Cmd+K include Open My Profile entry points
- `profiles` capability is now MVP and provided by Global User, Profile Preview, and Forum
- `docs/window-os-data-contracts.md` includes future `user_profiles` contract only
- Zero DB migration; auth metadata/local fallback first

### Phase 5B — Feed & Interaction Primitive
- Shared `src/features/interactions/` primitives: interaction types, local-only reaction state, InteractionBar, SaveToNoteButton, ShareButton, comment count display
- Shared `src/features/feed/` primitive: local feed item API, FeedWindow, FeedComposer, FeedList, FeedItemCard
- Feed items use `NexusAuthorRef` / ProfileBadge for author display and Resource Ref for attachments/resources
- Feed note capture uses current-note-store bridge only: Save as Note / Append to Current Note
- Feed registered as a singleton window app with Cmd+K and Global User shortcuts
- Capability metadata updated so feed/composer/profiles/resource-preview/notes-capture can be inspected by Developer Inspector
- This is a primitive demo, not an Instagram clone, Reddit clone, Marketplace, follow graph, recommendation system, comments backend, or durable reactions backend
- Zero DB migration; feed and interaction state are local-only
## Kernel ↔ Feature Boundary

### Kernel (`src/kernel/`)
- `window/` — Window lifecycle, registry, layout, frame, manager, desktop shell
- `commands/` — Command types, registry, default commands
- `notifications/` — Notification types, store, center component
- `resource/` — Resource ref types, cross-app resource opening
- `capabilities/` — Capability types, registry, product archetype map

**Kernel knows NOTHING about**: chat, wallet, models, workspaces, notes, forum, marketplace.

### Features (`src/features/<feature>/`)
Each feature is self-contained with its own API client and panels.

## Adding a Window App

1. Create `src/features/my-app/MyAppWindow.tsx`
2. Create `src/features/my-app/index.ts`
3. Add to `src/kernel/window/default-window-apps.ts`
4. Add `"my-app"` to `NexusWindowKind` in `window-types.ts`
5. **Done.** No shell changes.

## Currently Registered Apps

| Kind | Title | Singleton | Status |
|------|-------|-----------|--------|
| `global-chat` | Global Chat | No | ✅ Full conversation management |
| `global-user` | My Account | Yes | ✅ Wallet, models, workspace launcher |
| `workspace` | Workspace | No | ✅ Link-out launcher |
| `notes-demo` | Notes | No | 🚧 Placeholder |
| `forum-demo` | Forum | No | 🚧 Placeholder |
| `artifact-preview` | Preview | No | ✅ Image preview, metadata, download |
| `artifact-library` | Artifacts | Yes | ✅ Grid browse, search, filter, open |
| `notes` | Notes | Yes | ✅ Create, edit, auto-save, resource linking |
| `feed` | Feed | Yes | ✅ Local feed primitive, ProfileBadge, InteractionBar, notes bridge |
| `forum` | Forum | Yes | ✅ Threads, replies, attachments, notes bridge |
| `developer-inspector` | Dev Inspector | Yes | ✅ 3-tab capability dashboard (internal) |
| `profile-preview` | Profiles | Yes | ✅ Shared profile preview primitive |

## Layout Utilities
- `snapWindowLeft/Right` — split-screen
- `cascadeWindows` — offset cascade
- `constrainToViewport` — keep windows in bounds
- `constrainAllToViewport` — auto-fix on resize

## Command System
- Cmd/Ctrl+K opens palette
- Default commands: open chat/user/workspace/feed/forum/notes/profile/dev inspector, cascade, maximize, snap, reset
- Extensible via `registerCommand()`

## Notification Center
- Local-only, no Supabase
- Types: info, warning, error, success
- Auto-dismiss support, floating toasts
- Taskbar integration planned for Phase 3

## Routes

| Route | Purpose | Status |
|-------|---------|--------|
| `/` | NEXUS Workspace (NexusOps) | Preserved unchanged |
| `/workspace/[id]` | Full workspace view | Preserved unchanged |
| `/desktop` | NEXUS Window OS Desktop | ✅ Phase 2.5 — functional |

## Resource Ref System

Cross-app resource linking via `kernel/resource/`:
- `NexusResourceRef` — uniform `{ type, id, label, meta }` for any resource
- Supported types: `attachment`, `artifact`, `global-conversation`, `workspace`, `note`, `forum-post`, `marketplace-listing`
- `openResource(ref)` — opens the appropriate window app for any resource
- Used by GlobalChatConversationView to open attachment previews

## Next Phase: Phase 3B

1. Workspace embedded in desktop window
2. Global Chat attachments (image/file upload)
3. Notes real implementation (Obsidian/Supabase)
4. Window snap presets UI (drag to edge)
5. Notification taskbar badge
6. Desktop right-click context menu
7. Theme/skin support for window chrome

## File Map

```
src/
├── kernel/
│   ├── window/
│   │   ├── window-types.ts
│   │   ├── window-store.ts
│   │   ├── window-registry.ts
│   │   ├── window-layout.ts
│   │   ├── default-window-apps.ts
│   │   ├── WindowFrame.tsx
│   │   ├── WindowManager.tsx
│   │   ├── NexusDesktopShell.tsx
│   │   └── index.ts
│   ├── commands/
│   │   ├── command-types.ts
│   │   ├── command-registry.ts
│   │   ├── default-commands.ts
│   │   └── index.ts
│   └── notifications/
│       ├── notification-types.ts
│       ├── notification-store.ts
│       ├── NotificationCenter.tsx
│       └── index.ts
├── features/
│   ├── global-chat/
│   │   ├── GlobalChatWindow.tsx (orchestrator, 229L)
│   │   ├── GlobalChatConversationList.tsx
│   │   ├── GlobalChatConversationView.tsx
│   │   ├── GlobalChatComposer.tsx
│   │   ├── GlobalChatStates.tsx
│   │   ├── global-chat-api.ts
│   │   └── index.ts
│   ├── global-user/
│   │   ├── GlobalUserWindow.tsx (orchestrator, 138L)
│   │   ├── AccountSummaryPanel.tsx
│   │   ├── WalletSummaryPanel.tsx
│   │   ├── ModelStatusPanel.tsx
│   │   ├── WorkspaceLauncherPanel.tsx
│   │   ├── SettingsPlaceholderPanel.tsx
│   │   ├── global-user-api.ts
│   │   └── index.ts
│   ├── workspace/
│   │   ├── WorkspaceWindow.tsx
│   │   ├── workspace-api.ts
│   │   └── index.ts
│   ├── notes-demo/
│   └── forum-demo/
└── app/
    └── desktop/
        └── page.tsx
```
