# V20 Production Preview First Cut Operating Guide Checkpoint

Date: 2026-05-31

## Scope

Created a docs-only operating guide for the first non-persistent production preview cut.

No source files were changed.

## Docs Created

- `docs/style-system/v20-production-preview-first-cut-operating-guide.md`
- `docs/style-system/execution-runs/20260531-v20-production-preview-first-cut-operating-guide/CHECKPOINT.md`

## Operating Flow

The guide documents:

- activation route: `http://localhost:3000/?nexusPreviewFirstCut=1`
- authenticated workspace requirement
- normal `/` must not show preview controls
- target selector: `main.nexus-shell.nexus-outer-shell-frame`
- required route-edge markers:
  - `[data-nexus-production-page-shell-boundary="v1"]`
  - `[data-nexus-page-shell="workspace"]`
  - `[data-nexus-production-apply="blocked"]`
- required core surfaces:
  - `.nexus-top-bar-frame`
  - `.nexus-right-floating-dock-rail`
  - `.nexus-workspace`
- apply expectations
- revert expectations
- residue expectations

## Validation Checklist

The guide includes a first-cut validation checklist covering:

- authenticated workspace visibility
- query-gated controls
- target selector count exactly `1`
- target not root/body/html
- core surfaces visible
- apply status `applied`
- revert status `reverted`
- residue check `pass`
- remaining preview vars `0`
- document root/body mutation `0`
- no localStorage/IndexedDB
- no store/backend/API writes from preview
- no preview-caused console/hydration errors
- no preview-caused network calls
- known baseline separated

## Known Baseline / Regression Separation

Known baseline entries recorded:

- `bg-surface-shell.webp` placeholder/load issue, if present
- normal route-load `POST /api/v1/sync/operations 200`
- existing notebook/prompt/recovery/workspace/sync fetches
- edge runtime static-generation build warning
- Chrome Translate hydration mismatch only if Translate is active

Preview regression examples recorded:

- new API call during apply/revert
- residue fail
- target missing or duplicated
- target resolving to root/body/html
- document root/body preview vars
- preview controls appearing on normal `/`
- console/hydration errors caused by preview
- workspace behavior changes
- command/message/save/delete/upload/download/form submit during smoke

## Stop Conditions

The guide requires stopping if:

- authenticated workspace is absent
- target count is not exactly `1`
- target is root/body/html
- route-edge markers are missing
- controls appear on normal `/`
- apply mutates document root/body/html
- apply/revert causes API calls
- revert residue fails
- remaining preview vars are not `0`
- preview causes console/hydration errors
- workspace data changes
- observing the target requires mutation

## Rollback Path

Primary rollback:

```text
git revert ed4d884
```

No persisted state cleanup is expected because the preview is non-persistent.

If residue is suspected after a failed run, the guide directs:

1. click `Revert` if available
2. reload browser tab
3. confirm target preview vars `0`
4. confirm document root/body preview vars `0`

## Next Target Policy

Second target work remains blocked until:

- first-cut smoke is reproducible
- residue remains `pass`
- user explicitly approves the next target
- target scope map is updated
- transaction/fail-closed contract is reused

The guide explicitly does not authorize:

- broad shell-wide apply
- document root/body/html apply
- persistence
- asset/layout production apply
- backend/store/API integration
- multiple target scopes in one jump

## Forbidden Boundaries Held

Held:

- no push
- no deploy
- no `.env` or secrets read
- no source changes
- no package/config/deploy changes
- no `exports/**`
- no store/sync/backend/Supabase/API changes
- no React Flow or graph behavior changes
- no persistence
- no asset/layout production apply
- no browser smoke
- no production apply

## Verification

Commands:

```text
git diff --check
git diff --name-only
```

Result:

- Diff check: pass
- Diff contains only allowed docs:
  - `docs/style-system/execution-runs/20260531-v20-production-preview-first-cut-operating-guide/CHECKPOINT.md`
  - `docs/style-system/v20-production-preview-first-cut-operating-guide.md`

No tests/build/browser smoke were required because this round was docs-only and changed no source.
