# Workspace Layout Slot / Page Shell Boundary Foundation V1

Status: pure contract foundation
Branch: `codex/v18-style-pack-contract-prep`
Scope: stable layout slot IDs, page shell intent, validator, fixtures, and Style
Lab review panel only

## 1. Purpose

This foundation creates a safe boundary for future layout-adjacent work such as
left/right panel swap intent, top/bottom region swap intent, page shell
selection, and feature mounting. It does not modify production shell layout.

The boundary is intentionally declarative. It can describe slot arrangement
intent, but it cannot own pixel layout, component imports, routes, persistence,
React Flow behavior, drag/resize, focus, z-index, or workspace state.

## 2. Stable Slot IDs

The pure registry defines these stable slots:

- `home`
- `workspace`
- `topBar`
- `leftSidebar`
- `rightInspector`
- `mainCanvas`
- `bottomBar`
- `floatingWindows`
- `commandPalette`
- `settings`
- `styleLab`

Each slot is registered as visual-token-only and production-behavior-protected.
The registry does not contain component paths, dynamic imports, routes, or
store keys.

## 3. Regions And Page Shell Intent

Allowed semantic regions:

- `top`
- `left`
- `main`
- `right`
- `bottom`
- `floating`

Allowed page shell intents:

- `home`
- `workspace`
- `settings`
- `styleLab`

Allowed arrangements:

- `default-workspace`
- `left-right-swapped`
- `top-bottom-swapped`
- `home-shell`
- `workspace-shell`
- `settings-shell`
- `style-lab-shell`

These names are intent only. They do not reparent production DOM or mutate
`NexusOps`.

## 4. Validator Allows

The validator accepts:

- default workspace slot arrangement
- left/right swapped intent where `rightInspector` is on the left and
  `leftSidebar` is on the right
- top/bottom swapped intent where `bottomBar` is in the top region and
  `topBar` is in the bottom region
- home, workspace, settings, and Style Lab page shell intents
- empty side regions for page-shell-only fixtures
- compatibility with `workspace-layout-slot-boundary-v1`
- fallback that rejects protected fields and returns to default workspace

Accepted review output returns only a summary and the validated preset for
Style Lab display. It still marks production layout as blocked.

## 5. Validator Rejects

The validator rejects:

- raw CSS and CSS-like declarations
- JavaScript and executable strings
- DOM selectors
- behavior classes
- arbitrary component paths
- dynamic imports or import paths
- route mutation or href authority
- pixel-perfect layout commands such as `width`, `height`, `px`, `vh`, or `vw`
- positioning, overflow, pointer-events, and z-index authority
- drag, resize, focus, keyboard, or ARIA authority
- React Flow behavior fields such as node drag, pan, zoom, connect, or delete
- store, sync, backend, Supabase, localStorage, IndexedDB, or workspace state
  fields
- unknown regions, unknown slots, duplicate slots, or arrangement mismatches

Rejected review output never returns the rejected preset payload.

## 6. Style Lab Boundary Panel

Style Lab now contains an isolated Layout Boundary panel. It can:

- load default, left/right swapped, top/bottom swapped, settings page shell, and
  invalid unsafe fixtures
- review pasted layout preset JSON
- show accepted/rejected status
- show a redacted issue report
- show a slot arrangement specimen

The panel does not write workspace state, sync, backend, Supabase, exports, or
production layout. It also does not affect V2 Skin Pack token preview, bridge
preview, or specimen gallery behavior.

## 7. Production Boundary

Production shell files remain read-only for this foundation. In particular:

- `src/app/page.tsx` still renders `NexusOps` through the existing style runtime
  provider
- `src/components/nexus/nexus-ops.tsx` layout behavior is unchanged
- React Flow behavior is unchanged
- drag/resize/focus/z-index/agent logic is unchanged
- workspace layout, sizing, scroll, and canvas behavior are unchanged

## 8. Next Path

The next implementation path should stay phase-gated:

1. Expand Style Lab layout specimens for home/workspace/settings/page shell
   parity.
2. Add a pure feature registry that maps approved feature IDs to approved slot
   IDs without component paths or dynamic imports.
3. Add an isolated page shell specimen that consumes the pure registry.
4. Only after separate approval, introduce a production page shell boundary
   wrapper that preserves existing `NexusOps` behavior and is easy to revert.

Production adoption must remain blocked until the page shell boundary has
explicit tests for keyboard/focus, React Flow, drag/resize, workspace state,
and route behavior.
