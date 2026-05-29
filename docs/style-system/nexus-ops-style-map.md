# NEXUS Ops Style Map

Phase: V8 - App Shell Semantic Mapping
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Status: documentation-only app shell map. No component code changed.

## 0. Purpose

`src/components/nexus/nexus-ops.tsx` is the largest and riskiest visual surface
in the app. This map breaks it into style migration units so future work can
avoid broad rewrites.

This map is not an implementation plan to immediately edit the file.

## 1. Current Component Anchors

| Area | Anchor | Responsibility | Risk |
| --- | --- | --- | --- |
| Main app shell | `src/components/nexus/nexus-ops.tsx:643` | State hub and root shell. | Critical |
| Sidebar toggle | `src/components/nexus/nexus-ops.tsx:2313` | Left/right collapsed rails. | Medium |
| Right floating dock | `src/components/nexus/nexus-ops.tsx:2442` | Main panel launcher. | High |
| Top bar | `src/components/nexus/nexus-ops.tsx:2478` | Workspace switcher, actions, menus. | High |
| Sync badge/action | `src/components/nexus/nexus-ops.tsx:2808` | Sync state display. | Medium |
| Macro composer modal | `src/components/nexus/nexus-ops.tsx:2871` | Modal form and save action. | High |
| Provider vault panel | `src/components/nexus/nexus-ops.tsx:2976` | Secrets UI; must not print/read secrets. | Critical |
| Right agent settings sidebar | `src/components/nexus/nexus-ops.tsx:3237` | Theme, providers, memory, trace, account panels. | Critical |
| LEGO theme controls | `src/components/nexus/nexus-ops.tsx:4183` | DOM variable preview plus durable commit. | Critical |
| Left dock | `src/components/nexus/nexus-ops.tsx:4591` | Agent list/navigation. | High |
| Agent window | `src/components/nexus/nexus-ops.tsx:4797` | react-rnd window, chat, sandbox. | Critical |
| Sandbox canvas | `src/components/nexus/nexus-ops.tsx:5130` | iframe/html preview, split/lock behavior. | Critical |
| Agent action toolbar | `src/components/nexus/nexus-ops.tsx:5393` | Agent commands. | Medium |
| Media canvas | `src/components/nexus/nexus-ops.tsx:5817` | Image/video/media preview. | Medium |
| Message bubble | `src/components/nexus/nexus-ops.tsx:5942` | Chat message visual state. | Medium |
| Minimized rail | `src/components/nexus/nexus-ops.tsx:6004` | Minimized window rail. | High |
| Right intel panel | `src/components/nexus/nexus-ops.tsx:6042` | Agent runtime/settings sections. | High |
| Command palette | `src/components/nexus/nexus-ops.tsx:6389` | Global overlay and command search. | High |

## 2. Current Shell Slots

| Slot | Current anchor | Future recipe/token direction |
| --- | --- | --- |
| `shell.root` | `nexus-shell flex h-dvh...` at `src/components/nexus/nexus-ops.tsx:2020` | `surface.shell`, `text.primary`, viewport lock protected. |
| `workspace.canvas` | `nexus-workspace nexus-scanline...` at `src/components/nexus/nexus-ops.tsx:2127` | `surface.workspace`, `workspace.grid*`, `workspace.wash`. |
| `topbar.surface` | `src/components/nexus/nexus-ops.tsx:2553` | `recipe.panel` or `recipe.topbar`. |
| `rightDock.surface` | `src/components/nexus/nexus-ops.tsx:2454` | `recipe.dock.surface`. |
| `rightDock.item` | `src/components/nexus/nexus-ops.tsx:2461` | `recipe.dock.itemDefault/itemActive`. |
| `rightSidebar.surface` | `src/components/nexus/nexus-ops.tsx:3420` | `recipe.panel` plus sidebar density. |
| `themePanel.surface` | `src/components/nexus/nexus-ops.tsx:3475` | `recipe.panel` / style lab later. |
| `legoControls.surface` | `src/components/nexus/nexus-ops.tsx:4276` | V5/V11 preview surface, but commit path protected. |
| `agentWindow.surface` | `src/components/nexus/nexus-ops.tsx:4970` | `recipe.window`, high risk. |
| `messageBubble.surface` | `src/components/nexus/nexus-ops.tsx:5958` | `recipe.messageBubble`. |
| `commandPalette.overlay` | `src/components/nexus/nexus-ops.tsx:6430` | `recipe.modal.backdrop`, high z-index. |

## 3. Protected Behavior In This File

Do not touch without a dedicated behavior gate:

- Root `h-dvh`, `overflow-hidden`, workspace `isolate`, `min-h-0`, `min-w-0`.
- Right dock `pointer-events-none` wrapper and `pointer-events-auto` inner panel.
- Overlay z-index tiers: `z-[70]`, `z-[90]`, `z-[120]`, `z-[130]`, `z-[140]`, `z-[999]`.
- Theme controls commit path through `onUpdateThemeConfig`.
- Provider vault secret fields and lock/unlock behavior.
- Agent window `react-rnd` props: `bounds`, `dragHandleClassName`, `enableResizing`, `disableDragging`, `onDragStop`, `onResizeStop`, `zIndex`.
- Sandbox interaction lock and split resize behavior.
- Command palette keyboard open/close behavior.
- Undo/redo preservation for native inputs.

## 4. Migration Unit Backlog

### Low Risk

1. Document-only slot names for static panel surfaces.
2. Isolated `NexusBadge` specimen based on stream/status classes.
3. Isolated `NexusPanel` specimen based on `.nexus-panel`.

### Medium Risk

1. Right dock item visual recipe.
2. Top menu action visual recipe.
3. Static provider/model panel button recipe.
4. Auth screen visual shell recipe outside `nexus-ops`.

### High Risk

1. Right sidebar shell migration.
2. Command palette surface migration.
3. Agent message bubble migration.
4. Agent window chrome migration.
5. Sandbox canvas visual migration.
6. Any LEGO theme controls behavior change.

## 5. Recommended First Code Unit Later

Do not edit `nexus-ops.tsx` first.

Recommended first runtime code unit after docs gates:

```text
create isolated primitive/specimen files
-> render them in a local-only style lab surface
-> no store/sync/backend
-> browser smoke
```

Only after that should a low-risk production component consume a primitive.

## 6. Visual Slots To Normalize Later

| Visual family | Current pattern | Future target |
| --- | --- | --- |
| Panel surfaces | `border border-white/10 bg-white/[...]`, `bg-slate-950/...` | `recipe.panel` |
| Accent buttons | `border-cyan-300/... bg-cyan-300/... text-cyan-100` | `recipe.button.primary` |
| Secondary buttons | `border-fuchsia-300/...` | `recipe.button.secondary` |
| Danger buttons | `border-rose-300/...` | `recipe.button.danger` |
| Status badges | stream/status tone helpers | `recipe.badge.status` |
| Metadata labels | `font-mono text-[9px] uppercase tracking-[...]` | `typography.label` + density |
| Window chrome | `nexus-agent-window`, `nexus-drag-handle` | `recipe.window` visual only |
| Overlay shells | fixed overlays with backdrop blur | `recipe.modal` visual only |

## 7. Verification For Future App Shell Changes

Required focused checks:

- Existing theme preset switching still works.
- Right dock opens/closes each panel.
- Topbar workspace menu still opens and scrolls.
- Command palette opens/closes with keyboard and button.
- Agent windows drag, resize, focus, minimize, restore.
- Sandbox lock/unlock behavior still works.
- Provider vault does not reveal secrets.
- LEGO preview and commit still behave as currently designed.
- No preview-only state enters sync.
- No console errors in browser smoke.

## 8. Acceptance Gate

V8 map passes when:

- `nexus-ops.tsx` is split into migration units.
- Shell/topbar/dock/sidebar/window/modal slots are named.
- Protected behavior and data-flow paths are identified.
- First future code unit avoids direct `nexus-ops.tsx` rewrite.
- No runtime component, CSS, schema, package, deploy, or `exports/**` files are changed.
