# V20 Authenticated Workspace Evidence Collection

Date: 2026-05-31

## Purpose

This run collected no-mutation authenticated workspace evidence for the future non-persistent production preview target scope.

The requested test-account registration/login path was authorized, but it was not used because the local browser restored an authenticated workspace session before registration or credential submission was needed.

No credentials, tokens, cookies, or secrets were recorded.

## Auth Status

| Field | Result |
| --- | --- |
| Route | `http://localhost:3000/` |
| Auth method | `pre-existing-session-restored` |
| Test account registration used | No |
| Login form submitted | No |
| Credentials recorded | No |
| Authenticated workspace visible | Yes |
| Evidence verdict | PASS |

## Required Selector Evidence

| Selector | Count | Visible | Evidence | Verdict |
| --- | ---: | ---: | --- | --- |
| `[data-nexus-production-page-shell-boundary="v1"]` | 1 | 0 | Present as `div.contents`; zero-size boundary wrapper is expected. | Pass |
| `[data-nexus-page-shell="workspace"]` | 1 | 0 | Present as `div.contents`; workspace shell marker exists. | Pass |
| `[data-nexus-production-apply="blocked"]` | 1 | 0 | Present as `div.contents`; production apply remains blocked. | Pass |
| `main.nexus-shell.nexus-outer-shell-frame` | 1 | 1 | Present as `main`; bounding box approximately `1465 x 1354`; not `html`, `body`, or document root. | Pass |

The first-cut future target scope, `main.nexus-shell.nexus-outer-shell-frame`, was observed exactly once in the authenticated workspace.

## Adopted Surface Evidence

| Surface | Selector | Count | Visible | Result |
| --- | --- | ---: | ---: | --- |
| TopBar | `.nexus-top-bar-frame` | 1 | 1 | Visible; bounding box approximately `1465 x 44`. |
| Right dock | `.nexus-right-floating-dock-rail` | 1 | 1 | Visible; bounding box approximately `50 x 402`. |
| Workspace | `.nexus-workspace` | 1 | 1 | Visible; bounding box approximately `1397 x 1294`. |
| Message bubbles | `.nexus-message-bubble` | 0 | 0 | Absent in current workspace state; not a failure. |
| AgentWindow | `.nexus-agent-window` | 0 | 0 | Absent in current workspace state; not forced open. |
| CommandPalette | `.nexus-command-palette-shell` | 0 | 0 | Not opened; command execution avoided. |
| AgentBranchModal | `.nexus-agent-branch-modal-shell` | 0 | 0 | Not opened; modal submit/save behavior avoided. |
| Datapad | `.nexus-datapad-shell` | 0 | 0 | Not opened; save/delete behavior avoided. |
| Control icon button | `.nexus-control-icon-button-shell` | 0 | 0 | Not observed in current visible state. |

Core target and core adopted surfaces are observable. Stateful or optional surfaces were not forced open because this run forbids command execution, form submission, save/delete/upload/download, and workspace mutation.

## Console And Hydration Baseline

| Signal | Result |
| --- | --- |
| Browser console errors | 0 observed |
| Browser console warnings | 0 observed |
| Hydration mismatch | Not observed |
| Chrome Translate state | Not observed; document language was `en` |
| `bg-cyberpunk.webp` baseline | Not observed in browser console logs |
| Current V20 preview-scope regression | None observed |

## Route-Load Network Baseline

The local dev server showed route-load and workspace recovery activity during normal authenticated workspace render:

| Window | Observed requests | Classification |
| --- | --- | --- |
| Route load baseline | `GET / 200` | Existing route-load baseline |
| Workspace data baseline | `GET /api/v1/notebooks 200` | Existing app baseline |
| Prompt data baseline | `GET /api/v1/prompts?... 200` | Existing app baseline |
| Recovery baseline | `GET /api/v1/workspaces/recovery?... 200` and `GET /api/v1/workspaces/recovery/latest?... 200` | Existing app baseline |
| State lookup baseline | `GET /api/v1/workspaces/.../state 404` | Existing route-load baseline |
| Sync baseline | `POST /api/v1/sync/operations 200` | Existing route-load baseline unless future evidence proves preview-caused |

No production preview was applied in this run, so no preview-caused network window exists yet.

Future preview smoke must separate:
- route-load baseline
- stable workspace idle baseline
- preview apply window
- preview revert window
- post-revert idle window

## No-Mutation Evidence

This run did not:
- set CSS variables
- mutate DOM or styles
- mutate `document.documentElement`, `body`, or document root
- write localStorage or IndexedDB
- submit forms
- send messages
- execute command palette commands
- save, delete, upload, or download
- change source files
- write store, backend, Supabase, sync, or API code

## Option A Unlock Status

The authenticated workspace target evidence blocker is cleared.

Option A implementation is unlocked from the target-scope evidence perspective, but it is not automatic. The next step still requires explicit approval for the first-cut non-persistent production preview implementation and must follow `docs/style-system/v20-non-persistent-production-preview-first-cut-design.md`.

Remaining implementation gates:
- implement only the single target scope `main.nexus-shell.nexus-outer-shell-frame`
- preserve no-persistence and no-store/backend/API-write guarantees
- include apply/revert transaction snapshot and residue check
- compare preview network windows against the recorded route-load baseline
- keep rollback/fail-closed behavior mandatory

## Final Verdict

Evidence verdict: PASS.

The future target scope exists exactly once, is visible, is not a root/body/html target, and core adopted production surfaces are observable without mutation.
