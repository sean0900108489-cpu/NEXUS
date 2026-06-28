# R5 Stage 2 Context

## Current State

Branch:

- `codex/v41`

Previous R5 commit:

- `13816b9 feat: add r5 service board prototype`

Stage 2 target:

- Harden the `service-board` Workspace floating product prototype with local interactive behavior.

## Product Scope

Still in scope:

- A seeded, Airtasker-like service request board.
- Local request filtering.
- Local selected request panel.
- Local status advancement for prototype workflow validation.
- Workspace floating runtime integration.

Still out of scope:

- Full Marketplace MVP.
- Payments or checkout.
- Reviews, reputation, provider onboarding.
- Supabase marketplace tables or API routes.
- Standalone marketplace page.
- `/desktop` registration.

## Files Changed

Feature:

- `src/features/service-board/service-board-demo-data.ts`
- `src/features/service-board/ServiceBoardWindow.tsx`
- `src/features/service-board/ServiceBoardWindow.test.tsx`

Docs:

- `docs/agent-runs/nexus-shared-floating-runtime-r5-stage2-2026-06-28/maps/00-stage2-summary.md`
- `docs/agent-runs/nexus-shared-floating-runtime-r5-stage2-2026-06-28/context-packs/r5-stage2-context.md`

## Behavior Added

The Service Board now:

- Shows a selected request panel.
- Resolves selection against the current filter.
- Lets a user locally move an open request to `shortlisted`.
- Lets a user locally move a shortlisted request to `booked`.
- Shows `Booking intent captured` once the selected request is booked.

All actions are in-memory only and scoped to the current floating window session.

## Test-First Notes

The Stage 2 red test command was:

```bash
npm test -- src/features/service-board/ServiceBoardWindow.test.tsx
```

Red failures confirmed the missing behavior:

- No `Selected request` panel in the static markup.
- Missing `getServiceBoardVisibleTasks` helper.
- Missing `advanceServiceBoardTaskStatus` helper.

Green result after implementation:

- 1 test file passed.
- 4 tests passed.

## Verification Run Before Push

Run:

```bash
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm test -- src/features/service-board src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx
npm run typecheck
npm run lint -- src/features/service-board src/runtime/floating/registry/default-floating-apps.tsx src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

Results:

- Floating runtime and Workspace bridge tests passed, 11 test files and 22 tests.
- Service Board, registry, and launcher tests passed, 3 test files and 10 tests.
- Typecheck passed.
- Targeted lint passed.
- Production build passed.

## Recommended Next Stage

R5 Stage 3 should be authenticated local Workspace click verification for the eight-app launcher:

- Verify `[data-floating-app-launcher="workspace"]`.
- Verify `data-floating-app-count="8"`.
- Verify narrow viewport horizontal scroll.
- Open `service-board` from the launcher.
- Confirm singleton refocus for `service-board`.
- Confirm the selected request panel appears inside the floating app.
- Click the local demo workflow actions.
- Inspect console logs for new errors, update-depth loops, or runtime state regressions.

Do not claim live click verification unless an authenticated browser/session is actually used.
