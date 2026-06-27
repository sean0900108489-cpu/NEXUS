# Current System Context - R1 Floating Runtime Inventory

## What This Run Completed

R1 Workspace Floating Runtime Inventory is complete as a read-only documentation packet.

Created run folder:

`docs/agent-runs/nexus-current-system-intelligence-2026-06-27-r1-floating-runtime/`

Required outputs:

- `maps/00-executive-summary.md`
- `maps/10-feature-capability-map.md`
- `maps/11-current-system-logic-map.md`
- `context-packs/current-system-context.md`

## Source Of Truth

Use `nexus_obsidian_vault/` as the corrected product planning source.

Planning conclusion:

- NEXUS is Workspace-first Floating App Platform.
- `/desktop` is a proof-of-concept / runtime experiment / developer testing surface.
- New functionality should land as Workspace floating apps, not default routes or a separate desktop product.
- Capability registry remains metadata-only.

## Confirmed Complete Or Already Known

- R0 login landing is already represented in current source. `/` is default and renders `NexusOps`; `/desktop` is explicit experimental.
- `/desktop` current POC history and app registry are already documented in `docs/window-os.md`.
- Phase 5B feed/interaction primitive is documented as complete; R1 did not rerun tests.
- No DB migration is needed for R1.

## Key Current-System Facts

Workspace runtime today:

- Primary shell: `src/components/nexus/nexus-ops.tsx`
- Floating agent frame/content: `src/components/nexus/nexus-agent-window.tsx`
- Floating datapad frame/content: `src/components/nexus/DatapadWindow.tsx`
- Workspace chrome: `src/components/nexus/nexus-chrome.tsx`, `src/components/nexus/nexus-panels.tsx`
- State: `src/store/nexus-store.ts`
- Types: `src/lib/nexus-types.ts`

Desktop POC runtime today:

- Route: `src/app/desktop/page.tsx`
- Types: `src/kernel/window/window-types.ts`
- Store: `src/kernel/window/window-store.ts`
- Registry: `src/kernel/window/window-registry.ts`
- Default registry entries: `src/kernel/window/default-window-apps.ts`
- Frame: `src/kernel/window/WindowFrame.tsx`
- Manager: `src/kernel/window/WindowManager.tsx`
- Shell: `src/kernel/window/NexusDesktopShell.tsx`

## Most Important R1 Finding

Workspace already has working floating behavior, but it is agent-centric and store-coupled. `/desktop` already has a generic registry/window-kernel shape, but it is not the product mainline. R2 should plan a shared runtime boundary that lets Workspace borrow generic runtime concepts without turning `/desktop` into the primary product or stuffing all new app logic into `NexusOps`.

## R2 Handoff

Recommended next progress:

R2 Shared Floating Runtime Boundary Plan.

R2 should not implement a big migration. It should produce a precise plan for:

- Runtime folder ownership.
- Host adapters for Workspace vs `/desktop`.
- A generic floating window instance model.
- App registry bridge into Workspace.
- Persistence adapter boundary.
- Bounds/focus/z-index lifecycle.
- Migration order for agent windows, sandbox, datapad, and POC apps.
- Test gates for drag/resize/focus/minimize/maximize/layout persistence.

Important constraint:

Before any Next.js code changes, read the relevant guide in `node_modules/next/dist/docs/` as required by the root `AGENTS.md` instructions.

## Unknowns And Non-Goals

- No browser/runtime screenshot trace was recorded in this run.
- No Playwright verification was performed because the work was documentation/inventory only.
- No source code was changed.
- No tests were run because no executable behavior was changed.
- No Supabase production connection was used.
- No target architecture was implemented.

