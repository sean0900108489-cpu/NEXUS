# R5 Stage 7 Context

## Current State

Branch:

- `codex/v41`

Stage intent:

- Bring the new shared Workspace floating windows closer to the older
  `AgentWindow` / sandbox chat window behavior.
- Prioritize drag and resize parity.
- Keep the shared floating runtime boundary intact.

## Work Completed

Geometry helpers:

- Added bounds-aware drag calculations.
- Added `shouldStartFloatingWindowResize`.
- Added `calculateFloatingWindowResizeGeometry`.
- Added resize direction support for all edges and corners.
- Added min-size and host-bounds clamp behavior.

React chrome:

- `FloatingWindowFrame` now receives host `bounds`.
- The root frame exposes `data-bounds-width` and `data-bounds-height`.
- Eight accessible resize handles are rendered when the window is not
  maximized.
- Resize handle selectors use `data-resize-direction`.
- North/west handles update both size and position.
- South/east handles update size while preserving the opposite edge.
- Locking the window blocks both drag and resize.
- Maximized windows still hide resize handles and block drag/resize.

Runtime manager:

- `FloatingWindowManager` passes `host.getBounds()` into each frame.

## Behavioral Notes

The implementation stays custom rather than switching to `react-rnd` in this
stage. This keeps the existing shared runtime adapter boundary stable while
closing the largest UX gap.

The old `AgentWindow` still uses `react-rnd`; this stage selectively ports the
important behavior into the shared runtime:

- host bounds
- min size
- z-index via existing focus flow
- drag handle
- all-edge resize handles
- iframe interaction shield

## Verified

Automated tests cover:

- bounds-clamped dragging
- resize gate behavior
- all-edge/corner resize geometry
- min-size clamp
- bounds clamp
- frame markup for all resize handles
- manager propagation of host bounds

Live smoke covered:

- Web App Host iframe rendering with a temporary localhost external app.
- East resize.
- West resize.
- Southeast bounds clamp.
- Negative drag bounds clamp.
- Absence of forbidden runtime console patterns.

## Not Done

- No layout persistence beyond the current runtime adapter state.
- No touch/mobile gesture-specific tests.
- No migration to `react-rnd`.
- No backend or bridge changes.
- No product app changes.

## Recommended Next Step

If more parity is needed, the next focused stage should add durable per-user
layout persistence for Workspace floating apps, with explicit storage scope and
tests. Keep it separate from auth/API/storage bridge work.
