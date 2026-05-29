# NEXUS Style Runtime Preview V1

Phase: V5 - Local-Only Runtime Preview
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Status: partially implemented pure local preview primitives. No app-level runtime provider, production route integration, persistence, or sync integration is implemented.

## Implementation Evidence

- `src/lib/style-engine/runtime-target.ts` provides a pure scoped variable target helper that applies a preview patch to an explicit target and records previous inline values for revert.
- `src/lib/style-engine/runtime-controller.ts` provides a pure preview controller over that target helper. It previews one active patch at a time, reverts the prior active session before a new preview, returns cloned active-session snapshots, and rejects mismatched revert ids.
- `src/lib/style-engine/runtime-target.test.ts` and `src/lib/style-engine/runtime-controller.test.ts` cover apply/revert behavior using fake style targets, not the real document.
- The current implementation remains pure/local: no `useNexusStore`, workspace sync, backend route, Supabase/database, app shell provider, production React Flow behavior, or durable persistence path is involved.

## 0. Purpose

This document defines the first runtime preview boundary for compiled Style
Engine output.

The goal is to let a future implementation preview compiled CSS variables and
adapter values locally, then revert cleanly, without touching durable workspace
state or sync.

## 1. Non-Negotiable State Rule

Preview must not enter:

- `workspace.themeConfig`
- `NexusWorkspace`
- `ActiveUiStateSnapshot`
- `WorkspaceCloudSnapshotPayload`
- `useNexusStore`
- IndexedDB workspace persistence
- local sync queue
- `state-sync.ts`
- Supabase
- `workspace_snapshots`
- `workspace_state_entities`

Preview is visual scratch state only.

## 2. Runtime Placement Decision

Current App Router stack:

```text
src/app/layout.tsx
-> ThemeProvider
-> src/app/page.tsx
-> NexusOps
```

Decision for future implementation:

Place the preview controller in a client-only Style Runtime boundary near
`NexusOps`, not in the root Server Component itself.

Candidate future shape:

```text
src/app/page.tsx
-> NexusStyleRuntimeProvider
-> NexusOps
```

or, for even lower blast radius:

```text
NexusOps
-> local StylePreviewController used only by a style lab/panel
```

Rationale:

- `layout.tsx` is currently a Server Component and should stay narrow.
- `ThemeProvider` is already a client provider for `data-theme`; the Style
  Runtime should not replace it in V5.
- Preview requires browser APIs and must be client-only.
- Keeping preview close to `NexusOps` reduces risk to auth/layout/root HTML.

Forbidden in V5:

- Adding preview state to Zustand.
- Writing preview config to workspace import/export/hydrate paths.
- Replacing `ThemeProvider`.
- Deleting existing `data-theme` presets.

## 3. Preview Controller Contract

Implemented pure controller responsibilities:

- Accept `NexusStylePreviewPatchV1` generated from safe compiled output.
- Snapshot previous inline preview variables.
- Apply compiled CSS variables to a scoped preview target.
- Revert to the previous state.
- Report active preview id/checksum through an active-session snapshot.

Current pure shape:

```ts
type NexusStylePreviewControllerV1 = {
  preview(patch: NexusStylePreviewPatchV1): NexusStyleVariablePreviewSessionV1;
  revert(previewId?: string): NexusStylePreviewControllerResultV1;
  clearAll(): void;
  getActivePreview(): NexusStyleVariablePreviewSessionV1 | null;
};
```

The controller must not accept raw manifest candidates. It accepts only preview
patches created from compiled output from a safe manifest.

## 4. CSS Injection Strategy

Recommended low-risk strategy:

1. Prefer scoped CSS variable application to `.nexus-shell` or a dedicated
   preview root.
2. Keep existing `html[data-theme]` presets active.
3. Let compiled variables override only approved semantic/legacy bridge vars.
4. Track all variables applied by the preview session.
5. Remove only variables applied by that session on revert.

Forbidden:

- Injecting arbitrary CSS text.
- Injecting arbitrary selectors.
- Mutating Tailwind class strings.
- Mutating `document.body` layout or scroll locks.
- Removing existing global React Flow CSS.
- Writing to `workspace.themeConfig`.

## 5. Apply And Revert

Preview:

- local-only
- reversible
- no sync
- no save
- no backend

Apply in V5:

- means "make current runtime preview active"
- still local/runtime-only unless a later phase defines persistence
- must not write full manifest or compiled output to `workspace.themeConfig`

Revert:

- removes all variables applied by the preview session
- restores previous inline values if any existed
- leaves `data-theme` preset untouched
- leaves workspace state untouched

Save/Persist:

- not implemented in V5
- blocked until V13 persistence contract

## 6. Sync Pollution Check

Any future V5 implementation must prove:

- It does not call `updateThemeConfig`.
- It does not import from `useNexusStore` for preview state.
- It does not add fields to `NexusWorkspace`.
- It does not add fields to `ActiveUiStateSnapshot`.
- It does not touch `serializeActiveUiStateSnapshot`.
- It does not touch workspace state routes/services/repositories.
- It does not create Supabase migrations.
- It does not write to local workspace persistence.

If any answer changes to "yes", the work is not V5 preview. It needs a higher
phase gate.

## 7. Browser Smoke Checklist

When V5 runtime code exists, run Browser smoke on local dev:

- App loads without console errors.
- Existing `cyberpunk/apple/tesla/terminal` preset buttons still work.
- Preview can be enabled.
- Preview changes visible surface/text/accent variables.
- Revert restores previous visual state.
- Refresh does not restore unsaved preview.
- Workspace switch does not carry preview as durable state.
- LEGO micro-controls still work as existing applied micro-controls.
- No sync operation is triggered by preview-only actions.

No browser smoke is required for this documentation-only pass.

## 8. Future Implementation Unit Boundaries

Lowest-risk implementation order:

1. Complete: pure helper for applying/removing an explicit variable map to a scoped style target.
2. Complete: unit tests using a fake style target, not the real document.
3. Pending: client preview controller wiring that wraps the pure helper in an isolated runtime surface.
4. Isolated preview specimen surface.
5. Browser smoke.

Forbidden first implementation unit:

- adding style lab UI and provider and persistence in one diff
- touching graph behavior
- touching store/sync/backend
- changing the existing theme panel commit behavior

## 9. Acceptance Gate

V5 design passes when:

- Preview storage is local-only.
- Runtime placement avoids widening root layout risk.
- CSS injection is scoped and reversible.
- Apply/revert/save/persist are separated.
- Sync pollution checks are explicit.
- Browser smoke checklist exists for future runtime code.
- No runtime code, schema, package, deploy, or `exports/**` files are changed.
