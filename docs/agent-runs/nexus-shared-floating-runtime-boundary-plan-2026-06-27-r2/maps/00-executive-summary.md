# R2 Shared Floating Runtime Boundary Plan - Executive Summary

## Run Position

This run advances the corrected NEXUS roadmap into R2: design the shared floating runtime boundary before implementation.

R2 is a planning packet only. It does not move source files, rewrite `NexusOps`, remove `/desktop`, add DB migrations, or implement the registry bridge.

Inputs:

- Corrected product direction from `nexus_obsidian_vault/`.
- R1 inventory from `docs/agent-runs/nexus-current-system-intelligence-2026-06-27-r1-floating-runtime/`.
- Existing Workspace shell and `/desktop` proof-of-concept source evidence.

## Product Rule

NEXUS remains Workspace-first.

The shared floating runtime should let Workspace host future apps through a stable runtime and registry path. `/desktop` remains a capability sandbox and staging surface. It should contribute kernel ideas and reusable code, not become the default product shell.

## Approaches Considered

### Approach A - Move `/desktop` Kernel Into Workspace Directly

Copy or import `src/kernel/window/*` into `NexusOps` and render `WindowManager` in the Workspace stage.

Pros:

- Fastest path to seeing registry apps inside Workspace.
- Reuses existing `WindowFrame`, `WindowManager`, and `window-store`.

Cons:

- High risk of forcing `/desktop` assumptions onto Workspace.
- LocalStorage layout persistence conflicts with Workspace IndexedDB/Zustand persistence.
- Current `WindowFrame` has weaker maximize restore semantics than Workspace agent windows.
- Likely grows `NexusOps` instead of reducing its responsibility.

Decision: rejected as the primary plan.

### Approach B - Adapter-First Shared Runtime

Extract a shared runtime contract that supports both hosts, then attach Workspace and `/desktop` through host adapters.

Pros:

- Preserves Workspace visual language and shell ownership.
- Lets Workspace keep its existing agent/datapad state until migration is safe.
- Lets `/desktop` continue as POC while using the same lower-level runtime concepts.
- Creates a clean R3 path for registry bridge without a big-bang rewrite.

Cons:

- Slower than direct copy.
- Requires carefully defining contracts before source movement.
- First implementation phase will still have compatibility adapters.

Decision: recommended.

### Approach C - Leave Runtimes Separate And Only Share App Registry

Keep Workspace `AgentWindow` and `/desktop` `WindowFrame` independent, but let both import a shared app registry.

Pros:

- Lowest immediate implementation risk.
- Avoids touching drag/resize/focus behavior.

Cons:

- Keeps duplicated lifecycle, layout, and persistence rules.
- Does not solve R1's two-runtime risk.
- Registry alone cannot handle minimize, bounds, restore, or layout persistence.

Decision: insufficient for R2.

## Recommended Architecture

R2 recommends an adapter-first shared floating runtime:

```text
src/runtime/floating/
  core/
    floating-window-types.ts
    floating-window-layout.ts
    floating-window-lifecycle.ts
  registry/
    floating-app-types.ts
    floating-app-registry.ts
  react/
    FloatingWindowFrame.tsx
    FloatingWindowManager.tsx
  adapters/
    workspace-floating-host.ts
    desktop-floating-host.ts
```

This is the target folder structure for later implementation. R2 does not create it in source.

## Boundary Principles

1. Workspace shell owns stage, top bar, right dock, bottom composer, workspace context, auth/session, and view mode.
2. Floating runtime owns open, close, focus, z-index, drag, resize, minimize, maximize, restore, bounds constraints, and frame slot rendering.
3. Floating app registry owns app metadata and component lookup only.
4. Feature folders own app business logic.
5. Persistence is an adapter, not hardcoded into runtime.
6. Capability metadata remains descriptive; it must not control app opening or app composition.
7. `/desktop` can consume the shared runtime, but Workspace is the product mainline.

## R2 Decision Summary

| Topic | Decision |
|---|---|
| Primary host | Workspace |
| `/desktop` role | POC/staging consumer |
| Runtime strategy | Adapter-first shared runtime |
| First implementation goal | Workspace opens one registry app without hardcoded app rendering |
| Initial drag/resize choice | Prefer `react-rnd` for shared React frame because Workspace already depends on it and it handles bounded drag/resize |
| Persistence | Host adapter: Workspace uses `nexus-store`/IndexedDB; `/desktop` can retain localStorage until migrated |
| Maximize restore | Keep `previousLayout` semantics from Workspace; add it to generic runtime model |
| Capability registry | Metadata-only |
| Big-bang migration | Explicitly avoided |

## Next Progress After R2

R3 should implement the smallest useful registry bridge into Workspace:

- Add shared runtime types and registry wrappers.
- Add a Workspace host adapter that can render a single registry app inside the Workspace stage.
- Start with a low-risk singleton app such as `feed`, `notes`, or `developer-inspector`.
- Leave agent windows and datapads on current implementation until the bridge is proven.

