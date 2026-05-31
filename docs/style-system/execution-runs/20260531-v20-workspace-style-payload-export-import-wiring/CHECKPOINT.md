# V20 Workspace Style Payload Export Import Wiring Checkpoint

Date: 2026-05-31
Branch: codex/v19-production-shell-style-upgrade
Task: V20 Workspace Style Payload Export Import Adapter Wiring

## Summary

Wired the pure workspace style payload adapter into the existing whole-workspace export/import flow. The integration keeps style data inside the same workspace JSON payload and does not introduce a separate style export/import flow.

This round does not auto-apply production style, does not mutate document root/body/html styles, and does not add persistence for production style runtime state.

## Changed Files

- `src/lib/style-engine/v2-workspace-style-payload.ts`
- `src/lib/style-engine/v2-workspace-style-payload.test.ts`
- `src/components/nexus/nexus-ops.tsx`
- `src/components/nexus/nexus-workspace-style-payload-export-import.test.ts`
- `docs/style-system/execution-runs/20260531-v20-workspace-style-payload-export-import-wiring/CHECKPOINT.md`

## Export / Import Touchpoints

### Export

Touchpoint: `src/components/nexus/nexus-ops.tsx` `handleExport`

- Existing whole-workspace export remains the only export path.
- Export now calls `createWorkspaceStylePayloadExportSnapshot(...)` before serializing the JSON blob.
- If an accepted imported style payload exists in local review state, export includes normalized `stylePack`.
- If no accepted style payload exists, export omits `stylePack` and preserves old-compatible shape.
- If style payload is invalid, export omits it rather than emitting unsafe data.

### Import

Touchpoint: `src/components/nexus/nexus-ops.tsx` `handleImport`

- Existing whole-workspace import remains the only import path.
- Import now calls `extractWorkspaceStylePayloadFromSnapshot(...)` after workspace snapshot parse succeeds.
- Valid style payload is stored as local review metadata only.
- Invalid style payload is rejected style-only; workspace import still proceeds.
- Missing style payload imports exactly like old workspace JSON.
- No production style auto-apply occurs.

## Style Payload Shape

Top-level optional payload:

```ts
stylePack?: {
  version: "style-pack-v2";
  source: "style-lab" | "warm-glass-controls" | "imported";
  skinPack?: NexusSkinPackV2;
  controls?: Record<string, unknown>;
  bridgeSummary?: {
    checksum: string;
    directAliases: number;
    families: number;
  };
}
```

Rules enforced by the adapter:

- optional root section
- V2 skin pack validator required before accepting `skinPack`
- unsafe raw CSS / JS / remote URL / style-tag-like content rejected style-only
- oversized style payload rejected style-only
- unknown style version returns unsupported-version
- no raw CSS, selectors, DOM instructions, or production apply payload is emitted

## Backward Compatibility Result

- Old workspace JSON without `stylePack`: import succeeds, export remains old-compatible.
- New workspace JSON with valid `stylePack`: workspace import succeeds, style metadata is accepted for review.
- New workspace JSON with invalid `stylePack`: workspace import succeeds, style section is rejected only.
- Unknown style version: workspace import can continue, style section is not accepted.

## Invalid Style Behavior

Invalid or unsafe style data does not fail the workspace import. It only updates feedback to indicate style rejection.

Current visible feedback strings:

- `Workspace snapshot imported; style payload accepted for review`
- `Workspace snapshot imported; style payload rejected`
- `Workspace snapshot imported; style payload version unsupported`
- `Workspace snapshot exported with style payload`
- `Workspace snapshot exported; style payload omitted`

## UI Feedback Result

The existing top-left workspace menu remains the only export/import entry point.

Browser smoke confirmed:

- export without accepted style review payload produced JSON without `stylePack`
- old workspace JSON imported and showed normal import feedback
- valid stylePack JSON imported and showed accepted-for-review feedback
- invalid raw-CSS stylePack JSON imported and showed rejected feedback without breaking workspace import
- after accepted style import, export produced JSON with normalized `stylePack`

## Verification Results

- `git diff --check`: pass
- `npm run test -- src/lib/style-engine/v2-workspace-style-payload.test.ts src/components/nexus/nexus-workspace-style-payload-export-import.test.ts`: pass, 2 files / 13 tests
- `npm run test -- src/lib/style-engine/v2-workspace-style-payload.test.ts`: pass, 1 file / 11 tests
- `npm run test -- src/lib/style-engine`: pass, 31 files / 238 tests
- `npm run typecheck`: pass
- `npm run lint -- src/lib/style-engine/v2-workspace-style-payload.ts src/lib/style-engine/v2-workspace-style-payload.test.ts src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-workspace-style-payload-export-import.test.ts`: pass
- `npm run build`: pass

Build baseline note: Next reports the known edge runtime static-generation warning.

## Browser Smoke Result

Route: `http://localhost:3000/`
Browser: Safari local session
Auth status: authenticated workspace visible

Observed:

- existing top-left overall export/import menu usable
- export path works
- import old workspace JSON without style payload succeeds
- import valid stylePack JSON records accepted review feedback
- import invalid stylePack JSON records rejected-style-only feedback and does not break workspace import
- accepted style payload export includes `stylePack`
- no production style auto-apply was introduced
- no document root/body/html style mutation was introduced

Server/browser log baseline notes:

- Existing route/import flow produced normal workspace/recovery/prompt/notebook requests.
- Existing sync/auth baseline included `POST /api/v1/sync/operations` and transient sync/auth log output during workspace activity.
- These were not caused by a new style auto-apply path; this round added no style backend/API call path.

## Forbidden Boundaries Held

- No backend/API/Supabase/database/migration edits.
- No remote sync protocol edits.
- No React Flow / graph behavior edits.
- No drag/resize/focus/z-index/window/modal behavior edits.
- No package/config/deploy edits.
- No `exports/**` edits.
- No production runtime token apply or persistence.
- No document root/body/html style mutation.
- No separate style export/import button.

## Rollback Path

Revert this commit. Because style payload review state is local React state only and no production style persistence was added, no persisted cleanup is required.

## Remaining Limitations

- Imported style payload is only local review metadata in `NexusOps`; it is not yet surfaced in a full Style Lab review queue.
- Accepted style payload currently survives only for the current runtime session until exported.
- No production visual apply is triggered by import.

## Next Recommended Smallest Unit

Add a review bridge from imported workspace style metadata into Style Lab review state or a lightweight imported-style review panel, still without production auto-apply.
