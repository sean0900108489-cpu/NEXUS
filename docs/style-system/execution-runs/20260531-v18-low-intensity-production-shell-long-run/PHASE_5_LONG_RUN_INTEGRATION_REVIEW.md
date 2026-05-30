# Phase 5 - Long-Run Integration Review Gate

Date: 2026-05-31

## Scope

This phase is the final review gate for the low-intensity long run. It does not
add new runtime behavior and does not continue extraction work.

## Frames Extracted

Frames present before this long-run started:

- `NexusOpsOuterShellFrame`
- `NexusOpsBodyFrame`
- `NexusOpsTopBarFrame`

Frame extracted during this long-run:

- `NexusOpsRightFloatingDockFrame`

The newly extracted right dock frame only owns the existing static outer `nav`
and inner rail visual wrappers. The active panel state, button map, active
classes, labels, icons, titles, and event handlers remain in `RightFloatingDock`.

## Candidates Skipped

- `NexusOpsLeftDockFrame`
  - skipped because the same-level wrapper owns dynamic `motion.aside` width and
    collapse animation
- `NexusOpsWorkspaceFrame`
  - skipped because the same-level wrapper owns `workspaceRef` measurement and
    the panel/graph conditional
- collapsed sidebar rail
  - skipped because the root is a motion boundary and has side-derived visual
    state
- command palette panel
  - skipped because it owns query state, input focus, overlay close behavior,
    mouse behavior, and command execution
- settings sidebar chrome
  - skipped because it owns provider/auth/theme/artifact/memory/trace behavior
    and a fixed motion overlay
- sync badge and top menu action micro-frames
  - skipped because they are interactive controls with handlers

## Protected Core Remaining In NexusOps

Behavior core remains in `NexusOps`:

- store selectors/actions
- Supabase/sync/backend/API paths
- workspace measurement
- panel/graph mode switching
- React Flow graph/canvas behavior
- agent streaming, tool execution, and task lifecycle
- workflow runtime and handoff dispatches
- Rnd windows, drag/resize/focus/z-index behavior
- modals and overlays
- command palette execution
- right settings/provider/auth/theme panels
- import/export/save/recovery/workspace persistence

## Integration Verdict

The production shell extraction foundation is still within the intended safety
boundary:

- inert route-edge page shell wrapper remains the production route boundary
- production behavior core still lives in `NexusOps`
- extracted frames are presentation-only wrappers
- no feature placement was introduced
- no layout preset adoption was introduced
- no token application/persistence was introduced
- no store/sync/backend/Supabase/API code changed

## Token Adoption Readiness

Token adoption should not jump directly into broad shell skinning.

Reasonable next candidate:

- one already-extracted visual frame with stable class ownership, likely the
  right floating dock frame or top bar frame, behind a focused token-adoption
  spike with before/after smoke

No-Go next candidates:

- workspace wrapper token adoption beyond existing `.nexus-workspace` color
  bridge
- left dock layout/animation token adoption
- React Flow/graph styling
- window manager, modal, drag/resize/focus/z-index behavior
- command palette behavior or execution

## Layout Alignment Readiness

The pure layout/page shell boundary and isolated prototype remain useful for
future planning, but this run did not consume them in production.

Next layout work should be assessment-first unless a wrapper is already inert
and presentation-only. Do not connect layout presets or feature registry to the
production shell yet.

## Performance Risk

No meaningful runtime performance risk was added:

- one small presentation component was added
- no hooks/effects/listeners were added
- no state was added
- no render plan or token bridge was applied to production
- no workspace store writes were added

## Verification

Final sequential verification completed:

- `git diff --check` passed
- `npm run typecheck` passed
- `npm run build` passed
- browser smoke `/` completed with scope note below

`/style-lab` smoke was skipped because this long-run did not touch Style Lab.

## Browser Smoke Expectations

- local NexusOps UI renders
- route-edge wrapper remains present where inspectable
- `main.nexus-shell` remains present
- body/top/right dock shell frames are represented by their preserved visual
  classes
- workspace area remains visible
- workspace menu toggles safely
- right dock toggle opens/closes a panel
- no visible hydration/error overlay
- no obvious layout shift

## Browser Smoke Result

Phase 4 completed a NexusOps UI smoke against the existing
`http://localhost:3000/` dev server before this final docs-only review:

- local NexusOps UI rendered
- workspace area remained visible
- workspace menu toggled open/closed
- right floating dock remained visible
- right dock Providers toggle opened/closed the right panel
- no visible hydration/error overlay
- no obvious layout shift

During the final Phase 5 smoke, a reload of `http://localhost:3000/` landed on
the local auth gate because the local session was not available after reload.
The auth gate rendered without a visible hydration/error overlay. I did not log
in or submit credentials, to avoid mutating auth/session state or reading
secrets. Since no source files changed between the Phase 4 NexusOps smoke and
this Phase 5 docs-only review, the Phase 4 smoke remains the NexusOps UI smoke
for this source state.

## Stop Condition

Stop after this review gate. Do not continue into token adoption, layout preset
adoption, feature placement, command palette extraction, workspace extraction,
React Flow extraction, window/modal extraction, or deeper shell refactor in this
round.
