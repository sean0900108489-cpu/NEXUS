# R3 Stage 2 Context

## Current State

Shared floating runtime Stage 2 is implemented and verified.

The runtime now includes:

- Pure core lifecycle/layout/types.
- Metadata-only app registry.
- Host adapter contract.
- Memory host adapter.
- Generic React frame.
- Generic React manager.

No production surface consumes it yet.

## Verification Evidence

Latest commands run:

```bash
npm test -- src/runtime/floating
npm run typecheck
npm run lint -- src/runtime/floating
```

Observed results:

- `src/runtime/floating`: 6 test files / 11 tests passed.
- `npm run typecheck`: passed.
- `npm run lint -- src/runtime/floating`: passed.

## Next Recommended Work

Proceed to R3 Stage 3: Workspace pilot bridge.

Implementation guardrails:

- Do not migrate `AgentWindow` or `DatapadWindow`.
- Do not import pilot app internals directly in `NexusOps`.
- Use registry lookup.
- Keep `/desktop` explicit and experimental.
- Keep capability metadata descriptive only.

## Suggested Stage 3 Test Focus

- Workspace bridge store/slice can open one registry window.
- `FloatingWindowManager` can coexist with existing `AgentWindow` and `DatapadWindow` render paths.
- `NexusOps` only imports runtime/registry bridge modules, not the pilot feature component directly.
- Existing `/desktop` tests and docs remain valid.

