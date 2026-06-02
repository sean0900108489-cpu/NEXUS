# NEXUS Style Engine Protected Behavior Ledger

This ledger exists to stop Style Engine work from breaking the functional UI. The upgrade target is visual flexibility, not interaction drift.

## 0. Classification Rule

Every touched class, prop, CSS selector, or state path must be classified before migration:

| Class or field type | Examples | Default action |
| --- | --- | --- |
| Pure visual | colors, border color, text tone, shadow, static opacity | May become semantic token after audit. |
| Visual but layout-sensitive | padding, gap, radius, font size, line height, blur | Recipe-only, component by component. |
| Layout | `fixed`, `absolute`, `relative`, `inset`, `w/h`, `min/max`, `overflow`, grid/flex tracks | Protected unless phase specifically owns layout. |
| Behavior | `pointer-events`, `cursor`, `select-none`, `resize`, drag handles, disabled states | Protected by default. |
| Third-party/adapter | `.react-flow__*`, `nodrag`, `nopan`, `nowheel`, `react-rnd` handles | Adapter-managed only. |
| State-linked | selected, active, loading, error, `data-*`, `aria-*`, disabled | Must preserve state semantics. |
| Persistence-linked | `workspace.themeConfig`, sync queue, backend route payloads | Data-flow gate required. |

## 1. Protected Class Families

Never auto-replace these:

```text
fixed absolute relative inset-0 top-* right-* bottom-* left-*
z-* z-[...]
w-* h-* min-w-* min-h-* max-w-* max-h-*
overflow-* pointer-events-* cursor-* select-none resize-none
disabled:* aria-* role data-* tabIndex
nodrag nopan nowheel
nexus-drag-handle datapad-drag-handle
react-flow react-flow__pane react-flow__handle react-flow__edge-path
react-flow__edge react-flow__controls react-flow__controls-button
react-flow__minimap react-flow__minimap-mask
nexus-flow-edge nexus-flow-edge-selected nexus-flow-edge-hit nexus-edge-delete
nexus-agent-node nexus-runtime-node nexus-agent-node-active
```

## 2. Behavior Ledger

| Behavior | Current anchor | Protected detail | Verification |
| --- | --- | --- | --- |
| Root viewport lock | `src/app/layout.tsx` | `body` uses `overflow-hidden`; app expects no body scroll | Drag windows without body scrolling. |
| Theme preset switch | `theme-provider.tsx`, `nexus-ops.tsx` | `next-themes` sets `data-theme`; not the same as `workspace.themeConfig` | Switch surface-shell/apple/tesla/terminal. |
| LEGO transient patch | `LegoThemeEngineControls` | sliders patch DOM variables immediately | Slider visual preview works. |
| LEGO commit | `updateThemeConfig` | commit enters workspace state and sync queue | Commit queues only intended applied config. |
| Agent window drag | `AgentWindow`, `react-rnd` | `bounds="parent"`, `dragHandleClassName="nexus-drag-handle"` | Drag only from handle. |
| Agent resize | `AgentWindow` | `enableResizing`, min sizes, resize stop handlers | Resize does not corrupt layout. |
| Agent z-index | store + `style={{ zIndex: agent.layout.zIndex }}` | active window stacking is functional state | Focused window comes forward. |
| Sandbox split resize | `SandboxCanvas` | separator role, pointer move/up listeners, `cursor-col-resize` | Split pane with pointer and keyboard. |
| Sandbox interaction lock | `SandboxCanvas` | locked preview blocks or allows embedded preview interaction intentionally | Toggle lock and interact with preview. |
| Datapad drag | `DatapadWindow` | `datapad-drag-handle`, `bounds="parent"` | Datapad drags and layers. |
| Datapad save/delete | `DatapadWindow` | `updateNotebook`, `saveNotebookDraft`, `deleteNotebook` | Save/delete lifecycle unchanged. |
| Prompt vault modal | `PromptVaultManager` | fixed overlay, edit/copy/delete state, scroll regions | Open, edit, copy, delete, close. |
| Branch modal | `AgentBranchModal` | `z-[9999]`, `role="dialog"`, `aria-modal`, busy state | Topmost modal and branch actions work. |
| Auth submit | `auth-screen.tsx` | form submit, busy state, Supabase sign-in/sign-up calls | Enter submit, button submit, errors display. |
| Right sidebar | `nexus-ops.tsx` | fixed panel `z-[120]`, scroll containment | Opens without blocking modals incorrectly. |
| Command palette | `nexus-ops.tsx` | fixed overlay, escape/close behavior | Opens/closes and keeps focus behavior. |
| React Flow pan/zoom | `nexus-graph.tsx`, `globals.css` | pane cursor, `fitView`, min/max zoom, controls | Pan/zoom/control buttons work. |
| React Flow node drag | `onNodeDragStop` | positions write through graph update actions | Drag agent/runtime nodes and persist positions. |
| React Flow edge select/delete | `BlueprintEdge` | hit path, delete button, selected edge ids | Select/delete edge without node drag. |
| React Flow handles | `Handle` components | source/target ids and hit area | Create edges from handles. |
| Graph overlay buttons | `WorkflowGraphAction` | parent `pointer-events-none`, buttons `pointer-events-auto` | Buttons clickable without blocking pane elsewhere. |
| Minimap/controls | `MiniMap`, `Controls`, `.react-flow__*` CSS | pannable/zoomable minimap and controls visual layer | Minimap and controls remain usable. |

## 3. Source-Specific Rules

### `src/components/nexus/nexus-ops.tsx`

Risk: extreme. This file mixes app shell, theme controls, auth flow, windows, graph bridge, sync status, dock, sidebars, command palette, and sandbox UI.

Allowed early:

- Read-only mapping.
- Slot inventory.
- One small migration unit after contract and ledger.

Forbidden early:

- Full rewrite.
- Moving functional state.
- Adding preview state to `useNexusStore`.
- Replacing behavior/layout classes by search.

### `src/components/nexus/nexus-graph.tsx`

Risk: extreme. React Flow behavior is coupled to handlers, selectors, SVG paths, custom nodes, and edge hit areas.

Allowed early:

- React Flow visual slot inventory.
- Adapter contract design.
- Later adapter config for colors/background/minimap/controls only.

Forbidden:

- Manifest direct control of pan, zoom, drag, select, handles, viewport, `nodrag`, `nopan`, or `nowheel`.
- Direct free-form selector injection.

### `src/app/globals.css`

Risk: high. It owns the current CSS variable foundation and React Flow global hooks.

Allowed later:

- Additive, namespaced semantic variables.
- Legacy bridge mapping.

Forbidden:

- Deleting legacy preset variables.
- Deleting React Flow overrides before adapter coverage.
- Letting imported style packs inject arbitrary selectors.

### `src/store/nexus-store.ts`

Risk: extreme. It is active UI state, local persistence, and sync trigger point.

Forbidden before persistence contract:

- Preview state.
- Full manifest storage.
- Style-pack import cache.
- Sync operation for preview.

## 4. Review Checklist

For every UI-affecting change:

- Did any diff touch `fixed`, `absolute`, `relative`, `z-*`, `overflow`, `pointer-events`, `cursor`, `select-none`, `resize`, `aria-*`, or `data-*`?
- Did any diff touch `nodrag`, `nopan`, `nowheel`, React Flow selectors, or `react-rnd` handles?
- Did any diff touch store, sync, workspace kernel, backend routes, migrations, or generated database types?
- Did preview remain local-only?
- Did the changed component still have a legacy fallback?
- Was a browser smoke run for the relevant behavior?

Reviewer decision:

```text
PASS
PASS WITH NOTES
HOLD
FAIL
ROLLBACK REQUIRED
```

Use `ROLLBACK REQUIRED` if the diff breaks a protected behavior or pollutes sync/workspace/backend state.
