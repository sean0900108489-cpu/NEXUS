# R3 Stage 4 - Registry-Backed Workspace Launcher Summary

## Scope

This run moves the Workspace floating runtime bridge from a single hard-coded pilot command to registry-backed launch surfaces:

- Pure helper for turning `FloatingAppDefinition` metadata into `FloatingOpenWindowInput`.
- Generic `FloatingAppLauncher` component that renders registered floating apps as visible launch actions.
- Workspace command palette entries generated from `workspaceFloatingRegistry.list()`.
- Workspace stage launcher backed by the same registry list.
- Source guard tests proving `NexusOps` opens floating apps through registry metadata, not a hard-coded `developer-inspector` command.

It still does not migrate `AgentWindow`, `DatapadWindow`, sandbox, `/desktop`, chat/media agents, Supabase, auth, login, or routing.

## Files Added

- `src/runtime/floating/registry/floating-app-open-input.ts`
- `src/runtime/floating/registry/floating-app-open-input.test.ts`
- `src/runtime/floating/react/FloatingAppLauncher.tsx`
- `src/runtime/floating/react/FloatingAppLauncher.test.tsx`

Updated:

- `src/runtime/floating/index.ts`
- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts`

## Behavior Landed

- `createFloatingAppOpenInput` preserves registry metadata when opening a host window.
- `FloatingAppLauncher` renders one button per registered app and renders nothing for an empty registry.
- Workspace now derives floating app command palette entries with `workspaceFloatingApps.map((app) => ...)`.
- The previous `open-developer-inspector-floating` command is replaced by `open-floating-app-${app.kind}`.
- The visible Workspace launcher and command palette both call `openWorkspaceFloatingApp(app)`.
- `NexusOps` still imports only runtime bridge modules from `@/runtime/floating`; pilot feature internals stay behind the default registry adapter.

## Architecture Boundary

Stage 4 strengthens the R2/R3 boundary:

- Runtime registry owns app metadata.
- Runtime helper owns metadata-to-open-input conversion.
- Runtime React owns generic launcher UI.
- `NexusOps` owns only Workspace placement, notice text, and host invocation.

This is the first step toward adding a second low-risk pilot without changing Workspace shell code again.

## Verification

Commands run:

```bash
npm test -- src/runtime/floating/registry/floating-app-open-input.test.ts src/runtime/floating/react/FloatingAppLauncher.test.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run typecheck
npm run lint -- src/runtime/floating src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

Results so far:

- Focused Stage 4 tests: 3 files / 5 tests passed.
- Floating runtime plus bridge tests: 11 files / 19 tests passed.
- Typecheck: passed.
- Targeted ESLint: passed with 0 errors. `nexus-ops.tsx` still reports pre-existing unused warnings.
- Production build: passed.

## Next Slice

R3 Stage 5 should add the second low-risk pilot through the default registry:

1. Pick `feed` or `notes` after inspecting current component coupling.
2. Add a registry adapter for the selected app without importing it in `NexusOps`.
3. Verify both command palette and visible launcher show multiple registry apps.
4. Add browser/runtime verification once two apps exist in the launcher.
5. Keep sandbox and agent windows out of migration until their host ownership is separated.
