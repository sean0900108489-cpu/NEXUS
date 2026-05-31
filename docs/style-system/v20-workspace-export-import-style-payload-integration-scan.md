# V20 Workspace Export Import Style Payload Integration Scan

Date: 2026-05-31

## Purpose

This scan maps the current whole-workspace export/import flow and defines how V2 style payloads can be carried inside the existing workspace snapshot instead of creating a separate style export/import path.

This round also adds a pure style payload adapter:

- `src/lib/style-engine/v2-workspace-style-payload.ts`
- `src/lib/style-engine/v2-workspace-style-payload.test.ts`

The adapter does not change production UI behavior, store mutation, backend sync, or import/export wiring. It only validates and normalizes an optional style section.

## Existing Export / Import Flow

| Area | Source | Finding |
| --- | --- | --- |
| Export trigger UI | `src/components/nexus/nexus-ops.tsx`, `TopBar`, `TopMenuAction` | Left top workspace menu exposes `Export`; command palette also exposes `Export Workspace`. |
| Import trigger UI | `src/components/nexus/nexus-ops.tsx`, hidden file input | Left top workspace menu exposes `Import`; command palette also exposes `Import Workspace`; both open a hidden JSON file input. |
| Payload construction | `handleExport` -> `exportActiveWorkspace` | `handleExport` creates a `Blob` from `JSON.stringify(snapshot, null, 2)` and downloads `nexus-ai-ops-${Date.now()}.json`. |
| Export MIME | `handleExport` | `application/json`. |
| Export sync metadata | `handleExport` | Attempts `localSyncQueueAdapter.getOperations()` and injects notebook recovery metadata. If that fails, export still proceeds without recovery metadata. |
| Import file read | `handleImport` | Uses `await file.text()`. No `FileReader`. |
| Import parse | `handleImport` -> `parseWorkspaceSnapshot(text)` | Parses JSON and validates via workspace snapshot validator. |
| Import reconstruction | `handleImport` | Parses text again as `Partial<WorkspaceSnapshot>` and passes a reconstructed `WorkspaceSnapshot` to `importWorkspace`. |
| Store import | `src/store/nexus-store.ts`, `importWorkspace` | Validates snapshot again, sanitizes workspace, replaces active workspace list with imported workspace, restores notebook/draft caches, then queues cloud sync and prompt refresh. |
| Existing tests | `src/store/nexus-store.test.ts`, `src/lib/workspace-kernel.test.ts` | Existing tests cover persistence shaping, notebook export recovery, workspace snapshot validation, and recovery paths. No V2 style payload adapter existed before this round. |

## Existing Workspace Snapshot Shape

Current exported root type:

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

Current `NexusWorkspace` includes:

```ts
themeConfig?: WorkspaceThemeConfig;
```

Current `WorkspaceThemeConfig` is a small legacy/live control shape:

```ts
type WorkspaceThemeConfig = {
  radius?: string;
  blur?: string;
  borderWidth?: string;
  glowIntensity?: string;
  iconWeight?: string;
  fontFamily?: string;
  chatOpacity?: string;
};
```

## Versioning / Metadata Findings

| Question | Finding |
| --- | --- |
| Does export payload have a version? | Yes, root `schemaVersion: 1`. |
| Does import validate version? | Yes, `validateWorkspaceSnapshot` rejects unsupported `schemaVersion`. |
| Does workspace have metadata/custom section? | No general metadata/custom extension point. |
| Does workspace already carry style-like state? | Yes, `workspace.themeConfig`, but it is legacy live theme control state, not a V2 Skin Pack payload. |
| Does validator reject unknown root fields? | No explicit unknown root rejection was observed. |
| Does current import preserve unknown root fields? | No. `handleImport` reconstructs known fields and drops unknown root fields before calling `importWorkspace`. |

## Backend / Store / Sync Participation

Existing export/import does involve store and sync:

- export reads active workspace from the store
- export may read local sync queue metadata
- import calls `importWorkspace`
- `importWorkspace` validates, sanitizes, and mutates local store state
- `importWorkspace` queues workspace cloud sync
- `importWorkspace` refreshes prompts cache
- `importWorkspace` upserts imported notebooks through the existing Supabase sync manager

Therefore, style payload integration must be careful:

- style validation can be pure
- style payload should not add new backend calls
- style payload should not auto-apply to production on import
- style payload should not be persisted to backend until a separate gate exists
- invalid style section should not force rejection of an otherwise valid workspace snapshot

## Style Payload Placement Design

Recommended placement:

```ts
type WorkspaceSnapshot = {
  schemaVersion: 1;
  exportedAt: string;
  workspace: NexusWorkspace;
  notebooks?: NotebookRecord[];
  deletedNotebooks?: NotebookRecord[];
  notebookDrafts?: NotebookDraftRecord[];
  notebookRecovery?: WorkspaceNotebookRecoveryMetadata;
  stylePack?: WorkspaceStylePayloadV1;
};
```

Recommended style section:

```ts
type WorkspaceStylePayloadV1 = {
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

Why top-level `stylePack?` instead of `workspace.themeConfig`:

- it avoids changing live workspace behavior
- it keeps V2 Skin Pack payload separate from the existing legacy theme controls
- it avoids accidental cloud sync through existing `themeConfig` sync paths
- it lets import validate style independently from workspace content
- it can remain review-only until a future Style Lab or production preview gate accepts it

Why optional:

- old exports still import
- missing style is a normal `ignored-missing` path
- invalid style can be rejected without corrupting workspace import

## Pure Adapter Added

Added:

```ts
extractWorkspaceStylePayloadFromSnapshot(snapshot)
normalizeWorkspaceStylePayload(candidate)
```

Decision statuses:

- `accepted`
- `rejected-style-only`
- `ignored-missing`
- `unsupported-version`

The adapter:

- reads `snapshot.stylePack`
- validates `version === "style-pack-v2"`
- validates `source`
- validates `skinPack` with `validateNexusSkinPackV2`
- validates optional `bridgeSummary`
- accepts safe `controls` as review-only JSON data
- rejects unsafe controls containing raw CSS, script-like keys, remote URLs, `url(...)`, `data:`, or CSS rule text
- rejects oversized style payloads over `96 KiB`
- never mutates store/backend
- never applies style
- never emits CSS strings/selectors/DOM instructions

## Compatibility / Failure Policy

| Payload Case | Policy |
| --- | --- |
| Old payload without `stylePack` | Import workspace normally; style adapter returns `ignored-missing`. |
| New payload with valid `stylePack.skinPack` | Accept style section as review-only payload; do not auto-apply. |
| New payload with valid safe `controls` | Accept controls as review-only payload; do not auto-apply. |
| New payload with invalid skin pack | Reject style section only; workspace import should continue if workspace is valid. |
| Unknown style version | Return `unsupported-version`; workspace import should continue if workspace is valid. |
| Oversized style payload | Reject style section only. |
| Raw CSS / JS / remote URL / unsafe controls | Reject style section only. |
| Missing style body with metadata only | Reject style section only. |
| Backend/store persistence | Not allowed in this integration step. |

## Proposed Future Import Flow

Future implementation should keep the current workspace import flow but evaluate style before reconstructing the known snapshot fields:

1. read file text
2. `JSON.parse(text)` once
3. run `parseWorkspaceSnapshot(text)` or `validateWorkspaceSnapshot(parsed)`
4. run `extractWorkspaceStylePayloadFromSnapshot(parsed)`
5. import workspace if workspace validation passes
6. if style status is `accepted`, store it only in a local review/Style Lab handoff path
7. if style status is `rejected-style-only`, import workspace but show a style warning
8. never auto-apply style to production during import
9. never add new backend calls for style import

## Proposed Future Export Flow

Future export can extend the existing snapshot object before `JSON.stringify`:

```ts
const snapshot = exportActiveWorkspace(...);
const exportPayload = {
  ...snapshot,
  stylePack: createWorkspaceStylePayloadExportSection(...),
};
```

Export should include style only if a validated review payload exists.

It should not:

- scrape DOM styles
- export production preview transaction state
- export session ids
- export auth/user secrets
- export backend sync internals
- include raw CSS/JS
- include remote image URLs

## Questions Answered

1. Existing export/import is in `src/components/nexus/nexus-ops.tsx`, backed by `exportActiveWorkspace` and `importWorkspace` in `src/store/nexus-store.ts`.
2. Current payload schema is `WorkspaceSnapshot` with `schemaVersion: 1`, `exportedAt`, `workspace`, optional notebooks/drafts/deleted/recovery.
3. Import validates via `parseWorkspaceSnapshot` / `validateWorkspaceSnapshot`, then store import validates again.
4. Yes, root `schemaVersion: 1`.
5. No general workspace metadata/custom section; `workspace.themeConfig` exists but is not appropriate for V2 Skin Pack payload.
6. Put style at optional root `stylePack?`.
7. Keep it optional, do not bump workspace schema for first adapter, and reject style section independently.
8. Old payload with no style returns `ignored-missing`; workspace import continues.
9. Invalid style should reject only the style section, not the whole workspace, unless future product requirements choose stricter behavior.
10. Current import/export does touch store/sync/backend as part of existing behavior; this adapter does not add new backend/store/sync writes.
11. Yes. This round added a pure payload adapter and tests.

## Next Recommended Implementation Step

Recommended next seed:

```text
V20 Workspace Style Payload Export Import Adapter Wiring
```

Goal:

- wire the pure adapter into `handleImport`
- preserve old workspace imports
- keep invalid style as style-only warning
- do not auto-apply style
- optionally include validated review style payload in export

Allowed future files should be narrow:

- `src/components/nexus/nexus-ops.tsx` only for import/export payload handoff
- `src/lib/style-engine/v2-workspace-style-payload.ts`
- focused tests
- docs checkpoint

Forbidden future files:

- store/sync/backend/Supabase/API
- `src/app/globals.css`
- production preview behavior files
- package/config/deploy
- `exports/**`
