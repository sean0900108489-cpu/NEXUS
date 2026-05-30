# V18 Production Shell Style Current Status

## Snapshot

- Branch: `codex/v18-style-pack-contract-prep`
- Current status source: local scan after `83acb87 docs: add v18 production shell style upgrade runbook`
- Working tree at scan time: clean
- This file is a quick current-state companion to `docs/style-system/v18-production-shell-style-upgrade-runbook.md`.

## Confirmed Production Shell Frames

| Frame | File | Status | Notes |
| --- | --- | --- | --- |
| Route-edge production page shell boundary | `src/components/nexus/nexus-production-page-shell-boundary.tsx` | Landed | Inert route-edge wrapper around production page shell. |
| `NexusOpsOuterShellFrame` | `src/components/nexus/nexus-ops-outer-shell-frame.tsx` | Landed | Presentation wrapper; behavior remains in `NexusOps`. |
| `NexusOpsBodyFrame` | `src/components/nexus/nexus-ops-body-frame.tsx` | Landed | Presentation wrapper around body row. |
| `NexusOpsTopBarFrame` | `src/components/nexus/nexus-ops-top-bar-frame.tsx` | Landed | Presentation wrapper; next token alias candidate. |
| `NexusOpsRightFloatingDockFrame` | `src/components/nexus/nexus-ops-right-floating-dock-frame.tsx` | Landed and token-aliased | Right dock frame aliases confirmed on fresh dev server. |

## Token Bridge / Alias Status

| Surface | Status | Runtime Confirmation |
| --- | --- | --- |
| `.nexus-panel` | Production-facing bridge spike complete | Earlier spike documented. |
| `.nexus-glass` | Production-facing bridge spike complete | Earlier spike documented. |
| `.nexus-workspace` | Production-facing color bridge spike complete | Earlier spike documented. |
| Right floating dock rail | Dedicated aliases complete | Source CSS, build CSS, fresh runtime CSS, and visual apply/revert confirmed. |
| TopBar frame | Not token-aliased yet | Frame exists; no dedicated selector class or aliases yet. |

## Right Dock Alias Confirmation

Confirmed aliases:

```text
--nexus-right-dock-bg
--nexus-right-dock-border
--nexus-right-dock-shadow
--nexus-right-dock-blur
--nexus-right-dock-radius
```

Confirmed fallback chain:

```text
right-dock alias -> panel alias -> cyberpunk baseline
```

Fresh dev server result:

- runtime stylesheet contained `.nexus-right-floating-dock-rail`,
- runtime stylesheet contained `--nexus-right-dock-bg`,
- browser-only CSS variables changed the rail visually,
- removing browser-only CSS variables restored baseline,
- no source persistence was involved.

## Known Baseline Issues

| Issue | Classification | Blocks Token Alias Mechanics? | Blocks Strict Console-Clean? |
| --- | --- | --- | --- |
| `https://cdn.example.com/nexus/bg-cyberpunk.webp` load failure | Known placeholder asset reference from active theme CSS | No | Yes, unless accepted as known baseline |
| Chrome Translate hydration mismatch | External browser translation mutates text from `NEXUS // AI OPS` to `NEXUS // AI 作戰` | No | Yes, if smoke uses translated tab |
| Workspace state endpoint 404s in dev output | Incidental local workspace state baseline; UI recovered to synced state in prior triage | Not observed as blocking | Unknown if surfaced in console |

## Next Recommended Unit

Next unit:

```text
V18 TopBar Frame Token Alias Spike
```

Why this is the next unit:

- `NexusOpsTopBarFrame` is already extracted.
- Its focused test already guards against behavior authority.
- It is a visible shell frame but still narrower than broad production styling.
- It can be token-aliased without touching `nexus-ops.tsx` if the work remains frame-level only.

Minimum safe implementation shape:

- Add one stable selector class if needed:

```text
nexus-top-bar-frame
```

- Add only dedicated TopBar aliases:

```text
--nexus-top-bar-bg
--nexus-top-bar-border
--nexus-top-bar-shadow
--nexus-top-bar-blur
--nexus-top-bar-radius
```

- Preserve current class semantics:

```text
flex h-11 shrink-0 items-center border-b border-white/10 bg-black/20 px-3
```

## Next Unit No-Go List

Do not touch:

- `src/components/nexus/nexus-ops.tsx`
- store/sync/backend/Supabase/API files
- React Flow or graph files
- LeftDock / Workspace behavior
- drag/resize/focus/z-index/window/modal behavior
- TopBar button state classes
- workspace menu behavior
- sync/status counters
- dropdown styling
- text/icon colors
- runtime token apply or persistence

## Smoke Guidance

Use an untranslated browser tab/session.

Record `bg-cyberpunk.webp` as a known baseline if it appears. Do not classify it as a TopBar regression unless the TopBar task changes asset references or makes the shell visually unusable.

If Chrome Translate is active, record it and do not use that tab for hydration-sensitive pass/fail judgment.
