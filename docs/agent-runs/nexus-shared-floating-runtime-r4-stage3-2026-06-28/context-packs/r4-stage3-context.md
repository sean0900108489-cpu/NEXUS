# R4 Stage 3 Context

## Current State

Branch:

- `codex/v41`
- Starting HEAD: `4335be2`

R4 Stage 3 attempted authenticated live Workspace verification for the seven Workspace floating apps.

## Exact Blocker

No authenticated browser session was available.

Playwright:

- `playwright_cli.sh` was available.
- `playwright-cli list` returned `(no browsers)`.
- No saved auth or storage state JSON files were found in the repo.

Chrome:

- Existing Chrome profile was reachable through the Chrome extension bridge.
- Open tabs did not include NEXUS/localhost.
- A new tab opened `http://localhost:3000/` with the existing Chrome profile.
- It still rendered the Identity Gate.
- Read-only inspection found no Workspace launcher:

```json
{
  "identityGateVisible": true,
  "launcherCount": 0,
  "appCount": null
}
```

Chrome console included:

```text
AuthApiError: Invalid Refresh Token: Refresh Token Not Found
```

Therefore the live launcher click checklist was not executed.

## Do Not Claim As Verified Yet

Do not claim any of these as live-verified until an authenticated session is available and the clicks have actually been performed:

- live `data-floating-app-count="7"`
- narrow viewport launcher scrolling
- seven launcher entry clicks
- singleton refocus behavior
- `profile-preview` multi-window behavior
- `global-chat` multi-window behavior
- close/minimize/refocus behavior
- post-click console stability

## Automated Coverage Available

Relevant tests still cover the non-auth-gated contracts:

```bash
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
```

Coverage includes:

- seven-app default registry membership
- source boundary guard for `NexusOps`
- launcher scale guard through `FloatingAppLauncher.test.tsx`
- generic lifecycle behavior for singleton and multi-window windows

## Required Next Verification

Before closing any future live verification stage, run:

```bash
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run typecheck
npm run lint -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

If only docs are touched, ESLint can be scoped to the relevant existing runtime files because Markdown docs are outside the configured code lint surface; document the exact command used.

## Stage 3 Command Results

Commands run for this Stage 3 documentation handoff:

- `npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts`
  - Result: passed, 11 test files and 21 tests.
- `npm run typecheck`
  - Result: passed.
- `npm run lint -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts`
  - Result: passed.
- `npm run build`
  - Result: passed. Next.js 16.2.6 production build compiled successfully and generated all 53 static pages.

## Handoff

For the next live verification attempt:

1. Ask the user to open/log into `http://localhost:3000` in Chrome, or provide a valid Playwright storage state file.
2. Confirm the browser shows Workspace rather than Identity Gate.
3. Inspect `[data-floating-app-launcher="workspace"]`.
4. Verify `data-floating-app-count="7"`.
5. Click each launcher entry and record the resulting `[data-floating-window-kind]`.
6. Test singleton and multi-window behavior.
7. Read console logs after interactions.
