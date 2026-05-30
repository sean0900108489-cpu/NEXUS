# NexusOps Static Shell Frame Extraction Batch Checkpoint

Date: 2026-05-31
Branch: `codex/v18-style-pack-contract-prep`
Starting HEAD: `ecb94b7 feat: extract nexus ops outer shell frame`

## Scope

This round extracted the first same-level static visual shell frame after the
outer shell frame. It did not perform production shell refactor, behavior
extraction, feature placement, layout preset adoption, token adoption, or
registry/contract expansion.

## Frames Extracted

- `NexusOpsBodyFrame`
  - Extracted the original body row wrapper:
    `<section className="flex min-h-0 flex-1 gap-2 p-2">`.
  - The frame accepts only `children`.
  - Child order is unchanged: left dock area first, workspace area second.
  - The frame has no hooks, effects, event handlers, prop spreading, style
    mutation, store/sync/backend/Supabase imports, React Flow imports, window
    manager imports, or style-engine imports.

## Frames Skipped

- `NexusOpsLeftDockFrame`
  - Skipped because the same-level left dock wrapper is a dynamic
    `motion.aside` with `animate={{ width: leftDockOpen ? 266 : 44 }}` and
    collapse animation ownership.
  - Extracting it in this round would require behavior props or moving animation
    semantics.

- `NexusOpsWorkspaceFrame`
  - Skipped because the same-level workspace wrapper owns `ref={workspaceRef}`
    measurement and contains the panel/graph conditional.
  - Extracting it as a children-only frame would move measurement or behavior
    authority.

## Files Changed

- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-ops-body-frame.tsx`
- `src/components/nexus/nexus-ops-body-frame.test.tsx`
- `src/components/nexus/nexus-ops-extraction-map.test.ts`
- `docs/style-system/production-shell-extraction-map-v1.md`
- `docs/style-system/execution-runs/20260531-nexusops-static-shell-frame-extraction-batch/CHECKPOINT.md`

## Verification

- `git diff --check`: passed
- `npm run test -- src/components/nexus/nexus-ops-body-frame.test.tsx`: passed, 1 file / 5 tests
- `npm run test -- src/components/nexus/nexus-ops-outer-shell-frame.test.tsx src/components/nexus/nexus-ops-extraction-map.test.ts src/app/page.test.tsx src/components/nexus/nexus-production-page-shell-boundary.test.tsx`: passed, 4 files / 19 tests
- `npm run typecheck`: passed
- `npm run lint -- src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-ops-body-frame.tsx src/components/nexus/nexus-ops-body-frame.test.tsx src/components/nexus/nexus-ops-extraction-map.test.ts`: passed
- `npm run build`: passed

## Browser Smoke

Used the existing `http://localhost:3000/` dev server. No second server was
started and no server was stopped.

Smoke result:

- NexusOps UI rendered.
- Route-edge boundary existed and computed `display: contents`.
- `main.nexus-shell` still existed with the original class.
- `NexusOpsBodyFrame` rendered as a direct child of `main.nexus-shell` with
  class `flex min-h-0 flex-1 gap-2 p-2`.
- Body frame kept two children: left dock area first, workspace area second.
- Left dock/sidebar area was visible.
- Workspace area was visible.
- Graph/workspace content was visible.
- Safe workspace-menu toggle opened and closed.
- Browser console errors: 0.
- No hydration error or obvious layout shift was observed.

## Forbidden Boundaries Held

- Did not modify `src/components/nexus/nexus-graph.tsx`.
- Did not modify `src/app/**`.
- Did not modify Style Lab or style-engine files.
- Did not modify store, sync, backend, Supabase, API, package/config/migration
  files, or `exports/**`.
- Did not modify window/modal/drag/resize/focus/z-index behavior files.
- Did not add registry or contract files.
- Did not push or deploy.

## Stop Condition

Stop after this static frame batch.

Do not continue into behavior extraction, React Flow, window manager, feature
placement, layout preset adoption, token adoption, or registry work in this
round.
