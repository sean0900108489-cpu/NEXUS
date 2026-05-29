# NEXUS Style Lab V1

Phase: V11 - Style Lab
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Status: partially implemented isolated local Style Lab. No production app shell or persistence integration.

## Implementation Evidence

- `/style-lab` is an isolated local route with validation, compiled token preview, comparison, export text views, local preview/revert controls, brief-to-draft flow, graph specimen, and governance rows.
- Recent checkpoints added adapter coverage, preview variable counts, and text-only export/review metadata visibility without adding save/download/clipboard/backend persistence.
- Style Lab state remains local to the route and scoped runtime provider; it does not enter `workspace.themeConfig`, workspace sync, backend routes, Supabase, or `workspace_state_entities`.
- Production `nexus-ops.tsx`, production React Flow behavior, global CSS, deploy config, and `exports/**` remain outside the Style Lab implementation.

## 0. Purpose

Style Lab is the future local-only workspace for importing, validating,
previewing, comparing, and exporting style assets.

It must not become persistence by accident.

## 1. State Boundary

Style Lab state may hold:

- draft text input
- parsed manifest candidate
- validation report
- compiled output
- local preview session id
- local comparison selection

Style Lab state must not enter:

- `workspace.themeConfig`
- `NexusWorkspace`
- `ActiveUiStateSnapshot`
- store sync queues
- IndexedDB workspace persistence
- Supabase
- backend routes
- `workspace_state_entities`

## 2. Required Lab Panels

| Panel | Purpose | Gate |
| --- | --- | --- |
| Draft input | Paste/import style document or manifest candidate. | Does not execute or apply input. |
| Validation report | Shows errors/warnings/info from validator. | Invalid manifests cannot preview. |
| Token preview | Shows compiled semantic and legacy variables. | Output is display-safe. |
| Primitive gallery | Shows Panel/Button/Input/Badge/Window/Modal specimens. | Specimen-only, no production component migration. |
| Graph specimen | Shows adapter visuals in isolated graph sample. | No production graph behavior changes. |
| Comparison | Compare baseline vs preview. | Revert is always available. |
| Export | Export safe manifest/report text later. | No backend save in V11. |

## 3. Preview Flow

```text
draft input
-> parse candidate
-> validator
-> safe manifest
-> compiler
-> compiled output
-> local preview controller
-> primitive/graph specimens
```

Blocked flows:

```text
draft input -> DOM
candidate -> compiler
candidate -> workspace
compiled output -> workspace.themeConfig
preview -> sync
preview -> Supabase
```

## 4. UI Placement Later

Recommended first implementation:

- an isolated lab route or hidden local-only panel
- no production shell rewrite
- no right dock integration until smoke passes

Avoid first:

- inserting a large Style Lab directly into `nexus-ops.tsx`
- adding lab state to Zustand
- adding persistence routes
- adding Supabase tables

## 5. Validation Report UX

Report display must:

- show concise error path/code/message
- never echo secrets
- truncate large imported drafts
- separate errors from warnings
- make "preview blocked" obvious

Invalid manifests:

- cannot preview
- cannot apply
- cannot export as safe pack
- cannot persist

## 6. Export Boundary

V11 export is file/text artifact only, not backend persistence.

Allowed later:

- copy safe manifest JSON
- download safe manifest JSON
- download validation report

Forbidden in V11:

- save to Supabase
- save to workspace snapshot
- save to account/team/library
- marketplace/share actions

## 7. Browser Smoke For Future Lab Code

When implemented:

- lab opens and closes
- invalid manifest shows errors and preview is disabled
- valid manifest compiles and preview appears in specimens
- revert restores baseline
- refresh does not restore unsaved preview
- existing theme preset switching still works
- no sync operation is triggered
- no console errors

## 8. Acceptance Gate

V11 lab design passes when:

- Lab capabilities are listed.
- State remains local-only.
- Invalid manifests cannot preview.
- Export is separated from persistence.
- First implementation avoids production shell rewrite.
- Browser smoke checklist is documented.
- No UI code, component code, schema, package, deploy, or `exports/**` files are changed.
