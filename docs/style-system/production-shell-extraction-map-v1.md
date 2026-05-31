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

## 11. V18 Right Floating Dock Frame Token Alias Spike

Implemented during
`20260531-right-floating-dock-frame-token-alias-spike`.

Target:

- `NexusOpsRightFloatingDockFrame`

Token alias status:

- completed for the right floating dock inner rail visual surface only
- no production token runtime apply was introduced
- no store/sync/backend/Supabase/API path was touched
- no `nexus-ops.tsx` behavior or child rendering was changed

Aliases added:

- `--nexus-right-dock-bg`
- `--nexus-right-dock-border`
- `--nexus-right-dock-shadow`
- `--nexus-right-dock-blur`
- `--nexus-right-dock-radius`

Fallback chain:

- dedicated right-dock alias
- existing panel bridge alias
- cyberpunk baseline value

Intentionally not tokenized:

- outer `nav` pointer events
- outer `nav` fixed position
- outer `nav` z-index
- responsive visibility
- right dock button active/inactive colors
- right dock text/icon colors
- right panel content
- workspace, graph, window, modal, or layout behavior

Remaining No-Go zones:

- LeftDock and Workspace wrappers
- React Flow and graph files
- drag/resize/focus/z-index/window/modal behavior
- feature placement and layout preset production adoption
- runtime token apply or persistence
- store/sync/backend/Supabase/API paths

## 12. V19 TopBar Frame Token Alias Spike

Implemented during
`20260531-v19-top-bar-frame-token-alias-spike`.

Target:

- `NexusOpsTopBarFrame`

Pre-update scan result:

- route-edge wrapper remains in `src/app/page.tsx`
- runtime preview provider remains scoped and does not persist style variables
- `NexusOpsTopBarFrame` remains a children-only presentation wrapper
- TopBar state, workspace menu, rename form, dropdown, button handlers,
  sync badge, recovery list, and view-mode actions remain in
  `src/components/nexus/nexus-ops.tsx`
- no store/sync/backend/Supabase/API, React Flow, window/modal, drag/resize,
  focus, z-index, feature placement, or layout preset boundary is required

Token alias status:

- completed for the TopBar frame visual surface only
- no production token runtime apply was introduced
- no store/sync/backend/Supabase/API path was touched
- no `nexus-ops.tsx` behavior or child rendering was changed

Aliases added:

- `--nexus-top-bar-bg`
- `--nexus-top-bar-border`
- `--nexus-top-bar-shadow`
- `--nexus-top-bar-blur`
- `--nexus-top-bar-radius`

Fallback chain:

- dedicated TopBar alias
- existing panel bridge alias
- cyberpunk baseline value

Intentionally not tokenized:

- TopBar child button active/inactive/hover states
- workspace menu and dropdown contents
- sync badge, status counters, latency/status labels
- text/icon colors
- focus rings
- pointer events
- z-index
- sticky/fixed positioning
- height, spacing, layout, overflow, or responsive behavior
- handlers, callbacks, maps, conditionals, state transitions

Remaining No-Go zones:

- LeftDock and Workspace wrappers
- React Flow and graph files
- drag/resize/focus/z-index/window/modal behavior
- feature placement and layout preset production adoption
- runtime token apply or persistence
- store/sync/backend/Supabase/API paths

## 13. V19 Production Skinning 20-to-40 ROI Loop 01

Implemented during
`20260531-v19-production-skinning-20-to-40-roi-loop-01`.

Target:

- `NexusOpsOuterShellFrame`

Candidate decision:

- selected `NexusOpsOuterShellFrame` because it is the broadest already
  extracted inert production shell surface and covers the full application
  background/surface without moving behavior
- rejected `NexusOpsBodyFrame` because it currently has no visual surface beyond
  layout spacing and adding one would introduce new visual semantics
- rejected `.nexus-workspace` and Workspace wrappers because they remain tied to
  `workspaceRef`, view-mode conditionals, React Flow, and window ownership
- kept LeftDock, controls, modals, settings panels, and graph surfaces out of
  scope because they are behavior-bearing

Token alias status:

- completed for the outer shell background/surface only
- no production token runtime apply was introduced
- no store/sync/backend/Supabase/API path was touched
- no `nexus-ops.tsx` behavior or child rendering was changed

Selector and alias added:

- `.nexus-outer-shell-frame`
- `--nexus-outer-shell-bg`

Fallback chain:

- dedicated outer-shell alias
- existing `--shell-surface`
- cyberpunk baseline shell gradients

Intentionally not tokenized:

- asset background URL
- text or icon colors
- child button/control states
- borders, shadows, blur, radius, or glow not already owned by this frame
- pointer events
- z-index
- height, spacing, layout, overflow, or responsive behavior
- handlers, callbacks, maps, conditionals, refs, or state transitions

Remaining No-Go zones:

- `src/components/nexus/nexus-ops.tsx` broad refactor
- LeftDock and Workspace wrappers
- React Flow and graph files
- drag/resize/focus/z-index/window/modal behavior
- feature placement and layout preset production adoption
- runtime token apply or persistence
- store/sync/backend/Supabase/API paths

## 14. V19 Production Skinning 20-to-40 ROI Loop 02

Implemented during
`20260531-v19-production-skinning-20-to-40-roi-loop-02`.

Target:

- `.nexus-workspace` production primitive

Candidate decision:

- selected `.nexus-workspace` because it is the highest-visibility production
  primitive that can be expanded in CSS only
- rejected `.nexus-agent-window` because it is inside Rnd and has stateful
  inline background, border, shadow, selected, and sandbox visual logic tied to
  window behavior
- rejected `.nexus-message-bubble` because safe high-quality adoption likely
  needs role-specific stable selectors; a generic override would flatten
  user/tool/agent visual semantics
- rejected `.nexus-panel` because it is already aliased for background, border,
  text, radius, shadow, and blur
- rejected command palette, modal, datapad, and settings chrome as
  extraction-first candidates due focus, z-index, modal, Rnd, or provider state
  ownership

Token alias status:

- expanded for workspace chrome while preserving the existing workspace
  behavior-owned element
- no production token runtime apply was introduced
- no store/sync/backend/Supabase/API path was touched
- no `nexus-ops.tsx` behavior, refs, child order, React Flow branch, or window
  rendering was changed

Aliases added:

- `--nexus-workspace-border`
- `--nexus-workspace-shadow`
- `--nexus-workspace-radius`

Existing workspace aliases kept:

- `--nexus-workspace-bg`
- `--nexus-workspace-grid-primary`
- `--nexus-workspace-grid-secondary`
- `--nexus-workspace-wash`

Fallback chain:

- dedicated workspace alias
- existing panel alias where applicable
- cyberpunk/Tailwind baseline value

Intentionally not tokenized:

- workspace layout, sizing, overflow, isolation, z-index, responsive behavior,
  or positioning
- workspace refs and measurement
- panel-vs-graph branch
- React Flow nodes, edges, controls, minimap, or graph behavior
- floating windows, drag, resize, focus, z-index, or modal behavior
- child button, input, dropdown, status, label, or active states

Remaining No-Go zones:

- `NexusOpsWorkspaceFrame` extraction while the wrapper owns `workspaceRef` and
  panel/graph conditionals
- React Flow and graph files
- drag/resize/focus/z-index/window/modal behavior
- feature placement and layout preset production adoption
- runtime token apply or persistence
- store/sync/backend/Supabase/API paths

## 15. V19 Production Skinning 20-to-40 ROI Loop 03

Implemented during
`20260531-v19-production-skinning-20-to-40-roi-loop-03`.

Target:

- `MessageBubble` role surface

Path:

- Path A: behavior-free role-specific selector prep plus role-aware aliases

Ownership scan result:

- `MessageBubble` renders the existing `.nexus-message-bubble` visual wrapper
  as an `article` in `src/components/nexus/nexus-ops.tsx`.
- Parent `AgentWindow` owns scroll refs, composer refs, submit handlers, window
  focus, Rnd drag/resize, z-index, message ordering, and list mapping.
- Streaming creation, token append, interruption, media generation, tool
  execution, and persistence stay outside `MessageBubble`.
- `MessageBubble` itself has no hooks, effects, refs, event handlers, fetches,
  persistence, or tool execution.
- It only derives role booleans from `message.role` and renders content,
  streaming cursor, interrupted label, reasoning details, and media preview.

Selector and alias status:

- added role classes to the existing message wrapper only
- added generic message bubble aliases
- added role background aliases for user, assistant, and tool messages
- wired the existing terminal-theme message bubble override through the same
  aliases so browser-only CSS vars visibly apply on the current production
  chrome
- no message content, ordering, streaming, reasoning, media, markdown/prose, or
  tool execution behavior was changed

Selectors added:

- `.nexus-message-bubble-user`
- `.nexus-message-bubble-assistant`
- `.nexus-message-bubble-tool`

Aliases added:

- `--nexus-message-bubble-bg`
- `--nexus-message-bubble-border`
- `--nexus-message-bubble-shadow`
- `--nexus-message-bubble-radius`
- `--nexus-message-user-bg`
- `--nexus-message-assistant-bg`
- `--nexus-message-tool-bg`

Fallback chain:

- role background alias
- generic message bubble alias
- existing panel alias
- current cyberpunk role baseline

Intentionally not tokenized:

- message text color
- links, code blocks, markdown/prose internals, or media preview internals
- copy/tool buttons
- hover/focus states
- scroll behavior
- streaming cursor
- timestamps and labels
- reasoning details internals
- message content parsing, ordering, persistence, or tool execution

Remaining No-Go zones:

- message content parsing, markdown rendering, streaming, and tool execution
- AgentWindow scroll refs, composer refs, Rnd drag/resize, focus, and z-index
- backend/store/sync/Supabase/API paths
- runtime token apply or persistence

## 16. V19 Production Skinning 40-to-60 ROI Loop 04

Implemented during
`20260531-v19-production-skinning-40-to-60-roi-loop-04`.

Target:

- `AgentWindow` chrome primitive

Path:

- Path A: behavior-free visual alias adoption on the existing
  `.nexus-agent-window` and `.nexus-drag-handle` selectors

Candidate ranking:

1. `AgentWindow` chrome primitive
   - Source anchors: `src/components/nexus/nexus-ops.tsx` `AgentWindow`
     `<Rnd>` wrapper and `.nexus-agent-window` motion section;
     `src/app/globals.css` existing `.nexus-agent-window` selector.
   - Highest ROI because agent windows are the primary long-lived production
     chrome around active conversations, media/sandbox canvases, composer, and
     message bubbles.
   - Safe implementation path because the selector already existed and the
     change only routes existing visual values through aliases with dynamic
     defaults. Rnd drag/resize, focus, z-index, scroll refs, message rendering,
     composer handlers, and child order stayed in place.
2. Command palette / modal chrome
   - Source anchors: `CommandPalette` in `src/components/nexus/nexus-ops.tsx`
     and `AgentBranchModal`.
   - High visibility when open, but selector prep or extraction would touch
     focus, overlay close, dialog stack/z-index, command execution, or form
     behavior. Existing `.nexus-panel` bridge coverage remains sufficient for
     this loop.
3. Control primitives: buttons, inputs, badges/status shells
   - Broad visual reach, but hover/focus/disabled/active/status behavior is
     distributed across many production surfaces. This is too broad for a
     single reversible Loop 04 target.
4. No-Go extraction map
   - Reserved if AgentWindow aliases failed verification. It was not needed.

Aliases added:

- `--nexus-agent-window-bg`
- `--nexus-agent-window-border`
- `--nexus-agent-window-shadow`
- `--nexus-agent-window-radius`
- `--nexus-agent-window-blur`
- `--nexus-agent-window-handle-bg`
- `--nexus-agent-window-handle-border`
- `--nexus-agent-window-handle-radius`

Fallback chain:

- dedicated AgentWindow alias
- existing panel alias where visually appropriate
- existing dynamic AgentWindow default custom property
- current cyberpunk/window baseline

Implementation notes:

- The `.nexus-agent-window` wrapper keeps its existing class and child order.
- Dynamic selected-agent accent border and glow defaults are preserved through
  element-scoped default custom properties.
- CSS declarations cover only background, border color, shadow, blur, radius,
  and the thin drag-handle visual strip.
- No layout geometry, position, overflow, pointer events, cursor, drag/resize,
  focus, z-index, window lifecycle, message streaming, composer behavior, or
  agent business logic was tokenized.

Remaining No-Go zones:

- Rnd drag, resize, focus, z-index, maximize/minimize, and window lifecycle
- AgentWindow scroll refs, composer refs, submit/key handlers, message list
  mapping, and sandbox interaction lock
- command palette focus, overlay close, command execution, and workspace
  mutation commands
- modal/dialog stack, z-index, close/submit behavior, and form state
- broad button/input/badge primitive skinning before a narrower interaction
  boundary exists
- backend/store/sync/Supabase/API paths
- runtime token apply or persistence

## 17. V19 Production Chrome Isolated Visual Smoke Harness

Implemented during
`20260531-v19-production-chrome-isolated-visual-smoke-harness`.

Purpose:

- Close the Loop 04 browser-smoke gap where local `/` was correctly blocked by
  production auth and therefore could not render real `AgentWindow` chrome.
- Provide a non-production, non-persistent `/style-lab` visual smoke surface for
  production chrome aliases without auth bypass, fake login, store access,
  backend calls, Supabase, API routes, React Flow, Rnd, or window behavior.

Placement:

- `src/components/style-engine/nexus-style-lab.tsx`
- The harness lives inside the existing isolated Style Lab route at
  `/style-lab`.
- Smoke variables are applied only to a local `productionChromeSmokeTargetRef`
  container through `target.style.setProperty` and reverted with
  `target.style.removeProperty`.
- It does not use `document.documentElement`, localStorage, IndexedDB,
  workspace store, runtime token persistence, layout preset production apply,
  or feature registry production placement.

Static selectors/classes represented:

- `.nexus-agent-window`
- `.nexus-drag-handle`
- `.nexus-top-bar-frame`
- `.nexus-right-floating-dock-rail`
- `.nexus-workspace`
- `.nexus-message-bubble`
- `.nexus-message-bubble-user`
- `.nexus-message-bubble-assistant`
- `.nexus-message-bubble-tool`

Smoke variables covered:

- `--nexus-agent-window-bg`
- `--nexus-agent-window-border`
- `--nexus-agent-window-shadow`
- `--nexus-agent-window-radius`
- `--nexus-agent-window-handle-bg`
- `--nexus-agent-window-handle-border`
- `--nexus-top-bar-bg`
- `--nexus-top-bar-border`
- `--nexus-right-dock-bg`
- `--nexus-right-dock-border`
- `--nexus-workspace-bg`
- `--nexus-workspace-border`
- `--nexus-message-user-bg`
- `--nexus-message-assistant-bg`
- `--nexus-message-tool-bg`

Production aliases now testable without auth:

- AgentWindow chrome aliases from Loop 04
- Right dock aliases
- TopBar aliases
- workspace aliases
- MessageBubble role aliases

Remaining production-auth-only checks:

- real `/` authenticated agent windows, workspace state, right dock active
  panels, TopBar live data, message history, and production sync behavior
- any interaction smoke involving drag, resize, focus, z-index, modals,
  command execution, store state, backend/API, or persistence

Next seed:

- Command palette shell extraction-first remains the next high-ROI candidate,
  using the harness only for future visual selector/alias smoke after a safe
  inert shell boundary exists.

## 18. V19 Production Skinning 40-to-60 ROI Loop 05

Implemented during
`20260531-v19-production-skinning-40-to-60-roi-loop-05`.

Target:

- `CommandPalette` shell/chrome

Path:

- Path A: selector-only prep on the existing visual shell
- No command palette token aliases were added in this loop.
- No inert frame was extracted in this loop.

Ownership scan result:

- `CommandPalette` is rendered from `src/components/nexus/nexus-ops.tsx`.
- `NexusOps` owns `paletteOpen`, `setPaletteOpen`, global `Cmd/Ctrl+K`
  toggling, Escape close behavior, command list construction, import file input
  triggering, save/export/reset/spawn/arrange/restore/minimize commands, and
  workspace mutation side effects.
- `CommandPalette` owns query state, input ref, focus-on-open timing, filtered
  command rendering, overlay click close, shell click propagation stop, close
  button behavior, input updates, and command button execution.
- The existing inner `motion.div` with `.nexus-panel` is the visual shell.
  Adding `nexus-command-palette-shell` to that same class string preserves all
  behavior props, child order, animation props, refs, state, focus, input, close,
  overlay, z-index, and command execution ownership.

Selector status:

- Added `.nexus-command-palette-shell` to the existing command palette inner
  visual shell:
  `nexus-command-palette-shell nexus-panel mx-auto w-full max-w-2xl overflow-hidden`.
- Added the same selector to the isolated `/style-lab` `Production Chrome Smoke`
  harness as a static display-only specimen.

Why no frame extraction:

- The visual shell is also the owner of the propagation guard
  `onMouseDown={(event) => event.stopPropagation()}` and Framer Motion animation
  props.
- A children-only inert frame would require moving or abstracting behavior-bearing
  props, so extraction is deferred until a dedicated modal/shell frame boundary
  can be designed without handler ownership transfer.

Intentionally not changed:

- command execution logic
- `Cmd/Ctrl+K` keyboard shortcut behavior
- Escape close behavior
- focus timing or focus handling
- input state, query filtering, or command ordering
- overlay close behavior
- z-index/modal positioning
- token aliases, runtime token apply, token persistence, store, sync, backend,
  Supabase, API, React Flow, Rnd, graph, workspace persistence, or production
  auth

Remaining future token step:

- Add dedicated command palette aliases only after this selector survives source,
  build, and browser/style-lab smoke:
  `--nexus-command-palette-bg`,
  `--nexus-command-palette-border`,
  `--nexus-command-palette-shadow`,
  `--nexus-command-palette-radius`, and optional overlay/input/item aliases
  if they can remain visual-only.

Remaining production-auth-only checks:

- Real authenticated `/` palette opening via `Cmd/Ctrl+K`
- Search input autofocus in the real production shell
- Overlay click close and Escape close
- Command buttons remain unexecuted during visual smoke unless a dedicated safe
  interaction script exists

## 19. V19 Production Skinning 40-to-60 ROI Loop 06

Implemented during
`20260531-v19-production-skinning-40-to-60-roi-loop-06`.

Target:

- `CommandPalette` shell/chrome token aliases

Path:

- CSS-only alias adoption on the existing `.nexus-command-palette-shell`
  selector from Loop 05.
- No changes to `src/components/nexus/nexus-ops.tsx`.
- No command behavior, focus handling, keyboard shortcut, overlay close, input
  state, command execution, z-index, or modal positioning changes.

Aliases added:

- `--nexus-command-palette-bg`
- `--nexus-command-palette-border`
- `--nexus-command-palette-shadow`
- `--nexus-command-palette-radius`
- `--nexus-command-palette-blur`

Fallback chain:

- dedicated command palette alias
- existing `.nexus-panel` alias
- current cyberpunk baseline variable

CSS scope:

- `.nexus-shell .nexus-command-palette-shell`

Intentionally not tokenized:

- overlay backdrop
- input text, placeholder, caret, focus ring, or state
- command item hover, active, disabled, or execution states
- close button
- keyboard shortcut behavior
- command execution
- z-index, position, dimensions, overflow, layout geometry, pointer events, or
  modal/focus ownership

Style Lab smoke:

- Added command palette smoke variables to the isolated `/style-lab`
  `Production Chrome Smoke` harness.
- Smoke variables still apply only to the local
  `productionChromeSmokeTargetRef` container.
- No document-root mutation, localStorage, IndexedDB, store, sync, backend,
  Supabase, API, runtime token persistence, or production command logic was
  introduced.

Remaining production-auth-only checks:

- real `/` authenticated palette open/close and autofocus smoke
- overlay click close and Escape close in the authenticated production shell
- command buttons should remain unexecuted in visual smoke unless a dedicated
  safe command interaction script exists

## 20. V19 Production Skinning 40-to-60 ROI Loop 07

Implemented during
`20260531-v19-production-skinning-40-to-60-roi-loop-07`.

Target:

- `AgentBranchModal` shell/chrome selector prep

Path:

- Path A: selector-only prep on the existing inner visual shell
- No modal/dialog token aliases were added in this loop.
- No inert modal frame was extracted in this loop.

Ownership scan result:

- `AgentBranchModal` is rendered from the separate
  `src/components/nexus/AgentBranchModal.tsx` component and mounted by
  `src/components/nexus/nexus-ops.tsx`.
- `NexusOps` owns `branchAgentId`, chooses when the modal is mounted, focuses the
  newly branched agent after completion, and closes the modal by setting
  `branchAgentId` to `null`.
- `AgentBranchModal` owns modal form state, branch execution, store branch
  action, busy/failed state, close buttons, cancel buttons, form inputs, mode
  buttons, compressor model selection, retention ratio, custom focus prompt, and
  advanced weight controls.
- The outer `motion.div` owns modal layer semantics: `role="dialog"`,
  `aria-modal`, fixed inset, z-index, backdrop, and centering.
- The inner `motion.section` is the visible modal shell and has no close,
  submit, focus, keyboard, overlay click, or form-state handler on the shell
  element itself.

Selector status:

- Added `.nexus-agent-branch-modal-shell` to the existing inner visual shell:
  `nexus-agent-branch-modal-shell w-full max-w-3xl border border-cyan-300/25 bg-slate-950/95 ...`.
- Added the same selector to the isolated `/style-lab` `Production Chrome Smoke`
  harness as a static display-only dialog specimen.

Why no frame extraction:

- Extracting the modal shell would require a broader Framer Motion boundary
  decision around the existing `motion.section` animation props.
- Selector-only prep gives the next alias loop a stable visual target without
  moving modal behavior or modal layer ownership.

Intentionally not changed:

- modal open/close logic
- form submit or branch execution logic
- validation/clamping logic
- keyboard/focus/autofocus behavior
- overlay, z-index, or modal layer semantics
- form state, input values, mode controls, busy/failed states
- store, sync, backend, Supabase, API, React Flow, Rnd, graph, persistence,
  runtime token apply, token persistence, or production auth

Remaining future token step:

- Add dedicated modal/dialog shell aliases only after this selector survives
  source, build, and browser/style-lab smoke:
  `--nexus-modal-dialog-bg`,
  `--nexus-modal-dialog-border`,
  `--nexus-modal-dialog-shadow`,
  `--nexus-modal-dialog-radius`, and optional blur.
- Do not tokenize overlay backdrop, close buttons, submit buttons, focus rings,
  form controls, validation states, z-index, positioning, or modal stack
  behavior in that alias loop.

## 21. V19 Production Skinning 40-to-60 ROI Loop 08

Implemented during
`20260531-v19-production-skinning-40-to-60-roi-loop-08`.

Target:

- `AgentBranchModal` inner shell/chrome token aliases

Path:

- CSS-only alias adoption on the existing `.nexus-agent-branch-modal-shell`
  selector from Loop 07.
- No changes to `src/components/nexus/AgentBranchModal.tsx`.
- No modal open/close, submit, validation, focus, keyboard, overlay, z-index,
  form-control, or modal stack behavior changes.

Aliases added:

- `--nexus-modal-shell-bg`
- `--nexus-modal-shell-border`
- `--nexus-modal-shell-shadow`
- `--nexus-modal-shell-radius`
- `--nexus-modal-shell-blur`

Fallback chain:

- dedicated modal shell alias
- existing `.nexus-panel` alias
- current cyberpunk baseline variable

CSS scope:

- `.nexus-shell .nexus-agent-branch-modal-shell`

Intentionally not tokenized:

- overlay backdrop
- close button
- submit buttons
- form fields
- validation or error text
- focus rings
- keyboard states
- z-index, position, dimensions, layout geometry, overflow, pointer events, or
  modal stack ownership

Style Lab smoke:

- Added modal shell smoke variables to the isolated `/style-lab`
  `Production Chrome Smoke` harness.
- Smoke variables still apply only to the local
  `productionChromeSmokeTargetRef` container.
- No document-root mutation, localStorage, IndexedDB, store, sync, backend,
  Supabase, API, runtime token persistence, modal behavior, or production auth
  was introduced.

Remaining production-auth-only checks:

- real authenticated `/` modal open/close smoke
- branch modal submit path should remain unexecuted during visual smoke
- focus, overlay, and modal stack checks remain outside token alias work

## 22. V19 Production Skinning 40-to-60 ROI Loop 09

Implemented during
`20260531-v19-production-skinning-40-to-60-roi-loop-09`.

Target:

- `DatapadWindow` shell/chrome selector prep

Path:

- Path A: selector-only prep on the existing inner visual shell.
- No Datapad/inspector token aliases were added in this loop.
- No inert Datapad frame was extracted in this loop.

Ownership scan result:

- `DatapadWindow` is rendered from the separate
  `src/components/nexus/DatapadWindow.tsx` component and mounted by
  `src/components/nexus/nexus-ops.tsx` for each open notebook id.
- `NexusOps` owns the open notebook id list, creates/toggles global datapads,
  and remains the coordinator for production workspace state.
- `DatapadWindow` owns notebook lookup, notebook draft state, save/delete/close
  actions, focus-on-mount behavior, bring-to-front behavior, Rnd drag/resize
  wrapper, z-index, title input, content textarea, footer action buttons, and
  save status.
- The outer `Rnd` owns drag, resize, parent bounds, default frame, min size,
  mouse/touch focus behavior, and z-index style.
- The inner `section` is the visible Datapad shell and can receive a stable
  selector without changing children, handlers, refs, effects, state, Rnd props,
  z-index, focus, scroll, save, delete, close, upload/download, artifact, or
  persistence behavior.

Selector status:

- Added `.nexus-datapad-shell` to the existing inner visual shell:
  `nexus-datapad-shell nexus-datapad-window flex h-full min-h-0 flex-col ...`.
- Added the same selector to the isolated `/style-lab` `Production Chrome Smoke`
  harness as a static display-only Datapad specimen.

Why no frame extraction:

- The production visual shell sits inside an Rnd-owned window with drag/resize
  and z-index ownership immediately above it.
- Selector-only prep gives the next alias loop a stable visual target without
  moving Rnd, focus, z-index, draft, action, or persistence ownership.

Intentionally not changed:

- file upload/download logic
- artifact persistence
- notebook draft persistence
- save/delete/close actions
- title/content input behavior
- scroll/focus behavior
- drag/resize/z-index/window behavior
- store, sync, backend, Supabase, API, React Flow, graph, workspace
  persistence, runtime token apply, token persistence, production auth, or
  package/config/deploy files

Remaining future token step:

- Add dedicated Datapad shell aliases only after this selector survives source,
  build, and browser/style-lab smoke:
  `--nexus-datapad-shell-bg`,
  `--nexus-datapad-shell-border`,
  `--nexus-datapad-shell-shadow`,
  `--nexus-datapad-shell-radius`, and optional blur.
- Do not tokenize title/content fields, save/delete/close buttons,
  drag/resize/z-index, scroll/focus behavior, file upload/download, artifact
  persistence, or notebook persistence in that alias loop.

## 23. V19 Production Skinning 40-to-60 ROI Loop 10

Implemented during
`20260531-v19-production-skinning-40-to-60-roi-loop-10`.

Target:

- `DatapadWindow` inner shell/chrome token aliases

Path:

- CSS-only alias adoption on the existing `.nexus-datapad-shell` selector from
  Loop 09.
- No changes to `src/components/nexus/DatapadWindow.tsx`.
- No notebook draft, save/delete/close, focus, scroll, drag/resize, z-index,
  upload/download, artifact, persistence, or toolbar/action behavior changes.

Aliases added:

- `--nexus-datapad-shell-bg`
- `--nexus-datapad-shell-border`
- `--nexus-datapad-shell-shadow`
- `--nexus-datapad-shell-radius`
- `--nexus-datapad-shell-blur`

Fallback chain:

- dedicated Datapad shell alias
- existing `.nexus-panel` alias
- current cyberpunk baseline variable

CSS scope:

- `.nexus-shell .nexus-datapad-shell`

Intentionally not tokenized:

- title/content fields
- save/delete/close buttons
- toolbar controls
- drag handle behavior
- upload/download/artifact state
- notebook draft or persistence
- focus rings
- scroll behavior
- z-index, position, dimensions, layout geometry, overflow, pointer events, or
  Rnd/window ownership

Style Lab smoke:

- Added Datapad shell smoke variables to the isolated `/style-lab`
  `Production Chrome Smoke` harness.
- Smoke variables still apply only to the local
  `productionChromeSmokeTargetRef` container.
- No document-root mutation, localStorage, IndexedDB, store, sync, backend,
  Supabase, API, runtime token persistence, Datapad behavior, or production auth
  was introduced.

Remaining production-auth-only checks:

- real authenticated `/` Datapad open/close smoke
- real notebook draft, save, delete, focus, scroll, drag/resize, and z-index
  behavior checks remain outside token alias work
- upload/download/artifact checks remain outside this shell alias path

## 24. V19 Production Skinning 60 Percent Gate

Recorded during
`20260531-v19-production-skinning-60-percent-gate`.

Verdict:

- Pass: V19 production skinning has reached the 60% readiness gate for
  high-visibility shell, content, and chrome surfaces.
- This is a controlled readiness pass, not a claim that every authenticated
  production interaction has been re-smoked locally.

Evidence basis:

- Source-level alias coverage now exists for right dock, TopBar, outer shell,
  workspace, message bubbles, AgentWindow, CommandPalette, modal shell, Datapad
  shell, and the panel/glass bridge primitives.
- The isolated `/style-lab` `Production Chrome Smoke` harness can visually
  apply and revert the core chrome aliases without auth, store, sync, backend,
  Supabase, API, Rnd, React Flow, or production behavior.
- The latest token alias loops for CommandPalette, modal shell, and Datapad
  shell passed focused tests, typecheck, targeted lint, build, and Style Lab
  browser smoke.
- Earlier direct browser apply/revert evidence exists for right dock, TopBar,
  workspace primitive coverage, and message bubbles. AgentWindow's live local
  production smoke remains auth-gated, but its aliases are now covered in the
  isolated harness.

Remaining gaps:

- Real authenticated `/` smoke is still needed for live AgentWindow instances,
  CommandPalette open/close/autofocus, AgentBranchModal open/close without
  submit, Datapad open/close without save/delete, and any live right-dock active
  panel checks.
- Right-dock artifact/vault persistence panels remain intentionally excluded
  from this gate unless a future selector-only pass proves a behavior-free
  visual shell.
- Runtime token persistence, production token apply, asset pack production
  apply, layout preset production apply, backend/store/sync/API changes, React
  Flow behavior, and drag/resize/focus/z-index behavior remain out of scope.

Rollback readiness:

- Each adopted surface has a narrow rollback path: revert the relevant loop
  commit or remove the scoped selector alias block, focused guard assertions,
  harness smoke variables, and map/checkpoint entry.
- Fallback chains continue to route from dedicated aliases to panel/glass or
  current cyberpunk baseline values.

Next 60-to-80 route:

- Next task seed: `V19 Render Plan To Production Alias Coverage Map`.
- Goal: map V2 Render Plan / Bridge Plan variables to the adopted production
  aliases and show coverage in Style Lab.
- Prioritize a non-persistent coverage report and preview-only bridge
  inspection over new production selectors or aliases.
- Avoid right-dock artifact/vault persistence panels, backend/store/sync/API,
  asset pack production apply, layout preset production apply, runtime
  persistence, and broad `nexus-ops.tsx` refactors.

## 25. Warm Glass Ops Render Plan Coverage Loop 01

Recorded during
`20260531-v19-warm-glass-ops-render-plan-coverage-loop-01`.

North star:

- `NEXUS Warm Glass Ops`
- Apple / VisionOS-inspired warm frosted glass operations UI
- sand, clay, pearl, smoke, muted bronze, soft cyan-green status accents
- professional command-center restraint instead of broad production restyling

Deliverables:

- `docs/style-system/warm-glass-ops-north-star-v1.md`
- `createWarmGlassOpsSkinPackV2Fixture()`
- pure Render Plan / Production Bridge alias coverage helper
- `/style-lab` `Warm Glass Ops Coverage` panel
- focused tests for fixture validation, Render Plan compilation, bridge
  coverage, unsupported capabilities, and source-boundary safety

Coverage map result:

- Direct bridge coverage exists today for workspace aliases emitted by the
  current bridge:
  `--nexus-workspace-bg`, `--nexus-workspace-grid-primary`,
  `--nexus-workspace-grid-secondary`, and `--nexus-workspace-wash`.
- Fallback-driven coverage exists for panel, glass, right dock, TopBar,
  message bubble generic chrome, AgentWindow, CommandPalette, modal shell, and
  Datapad shell through `--panel-bg`, `--border-subtle`, `--shadow-panel`,
  `--surface-radius`, `--glass-blur`, and text/accent bridge targets.
- Style Lab smoke variables can still set many dedicated aliases directly for
  isolated visual apply/revert, but those dedicated component aliases are not
  yet emitted by the Render Plan / Production Bridge as production bridge
  variables.

Reference elements currently possible:

- frosted glass panel feel through panel/glass fallback variables
- warm neutral workspace and shell mood through base surface tokens
- soft borders, shadows, blur, and rounded chrome
- message, window, command palette, modal, and Datapad shell approximation in
  the isolated Style Lab harness

Reference elements still missing:

- desert atelier background image/scene
- right metrics panel recipe
- agent card recipe
- top segmented navigation/control primitive recipe
- typography scale cleanup and production font policy
- packaged asset/background pipeline
- layout preset/page shell arrangement
- authenticated production `/` smoke for live behavior-bearing surfaces

Boundaries held:

- no production source selectors or aliases were added
- no `nexus-ops.tsx`, graph, store, sync, backend, Supabase, API, deploy/config,
  exports, runtime token persistence, asset production apply, or layout preset
  production apply work is part of this map

Next seed:

- `V19 Warm Glass Ops Production Alias Bridge Expansion Plan`
- decide whether dedicated component aliases should be added to the production
  bridge output, remain fallback-driven, or wait for recipe-specific bridge
  stages
- keep the next step pure and Style Lab scoped unless a separate production
  gate explicitly opens runtime apply

## 26. Warm Glass Ops Production Alias Bridge Expansion

Recorded during
`20260531-v19-warm-glass-ops-production-alias-bridge-expansion`.

Selected target:

- pure Production Token Bridge output expansion for already adopted V19
  production alias families
- no new selectors, no `globals.css` changes, no production runtime apply, no
  persistence, no production shell behavior changes

Ranking summary:

- Panel/glass primitives were the safest baseline because many component
  aliases already fall back to them.
- AgentWindow, CommandPalette, modal shell, and Datapad shell were the highest
  chrome ROI because they define the rounded glass window/control/modal feel of
  Warm Glass Ops.
- Message bubbles were the highest content ROI and already had role-safe
  aliases.
- Right dock and TopBar were high-visibility shell chrome already represented
  in the Style Lab smoke harness.
- Workspace already had direct bridge coverage for background/grid/wash, but
  now also receives direct border/shadow/radius coverage through the same safe
  token derivation.

Direct bridge outputs added:

- `--nexus-panel-*`
- `--nexus-glass-*`
- `--nexus-workspace-border`
- `--nexus-workspace-shadow`
- `--nexus-workspace-radius`
- `--nexus-right-dock-*`
- `--nexus-top-bar-*`
- `--nexus-message-bubble-*`
- `--nexus-message-user-bg`
- `--nexus-message-assistant-bg`
- `--nexus-message-tool-bg`
- `--nexus-agent-window-*`
- `--nexus-command-palette-*`
- `--nexus-modal-shell-*`
- `--nexus-datapad-shell-*`

Coverage movement:

- before: 1 of 10 families directly driven; 4 of 58 adopted aliases directly
  emitted by the Bridge Plan
- after: 10 of 10 families directly driven; 58 of 58 adopted aliases directly
  emitted by the Bridge Plan
- Warm Glass Bridge Plan variable count increased from about 29 to 83

Interpretation:

- Direct Bridge output is preview/readiness output only.
- `eligibility.canApplyProduction` remains `false`.
- Runtime token persistence, production token apply, asset/background apply,
  layout preset production apply, authenticated production smoke, and
  production shell behavior remain outside this stage.

Remaining gaps toward 80:

- direct aliases do not create new production layout or recipes
- desert atelier background scene still needs an asset/background pipeline
- right metrics panel and agent card recipes still need selector-only or
  specimen-first boundaries
- segmented navigation and typography cleanup remain separate gates
- authenticated production `/` smoke remains required for live behavior-bearing
  surfaces

Next seed:

- `V19 Warm Glass Ops Direct Alias Preview Audit`
- verify whether the Style Lab token preview can demonstrate the direct alias
  Bridge Plan outputs across the Warm Glass coverage panel and production
  chrome smoke specimens without adding runtime apply or persistence

## 27. Warm Glass Ops Direct Alias Preview Audit

Recorded during
`20260531-v19-warm-glass-ops-direct-alias-preview-audit`.

Reference:

- `/Users/sean/Downloads/ChatGPT Image 2026年5月31日 下午12_15_46.png`
- read-only visual north star; not copied into the repository

Audit result:

- Direct alias bridge coverage is successful but does not equal 80 percent
  visual similarity.
- `/style-lab` showed `Bridge Vars 83`, `Direct % 100`,
  `Direct Aliases 58/58`, and `DIRECT-BRIDGE` family modes.
- Warm Glass token preview was accepted and reversible.
- Production Chrome Smoke apply/revert still worked.
- Console errors: none observed.
- Warm Glass token preview did not visually recolor the Production Chrome Smoke
  specimens. The command palette smoke specimen retained the same computed
  background, border, radius, blur, and shadow before and after token preview.

Visual score:

- `30 / 75`
- estimated visual similarity: about `40%`
- estimated readiness: about `66-70%`

Top visual gaps:

1. background scene / workspace wash preview
2. right metrics panel recipe/specimen
3. agent card/bank recipe/specimen
4. segmented top navigation specimen
5. typography and icon/button chrome polish

Selected next seed:

- `V19 Warm Glass Ops Style Lab Scene Wash Preview`

Reason:

- The reference image is mostly carried by the desert atelier scene and
  translucent glass over that scene.
- The direct alias bridge is ready, but the current Style Lab preview is still
  evidence-heavy and visually scene-poor.
- The next step should remain Style Lab only: local preview container, no
  production runtime apply, no asset/background production apply, no copied
  reference image, no remote image URL, and no persistence.

Boundaries held:

- docs-only audit
- no source changes
- no production source reads beyond the allowed style-engine and Style Lab
  context
- no production runtime, store, sync, backend, Supabase, API, asset production
  apply, or layout production apply changes

## 28. Warm Glass Ops Style Lab Scene Wash Preview

Recorded during
`20260531-v19-warm-glass-ops-style-lab-scene-wash-preview`.

Selected target:

- Style Lab-only scene/wash preview for Warm Glass Ops
- no production runtime apply
- no persistence
- no remote image URL
- no copied reference image
- no `globals.css` or production shell changes

Preview design:

- local isolated preview container
- direct Warm Glass production alias variables applied to that container
- CSS gradients approximate desert/atelier warmth and soft backlit wash
- static frosted workspace board
- static agent bank/cards
- static right metrics panel
- mini Command/Modal/Datapad chrome row
- supported / simulated-only / missing capability summary

Supported surfaces shown:

- panel/glass aliases
- workspace background/border/shadow/radius feel
- agent-window chrome aliases
- message bubble surface aliases
- command/modal/datapad shell alias direction

Simulated only:

- desert atelier scene
- agent bank/card composition
- right metrics panel composition
- segmented top-navigation mood
- command-center layout arrangement

Still missing production capability:

- asset/background pipeline
- right metrics recipe/selector boundary
- agent card recipe/selector boundary
- segmented nav recipe/selector boundary
- typography density policy
- layout preset production apply
- authenticated production `/` smoke

Browser smoke result:

- `/style-lab` loaded
- scene preview rendered
- warm gradient/background wash detected
- supported/simulated/missing summaries rendered
- Warm Glass fixture review accepted
- token preview/revert worked
- Production Chrome Smoke apply/revert still worked
- console errors: none observed

Estimate after this loop:

- Style Lab visual similarity: about `52-55%`
- readiness: about `68-72%`

Next seed:

- `V19 Warm Glass Ops Right Metrics Panel Specimen`
- create a Style Lab-only static right metrics panel specimen/recipe candidate
  using direct aliases, without touching right-dock artifact/vault persistence
  panels or production behavior

## 29. Warm Glass Ops Right Metrics Panel Recipe Specimen

Recorded during
`20260531-v19-warm-glass-ops-right-metrics-panel-recipe-specimen`.

Selected target:

- Style Lab-only right metrics panel recipe/specimen inside the Warm Glass
  scene preview
- no production right-dock panel behavior
- no persistence, store, sync, backend, Supabase, or API calls
- no `src/components/nexus/**`, `src/app/globals.css`, selectors, or runtime
  apply changes

Specimen structure:

- selected agent summary
- collaboration map
- context stack
- goal metrics bars
- run execution chrome
- memory/history block

Supported now:

- static right-side hierarchy can reuse local Warm Glass panel/glass variables
- direct alias preview can show warm glass surfaces around the metrics recipe
- Style Lab can visually compare scene, workspace, agent window, and metrics
  hierarchy together

Simulated only:

- right metrics content model
- collaboration map topology
- run execution controls
- memory/history source data
- actual right-dock panel layout and behavior

Still missing production capability:

- selector-only production right metrics boundary
- real right-dock panel recipe adoption
- store-backed data mapping
- authenticated production `/` smoke
- layout preset/page shell arrangement

Verification:

- source guard covers the right metrics specimen sections
- no document-root mutation, storage, fetch, remote URL, or production Nexus
  import was introduced
- full verification is recorded in the loop checkpoint

Estimate after this loop:

- Style Lab visual similarity: about `58-62%`
- readiness: about `70-73%`

Next seed:

- `V19 Warm Glass Ops Agent Card Bank Specimen`
- create a Style Lab-only static agent card/bank recipe specimen using current
  direct aliases, without touching production AgentWindow behavior

## 30. Warm Glass Ops Agent Card Bank Specimen

Recorded during
`20260531-v19-warm-glass-ops-agent-card-bank-specimen`.

Selected target:

- Style Lab-only agent card bank recipe/specimen inside the Warm Glass scene
  preview
- no production AgentWindow or shell behavior
- no persistence, store, sync, backend, Supabase, or API calls
- no `src/components/nexus/**`, `src/app/globals.css`, selectors, or runtime
  apply changes

Specimen structure:

- agent bank panel
- five compact agent cards
- role identity chips for Architect, Explorer, Sentinel, Auditor, and Steward
- soft initial avatar blocks
- status dot and status text
- load and queue micro-metrics
- inert add affordance

Supported now:

- static left-side agent roster hierarchy can reuse local Warm Glass
  panel/glass variables
- direct alias preview can show warm glass cards next to workspace and right
  metrics specimens
- Style Lab can visually compare the north-star left bank, central workspace,
  and right metrics composition together

Simulated only:

- agent roster data
- role identity state
- status state
- load and queue metrics
- add affordance
- actual production AgentWindow or roster behavior

Still missing production capability:

- production agent card selector/recipe boundary
- safe adoption path for real roster/card content
- store-backed agent status data
- authenticated production `/` smoke
- segmented top navigation specimen
- typography/icon/button polish

Verification:

- source guard covers the agent card bank specimen sections and roles
- no document-root mutation, storage, fetch, remote URL, or production Nexus
  import was introduced
- full verification is recorded in the loop checkpoint

Estimate after this loop:

- Style Lab visual similarity: about `63-66%`
- readiness: about `72-75%`

Next seed:

- `V19 Warm Glass Ops Segmented Top Navigation Specimen`
- create a Style Lab-only static segmented top navigation recipe specimen using
  current direct aliases, without touching TopBar controls or keyboard/action
  behavior

## 31. Warm Glass Ops Segmented Top Navigation Specimen

Recorded during
`20260531-v19-warm-glass-ops-segmented-top-navigation-specimen`.

Reference image usage:

- `/Users/sean/Downloads/ChatGPT Image 2026年5月31日 下午12_15_46.png`
  was viewed read-only
- the image was not copied, encoded, imported, or referenced as a repo/public
  asset
- visual requirements extracted: central rounded segmented nav, brighter active
  segment, soft separators, compact right-side counters, warm glass top chrome
  density

Selected target:

- Style Lab-only segmented top navigation recipe/specimen inside the Warm Glass
  scene preview
- no production TopBar behavior
- no keyboard/action/focus behavior
- no persistence, store, sync, backend, Supabase, or API calls
- no `src/components/nexus/**`, `src/app/globals.css`, selectors, routes, or
  runtime apply changes

Specimen structure:

- rounded warm glass top nav shell
- View: Panels / View: Graph / Cyberpunk / Apple / Tesla / Terminal segments
- one active segment
- soft separators
- compact Agents / Streams / Tokens / Tasks counters
- inert compact action cluster

Supported now:

- static top chrome hierarchy can reuse local Warm Glass glass variables
- direct alias preview can show scene, agent bank, workspace, right metrics,
  and top nav composition together
- Style Lab can visually compare the reference-like command-center top strip
  without touching production TopBar

Simulated only:

- segment state
- mode labels
- counter values
- icon/action cluster
- actual TopBar controls and behavior

Still missing production capability:

- production segmented nav selector/recipe boundary
- safe adoption path for behavior-bearing TopBar controls
- typography/icon/button chrome polish
- authenticated production `/` smoke
- layout preset/page shell arrangement
- asset/background production pipeline

Verification:

- source guard covers the segmented nav labels and counters
- no reference image path/import was introduced in Style Lab source
- no document-root mutation, storage, fetch, remote URL, or production Nexus
  import was introduced
- full verification is recorded in the loop checkpoint

Estimate after this loop:

- Style Lab visual similarity: about `67-70%`
- readiness: about `74-76%`

Next seed:

- `V19 Warm Glass Ops Typography Icon Button Polish Audit`
- create a Style Lab-only polish audit/specimen for type density, restrained
  icon/action chrome, and button/control recipe gaps before any production
  control adoption

## 32. Warm Glass Ops Typography Icon Button Polish Audit

Recorded during
`20260531-v19-warm-glass-ops-typography-icon-button-polish-audit`.

Reference image usage:

- `/Users/sean/Downloads/ChatGPT Image 2026年5月31日 下午12_15_46.png`
  was viewed read-only
- the image was not copied, encoded, imported, referenced as a remote URL, or
  used as a repo/public/production asset

Selected path:

- docs-only audit
- no source implementation
- no production selector adoption
- no production control primitive changes

Polish score summary:

- total polish score: `32/50`
- typography hierarchy: `3/5`
- label style / casing: `4/5`
- icon treatment: `2/5`
- button chrome: `2/5`
- active/inert affordance clarity: `3/5`
- card density: `4/5`
- metrics density: `4/5`
- segmented nav polish: `4/5`
- message/content readability: `3/5`
- overall enterprise product finish: `3/5`

Top gaps:

- restrained icon/action chrome recipe
- reusable button/input/badge visual language
- typography density policy
- active/inert/status affordance clarity
- authenticated production `/` confidence smoke

Decision:

- next seed is `V19 Warm Glass Ops Icon Button Chrome Recipe Specimen`
- implement a Style Lab-only recipe specimen before attempting production
  button/input/badge selector-first work

Reason:

- icon and button chrome are the most visible remaining polish gap
- Style Lab-only recipe work improves visual similarity with low risk
- production controls can own handlers, focus, keyboard, validation, submit,
  hover/active state, and component state, so production selector-first should
  wait for a clearer recipe and ownership scan

Verification:

- docs-only diff check passed
- diff contained only allowed docs
- no reference image file was copied into the repository

Forbidden boundaries held:

- no `src/**` changes
- no `src/app/globals.css`
- no `src/components/nexus/**`
- no package/config/deploy edits
- no store/sync/backend/Supabase/API
- no Supabase/database/migrations
- no `exports/**`
- no production runtime apply or persistence

## 33. Warm Glass Ops Icon Button Chrome Recipe Specimen

Recorded during
`20260531-v19-warm-glass-ops-icon-button-chrome-recipe-specimen`.

Reference image usage:

- `/Users/sean/Downloads/ChatGPT Image 2026年5月31日 下午12_15_46.png`
  was viewed read-only as icon/button/badge/input chrome guidance
- the image was not copied, encoded, imported, referenced as a remote URL, or
  used as a repo/public/production asset

Selected target:

- Style Lab-only icon/button/badge/input-like chrome recipe specimen inside the
  Warm Glass Scene Preview
- no production controls
- no production selectors
- no runtime apply or persistence

Specimen structure:

- compact icon controls for theme, alert, focus, and new/add actions
- primary action: `Run Execution`
- secondary action: `Sync Analysis`
- input-like command field: `Transmit mission packet`
- status badges: `Live`, `Idle`, `Syncing`, and `Local`
- active/inert affordance examples
- supported/specimen-only/missing boundary rows

Supported now:

- Style Lab can visually compare warm glass control chrome language with the
  existing scene, segmented nav, agent bank, workspace, and right metrics
  specimens
- the specimen reuses local Warm Glass glass/panel variables and existing
  lucide icon primitives already present in Style Lab

Simulated only:

- icon actions
- button states
- command input field
- badge/status state
- active/inert affordance examples

Still missing production capability:

- production button/input/badge primitive selector ownership scan
- production control aliases
- typography density policy
- authenticated production `/` smoke

Verification:

- focused Style Lab source guard covers the control chrome specimen, labels,
  icon/action cluster, and forbidden runtime boundaries
- typecheck, targeted lint, and build passed
- browser smoke confirmed the specimen and existing Warm Glass sections render
- browser smoke confirmed token preview/revert and Production Chrome Smoke
  apply/revert still work
- only observed browser network error was the known
  `https://cdn.example.com/nexus/bg-cyberpunk.webp` placeholder baseline

Estimate after this loop:

- Style Lab visual similarity: about `71-73%`
- production skinning readiness: about `76-78%`

Next seed:

- `V19 Production Control Primitive Selector-First Scan`
- rank button, input, badge, and icon-control primitives by ROI and ownership
  risk
- add selectors only if an inert visual shell exists; otherwise produce a No-Go
  extraction map

## 34. Production Control Primitive Selector-First Scan

Recorded during
`20260531-v19-production-control-primitive-selector-first-scan`.

Selected path:

- Path A selector prep

Selected target:

- AgentWindow toolbar icon-control shell in `src/components/nexus/nexus-ops.tsx`
- helper: `ToolbarIconButton`
- selector added: `nexus-control-icon-button-shell`

Why selected:

- highest ROI safe production control primitive found in the scan
- drives many AgentWindow toolbar icon controls
- close to the Warm Glass control chrome recipe specimen
- selector could be added to the existing class string without changing
  handlers, focus, keyboard, submit, validation, disabled logic, active logic,
  state, layout, or styling

Candidate ranking:

1. AgentWindow toolbar icon controls
   - selected
   - behavior ownership remains in existing props:
     `onClick`, `disabled`, `active`, and `tone`
   - selector prep is source-only and CSS-free
2. TopBar/menu action buttons and sync badge
   - high visibility
   - deferred because menu actions, retry behavior, active panel state, and
     sync status behavior are directly attached
3. AgentWindow composer input and send button
   - high visual ROI
   - deferred because form submit, keydown, focus, draft state, disabled state,
     streaming/thinking state, and command execution are coupled
4. Status badges and counters
   - useful future primitive
   - deferred because current status displays are scattered across sync, tools,
     model vault, modal, and graph surfaces
5. Command palette controls
   - deferred because focus, keyboard, input state, close behavior, and command
     execution are behavior-bearing
6. Modal controls
   - deferred because close, branch execution, busy state, validation, range
     inputs, and form state are behavior-bearing
7. Datapad controls
   - deferred because save/delete/close, draft state, focus-on-mount, drag,
     resize, and z-index ownership are behavior-bearing
8. React Flow graph controls
   - excluded because graph behavior is a standing forbidden boundary

Verification:

- focused source guard asserts the selector exists only as selector prep and
  that `ToolbarIconButton` keeps `aria-label`, `disabled`, `onClick`, `title`,
  `type`, active/default/danger branches, and disabled classes
- focused source guard asserts no control primitive CSS aliases were added to
  `src/app/globals.css`
- `git diff --check`, focused test, typecheck, targeted lint, and build passed

Browser smoke:

- `/` loaded locally but showed the Identity Gate / Global Vault auth boundary
- `.nexus-control-icon-button-shell` was not runtime-visible because
  AgentWindow UI was not rendered without an authenticated session
- observed network errors were only the known
  `https://cdn.example.com/nexus/bg-cyberpunk.webp` placeholder baseline

Readiness:

- production skinning readiness estimate: about `78-79%`
- this does not add aliases or styling, but it creates the first production
  control primitive selector boundary for a high-visibility icon-control family

Next seed:

- `V19 Production Control Primitive Badge Selector Scan`
- scan status badge/counter displays for a safe helper-level selector boundary
  before any token alias work

## 35. V19 Production Skinning Pre-Landing Consolidation

Execution checkpoint:

- `docs/style-system/execution-runs/20260531-v19-production-skinning-pre-landing-consolidation/CHECKPOINT.md`

Created docs:

- `docs/style-system/v19-production-skinning-pre-landing-consolidation.md`
- `docs/style-system/v19-warm-glass-ops-user-testing-guide.md`

Purpose:

- stop broad V19 implementation before risk rises further
- map completed skinning capabilities to real production/workspace surfaces
- separate production-adhered work from Style Lab-only specimens
- identify which bridges need user testing, authenticated smoke, recipe
  boundaries, or V20 gates

Pre-landing verdict:

- V19 is ready to enter pre-landing.
- Current readiness estimate: about `78-79%`.
- The work is closer to 80% than 60%, but remaining progress should not come
  from blind badge/status/counter selector additions.

Adhesion summary:

- production-alias / production-selector / production-wrapper:
  - RightDock rail
  - TopBar frame
  - OuterShell
  - Workspace
  - MessageBubble roles
  - AgentWindow chrome
  - CommandPalette shell
  - Modal shell
  - Datapad shell
  - ToolbarIconButton selector prep
- bridge/report:
  - Warm Glass fixture
  - V2 Render Plan
  - Production Token Bridge
  - production alias coverage report
- Style Lab-only specimens:
  - Production Chrome Smoke harness
  - Warm Glass Scene Preview
  - Right Metrics Panel specimen
  - Agent Card Bank specimen
  - Segmented Top Navigation specimen
  - Icon/Button Chrome recipe specimen

Recommended first track:

- user testing guide track

Reason:

- Style Lab is now rich enough for real design/product feedback.
- More production primitive work without feedback would raise risk faster than
  it improves readiness.

Tracks documented:

1. user testing guide
2. authenticated production smoke
3. production alias-to-workspace bridge
4. recipe boundary
5. production primitive selector
6. asset/layout gate

Explicit stop list:

- no blind badge/status/counter selector sweeps
- no right-dock artifact/vault persistence panels
- no runtime token apply
- no token persistence
- no production asset/background apply
- no layout preset production apply
- no broad `nexus-ops.tsx` refactor
- no store/sync/backend/Supabase/API work
