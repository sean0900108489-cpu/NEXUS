# R5 Stage 1 Context

## Current State

Branch:

- `codex/v41`

Starting HEAD:

- `1daff96bde5f64d882d289e08e10361b1f0ead17`

Goal:

- Add the first real Workspace floating product prototype.

Selected product prototype:

- `service-board` / `Service Board`.

## Decision

Use an Airtasker-like service request board as a thin Workspace floating app.

This was selected because project docs already define `marketplace-app` as Airtasker/Fiverr-like, while also marking full marketplace, payments, and reviews as future/planned. A local seeded Service Board gives R5 a product-shaped prototype without opening a full Marketplace MVP.

## Boundaries

Preserved:

- Shared Workspace floating runtime boundary.
- Registry-backed launcher/open flow.
- `/desktop` default window app registry.
- Auth behavior.
- Supabase schema and API routes.

Avoided:

- Payments.
- Checkout.
- Reviews/reputation.
- Marketplace backend routes.
- Durable marketplace tables.
- Standalone page.
- Full Reddit clone or Canva editor.

## Files Changed

Feature:

- `src/features/service-board/service-board-demo-data.ts`
- `src/features/service-board/ServiceBoardStates.tsx`
- `src/features/service-board/ServiceBoardWindow.tsx`
- `src/features/service-board/index.ts`
- `src/features/service-board/ServiceBoardWindow.test.tsx`

Runtime registry/tests:

- `src/runtime/floating/registry/default-floating-apps.tsx`
- `src/runtime/floating/registry/default-floating-apps.test.tsx`
- `src/runtime/floating/react/FloatingAppLauncher.test.tsx`
- `src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts`

Docs:

- `docs/agent-runs/nexus-shared-floating-runtime-r5-stage1-2026-06-28/maps/00-stage1-summary.md`
- `docs/agent-runs/nexus-shared-floating-runtime-r5-stage1-2026-06-28/context-packs/r5-stage1-context.md`

## Test-First Notes

The first R5 tests were written before production code:

```bash
npm test -- src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts src/features/service-board/ServiceBoardWindow.test.tsx
```

Expected red result observed:

- `ServiceBoardStates` module missing.
- `service-board` absent from `DEFAULT_WORKSPACE_FLOATING_APPS`.
- `service-board` absent from registry lookup.
- Service Board feature import absent from the registry boundary.

After implementation, that targeted R5 test set passed.

## Verification

Required commands:

```bash
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm test -- src/features/service-board src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx
npm run typecheck
npm run lint -- src/features/service-board src/runtime/floating/registry/default-floating-apps.tsx src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

Results:

- `npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts`
  - Passed, 11 test files and 22 tests.
- `npm test -- src/features/service-board src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx`
  - Passed, 3 test files and 8 tests.
- `npm run typecheck`
  - Passed.
- `npm run lint -- src/features/service-board src/runtime/floating/registry/default-floating-apps.tsx src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts`
  - Passed.
- `npm run build`
  - Passed. Next.js 16.2.6 production build compiled successfully and generated all 53 static pages.
