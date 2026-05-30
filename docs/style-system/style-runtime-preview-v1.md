# NEXUS Style Runtime Preview V1

Phase: V5 - Local-Only Runtime Preview
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Status: partially implemented local runtime preview. Pure target/controller helpers and a scoped client runtime provider exist; persistence, workspace sync, backend, Supabase/database, save/export-file behavior, and production React Flow behavior integration are not implemented.

## Implementation Evidence

- `src/lib/style-engine/runtime-target.ts` provides a pure scoped variable target helper that applies a preview patch to an explicit target and records previous inline values for revert.
- `src/lib/style-engine/runtime-controller.ts` provides a pure preview controller over that target helper. It previews one active patch at a time, reverts the prior active session before a new preview, supports unqualified active-session revert and active-session `clearAll()`, returns cloned active-session snapshots, and rejects mismatched revert ids.
- `src/lib/style-engine/runtime-target.test.ts` and `src/lib/style-engine/runtime-controller.test.ts` cover apply/revert behavior, including unqualified active-session revert and active-session `clearAll()` restoration/removal semantics, using fake style targets, not the real document.
- `src/lib/style-engine/preview.ts` creates deterministic local preview patches from compiled semantic variables, legacy bridge variables, React Flow adapter variables, and window/modal recipe adapter variables.
- `src/components/style-engine/nexus-style-runtime-provider.tsx` wraps the pure controller in a client-only scoped provider with an explicit `data-nexus-style-runtime="v1"` target and local React state for the active preview session.
- `src/app/page.tsx` wraps `NexusOps` in `NexusStyleRuntimeProvider` without editing `src/components/nexus/nexus-ops.tsx`.
- `src/app/style-lab/page.tsx` wraps the isolated Style Lab in the same provider, and `src/components/style-engine/nexus-style-lab.tsx` uses the provider for local preview/revert controls.
- `CP-173 - Style Lab Preview Recipe Variable Count Smoke V1` confirmed local Style Lab preview patches now expose `Preview Vars 122` and `Active Vars 122` after Preview is clicked.
- Source-closed Style Lab interaction smokes have confirmed local Preview updates active preview rows, Revert clears them, and page refresh does not restore an unsaved local preview session.
- The current implementation remains local-only: no `useNexusStore`, workspace sync, backend route, Supabase/database, production React Flow behavior props, durable persistence path, or save/export-file behavior is involved.

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
-> NexusStyleRuntimeProvider
-> NexusOps

src/app/style-lab/page.tsx
-> NexusStyleRuntimeProvider
-> NexusStyleLab
```

Current placement decision:

The preview controller is placed in a client-only Style Runtime boundary near
`NexusOps`, not in the root Server Component itself.

Implemented shape:

```text
src/app/page.tsx
-> NexusStyleRuntimeProvider
-> NexusOps
```

and:

```text
src/app/style-lab/page.tsx
-> NexusStyleRuntimeProvider
-> NexusStyleLab
```

Rationale:

- `layout.tsx` is currently a Server Component and should stay narrow.
- `ThemeProvider` is already a client provider for `data-theme`; the Style
  Runtime should not replace it in V5.
- Preview requires browser APIs and must be client-only.
- Keeping preview close to `NexusOps` reduces risk to auth/layout/root HTML.
- Keeping the provider as a scoped `contents` wrapper avoids changing `NexusOps`
  internals while still giving isolated Style Lab controls a local preview target.

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
- Return `style.preview.noActiveSession` without target mutation when `revert()` or `clearAll()` is called before any active preview exists.
- Report active preview id/checksum through an active-session snapshot.

Current pure shape:

```ts
type NexusStylePreviewControllerV1 = {
  preview(patch: NexusStylePreviewPatchV1): NexusStyleVariablePreviewSessionV1;
  revert(previewId?: string): NexusStylePreviewControllerResultV1;
  clearAll(): NexusStylePreviewControllerResultV1;
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

For runtime/UI preview units, run Browser smoke on local dev:

- App loads without console errors.
- Existing `cyberpunk/apple/tesla/terminal` preset buttons still work.
- Preview can be enabled.
- Preview changes visible surface/text/accent variables.
- Revert restores previous visual state.
- Refresh does not restore unsaved preview.
- Workspace switch or page refresh does not carry preview as durable state.
- Existing applied theme controls still work as separate persisted controls.
- No sync operation is triggered by preview-only actions.

Documentation-only reconciliation does not require a new browser smoke when it
does not change runtime code.

## 8. Future Implementation Unit Boundaries

Lowest-risk implementation order:

1. Complete: pure helper for applying/removing an explicit variable map to a scoped style target.
2. Complete: unit tests using a fake style target, not the real document.
3. Complete: client runtime provider wiring that wraps the pure helper in a scoped runtime target.
4. Complete: isolated Style Lab preview controls using the scoped runtime provider.
5. Pending: production-safe visual adoption units that consume compiled variables without touching `nexus-ops.tsx`, store/sync/backend, or React Flow behavior props.
6. Pending: browser smoke for any new production visual adoption unit.

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
