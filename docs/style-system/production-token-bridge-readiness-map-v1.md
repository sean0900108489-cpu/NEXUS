# NEXUS Production Token Bridge Readiness Map V1

Status: implementation roadmap
Scope: future production token adoption after V2 bridge readiness
Current branch: `codex/v18-style-pack-contract-prep`

## 1. Baseline

The current implementation stops at readiness:

- V2 Skin Pack validation remains pure.
- Render Plan IR remains Style Lab scoped.
- Production Token Bridge Plan converts accepted Render Plan variables into
  existing legacy CSS variable names.
- Runtime bridge preview applies only to an injected Style Lab target.
- No production Nexus shell behavior is changed.
- No workspace store, sync, backend, Supabase, export, or persistence path is
  connected.

The next production-facing step must be a minimal token adoption unit, not a
full shell restyle.

## 2. Bridge Variable Targets

Future production adoption should start with these legacy variables because the
bridge plan already emits them and the current shell already consumes many of
them through CSS:

- `--bg-base`
- `--bg-elevated`
- `--bg-workspace`
- `--panel-bg`
- `--panel-muted`
- `--border-subtle`
- `--border-glow`
- `--text-main`
- `--text-soft`
- `--text-muted`
- `--theme-primary`
- `--theme-primary-strong`
- `--theme-secondary`
- `--theme-success`
- `--theme-warning`
- `--theme-danger`
- `--shadow-panel`
- `--shadow-glow`
- `--radius-base`
- `--surface-radius`
- `--backdrop-blur`
- `--glass-blur`
- `--workspace-grid-primary`
- `--workspace-grid-secondary`
- `--workspace-wash`

Preserve-only variables remain out of V2 bridge apply:

- `--border-width`
- `--agent-glow-intensity`
- `--icon-weight`
- `--font-main`
- `--chat-panel-opacity`
- `--shell-surface`
- `--asset-background-image`
- `--scanline-opacity`

## 3. Recommended First Surface

Start with `.nexus-panel` only.

Spike status:

- `Production .nexus-panel Token Bridge Spike` is the active first surface.
- `.nexus-panel` may consume surface-specific aliases
  `--nexus-panel-bg`, `--nexus-panel-border`, `--nexus-panel-text`,
  `--nexus-panel-radius`, `--nexus-panel-shadow`, and `--nexus-panel-blur`.
- The aliases fall back to existing legacy variables, so the cyberpunk baseline
  remains the fallback when no bridge variables are scoped.
- Style Lab contains an isolated `.nexus-panel` compatibility specimen for
  bridge preview/revert smoke.

Second spike status:

- `Production .nexus-glass Token Bridge Spike` is the second primitive surface.
- `.nexus-glass` may consume surface-specific aliases
  `--nexus-glass-bg`, `--nexus-glass-border`, `--nexus-glass-text`,
  `--nexus-glass-radius`, and `--nexus-glass-blur`.
- The aliases fall back first to panel aliases where useful, then to existing
  legacy variables, so the cyberpunk baseline remains the fallback when no
  bridge variables are scoped.
- Style Lab contains an isolated `.nexus-glass` compatibility specimen for
  bridge preview/revert smoke.

Why:

- It already consumes `--panel-bg`, `--border-subtle`,
  `--surface-radius`, `--shadow-panel`, and `--glass-blur` in
  `src/app/globals.css:280`.
- It is a visual primitive, not a behavior owner.
- It can be smoke-tested without touching React Flow, Rnd drag/resize,
  workspace persistence, or backend state.
- Rollback is a small CSS/token bridge removal, not a production data migration.

Do not start with:

- full `.nexus-shell` background because `--asset-background-image` and
  `--shell-surface` require asset/texture governance
- React Flow edges/nodes because graph behavior and performance effects need
  narrower adapters
- agent windows because drag/resize/z-index/focus are protected behavior
- persistence/export/import because Protocol 98 and 95 gates are still closed

## 4. Surface Mapping

| Production surface | Source anchor | Current style mechanism | Target bridge variable | Risk | Proposed migration unit | Required tests/smoke | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Panel primitive | `src/app/globals.css:280` | CSS class `.nexus-panel` uses legacy vars | `--panel-bg`, `--border-subtle`, `--surface-radius`, `--shadow-panel`, `--glass-blur` | Low | Adopt bridge variables in an isolated provider scope around a test panel first | Unit target helper, `/style-lab` bridge smoke, production page visual smoke | Remove scoped bridge wrapper; legacy theme vars remain |
| Glass primitive | `src/app/globals.css:289` | CSS class `.nexus-glass` uses bridge aliases with legacy fallback | `--nexus-glass-bg`, `--nexus-glass-border`, `--nexus-glass-text`, `--nexus-glass-radius`, `--nexus-glass-blur` | Low-Medium | Isolated Style Lab compatibility specimen first; no production TSX behavior | `/style-lab` bridge smoke verifies change/revert | Remove glass aliases/specimen; legacy theme vars remain |
| Workspace canvas | `src/app/globals.css:253`, `src/components/nexus/nexus-ops.tsx:2127` | `.nexus-workspace` grid and wash vars plus hardcoded Tailwind classes | `--bg-workspace`, `--workspace-grid-primary`, `--workspace-grid-secondary`, `--workspace-wash` | Medium | Token bridge only for colors/wash; no geometry, overflow, pointer, or z-index | Production smoke for pan/zoom unchanged, no console errors | Revert workspace token scope |
| Shell root | `src/app/globals.css:246`, `src/components/nexus/nexus-ops.tsx:2020` | `.nexus-shell` uses shell surface and asset background | `--bg-base`, `--text-main`; defer `--shell-surface` and asset image | Medium-High | Text/base color only; no asset background | Home load smoke, auth smoke, no background URL from Skin Pack | Remove shell bridge variables |
| Topbar and command palette entry | `src/components/nexus/nexus-ops.tsx:2553` | Tailwind classes with cyan/black hardcoded colors | `--panel-muted`, `--border-subtle`, `--theme-primary`, `--text-main` | Medium | Extract visual primitive class or CSS var-backed inline style | Keyboard command smoke, click/search unchanged | Revert primitive extraction |
| Right dock rail | `src/components/nexus/nexus-ops.tsx:2454` | Tailwind hardcoded bg/border/shadow | `--panel-bg`, `--border-subtle`, `--theme-primary`, `--shadow-panel` | Medium | Visual-only dock recipe adapter after Style Lab coverage | Dock open/close smoke, panel selection unchanged | Remove dock recipe bridge |
| Right dock panel | `src/components/nexus/nexus-ops.tsx:3420` | Fixed panel with hardcoded bg/border/shadow/backdrop | `--panel-bg`, `--border-subtle`, `--shadow-panel`, `--glass-blur` | Medium | Use window/modal recipe after primitive adoption | Open each dock tab, no store writes from skin | Revert class mapping |
| Datapad window | `src/components/nexus/DatapadWindow.tsx:97` | `Rnd`, hardcoded emerald colors, `.nexus-datapad-window` radius | Window recipe plus status vars | High | Only after window recipe adapter; do not change Rnd props | Drag/resize/save/delete smoke | Revert visual adapter class |
| Agent window chrome | `src/app/globals.css:392`, `src/components/nexus/nexus-ops.tsx` adjacent agent window blocks | `.nexus-agent-window` plus Rnd behavior and hardcoded chat styles | Window recipe, `--chat-panel-opacity` preserve-only | High | Token-only visual shell after Rnd behavior tests | Drag/resize/focus/z-index smoke | Remove visual bridge scope |
| React Flow graph canvas | `src/components/nexus/nexus-graph.tsx:542`, `src/app/globals.css:453` | React Flow classes, graph CSS, selected/animated effects | Graph adapter vars, status vars | High | Separate graph visual adapter; no behavior props | Pan/zoom/connect/delete smoke, perf smoke | Revert graph adapter scope |
| Graph node | `src/components/nexus/nexus-graph.tsx:125`, `src/components/nexus/nexus-graph.tsx:197` | Tailwind hardcoded nodes plus inline accent | Graph node recipe vars | High | Specimen parity first, then visual vars only | Node selection/handles unchanged | Remove node visual adapter |
| Prompt vault modal | `src/components/nexus/PromptVaultManager.tsx:126` | Fixed overlay, hardcoded blue/cyan/zinc classes | Modal recipe vars | Medium-High | Modal recipe adoption after panel/glass | Open/close/edit/save smoke | Revert modal visual class |
| Agent branch modal | `src/components/nexus/AgentBranchModal.tsx:108` | Fixed overlay, hardcoded cyan/fuchsia/rose classes | Modal recipe vars and status vars | Medium-High | Modal recipe adoption after prompt vault specimen | Branch create/cancel smoke | Revert modal visual class |
| Auth screen | `src/components/nexus/auth-screen.tsx:81` | Standalone shell, hardcoded auth card | Panel/input/button tokens | Medium | Treat as separate auth specimen; no Supabase/auth logic changes | Auth form smoke with no request mutation | Revert auth visual wrapper |
| LEGO theme controls | `src/components/nexus/nexus-ops.tsx:160` | DOM custom property writer for existing themeConfig | Preserve-only vars | High | Do not bridge in V2; needs governance decision | Existing theme sliders unchanged | No-op |

## 5. Phase Roadmap

### Phase A: Style Lab Coverage Completion

Allowed files:

- `src/lib/style-engine/**`
- `src/components/style-engine/nexus-style-lab.tsx`
- `docs/style-system/**`

Forbidden files:

- production Nexus shell
- store/sync/backend/Supabase
- package/config/deploy

Verification:

- focused style-engine tests
- typecheck
- lint Style Lab and style-engine
- browser smoke `/style-lab`

Rollback:

- revert Style Lab/specimen commits

Stop conditions:

- needing production shell integration
- needing persisted state

### Phase B: Primitive Components Token Adoption

Allowed files:

- CSS primitive layer and focused primitive tests after approval
- no production behavior files unless the primitive owner is identified

Forbidden files:

- React Flow behavior
- workspace store/sync/backend
- persistence/export/import

Verification:

- visual smoke for `.nexus-panel`
- no console errors
- existing V1/V2 Style Lab smoke

Rollback:

- remove primitive token bridge scope and keep legacy theme defaults

Stop conditions:

- hardcoded behavior class needs to change
- bridge requires unsupported variables

### Phase C: Isolated Production Shell Token Bridge

Allowed files:

- runtime provider or isolated shell bridge wrapper after separate approval
- style-engine bridge runtime tests

Forbidden files:

- workspace store/sync/backend/Supabase
- themeConfig persistence
- asset URLs

Verification:

- production page load
- V1 theme controls unchanged
- bridge apply/revert against injected scope only

Rollback:

- remove wrapper/provider usage; legacy variables remain

Stop conditions:

- preview state would need persistence
- bridge needs `document` global access

### Phase D: Recipe Adoption For Windows, Modals, Sidebar, Dock

Allowed files:

- recipe visual adapters
- component visual class adoption units

Forbidden files:

- drag/resize/z-index/focus behavior
- route, store, sync, backend, React Flow behavior

Verification:

- component-specific smoke for each surface
- no behavior regression
- fallback fixture tests

Rollback:

- remove recipe adapter class or scope per surface

Stop conditions:

- recipe attempts to control behavior/layout

### Phase E: Asset And Texture Pack Integration

Allowed files:

- only after Protocol 96

Forbidden files:

- package/lockfile/dependency changes without explicit approval
- remote URL or durable asset claims without Protocol 96

Verification:

- asset safety tests
- performance budget diagnostics
- browser smoke with lazy/optional fallback

Rollback:

- omit asset stages and return to token-only bridge

Stop conditions:

- generated or user-visible asset durability is required
- image decode/cache claims are unverified

### Phase F: Persistence, Export, Import Governance

Allowed files:

- only after Protocol 98 and Protocol 95

Forbidden files:

- Supabase schema, RLS, storage, backend routes before protocol gates

Verification:

- API tests
- database parity checks
- advisor/security checks

Rollback:

- migration rollback plan and feature flag off-switch

Stop conditions:

- any persisted style data lacks governance and audit path

## 6. Next Implementation Recommendation

The next implementation gate should be:

```text
production primitive panel token bridge spike
```

Scope:

- one isolated bridge scope
- `.nexus-panel` visual variables only
- no Skin Pack persistence
- no production asset, recipe, layout, graph, or window behavior

Required proof before broadening:

- Style Lab bridge smoke remains green
- existing production page behavior remains unchanged
- revert restores prior variables
- no store/sync/backend/Supabase/package/deploy changes
