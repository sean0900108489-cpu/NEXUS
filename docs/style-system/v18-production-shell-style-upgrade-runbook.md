# V18 Production Shell Style Upgrade Runbook

## Purpose

This runbook controls the V18 production shell style upgrade path after the right floating dock token alias spike.

The goal is not broader production styling. The goal is to advance one extracted/static production frame at a time, with explicit safety gates, known baseline handling, browser smoke expectations, and rollback-friendly commits.

## Current Baseline

- Branch: `codex/v18-style-pack-contract-prep`
- Right floating dock token alias spike is complete.
- Fresh dev server visual confirmation passed for the right dock alias mechanism:
  - runtime CSS loaded,
  - `.nexus-right-floating-dock-rail` matched,
  - browser-only CSS variables visually changed the rail,
  - removing variables restored the baseline.
- Baseline console / hydration triage is complete:
  - `bg-cyberpunk.webp` is a known baseline placeholder CDN asset reference,
  - the observed hydration mismatch was primarily caused by Chrome Translate changing `NEXUS // AI OPS` into `NEXUS // AI 作戰`,
  - future smoke must separate known baseline issues from token alias regressions.

## Global Boundaries

Do not:

- push or deploy,
- change Supabase/database/migrations,
- change package/config/deploy files,
- touch `exports/**`,
- connect token adoption to store/sync/backend/Supabase/API,
- add runtime token apply,
- add feature placement or layout preset adoption,
- add new registry/contract foundation,
- broaden production shell styling,
- modify behavior-bearing controls,
- modify React Flow behavior,
- modify drag/resize/focus/z-index/window/modal behavior,
- accept raw CSS/raw JS/DOM selectors/behavior class/backend mutation through Skin Pack payloads.

## Known Baseline Handling

### `bg-cyberpunk.webp`

The active cyberpunk theme currently references:

```text
https://cdn.example.com/nexus/bg-cyberpunk.webp
```

This is a known baseline asset issue. It can fail a strict console-clean smoke, but it is not a token alias regression unless a token alias task changes the asset path or makes the shell visually unusable.

### Chrome Translate Hydration

Chrome Translate can mutate rendered text before or during hydration. The known observed mismatch was:

```text
server: NEXUS // AI OPS
client: NEXUS // AI 作戰
```

Future browser smoke must use an untranslated tab/session when checking hydration. If Translate is active, record it as an external browser condition before attributing hydration warnings to the current token alias work.

## Token Alias Advancement Rule

Only one extracted/static production frame may receive a token alias spike per round.

Each spike must:

- target a previously extracted presentation frame,
- avoid `nexus-ops.tsx` unless the round is explicitly an extraction round,
- preserve child order,
- preserve behavior ownership in `NexusOps`,
- use dedicated aliases with existing bridge/fallback variables where possible,
- preserve cyberpunk baseline fallback,
- include source-level or focused tests for any touched frame,
- include a checkpoint or map update documenting the aliases, fallbacks, and no-go surfaces.

## Next Candidate: TopBar

`NexusOpsTopBarFrame` is the next candidate only if preflight confirms it already exists and is a pure/static presentation wrapper.

If `NexusOpsTopBarFrame` does not exist, or if it is not a pure wrapper, the next round must stop or become assessment-only. Do not combine extraction and token alias adoption in the same round unless the user explicitly asks for that expanded scope.

## TopBar First-Round Alias Scope

Allowed first-round visual surfaces:

- frame background / surface,
- border,
- shadow / glow,
- blur,
- optional radius.

Recommended alias pattern:

```text
--nexus-top-bar-bg -> --nexus-panel-bg -> cyberpunk baseline
--nexus-top-bar-border -> --nexus-panel-border -> cyberpunk baseline
--nexus-top-bar-shadow -> --nexus-panel-shadow -> cyberpunk baseline
--nexus-top-bar-blur -> --nexus-panel-blur -> cyberpunk baseline
--nexus-top-bar-radius -> --nexus-panel-radius -> cyberpunk baseline
```

Do not use workspace aliases for TopBar.

## TopBar No-Go Surfaces

Do not tokenize or alter:

- workspace menu behavior,
- sync/status counters,
- latency labels,
- dropdown contents,
- agent controls,
- button active/inactive/hover states,
- text/icon colors,
- focus rings,
- pointer-events,
- z-index,
- fixed/sticky positioning,
- height, spacing, layout, overflow, or responsive behavior,
- handlers, callbacks, maps, conditionals, or state transitions.

## Suggested Next Task

Task name:

```text
V18 TopBar Frame Token Alias Spike
```

Preflight:

1. Confirm branch is `codex/v18-style-pack-contract-prep`.
2. Confirm `git status --short` is clean.
3. Confirm `NexusOpsTopBarFrame` exists.
4. Confirm its source has no hooks, effects, event handlers, prop spread, store/sync/backend/Supabase/React Flow/window manager/style-engine imports, or behavior authority.
5. If any preflight check fails, stop or produce docs-only assessment.

Allowed files if implementation proceeds:

- `src/components/nexus/nexus-ops-top-bar-frame.tsx`
- `src/components/nexus/nexus-ops-top-bar-frame.test.tsx`
- `src/app/globals.css`
- `docs/style-system/production-shell-extraction-map-v1.md`
- one round checkpoint under `docs/style-system/execution-runs/**`

Forbidden files:

- `src/components/nexus/nexus-ops.tsx`
- LeftDock / Workspace / React Flow / graph files
- window/modal/drag/resize/focus/z-index behavior files
- store/sync/backend/Supabase/API files
- style-engine registry/contract files
- package/config/deploy files
- `exports/**`

Verification:

1. `git diff --check`
2. focused TopBar frame test
3. `npm run typecheck`
4. targeted lint for touched files
5. `npm run build`
6. Browser smoke `/` in an untranslated tab/session

Browser smoke must confirm:

- NexusOps UI renders,
- route-edge production shell boundary remains present,
- TopBar remains visible,
- workspace menu / safe TopBar trigger remains usable if available,
- no new layout shift,
- no new hydration errors attributable to the current change,
- known `bg-cyberpunk.webp` baseline issue is recorded separately,
- Chrome Translate is not active during hydration-sensitive checks.

Stop immediately if:

- completing the task requires editing `nexus-ops.tsx`,
- `NexusOpsTopBarFrame` is missing or behavior-bearing,
- button/status/dropdown styling must be changed,
- behavior-bearing controls must be touched,
- store/sync/backend/Supabase/API files become necessary,
- React Flow or window/modal behavior becomes involved,
- browser smoke in an untranslated tab shows a new hydration/layout regression.

## Commit Discipline

- Use one local commit per round.
- Stage only allowed files.
- Confirm changed files before commit.
- Do not push or deploy.
- Keep the working tree clean at final handoff.

## Recommendation

The next round may be handed to an executor only as a phase-gated implementation prompt. The executor must first confirm that `NexusOpsTopBarFrame` already exists and is pure/static. If that condition is not true, the executor must stop or return a docs-only assessment rather than broadening into extraction or production shell refactor.
