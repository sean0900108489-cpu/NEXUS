# R5 Stage 5 Context

## Current State

Branch:

- `codex/v41`

Starting HEAD:

- `494d27d3fa435aa7b9fb932161a4178d0267b01c`

Stage intent:

- Continue R5 as Workspace Floating Web App Host.
- Keep iframe/sandbox manifest boundary.
- Add the first safe parent-to-iframe workspace/window context bridge.
- Improve shared floating window chrome so hosted apps can be moved and locked
  like a real floating chat window.

## Work Completed

Context bridge:

- Added `floating-web-app-context-bridge` helpers.
- Context bridge is parent-to-iframe only.
- The default local external manifest now explicitly enables only
  `workspaceContext`.
- The local pilot permissions are now `frame:render` and `workspace:read`.
- The bridge payload contains only:
  - `workspaceId` when present.
  - `floatingWindowId` / `appInstanceId`.
  - app kind and manifest id.
  - viewport size from the floating window layout.
  - theme value.
  - host debug version `r5-stage5-context-v1`.

Security boundaries:

- No auth tokens.
- No refresh tokens.
- No Supabase keys.
- No service role access.
- No direct DB access.
- No command execution.
- No storage/API bridge.
- Message target origin is derived from and allowlisted by the manifest entry
  origin.
- Message schema validation rejects malformed payloads.
- Unknown origins are rejected by the parser helper.

Floating chrome:

- Added drag math helpers and tests.
- The shared floating frame titlebar now starts a real mouse drag and calls the
  host `moveWindow`.
- Added local lock/unlock control for window position.
- Replaced text-only controls with accessible icon buttons for lock, minimize,
  maximize/restore, and close.

Live smoke:

- Confirmed `http://localhost:5173` serves a real external Vite app titled
  `conv · NOVA Clone`.
- Attempted `http://localhost:3000` with Playwright, but the browser landed on
  `Identity Gate / Global Vault`, not authenticated Workspace.
- Do not claim inside-floating-window live render verification from this run.

## What Did Not Change

- No external app package import.
- No auth bridge.
- No storage bridge.
- No Supabase/API bridge.
- No marketplace backend.
- No payments.
- No `/desktop` behavior change.

## Next Recommended Stage

R5 Stage 6 should make the bridge bidirectional only if needed:

- Add iframe-to-parent request messages with strict schemas.
- Keep origin allowlisting mandatory.
- Start with harmless acknowledgements or context-refresh requests.
- Do not expose auth/API/storage until each bridge has its own permission model
  and tests.
