# R3 Stage 4 Context

## Current State

Shared floating runtime Stage 4 is implemented at code level.

Workspace floating app launch is now registry-backed:

- Registry list: `workspaceFloatingRegistry.list()`
- Visible launcher: `FloatingAppLauncher`
- Command ids: `open-floating-app-${app.kind}`
- Open helper: `createFloatingAppOpenInput(app, { workspaceId })`
- Host call: `workspaceFloatingHost.openWindow(...)`

The only registered default Workspace app remains `developer-inspector`, but Workspace shell code no longer hard-codes that app kind.

## Verification Evidence

Latest commands run:

```bash
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run typecheck
npm run lint -- src/runtime/floating src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

Observed results:

- `src/runtime/floating` plus Workspace bridge source guard: 11 test files / 19 tests passed.
- `npm run typecheck`: passed.
- Targeted ESLint: 0 errors. Existing `nexus-ops.tsx` unused warnings remain.
- `npm run build`: passed.

## Important Guardrails For Next Work

- Do not import feature windows directly in `NexusOps`.
- Add new app pilots through `DEFAULT_WORKSPACE_FLOATING_APPS`.
- Keep app-specific prop translation inside registry adapters.
- Do not migrate `AgentWindow`, `DatapadWindow`, or sandbox yet.
- Keep `/desktop` as experimental POC/staging.

## Suggested Next Work

Proceed to a second pilot:

1. Inspect `feed` and `notes` components for browser/store coupling.
2. Choose the lower-risk app.
3. Add its adapter to `default-floating-apps.tsx`.
4. Extend tests to assert the launcher and generated commands support more than one app.
5. Run browser verification after the second pilot lands.
