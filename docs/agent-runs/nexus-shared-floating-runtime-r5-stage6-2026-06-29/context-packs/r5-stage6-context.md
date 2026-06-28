# R5 Stage 6 Context

## Current State

Branch:

- `codex/v41`

Starting HEAD:

- `87203968f6fadb801233cd5eaccdc63343c212e5`

Stage intent:

- Complete the authenticated local live verification that Stage 5 could not
  claim.
- Keep Web App Host as an iframe/sandbox-based floating app host.
- Prove the local external app can render inside the floating window.
- Keep bridge scope limited to safe parent-to-iframe workspace/window context.
- Make the floating app host window behave like a real movable/resizable
  Workspace window.

## Work Completed

Context bridge delivery:

- `FloatingWebAppContainer` now waits for iframe load before sending context.
- The bridge still targets only the manifest entry origin.
- The default local external manifest remains:
  - `entry: "http://localhost:5173"`
  - `mode: "iframe"`
  - `permissions: ["frame:render", "workspace:read"]`
  - `workspaceContext: true`
  - `authBridge: false`
  - `storageBridge: false`
  - `apiBridge: false`
  - `commandBridge: false`
- Added a testable `postFloatingWebAppContextBridgeMessage` helper.

Window chrome:

- Added `calculateFloatingWindowResizeSize` with min-size clamping.
- `FloatingWindowFrame` now supports right-bottom mouse resizing.
- `FloatingWindowManager` passes app `minSize` into the frame.
- `FloatingWindowFrame` exposes `data-min-width` and `data-min-height` for
  verification.
- Drag/resize state shows an interaction shield so iframe content does not
  swallow mouse movement during window operations.
- `FloatingWindowManager` and `FloatingWindowFrame` accept a `zIndexBase`.
- Workspace mounts the shared floating runtime with z-index base `100` so
  floating apps sit above legacy agent chat windows.

## Authenticated Live Verification

Services:

- `http://localhost:3000` returned HTTP 200.
- `http://localhost:5173` returned HTTP 200.

Authenticated Workspace:

- Reached using a dedicated localhost test account.
- No credentials, tokens, storage state, or screenshots were saved or committed.

Verified:

- Workspace launcher rendered with `data-floating-app-count="9"`.
- Narrow viewport launcher horizontal scroll worked:
  - desktop launcher `clientWidth: 1344`, `scrollWidth: 1480`
  - narrow launcher `clientWidth: 346`, `scrollWidth: 1192`
  - narrow scroll moved to `scrollLeft: 240`
- `external-web-app` launched Web App Host.
- Web App Host iframe `src` was `http://localhost:5173`.
- The external app rendered inside the floating window.
- Iframe received `nexus:floating-web-app-context:v1` from
  `http://localhost:3000`.
- Context payload keys were:
  - `appInstanceId`
  - `appKind`
  - `floatingWindowId`
  - `host`
  - `manifestId`
  - `theme`
  - `viewport`
  - `workspaceId`
- Forbidden bridge data was absent:
  - no auth token
  - no refresh token
  - no Supabase key
  - no service role key
  - no direct DB handle
  - no API bridge
  - no storage bridge
  - no command execution
- Web App Host window interactions worked:
  - drag
  - lock
  - unlock
  - resize
  - maximize
  - restore
  - minimize
  - close

## Console Findings

The final full smoke had `consoleForbiddenCount: 0`.

The explicit console audit found no:

- invalid refresh token
- maximum update-depth loop
- hydration error
- bridge/postMessage warning
- runtime loop

Known existing non-Stage6 console noise:

- `ERR_NAME_NOT_RESOLVED` resource load failures for existing assets.
- 401 responses from existing auth-gated resources.
- Workspace Recovery Conflict warnings where local state is newer.

## What Did Not Change

- No auth bridge.
- No storage bridge.
- No Supabase/API bridge.
- No direct database access.
- No command execution.
- No package import flow.
- No marketplace backend.
- No payments.
- No separate standalone page.

## Verification Results

- `npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts`
  passed: 14 test files, 33 tests.
- `npm test -- src/runtime/floating/web-app-host src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx`
  passed: 4 test files, 14 tests.
- `npm run typecheck` passed.
- Targeted lint passed with no errors:
  `npm run lint -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts src/components/nexus/nexus-ops.tsx`.
  Existing unused warnings remain in `nexus-ops.tsx`.
- `npm run build` passed with Next.js 16.2.6 and generated 53 static pages.

## Follow-Up Context

R5 is still a platform/runtime direction:

- Stage 6 confirms a whole external web app can run inside a Workspace floating
  window with safe context.
- The next bridge should not expose auth, storage, Supabase, APIs, or commands
  until each bridge has an explicit permission model, schema validation, tests,
  and live verification.
- The window module is now stronger infrastructure for future floating apps:
  shared chrome, shared stacking, shared drag/resize, and isolated app content.
