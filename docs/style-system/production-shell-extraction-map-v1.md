# NEXUS Production Shell Extraction Map V1

Status: read-only extraction planning with first outer frame extraction landed
Branch: `codex/v18-style-pack-contract-prep`
Source scanned: `src/components/nexus/nexus-ops.tsx`

Update: `NexusOpsOuterShellFrame` now owns only the original outer
`nexus-shell` visual wrapper. The `NexusOps` behavior core, child order, store
selectors/actions, React Flow wiring, windows, modals, and layout semantics
remain in `src/components/nexus/nexus-ops.tsx`.

Update: `NexusOpsBodyFrame` now owns only the original body row visual wrapper
around the left dock/workspace siblings. It accepts only `children` and keeps
all child order, collapse animation, workspace measurement, graph/window
conditionals, and behavior callbacks in `src/components/nexus/nexus-ops.tsx`.

Update: `NexusOpsTopBarFrame` now owns only the original top bar/header visual
wrapper. It accepts only `children` and keeps workspace menu state, rename form
state, action callbacks, buttons, sync badge behavior, and all conditionals in
`src/components/nexus/nexus-ops.tsx`.

## 1. Scope And Non-Goals

This document started as the read-only map for the first real production shell
extraction. It now records that the first outer visual shell frame extraction
has landed. The extraction does not change production runtime behavior and does
not introduce a new registry, contract, layout preset, or feature placement
system.

The goal is to mark cut lines inside `NexusOps` before any extraction happens:

- extraction-safe shell wrapper candidates
- behavior-protected core
- visual-token adoption candidates
- interaction smoke requirements

Non-goals that still apply after the outer frame extraction:

- no edits to React Flow, drag, resize, focus, z-index, store, sync, backend,
  Supabase, route behavior, or CSS layout rules
- no production token bridge apply
- no layout preset adoption
- no feature-slot registry consumption
- no workspace persistence changes

## 2. Extraction-Safe Shell Wrapper Candidates

These candidates are shell-frame cut lines only. They may be extracted later as
thin presentational wrappers if and only if the future diff keeps all behavior
callbacks, store reads/writes, focus rules, keyboard handling, graph operations,
and persistence authority in `NexusOps` or in an already-owned behavior module.

| Candidate | Source anchor | Why it appears safe | What it must not own | Proposed future extraction unit | Required smoke |
| --- | --- | --- | --- | --- | --- |
| `NexusOps` outer visual shell frame | `src/components/nexus/nexus-ops-outer-shell-frame.tsx:7`; callsite `src/components/nexus/nexus-ops.tsx:2021` to `src/components/nexus/nexus-ops.tsx:2310` | It is the broadest visual frame around the existing shell after the auth gate. It already sits inside the inert route-edge wrapper and now accepts only `children`. | Auth gate, store selectors, effects, keyboard shortcuts, import/export, persistence, graph, windows, modals, layout geometry, feature placement. | Landed as `NexusOpsOuterShellFrame`; no further extraction is implied by this map. | Page renders, wrapper boundary still exists, `NexusOps` visible, no console/hydration errors, no pointer/focus regression. |
| Main chrome/body container | `src/components/nexus/nexus-ops-body-frame.tsx:7`; callsite `src/components/nexus/nexus-ops.tsx` around the left dock/workspace row | The flex row that contains left dock and workspace is visually identifiable and does not itself make decisions beyond existing child placement. It now accepts only `children`. | Left/right swapping, layout preset intent, scroll/overflow changes, React Flow behavior, workspace sizing, drag/drop, slot registry. | Landed as `NexusOpsBodyFrame`; no further body-row extraction is implied by this map. | Workspace visible, left rail still opens/closes, graph/panels view unchanged, no layout shift. |
| Top shell chrome frame | `src/components/nexus/nexus-ops-top-bar-frame.tsx:7`; used inside `TopBar` in `src/components/nexus/nexus-ops.tsx` | The header has a clear visual boundary and stable placement above the workspace body. It now accepts only `children`. | Workspace menu state, rename form state, save/import/export actions, view-mode toggles, sync retry, recovery actions, keyboard behavior. | Landed as `NexusOpsTopBarFrame`; no behavior moved. | Workspace menu opens, rename cancel/commit still works, view toggle still works, import/export buttons still reachable. |
| Left dock visual wrapper | `<LeftDock />` call at `src/components/nexus/nexus-ops.tsx:2099`; `LeftDock` starts at `src/components/nexus/nexus-ops.tsx:4591`; root `.nexus-panel` at line 4626 | The expanded left dock is already a `.nexus-panel` visual primitive and is separate from workspace canvas content. | Agent spawn/select/focus/restore logic, template profile editing, model selection, collapse animation state. | Extract a left dock frame wrapper around the existing `LeftDock` render tree, or first move only the `.nexus-panel` frame class to a named wrapper. | Expand/collapse left rail, spawn from template, select agent, restore minimized agent, no focus regression. |
| Collapsed sidebar rail frame | `CollapsedSidebarRail` starts at `src/components/nexus/nexus-ops.tsx:2349`; `.nexus-panel` root at line 2359 | It is visually small and has no direct click handler inside the rail body; the toggle button remains separate. | Toggle ownership, animation orchestration, side swapping, layout preset behavior. | Extract `CollapsedSidebarRailFrame` only if it remains a fixed label/side display primitive. | Collapse/expand still works; label orientation and hit target are unchanged. |
| Right floating dock visual frame | `<RightFloatingDock />` call at `src/components/nexus/nexus-ops.tsx:2206`; component starts at line 2442; root `nav` at line 2450 | The rail is visually isolated and fixed-position; its contents are simple panel buttons. | Active panel state, button callbacks, z-index changes, pointer-event semantics, panel placement authority. | Extract `RightFloatingDockFrame` after preserving current `pointer-events-none`/`pointer-events-auto` semantics exactly. | Open/close every right panel tab, panel selection unchanged, no pointer regression over workspace. |
| Right settings/sidebar panel outer frame | `<AgentSettingsSidebar />` call at `src/components/nexus/nexus-ops.tsx:2249`; component starts at line 3237; outer `motion.aside` at line 3418 | The panel has a visible overlay-like frame that could later use `.nexus-glass`/panel tokens. | Provider vault state, API verification, artifacts/macros/notebooks, run-tool actions, theme controls, close behavior, z-index. | Extract only the outer frame after a separate modal/sidebar recipe smoke; leave panel contents and callbacks untouched. | Open/close settings, switch all tabs, provider fields still work, no secret output, no z-index regression. |
| Command palette visual frame | `<CommandPalette />` call at `src/components/nexus/nexus-ops.tsx:2213`; component starts at line 6389; `.nexus-panel` frame at line 6437 | The palette has a stable modal-like panel and already uses `.nexus-panel`. | Keyboard shortcut ownership, focus on open, command list, command execution, close behavior. | Extract only after command-palette focus smoke; likely a modal frame primitive. | `Cmd/Ctrl+K` opens/closes, search input focuses, commands still run, Escape closes. |

Completed static frame extractions:

- `NexusOpsOuterShellFrame`
- `NexusOpsBodyFrame`
- `NexusOpsTopBarFrame`

Skipped in the Body Frame First round:

- `NexusOpsLeftDockFrame`: skipped because the same-level left dock wrapper is
  a dynamic `motion.aside` with `animate={{ width: leftDockOpen ? 266 : 44 }}`
  and collapse animation ownership. Extracting it would require behavior props
  or moving animation semantics.
- `NexusOpsWorkspaceFrame`: skipped because the same-level workspace wrapper
  owns `ref={workspaceRef}` measurement and contains the panel/graph conditional.
  Extracting it as a children-only frame would move behavior/measurement
  authority.

Future extraction should not start with React Flow, workspace core, floating
window manager, feature placement, or layout preset adoption.

## 3. Behavior-Protected Core

The following areas are protected. They should be treated as no-extraction zones
until a dedicated behavior test/smoke exists for the exact surface.

| Protected area | Source anchor | Why protected |
| --- | --- | --- |
| React Flow canvas/graph | `NexusGraph` import at `src/components/nexus/nexus-ops.tsx:139`; render at `src/components/nexus/nexus-ops.tsx:2168`; graph store callbacks at lines 767-789 | Owns graph node positions, edge connections, workflow runtime nodes, pan/zoom/connect/delete behavior through `NexusGraph`. |
| Workspace panel/graph mode switch | `viewMode === "panels"` branch at `src/components/nexus/nexus-ops.tsx:2129`; graph branch at line 2168 | Switching here changes whether floating windows or graph canvas owns the workspace. This is not a layout-preset cut line yet. |
| Hooks and local shell state | `NexusOps` starts at `src/components/nexus/nexus-ops.tsx:643`; refs/state at lines 644-682; effects at lines 969-1128 and 1815-1905 | Owns auth readiness, workspace size measurement, sync polling, Supabase auth, theme DOM writes, keyboard shortcuts, workflow handoff dispatches. |
| Store calls/selectors | `useNexusStore` import at `src/components/nexus/nexus-ops.tsx:134`; selectors/actions at lines 683-790 | Owns workspace, agent, graph, auth vault, theme, sync, tool, import/export, and persistence authority. |
| Supabase/sync/backend paths | Imports at `src/components/nexus/nexus-ops.tsx:111`, lines 112-117, and `src/components/nexus/nexus-ops.tsx:134`; recovery/sync effects at lines 873-1070 | Recovery, cloud sync, auth, API tokens, and queue status are production state paths. |
| Agent actions and streaming/tool execution | `handleSend` starts at `src/components/nexus/nexus-ops.tsx:1345`; task create at line 1395; stream endpoint at line 1494; `readStreamEvents` at line 1516; `runTool` selector at line 790 | Owns task creation, streaming, cancellation, message append, telemetry, media generation, tool execution, and runtime credentials. |
| Workflow runtime and handoffs | Workflow selectors at `src/components/nexus/nexus-ops.tsx:821`; `handleRunWorkflowRuntimeLite` at line 1593; handoff effects at lines 1815-1905 | Owns autonomous workflow dispatch and graph runtime state. |
| Floating windows and Rnd behavior | `Rnd` dynamic import at `src/components/nexus/nexus-ops.tsx:142`; `AgentWindow` starts at line 4797; `<Rnd>` at line 4937; drag/resize handlers at lines 4881-4886 | Owns drag, resize, position, size, z-index, focus, maximize, sandbox interaction lock, and window lifecycle. |
| Focus and z-index | Agent focus store action at `src/components/nexus/nexus-ops.tsx:708`; Rnd focus handlers at lines 4947-4959; z-index style at line 4965 | Focus and z-index are core workspace behavior and must not be moved into a visual shell extraction. |
| Modals and overlays | `MacroComposerModal` render at `src/components/nexus/nexus-ops.tsx:2219`; `PromptVaultManager` at line 2230; `AgentBranchModal` at line 2235; macro modal body at lines 2871-2973 | Owns modal visibility, form submit, branch completion, vault manager, close/focus behavior, and overlay z-index. |
| Right settings panel content | `AgentSettingsSidebar` render at `src/components/nexus/nexus-ops.tsx:2249`; component starts at line 3237 | Owns provider credentials, macros, artifacts, memory, trace events, theme controls, notebooks, account state, and tool execution. |
| Sandbox canvas and split interaction | `SandboxCanvas` starts at `src/components/nexus/nexus-ops.tsx:5130`; pointer resize logic at lines 5205-5217 | Owns iframe/code split, pointer listeners, sandbox URL normalization, and interaction lock overlay. |
| Command palette execution | Command list built before return, including save/export/import/reset at `src/components/nexus/nexus-ops.tsx:1960`; `CommandPalette` at line 2213 and line 6389 | Owns command execution, focus, keyboard handling, import file input, and workspace mutation actions. |

## 4. Visual-Token Adoption Candidates

These are not extraction targets by themselves. They are visual-token adoption
surfaces that may continue using the existing Production Token Bridge variable
aliases in future, focused implementation rounds.

| Surface | Source anchor | Current mechanism | Candidate bridge variables | Risk | Notes |
| --- | --- | --- | --- | --- | --- |
| `.nexus-panel` primitive | `src/app/globals.css:280`; direct `nexus-ops.tsx` usage at lines 2359, 4626, 6070, 6437 | CSS class with bridge aliases and legacy fallback | `--nexus-panel-bg`, `--nexus-panel-border`, `--nexus-panel-text`, `--nexus-panel-radius`, `--nexus-panel-shadow`, `--nexus-panel-blur` | Low | Already adopted as a primitive. Future shell extraction may reuse it but must not move behavior. |
| `.nexus-glass` primitive | `src/app/globals.css:289` | CSS class with bridge aliases and legacy fallback | `--nexus-glass-bg`, `--nexus-glass-border`, `--nexus-glass-text`, `--nexus-glass-radius`, `--nexus-glass-blur` | Low-Medium | Not a direct `nexus-ops.tsx` class marker in this scan, but available for future outer frames or modal/sidebar specimen parity. |
| `.nexus-workspace` primitive | `src/app/globals.css:252`; direct `nexus-ops.tsx` usage at line 2127 | CSS class with background/grid/wash bridge aliases plus hardcoded layout classes | `--nexus-workspace-bg`, `--nexus-workspace-grid-primary`, `--nexus-workspace-grid-secondary`, `--nexus-workspace-wash` | Medium | Color/background/grid/wash only. Do not touch overflow, sizing, positioning, React Flow, canvas behavior, or workspace state. |
| `.nexus-shell` root | `src/app/globals.css:245`; wrapper in `src/components/nexus/nexus-ops-outer-shell-frame.tsx:11` | Root shell class and global descendant rules | `--bg-base`, `--text-main`, possible future shell aliases | Medium | First outer frame extraction landed. Do not use it for asset background, production token apply, or layout control. |
| Hardcoded Tailwind chrome | `TopBar` line 2553, right dock line 2454, settings panel line 3420, macro modal line 2905 | Inline Tailwind classes with cyan/fuchsia/black colors, shadows, and borders | panel/glass/modal recipe variables after specimen parity | Medium-High | Requires component-specific smoke before adoption. Do not bulk replace. |

## 5. Interaction Smoke Requirements

The next extraction smoke must prove behavior did not move or regress:

- page renders with the inert route-edge wrapper still present
- `NexusOps` shell/chrome is visible
- workspace surface is visible
- graph/workspace canvas is visible when graph mode is active
- panel-mode agent windows are visible when present
- left sidebar/rail remains visible and toggleable
- right floating dock remains visible and opens/closes panels
- command palette still opens via `Cmd/Ctrl+K`, focuses input, and closes
- existing windows, datapads, vault manager, branch modal, and macro modal remain unchanged when present
- no hydration errors
- browser console errors are zero
- pointer interactions do not regress over workspace, dock, or windows
- drag/resize/focus/z-index behavior for agent windows remains unchanged
- stream stop/send/tool controls remain reachable
- import/export/save/reset commands remain unchanged

## 6. First Recommended Extraction Target

Recommended next target after the landed outer/body/top-bar frames: a static
frame smaller than behavior-bearing surfaces, such as a right dock visual frame
only if it can preserve current pointer-event semantics and active-panel
behavior. Do not retry left dock or workspace frame extraction until their
dynamic animation/measurement responsibilities are separated.

Minimum acceptable future unit:

- create an inert static frame around an existing visual wrapper
- keep the same class string and child order
- accept only `children`
- do not import store, sync, backend, Supabase, style-engine registry, layout
  preset, feature registry, React Flow, Rnd, or window manager modules
- do not own route authority, layout preset intent, focus, keyboard shortcuts,
  z-index, overflow, workspace state, graph behavior, or feature placement

Do not start with:

- React Flow or graph extraction
- workspace core extraction
- floating window manager extraction
- agent window chrome extraction
- feature placement
- layout preset adoption
- production token apply/persistence
- backend, Supabase, sync, import/export, or workspace store movement

Stop if the first viable extraction would require touching React Flow,
drag/resize/focus/z-index, store/sync/backend, Supabase, route behavior, or CSS
layout rules.

## 7. V18 Long-Run Reconciliation

Reconciled during
`20260531-v18-low-intensity-production-shell-long-run` Phase 2.

Extracted static shell frames:

- `NexusOpsOuterShellFrame`
- `NexusOpsBodyFrame`
- `NexusOpsTopBarFrame`

Skipped candidates that remain No-Go for children-only extraction:

- `NexusOpsLeftDockFrame`
  - the same-level wrapper owns dynamic `motion.aside` width and collapse
    animation
  - extracting it safely requires a later animation-boundary decision
- `NexusOpsWorkspaceFrame`
  - the same-level wrapper owns `workspaceRef` measurement
  - it also contains the panel/graph conditional and must not be separated from
    behavior in this run

Remaining protected core:

- React Flow graph/canvas and graph callbacks
- workspace measurement and view-mode switching
- store selectors/actions
- Supabase/sync/backend/API paths
- agent streaming/tool execution
- workflow runtime/handoffs
- Rnd windows, drag/resize/focus/z-index
- modals, overlays, command palette execution, and provider/settings behavior

Next safe extraction candidates for assessment only:

- right floating dock outer visual frame, if pointer-event semantics can be
  preserved exactly
- command palette visual panel frame, if focus/open/close behavior remains
  entirely in `CommandPalette`
- collapsed sidebar rail inner visual frame, only if toggle behavior remains
  outside the frame

No-Go zones for the next implementation phase:

- React Flow
- workspace wrapper
- left dock wrapper
- agent windows
- modal behavior
- command execution
- provider/auth/sync/persistence paths
- any new registry, contract, feature placement, or layout preset adoption

## 8. V18 Second-Level Static Frame Assessment

Assessed during
`20260531-v18-low-intensity-production-shell-long-run` Phase 3.

| Candidate | Source anchor | Assessment | Decision |
| --- | --- | --- | --- |
| Right floating dock outer frame | `src/components/nexus/nexus-ops.tsx:2445` | The outer `nav` and inner rail `div` are static visual wrappers. Active state, button map, button classes, and `onClick` handlers can remain inside `RightFloatingDock`. Pointer-event and z-index classes must be preserved exactly. | Safe optional Phase 4 target: `NexusOpsRightFloatingDockFrame`. |
| Collapsed sidebar rail | `src/components/nexus/nexus-ops.tsx:2352` | Root is a `motion.div` with animation props and side-derived visual class state. | Skip until an animation-boundary plan exists. |
| Command palette panel | `src/components/nexus/nexus-ops.tsx:6392` | Owns query state, input ref, focus timing, overlay close behavior, mouse event behavior, and command execution. | No-Go for this run. |
| Agent settings sidebar chrome | `src/components/nexus/nexus-ops.tsx:3240` | Owns settings/provider/artifact/memory/theme/trace/auth paths and a fixed motion overlay. | No-Go for this run. |
| Sync badge and top menu actions | `src/components/nexus/nexus-ops.tsx:2811`, `src/components/nexus/nexus-ops.tsx:2846` | Interactive controls with event handlers and conditional visual state. | No-Go for this run. |

Recommended Phase 4 unit:

- Extract only `NexusOpsRightFloatingDockFrame`.
- Preserve current class strings and child order.
- Keep all state, map rendering, active classes, labels, titles, and handlers in
  `RightFloatingDock`.
- Browser smoke must include right dock visibility and a safe right dock toggle.

## 9. V18 Optional Second Static Frame Extraction

Implemented during
`20260531-v18-low-intensity-production-shell-long-run` Phase 4.

Extracted frame:

- `NexusOpsRightFloatingDockFrame`

Source anchors:

- usage in `src/components/nexus/nexus-ops.tsx`
- frame file at
  `src/components/nexus/nexus-ops-right-floating-dock-frame.tsx`

What moved:

- the static right dock outer `nav`
- the static `aria-label="Right workspace tools"`
- the static pointer-event/fixed-position/z-index/visibility classes
- the static inner rail visual classes

What stayed protected in `RightFloatingDock`:

- `rightDockPanels.map`
- active panel selection and `aria-pressed`
- button class branching
- labels, titles, and icons
- `onTogglePanel` event handlers

Skipped second-level candidates remain skipped:

- collapsed sidebar rail: motion/animation boundary
- command palette: focus, query state, overlay close, command execution
- settings sidebar: overlay, provider/auth/theme/artifact/memory behavior
- sync badge/top menu actions: interactive controls

## 10. V18 Long-Run Review Gate

Reviewed during
`20260531-v18-low-intensity-production-shell-long-run` Phase 5.

Current extracted shell frame set:

- `NexusOpsOuterShellFrame`
- `NexusOpsBodyFrame`
- `NexusOpsTopBarFrame`
- `NexusOpsRightFloatingDockFrame`

The behavior core remains in `NexusOps`. This includes store/sync/backend/API
paths, workspace measurement, React Flow, agent streaming/tool execution,
workflow runtime, Rnd windows, modals, command palette execution, and right
settings/provider/auth/theme behavior.

Next recommended unit:

- a focused token-adoption assessment for one already-extracted visual frame,
  or a read-only assessment for the next static frame candidate

Do not proceed next with:

- layout preset production adoption
- feature placement production adoption
- workspace/React Flow extraction
- window manager extraction
- command palette extraction
- modal/settings extraction
- broad production token application
