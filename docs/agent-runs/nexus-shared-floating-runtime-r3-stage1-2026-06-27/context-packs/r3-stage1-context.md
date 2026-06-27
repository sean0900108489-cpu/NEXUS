# R3 Stage 1 Context

## Current State

Shared floating runtime Stage 1 is implemented and verified.

The new runtime lives under:

`src/runtime/floating/`

It is pure TypeScript at this stage. No React frame/manager is mounted yet.

## Verification Evidence

Latest commands run in this stage:

```bash
npm test -- src/runtime/floating/core/floating-window-layout.test.ts src/runtime/floating/core/floating-window-lifecycle.test.ts src/runtime/floating/registry/floating-app-registry.test.ts
npm run typecheck
```

Both commands passed.

## Next Recommended Work

Continue with R3 Stage 2:

- React frame and manager.
- Host adapter contract.
- Workspace registry-window slice.
- Minimal Workspace pilot app open path.

Keep existing agent windows and datapads untouched until the bridge is proven.

