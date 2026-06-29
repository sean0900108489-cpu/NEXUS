# R5 Stage 7 - Floating Window Chrome Parity

## Scope

This run continued R5 as `Workspace Floating Web App Host` and focused only on
shared floating window chrome parity.

No product app features, auth bridge, storage bridge, Supabase/API bridge,
command bridge, package import, marketplace backend, or payments were added.

## Result

The shared Workspace floating runtime now has stronger old-agent-window parity:

- Dragging is clamped to host bounds.
- Resizing supports all edges and corners:
  - `n`
  - `ne`
  - `e`
  - `se`
  - `s`
  - `sw`
  - `w`
  - `nw`
- Edge/corner resizing preserves the opposite edge.
- Resize respects app `minSize`.
- Resize is clamped to host bounds.
- Locking the window blocks drag and resize.
- Maximized windows still block drag and resize.
- The iframe interaction shield remains in place during drag/resize.

## Live Smoke

Because no external Vite project was running in this workspace, a temporary
localhost-only HTML server was used at `http://localhost:5173` for the iframe
target. Nothing from that server was committed.

Verified against the existing local NEXUS dev server at `http://localhost:8787`:

- Web App Host opened from the Workspace launcher.
- The iframe rendered the temporary external app.
- All 8 resize handles rendered.
- East resize grew width while preserving the left edge.
- West resize moved the left edge and grew width, clamped at `left: 0`.
- Southeast resize clamped to host bounds.
- Dragging toward negative coordinates clamped at `left: 0`, `top: 0`.
- No forbidden console patterns were detected.

Live smoke summary:

```json
{
  "ok": true,
  "directions": ["e", "n", "ne", "nw", "s", "se", "sw", "w"],
  "iframeRendered": true,
  "afterNegativeDrag": { "left": "0px", "top": "0px" },
  "consoleForbiddenCount": 0
}
```

## Verification

- `npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts`
  passed: 14 test files, 38 tests.
- `npm test -- src/runtime/floating/web-app-host src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx`
  passed: 4 test files, 14 tests.
- `npm run typecheck` passed.
- Targeted lint passed with no errors:
  `npm run lint -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts src/components/nexus/nexus-ops.tsx`.
  Existing unused warnings remain in `nexus-ops.tsx`.
- `npm run build` passed with Next.js 16.2.6 and generated 53 static pages.
