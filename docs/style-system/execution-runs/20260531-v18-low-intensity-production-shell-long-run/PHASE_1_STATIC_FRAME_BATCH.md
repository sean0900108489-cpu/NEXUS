# Phase 1 Static Shell Frame Extraction Batch Checkpoint

Date: 2026-05-31
Phase: 1
Scope: static shell frame queue

## Result

No new source extraction was performed in this phase because the required
`NexusOpsBodyFrame` already existed before the long run started.

Current extracted static frames:

- `NexusOpsOuterShellFrame`
- `NexusOpsBodyFrame`
- `NexusOpsTopBarFrame`

Skipped candidates:

- `NexusOpsLeftDockFrame`
  - skipped because the same-level wrapper owns dynamic `motion.aside`
    width/collapse animation via `leftDockOpen`
- `NexusOpsWorkspaceFrame`
  - skipped because the same-level wrapper owns `workspaceRef` measurement and
    contains the `viewMode === "panels"` panel/graph conditional

## Verification

- `git diff --check`: passed
- `npm run test -- src/components/nexus/nexus-ops-body-frame.test.tsx`: passed, 1 file / 5 tests
- `npm run test -- src/components/nexus/nexus-ops-extraction-map.test.ts src/app/page.test.tsx src/components/nexus/nexus-production-page-shell-boundary.test.tsx`: passed, 3 files / 14 tests
- `npm run typecheck`: passed
- `npm run lint -- src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-ops-body-frame.tsx src/components/nexus/nexus-ops-body-frame.test.tsx src/components/nexus/nexus-ops-extraction-map.test.ts`: passed
- `npm run build`: passed

## Browser Smoke

Used existing `http://localhost:3000/` server. No second dev server was started.

Smoke result:

- NexusOps UI rendered.
- Route-edge wrapper existed and computed `display: contents`.
- `main.nexus-shell` existed.
- `NexusOpsBodyFrame` existed with class `flex min-h-0 flex-1 gap-2 p-2`.
- Body frame had two children.
- Left dock area was visible.
- Workspace area was visible.
- Graph/workspace content was visible.
- Safe workspace-menu toggle opened and closed.
- Browser console errors: 0.

Note: the first browser menu locator using `getByLabel("Workspace menu")`
returned 0 in the browser runtime even though DOM inspection showed the button
with `aria-label="Workspace menu"`. The smoke was rerun with the exact
`button[aria-label="Workspace menu"]` selector and passed.

## Boundary Check

- No source files were changed in Phase 1.
- No React Flow, drag/resize/focus/z-index, store, sync, backend, Supabase, API,
  app route, Style Lab, style-engine, package/config, deploy, migration, or
  `exports/**` files were touched.
- No push or deploy.
