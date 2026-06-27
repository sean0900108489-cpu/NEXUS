# R3 Stage 5 Context

## Current State

Shared floating runtime Stage 5 is implemented and verified.

Default Workspace floating apps now include:

1. `developer-inspector`
2. `feed`

The registry adapter file is:

- `src/runtime/floating/registry/default-floating-apps.tsx`

Workspace shell behavior remains generic:

- App list comes from `workspaceFloatingRegistry.list()`.
- Command ids use `open-floating-app-${app.kind}`.
- Visible launcher uses `FloatingAppLauncher`.
- Window creation uses `createFloatingAppOpenInput(app, { workspaceId })`.

`NexusOps` still imports only from `@/runtime/floating`.

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

- Keep feature imports inside registry adapters, not `NexusOps`.
- Do not migrate `AgentWindow`, `DatapadWindow`, or sandbox yet.
- Treat `notes` as higher risk because it writes current-note bridge state on mount.
- Keep `/desktop` explicit and experimental.
- Add browser verification before adding a third app pilot.

## Suggested Next Work

Proceed to R3 Stage 6:

1. Browser-verify the Workspace launcher with two apps.
2. Check visual placement and interaction safety.
3. Record any UI overlap or singleton behavior issues.
4. Decide whether launcher needs UX hardening before adding `notes`.

