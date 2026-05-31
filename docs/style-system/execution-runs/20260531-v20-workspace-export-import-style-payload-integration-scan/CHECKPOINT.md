# V20 Workspace Export Import Style Payload Integration Scan Checkpoint

Date: 2026-05-31

## Scope

Scanned the existing whole-workspace export/import flow and added a pure style payload adapter for optional V2 style sections inside workspace snapshots.

No production UI export/import behavior was changed.

## Files Changed

- `src/lib/style-engine/v2-workspace-style-payload.ts`
- `src/lib/style-engine/v2-workspace-style-payload.test.ts`
- `docs/style-system/v20-workspace-export-import-style-payload-integration-scan.md`
- `docs/style-system/execution-runs/20260531-v20-workspace-export-import-style-payload-integration-scan/CHECKPOINT.md`

Pre-existing untracked file intentionally not staged:

- `docs/style-system/v19-production-shell-style-required-reading.md`

## Export / Import Flow Scan

Export:

- UI trigger: `src/components/nexus/nexus-ops.tsx`, top workspace menu and command palette.
- Export function: `handleExport`.
- Payload source: `exportActiveWorkspace`.
- Payload serialization: `JSON.stringify(snapshot, null, 2)`.
- File creation: `new Blob([...], { type: "application/json" })`.
- File name: `nexus-ai-ops-${Date.now()}.json`.
- Sync metadata: attempts to include notebook recovery metadata from `localSyncQueueAdapter.getOperations()`.

Import:

- UI trigger: hidden file input in `src/components/nexus/nexus-ops.tsx`.
- Import function: `handleImport`.
- File read: `await file.text()`.
- Validation: `parseWorkspaceSnapshot(text)`.
- Reparse: `JSON.parse(text) as Partial<WorkspaceSnapshot>`.
- Store import: reconstructed known `WorkspaceSnapshot` is passed to `importWorkspace`.
- Store behavior: `importWorkspace` validates again, sanitizes, replaces active workspace state, restores notebook/draft caches, queues workspace cloud sync, refreshes prompts, and upserts imported notebooks through the existing sync manager.

## Existing Payload Schema

Current root:

```ts
type WorkspaceSnapshot = {
  schemaVersion: 1;
  exportedAt: string;
  deletedNotebooks?: NotebookRecord[];
  notebookDrafts?: NotebookDraftRecord[];
  notebookRecovery?: WorkspaceNotebookRecoveryMetadata;
  workspace: NexusWorkspace;
  notebooks?: NotebookRecord[];
};
```

Current workspace has `themeConfig?: WorkspaceThemeConfig`, but this is a legacy/live control section and not a safe home for V2 Skin Pack payload.

## Style Payload Placement

Recommended optional root section:

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
};
```

Reasons:

- old snapshots remain valid
- import can validate style independently
- invalid style can be rejected without corrupting workspace import
- V2 style data stays separate from existing `workspace.themeConfig`
- no production apply or backend persistence is implied by import

## Pure Adapter Added

Added:

- `extractWorkspaceStylePayloadFromSnapshot`
- `normalizeWorkspaceStylePayload`
- `NEXUS_WORKSPACE_STYLE_PAYLOAD_VERSION_V1`
- `NEXUS_WORKSPACE_STYLE_PAYLOAD_MAX_BYTES`

Decision statuses:

- `accepted`
- `rejected-style-only`
- `ignored-missing`
- `unsupported-version`

Adapter rules:

- missing `stylePack` returns `ignored-missing`
- unsupported version returns `unsupported-version`
- valid V2 Skin Pack must pass `validateNexusSkinPackV2`
- safe controls are accepted as review-only JSON
- bridge summary requires a valid `nexus-style-fnv1a32:*` checksum and non-negative integer counts
- oversized style payload over `96 KiB` is rejected style-only
- raw CSS, script-like keys, remote URLs, `data:`, `url(...)`, and CSS rule text are rejected style-only
- metadata-only style payload is rejected style-only
- adapter never mutates store/backend, never applies style, and never emits DOM/CSS instructions

## Compatibility Policy

| Case | Decision |
| --- | --- |
| old snapshot without style | `ignored-missing`; workspace import should continue |
| valid `stylePack.skinPack` | `accepted`; review-only until future gate |
| valid safe `controls` | `accepted`; review-only until future gate |
| invalid skin pack | `rejected-style-only`; workspace import should continue if workspace is valid |
| unknown style version | `unsupported-version`; workspace import should continue if workspace is valid |
| oversized payload | `rejected-style-only` |
| unsafe CSS/JS/remote URL | `rejected-style-only` |

## Verification

Focused test:

```text
npm run test -- src/lib/style-engine/v2-workspace-style-payload.test.ts
```

Result:

- pass, 1 file, 8 tests

Full verification:

```text
git diff --check
npm run test -- src/lib/style-engine/v2-workspace-style-payload.test.ts
npm run test -- src/lib/style-engine
npm run typecheck
npm run lint -- src/lib/style-engine/v2-workspace-style-payload.ts src/lib/style-engine/v2-workspace-style-payload.test.ts
npm run build
```

Results:

- Diff check: pass
- Focused helper test: pass, 1 file, 8 tests
- `src/lib/style-engine` tests: pass, 31 files, 235 tests
- Typecheck: pass
- Targeted lint: pass
- Build: pass

Build note:

- Next build completed successfully.
- The existing edge-runtime static-generation warning appeared again and is not related to this helper.

## Forbidden Boundaries Held

Held:

- no push
- no deploy
- no `.env` or secrets read
- no package/config/deploy changes
- no `exports/**`
- no Supabase/database/migrations changes
- no backend/API changes
- no sync protocol changes
- no production preview behavior changes
- no backend persistence
- no React Flow / graph behavior changes
- no auth changes
- no production UI export/import behavior changes
- no `src/components/nexus/nexus-ops.tsx` implementation changes

## Next Recommended Implementation Step

Next seed:

```text
V20 Workspace Style Payload Export Import Adapter Wiring
```

Goal:

- wire the pure adapter into existing import/export flow
- preserve old imports
- keep invalid style as style-only warning
- keep style review-only
- avoid backend/store/sync changes beyond existing workspace import behavior

Do not start broad export/import refactor.
