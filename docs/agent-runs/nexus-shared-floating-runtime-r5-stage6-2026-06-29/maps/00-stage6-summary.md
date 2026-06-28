# R5 Stage 6 - Authenticated Web App Host In-Window Verification

## Scope

This run continued from `origin/codex/v41` at HEAD
`87203968f6fadb801233cd5eaccdc63343c212e5`.

R5 remains `Workspace Floating Web App Host`.

Goals:

- Verify the local external app at `http://localhost:5173` renders inside the
  Workspace Web App Host floating window.
- Verify the Stage 5 context bridge reaches the iframe with safe context only.
- Keep the manifest-driven iframe/sandbox boundary.
- Keep auth, storage, Supabase/API, command, package import, marketplace, and
  payments bridges out of scope.
- Confirm the Web App Host window can drag, lock/unlock, resize, minimize,
  restore, maximize, and close like the existing LLM floating chat window.

## Result

Stage 6 live verification passed with an authenticated localhost Workspace
session and the external Vite app running on `http://localhost:5173`.

The Web App Host opened as a Workspace floating app with
`data-floating-app-count="9"`, loaded the external app in an iframe, and the
iframe rendered visible external app markers:

- `NOVA`
- `ASK YOUR GENERATED MEMORY`

## Hardening Added

Context bridge delivery:

- Parent-to-iframe context messages are now sent only after the iframe load
  event has fired.
- This avoids posting to the iframe's initial parent-origin document before it
  navigates to the manifest origin.
- Context updates after iframe load still resend the safe context.

Window chrome:

- Added real resize math and right-bottom resize drag support.
- Added app min-size enforcement through the registry `minSize`.
- Added a drag/resize interaction shield so iframe content cannot swallow
  mouse movement while the user is dragging or resizing the host window.
- Added a Workspace z-index base for shared floating runtime windows so they
  are not covered by legacy agent chat windows.

## Live Checklist

Verified:

- `http://localhost:5173` served the external app.
- Authenticated `http://localhost:3000` Workspace was reached using a dedicated
  localhost test account.
- `[data-floating-app-launcher="workspace"]` was visible.
- `data-floating-app-count` was `9`.
- Narrow viewport launcher horizontal scroll worked.
- The `external-web-app` launcher entry opened Web App Host.
- The iframe `src` was `http://localhost:5173`.
- The iframe rendered the external app inside the floating window.
- The iframe received `nexus:floating-web-app-context:v1`.
- Received safe context fields:
  - `workspaceId`
  - `floatingWindowId`
  - `appInstanceId`
  - `appKind`
  - `manifestId`
  - `viewport`
  - `theme`
  - `host`
- No auth token, refresh token, Supabase key, service role key, direct DB
  handle, API bridge, storage bridge, or command execution field was exposed.
- Web App Host drag, lock, unlock, resize, maximize, restore, minimize, and
  close worked.

Live smoke output summary:

```json
{
  "ok": true,
  "launcherCount": "9",
  "iframeSrc": "http://localhost:5173",
  "bridgeOrigin": "http://localhost:5173",
  "dialogZIndex": "101",
  "consoleForbiddenCount": 0
}
```

## Console Notes

The live console audit showed no Stage 6 regressions:

- no invalid refresh token
- no maximum update-depth loop
- no hydration error
- no bridge/postMessage warning after hardening
- no runtime loop

Known existing environment noise remained:

- CDN/name-resolution resource failures from existing Workspace assets.
- Auth-gated 401 resource requests.
- Existing Workspace Recovery Conflict warnings for local-newer state.

No credentials, tokens, Playwright storage state, or screenshots were committed.

## Verification

Run before push:

```bash
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm test -- src/runtime/floating/web-app-host src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx
npm run typecheck
npm run lint -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

### Final Results

- `npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts`
  passed: 14 test files, 33 tests.
- `npm test -- src/runtime/floating/web-app-host src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx`
  passed: 4 test files, 14 tests.
- `npm run typecheck` passed.
- `npm run lint -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts src/components/nexus/nexus-ops.tsx`
  passed with no errors. Existing `nexus-ops.tsx` unused warnings remain.
- `npm run build` passed with Next.js 16.2.6 and generated 53 static pages.
