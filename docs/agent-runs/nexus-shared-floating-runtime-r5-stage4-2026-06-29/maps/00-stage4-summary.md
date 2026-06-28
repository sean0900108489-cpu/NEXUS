# R5 Stage 4 - Floating Web App Host Stage 1

## Scope

This run continued from `origin/codex/v41` at HEAD
`c5d636ad7f8addc098cebc3302f3cfdd61218caf`.

The user clarified the core product direction:

- NEXUS is not mainly another set of handcrafted floating apps.
- NEXUS should become a Workspace Floating Web App Host.
- A floating window should be able to launch a whole external web app project
  through a manifest and sandbox/container boundary.

## Result

R5 is now oriented around `external-web-app` hosting.

The Workspace launcher now includes nine entries:

1. `developer-inspector`
2. `feed`
3. `artifact-library`
4. `profile-preview`
5. `notes`
6. `forum`
7. `global-chat`
8. `service-board`
9. `external-web-app`

The ninth app is a manifest-driven Web App Host pilot, not another product
prototype.

## External Web App Manifest

The Stage 1 pilot manifest is:

```json
{
  "id": "local-web-app-pilot",
  "kind": "external-web-app",
  "title": "Local Web App",
  "entry": "http://localhost:5173",
  "mode": "iframe",
  "permissions": ["frame:render"]
}
```

All bridges are explicitly disabled in Stage 1:

- `commandBridge: false`
- `authBridge: false`
- `storageBridge: false`
- `apiBridge: false`
- `workspaceContext: false`

## Runtime Boundary

The shared floating runtime remains the high-level window infrastructure:

- Launcher and registry open apps.
- Floating frames manage focus, close, minimize, restore, singleton, and
  multi-window behavior.
- The Web App Host iframe isolates external project HTML/CSS/JS from the NEXUS
  React DOM.
- No external app gets direct NEXUS internals, auth tokens, Supabase keys, or
  backend access from this stage.

## Tests Added

New and updated tests verify:

- `external-web-app` is registered and launcher-visible.
- Launcher static markup now reports `data-floating-app-count="9"`.
- `FloatingWebAppContainer` renders a sandboxed iframe with the manifest entry.
- Stage 1 bridge flags remain disabled.
- All launcher apps declare unique data boundaries.

## Verification

Run before push:

```bash
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm test -- src/features/service-board src/runtime/floating/registry/default-floating-apps.test.tsx src/runtime/floating/react/FloatingAppLauncher.test.tsx src/runtime/floating/web-app-host
npm run typecheck
npm run lint -- src/features/service-board src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

Record the final command results in the commit/push handoff.
