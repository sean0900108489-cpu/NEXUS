# V2 Skin Pack Visual Coverage / Production Gap Audit

Date: 2026-05-30
Branch baseline: `codex/v18-style-pack-contract-prep`
Audit baseline HEAD: `8191af9 feat: add style lab v2 specimen gallery`
Scope: docs-only production gap audit for `/style-lab` V2 Specimen Gallery versus Nexus production UI.

## Executive Verdict

V2 Skin Pack is not ready for direct production shell integration. `/style-lab` now gives a useful isolated visual proof for token-only preview plus recipe specimen preview, but production Nexus UI still has many hardcoded visual mechanisms, protected behavior/layout controls, graph-specific adapters, media/asset surfaces, and persistence-linked theme paths that require staged gates before any production apply.

Recommended next implementation gate:

1. Complete Style Lab coverage for missing production-like specimens.
2. Add pure Render Plan IR types/tests before production token bridge work.
3. Expand recipe coverage only through safe visual adapters.
4. Defer asset/texture integration until Protocol 96.
5. Defer persistence/export/import governance until Protocol 98 and Protocol 95.

## Sources Scanned

Current isolated V2 Style Lab and helper anchors:

- `src/lib/style-engine/v2-recipe-specimen-preview.ts:30` defines display-safe specimen style keys only: background, borderColor, borderRadius, boxShadow, color, opacity, outlineColor.
- `src/lib/style-engine/v2-recipe-specimen-preview.ts:40` lists current specimen IDs: panel, buttonDefault, buttonHover, buttonDisabled, input, badgeStatus, commandPalette, agentWindow, modalDialog, sidebarDock.
- `src/lib/style-engine/v2-recipe-specimen-preview.ts:103` lists supported recipe groups: panel, button, input, badge, window, modal, commandPalette, dock.
- `src/lib/style-engine/v2-recipe-specimen-preview.ts:130` validates the candidate before gallery creation and rejects without returning a gallery.
- `src/lib/style-engine/v2-recipe-specimen-preview.ts:186` creates accepted gallery output from an accepted pack.
- `src/components/style-engine/nexus-style-lab.tsx:557` requires token preview eligibility before specimen gallery compilation.
- `src/components/style-engine/nexus-style-lab.tsx:581` reports gallery status as isolated ready, blocked, or review required.
- `src/components/style-engine/nexus-style-lab.tsx:1545` renders the V2 Specimen Gallery.
- `src/components/style-engine/nexus-style-lab.tsx:1580` through `src/components/style-engine/nexus-style-lab.tsx:1805` renders panel, button variants, input, badge, command palette, agent window, modal, and sidebar/dock specimens.
- `src/components/style-engine/nexus-style-lab.tsx:1808` renders fallback summary.

Production Nexus anchors:

- `src/components/nexus/nexus-ops.tsx:160` defines LEGO theme defaults and CSS variable keys.
- `src/components/nexus/nexus-ops.tsx:291` applies LEGO theme config to DOM variables.
- `src/components/nexus/nexus-ops.tsx:2020` renders the root production shell.
- `src/components/nexus/nexus-ops.tsx:2125` renders the workspace canvas surface.
- `src/components/nexus/nexus-ops.tsx:2442` renders the right floating dock.
- `src/components/nexus/nexus-ops.tsx:2478` renders the top bar and workspace menu.
- `src/components/nexus/nexus-ops.tsx:2871` renders the macro composer modal.
- `src/components/nexus/nexus-ops.tsx:2976` renders provider vault controls.
- `src/components/nexus/nexus-ops.tsx:3237` renders the right settings sidebar.
- `src/components/nexus/nexus-ops.tsx:4183` renders LEGO theme controls.
- `src/components/nexus/nexus-ops.tsx:4591` renders the left dock / agent bay.
- `src/components/nexus/nexus-ops.tsx:4797` renders draggable/resizable agent windows.
- `src/components/nexus/nexus-ops.tsx:5130` renders sandbox canvas and split panes.
- `src/components/nexus/nexus-ops.tsx:5488` renders agent action toolbar popovers.
- `src/components/nexus/nexus-ops.tsx:5817` renders media canvas.
- `src/components/nexus/nexus-ops.tsx:5904` renders media artifact preview with runtime artifact URL.
- `src/components/nexus/nexus-ops.tsx:5942` renders message bubbles.
- `src/components/nexus/nexus-ops.tsx:6004` renders minimized agent rail.
- `src/components/nexus/nexus-ops.tsx:6042` renders right intel panel.
- `src/components/nexus/nexus-ops.tsx:6389` renders command palette.
- `src/components/nexus/nexus-graph.tsx:120` renders agent graph nodes.
- `src/components/nexus/nexus-graph.tsx:187` renders runtime graph nodes.
- `src/components/nexus/nexus-graph.tsx:282` renders runtime handles with hardcoded colors.
- `src/components/nexus/nexus-graph.tsx:430` renders blueprint edges and edge hit/delete affordances.
- `src/components/nexus/nexus-graph.tsx:850` renders React Flow, minimap, controls, pan/drag/connect behavior, and graph background.
- `src/components/nexus/DatapadWindow.tsx:87` renders draggable datapad window via `Rnd`.
- `src/components/nexus/PromptVaultManager.tsx:126` renders prompt vault overlay.
- `src/components/nexus/AgentBranchModal.tsx:107` renders branch modal overlay.
- `src/components/nexus/auth-screen.tsx:81` renders auth screen.
- `src/app/globals.css:7` through `src/app/globals.css:42` define the cyberpunk legacy token layer.
- `src/app/globals.css:170` bridges legacy variables into Tailwind color tokens.
- `src/app/globals.css:245` styles `.nexus-shell`.
- `src/app/globals.css:252` styles `.nexus-workspace`.
- `src/app/globals.css:280` styles `.nexus-panel`.
- `src/app/globals.css:301` applies global shell radius/transition targets.
- `src/app/globals.css:391` styles `.nexus-agent-window`.
- `src/app/globals.css:452` through `src/app/globals.css:615` styles React Flow selectors, edge effects, agent nodes, message bubbles, controls, and minimap.

## Current `/style-lab` Gallery Coverage

The isolated gallery currently covers these specimens:

- Panel
- Button default
- Button hover-like
- Button disabled-like
- Input
- Badge/status
- Command palette
- Agent window
- Modal/dialog
- Sidebar/dock

These specimens are built from accepted V2 Skin Pack input only. The gallery is blocked unless token preview eligibility exists first (`src/components/style-engine/nexus-style-lab.tsx:557`) and the specimen helper rejects invalid candidates before producing gallery output (`src/lib/style-engine/v2-recipe-specimen-preview.ts:130`).

Current recipe coverage:

- Covered recipe groups: panel, button, input, badge, window, modal, commandPalette, dock.
- Not covered as first-class recipe groups yet: topbar, menu/list item, messageBubble, graphNode, graphEdge, graphControls, mediaCanvas, datapad, providerVault, promptVault, branchModal, authSurface, sandbox, toolbar, minimizedRail, rightIntel, statusSync, artifactVault.

## Production Nexus Visual Surfaces

Major production surfaces found in scan:

- Shell root and workspace canvas: root shell at `src/components/nexus/nexus-ops.tsx:2020`, workspace at `src/components/nexus/nexus-ops.tsx:2125`, CSS variables at `src/app/globals.css:245` and `src/app/globals.css:252`.
- Global CSS variable bridge: legacy variables at `src/app/globals.css:7`, Tailwind bridge at `src/app/globals.css:170`, global shell selectors at `src/app/globals.css:301`.
- Top bar and workspace menu: `src/components/nexus/nexus-ops.tsx:2478`.
- Right floating dock: `src/components/nexus/nexus-ops.tsx:2442`.
- Right settings sidebar, provider vault, theme controls: `src/components/nexus/nexus-ops.tsx:3237`, `src/components/nexus/nexus-ops.tsx:2976`, `src/components/nexus/nexus-ops.tsx:4183`.
- Left dock and agent bay: `src/components/nexus/nexus-ops.tsx:4591`.
- Agent window, action toolbar, prompt/intel popovers: `src/components/nexus/nexus-ops.tsx:4797`, `src/components/nexus/nexus-ops.tsx:5488`.
- Sandbox canvas, split resize, iframe surface, lock overlay: `src/components/nexus/nexus-ops.tsx:5130`.
- Media canvas and media artifact preview: `src/components/nexus/nexus-ops.tsx:5817`, `src/components/nexus/nexus-ops.tsx:5904`.
- Message bubbles: `src/components/nexus/nexus-ops.tsx:5942`.
- Minimized rail: `src/components/nexus/nexus-ops.tsx:6004`.
- Right intel panel: `src/components/nexus/nexus-ops.tsx:6042`.
- Command palette: `src/components/nexus/nexus-ops.tsx:6389`.
- Graph nodes, runtime nodes, edges, minimap, controls: `src/components/nexus/nexus-graph.tsx:120`, `src/components/nexus/nexus-graph.tsx:187`, `src/components/nexus/nexus-graph.tsx:430`, `src/components/nexus/nexus-graph.tsx:850`.
- Datapad window: `src/components/nexus/DatapadWindow.tsx:87`.
- Prompt vault manager: `src/components/nexus/PromptVaultManager.tsx:126`.
- Branch modal: `src/components/nexus/AgentBranchModal.tsx:107`.
- Auth screen: `src/components/nexus/auth-screen.tsx:81`.

## Coverage Alignment

Surfaces with a reasonable current specimen correspondence:

| Production surface | Current specimen/recipe | Coverage quality | Notes |
| --- | --- | --- | --- |
| Generic panel shells | `panel` | Good | `.nexus-panel` already has a CSS variable-based baseline at `src/app/globals.css:280`. |
| Primitive buttons | `buttonDefault`, `buttonHover`, `buttonDisabled` | Partial | Production buttons are many hardcoded Tailwind variants; specimen proves token language but not adoption. |
| Inputs/textareas | `input` | Partial | Many production inputs share border/background/text/focus patterns, but dimensions and behavior are protected. |
| Badge/status chips | `badgeStatus` | Partial | Sync/provider/tool/status chips exist, but state-specific success/warning/danger coverage needs variants. |
| Command palette | `commandPalette` | Good for visual skeleton | Production keyboard, focus, filtering, and command handlers remain protected at `src/components/nexus/nexus-ops.tsx:6389`. |
| Agent window | `agentWindow` | Partial | Chrome/body/status visuals covered; `Rnd`, drag, resize, z-index, focus, maximize/minimize are protected. |
| Modal/dialog | `modalDialog` | Partial | Macro, branch, prompt vault, command palette overlays need separate state specimens. |
| Sidebar/dock | `sidebarDock` | Partial | Right dock and side panels correspond visually; fixed position, pointer-events, z-index, and panel routing are protected. |

Surfaces still missing from Style Lab coverage:

- Top bar and workspace menu states.
- Sync badge states and retry/error variants.
- Provider vault and credential safety state variants.
- LEGO theme controls, sliders, transient DOM preview, and commit path.
- Left dock templates, operator list, expansion panels, model tuning.
- Agent action toolbar, prompt vault popover, predictive intel popover.
- Sandbox split panes, iframe/external-only state, lock overlay.
- Media canvas and artifact preview.
- Message bubble role variants, streaming cursor, interrupted state, reasoning details.
- Minimized rail.
- Right intel panel, collaboration graph mini-surface, context stack, tool ports, memory edit.
- React Flow graph node, runtime node, handle, edge, minimap, controls, graph action/status.
- Datapad window.
- Prompt vault manager.
- Branch modal compression states.
- Auth screen.

## Low-Risk Token Adoption Candidates

Low-risk means visual-only CSS variables or compiled visual styles can be consumed without touching layout geometry, persistence, behavior, or backend state.

- Legacy global token bridge: `--bg-base`, `--bg-elevated`, `--bg-workspace`, `--panel-bg`, `--panel-muted`, `--border-subtle`, `--border-glow`, `--text-main`, `--text-soft`, `--text-muted`, `--theme-primary`, `--theme-secondary`, `--theme-success`, `--theme-warning`, `--theme-danger`, `--shadow-panel`, `--shadow-glow`, `--radius-base`, `--backdrop-blur`, `--agent-glow-intensity`, and `--chat-panel-opacity` at `src/app/globals.css:7`.
- Tailwind color bridge for slate/cyan/fuchsia/emerald/amber/rose utility classes at `src/app/globals.css:170`.
- `.nexus-panel`, `.nexus-glass`, `.nexus-agent-window`, `.nexus-datapad-window`, `.nexus-message-bubble`, `.react-flow__controls`, and `.react-flow__minimap` visual variable consumption at `src/app/globals.css:280`, `src/app/globals.css:288`, `src/app/globals.css:391`, `src/app/globals.css:407`, and `src/app/globals.css:585`.
- Style Lab token-only preview variables should bridge to these same semantic groups through a future scoped runtime adapter, not by passing large skin objects through React state.
- Safe candidate recipe slots: surface, surfaceMuted, border, text, accent, status, shadow, radius, blur, outline, focus ring, and passive glow intensity.

## Hardcoded Visual Tokens To Migrate Later

Hardcoded visual mechanisms found:

- Utility-heavy color families across `src/components/nexus/nexus-ops.tsx`: `bg-slate`, `bg-black`, `bg-white`, `border-cyan`, `border-fuchsia`, `border-emerald`, `border-amber`, `border-rose`, `text-slate`, `text-cyan`, `text-fuchsia`, hardcoded `shadow-[...]`, and `backdrop-blur`.
- Graph handles use fixed color literals for runtime handles at `src/components/nexus/nexus-graph.tsx:293`.
- React Flow default edges use fixed stroke/marker color `#22d3ee` at `src/components/nexus/nexus-graph.tsx:858`.
- React Flow background/minimap use fixed color values at `src/components/nexus/nexus-graph.tsx:923` and `src/components/nexus/nexus-graph.tsx:926`.
- Datapad uses emerald-specific hardcoded window chrome at `src/components/nexus/DatapadWindow.tsx:97`.
- Prompt vault uses blue/zinc/cyan/fuchsia/amber/rose/emerald hardcoded visual variants at `src/components/nexus/PromptVaultManager.tsx:126`.
- Branch modal uses cyan/fuchsia/rose hardcoded visual variants at `src/components/nexus/AgentBranchModal.tsx:107`, `src/components/nexus/AgentBranchModal.tsx:149`, and `src/components/nexus/AgentBranchModal.tsx:217`.
- Auth screen uses fixed slate/cyan visual language at `src/components/nexus/auth-screen.tsx:81`.
- Media artifact preview uses runtime artifact URL as `backgroundImage` at `src/components/nexus/nexus-ops.tsx:5911`; this is not a skin-pack asset path and must remain outside style pack control until asset governance exists.

## Protected Behavior And Layout

Skin Pack must not control these surfaces or fields:

- Root viewport, body scroll, shell height, shell overflow, and app route behavior at `src/components/nexus/nexus-ops.tsx:2020`.
- Workspace positioning, isolation, z-index, and overflow behavior at `src/components/nexus/nexus-ops.tsx:2125`.
- Right floating dock `fixed`, `pointer-events`, and z-index behavior at `src/components/nexus/nexus-ops.tsx:2442`.
- Modal fixed overlay, z-index, focus, mouse-down close, and animation behavior at `src/components/nexus/nexus-ops.tsx:2871`, `src/components/nexus/nexus-ops.tsx:6389`, `src/components/nexus/PromptVaultManager.tsx:126`, and `src/components/nexus/AgentBranchModal.tsx:107`.
- LEGO transient DOM mutation and workspace commit path at `src/components/nexus/nexus-ops.tsx:4183`; the commit callback is `onCommitThemeConfig`, and production persistence must remain gated.
- Agent window `Rnd` bounds, drag handle, resize enablement, x/y/width/height, z-index, focus, minimize, maximize, and close behavior at `src/components/nexus/nexus-ops.tsx:4938`.
- Sandbox split percentage, pointer events, iframe sandbox, lock overlay, and external URL handling at `src/components/nexus/nexus-ops.tsx:5130`.
- React Flow nodes/edges, pan/zoom, connect, delete keys, node drag stop, pane click, minimap pan/zoom, controls, handles, edge hit zones, and selector classes at `src/components/nexus/nexus-graph.tsx:850`.
- Datapad `Rnd`, drag handle, z-index, save/delete behavior at `src/components/nexus/DatapadWindow.tsx:87`.
- Auth form submit, Supabase auth state, provider credential handling, API verification, branch execution, prompt vault mutation, artifact copy/save, and workspace sync.

## Asset / Texture Pipeline Requirements

These targets require the asset/texture pipeline before they can be made skin-pack controlled:

- Shell background image currently comes from legacy CSS variables such as `--asset-background-image` at `src/app/globals.css:42`.
- Workspace background textures, scanlines, and washes at `src/app/globals.css:252` and `src/app/globals.css:261`.
- Panel/window/datapad frame textures and recipe `textureAssetId` slots.
- Media canvas placeholders and generated media preview frames at `src/components/nexus/nexus-ops.tsx:5817`.
- Runtime artifact images/videos at `src/components/nexus/nexus-ops.tsx:5904`; these are user/runtime artifacts, not style-pack assets.
- Graph background textures or custom minimap/node texture effects.
- Avatar/icon sprite theming beyond simple token color changes.

Protocol 96 is required before generated assets, decode/cache behavior, package dependency additions, or recoverable local asset refs enter implementation.

## Performance / Render Optimization Requirements

The following should go through Render Plan IR and performance budget diagnostics before production apply:

- Blur, glass, shadow, glow, and animation intensity across windows, panels, graph edges, minimap, and message bubbles.
- Graph effects: animated edges at `src/app/globals.css:474`, active node pulse at `src/app/globals.css:581`, selected edge glow at `src/app/globals.css:480`, and React Flow overlay controls.
- Asset byte/decode/cache cost for background images, textures, thumbnails, and generated media surfaces.
- CSS variable count and checksum memoization for production shell bridge.
- Staged apply/cancel/debounce scheduling for large skin changes.
- Preview/apply duration diagnostics for Style Lab and future production bridge.

## Mapping Table

| Production surface | Current file/source anchor | Current style mechanism | Target token/recipe | Risk | Proposed migration unit | Required tests/smoke |
| --- | --- | --- | --- | --- | --- | --- |
| Shell root | `src/components/nexus/nexus-ops.tsx:2020`, `src/app/globals.css:245` | `nexus-shell`, legacy CSS vars, hardcoded layout classes | `surface.shell`, `text.primary`, `shadow.glow`, asset background later | High | Token bridge only; no layout changes | App loads, no body scroll regression, no route or auth regression |
| Workspace canvas | `src/components/nexus/nexus-ops.tsx:2125`, `src/app/globals.css:252` | `nexus-workspace`, scanline/grid CSS vars, hardcoded border/shadow classes | `surface.workspace`, `border.subtle`, `workspace.grid`, `workspace.wash` | Medium | Add Style Lab workspace specimen first, then token bridge | Panels and graph modes load; pan/drag unaffected |
| Global panel primitive | `src/app/globals.css:280` | `.nexus-panel` CSS variables | `recipe.panel` | Low | Primitive component/token adoption | Style Lab specimen and right/left panel smoke |
| Top bar / workspace menu | `src/components/nexus/nexus-ops.tsx:2478` | hardcoded utility classes and dropdown overlay | `recipe.topbar`, `recipe.button`, `recipe.menuItem` | Medium | Add topbar/menu specimen before production | Menu open/close, rename, switch workspace |
| Sync/status badge | `src/components/nexus/nexus-ops.tsx:2808` | status tone utility classes | `recipe.badge`, `status.success/warning/danger` | Low | Add status variant specimen | Online/offline/sync issue/retry smoke |
| Right floating dock | `src/components/nexus/nexus-ops.tsx:2442` | fixed pointer-events shell, hardcoded active item classes | `recipe.dock` | High | Visual wrapper only; preserve fixed/pointer/z-index | Dock open/close, panel switching, command shortcut |
| Right settings sidebar | `src/components/nexus/nexus-ops.tsx:3237` | fixed sidebar, panel sections, hardcoded cyan/fuchsia/emerald states | `recipe.sidebar`, `recipe.panel`, `recipe.input`, `recipe.button` | High | Isolated production shell token bridge, then section-by-section adoption | Every panel opens; no provider secret leak; close behavior intact |
| Provider vault | `src/components/nexus/nexus-ops.tsx:2976` | credential inputs, status chips, API verify controls | `recipe.providerVault`, `recipe.input`, `recipe.badge` | Critical | Specimen only first; visual adapter later | Secrets redacted, lock/unlock/verify/delete behavior unchanged |
| LEGO theme controls | `src/components/nexus/nexus-ops.tsx:160`, `src/components/nexus/nexus-ops.tsx:4183` | DOM CSS var mutation and workspace commit path | Future governance, not skin recipe | Critical | Keep separate from V2 skin apply until persistence gate | Sliders preview/commit existing theme config only |
| Left dock / agent bay | `src/components/nexus/nexus-ops.tsx:4591` | `.nexus-panel` plus hardcoded template/operator cards | `recipe.sidebar`, `recipe.agentCard`, `recipe.button` | Medium | Add agent bay specimen, then primitive adoption | Spawn/select/restore/model settings smoke |
| Agent window | `src/components/nexus/nexus-ops.tsx:4797` | `Rnd`, inline visual style using agent accent and legacy vars | `recipe.window`, `recipe.agentWindow` | Critical | Chrome/body visual adapter only; no `Rnd` prop changes | Drag, resize, focus, minimize, maximize, close, send |
| Agent action toolbar | `src/components/nexus/nexus-ops.tsx:5488` | absolute popover, toolbar buttons, prompt/intel flyouts | `recipe.toolbar`, `recipe.popover`, `recipe.button` | High | Add toolbar/popover specimen before production | Hover/click toolbar, prompt vault, intel, delete, stop |
| Sandbox canvas | `src/components/nexus/nexus-ops.tsx:5130` | split pane state, iframe, pointer lock overlay, hardcoded visual shells | `recipe.sandbox` visual only | Critical | Specimen first; behavior remains protected | Split resize, iframe, lock/unlock, URL validation |
| Media canvas | `src/components/nexus/nexus-ops.tsx:5817` | panel shell, agent accent inline styles, artifact URL preview | `recipe.mediaCanvas`, asset pipeline later | High | Specimen plus asset policy; no skin URL injection | Empty/generating/artifact states; no unsafe URL control |
| Message bubble | `src/components/nexus/nexus-ops.tsx:5942`, `src/app/globals.css:564` | role-based utility classes and global terminal variant | `recipe.messageBubble` | Medium | Add user/assistant/tool/streaming specimens | Send, stream cursor, reasoning details, media attachment |
| Minimized rail | `src/components/nexus/nexus-ops.tsx:6004` | absolute rail, hardcoded button styles | `recipe.dock`, `recipe.agentCard` | Medium | Add minimized rail specimen | Minimize/restore multiple agents |
| Right intel panel | `src/components/nexus/nexus-ops.tsx:6042` | `.nexus-panel`, mini graph, cards, inputs | `recipe.panel`, `recipe.agentCard`, `recipe.graphMini` | High | Add right intel specimen | Select, edit, lock, run tool, memory edit |
| Command palette | `src/components/nexus/nexus-ops.tsx:6389` | modal overlay, `.nexus-panel`, keyboard focus, filter list | `recipe.commandPalette` | High | Visual adapter with keyboard/focus untouched | Open/close, type filter, run command, escape/mouse close |
| React Flow agent nodes | `src/components/nexus/nexus-graph.tsx:120` | hardcoded node classes plus agent accent inline vars | `recipe.graphNode` | Critical | Graph adapter specimen and pure adapter tests | Node select/open, handles, pan/zoom |
| React Flow runtime nodes | `src/components/nexus/nexus-graph.tsx:187` | hardcoded node/status/input/output classes | `recipe.graphNode`, `recipe.input`, `recipe.badge` | Critical | Runtime node specimen first | Edit nodes, copy output, status/error states |
| React Flow edges/minimap/controls | `src/components/nexus/nexus-graph.tsx:430`, `src/components/nexus/nexus-graph.tsx:850`, `src/app/globals.css:452` | React Flow props, SVG paths, global selectors, animations | `recipe.graphEdge`, `recipe.graphControls` | Critical | Adapter-only. Never expose selectors/classes to skin packs | Connect/delete edge, pan/zoom, minimap, controls |
| Datapad window | `src/components/nexus/DatapadWindow.tsx:87` | `Rnd`, emerald chrome, save/delete controls | `recipe.window`, `recipe.input`, `recipe.button` | High | Window visual adapter with drag/save protected | Drag, edit, save, delete, close |
| Prompt vault manager | `src/components/nexus/PromptVaultManager.tsx:126` | fixed overlay, list/detail/edit states | `recipe.modal`, `recipe.list`, `recipe.input`, `recipe.button` | High | Add prompt vault specimen first | Open, select, edit, copy, delete, close |
| Branch modal | `src/components/nexus/AgentBranchModal.tsx:107` | modal overlay, compression state cards, range/select/textarea | `recipe.modal`, `recipe.button`, `recipe.input`, `recipe.badge` | Critical | Add branch-state specimen before production | Cancel, retry, full/summary mode, busy state |
| Auth screen | `src/components/nexus/auth-screen.tsx:81` | shell panel, inputs, auth submit controls | `recipe.authSurface`, `recipe.panel`, `recipe.input`, `recipe.button` | High | Visual tokens only after auth smoke gates | Login/signup, error display, no Supabase behavior change |

## Production Integration Roadmap

### Phase A: Style Lab Coverage Completion

Allowed files:

- `src/lib/style-engine/**`
- `src/components/style-engine/nexus-style-lab.tsx`
- `docs/style-system/**`

Forbidden files:

- `src/components/nexus/**`
- `src/app/**`
- workspace store/sync/backend/Supabase/package/config/deploy/export files

Verification:

- Focused style-engine tests.
- Typecheck, lint, build.
- Browser smoke on `/style-lab`: Minimal and Pixel accepted, invalid rejected, gallery renders all new specimens, no console errors.

Rollback plan:

- Revert the Style Lab/helper commit. No production runtime state should be affected.

Stop conditions:

- Any specimen needs behavior props, selectors, raw CSS, DOM mutation, store access, backend calls, or layout geometry control.

### Phase B: Primitive Components Token Adoption

Allowed files:

- Pure style-engine compile/adapter helpers.
- Isolated primitive/specimen components.
- Targeted tests and docs.

Forbidden files:

- Production `src/components/nexus/**` adoption until primitive contract tests exist.
- Store/sync/backend/Supabase/deploy/config files.

Verification:

- Unit tests proving adapters emit display-safe style objects or scoped variables only.
- Browser smoke for `/style-lab`.
- Visual comparison for primitive panel/button/input/badge states.

Rollback plan:

- Revert primitive adapter commit. Keep existing production CSS untouched.

Stop conditions:

- Adapter needs className injection, selectors, event handlers, z-index, pointer-events, drag/resize/focus, or persistence.

### Phase C: Isolated Production Shell Token Bridge

Allowed files:

- A narrow runtime token bridge/provider after a separate implementation gate.
- Global CSS variable bridge if scoped and reversible.
- No direct Skin Pack object in React production state.

Forbidden files:

- Workspace `themeConfig` writes.
- Sync queues, snapshots, backend, Supabase, export/import.
- React Flow behavior props.

Verification:

- Token apply/revert smoke in production shell with preview session id only.
- No full skin object in state.
- No layout or interaction regression in shell, workspace, panels, and graph.

Rollback plan:

- Disable bridge behind a local feature flag or revert the bridge commit.

Stop conditions:

- Preview cannot be scoped/reverted, or token bridge requires workspace persistence.

### Phase D: Recipe Adoption For Windows / Modals / Sidebar / Dock

Allowed files:

- Targeted visual adapters for window, modal, sidebar, dock, toolbar, message bubble, graph specimens.
- Small production component adoption units only after Style Lab coverage and adapter tests.

Forbidden files:

- `Rnd` geometry props, z-index/focus stack, close/minimize/drag/resize behavior.
- Modal focus trap, keyboard/focus behavior, scroll lock, route/backend/store calls.
- React Flow pan/zoom/connect/delete/drag props.

Verification:

- Unit tests for each recipe adapter.
- Component smoke for affected surface.
- Browser smoke: drag/resize/focus, modal open/close, dock open/close, command palette keyboard, graph interactions.

Rollback plan:

- Revert per-surface adoption unit; keep adapter helpers if harmless and tested.

Stop conditions:

- Recipe needs behavior authority or exposes className/style/raw CSS/selector injection from the Skin Pack.

### Phase E: Asset / Texture Pack Integration

Allowed files:

- Protocol 96-approved asset contract, validators, local fixtures, normalization, budget diagnostics.
- Style Lab asset summary and later local-only asset preview.

Forbidden files:

- Remote URL fetching from Skin Pack.
- Data/blob/base64/local path acceptance without governance.
- Package/dependency changes without explicit Protocol 96 approval.
- Production asset apply before Render Plan IR and diagnostics.

Verification:

- Asset fixture validation.
- Byte/count/hash/cache budget tests.
- Browser smoke for Style Lab local preview only.
- No network fetch triggered by Skin Pack review.

Rollback plan:

- Disable asset preview and fall back to metadata-only review.

Stop conditions:

- Asset pipeline needs remote fetch, unsafe decode, unbounded bytes, or new native dependencies without approved gate.

### Phase F: Persistence / Export / Import Governance

Allowed files:

- Protocol 98/95 docs and pure governance helpers first.
- Later, approved backend/routes/database migrations only after separate protocol pass.

Forbidden files:

- Any preview path writing to workspace store, sync, backend, Supabase, snapshots, or exports.
- Production persistence before RLS, migration, import/export, and rollback plans exist.

Verification:

- Governance tests for accepted/rejected payloads.
- Backend/API tests only after Protocol 98.
- Supabase migration/advisor/type generation only after Protocol 95.
- Export/import roundtrip tests after explicit gate.

Rollback plan:

- Feature flag persistence off.
- Migration rollback/forward plan if database has changed.
- Preserve local preview path independently.

Stop conditions:

- Persistence path cannot prove redaction, ownership, version migration, and rollback.

## Go / No-Go For Production Integration

Current verdict: No-Go for direct production integration.

Reasons:

- Style Lab does not yet cover enough production-specific variants.
- Production UI still uses many hardcoded utility classes and inline styles.
- React Flow requires a dedicated graph adapter and behavior guard.
- Window/modal/sidebar/dock adoption must preserve protected behavior.
- Asset/texture needs Protocol 96.
- Persistence/export/import needs Protocol 98 and Protocol 95.
- Render Plan IR should exist before production shell bridge work.

Safe next work:

- Extend Style Lab gallery coverage for missing production-like specimens.
- Add pure Render Plan IR types/tests and checksum/diagnostic shape.
- Add recipe adapter tests for graphNode, graphEdge, messageBubble, topbar/menu, toolbar, authSurface, providerVault, promptVault, branchModal, sandbox, mediaCanvas.
- Keep production Nexus runtime closed until the above gates pass.
