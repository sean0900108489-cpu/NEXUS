# R4 Stage 4 - Authenticated Live Workspace Verification Summary

## Scope

This run continued from `origin/codex/v41` at HEAD `abd93ed264350a2f1333b54ab47680e5d5257f6b`.

R4 Stage 4 completed authenticated local Workspace verification for the seven Workspace floating launcher apps.

No product features were added.

## Authenticated Session

The existing Chrome profile was checked first. A localhost login succeeded once, but the Chrome extension bridge became unstable during horizontal scroll input and reported a transient unavailable/blocked extension API state. The Chrome bridge was finalized before the run ended.

The completed verification used a Playwright-controlled local Google Chrome browser:

- Opened `http://localhost:3000`.
- Observed Identity Gate before authentication.
- Logged in through the production auth UI with the dedicated local verification test account.
- Confirmed authenticated Workspace visibility.
- Created a temporary Playwright storage state file.
- Reopened `http://localhost:3000` in a second browser context backed by that storage state.
- Deleted the temporary storage state file after verification.

No password, refresh token, or storage state file was written to the repo.

## Launcher Verification

Authenticated Workspace rendered the launcher:

```text
[data-floating-app-launcher="workspace"]
```

Launcher attributes:

```json
{
  "data-floating-app-count": "7",
  "role": "toolbar",
  "aria": "Floating apps"
}
```

Launcher entries found in order:

```text
developer-inspector
feed
artifact-library
profile-preview
notes
forum
global-chat
```

## Narrow Viewport Scroll

Viewport used:

```json
{
  "width": 390,
  "height": 844
}
```

Launcher before horizontal wheel input:

```json
{
  "clientWidth": 346,
  "scrollWidth": 928,
  "scrollLeft": 0,
  "overflowX": "auto"
}
```

Launcher after horizontal wheel input:

```json
{
  "clientWidth": 346,
  "scrollWidth": 928,
  "scrollLeft": 582,
  "overflowX": "auto"
}
```

Result: passed. The launcher remained usable in the narrow viewport and scrolled horizontally.

## Seven Launcher Clicks

Each launcher entry was clicked in the authenticated Workspace.

| Clicked launcher kind | Matching visible floating windows | Focused floating window |
| --- | ---: | --- |
| `developer-inspector` | 1 | `developer-inspector` |
| `feed` | 1 | `feed` |
| `artifact-library` | 1 | `artifact-library` |
| `profile-preview` | 1 | `profile-preview` |
| `notes` | 1 | `notes` |
| `forum` | 1 | `forum` |
| `global-chat` | 1 | `global-chat` |

After the seven clicks, these visible floating windows were present:

```text
developer-inspector
feed
artifact-library
profile-preview
notes
forum
global-chat
```

## Window Behavior

Singleton refocus was verified with `feed`:

```json
{
  "beforeCount": 1,
  "afterCount": 1,
  "sameWindowId": true,
  "focusedAfter": "feed"
}
```

Multi-window behavior was verified:

```json
{
  "profile-preview": {
    "beforeCount": 1,
    "afterCount": 2
  },
  "global-chat": {
    "beforeCount": 1,
    "afterCount": 2
  }
}
```

Close, minimize, restore, and refocus behavior was verified with `notes`:

```json
{
  "minimizedVisibleNotes": 0,
  "restoredSameWindowId": true,
  "focusFeedKind": "feed",
  "refocusNotesKind": "notes",
  "closeVisibleNotes": 0
}
```

## Console Inspection

The checklist context reset the captured console log list after initial authenticated page load. During the launcher/window interactions:

```json
{
  "interactionLogCount": 1,
  "interactionErrorLike": [],
  "updateDepthLogs": [],
  "invalidRefreshLogs": []
}
```

No new interaction-phase console errors, page errors, invalid refresh-token errors, update-depth loops, or too-many-render loops were observed.

Initial authenticated page load still produced existing non-floating baseline noise:

- `https://cdn.example.com/nexus/bg-surface-shell.webp` failed with `net::ERR_NAME_NOT_RESOLVED`.
- React DevTools/HMR development logs appeared.
- Login-page collection also observed one `401 Unauthorized` response from `http://localhost:3000/api/models`.

Those baseline logs were not introduced by the floating launcher interactions.

## Verification Commands

These commands were run after the authenticated live checklist:

```text
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
```

Result: passed, 11 test files and 21 tests.

```text
npm run typecheck
```

Result: passed.

```text
npm run lint -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
```

Result: passed.

```text
npm run build
```

Result: passed. Next.js 16.2.6 production build compiled successfully and generated all 53 static pages.

## Files Changed

Documentation only:

- `docs/agent-runs/nexus-shared-floating-runtime-r4-stage4-2026-06-28/maps/00-stage4-summary.md`
- `docs/agent-runs/nexus-shared-floating-runtime-r4-stage4-2026-06-28/context-packs/r4-stage4-context.md`
