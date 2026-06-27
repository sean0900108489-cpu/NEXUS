# R2 Shared Floating Runtime Context Pack

## What This Run Produced

R2 produced a shared floating runtime boundary plan.

Run folder:

`docs/agent-runs/nexus-shared-floating-runtime-boundary-plan-2026-06-27-r2/`

Files:

- `maps/00-executive-summary.md`
- `maps/10-boundary-map.md`
- `plans/20-migration-plan.md`
- `plans/30-test-and-risk-plan.md`
- `context-packs/r2-shared-floating-runtime-context.md`

## Decision

Use an adapter-first shared runtime.

Do not copy `/desktop` directly into Workspace. Do not keep two permanent runtimes. Do not start with sandbox. Do not migrate agent windows first.

## Recommended R3

R3 should implement the smallest registry bridge into Workspace:

1. Create `src/runtime/floating/` with shared types, layout/lifecycle helpers, app registry, React frame/manager, and host adapters.
2. Add pure tests for layout, lifecycle, and registry.
3. Add a Workspace host adapter that can manage registry windows without changing existing agent windows.
4. Mount a `FloatingWindowManager` in the Workspace stage.
5. Open one low-risk pilot app from the registry.
6. Keep `/desktop` explicit and experimental.

Recommended pilot app:

- `developer-inspector` for lowest business-data risk, or
- `feed` for a product-like local-only primitive.

Avoid first:

- `sandbox`, because it is still coupled to `NexusAgent`.
- agent/chat/media windows, because they are core Workspace behavior.

## Future Target Source Layout

```text
src/runtime/floating/
  core/
    floating-window-types.ts
    floating-window-layout.ts
    floating-window-lifecycle.ts
    floating-window-store-contract.ts
  registry/
    floating-app-types.ts
    floating-app-registry.ts
    default-floating-apps.ts
  react/
    FloatingWindowFrame.tsx
    FloatingWindowManager.tsx
    FloatingWindowErrorBoundary.tsx
  adapters/
    workspace-floating-host.ts
    desktop-floating-host.ts
  index.ts
```

## Critical Constraints

- Workspace is the product mainline.
- `/desktop` remains POC/staging.
- Capability metadata is metadata-only.
- Persistence is host-adapted.
- Generic runtime model must include `previousLayout`.
- Runtime frame owns generic window controls; app-specific toolbars stay in app content.
- Before any Next.js code changes, read relevant docs under `node_modules/next/dist/docs/` per root `AGENTS.md`.

## Verification Status

This run changed documentation only.

- No source runtime files changed.
- No tests were run.
- No typecheck/build was run.
- No DB migration was made.
- No browser smoke was performed.

## Suggested Commit Message

```text
v42 planning: shared floating runtime boundary
```

