# NEXUS Window And Modal Recipe System

Phase: V9 - Window And Modal Recipe System
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Status: partially implemented isolated Style Lab static specimens. No production window/modal, Agent Window, Datapad, Prompt Vault, or command palette code changed.

## Implementation Evidence

- `src/components/style-engine/nexus-style-lab.tsx` includes specimen-only static Modal and Window visual shells inside the isolated Style Lab primitive specimen gallery.
- The Modal specimen has no `role="dialog"`, `aria-modal`, focus trap, close handler, fixed overlay, z-index tier, backend save, or persistence behavior.
- The Window specimen has no drag handle class names, `draggable`, resize enablement, bounds, z-index state, focus/close handlers, sandbox interaction lock, or `react-rnd` usage.
- The Agent Chrome specimen is visual-only and does not modify `nexus-ops.tsx`, `AgentWindow`, `react-rnd`, `motion`, `nexus-agent-window`, `nexus-drag-handle`, toolbar handlers, focus/minimize/close behavior, z-index/layering, resize/drag behavior, or sandbox locks.
- The Datapad shell specimen is visual-only and does not modify `DatapadWindow`, `react-rnd`, store hooks, drag handles, bounds, layer state, save/delete handlers, draft persistence, or sync behavior.
- The Prompt Vault specimen is visual-only and does not modify `PromptVaultManager`, `motion`, fixed overlays, z-index tiers, scroll ownership, edit/copy/delete handlers, close behavior, clipboard calls, store hooks, or Supabase/backend flows.
- The Command Palette specimen is a visual-only shell with no keyboard shortcut handling, filtering logic, command execution, focus behavior, close behavior, fixed overlay, or z-index tier change.
- The recommended migration-order visual targets are now represented as isolated Style Lab specimens for Modal, Window, Command Palette, Datapad shell, Prompt Vault surface, and Agent Window chrome. Production visual migration has not started.
- Production surfaces such as `src/components/nexus/nexus-ops.tsx`, `DatapadWindow`, `PromptVaultManager`, `AgentBranchModal`, and command palette behavior remain untouched.

## 0. Purpose

This document defines the visual recipe boundary for windows, modals, overlays,
and command surfaces.

It exists because windows and modals look like style targets but carry critical
behavior:

- drag
- resize
- z-index stacking
- focus/close behavior
- keyboard behavior
- scroll containment
- save/delete lifecycle
- auth/secret workflows

## 1. Current Window And Modal Anchors

| Surface | Anchor | Behavior to protect |
| --- | --- | --- |
| Agent window | `src/components/nexus/nexus-ops.tsx:4797` | react-rnd drag/resize/focus/z-index/sandbox lock. |
| Agent window shell | `src/components/nexus/nexus-ops.tsx:4970` | Window surface/chrome visual. |
| Agent drag handle | `src/components/nexus/nexus-ops.tsx:4997` | `nexus-drag-handle`; drag-only handle. |
| Sandbox canvas | `src/components/nexus/nexus-ops.tsx:5130` | iframe/split/interaction lock. |
| Datapad window | `src/components/nexus/DatapadWindow.tsx:89` | react-rnd bounds, drag handle, z-index, save/delete. |
| Datapad shell | `src/components/nexus/DatapadWindow.tsx:97` | Datapad surface visual. |
| Datapad handle | `src/components/nexus/DatapadWindow.tsx:98` | `datapad-drag-handle`; drag-only handle. |
| Prompt vault modal | `src/components/nexus/PromptVaultManager.tsx:126` | fixed overlay, edit/copy/delete, scroll regions. |
| Branch modal | `src/components/nexus/AgentBranchModal.tsx:108` | topmost emergency modal, `aria-modal`, `role=dialog`. |
| Macro composer modal | `src/components/nexus/nexus-ops.tsx:2871` | modal form and save flow. |
| Command palette | `src/components/nexus/nexus-ops.tsx:6389` | keyboard open/close, fixed overlay. |

## 2. Recipe Groups

### `recipe.window`

Visual slots:

- `surface`
- `bodySurface`
- `chromeSurface`
- `chromeBorder`
- `chromeText`
- `border`
- `shadow`
- `radius`
- `handleVisual`
- `resizeVisual`
- `focusGlow`

Allowed:

- color
- border color
- shadow
- radius
- blur
- text color
- static decorative accents

Forbidden:

- `bounds`
- `dragHandleClassName`
- `disableDragging`
- `enableResizing`
- `onDragStart`
- `onDragStop`
- `onResizeStop`
- `zIndex`
- sandbox interaction lock
- pointer-events

### `recipe.modal`

Visual slots:

- `backdrop`
- `surface`
- `border`
- `shadow`
- `radius`
- `headerSurface`
- `titleText`
- `bodyText`
- `footerSurface`
- `dangerCallout`
- `focusRing`

Allowed:

- overlay color/opacity
- backdrop blur
- surface color
- border/shadow/radius
- text/status colors

Forbidden:

- z-index tier changes
- focus trap behavior
- `role`
- `aria-modal`
- close key handling
- click-outside behavior
- scroll region ownership

### `recipe.commandPalette`

Visual slots:

- `overlay`
- `surface`
- `input`
- `itemDefault`
- `itemHover`
- `itemActive`
- `icon`
- `emptyState`

Forbidden:

- keyboard shortcut handling
- filtering logic
- command execution
- focus behavior

## 3. Z-Index Ladder Is Protected

Current overlay/window z-index usage is functional and must not be style-pack
controlled.

Known tiers:

- workspace/content baseline
- graph overlay buttons around `z-10`
- minimized rail around `z-[50]`
- sidebar toggles around `z-[70]`
- workspace menu around `z-[90]`
- prompt vault/sidebar around `z-[120]`
- floating dock around `z-[130]`
- macro modal around `z-[140]`
- command palette around `z-[999]`
- branch modal around `z-[9999]`

Rule:

Style Engine recipes may not choose arbitrary z-index values. Future z-index
changes require a separate behavior architecture decision.

## 4. Scroll Containment Is Protected

Current scroll classes such as `cyber-scroll`, `overflow-y-auto`,
`overscroll-contain`, `min-h-0`, and fixed viewport sizing are layout behavior.

Recipes may style scrollbars later, but must not:

- move scroll ownership
- remove `min-h-0`
- turn modal contents into body scroll
- alter root `overflow-hidden`
- break textarea resize/scroll behavior

## 5. Migration Order

Recommended future order:

1. Static `NexusModal` specimen.
2. Static `NexusWindow` specimen.
3. Command palette visual specimen.
4. Datapad shell visual-only migration.
5. Prompt vault surface visual-only migration.
6. Agent window chrome visual-only migration.

Current run status:

- Steps 1-6 have isolated Style Lab visual specimens.
- Production visual migration for steps 4-6 remains closed until a separate
  behavior-protected gate is opened.

Do not start with:

- agent window react-rnd wrapper
- z-index changes
- branch modal emergency flow
- provider vault secret UI
- sandbox iframe/split behavior

## 6. Browser Smoke For Future Changes

Window changes:

- agent window drags only from handle
- agent window resizes and persists geometry
- focused window comes forward
- sandbox lock/unlock still controls embedded interaction
- datapad drags, saves, deletes, and layers

Modal changes:

- prompt vault opens, edits, copies, deletes, closes
- branch modal stays topmost and branch actions still work
- command palette opens/closes with keyboard and close button
- macro modal saves/cancels
- modal content scrolls internally
- body does not scroll

## 7. Acceptance Gate

V9 recipe doc passes when:

- Window and modal visual slots are defined.
- Drag/resize/z-index/focus/scroll behavior is protected.
- Migration order avoids critical behavior first.
- Browser smoke requirements are documented.
- No runtime component, CSS, schema, package, deploy, or `exports/**` files are changed.
