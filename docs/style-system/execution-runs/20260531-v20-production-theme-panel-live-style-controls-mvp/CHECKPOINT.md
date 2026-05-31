# V20 Production Theme Panel Live Style Controls MVP Checkpoint

## Scope

- Branch: `codex/v19-production-shell-style-upgrade`
- Task: Production Theme Panel Live Style Controls MVP
- Result: implemented first production Theme-panel style controls that live-preview only on `main.nexus-shell.nexus-outer-shell-frame`, save normalized controls into the existing workspace `stylePack.controls` export path, and revert preview variables without touching `html`, `body`, or the document root.

## Changed Files

- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-theme-panel-live-style-controls.test.ts`
- `src/lib/style-engine/v2-workspace-style-payload.ts`
- `src/lib/style-engine/v2-workspace-style-payload.test.ts`
- `docs/style-system/execution-runs/20260531-v20-production-theme-panel-live-style-controls-mvp/CHECKPOINT.md`

Pre-existing untracked file not staged:

- `docs/style-system/v19-production-shell-style-required-reading.md`

## Controls Added

`Workspace Style Controls` now appears in the production `/` Theme panel and includes:

- `warmth`
- `glass`
- `blur`
- `radius`
- `shadow`
- `workspace wash`
- draggable native color control for accent color
- `Save`
- `Revert`
- `Reset`

The previous broad Theme/Style list and visible legacy `LEGO THEME ENGINE` control entry were removed from the Theme panel so the new MVP has one user-facing style-control path.

## Controls To Variables Mapping

The mapping is deterministic and allowlisted through `createWorkspaceThemeStylePreviewVariablesV1`.

Main variable families:

- panel/glass/right dock/top bar/workspace backgrounds
- workspace wash/grid variables
- panel/glass/workspace/top bar/right dock borders
- panel/glass/top bar/right dock/workspace/agent window/message/modal/datapad radii
- panel/glass/top bar/right dock/agent window blur
- panel/workspace/top bar/right dock/agent window shadows
- `--nexus-accent-*`
- `--theme-primary`, `--theme-primary-strong`, `--theme-secondary`

No raw CSS, raw selector, raw JS, remote URL, or arbitrary user-provided CSS is accepted.

## Target Selector

- Only target: `main.nexus-shell.nexus-outer-shell-frame`
- Fail-closed if target count is not exactly `1`
- Fail-closed if target is `html`, `body`, or document root
- Preview writes inline CSS variables only to the target element

## Save / Export / Import Behavior

- `Save` normalizes controls through `createWorkspaceThemeStyleControlsPayloadV1`.
- Saved controls are written into the existing imported workspace style review/export state.
- Workspace export path retains normalized `stylePack.controls.themeControlsV1`.
- Import with valid controls restores Theme panel controls.
- Import without controls remains old-compatible.
- Invalid controls are style-only rejected and do not break workspace import.
- No backend persistence, sync protocol change, or production auto-apply was added.

## Revert / Residue Behavior

- `Revert` restores previous inline values and removes preview-introduced variables.
- Browser smoke confirmed:
  - preview vars during live preview: `45` on `main.nexus-shell.nexus-outer-shell-frame`
  - document root preview vars: `0`
  - body preview vars: `0`
  - after revert target preview vars: `0`
  - residue: `PASS / 0`

## Verification

- `git diff --check`: pass
- Focused tests:
  - `npm run test -- src/components/nexus/nexus-theme-panel-live-style-controls.test.ts src/lib/style-engine/v2-production-preview-transaction.test.ts src/lib/style-engine/v2-workspace-style-payload.test.ts src/components/nexus/nexus-workspace-style-payload-export-import.test.ts`
  - result: pass, `4` files / `37` tests
- `npm run typecheck`: pass
- Targeted lint:
  - `npm run lint -- src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-theme-panel-live-style-controls.test.ts src/lib/style-engine/v2-workspace-style-payload.ts src/lib/style-engine/v2-workspace-style-payload.test.ts`
  - result: pass
- `npm run build`: pass

## Browser Smoke

Route: authenticated `http://localhost:3000/`

Confirmed:

- Theme panel opens from right dock.
- `Workspace Style Controls` visible.
- Target selector exists exactly once.
- Core surfaces visible: top bar, right dock, workspace.
- Moving `warmth`, `radius`, and `glass` immediately applies target-scoped preview variables.
- `Save` shows saved workspace export status.
- `Revert` restores target to zero preview vars and reports residue pass.
- A second apply/revert check created no new browser-observed API resource entries.
- Console errors/warnings after smoke: `0`.

Tool limitation:

- Codex in-app browser does not support inspecting downloaded workspace export files. Export payload inclusion is therefore verified by focused source/tests rather than direct browser download inspection in this run.

## Network Baseline

- Route-load baseline remains separate from preview behavior.
- Browser resource-entry comparison during apply/revert showed `0` new resources and `0` new `/api/` resources.
- No preview-caused backend/API request was observed.

## Forbidden Boundaries Held

- No push/deploy.
- No package/config/deploy changes.
- No `exports/**`.
- No backend/API/Supabase/database/migration changes.
- No sync protocol or remote write behavior changes.
- No React Flow/graph behavior changes.
- No auth/login changes.
- No command/message/save/delete/upload/download behavior changes.
- No document root/body/html style mutation from the new live controls path.
- No production style persistence to backend/store.

## Risk And Stabilization

Risk increased during UX iteration because the Theme panel touchpoint is user-facing and `nexus-ops.tsx` changed substantially.

Mitigation completed:

- Removed the visible legacy broad Theme/Style and `LEGO THEME ENGINE` entry from the Theme panel.
- Kept live preview target scoped to the first-cut production target.
- Revalidated tests, typecheck, lint, build, and browser smoke after the UX corrections.

Residual risk: approximately `4%`, mainly from browser download inspection limits and the remaining pre-existing workspace `themeConfig` root-token effect outside the new controls path.

## Rollback Path

- Revert this commit to remove the Theme panel MVP controls and workspace controls payload extension.
- No persisted backend state cleanup is required.
- If local preview residue is suspected in a browser session, click `Revert` or reload the page.

## Remaining Gaps

- Direct browser inspection of exported download payload needs a browser/download-capable tool or manual user confirmation.
- The legacy workspace `themeConfig` document-root effect remains pre-existing; it is no longer exposed through the new Theme panel controls but should be separated or retired in a future cleanup.
- The accent/day-night palette needs a later design pass; day/night was intentionally removed from this MVP.

## Next Recommended Smallest Unit

`V20 Theme Controls Export Download Verification And Legacy ThemeConfig Retirement Plan`

Goal:

- verify exported JSON through a download-capable path or controlled fixture,
- decide whether to retire/migrate the remaining legacy `themeConfig` document-root effect,
- avoid adding new controls until the MVP is stable in repeated use.
