# R5 Stage 2 - Service Board Interactive Prototype Hardening

## Scope

R5 Stage 2 continues from R5 Stage 1 on branch `codex/v41` after commit `13816b9`.

This stage keeps the first Workspace floating product prototype narrow:

- No full Marketplace MVP.
- No payments or checkout.
- No Supabase schema, API route, or auth change.
- No standalone page.
- No `/desktop` registry wiring.

The goal is to make `service-board` behave like a clickable Workspace floating product prototype while preserving the shared floating runtime boundary.

## Implementation Summary

Updated `src/features/service-board/service-board-demo-data.ts` with local demo-state helpers:

- `ServiceBoardFilter`
- `getServiceBoardVisibleTasks`
- `resolveServiceBoardSelectedTask`
- `advanceServiceBoardTaskStatus`
- `getServiceBoardNextAction`

Updated `src/features/service-board/ServiceBoardWindow.tsx`:

- Keeps request state local to the floating window.
- Tracks a selected request.
- Resolves the selected request against the active status filter.
- Adds a selected request panel.
- Adds local-only demo actions:
  - `Shortlist best offer`
  - `Mark booked`
  - `Booking intent captured`
- Leaves the prototype seeded and non-durable.

The UI now gives the Service Board a buyer-style workflow without expanding into marketplace backend scope.

## Boundary Notes

Preserved:

- Workspace floating app registry ownership.
- `NexusOps` imports only the registry/runtime bridge, not Service Board internals.
- `/desktop` default window app registry remains unchanged.
- Auth and Supabase remain untouched.

The app still registers only through `DEFAULT_WORKSPACE_FLOATING_APPS` as `service-board`, singleton, lifecycle `demo`, archetype `marketplace-app`.

## TDD Notes

Stage 2 tests were written before production code.

Initial red command:

```bash
npm test -- src/features/service-board/ServiceBoardWindow.test.tsx
```

Expected red failures observed:

- Static Service Board markup did not contain the selected request panel.
- `getServiceBoardVisibleTasks` was not exported.
- `advanceServiceBoardTaskStatus` was not exported.

After implementation, the same command passed with 1 test file and 4 tests.

## Verification

Commands run during Stage 2:

```bash
npm test -- src/features/service-board/ServiceBoardWindow.test.tsx
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm test -- src/features/service-board src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx
npm run typecheck
npm run lint -- src/features/service-board src/runtime/floating/registry/default-floating-apps.tsx src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

Results:

- Service Board targeted test passed, 1 test file and 4 tests.
- Floating runtime and Workspace bridge tests passed, 11 test files and 22 tests.
- Service Board, registry, and launcher tests passed, 3 test files and 10 tests.
- Typecheck passed.
- Targeted lint passed.
- Production build passed with Next.js 16.2.6 and generated all 53 static pages.

## Suggested Next Stage

R5 Stage 3 should use authenticated local Workspace verification if the environment provides a valid local session:

- Launch Workspace.
- Confirm launcher renders `data-floating-app-count="8"`.
- Open `service-board` from the launcher.
- Confirm singleton refocus for Service Board.
- Confirm selected request panel renders inside the floating frame.
- Click local demo actions and inspect console logs.

If authenticated browser verification is unavailable, document the exact blocker and avoid claiming live click verification.
