# First NexusOps Outer Visual Shell Frame Extraction Checkpoint

Date: 2026-05-31
Branch: `codex/v18-style-pack-contract-prep`
Starting HEAD: `467d646 docs: add production shell extraction map`

## Scope

This round performed the first minimal production shell extraction. It extracted
only the outer visual shell frame from `NexusOps`.

This is not an inner shell extraction, React Flow extraction, window manager
extraction, feature placement change, layout preset adoption, registry
consumption, token adoption, or production behavior refactor.

## Exact Wrapper Extracted

Extracted the original outer wrapper:

```tsx
<main className="nexus-shell flex h-dvh min-h-0 flex-col overflow-hidden text-slate-100">
  {children}
</main>
```

into `NexusOpsOuterShellFrame`.

The new wrapper:

- accepts only `children`
- preserves the existing `nexus-shell` class string
- has no hooks, effects, event handlers, prop spreading, style mutation, or
  behavior props
- imports no store, sync, backend, Supabase, React Flow, Rnd, window manager, or
  style-engine registry modules

`NexusOps` still owns all hooks, state, effects, handlers, store selectors,
React Flow wiring, windows, modals, drag/resize/focus/z-index behavior, sync,
backend, and Supabase paths.

## Files Changed

- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-ops-outer-shell-frame.tsx`
- `src/components/nexus/nexus-ops-outer-shell-frame.test.tsx`
- `src/components/nexus/nexus-ops-extraction-map.test.ts`
- `docs/style-system/production-shell-extraction-map-v1.md`
- `docs/style-system/execution-runs/20260531-first-nexusops-outer-shell-frame-extraction/CHECKPOINT.md`

## Verification

- `git diff --check`: passed
- `npm run test -- src/components/nexus/nexus-ops-outer-shell-frame.test.tsx`: passed, 1 file / 5 tests
- `npm run test -- src/components/nexus/nexus-ops-extraction-map.test.ts`: passed, 1 file / 4 tests
- `npm run test -- src/app/page.test.tsx src/components/nexus/nexus-production-page-shell-boundary.test.tsx`: passed, 2 files / 10 tests
- `npm run typecheck`: passed
- `npm run lint -- src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-ops-outer-shell-frame.tsx src/components/nexus/nexus-ops-outer-shell-frame.test.tsx src/components/nexus/nexus-ops-extraction-map.test.ts`: passed
- `npm run build`: passed

## Browser Smoke

Used the existing `http://localhost:3000/` dev server. No second server was
started and no server was stopped.

Smoke result:

- existing NexusOps UI rendered
- route-edge page shell boundary existed
- route-edge boundary computed `display: contents`
- `main.nexus-shell` existed with the original class string
- workspace and panel surfaces rendered
- a safe workspace-menu toggle opened and closed without workspace data mutation
- browser console errors: 0
- no hydration error was observed
- no obvious layout shift was observed

## Forbidden Boundaries Held

- Did not modify `src/components/nexus/nexus-graph.tsx`.
- Did not modify window/modal/drag/resize/focus/z-index components.
- Did not modify store, sync, backend, Supabase, API, package/config/migration
  files, or `exports/**`.
- Did not modify `src/app/page.tsx`.
- Did not modify Style Lab.
- Did not add or consume style-engine registry/contract files.
- Did not push or deploy.

## Stop Condition

Stop after outer shell frame extraction.

Do not continue into inner shell extraction, React Flow, windows, feature
placement, layout preset adoption, token adoption, or `NexusOps` behavior
refactor in this round.
