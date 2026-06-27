# R4 Stage 4 Context

## Current State

Branch:

- `codex/v41`

Starting HEAD:

- `abd93ed264350a2f1333b54ab47680e5d5257f6b`

R4 Stage 4 completed authenticated live Workspace verification for seven Workspace floating apps.

## Auth Method Used

The completed checklist used Playwright-controlled local Google Chrome, not a production-auth bypass.

Flow:

1. Opened `http://localhost:3000`.
2. Observed Identity Gate.
3. Logged in through the normal production auth UI with the dedicated local verification test account.
4. Confirmed `[data-floating-app-launcher="workspace"]`.
5. Created a temporary Playwright storage state file.
6. Opened a second Playwright context with that storage state.
7. Completed the live checklist.
8. Deleted the temporary storage state file.

Do not commit or document account secrets. No credential or storage state file is present in this repo.

## Chrome Profile Note

The existing Chrome profile path was attempted first because it can reuse a manually logged-in session.

Observed:

- A localhost login reached authenticated Workspace.
- A horizontal scroll input through the Chrome extension bridge caused the bridge to disconnect once.
- Reconnection worked for lightweight calls, but opening a new tab then returned an extension API blocked response.
- The Chrome bridge was finalized before the run ended.

The completed verification therefore used Playwright-controlled local Chrome.

## Live Checklist Results

Launcher:

- `[data-floating-app-launcher="workspace"]`: present.
- `data-floating-app-count`: `"7"`.
- Entries:
  - `developer-inspector`
  - `feed`
  - `artifact-library`
  - `profile-preview`
  - `notes`
  - `forum`
  - `global-chat`

Narrow viewport:

- Viewport: `390x844`.
- Launcher `clientWidth`: `346`.
- Launcher `scrollWidth`: `928`.
- Launcher `overflowX`: `auto`.
- Horizontal wheel changed `scrollLeft` from `0` to `582`.

Launcher click results:

| Clicked kind | Matching window count | Focused kind |
| --- | ---: | --- |
| `developer-inspector` | 1 | `developer-inspector` |
| `feed` | 1 | `feed` |
| `artifact-library` | 1 | `artifact-library` |
| `profile-preview` | 1 | `profile-preview` |
| `notes` | 1 | `notes` |
| `forum` | 1 | `forum` |
| `global-chat` | 1 | `global-chat` |

After all seven clicks, visible floating window kinds were:

```text
developer-inspector
feed
artifact-library
profile-preview
notes
forum
global-chat
```

Behavior checks:

- `feed` singleton refocus: count remained `1`, same window id remained focused after launcher refocus.
- `profile-preview` multi-window: `1` to `2` windows after a second launcher click.
- `global-chat` multi-window: `1` to `2` windows after a second launcher click.
- `notes` minimize: visible `notes` windows dropped to `0`.
- `notes` restore/refocus: launcher restored the same window id and focused `notes`.
- Refocus sequence: launcher focused `feed`, then launcher focused `notes`.
- `notes` close: visible `notes` windows dropped to `0`.

## Console Results

Initial authenticated page load baseline:

- `https://cdn.example.com/nexus/bg-surface-shell.webp` emitted `net::ERR_NAME_NOT_RESOLVED`.
- React DevTools/HMR development logs appeared.
- Login-page collection observed one `401 Unauthorized` from `http://localhost:3000/api/models`.

Interaction-phase logs after baseline reset:

```json
{
  "interactionLogCount": 1,
  "interactionErrorLike": [],
  "updateDepthLogs": [],
  "invalidRefreshLogs": []
}
```

No interaction-phase console errors, page errors, invalid refresh-token errors, maximum-update-depth loops, or too-many-render loops were observed.

## Verification Commands

Commands run for this Stage 4 handoff:

```bash
npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run typecheck
npm run lint -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts
npm run build
```

Results:

- `npm test -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts`
  - Passed, 11 test files and 21 tests.
- `npm run typecheck`
  - Passed.
- `npm run lint -- src/runtime/floating src/components/nexus/nexus-workspace-floating-runtime-bridge.test.ts`
  - Passed.
- `npm run build`
  - Passed. Next.js 16.2.6 production build compiled successfully and generated all 53 static pages.
