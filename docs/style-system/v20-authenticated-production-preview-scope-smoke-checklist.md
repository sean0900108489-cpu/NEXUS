# V20 Authenticated Production Preview Scope Smoke Checklist

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

Commit tested: `5c3019f docs: map production preview target scopes`

## Purpose

This checklist records no-mutation browser evidence for the future
non-persistent production preview target scope.

This run did not implement production preview, did not apply CSS variables, did
not mutate DOM styles, did not add persistence, did not edit source, and did not
submit login credentials.

## Route Tested

- URL: `http://localhost:3000/`
- Browser context: Codex in-app browser
- Dev server: temporary local `npm run dev` server started for this run because
  no listener was available on port `3000`
- Auth status: `auth-gated`

Observed auth gate text:

- `NEXUS // AI OPS`
- `IDENTITY GATE / GLOBAL VAULT`
- `EMAIL`
- `PASSWORD`
- `LOGIN`
- `Checking session...`
- `NEED ACCOUNT`

Because the route was auth-gated, the smoke stopped before opening
CommandPalette, Modal, Datapad, or any behavior-bearing workflow.

## Selector Checks

| Check | Selector | Count | Visible count | Result | Notes |
| --- | --- | ---: | ---: | --- | --- |
| Route-edge production shell boundary | `[data-nexus-production-page-shell-boundary="v1"]` | 1 | 0 | confirmed | Boundary uses `class="contents"`, so visible count `0` is expected. |
| Page shell id | `[data-nexus-page-shell="workspace"]` | 1 | 0 | confirmed | Present on the route-edge boundary. |
| Production apply blocked marker | `[data-nexus-production-apply="blocked"]` | 1 | 0 | confirmed | Confirms production apply remains blocked. |
| Page shell | `main.nexus-shell` | 1 | 1 | confirmed | Present, but this is the auth gate shell, not the authenticated workspace shell. |
| Future target scope | `main.nexus-shell.nexus-outer-shell-frame` | 0 | 0 | hold-auth | Not rendered because authenticated `NexusOpsOuterShellFrame` was not reached. |

## Adopted Surface Visibility

| Surface | Selector | Count | Visible count | Result | Notes |
| --- | --- | ---: | ---: | --- | --- |
| TopBar | `.nexus-top-bar-frame` | 0 | 0 | not reached | Auth gate prevented production workspace render. |
| Right dock | `.nexus-right-floating-dock-rail` | 0 | 0 | not reached | Auth gate prevented production workspace render. |
| Workspace | `.nexus-workspace` | 0 | 0 | not reached | Auth gate prevented production workspace render. |
| Message bubbles | `.nexus-message-bubble` | 0 | 0 | not reached | Auth gate prevented production workspace render. |
| Message bubble user | `.nexus-message-bubble-user` | 0 | 0 | not reached | Auth gate prevented production workspace render. |
| Message bubble assistant | `.nexus-message-bubble-assistant` | 0 | 0 | not reached | Auth gate prevented production workspace render. |
| Message bubble tool | `.nexus-message-bubble-tool` | 0 | 0 | not reached | Auth gate prevented production workspace render. |
| AgentWindow | `.nexus-agent-window` | 0 | 0 | not reached | Auth gate prevented production workspace render. |
| CommandPalette | `.nexus-command-palette-shell` | 0 | 0 | not opened | Not safe to force under auth gate; no command was executed. |
| Modal shell | `.nexus-agent-branch-modal-shell` | 0 | 0 | not opened | Not safe to force under auth gate; no submit/validation occurred. |
| Datapad shell | `.nexus-datapad-shell` | 0 | 0 | not opened | No save/delete/upload/download occurred. |
| Control icon selector | `.nexus-control-icon-button-shell` | 0 | 0 | not reached | Auth gate prevented production workspace render. |

## Console / Hydration Baseline

| Signal | Result | Notes |
| --- | --- | --- |
| Browser console errors | 0 | `tab.dev.logs` returned no `error` entries. |
| Browser console warnings | 0 | `tab.dev.logs` returned no `warn` / `warning` entries. |
| Hydration mismatch | none observed | No hydration error appeared in browser console logs. |
| Chrome Translate mismatch | not observed | Page `lang` was `en`; no Translate-related mismatch was observed. |
| `bg-cyberpunk.webp` baseline | not observed | The auth gate did not surface this known placeholder issue. |
| V20 preview-scope regression | none observed | No preview implementation exists in this run. |

## Route-Load Server Baseline

The temporary dev server showed existing route-load API activity after opening
`/`, including:

- `GET /api/v1/prompts?...`
- `GET /api/v1/workspaces/recovery?...`
- `GET /api/v1/notebooks`
- `GET /api/v1/workspaces/.../state` with `404`
- `POST /api/v1/sync/operations 200`

This was not caused by any new source code in this run, and no browser
interaction intentionally submitted data. However, because the route load itself
emitted existing API/sync traffic, this smoke cannot be treated as fully
zero-mutation production evidence.

Future authenticated smoke should explicitly record route-load network/server
activity before any preview implementation is considered.

## Target Scope Verdict

Verdict: `hold-auth`

Reasons:

- route-edge boundary is present
- `data-nexus-production-apply="blocked"` is present
- `main.nexus-shell` exists, but only for the auth gate shell
- recommended target `main.nexus-shell.nexus-outer-shell-frame` did not render
  because authenticated workspace UI was not reached
- adopted production surfaces were not visible
- route load emitted existing API/sync traffic, so no-mutation evidence remains
  incomplete

## Recommendation

Option A design can continue at the checklist/spec level.

Option A implementation remains blocked.

Before implementation, a future authenticated smoke must provide:

- authenticated route access without credential submission inside the task
- confirmed `main.nexus-shell.nexus-outer-shell-frame`
- adopted surface visibility evidence
- console/hydration baseline
- route-load API/network baseline
- explicit no workspace mutation evidence
- rollback/revert plan for a single declared target

## No-Go Boundaries Preserved

- no production preview apply
- no CSS variable mutation
- no DOM style mutation
- no document root mutation
- no login or credential submission
- no command execution
- no modal submit
- no Datapad save/delete/upload/download
- no source edits
- no package/config/deploy edits
- no persistence implementation
