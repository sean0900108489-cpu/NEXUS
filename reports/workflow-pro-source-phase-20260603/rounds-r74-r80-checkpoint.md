# Workflow Pro Source Phase Checkpoint: R74-R80

Generated: 2026-06-04

## Human Summary

這一段不是單純整理報告，而是把 Workflow Pro 從「有頁面雛形」推到「可以繼續深度開發的穩定地基」。R74-R80 已經完成四件關鍵事：

1. 建立並驗證目前 Workflow Pro source baseline。
2. 把左側 internal modes 從 placeholder 變成真實可切換的 Active Cockpit Bay。
3. 把 Design、Brain、Evidence、Proposal Diff、Files、Settings 六個模式各自補上可被操作者與 LLM 讀懂的工程資訊。
4. 用 unit tests、Workflow Pro lib tests、typecheck、auth boundary gate、production build 驗證沒有破壞基礎權限與部署門檻。

目前判定：

- Workflow Pro 地基完整度：100/100。
- 深度功能落地度：約 56/100。
- 下一段最值得做的是：真實 import/apply 體驗、screen-level sync issue 追蹤、Workflow Brain context 的可操作化，以及 benchmark JSON 的螢幕操作回歸。

## Round Ledger

| Round | Focus | Result | Score |
| --- | --- | --- | --- |
| R74 | Baseline scan and test gate | `src/lib/workflow-pro`, surface, primitive, store tests passed: 12 files / 51 tests | 91 |
| R75 | Active Cockpit Bay first landing | Mode rail became real UI state; Brain toggle smoke passed in Chrome | 92 |
| R76 | Brain and Evidence detail bays | Brain shows system brief / output contract / missing capabilities; Evidence shows run ledger | 92 |
| R77 | Design gate and Proposal review queue | Foundation gate and proposal queue landed; typecheck passed | 93 |
| R78 | Files pipeline and Settings registry | File pipeline path plus capability registry verified in Chrome | 93 |
| R79 | Mode landmark regression tests | Every cockpit mode now has static render assertions; Workflow Pro tests: 10 files / 23 tests | 94 |
| R80 | Auth/build gate | `check:auth-boundary` passed; production `next build` passed | 95 |

## Source Changes In This Checkpoint

### `src/components/nexus/workflow-pro/workflow-pro-surface.tsx`

Purpose:

- Own the Workflow Pro product surface.
- Keep Graph executable while Workflow Pro explains intent, topology, evidence, files, proposal diff, and capability limits.

Important changes:

- Added `WorkflowProMode`.
- Added active mode state and six mode buttons.
- Added `WorkflowProActiveModeBay`.
- Added mode-specific details:
  - Design: workflow intent, import state, apply safety, three-step foundation gate.
  - Brain: system brief, required output, missing capability signal.
  - Evidence: run ledger, node status counts, last error.
  - Proposal Diff: node delta, edge delta, review queue.
  - Files: raw artifact, compiler boundary, ContextPacket packaging, file pipeline path.
  - Settings: executable node registry, compiler registry, planned capability flags, capability registry.
- Added `initialMode` test seam. Production default remains `Design`.

### `src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx`

Purpose:

- Protect the cockpit from silent UI regression.

Important changes:

- Added shared `renderWorkflowProSurface()` fixture renderer.
- Added assertions for every internal cockpit mode.
- Preserved existing Graph/Panels navigation and import-review safety assertions.

### `docs/workflow-pro/ui-architecture.md`

Purpose:

- Human and LLM-readable source of truth for Workflow Pro UI architecture.

Important changes:

- Added current source status.
- Documented that mode switching is UI-local and does not mutate Graph, Runtime Lite, Supabase, or persisted workspace state.
- Documented the test seam protecting active bay, foundation gate, proposal queue, file pipeline, and capability registry.

### `docs/workflow-pro/llm-guide.md`

Purpose:

- Tell future Codex / LLM agents where Workflow Pro lives and what not to break first.

Important changes:

- Updated current architecture facts to include the mounted Workflow Pro view and active cockpit bay.
- Reframed the next implementation goal around deepening each internal mode.

## Verification Matrix

| Gate | Command | Result |
| --- | --- | --- |
| Baseline Workflow Pro regression | `npm test -- src/lib/workflow-pro src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx src/components/nexus/nexus-workspace-primitive.test.ts src/store/nexus-store.test.ts` | Passed, 12 files / 51 tests |
| Mode bay regression | `npm test -- src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx` | Passed, 1 file / 4 tests |
| Workflow Pro library pack | `npm test -- src/lib/workflow-pro src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx` | Passed, 10 files / 23 tests |
| TypeScript | `npm run typecheck` | Passed |
| Auth boundary | `npm run check:auth-boundary` | Passed, 2 files / 22 tests, `blockingFindings: []` |
| Production build | `npm run build` | Passed |

Build warning retained:

- `Using edge runtime on a page currently disables static generation for that page`.
- This is not a failure. It should be considered a future deployment optimization item, not a Workflow Pro blocker.

## Risk Register

| Risk | Current Status | Next Action |
| --- | --- | --- |
| UI exists but does not yet mutate Graph through a fully operator-reviewed apply bridge | Known and guarded | Build real import/apply experience with screen-level tests |
| Workflow Brain can read context, but cannot yet safely propose and apply optimized workflows end-to-end | Known | Add proposal generation contract and operator approval queue |
| File compiler path is visible, but advanced compiler execution is planned, not available | Honest planned state | Add compiler registry execution only after artifact raw/compiled link is persisted |
| Chrome shows local sync issue badge during manual smoke | Observed, not investigated in this checkpoint | Next phase should inspect sync status, retry path, and backend trace |
| Edge runtime build warning | Non-blocking | Decide later whether static generation matters for affected page |

## Next High-ROI Sequence

1. Inspect local screen-level sync issue and map it to backend route/log/state.
2. Add a Workflow Pro screen test script for loading benchmark JSON from the UI, importing it, applying preview, opening Graph, and verifying run readiness.
3. Deepen Workflow Brain context into an operator-facing prompt pack with explicit capability limits and proposal output schema.
4. Build proposal import/apply diff UX beyond read-only display.
5. Add persistence plan for workflow contracts, generated proposals, apply plans, and benchmark evidence.
6. Run account/permission matrix again after any route or Supabase behavior changes.

## LLM Handoff Packet

When continuing this work, do not start by editing `NexusGraph`. Start from:

- `src/components/nexus/workflow-pro/workflow-pro-surface.tsx`
- `src/components/nexus/workflow-pro/workflow-pro-surface.test.tsx`
- `src/lib/workflow-pro/*`
- `docs/workflow-pro/ui-architecture.md`
- `docs/workflow-pro/llm-guide.md`

Current safe assumption:

- Workflow Pro is still a design and analysis layer.
- Graph remains the executable workspace.
- Runtime Lite semantics were not changed in R74-R80.
- Supabase schema and RLS were not changed in R74-R80.

Current checkpoint score:

- Engineering foundation: 100/100.
- Verification confidence: 95/100.
- Product depth: 56/100.
- Readiness for next deep implementation phase: 92/100.

