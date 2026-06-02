# V19 Production Skinning Pre-Landing Consolidation

Date: 2026-05-31

Branch: `codex/v19-production-shell-style-upgrade`

## Verdict

V19 is ready to stop broad implementation and enter pre-landing.

Current readiness is estimated at `78-79%`. The adopted production alias
families are directly covered by the Surface Style bridge, and Style Lab now has
usable visual specimens for the north-star composition. The remaining gap is no
longer "add another shell alias"; it is confidence, channeling, and landing:
authenticated production smoke, user testing guidance, recipe boundaries, and
V20 gates for layout/assets/runtime apply.

This consolidation does not select a single implementation path. It recommends
the user testing guide track first because risk is rising and the system needs
human/designer feedback before more production primitives are widened.

## Surface Adhesion Map

| Capability / artifact | Current location | Related real product surface | Adhesion level | Evidence | Still missing | Next possible bridge |
| --- | --- | --- | --- | --- | --- | --- |
| Surface Style fixture | `src/lib/style-engine/v2-fixtures.ts` | Style Pack authoring, token preview, north-star skin input | Style-Lab-specimen | Surface Style fixture validates, compiles, and can be loaded from Style Lab | No production apply or persistence | User testing guide and non-persistent preview track |
| Render Plan / Bridge Plan | `src/lib/style-engine/v2-render-plan.ts`, `src/lib/style-engine/v2-production-token-bridge.ts` | Adopted production alias families | documentation-only / bridge-plan | Bridge emits direct production aliases while `canApplyProduction` remains `false` | No live workspace preview channel | Non-persistent alias-to-workspace preview gate |
| Production alias coverage report | `src/lib/style-engine/v2-production-alias-coverage.ts`, Style Lab coverage panel | Current production alias surface inventory | documentation-only / Style-Lab-report | 10/10 current families and 58/58 adopted aliases are direct bridge covered | It measures adopted aliases, not visual similarity or production apply | User/designer coverage testing plus authenticated smoke |
| Production Chrome Smoke harness | `src/components/style-engine/nexus-style-lab.tsx` | Right dock, TopBar, workspace, message, AgentWindow, CommandPalette, modal, Datapad chrome | Style-Lab-specimen | Local ref apply/revert covers the current selector set without auth | True production `/` still auth-gated for several live surfaces | Authenticated production smoke checklist |
| Surface Style Scene Preview | `src/components/style-engine/nexus-style-lab.tsx` | Overall workspace mood and command-center composition | Style-Lab-specimen | Warm scene/wash, workspace board, chrome specimens, supported/simulated/missing summary | No production background asset/layout channel | Asset/layout gate, not V19 runtime apply |
| Right Metrics specimen | `src/components/style-engine/nexus-style-lab.tsx` | Future right-side inspector / metrics / run-control surface | Style-Lab-specimen | Static selected agent, collaboration map, context stack, goal metrics, run execution, memory/history | Real right-dock panels still own behavior and persistence | Recipe boundary, then selector-only panel scan |
| Agent Card Bank specimen | `src/components/style-engine/nexus-style-lab.tsx` | Future agent roster/card bank surface | Style-Lab-specimen | Static agent roster, role chips, avatars, status dots, micro-metrics | No production roster/card boundary or data channel | Recipe boundary before production selector scan |
| Segmented Top Navigation specimen | `src/components/style-engine/nexus-style-lab.tsx` | Future top mode navigation / compact counters | Style-Lab-specimen | Static segmented nav and counters based on reference visual hierarchy | TopBar child controls are behavior-bearing | Recipe boundary and TopBar child-control scan |
| Icon/Button Chrome recipe specimen | `src/components/style-engine/nexus-style-lab.tsx` | Future buttons, inputs, badges, icon controls | Style-Lab-specimen | Static icon buttons, primary/secondary actions, command field, status badges | Production controls need selector ownership proof | Primitive selector-first track |
| RightDock | `NexusOpsRightFloatingDockFrame`, `.nexus-right-floating-dock-rail` | Real right floating dock rail | production-wrapper / production-alias | Extracted inert frame and dedicated aliases; Style Lab smoke coverage | Active artifact/vault panels remain excluded | Authenticated rail smoke; defer active panels |
| TopBar | `NexusOpsTopBarFrame`, `.nexus-top-bar-frame` | Real production top bar frame | production-wrapper / production-alias | Extracted inert frame and dedicated aliases; Style Lab smoke coverage | Child controls and counters remain behavior-bearing | Authenticated smoke and recipe boundary for segmented nav |
| OuterShell | `NexusOpsOuterShellFrame`, `.nexus-outer-shell-frame` | Production route shell background | production-wrapper / production-alias | Single shell background alias with low behavior risk | Low visual ROI; no background scene pipeline | Keep stable; do not expand without asset/layout gate |
| Workspace | `.nexus-workspace` | Main production workspace surface | production-alias | Expanded workspace bg/grid/wash/border/shadow/radius aliases | React Flow and layout behavior intentionally untouched | Authenticated workspace visual smoke only |
| MessageBubble | `.nexus-message-bubble-*` | Real chat/message content surface | production-selector / production-alias | Role selectors and role-aware aliases; browser apply/revert previously passed | Live streaming/tool content edge states need smoke only | Authenticated message/content smoke |
| AgentWindow | `.nexus-agent-window`, `.nexus-drag-handle` | Real draggable/resizable agent windows | production-selector / production-alias | Chrome and handle aliases; isolated Style Lab smoke | Local `/` AgentWindow was auth-gated; window behavior untouched | Authenticated AgentWindow visual smoke |
| CommandPalette | `.nexus-command-palette-shell` | Real command palette inner shell | production-selector / production-alias | Selector-first then chrome aliases; Style Lab smoke | Open/close/focus command path needs auth smoke | Authenticated open/close smoke without command execution |
| Modal shell | `.nexus-agent-branch-modal-shell` | Real AgentBranchModal inner shell | production-selector / production-alias | Selector-first then modal shell aliases; Style Lab smoke | Open/close smoke needed; submit must stay untouched | Authenticated modal visual smoke only |
| Datapad shell | `.nexus-datapad-shell` | Real DatapadWindow inner shell | production-selector / production-alias | Selector-first then Datapad shell aliases; Style Lab smoke | Open/close smoke needed; save/delete/draft/persistence untouched | Authenticated Datapad visual smoke |
| ToolbarIconButton selector | `.nexus-control-icon-button-shell` | Real AgentWindow toolbar icon buttons | production-selector | Selector added to helper-level class string; no CSS aliases | No control aliases yet; auth-gated runtime visibility | Control primitive selector/alias gate after smoke |

## Landing Readiness Classification

### A. Ready For User Testing In Style Lab

Criteria:

- no auth needed
- no production apply
- local preview or local ref smoke only
- enough visual surface to judge Surface Style direction

Included:

- Surface Style fixture
- Surface Style Ops Coverage panel
- Production Chrome Smoke harness
- Surface Style Scene Preview
- Right Metrics specimen
- Agent Card Bank specimen
- Segmented Top Navigation specimen
- Icon/Button Chrome recipe specimen

Risk:

- low; failures are preview/reporting issues, not production behavior.

Confidence / rollback:

- high; revert the relevant Style Lab specimen commits or this docs-only
  consolidation if the guidance is wrong.

### B. Ready For Authenticated Production Smoke

Criteria:

- production selector or alias exists
- behavior changes were not made
- smoke can verify visibility and computed styling without mutation

Included:

- RightDock rail
- TopBar frame
- Workspace surface
- MessageBubble roles
- AgentWindow chrome
- CommandPalette shell
- Modal shell
- Datapad shell
- ToolbarIconButton selector

Risk:

- low-to-medium because several checks require an authenticated workspace and
  must avoid command execution, form submit, save/delete, upload/download, and
  destructive actions.

Confidence / rollback:

- good; each loop has focused tests/checkpoints and commit-level rollback.

### C. Ready For Production Selector/Alias Follow-Up

Criteria:

- selector prep exists or the scan found a likely high-ROI selector boundary
- next step can be source-only or CSS-only
- no behavior/state/focus/submit ownership changes are required

Included:

- `ToolbarIconButton` icon-control selector
- potential future badge/status/counter selector families only after a
  dedicated risk scan
- potential input wrapper path only if wrapper is separated from submit,
  keydown, focus, validation, and draft state

Risk:

- rising; more control primitives are coupled to active UI behavior.

Confidence / rollback:

- proceed one primitive at a time, with selector-only then alias-only loops.

### D. Needs Recipe Boundary

Criteria:

- Style Lab specimen exists
- production counterpart is real but behavior/data ownership is not isolated
- the next safe move is to define the visual recipe and smallest inert boundary

Included:

- Right Metrics panel
- Agent Card Bank
- Segmented Top Navigation
- Icon/Button/Badge/Input-like chrome
- Typography density

Risk:

- medium if rushed into production components; low if kept as recipe/specimen
  documentation.

Confidence / rollback:

- use recipe docs and source guards before production selector work.

### E. Needs Layout/Asset Gate

Criteria:

- visual target depends on background imagery, scene composition, or page
  arrangement
- V19 does not own production asset/layout apply

Included:

- desert atelier background scene
- real background/asset pipeline
- layout preset/page shell arrangement
- page-level command-center composition

Risk:

- high for V19 if implemented directly; suitable for V20 gate.

Confidence / rollback:

- keep as Style Lab-only or docs until explicit asset/layout gate exists.

### F. Needs User-Facing Guide

Criteria:

- capability is real enough to test, but not obvious without instructions
- test result should feed design/product decisions rather than more blind code

Included:

- loading Surface Style fixture
- reading direct alias coverage
- using token preview/revert
- using Production Chrome Smoke apply/revert
- judging Style Lab specimens
- separating supported, simulated, missing, and production-auth-only evidence

Risk:

- low; best immediate bridge.

Confidence / rollback:

- high; guide is docs-only and can be revised after user feedback.

### G. No-Go Until V20

Criteria:

- requires persistence, backend/store/API, auth bypass, production runtime
  apply, asset apply, layout apply, or behavior refactor

Included:

- runtime token persistence
- production Skin Pack apply
- backend/store/sync/Supabase/API integration
- asset/background production pipeline
- layout preset production apply
- broad `nexus-ops.tsx` refactor
- right-dock artifact/vault persistence panels
- React Flow / graph behavior
- drag/resize/focus/z-index/window/modal manager changes

Risk:

- high under V19; do not continue here.

Confidence / rollback:

- defer until explicit V20 scope and gates exist.

## Connection Options

### 1. User Testing Guide Track

Goal:

- let a user/designer/LLM evaluate the current Surface Style system without
  mistaking Style Lab preview for production apply.

First safe task:

- use `docs/style-system/v19-surface-style-ops-user-testing-guide.md`.

Allowed files:

- docs only, optionally checkpoint updates.

Forbidden files:

- `src/**`, production runtime, persistence, asset/layout apply.

Verification:

- `git diff --check`; optional manual `/style-lab` run by tester.

Risk:

- very low.

Expected value:

- high; catches visual/product gaps before more production code increases risk.

Status:

- recommended first.

### 2. Authenticated Production Smoke Track

Goal:

- verify adopted production selectors/aliases in a real authenticated `/`
  workspace without mutating data.

First safe task:

- create and run an authenticated smoke checklist for right dock, TopBar,
  workspace, message bubbles, AgentWindow, CommandPalette, modal, Datapad, and
  ToolbarIconButton selector visibility.

Allowed files:

- docs/checklist first; no source changes unless a smoke blocker is purely a
  test harness issue.

Forbidden files:

- login automation with credentials, command execution, submit/save/delete,
  upload/download, store/backend/API, production apply.

Verification:

- browser evidence, console separation, known baseline separation.

Risk:

- medium operational risk; low code risk if docs-only.

Expected value:

- high confidence gain before V20.

### 3. Production Alias-To-Workspace Bridge Track

Goal:

- explore how Render Plan / Bridge Plan variables could feed a real workspace
  preview without persistence.

First safe task:

- design a non-persistent preview channel proposal; do not implement runtime
  apply yet.

Allowed files:

- docs and pure style-engine helpers only after a gate.

Forbidden files:

- production apply, token persistence, backend/store/API, layout preset apply.

Verification:

- pure tests for bridge output; Style Lab-only browser smoke.

Risk:

- medium; this starts touching the real landing path.

Expected value:

- highest technical bridge toward V20 after user testing.

### 4. Recipe Boundary Track

Goal:

- turn Style Lab specimens into precise recipe boundaries before production
  selectors are added.

First safe task:

- write recipe boundary docs for right metrics, agent cards, segmented nav, and
  control chrome.

Allowed files:

- docs; later source guards only after a target-specific selector scan.

Forbidden files:

- behavior-bearing production components, store/backend/API, layout apply.

Verification:

- docs diff check; later focused source guards.

Risk:

- low as documentation, medium if moved into production too early.

Expected value:

- high for aligning design language with actual product surfaces.

### 5. Production Primitive Selector Track

Goal:

- continue selector-first adoption for buttons, inputs, badges, and counters
  only where visual shell ownership is clear.

First safe task:

- one dedicated scan for badge/status/counter helper boundaries, not a broad
  styling pass.

Allowed files:

- exact component and focused source guard if safe; otherwise docs-only no-go
  map.

Forbidden files:

- `globals.css` aliasing in selector scan, submit/validation/focus/keyboard
  changes, active/disabled logic changes, broad refactor.

Verification:

- focused test, typecheck, targeted lint, build; auth smoke if visible.

Risk:

- rising; many controls are behavior-bound.

Expected value:

- moderate-to-high only if a helper-level primitive exists.

### 6. Asset/Layout Gate Track

Goal:

- decide how background scene, image/asset support, and command-center layout
  arrangement can become real later.

First safe task:

- V20 gate proposal; no production implementation.

Allowed files:

- docs/specs only until explicit gate.

Forbidden files:

- remote image URLs, copied reference images, asset pipeline, layout preset
  production apply, production shell behavior.

Verification:

- docs diff check; later asset security review.

Risk:

- high if attempted under V19.

Expected value:

- high for visual similarity, but it needs V20 governance.

## Pre-Landing Verdict

V19 should stop broad implementation now.

The system is closer to 80% than to 60% because direct bridge coverage,
production shell aliases/selectors, Style Lab preview, and recipe specimens are
all in place. It is still not a full 80-90% production skin because the visual
direction has not been exercised in an authenticated workspace, the most
reference-like agent/metrics/nav/control patterns are still Style Lab
specimens, and background/layout/asset capabilities are explicitly out of
scope.

Do not touch next:

- blind badge/status/counter selectors
- right-dock artifact/vault persistence panels
- production runtime apply
- token persistence
- backend/store/sync/Supabase/API
- React Flow / graph behavior
- drag/resize/focus/z-index/window/modal manager behavior
- asset/background production pipeline
- layout preset production apply
- broad `nexus-ops.tsx` refactors

Evidence still missing before V20:

- authenticated production `/` smoke for live AgentWindow, CommandPalette,
  Modal, Datapad, ToolbarIconButton, and selected message/workspace surfaces
- user/designer feedback from Style Lab Surface Style testing
- recipe boundary decisions for right metrics, agent cards, segmented nav, and
  control primitives
- explicit non-persistent preview-channel design
- asset/layout gate approval if the desert atelier scene should become real

Documentation needed:

- a user testing guide for Style Lab Surface Style validation
- an authenticated production smoke checklist
- recipe boundary docs before any more production selector expansion

Recommended first track:

- user testing guide track.

Reason:

- the highest ROI now is not another selector. It is getting reliable feedback
  on the existing Surface Style system while preserving the clean rollback and
  behavior boundaries that V19 has maintained.
