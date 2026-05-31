# V20 Imported Style Review UX Landing Note Checkpoint

Date: 2026-05-31
Branch: codex/v19-production-shell-style-upgrade
Task: V20 Imported Style Review UX Landing Note

## Summary

Added a small UX landing layer for the imported workspace style review flow. The existing whole-workspace export/import path now has clearer wording around whether an imported `stylePack` was accepted, rejected, missing, or unsupported, and Style Lab explains the review state without implying production auto-apply.

This remains review-only. No production style auto-apply, backend persistence, store persistence, separate style import/export flow, sliders, or human controls were added.

## Changed Files

- `src/components/style-engine/nexus-style-lab.tsx`
- `src/components/style-engine/nexus-style-lab-imported-workspace-style.test.ts`
- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-workspace-style-payload-export-import.test.ts`
- `docs/style-system/v20-imported-workspace-style-review-qa-guide.md`
- `docs/style-system/execution-runs/20260531-v20-imported-style-review-ux-landing-note/CHECKPOINT.md`

## Wording Added

Style Lab `Imported Workspace Style` panel now exposes:

- accepted: `stylePack imported and available for review`
- rejected: `style section ignored; workspace import still succeeded`
- missing: `this workspace has no stylePack`
- unsupported: `style version not supported; workspace import still succeeded`
- `not auto-applied`
- accepted export retention: `accepted stylePack will be included in next workspace export`
- rejected/unsupported retention: not exported as valid `stylePack`
- missing retention: no `stylePack` added to workspace export
- next action: load into Style Lab review, metadata-only, or fix payload

Workspace import/export notices now distinguish:

- accepted stylePack review state
- rejected style-only state while keeping workspace import successful
- unsupported style version while keeping workspace import successful
- missing stylePack for old workspace JSON
- reviewed stylePack included on export

## Accepted / Rejected / Missing UX

- Accepted stylePack is shown as reviewable and explicitly not auto-applied.
- Accepted stylePack with a valid `skinPack` can be loaded into the existing Style Lab V2 Skin Pack Review flow.
- Accepted metadata-only payload is visible but does not pretend to be previewable as a skin pack.
- Rejected stylePack shows style-only rejection and does not promise export retention as a valid stylePack.
- Missing stylePack is shown as missing, keeping old workspace JSON backward-compatible.

## Export Retention Behavior

Accepted imported style metadata remains eligible for the next whole-workspace export. Rejected, unsupported, and missing style payloads do not become valid stylePack export payloads.

Browser smoke confirmed an accepted import followed by export produced:

- `stylePack.version`: `style-pack-v2`
- `stylePack.source`: `style-lab`
- `stylePack.skinPack`: present
- `stylePack.bridgeSummary.checksum`: `nexus-style-fnv1a32:85e89afc`

## QA Guide

Created:

`docs/style-system/v20-imported-workspace-style-review-qa-guide.md`

The guide covers:

- purpose
- entry points
- accepted stylePack expectations
- rejected stylePack expectations
- missing stylePack expectations
- unsupported version expectations
- export retention
- no auto-apply checks
- known limitations
- rollback

## Verification Results

- `git diff --check`: pass
- `npm run test -- src/components/style-engine/nexus-style-lab-imported-workspace-style.test.ts src/components/nexus/nexus-workspace-style-payload-export-import.test.ts`: pass, 2 files / 7 tests
- `npm run test -- src/lib/style-engine/v2-workspace-style-payload.test.ts`: pass, 1 file / 13 tests
- `npm run typecheck`: pass
- `npm run lint -- src/components/style-engine/nexus-style-lab.tsx src/components/style-engine/nexus-style-lab-imported-workspace-style.test.ts src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-workspace-style-payload-export-import.test.ts`: pass
- `npm run build`: pass

Build baseline note: Next reports the known edge runtime static-generation warning.

## Browser Smoke Result

Server: temporary local `npm run dev` on `http://localhost:3000`.

Browsers:

- In-app Browser: Style Lab read-only panel and console check.
- Safari: authenticated workspace import/export flow using existing top-left workspace menu and local `/tmp` JSON fixtures.

Observed:

- `/style-lab` loaded and showed the missing state: `this workspace has no stylePack`, `no stylePack will be added to workspace export`, and `not auto-applied`.
- Old workspace JSON without stylePack imported through the top-left workspace menu; workspace remained usable and notice said no stylePack was found.
- Valid workspace JSON with stylePack imported through the top-left workspace menu; notice said stylePack was accepted for Style Lab review and not auto-applied.
- Style Lab showed accepted state, export retention, checksum, direct aliases, families, controls summary, and `not auto-applied`.
- `Load Into Style Lab Review` updated the panel to `loaded into Style Lab review`.
- Invalid workspace JSON with unsafe stylePack imported without breaking the workspace; notice said rejected style-only and Style Lab showed rejection wording with no valid export-retention promise.
- Accepted import followed by workspace export produced a downloaded JSON with normalized `stylePack`.

Console / mutation notes:

- In-app Browser Style Lab console logs for the read-only check were clean.
- Safari did not show visible console/hydration regression during the import/export smoke.
- Safari JavaScript inspection via Apple Events was unavailable because the browser setting is disabled, so document root/body mutation checks were supported by source tests plus the in-app Browser read-only Style Lab check.
- No production preview apply was triggered.
- No messages, commands, save/delete/upload/download outside the safe import/export flow were performed.

## Forbidden Boundaries Held

- No backend/API/Supabase/database/migration edits.
- No remote sync write behavior edits.
- No React Flow / graph behavior edits.
- No drag/resize/focus/z-index/window/modal behavior edits.
- No package/config/deploy edits.
- No `exports/**` edits.
- No production runtime token auto-apply.
- No token persistence to backend/store.
- No document root/body/html style mutation path added.
- No broad `nexus-ops.tsx` refactor.
- No new sliders/human controls.
- No separate style import/export flow.

## Rollback Path

Revert this commit. The change only affects review wording, Style Lab review state presentation, tests, and docs. No backend cleanup or production style cleanup is required.

## Next Recommended Smallest Unit

Add a tiny clear/reset affordance for imported style review metadata in Style Lab, or keep the current flow stable and move to a user-facing QA pass before adding any new production style target.
