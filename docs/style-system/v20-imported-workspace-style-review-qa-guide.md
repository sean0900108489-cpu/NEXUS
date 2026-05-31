# V20 Imported Workspace Style Review QA Guide

Date: 2026-05-31
Branch: codex/v19-production-shell-style-upgrade

## Purpose

Imported workspace style review lets the existing whole-workspace export/import flow carry an optional `stylePack` section. After import, Style Lab shows whether the style payload was accepted, rejected, missing, or unsupported.

This does not auto-apply production style. It is review metadata only until a user explicitly loads a valid imported skin pack into Style Lab review.

## Test Entry Points

- Workspace route: `http://localhost:3000/`
- Style Lab route: `http://localhost:3000/style-lab`
- Import/export entry: existing top-left workspace menu
- Review panel: `Imported Workspace Style`

## Accepted StylePack

1. Import a workspace JSON that contains a valid `stylePack`.
2. Confirm the workspace import succeeds.
3. Open `/style-lab`.
4. Confirm the panel says `accepted`.
5. Confirm the panel says `stylePack imported and available for review`.
6. Confirm `not auto-applied` remains visible.
7. Confirm export retention says the accepted `stylePack` will be included in the next workspace export.
8. If the payload contains a valid `skinPack`, click `Load Into Style Lab Review`.
9. Confirm the V2 Skin Pack Review area becomes accepted or review-ready.

Expected result: workspace remains usable, Style Lab can review the imported style, and production visuals are not changed automatically.

## Rejected StylePack

1. Import a workspace JSON with an unsafe or invalid `stylePack`.
2. Confirm the workspace import still succeeds.
3. Open `/style-lab`.
4. Confirm the panel says `rejected-style-only`.
5. Confirm the panel says the style section was ignored while workspace import still succeeded.
6. Confirm no export-retention promise appears for a valid `stylePack`.
7. Confirm `Load Into Style Lab Review` is disabled.

Expected result: the workspace import is not blocked, but the invalid style section is rejected and is not exported as a valid style payload.

## Missing StylePack

1. Import an old workspace JSON without `stylePack`.
2. Confirm the workspace import succeeds.
3. Open `/style-lab`.
4. Confirm the panel says `missing` or `ignored-missing`.
5. Confirm the panel says the workspace has no `stylePack`.
6. Confirm `not auto-applied` remains visible.

Expected result: old workspace JSON remains backward-compatible and no style payload is invented.

## Unsupported Version

1. Import a workspace JSON with a `stylePack` version other than `style-pack-v2`.
2. Confirm the workspace import still succeeds.
3. Open `/style-lab`.
4. Confirm the panel says `unsupported-version`.
5. Confirm the panel says the style version is not supported.
6. Confirm it is not exported as a valid style payload.

Expected result: unknown style versions are held out of the active review path without breaking the workspace import.

## Export Retention

- Accepted imported style payloads are retained as normalized `stylePack` metadata for the next workspace export.
- Rejected, unsupported, or missing style payloads must not be exported as valid `stylePack`.
- The workspace export/import flow remains the only flow. Do not add a separate style export/import step.

## No Auto-Apply Checks

Confirm after each import:

- No production preview is triggered automatically.
- No document root/body/html style variables are set by import.
- No backend/store/sync write is introduced by style review.
- No production target is changed unless a separate explicit preview flow is used.

## Known Limitations

- Imported review state is tab-scoped review metadata.
- The panel is a review/QA affordance, not a settings page.
- Metadata-only payloads can be inspected but cannot be loaded into Skin Pack Review unless a valid `skinPack` exists.
- Browser download capture may require manual file inspection when automation cannot observe download events.

## Rollback

Revert the commit that added the imported workspace style review panel and this QA note. No backend cleanup is required because the feature stores review metadata only and never auto-applies production style.
