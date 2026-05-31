# V20 Non-Persistent Production Preview First Cut Implementation

Date: 2026-05-31

## Scope

Implemented the first narrow production runtime touch for V20 style preview.

Target scope:

```text
main.nexus-shell.nexus-outer-shell-frame
```

This round intentionally remained limited to one non-persistent preview target. It did not add token persistence, backend writes, workspace state writes, asset/layout apply, document root mutation, or broad production styling.

## Files Changed

- `src/lib/style-engine/v2-production-preview-transaction.ts`
- `src/lib/style-engine/v2-production-preview-transaction.test.ts`
- `src/components/nexus/nexus-production-preview-controller.tsx`
- `src/components/nexus/nexus-production-preview-controller.test.ts`
- `src/app/page.tsx`
- `docs/style-system/execution-runs/20260531-v20-non-persistent-production-preview-first-cut-implementation/CHECKPOINT.md`

Pre-existing untracked file intentionally not staged:

- `docs/style-system/v19-production-shell-style-required-reading.md`

## Transaction Planner

Added a pure transaction planner:

- `createProductionPreviewApplyPlan`
- `createProductionPreviewRevertPlan`
- `createProductionPreviewResidueCheck`
- `NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR`

Planner properties:

- Data-only apply/revert plans.
- No DOM access.
- No selector execution.
- No raw CSS payload output.
- No production behavior imports.
- Fail-closed target validation.
- Target count must be exactly `1`.
- Target must not be `html`, `body`, or document root.
- Target selector must be `main.nexus-shell.nexus-outer-shell-frame`.
- Target class list must contain `nexus-shell` and `nexus-outer-shell-frame`.
- Variable map must be non-empty.
- Bridge checksum must match the variable map checksum.
- Budget checksum must match diagnostics checksum.
- Preflight verdict must be `eligible`.
- Authenticated evidence and rollback plan are required.
- Store/backend/storage/document-root/behavior touch flags block the plan.
- Revert restores previous inline values or removes preview-introduced variables.
- Residue check reports remaining preview variables and mismatches.

## Controller Behavior

Added a minimal query-gated production preview controller:

```text
/?nexusPreviewFirstCut=1
```

Controller properties:

- Renders no controls unless `nexusPreviewFirstCut=1`.
- Uses the Warm Glass fixture, V2 render plan, production bridge plan, budget summary, and production preview preflight contract.
- Targets only `main.nexus-shell.nexus-outer-shell-frame`.
- Snapshots previous inline CSS variable values before apply.
- Applies only bridge CSS variables to the target element.
- Reverts only variables from the active transaction.
- Leaves document root, `body`, and `html` untouched.
- Does not import store, sync, backend, Supabase, or API modules.
- Does not use `localStorage`, `IndexedDB`, `fetch`, or persistence APIs.
- Does not change Nexus production behavior.

Visible controls were added only for the query-gated first-cut smoke because hidden controls were not reliably operable through browser tooling. They are intentionally temporary and scoped to `?nexusPreviewFirstCut=1`.

## Browser Smoke

Route:

```text
http://localhost:3000/?nexusPreviewFirstCut=1
```

Authenticated workspace evidence:

- Target selector count: `1`
- Target visible: yes
- Target tag: `main`
- Target is not document root/body/html: yes
- Core surfaces were already authenticated-smoke-confirmed in the previous evidence run.

Apply result:

- Status: `applied`
- Variable count: `83`
- Apply duration: about `1.0-1.2ms`
- Bridge checksum: `nexus-style-fnv1a32:da911dfb`
- Budget checksum: `nexus-style-fnv1a32:85e89afc`
- Target inline preview variable count after apply: `83`
- Document root preview variable count: `0`
- Body preview variable count: `0`

Sample applied variables:

- `--nexus-panel-bg`: `rgb(255 244 226 / 0.16)`
- `--nexus-top-bar-bg`: `rgb(255 244 226 / 0.16)`
- `--nexus-workspace-bg`: `#2a2119`

Revert result:

- Status: `reverted`
- Revert duration: about `0.3-0.6ms`
- Residue check: `pass`
- Remaining preview variable count: `0`
- Target inline preview variable count after revert: `0`
- Document root preview variable count: `0`
- Body preview variable count: `0`
- Repeated apply/revert smoke also returned `reverted` with residue `pass`.

Console result after the final route-query implementation:

- Console errors: `0`
- Console warnings: `0`
- Hydration mismatch: none observed after moving query gating to the route edge.

## Network Baseline Comparison

Route-load baseline still includes existing app requests, including normal authenticated workspace fetches and `POST /api/v1/sync/operations 200`.

Preview apply/revert comparison:

- No new dev-server network output was observed during the final apply/revert window.
- No preview-caused API, store, backend, or persistence write was introduced by the controller path.
- Existing route-load network activity remains classified as baseline unless separately shown to be caused by preview.

## Verification

Commands:

```text
git diff --check
npm run test -- src/lib/style-engine/v2-production-preview-transaction.test.ts src/components/nexus/nexus-production-preview-controller.test.ts
npm run test -- src/lib/style-engine/v2-production-preview-preflight.test.ts
npm run typecheck
npm run lint -- src/lib/style-engine/v2-production-preview-transaction.ts src/lib/style-engine/v2-production-preview-transaction.test.ts src/components/nexus/nexus-production-preview-controller.tsx src/components/nexus/nexus-production-preview-controller.test.ts src/app/page.tsx
npm run build
```

Results:

- Diff check: pass
- Transaction/controller tests: pass, 2 files, 11 tests
- Production preview preflight tests: pass, 1 file, 11 tests
- Typecheck: pass
- Targeted lint: pass
- Build: pass

Build note:

- Build completed successfully.
- Next build output reported `/` as dynamic and emitted the existing edge-runtime static-generation warning. This was recorded as an observation, not as this round's failure, because the build completed cleanly.

## Forbidden Boundaries Held

Held:

- No push.
- No deploy.
- No secrets or `.env` reads.
- No package/config/deploy changes.
- No `exports/**`.
- No Supabase/database/migrations changes.
- No store/sync/backend/Supabase/API changes.
- No React Flow or graph behavior changes.
- No `src/components/nexus/nexus-ops.tsx` changes.
- No `src/components/nexus/nexus-graph.tsx` changes.
- No `src/app/globals.css` changes.
- No document root/body/html mutation.
- No token persistence.
- No backend persistence.
- No asset/layout production apply.
- No command execution, message send, upload, download, save, or delete during smoke.

## Observed Out-of-Scope Issue

The left top workspace menu can render beneath React Flow workspace layers. Inspection showed the dropdown exists but part of it is covered by workspace/React Flow elements. This appears to be a TopBar/workspace stacking-context issue and is not caused by the bottom-left query-gated preview controller.

This was not fixed in this round because it would require touching production UI behavior/styling outside the first-cut preview scope, likely in `src/components/nexus/nexus-ops.tsx` or the TopBar frame.

Recommended follow-up seed:

```text
V20 TopBar Workspace Menu Stacking Fix
```

## Rollback Path

Rollback is direct:

1. Revert the commit from this round.
2. Remove the query-gated controller wiring from `src/app/page.tsx`.
3. Remove `src/components/nexus/nexus-production-preview-controller.tsx`.
4. Remove the transaction planner and focused tests if the preview feature is fully rolled back.

No persisted state cleanup is required because the preview is non-persistent and the browser smoke confirmed residue `pass` with `0` remaining preview variables.

## Remaining Limitations

- The preview is still first-cut and query-gated.
- It has temporary visible controls only for smokeability.
- It only targets `main.nexus-shell.nexus-outer-shell-frame`.
- It does not yet provide a polished user-facing production preview UI.
- It does not expand to individual surfaces, asset/layout previews, or persistence.
- Route-load baseline network activity still exists and must remain separated from preview-caused activity in future smoke runs.

## Next Recommended Target Seed

Highest ROI next seed:

```text
V20 TopBar Workspace Menu Stacking Fix
```

Reason:

- It is an observed production usability blocker.
- It is independent of preview persistence.
- It should be handled as a narrow stacking/focus/z-index investigation, not as part of the preview first-cut commit.

Secondary follow-up:

```text
V20 Non-Persistent Production Preview Transaction Hardening
```

Use only after the menu stacking blocker is triaged or explicitly deferred again.
