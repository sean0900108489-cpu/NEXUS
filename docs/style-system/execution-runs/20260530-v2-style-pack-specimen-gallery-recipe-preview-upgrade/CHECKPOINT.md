# V2 Style Pack Specimen Gallery / Recipe Preview Upgrade Checkpoint

Date: 2026-05-30
Branch: `codex/v18-style-pack-contract-prep`

## Starting State

- Started from clean working tree.
- Starting HEAD: `415b28b docs: checkpoint v2 style pack authoring loop`
- Existing baseline:
  - V2 Skin Pack contracts and validators existed.
  - Style Lab V2 review-only import existed.
  - Style Lab V2 token-only preview/revert existed.
  - Authoring context and Pixel Workshop fixture existed.

## What Changed

- Added a pure V2 specimen preview helper:
  - `compileNexusSkinPackSpecimenPreviewV2`
  - `compileNexusSkinPackSpecimenPreviewTextV2`
  - `createNexusSkinPackSpecimenGalleryFromAcceptedPackV2`
- Added focused tests for the helper.
- Added an isolated `/style-lab` V2 Specimen Gallery.
- Exported the helper through the Style Engine barrel.

## Added Specimens

- Panel
- Button default
- Button hover-like
- Button disabled-like
- Input
- Badge/status
- Command palette
- Agent window
- Modal/dialog
- Sidebar/dock

## Recipe Support

Supported from the current V1 manifest recipe shape:

- `panel`
- `button`
- `input`
- `badge`
- `window`
- `modal`
- `commandPalette`
- `dock`

The gallery resolves safe semantic token references into display-only style
objects. It does not emit raw CSS declarations, selectors, behavior classes,
DOM bindings, store writes, backend calls, Supabase calls, or React Flow
behavior.

## Fallback Behavior

- Missing recipe groups fall back to safe token-level display values.
- Missing recipe slots fall back to safe token-level display values.
- Unsupported token references report a fallback issue instead of crashing.
- Rejected V2 Skin Packs produce no gallery.
- Rejected results do not return unsafe Skin Pack payloads.

## How To Test Minimal / Pixel Skins

1. Open `/style-lab`.
2. Click `Use Minimal`.
3. Click `Review`.
4. Confirm V2 review is accepted and V2 Specimen Gallery status is
   `isolated gallery ready`.
5. Click `Use Pixel`.
6. Click `Review`.
7. Confirm V2 review is accepted and the gallery visibly changes to the Pixel
   Workshop palette.
8. Click `Preview Tokens`.
9. Confirm scoped variables are applied to the runtime target.
10. Click `Revert V2`.
11. Confirm scoped variables are removed.

## Verification Completed

- `git diff --check`: passed
- `npm run test -- src/lib/style-engine`: passed
  - 20 files
  - 153 tests
- `npm run typecheck`: passed
- `npm run lint -- src/components/style-engine/nexus-style-lab.tsx src/lib/style-engine`: passed
- `npm run build`: passed
- Browser smoke on existing `localhost:3000` server: passed
  - Minimal fixture accepted and gallery rendered
  - Pixel fixture accepted and gallery visibly changed
  - Invalid fixture rejected and gallery was not rendered
  - `Preview Tokens` applied `--nexus-accent-primary: #45f0d7`
  - `Revert V2` removed the scoped accent variable
  - browser console errors: 0

## Still Not Implemented

- No asset preview or asset loading.
- No layout preset preview.
- No production Nexus shell integration.
- No workspace store, sync, backend, Supabase, Vercel, GitHub, package, config,
  deploy, or `exports/**` changes.
- No React Flow behavior changes.
- No save/apply/persist flow.

## Next Step Toward Production Integration

The next step should still be a pure Render Plan IR gate before production
integration. The specimen gallery proves display-safe recipe coverage for Style
Lab only; production apply needs a separate protocol-backed render plan,
adapter, persistence, and compatibility gate.
