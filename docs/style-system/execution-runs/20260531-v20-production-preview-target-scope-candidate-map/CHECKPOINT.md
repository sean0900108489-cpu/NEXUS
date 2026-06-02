# V20 Production Preview Target Scope Candidate Map Checkpoint

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

## Task

Map candidate scopes for a future non-persistent production preview path before
any production preview implementation starts.

This run was docs-only. It did not add source code, selectors, aliases,
production apply, DOM mutation, persistence, or runtime behavior.

## Preflight

- Branch confirmed: `codex/v19-production-shell-style-upgrade`
- HEAD included: `8de062d feat: add production preview preflight contract`
- Recent commit context recorded:
  - `8de062d feat: add production preview preflight contract`
  - `9bf090e feat: add style runtime preflight gate`
  - `e1ead5d feat: add style runtime preview diagnostics`
  - `b220ce5 feat: show roi gated style runtime budget report`
  - `b496710 feat: add style runtime budget model`
  - `284e806 docs: close v19 production skinning soft landing`
  - `1bd3200 docs: consolidate v19 production skinning pre landing`
  - `ae69652 feat: add production control primitive selector`
- Pre-existing untracked file recorded and not staged:
  - `docs/style-system/v19-production-shell-style-required-reading.md`

## Files Created

- `docs/style-system/v20-production-preview-target-scope-candidate-map.md`
- `docs/style-system/execution-runs/20260531-v20-production-preview-target-scope-candidate-map/CHECKPOINT.md`

## Source Read-Only Evidence

Read-only source anchors used for scope mapping:

- `src/app/page.tsx`
  - route composition:
    `NexusStyleRuntimeProvider -> NexusProductionPageShellBoundary(shellId="workspace") -> NexusOps`
- `src/components/nexus/nexus-production-page-shell-boundary.tsx`
  - route-edge guard attributes:
    - `data-nexus-page-shell="workspace"`
    - `data-nexus-production-page-shell-boundary="v1"`
    - `data-nexus-production-apply="blocked"`
- `src/components/nexus/nexus-ops-outer-shell-frame.tsx`
  - concrete production container:
    `main.nexus-shell.nexus-outer-shell-frame`
- `src/components/nexus/nexus-ops-body-frame.tsx`
  - broad layout body without a dedicated stable production-preview selector
- `src/components/style-engine/nexus-style-lab.tsx`
  - current evidence-only Style Lab scope:
    `style-lab-production-chrome-smoke`
- `src/lib/style-engine/v2-production-preview-preflight.ts`
  - eligible / hold / blocked contract logic and target scope rules

## Candidate Scope Summary

| Scope | Verdict | Summary |
| --- | --- | --- |
| Style Lab isolated container | evidence-only | Already works for local diagnostics and contract evidence, but it is not production route preview. |
| Route-edge page shell boundary | hold | Strong guard/evidence marker; not the first mutation target because it is `contents` and explicitly marks production apply as blocked. |
| `main.nexus-shell` | hold | High visual coverage but too broad when used generically. Prefer the extracted outer-shell class. |
| `NexusOpsOuterShellFrame` | recommended first candidate, currently hold | Best first future target because it is concrete, below document root, production-adhered, cascade-friendly, and rollback can remove variables from one target. |
| `NexusOpsBodyFrame` | hold | Broad body layout and no dedicated stable preview selector. |
| Individual adopted surfaces | hold | Useful smoke targets, but too fragmented for the first production preview channel. |
| Authenticated production document root | blocked | Root mutation is too broad and blocked by the preflight contract for production-route preview. |

## Recommended First Target Scope

Recommended future target:

- scope id: `nexus-outer-shell-frame`
- scope type: `authenticated-production-route`
- persistence: `none`
- mutation target: `production-route-container`
- planned selector: `main.nexus-shell.nexus-outer-shell-frame`
- guard evidence:
  - `data-nexus-page-shell="workspace"`
  - `data-nexus-production-page-shell-boundary="v1"`
  - `data-nexus-production-apply="blocked"`
- current contract status: `hold`

Why it is highest ROI:

- It is the smallest useful production container for current alias families.
- It avoids document root mutation.
- It aligns with an extracted production wrapper.
- It can cascade to shell, workspace, windows, message, command, modal,
  datapad, TopBar, and right dock aliases.
- It has a clear future rollback path: remove all preview variables from one
  declared target element and run residue check.

## Held Scopes

Held until authenticated smoke and/or additional selector evidence:

- Route-edge page shell boundary
- `main.nexus-shell`
- `NexusOpsOuterShellFrame`
- `NexusOpsBodyFrame`
- individual adopted surfaces:
  - RightDock
  - TopBar
  - AgentWindow
  - CommandPalette
  - Modal shell
  - Datapad shell
  - MessageBubble roles

Primary hold reason:

- authenticated production route evidence is still missing.

Secondary hold reasons:

- some scopes are too broad for first mutation target
- some scopes are too fragmented for first preview channel
- some scopes require safe visibility/open-close smoke without triggering
  command execution, form submit, persistence, drag/resize/focus/z-index
  behavior, or workspace mutation

## Blocked Scopes

Blocked:

- authenticated production document root

Reasons:

- production-route root mutation is blocked by the preflight contract
- blast radius is too high
- rollback would require app-wide guarantees outside the production shell

## Authenticated Smoke Evidence Plan

Future authenticated smoke must confirm:

1. Authenticated `/` route loads without logging in or submitting credentials
   inside the task.
2. Route-edge boundary exists with:
   - `data-nexus-page-shell="workspace"`
   - `data-nexus-production-page-shell-boundary="v1"`
   - `data-nexus-production-apply="blocked"`
3. Recommended target exists:
   - `main.nexus-shell.nexus-outer-shell-frame`
4. Adopted surfaces are visible when state allows:
   - RightDock rail
   - TopBar frame
   - Workspace surface
   - MessageBubble roles if messages are present
   - AgentWindow chrome if windows are visible
   - CommandPalette shell only via safe open/close without command execution
   - AgentBranchModal shell only if safe without submit/data mutation
   - Datapad shell only if safe without save/delete/upload/download
5. Console and hydration baseline are recorded.
6. Known baseline issues are separated:
   - `bg-surface-shell.webp` placeholder failure
   - Chrome Translate hydration mismatch if Translate is active
7. No persistence, workspace mutation, store/backend/API/Supabase write, or
   production behavior change occurs.

Stop conditions:

- auth gate blocks route access
- credential submission would be required
- target is only available at document root
- smoke would execute commands
- smoke would submit/validate forms
- smoke would save/delete/upload/download or alter Datapad draft persistence
- smoke would require store/backend/API/Supabase mutation

## Option A Readiness

Option A design can start after this mapping.

Option A implementation cannot start yet.

The next safe step is an authenticated production scope smoke checklist, not
production preview apply.

Recommended next seed:

- `V20 Authenticated Production Preview Scope Smoke Checklist`

Goal:

- collect authenticated route evidence for
  `NexusProductionPageShellBoundary` and
  `main.nexus-shell.nexus-outer-shell-frame` without applying variables,
  mutating workspace data, or touching production runtime.

## Verification

- `git diff --check`: passed
- allowed-file status check: only this run's docs plus the pre-existing
  untracked `docs/style-system/v19-production-shell-style-required-reading.md`
  were present; only this run's docs were selected for staging
- tests/build/browser: not required because this run is docs-only

## Rollback Path

Revert the final docs commit for this run.

No runtime state, source code, persistence, local storage, backend data, or
production preview state was created.

## Residual Risk

Residual risk: below 5%.

Risk is limited to documentation accuracy because no source/runtime behavior was
changed. The main remaining uncertainty is authenticated production route
evidence, which is intentionally held for the next task.

## Forbidden Boundaries Held

- No push
- No deploy
- No `.env` or secrets read
- No `src/**` edits
- No package/config/deploy edits
- No `exports/**`
- No Supabase/database/migrations
- No store/sync/backend/Supabase/API
- No React Flow / graph behavior changes
- No production shell behavior changes
- No `src/app/globals.css`
- No token persistence
- No backend persistence
- No production apply
- No DOM mutation
- No asset/layout production apply
