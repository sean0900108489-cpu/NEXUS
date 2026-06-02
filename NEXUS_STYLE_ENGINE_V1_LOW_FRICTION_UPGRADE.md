# NEXUS Style Engine V1 Low-Friction Upgrade Blueprint

Generated: 2026-05-29 AEST
Workspace: `/Users/sean/Documents/FreeChat`
Status: documentation-only scan. No production code changed.

## 0. Executive Verdict

The V1 direction is correct.

The current NEXUS UI is not locked into a fixed skin. It already has a viable style-system embryo:

- `src/app/globals.css` defines CSS variables, four `data-theme` presets, global style hooks, React Flow overrides, and a Tailwind v4 `@theme inline` bridge.
- `src/components/theme-provider.tsx` uses `next-themes` with `attribute="data-theme"`.
- `src/components/nexus/nexus-ops.tsx` already has a small "LEGO Theme Engine" with runtime DOM variable mutation.
- `tailwind.config.ts` maps many Tailwind semantic slots to CSS variables.
- `WorkspaceThemeConfig` already exists in the cross-layer type model.

The important correction is this:

V1 must not jump straight to compiler, provider, primitives, persistence, or marketplace. The lowest-friction V1 for the current repo is a contract-and-safety version that turns the existing style embryo into a controlled migration path.

The current risk is not "CSS cannot change." The current risk is that style state is already mixed with functional workspace state and cloud sync:

```txt
LEGO controls
-> document.documentElement.style
-> Zustand workspace.themeConfig
-> IndexedDB/localStorage persistence
-> serializeActiveUiStateSnapshot
-> /api/v1/workspaces/[workspaceId]/state
-> Supabase workspace_snapshots
-> workspace_state_entities entity_type='theme'
```

So the V1 upgrade must make a hard distinction between:

- applied workspace style preference
- transient preview style
- generated style pack
- functional workspace state
- backend sync state

That is the hinge of the whole upgrade.

## 1. Scan Baseline

### Repo Baseline

```txt
branch: v16-a-sync-recovery-preview
last commit: b3561cf feat: add V16-A notebook sync recovery preview
package: npm / package-lock.json
framework: Next.js 16.2.6 App Router
react: 19.2.6
tailwind: 4.x via @tailwindcss/postcss
supabase client: @supabase/supabase-js 2.106.1
graph: @xyflow/react 12.10.2
windowing: react-rnd 10.5.3
state: zustand 5.0.13 + zundo + IndexedDB idb-keyval
```

### Dirty Worktree Warning

The repo currently has many uncommitted V16 files and untracked migration/API files. This confirms the original V1 instinct: do not run broad style surgery on this branch.

V1 should remain document/spec-only until the current V16 sync/recovery work is either committed, branched, or explicitly checkpointed.

### Verification

`npm run typecheck` completed successfully during this scan.

## 2. Files Inspected

Primary style and UI files:

- `src/app/globals.css`
- `tailwind.config.ts`
- `src/components/theme-provider.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-graph.tsx`
- `src/components/nexus/DatapadWindow.tsx`
- `src/components/nexus/PromptVaultManager.tsx`
- `src/components/nexus/AgentBranchModal.tsx`
- `src/components/nexus/auth-screen.tsx`

State, sync, and backend boundary files:

- `src/lib/nexus-types.ts`
- `src/store/nexus-store.ts`
- `src/lib/workspace-kernel.ts`
- `src/lib/state-sync.ts`
- `src/lib/backend/workspace/workspace-snapshot-serializer.ts`
- `src/lib/backend/workspace/workspace-state-entity-repository.ts`
- `src/app/api/v1/workspaces/[workspaceId]/state/route.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/admin.ts`
- `supabase/migrations/20260527002000_workspace_cloud_state.sql`

Reference documents scanned:

- `/Users/sean/Downloads/# NEXUS Style Engine V1.md`
- `NEXUS_CURRENT_STATE_MODEL_CONTEXT.md`
- `NEXUS_V16_SUPABASE_DEEP_READINESS_REPORT.md`
- `NEXUS_ARCHITECTURE_BLUEPRINT.md`
- `ARCHITECTURE.md`

Next.js local docs read, per `AGENTS.md`:

- `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`

Supabase guidance checked:

- Supabase changelog, including 2026 Data API exposure changes.
- Supabase docs for Next.js usage, SSR/Auth warnings, RLS, and API keys.

## 3. Current Architecture Reality

### Frontend Shell

The app enters through:

```txt
src/app/layout.tsx
-> ThemeProvider
-> src/app/page.tsx
-> NexusOps
```

`layout.tsx` imports:

- `@xyflow/react/dist/style.css`
- `src/app/globals.css`
- Geist fonts
- `ThemeProvider`

This is a good place for global style foundation, but not yet for a new Style Engine provider. A provider should be added only after the contract is stable because `NexusOps` is already a large client component and imports most operational logic.

### Theme Foundation

`src/components/theme-provider.tsx` defines:

```txt
themes = ["surface-shell", "apple", "tesla", "terminal"]
defaultTheme = "surface-shell"
attribute = "data-theme"
enableSystem = false
```

`src/components/nexus/nexus-ops.tsx` separately defines the same theme list through `themeOptions`.

V1 finding:

- theme preset naming is duplicated.
- a future Style Registry should make these names one source of truth.
- for V1, do not change this yet; document the duplication as a V2 contract input.

### CSS Variable Foundation

`globals.css` already has a strong token-like layer:

```txt
--bg-base
--bg-elevated
--bg-workspace
--panel-bg
--panel-muted
--border-subtle
--border-glow
--text-main
--text-soft
--text-muted
--theme-primary
--theme-primary-strong
--theme-secondary
--theme-success
--theme-warning
--theme-danger
--shadow-panel
--shadow-glow
--radius-base
--backdrop-blur
--border-width
--agent-glow-intensity
--icon-weight
--font-main
--chat-panel-opacity
--surface-radius
--glass-blur
--scanline-opacity
--workspace-grid-primary
--workspace-grid-secondary
--workspace-wash
--shell-surface
--asset-background-image
```

The Tailwind v4 `@theme inline` block bridges many legacy Tailwind color families to these variables. This is useful for low-friction migration because existing classes like `text-neutral-100`, `border-neutral-300`, and `bg-neutral-950` are partially redirected through CSS variables.

V1 finding:

- the app already has a "legacy class to token bridge."
- do not delete it.
- V1 should treat it as the Legacy Bridge V0.

### Current LEGO Theme Controls

`nexus-ops.tsx` contains:

```txt
LEGO_THEME_DEFAULTS
LEGO_THEME_VARIABLES
applyLegoThemeConfigToDom()
readLegoThemeConfigFromDom()
LegoThemeEngineControls
```

Current controlled dimensions:

```txt
radius
blur
borderWidth
glowIntensity
iconWeight
fontFamily
chatOpacity
```

Important details:

- `borderWidth` exists in the type and DOM variable map, but is pinned to default in normalization.
- `glowIntensity` exists in `WorkspaceThemeConfig` and UI defaults, but `sanitizeThemeConfig()` in `workspace-kernel.ts` currently does not preserve it.
- transient slider updates mutate `document.documentElement.style` immediately.
- commit calls `updateThemeConfig()`, which persists to active workspace and queues cloud sync.

V1 implication:

`WorkspaceThemeConfig` is not only visual preference. It is already part of durable active UI snapshot. This is acceptable for applied settings, but unsafe for temporary preview, AI-generated experiments, or style-lab exploration.

## 4. Data Flow Map

### Current Theme Data Flow

```txt
RightFloatingDock -> theme panel
-> LegoThemeEngineControls
-> updateTransientThemeConfig()
-> document.documentElement.style.setProperty(...)
-> commitThemeConfig()
-> onUpdateThemeConfig()
-> useNexusStore.updateThemeConfig()
-> workspace.themeConfig
-> queueThemeConfigCloudSync()
-> queueWorkspaceCloudSync()
-> supabaseStateSyncManager.syncActiveUiState()
-> serializeActiveUiStateSnapshot()
-> /api/v1/workspaces/[workspaceId]/state
-> WorkspaceStateService
-> workspace_snapshots
-> workspace_state_entities(theme)
```

### Current Applied Theme Preset Flow

```txt
RightFloatingDock -> theme buttons
-> handleThemeChange()
-> next-themes setTheme()
-> html/data-theme
-> globals.css preset variables
```

This flow is browser-local through `next-themes`. It is not the same as `workspace.themeConfig`.

### Current Supabase/Auth Flow

```txt
AuthScreen
-> ensureNexusSupabaseClientConfigured()
-> getNexusSupabaseClient()
-> supabase.auth.signInWithPassword / signUp
-> useNexusStore.login()
-> NexusOps onAuthStateChange/getSession
-> syncSupabaseSessionUser()
-> workspace recovery checks
```

Current client shape:

- browser client uses `@supabase/supabase-js`.
- env names are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- runtime fallback config is exposed through `/api/v1/public-config`.
- server admin client uses `SUPABASE_SERVICE_ROLE_KEY` only server-side.

V1 implication:

Do not introduce style persistence by direct frontend table writes. Any future style-pack persistence should go through existing `/api/v1` route handler patterns and the permission/idempotency layer.

### Current Workspace Snapshot Flow

```txt
Zustand active workspace
-> createActiveUiStateSnapshot()
-> serializeActiveUiStateSnapshot()
-> payload.workspace.themeConfig
-> checksum
-> local sync queue if needed
-> backend WorkspaceStateService
-> workspace_snapshots canonical payload
-> workspace_state_entities projection cache
```

V1 implication:

Preview state must not be added to `NexusWorkspace`, `ActiveUiStateSnapshot`, or `WorkspaceCloudSnapshotPayload`.

## 5. File Risk Map

| File | Role | V1 Risk | V1 Rule |
| --- | --- | --- | --- |
| `src/app/globals.css` | CSS variables, legacy bridge, React Flow overrides | High | Read-only in V1; future edits only additive and token-scoped. |
| `tailwind.config.ts` | Tailwind variable bridge | Medium | Read-only in V1; do not re-map colors yet. |
| `src/components/theme-provider.tsx` | `data-theme` preset provider | Medium | Read-only in V1; document registry duplication. |
| `src/app/layout.tsx` | global CSS/font/provider root | Medium | Read-only in V1; provider changes postponed. |
| `src/components/nexus/nexus-ops.tsx` | app shell, auth, theme controls, sync, windows, dock | Critical | Read-only in V1; no broad class replacement. |
| `src/components/nexus/nexus-graph.tsx` | React Flow graph, nodes, edges, adapters | Critical | Read-only in V1; future graph styling via adapter. |
| `src/components/nexus/DatapadWindow.tsx` | Rnd datapad window, draft/save/delete | High | Read-only in V1; protect drag/z-index/save. |
| `src/components/nexus/PromptVaultManager.tsx` | modal, prompt edit/delete/copy | High | Read-only in V1; protect modal and edit state. |
| `src/components/nexus/AgentBranchModal.tsx` | emergency modal, branching flow | High | Read-only in V1; protect `z-[9999]` and branch actions. |
| `src/components/nexus/auth-screen.tsx` | login/signup gate | High | Read-only in V1; protect form submit and auth calls. |
| `src/store/nexus-store.ts` | active state, local persistence, sync queue calls | Critical | Read-only in V1; no new preview state here. |
| `src/lib/workspace-kernel.ts` | import/export/sanitize/hydrate | Critical | Read-only in V1; note `glowIntensity` sanitizer drift. |
| `src/lib/state-sync.ts` | Supabase sync manager and queue bridge | Critical | Read-only in V1; no style preview sync. |
| `supabase/migrations/*` | durable DB schema and RLS | Critical | No schema changes in V1. |

## 6. Class Taxonomy

### Pure Visual Candidates

These can eventually move into style recipes or semantic utility classes:

```txt
text-neutral-100
text-neutral-100
text-neutral-400
text-neutral-100
text-neutral-100
bg-neutral-300/10
bg-black/35
bg-neutral-950/88
border-neutral-300/30
border-white/10
shadow-[...]
backdrop-blur-xl
font-mono
uppercase
tracking-[...]
```

### Visual But Layout-Sensitive

These look visual but affect perceived layout, density, or interaction hit areas:

```txt
p-*
px-*
py-*
gap-*
h-8
h-11
h-12
w-8
w-12
min-h-*
max-h-*
text-xs
text-[9px]
leading-*
line-clamp-*
truncate
break-words
rounded / border radius rules
```

V1 rule: do not token-replace these globally. They need per-component recipes.

### Layout Classes

Do not treat these as skin:

```txt
fixed
absolute
relative
inset-0
top-*
right-*
bottom-*
left-*
z-*
z-[...]
flex
grid
min-h-0
min-w-0
shrink-0
flex-1
overflow-hidden
overflow-y-auto
aspect-video
w-[min(...)]
h-[min(...)]
xl:block
md:grid-cols-*
```

### Behavior Classes / Attributes

Protected:

```txt
cursor-move
cursor-grab
cursor-grabbing
cursor-col-resize
select-none
pointer-events-none
pointer-events-auto
resize-none
disabled:*
aria-*
role="dialog"
aria-modal="true"
aria-live="polite"
data-active
nodrag
nopan
```

### Third-Party / Adapter Classes

React Flow and react-rnd classes must be adapter-managed:

```txt
react-flow
react-flow__pane
react-flow__handle
react-flow__edge-path
react-flow__edge
react-flow__controls
react-flow__controls-button
react-flow__minimap
react-flow__minimap-mask
nexus-flow-edge
nexus-flow-edge-selected
nexus-flow-edge-hit
nexus-edge-delete
nexus-agent-node
nexus-runtime-node
nexus-drag-handle
datapad-drag-handle
```

### State-Linked Classes

These encode runtime state and cannot become static style text:

```txt
selected && ...
active && ...
errored && ...
agent.status
workflow status
streamModeTone(...)
traceSeverityClass(...)
branchingStatus
busy / loading / disabled
workspace active/current checksum
theme active button aria-pressed
```

### Risky Ambiguous

These need manual review before migration:

```txt
bg-black/20
bg-white/[0.025]
border-white/10
shadow-2xl
backdrop-blur
font-mono
uppercase
tracking-[...]
border-0 / border-2
overflow-visible on agent windows
z-[120] / z-[9999]
scale-75 in theme controls
```

## 7. Protected Behavior Ledger

| Behavior | Current Location | Protected Detail | Future Test |
| --- | --- | --- | --- |
| App viewport lock | `layout.tsx`, `NexusOps` | `body min-h-full overflow-hidden`, `main h-dvh overflow-hidden` | Page must not body-scroll during window drag. |
| Workspace canvas | `NexusOps` | `relative z-0 isolate min-h-0 min-w-0 flex-1 overflow-hidden` | Agent windows and graph stay bounded. |
| Agent drag | `AgentWindow` | `react-rnd`, `bounds="parent"`, `dragHandleClassName="nexus-drag-handle"` | Drag only from handle, layout persists. |
| Agent resize | `AgentWindow` | `enableResizing`, `onResizeStop`, `minWidth`, `minHeight` | Resize updates geometry without snap breakage. |
| Agent z-index | `AgentWindow`, store | `style={{ zIndex: agent.layout.zIndex }}` | Focused window comes forward. |
| Sandbox lock | `AgentWindow`, `SandboxCanvas` | `windowInteractionLocked`, disable drag/resize | Embedded preview remains clickable when unlocked. |
| Datapad drag | `DatapadWindow` | `datapad-drag-handle`, `bounds="parent"` | Multiple datapads layer and drag safely. |
| Datapad save/delete | `DatapadWindow`, store | `updateNotebook`, `deleteNotebook`, draft cache | Visual migration must not alter save semantics. |
| Prompt modal | `PromptVaultManager` | fixed overlay `z-[120]`, edit/copy/delete flows | Modal opens, edits, closes, and scrolls. |
| Branch modal | `AgentBranchModal` | `z-[9999]`, `role="dialog"`, branch execution | Emergency modal stays topmost. |
| Auth submit | `auth-screen.tsx` | `onSubmit`, Supabase login/signup | Login/signup still works and shows messages. |
| Right sidebar | `AgentSettingsSidebar` | fixed top/bottom/right, `z-[120]`, `overflow-y-auto` | Sidebar overlays workspace without breaking modals. |
| Command palette | `CommandPalette` | global key handling and overlay | Escape closes palette and sidebar. |
| React Flow pan/zoom | `NexusGraph`, globals | React Flow pane, min/max zoom, `fitView` | Pan/zoom continues after graph skin changes. |
| Node drag | `NexusGraph` | `nodesDraggable`, `onNodeDragStop` | Agent/runtime node positions persist. |
| Edge select/delete | `BlueprintEdge` | hit path, selected ids, delete key handler | Click edge, delete edge, no accidental node drag. |
| Handles | `Handle` components | source/target ids and inline backgrounds | Connections remain possible. |
| Graph buttons | `WorkflowGraphAction` | `pointer-events-none` container + `pointer-events-auto` buttons | Buttons clickable over graph without blocking pan elsewhere. |
| Minimap/controls | `MiniMap`, `Controls`, globals | pannable/zoomable minimap, control selectors | Minimap visible and usable after theme changes. |

## 8. Existing Token Candidate Registry

V1 should formalize these semantic groups without immediately changing code.

### Surfaces

```txt
surface.app              -> --bg-base / --shell-surface
surface.workspace        -> --bg-workspace / --workspace-wash
surface.panel            -> --panel-bg
surface.panelMuted       -> --panel-muted
surface.overlay          -> modal/sidebar backdrops
surface.window           -> agent/datapad window surfaces
surface.input            -> input/textarea background
surface.graph            -> React Flow background and minimap
```

### Text

```txt
text.primary             -> --text-main
text.secondary           -> --text-soft
text.muted               -> --text-muted
text.inverse             -> future light/dark contrast pair
```

### Accent / Status

```txt
accent.primary           -> --theme-primary
accent.primaryStrong     -> --theme-primary-strong
accent.secondary         -> --theme-secondary
status.success           -> --theme-success
status.warning           -> --theme-warning
status.danger            -> --theme-danger
agent.accent             -> per-agent accent, not global style pack
```

### Shape / Material

```txt
radius.base              -> --radius-base
radius.surface           -> --surface-radius
blur.glass               -> --backdrop-blur / --glass-blur
border.subtle            -> --border-subtle
border.glow              -> --border-glow
border.width             -> --border-width
shadow.panel             -> --shadow-panel
shadow.glow              -> --shadow-glow
opacity.chatPanel        -> --chat-panel-opacity
```

### Graph

```txt
graph.backgroundColor
graph.gridColor
graph.gridGap
graph.edge.default
graph.edge.runtime
graph.edge.selected
graph.edge.hitWidth
graph.handle.default
graph.minimap.bg
graph.minimap.mask
graph.controls.bg
```

### Motion / Density

```txt
motion.duration.fast
motion.duration.normal
motion.easing.standard
density.compact
density.comfortable
density.spacious
component.controlHeight.sm/md/lg
component.windowChrome.height
```

## 9. V1 Style Contract Shape

V1 should define this as documentation first, then types later.

```ts
type NexusStyleManifestV1 = {
  schemaVersion: 1;
  id: string;
  name: string;
  description?: string;
  mode: "dark" | "light" | "adaptive";
  tokens: {
    color: Record<string, string>;
    surface: Record<string, string>;
    text: Record<string, string>;
    accent: Record<string, string>;
    status: Record<string, string>;
    radius: Record<string, string>;
    shadow: Record<string, string>;
    blur: Record<string, string>;
    border: Record<string, string>;
    typography: Record<string, string>;
    density: Record<string, string | number>;
    motion: Record<string, string | number>;
  };
  recipes: {
    appShell?: Record<string, string>;
    panel?: Record<string, string>;
    button?: Record<string, string>;
    input?: Record<string, string>;
    window?: Record<string, string>;
    modal?: Record<string, string>;
    dock?: Record<string, string>;
    graph?: Record<string, string>;
  };
  adapters: {
    tailwindBridge?: Record<string, string>;
    reactFlow?: Record<string, string | number>;
    nextThemes?: {
      dataTheme: string;
      colorScheme: "dark" | "light";
    };
  };
  constraints: {
    protectedClasses: string[];
    layoutClasses: string[];
    behaviorClasses: string[];
    maxCssVariableCount?: number;
  };
};
```

V1 rule:

The manifest is not persisted, imported, or executed in production during V1. It is a contract target for later compiler work.

## 10. Lowest-Friction V1 Plan

### V1.0 Current-State Audit

Keep the existing V1 request, but update it with the facts from this scan:

- `themeConfig` is currently durable active workspace state.
- `glowIntensity` has a sanitizer gap.
- React Flow has mixed CSS + TSX hardcoded colors.
- theme preset names are duplicated.
- `globals.css` is already a Legacy Bridge V0.

Deliverable:

- one audit document
- no TSX/CSS/schema changes

### V1.1 Style Contract Draft

Create a written contract only:

```txt
semantic token names
component recipe names
graph adapter token names
protected class ledger
preview/apply/persist distinction
```

Deliverable:

- contract document or section
- still no runtime code

### V1.2 Migration Unit Backlog

Rank future units:

Low-risk first:

```txt
NexusPanel visual recipe
NexusButton visual recipe
NexusInput visual recipe
status badge recipe
theme panel sample preview
```

Medium-risk:

```txt
RightFloatingDock item shell
TopBar menu visual shell
PromptVaultManager surface only
DatapadWindow visual surface only
```

High-risk later:

```txt
AgentWindow full chrome
SandboxCanvas
NexusGraph nodes/edges
React Flow minimap/controls
workspace shell layout
Zustand theme persistence
Supabase style persistence
```

Deliverable:

- backlog with rollback test for each unit

### V1.3 Preview State Rule

Define before implementation:

```txt
transient preview state lives only in component-local state or an isolated preview controller.
transient preview may patch DOM variables.
transient preview must be reverted or committed explicitly.
transient preview must not enter workspace.themeConfig.
transient preview must not enter IndexedDB persistence.
transient preview must not enter Supabase sync.
```

Deliverable:

- safety rule in docs
- tests planned but not implemented in V1 docs phase

### V1.4 Apply State Rule

Applied style preference may use existing `workspace.themeConfig` only for the small current fields:

```txt
radius
blur
borderWidth
glowIntensity
iconWeight
fontFamily
chatOpacity
```

But generated style packs should not be squeezed into this shape. They need a separate future model.

Deliverable:

- explicit split between `WorkspaceThemeConfig` and future `StyleManifest`

### V1.5 Backend/Supabase Rule

No schema changes in Style Engine V1.

When style persistence becomes necessary later:

- use additive migrations only.
- create or verify on a disposable Supabase branch first.
- keep RLS enabled on any public schema table.
- do not expose service role to the browser.
- use `/api/v1` route handlers and existing permission/idempotency services.
- prefer a separate style-pack table over bloating active workspace snapshots.
- if using Supabase Data API directly, remember new tables may not be automatically exposed after the 2026 Supabase Data API exposure change.

Candidate future table, not V1:

```txt
workspace_style_packs
- id uuid
- workspace_id text
- user_id uuid
- manifest jsonb
- manifest_checksum text
- schema_version int
- created_at timestamptz
- updated_at timestamptz
- deleted_at timestamptz null
```

V1 should only document this. Do not create it now.

## 11. Implementation Direction Assessment

### Correct

Your proposed direction is correct in these ways:

- Treating style as a system layer, not a theme switcher.
- Starting with scan/audit instead of class replacement.
- Separating visual, layout, behavior, state-linked, and third-party adapter classes.
- Treating React Flow as an adapter, not normal CSS.
- Moving toward semantic tokens instead of `neutral/neutral/neutral` class language.
- Running a style-lab or branch before destructive experimentation.
- Keeping legacy UI parallel until migration units prove themselves.

### Needs Adjustment

The V1 plan should be stricter in these ways:

- V1 should not create `StyleEngineProvider` yet.
- V1 should not create a compiler yet.
- V1 should not add Supabase persistence yet.
- V1 should not add style packs to workspace snapshots yet.
- V1 should not modify `nexus-ops.tsx` or `nexus-graph.tsx` yet.
- V1 should explicitly document that current `themeConfig` already syncs to cloud.
- V1 should mark `glowIntensity` sanitizer drift as a blocker for any durable theme guarantee.

### Product Direction

The product direction is real:

```txt
style document
-> controlled manifest
-> semantic token registry
-> component recipes
-> graph adapter
-> preview
-> apply
-> save/share/export
```

But the first living loop should be:

```txt
manifest draft
-> CSS variable map
-> isolated preview patch
-> baseline surface-shell pack
-> soft OS pack
-> visual verification
-> no sync pollution
```

That loop should happen after V1 docs/audit, not inside V1 itself.

## 12. Recommended Version Ladder

```txt
V1  - Current-state audit + contract blueprint + protected behavior ledger.
V2  - Style Contract Type + manifest schema as pure local TS types/tests.
V3  - Pure compiler: manifest -> CSS variable map, no DOM, no sync.
V4  - Isolated preview controller, local-only, no workspace persistence.
V5  - First primitives: Panel, Button, Input, Badge.
V6  - Legacy Bridge hardening: map old Tailwind families to semantic variables.
V7  - React Flow Adapter V1.
V8  - First migration unit behind a flag.
V9  - Two style packs: baseline surface-shell and soft OS.
V10 - Apply style preference safely to workspace.
V11 - Optional Supabase persistence for named style packs.
V12 - AI style brief -> manifest draft.
```

Do not start with marketplace, user trading, or full UI rewrite.

## 13. V1 Codex Request For Next Pass

Use this as the next execution prompt if you want a pure V1 audit report:

```txt
Perform NEXUS Style Engine V1 Current-State Audit.

Rules:
- read only
- no TSX edits
- no CSS edits
- no Tailwind edits
- no Zustand edits
- no workspace-kernel edits
- no state-sync edits
- no Supabase migrations
- no new runtime provider
- no compiler
- no primitive implementation

Scan and produce:
1. style source inventory
2. CSS variable inventory
3. hardcoded visual inventory
4. UI organ map
5. class taxonomy
6. protected behavior ledger
7. React Flow safety scan
8. workspace/theme/sync data flow map
9. Supabase/backend boundary map
10. first migration-unit backlog
11. V2 Style Contract inputs
12. open questions

Critical facts to preserve:
- current themeConfig is durable workspace state and syncs to cloud
- transient preview must not enter workspace.themeConfig
- glowIntensity exists in UI/type but is not preserved by sanitizeThemeConfig
- React Flow needs adapter-managed tokens
- globals.css is Legacy Bridge V0 and must not be deleted
- dirty worktree means no broad experiments on this branch

End with:
No production code changed.
No CSS changed.
No TSX changed.
No sync/workspace/backend changed.
V1 inspection only.
```

## 14. Open Questions

1. Should applied style preferences be workspace-specific, user-specific, or both?
2. Should `next-themes` preset selection be synced, or remain local browser preference?
3. Should generated style packs be stored as workspace assets, user library assets, or global templates?
4. Should `WorkspaceThemeConfig` remain only micro-controls while `StyleManifest` becomes a separate model?
5. Should `glowIntensity` be restored through `sanitizeThemeConfig()` before any applied-theme guarantee?
6. Should the first style-lab happen on a git branch after V16 commit, or in a copied directory?
7. Which first contrast pack is more useful: `baseline-surface-shell` vs `soft-os`, or `baseline-surface-shell` vs `editorial-lab`?
8. Should React Flow colors derive from global tokens or from graph-specific tokens?
9. Should per-agent accent remain user/agent data, or can style packs transform accent interpretation?
10. Should future style packs include external background asset URLs, or require local/imported assets?

## 15. No-Change Confirmation

This pass generated only this markdown document.

```txt
No production code changed.
No CSS changed.
No TSX changed.
No store changed.
No workspace-kernel changed.
No state-sync changed.
No backend route changed.
No Supabase migration changed.
No database data changed.
```
