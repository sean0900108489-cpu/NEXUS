# R5 Stage 1 - First Workspace Floating Product Prototype

## Scope

R4 is closed. R5 Stage 1 starts the first real Workspace floating product prototype on branch `codex/v41` from HEAD `1daff96bde5f64d882d289e08e10361b1f0ead17`.

This stage adds a thin, sellable-direction prototype inside the verified Workspace floating runtime.

This is not commercial readiness.

## Candidate Surface Inspection

Relevant project context inspected:

- `docs/window-os.md`
  - Describes NEXUS evolving into an AI Window OS where marketplace is a future window app category.
  - Lists marketplace future table designs but does not describe a completed Marketplace MVP.
- `docs/window-os-capabilities.md`
  - Defines `marketplace-app` as Airtasker/Fiverr-like.
  - States the current app set has no marketplace app.
  - Recommends reusing feed/request list, profiles, resources, comments, and notes-capture for a marketplace-like app.
  - Marks `marketplace`, `payments`, and `reviews` as planned.
- `docs/window-os-data-contracts.md`
  - Contains future `marketplace_tasks`, `marketplace_offers`, and marketplace API route contracts.
  - Explicitly positions those as future contracts rather than implemented backend.
- `src/features/*`
  - Existing floating/product primitives include Feed, Forum, Notes, Profiles, Artifact Library, and Global Chat.
  - No current Marketplace window implementation exists.
- `src/runtime/floating/*`
  - Shared Workspace floating registry, launcher, open-input adapter, and window manager are already verified.

## Prototype Choice

Selected prototype:

```text
Service Board
```

Kind:

```text
service-board
```

Why this candidate:

- It matches the user preference for an Airtasker-like lightweight task board / service request prototype.
- It aligns with the documented `marketplace-app` archetype without implementing full marketplace scope.
- It can reuse existing Workspace floating runtime boundaries with one registry entry and one feature folder.
- It can stay local and seeded for Stage 1, avoiding Supabase, payments, reviews, offers backend, and public marketplace routes.
- It is more product-shaped than another internal tool because it represents a buyer/provider request workflow.

Explicitly out of scope:

- Full Marketplace MVP.
- Payments or checkout.
- Reviews/reputation.
- Durable Supabase marketplace schema or API routes.
- Separate standalone page.
- `/desktop` app registration.

## Implementation Summary

Added feature folder:

```text
src/features/service-board/
```

Files:

- `service-board-demo-data.ts`
  - Seeded service request models and status counts.
- `ServiceBoardStates.tsx`
  - Loading, empty, and error states for future data-backed migration.
- `ServiceBoardWindow.tsx`
  - Thin Workspace floating app shell with seeded task cards, status filters, local request metrics, and offer summaries.
- `index.ts`
  - Feature export.

Added Workspace floating registry entry:

```json
{
  "kind": "service-board",
  "title": "Service Board",
  "scope": "account",
  "singleton": true,
  "allowMultiple": false,
  "lifecycle": "demo",
  "archetype": "marketplace-app",
  "capabilities": ["marketplace", "profiles", "comments", "search"]
}
```

The app is registered only in `src/runtime/floating/registry/default-floating-apps.tsx`.

`/desktop` behavior remains unchanged because `src/kernel/window/default-window-apps.ts` was not edited.

## Test Coverage Added

Updated:

- `src/runtime/floating/registry/default-floating-apps.test.tsx`
  - Verifies `service-board` registry membership, metadata, order, open-input conversion, and registry-bound feature import.
- `src/runtime/floating/react/FloatingAppLauncher.test.tsx`
  - Verifies the R5 launcher set renders eight apps, remains scrollable, and includes the Service Board launcher action.
- `src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts`
  - Verifies `NexusOps` still does not directly import the Service Board feature.

Added:

- `src/features/service-board/ServiceBoardWindow.test.tsx`
  - Verifies seeded service requests render.
  - Verifies empty/error states render.
  - Verifies the shell does not expose payment or checkout language.

## Verification

These commands were run after implementation:

```text
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
```

Result: passed, 11 test files and 22 tests.

```text
npm test -- src/features/service-board src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx
```

Result: passed, 3 test files and 8 tests.

```text
npm run typecheck
```

Result: passed.

```text
npm run lint -- src/features/service-board src/runtime/floating/registry/default-floating-apps.tsx src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
```

Result: passed.

```text
npm run build
```

Result: passed. Next.js 16.2.6 production build compiled successfully and generated all 53 static pages.
