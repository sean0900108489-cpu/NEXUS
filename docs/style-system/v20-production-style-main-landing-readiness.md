# V20 Production Style Main Landing Readiness

Date: 2026-06-01

## Purpose

This document is the final technical readiness note before the V20 production
style work is considered ready for the user's explicit main landing / push
instruction.

It does not authorize push or deployment by itself. It records the current
working state, the verified relationship chain, the remaining known risks, and
the stop conditions for any final landing command.

## Current Git Context

Branch:

```text
codex/v19-production-shell-style-upgrade
```

Latest relevant commits at the time of this readiness note:

```text
2c1753c test: cover imported theme controls baseline
59bafd1 test: cover workspace style export roundtrip
60e5199 fix: align layout surface material fallbacks
d0dc722 fix: clarify workspace style preset state
5455924 feat: add workspace style presets
de7f7e5 docs: define production style layer contract
0590153 fix: neutralize production panel fallback materials
ac59625 fix: align theme panel material layers
```

Pre-existing untracked technical doc:

```text
docs/style-system/v19-production-shell-style-required-reading.md
```

This readiness run updates that file with a supersession notice so it can be
tracked safely without pointing future work at an obsolete V19 next task.

## Landing Verdict

Verdict:

```text
ready-for-final-human-gated-landing
```

Meaning:
- The production Theme panel style controls are functional.
- The scoped preview target is narrow and verified:
  `main.nexus-shell.nexus-outer-shell-frame`.
- Root/body/html preview mutation remains blocked by design and tests.
- Workspace export/import can carry normalized `stylePack.controls`.
- Imported controls are restored into the Theme panel saved baseline.
- Relationship layers are documented and source-guarded.
- No backend/API/Supabase/database/sync protocol changes were introduced by
  this style landing track.

This does not mean every visual surface is final. It means the current
architecture is stable enough to land as a controlled V20 foundation.

## Product Capability Summary

Authenticated `/` workspace:
- Right Theme panel exposes `Workspace Style Controls`.
- Controls adjust scoped production style variables live.
- Presets provide Layer 4 shortcuts over the same controls chain.
- Save stores normalized controls into workspace style payload review/export
  state.
- Export includes accepted normalized `stylePack.controls`.
- Import can accept, reject style-only, or ignore missing style payloads without
  breaking workspace import.
- Imported accepted controls become the Theme panel saved baseline.
- Style is not auto-applied to other workspaces.
- Style is not backend persisted by this path.

Style Lab:
- Can review imported workspace style metadata.
- Can load valid imported skin packs into existing review flow when present.
- Continues to show budget, diagnostics, and preflight evidence.

## Relationship Chain

Active production style chain:

```text
Theme panel controls
  -> WorkspaceThemeStyleControlsV1
  -> normalizeWorkspaceThemeStyleControlsV1
  -> createWorkspaceThemeStylePreviewVariablesV1
  -> createProductionPreviewApplyPlan
  -> main.nexus-shell.nexus-outer-shell-frame
  -> globals.css scoped variable consumers
  -> Save to workspace style
  -> normalized stylePack.controls
  -> workspace export/import payload
  -> imported review state
  -> Theme panel saved baseline
```

Layer model:

| Layer | Name | Current owner |
| --- | --- | --- |
| 1 | Style source / token layer | `src/lib/style-engine/v2-workspace-style-payload.ts`, transaction/preflight helpers |
| 2 | Workspace stage layer | outer shell target, body frame, graph/panels workspace background |
| 3 | Surface / panel layer | TopBar, RightDock, Theme panel, agent/window/modal/datapad/message surfaces |
| 4 | Control / status / content layer | sliders, buttons, presets, status chips, role/accent chrome |

Key rule:
- Layer 4 accent/control state may decorate controls, but Layer 2 and Layer 3
  large surfaces must use the shared workspace/panel material variables.

## Verified Safety Boundaries

Held:
- No push.
- No deploy.
- No `.env` or secret access.
- No backend/API/Supabase/database/migration changes.
- No sync protocol changes.
- No React Flow behavior changes.
- No drag/resize/focus/z-index/window/modal behavior changes.
- No document root/body/html preview variable writes.
- No broad `nexus-ops.tsx` refactor.
- No separate style export/import flow.
- No production style auto-apply on workspace import.

Scoped preview target:

```text
main.nexus-shell.nexus-outer-shell-frame
```

Blocked targets:
- `html`
- `body`
- `document.documentElement`
- document root
- whole route shell
- second production preview target without a new target map

## Verification Evidence

Most recent focused verification:

```text
git diff --check
npm run test -- src/components/nexus/nexus-theme-panel-live-style-controls.test.ts src/lib/style-engine/v2-workspace-style-payload.test.ts src/components/nexus/nexus-workspace-style-payload-export-import.test.ts
npm run typecheck
npm run lint -- src/components/nexus/nexus-theme-panel-live-style-controls.test.ts src/lib/style-engine/v2-workspace-style-payload.test.ts src/components/nexus/nexus-workspace-style-payload-export-import.test.ts
npm run build
```

Result:
- focused tests passed: `3 files / 39 tests`
- typecheck passed
- targeted lint passed
- build passed
- known warning only: edge runtime disables static generation for that page

Most recent no-mutation browser read:
- route: `http://localhost:3000/`
- authenticated workspace visible
- target count: `1`
- target inline preview vars after cleanup: `0`
- `document.documentElement` preview vars: `0`
- `body` preview vars: `0`

## Known Baselines

Do not classify these as new regressions unless they worsen:
- edge runtime static-generation warning during build
- route-load sync/API baseline such as `POST /api/v1/sync/operations`
- prior `bg-surface-shell.webp` placeholder issue
- Chrome Translate hydration mismatch when Translate is active

## Remaining Risks

Residual risk:

```text
low-to-moderate
```

Why not zero:
- Some legacy naming remains, especially `surface-style-controls` as a compatible
  style payload source label.
- Some old visual fallback classes remain in source, although current variable
  consumers and tests block the known earth-tone regression path.
- Browser tooling could not directly read the physical downloaded workspace
  export artifact in the last export smoke, so byte-level browser download
  validation is still best treated as manual QA.

Why acceptable:
- Pure export/import roundtrip tests cover normalized `stylePack.controls`.
- Theme panel tests cover imported controls becoming saved baseline.
- Layer contract tests cover target scope, material layering, and no backend
  persistence.
- Browser no-mutation checks confirm target/root/body cleanup state.

## Final Landing Stop Conditions

Stop before any main landing / push if:
- `git status --short --untracked-files=all` shows unknown source changes.
- tests or build fail.
- target selector is missing or duplicated.
- root/body/html inline `--nexus-*` variables are present after cleanup.
- Theme panel controls cannot save/export.
- workspace import breaks old payloads.
- any credential, `.env`, backend, API, Supabase, database, sync protocol, or
  package/config file appears in the staged diff unexpectedly.

## Recommended Final Command Order

When the user explicitly authorizes final landing, run:

```text
git status --short --untracked-files=all
git log --oneline -5
```

Then confirm the exact push/overwrite instruction before touching `main`.

If the intended operation is destructive, prefer a final explicit confirmation
that the user wants this branch to replace `main`.

## Rollback

Rollback by area:
- Production Theme panel controls:
  revert `5473b45 feat: add production theme panel live style controls` and
  follow-up stabilization commits.
- Presets:
  revert `5455924 feat: add workspace style presets`.
- Surface material stabilization:
  revert `ac59625`, `0590153`, and `60e5199` if needed.
- Workspace export/import style payload:
  revert `d29c817`, `1d837e3`, `e89a198`, `f8cfcf6`, `59bafd1`, and `2c1753c`
  if the payload bridge must be removed.

No backend cleanup is expected because the current style path does not write to
backend/Supabase/database and does not persist production style outside the
workspace export/import payload flow.

## Next After Landing

Do not start broad styling immediately after landing.

Recommended next smallest unit after final landing:
- Manual QA pass using real exported workspace JSON bytes.
- Then a compatibility naming plan for `surface-style-controls` if the product
  vocabulary should move away from Surface Style-specific source wording.
