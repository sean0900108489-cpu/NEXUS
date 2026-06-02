# V20 Authenticated Workspace Evidence Collection Checkpoint

Date: 2026-05-31

## Summary

Created authenticated workspace evidence for the future non-persistent production preview first-cut target scope.

The user authorized direct registration/login with a test account, but registration/login was not needed because the browser restored an authenticated workspace session before credential submission. No credentials were submitted, stored, documented, or committed.

## Auth Method

- Method recorded: `pre-existing-session-restored`
- Test account registration used: no
- Login form submitted: no
- Credentials recorded: no
- Authenticated workspace rendered: yes

## Target Scope Evidence

| Selector | Result |
| --- | --- |
| `[data-nexus-production-page-shell-boundary="v1"]` | Present, count `1` |
| `[data-nexus-page-shell="workspace"]` | Present, count `1` |
| `[data-nexus-production-apply="blocked"]` | Present, count `1` |
| `main.nexus-shell.nexus-outer-shell-frame` | Present, count `1`, visible |

Target verdict: pass.

The target is a `main` element, not document root, not `html`, and not `body`.

## Surface Evidence

Visible core surfaces:
- `.nexus-top-bar-frame`
- `.nexus-right-floating-dock-rail`
- `.nexus-workspace`

Absent or not forced open:
- `.nexus-message-bubble`
- `.nexus-agent-window`
- `.nexus-command-palette-shell`
- `.nexus-agent-branch-modal-shell`
- `.nexus-datapad-shell`
- `.nexus-control-icon-button-shell`

These optional/stateful surfaces are not failures for this run because no command execution, form submission, save/delete, upload/download, or workspace mutation was allowed.

## Console / Hydration Baseline

- Console errors observed: `0`
- Console warnings observed: `0`
- Hydration mismatch: not observed
- Chrome Translate: not observed
- `bg-surface-shell.webp` load failure: not observed in browser console logs

## Network Baseline

Observed normal route-load/workspace baseline:
- `GET / 200`
- `GET /api/v1/notebooks 200`
- `GET /api/v1/prompts?... 200`
- `GET /api/v1/workspaces/recovery?... 200`
- `GET /api/v1/workspaces/recovery/latest?... 200`
- `GET /api/v1/workspaces/.../state 404`
- `POST /api/v1/sync/operations 200`

`POST /api/v1/sync/operations 200` is classified as existing route-load baseline unless future evidence proves preview-caused.

No preview apply/revert was run, so no preview-caused network activity was introduced.

## Evidence Verdict

PASS.

Pass reasons:
- authenticated workspace visible
- target selector exists exactly once
- core adopted surfaces visible
- console/hydration baseline recorded
- route-load network baseline recorded
- no deliberate workspace mutation performed
- no credentials recorded
- no source changed

## Option A Unlock

The authenticated workspace evidence blocker is cleared.

Option A implementation may proceed only after explicit user approval for the first-cut implementation task. It remains bounded by the existing design:
- target: `main.nexus-shell.nexus-outer-shell-frame`
- non-persistent preview only
- no document root mutation
- no store/backend/storage writes
- no production behavior changes
- apply/revert transaction snapshot required
- network baseline comparison required

## Forbidden Boundaries Held

- No source changes
- No production preview apply
- No CSS variable mutation
- No DOM/style mutation
- No localStorage or IndexedDB writes
- No message send
- No command execution
- No save/delete/upload/download
- No store/sync/backend/Supabase/API code changes
- No credentials recorded

## Verification

- `git diff --check`: pass
- Diff/status limited to allowed docs plus the pre-existing untracked `docs/style-system/v19-production-shell-style-required-reading.md`: pass

## Rollback

Revert the docs commit only. No runtime, source, data, credentials, storage, or workspace cleanup is required.

## Next Recommended Target Seed

`V20 Non-Persistent Production Preview First Cut Implementation`

The seed should stay narrow:
- implement a pure transaction planner first if possible
- target only `main.nexus-shell.nexus-outer-shell-frame`
- require checksum/session guard
- snapshot previous inline values
- apply/revert only non-persistent CSS variables
- include residue check
- compare network windows
- fail closed on missing/duplicated target
