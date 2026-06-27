# R3 Stage 3 Context

## Current State

Shared floating runtime Stage 3 is implemented and verified.

Workspace now mounts the shared `FloatingWindowManager` inside the main Workspace stage and can open one pilot app through the command palette:

- Command id: `open-developer-inspector-floating`
- App kind: `developer-inspector`
- Registry module: `src/runtime/floating/registry/default-floating-apps.tsx`
- Host hook: `src/runtime/floating/react/useFloatingHostAdapter.ts`

The pilot wraps the existing `DeveloperInspectorWindow` behind a floating app adapter. `NexusOps` imports only from `@/runtime/floating`.

## Verification Evidence

Latest commands run:

```bash
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run typecheck
npm run lint -- src/runtime/floating src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

Observed results:

- `src/runtime/floating` plus Workspace bridge source guard: 9 test files / 16 tests passed.
- `npm run typecheck`: passed.
- Targeted ESLint: 0 errors. Existing `nexus-ops.tsx` unused warnings remain.
- `npm run build`: passed.

## Important Guardrails For Next Work

- Do not import feature windows directly in `NexusOps`.
- Do not migrate `AgentWindow` or `DatapadWindow` yet.
- Do not model sandbox as a generic app until its coupling to `NexusAgent` is separated.
- Keep `/desktop` as explicit experimental POC/staging.
- Keep capabilities as descriptive metadata, not routing or authorization logic.

## Suggested Next Work

Move from single hard-coded command to registry-backed launch:

1. Expose `DEFAULT_WORKSPACE_FLOATING_APPS` through a small launcher UI or right dock area.
2. Open apps by selected registry definition rather than by hard-coded developer inspector metadata.
3. Add a second low-risk pilot only after the launcher path is tested.
4. Prefer `feed` or `notes` for the second pilot; avoid sandbox and agent/chat windows for now.
