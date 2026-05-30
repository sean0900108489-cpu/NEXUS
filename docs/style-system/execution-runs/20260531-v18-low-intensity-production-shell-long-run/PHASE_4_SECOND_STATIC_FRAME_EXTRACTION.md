# Phase 4 - Optional Second Static Frame Extraction

Date: 2026-05-31

## Scope

This phase extracted one second-level inert visual frame:

- `NexusOpsRightFloatingDockFrame`

No other second-level frames were extracted.

## Exact Wrapper Extracted

Source anchor before extraction:

- `src/components/nexus/nexus-ops.tsx:2445`

The extracted frame owns only:

- the right dock outer `nav`
- the existing static `aria-label`
- the existing pointer-event, fixed-position, z-index, and visibility classes
- the existing inner rail `div` classes

The following remained in `RightFloatingDock`:

- `rightDockPanels.map`
- active panel state checks
- button class branching
- labels/titles/icons
- `onClick` handlers

## Files Changed

- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-ops-right-floating-dock-frame.tsx`
- `src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx`
- `src/components/nexus/nexus-ops-extraction-map.test.ts`
- `docs/style-system/production-shell-extraction-map-v1.md`
- `docs/style-system/execution-runs/20260531-v18-low-intensity-production-shell-long-run/PHASE_STATUS.md`
- `docs/style-system/execution-runs/20260531-v18-low-intensity-production-shell-long-run/CHECKPOINTS.md`
- this checkpoint

## Verification

Sequential verification completed:

- `git diff --check` passed
- `npm run test -- src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx`
  passed: 1 file / 5 tests
- `npm run test -- src/components/nexus/nexus-ops-extraction-map.test.ts src/app/page.test.tsx src/components/nexus/nexus-production-page-shell-boundary.test.tsx`
  passed: 3 files / 14 tests
- `npm run typecheck` passed
- `npm run lint -- src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-ops-right-floating-dock-frame.tsx src/components/nexus/nexus-ops-right-floating-dock-frame.test.tsx src/components/nexus/nexus-ops-extraction-map.test.ts`
  passed
- `npm run build` passed

## Browser Smoke

Completed against existing `http://localhost:3000/` dev server.

Results:

- local NexusOps UI renders in existing Chrome session
- workspace area remains visible
- right floating dock remains visible
- workspace menu toggles open/closed
- right dock Providers toggle opens/closes the right panel
- no visible hydration/error overlay
- no obvious layout shift during smoke

Notes:

- A temporary headless Chrome CDP smoke verified the route-edge wrapper on the
  local route, but it could not reach the authenticated NexusOps UI because the
  temporary profile had no session. It was stopped after the check.
- Existing user Chrome session was used for NexusOps UI smoke to avoid starting
  another dev server or mutating workspace data.

## Forbidden Boundaries Held

- No React Flow changes
- No workspace wrapper extraction
- No left dock extraction
- No window/modal/drag/resize/focus/z-index behavior changes
- No store/sync/backend/Supabase/API changes
- No Style Lab or style-engine changes
- No package/config/deploy changes
- No feature placement or layout preset adoption

## Stop Condition

Stop after this single second-level frame extraction. Do not continue into
command palette, settings sidebar, window manager, React Flow, feature
placement, layout preset adoption, token adoption, or registry work in this
round.
