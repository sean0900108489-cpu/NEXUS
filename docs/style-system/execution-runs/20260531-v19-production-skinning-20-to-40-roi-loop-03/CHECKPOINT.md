# V19 Production Skinning 20-to-40 ROI Loop 03 Checkpoint

Task: `V19 Production Skinning 20-to-40 ROI Loop 03 - Message Bubble Role Surface`

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

Starting HEAD: `d7671a8 feat: expand production skinning primitive coverage`

## Preflight

- Confirmed branch: `codex/v19-production-shell-style-upgrade`.
- Confirmed HEAD includes `d7671a8`.
- Recent commits recorded:
  - `d7671a8 feat: expand production skinning primitive coverage`
  - `ab61f6d feat: advance production skinning visual coverage`
  - `52e9b35 feat: add top bar token aliases`
  - `eb79927 docs: update v18 production shell style runbook`
  - `83acb87 docs: add v18 production shell style upgrade runbook`
  - `61d2847 docs: triage baseline console hydration`
  - `576e499 docs: confirm right dock alias on fresh dev server`
  - `7fd4575 docs: diagnose right dock alias css bundle`
- Pre-existing untracked file preserved and not staged:
  - `docs/style-system/v19-production-shell-style-required-reading.md`

## Ownership Scan Result

`MessageBubble` is rendered inside `src/components/nexus/nexus-ops.tsx` as the
existing `.nexus-message-bubble` `article`.

Ownership findings:

- `MessageBubble` owns only message visual wrapper rendering and role-derived
  branch classes.
- Parent `AgentWindow` owns scroll refs, composer refs, submit handlers,
  Rnd drag/resize, focus, z-index, message ordering, and list mapping.
- Streaming creation, token append, interruption, media generation, tool
  execution, and persistence remain outside `MessageBubble`.
- `MessageBubble` has no hooks, effects, refs, event handlers, fetches,
  persistence, backend calls, or tool execution.
- Role source is the existing `message.role`, whose type is
  `"system" | "user" | "assistant" | "tool"`.
- No error role exists this round, so no `.nexus-message-bubble-error` selector
  or alias was added.

## Selected Path

Path A: behavior-free message bubble selector prep plus role-aware token aliases.

Selected target: role-specific `MessageBubble` visual surface.

Why selected:

- Message bubbles are the highest-visibility user-facing content surface found
  this round.
- The existing wrapper was already stable and inert enough for selector prep.
- Role-specific selectors preserve user/assistant/tool visual semantics instead
  of flattening all bubbles through one generic override.
- The change is reversible by removing role classes, CSS rules, the focused
  guard test, and this checkpoint/map entry.

## Candidate Ranking

1. Role-specific message bubble wrapper
   - Files: `src/components/nexus/nexus-ops.tsx`, `src/app/globals.css`,
     focused source guard test.
   - Visual coverage: high; covers the surface users read for long sessions.
   - Surface types: user, assistant, and tool message bubble chrome.
   - Behavior risk: low after scan; existing wrapper has no behavior authority.
   - Alias opportunity: generic background/border/shadow/radius plus role
     background aliases.
   - Browser smoke clarity: high when messages are present.
   - Rollback: remove role classes and CSS aliases.
   - Safe this round: yes.

2. Message row/chrome wrapper
   - Visual coverage: medium.
   - Behavior risk: higher because row/list ownership is bound to `AgentWindow`
     scroll, refs, ordering, and window chrome.
   - Safe this round: not selected.

3. Tool/output bubble wrapper
   - Visual coverage: medium-to-low as a standalone target.
   - Behavior risk: role-specific path covers tool bubbles without touching tool
     execution.
   - Safe this round: covered by selected path.

4. Fallback No-Go extraction map
   - Would be used only if role-specific selector prep required touching
     streaming, parsing, list ownership, refs, or persistence.
   - Not needed because the selected wrapper was behavior-free.

## Skipped Candidates

- Message row/chrome wrapper: skipped because it sits closer to list/window
  ownership than the bubble wrapper.
- Tool/output-only bubble wrapper: skipped as narrower than role-specific
  message aliases.
- `NexusOpsBodyFrame`: skipped because this round was explicitly scoped to
  message/chat bubble surface and body layout remains low visual ROI.
- LeftDock, Workspace, React Flow, windows/modals: skipped per standing
  forbidden boundaries.

## Changed Files

- `src/components/nexus/nexus-ops.tsx`
- `src/app/globals.css`
- `src/components/nexus/nexus-message-bubble-primitive.test.ts`
- `docs/style-system/production-shell-extraction-map-v1.md`
- `docs/style-system/execution-runs/20260531-v19-production-skinning-20-to-40-roi-loop-03/CHECKPOINT.md`

## Implementation

Selector prep:

- Added existing-wrapper role classes only:
  - `.nexus-message-bubble-user`
  - `.nexus-message-bubble-assistant`
  - `.nexus-message-bubble-tool`

Aliases added:

- `--nexus-message-bubble-bg`
- `--nexus-message-bubble-border`
- `--nexus-message-bubble-shadow`
- `--nexus-message-bubble-radius`
- `--nexus-message-user-bg`
- `--nexus-message-assistant-bg`
- `--nexus-message-tool-bg`

Fallback chain:

- role background alias
- generic message bubble alias
- existing panel alias
- surface-shell/current role baseline

Terminal-theme note:

- The existing `[data-theme="terminal"] .nexus-message-bubble` override used
  later `!important` rules. It now consumes the same message aliases so the
  current high-visibility production chrome visibly responds to browser-only
  CSS vars.

Intentionally not tokenized:

- text/icon color
- links, code blocks, markdown/prose internals
- copy/tool buttons
- hover/focus states
- scroll behavior
- streaming cursor
- timestamps and labels
- reasoning details internals
- message content parsing, ordering, persistence, or tool execution

## Verification Results

Passed:

- `git diff --check`
- `npm run test -- src/components/nexus/nexus-message-bubble-primitive.test.ts`
  - 1 file, 4 tests passed
- `npm run typecheck`
- `npm run lint -- src/components/nexus/nexus-ops.tsx src/components/nexus/nexus-message-bubble-primitive.test.ts src/app/globals.css`
  - Passed with existing CSS ignore warning: `src/app/globals.css` has no
    matching lint configuration.
- `npm run build`
  - Passed with existing warning: using edge runtime disables static generation
    for that page.

## Browser Smoke Result

Result: full visual apply/revert pass for the selected target, with tooling
notes recorded.

Browser path:

- In-app Browser could not navigate to local loopback even though shell `curl`
  returned `200 OK`; this is treated as a tooling limitation.
- Chrome extension backend was unavailable: `Browser is not available:
  extension`.
- Used the existing logged-in Google Chrome tab with Computer Use after starting
  a temporary dev server.

Observed:

- NexusOps UI visible.
- Route-edge boundary is still present by source and prior headless auth-gate
  DOM check.
- Right dock visible.
- TopBar visible.
- OuterShell/workspace visible.
- Message bubbles visible in the active workspace.
- Existing Chrome Translate popup appeared; restored to English/untranslated
  state before final smoke. Treat Translate as known baseline tooling risk.

Apply/revert:

- Applied browser-only CSS vars through the address bar JavaScript URL:
  message bubbles visibly changed to a test magenta surface with green border.
- Removed the browser-only CSS vars through a second JavaScript URL.
- Message bubbles visibly returned to baseline.
- No production token persistence or runtime token apply was introduced.

Known baseline/tooling notes:

- `bg-surface-shell.webp` placeholder load failure remains known baseline from
  earlier runs and was not changed by this round.
- Chrome Translate can cause hydration/text mismatch; it was active initially
  and restored before final smoke.
- Loading the authenticated app triggered existing background sync API traffic;
  this round did not edit store/sync/backend/Supabase/API source and did not
  intentionally mutate workspace content.

## Rollback Path

Revert this commit, or manually remove:

- role class additions in `MessageBubble`
- message bubble alias blocks in `src/app/globals.css`
- terminal-theme message alias bridge rules
- `src/components/nexus/nexus-message-bubble-primitive.test.ts`
- Loop 03 map/checkpoint entries

## Residual Risk

Estimated residual failure risk: below 5%.

Main residual risks:

- Current terminal-theme specificity required an explicit alias bridge; covered
  by focused test and browser visual smoke.
- Chrome Translate can alter visible text independent of this change.
- Existing app background sync runs during authenticated browser smoke.

## Progress Toward 40%

This materially moves production skinning readiness toward 40% more than prior
outer-wrapper-only work because the target is a long-dwell content surface with
role-aware visual semantics.

Estimated readiness movement: from the prior low-to-mid 30% range to roughly
38-40% for visible production skinning coverage, while keeping behavior
boundaries intact.

## Next Recommended Target Seed

Next loop seed: extract or alias the inert agent/window chrome visual shell
only if it can be separated from Rnd drag/resize/focus/z-index behavior.

Smallest safe prompt:

> Scan `AgentWindow` for a static visual shell boundary. If the outer window
> chrome is inseparable from Rnd/focus/z-index, produce an extraction-first map
> for `AgentWindowVisualFrame`; otherwise add aliases only to an existing inert
> wrapper without changing handlers, refs, layout, drag/resize, or message
> rendering.
