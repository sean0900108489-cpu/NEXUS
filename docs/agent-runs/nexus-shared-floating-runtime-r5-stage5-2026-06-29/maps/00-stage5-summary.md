# R5 Stage 5 - Web App Host Live Smoke + Context Bridge Pilot

## Scope

This run continued from `origin/codex/v41` at HEAD
`494d27d3fa435aa7b9fb932161a4178d0267b01c`.

R5 remains `Workspace Floating Web App Host`, not a single product prototype.

Goals:

- Keep the manifest-driven iframe/sandbox boundary.
- Verify whether a real local external app at `http://localhost:5173` can render
  inside the Web App Host floating window.
- Add the first safe workspace/window context bridge.
- Improve floating window chrome so windows can be dragged and locked.

## Result

Implemented Stage 5 bridge and chrome hardening.

The Web App Host still loads external project UI through a sandboxed iframe. The
new context bridge sends one safe parent-to-iframe message when enabled by the
manifest.

## Context Bridge Payload

Message type:

```text
nexus:floating-web-app-context:v1
```

Payload fields:

- `workspaceId` when the floating window has one.
- `floatingWindowId`
- `appInstanceId`
- `appKind`
- `manifestId`
- `viewport.width`
- `viewport.height`
- `theme`
- `host.bridge`
- `host.version`

The payload intentionally excludes:

- auth tokens
- refresh tokens
- Supabase keys
- service role access
- direct database handles
- arbitrary commands

## Security Coverage

Tests cover:

- disabled bridge behavior.
- enabled context bridge behavior.
- manifest origin allowlisting.
- unknown origin rejection.
- malformed message rejection.
- schema validation for context messages.

## Floating Window Chrome

The shared floating frame now has:

- real titlebar drag behavior.
- a lock/unlock button that prevents new drags while locked.
- icon controls for minimize, maximize/restore, and close.
- tests for drag position math and locked/maximized drag gating.

This addresses the UX issue where Workspace floating windows looked like
windows but did not move like the LLM floating chat window.

## Live Smoke

Live smoke target:

```text
http://localhost:5173
```

Smoke criteria:

- local external app renders in the Web App Host iframe.
- iframe remains sandboxed.
- context bridge remains parent-to-iframe.
- console has no new runtime loop or bridge errors.

If no external app server is listening on port 5173, record that blocker and do
not claim live render verification.

### Smoke Result

`http://localhost:5173` was available and rendered a real Vite app:

- Page title: `conv · NOVA Clone`.
- Visible app shell included `NOVA`, `Multimodal intelligence workspace`,
  `ASK YOUR GENERATED MEMORY`, runtime/key panels, and chat controls.

Authenticated Workspace smoke was blocked:

- `http://localhost:3000` rendered `Identity Gate / Global Vault`.
- No authenticated Workspace session was visible in the Playwright browser.
- Therefore this run does not claim that the external app was live-rendered
  inside the Web App Host floating window.

Console notes:

- NEXUS unauthenticated page had expected auth-gated `/api/models` 401s and a
  missing example CDN image.
- The external Vite app had a missing `/favicon.ico`; the app UI still rendered.

## Verification

Run before push:

```bash
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm test -- src/runtime/floating/web-app-host src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx
npm run typecheck
npm run lint -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

Record the final command results in the commit/push handoff.

### Final Results

- `npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts`
  passed: 14 test files, 31 tests.
- `npm test -- src/runtime/floating/web-app-host src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx`
  passed: 4 test files, 13 tests.
- `npm run typecheck` passed.
- `npm run lint -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts`
  passed.
- `npm run build` passed with Next.js 16.2.6 and generated 53 static pages.
