# NEXUS Style Surface Audit

Phase: V1 - Style Surface Audit
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Branch: `codex/v17-large-iteration`
Base: `c4ab6cbc97ebdc0e11a08581d6732bc509029a8c`
Status: documentation-only audit. No runtime code, schema, package, deploy, or database changes.

## 0. Scope

This document inventories the current style surfaces that a future Style Engine
must respect before any component migration begins.

Allowed in this unit:

- Markdown documentation under `docs/style-system/`.
- Read-only source scans.

Forbidden in this unit:

- Editing `src/**`, `supabase/**`, package files, Next config, deploy config, or `exports/**`.
- Adding preview, manifest, compiler, provider, persistence, or sync code.
- Storing generated manifests, raw CSS, imported style docs, or preview drafts in `workspace.themeConfig`.

## 1. Local Next.js Guidance Read

Per `AGENTS.md`, this run read local Next.js 16 docs before implementation-related conclusions:

- `node_modules/next/dist/docs/01-app/02-guides/local-development.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`
- `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`

Relevant constraints:

- Global CSS is imported through the App Router root layout.
- Interactive style controls require Client Components.
- `next dev` and `next build` use Turbopack by default in Next.js 16.
- Client boundaries should stay as narrow as practical.

## 2. Current Style Entry Points

| Surface | Current anchors | Current responsibility | Risk | V2 contract input |
| --- | --- | --- | --- | --- |
| Root CSS import | `src/app/layout.tsx:3`, `src/app/layout.tsx:4`, `src/app/layout.tsx:5` | Imports `ThemeProvider`, React Flow stylesheet, and `globals.css`. | Medium | Provider placement must not widen client boundary unnecessarily. |
| Viewport lock | `src/app/layout.tsx:30`, `src/app/layout.tsx:33` | Geist variables on `<html>`, body `overflow-hidden`. | High | Protected layout behavior; not a style token. |
| Preset provider | `src/components/theme-provider.tsx:6` | `next-themes` `data-theme` provider. | Medium | Preset registry should become one source of truth later. |
| CSS variables | `src/app/globals.css:5`, `src/app/globals.css:45`, `src/app/globals.css:85`, `src/app/globals.css:125` | Four `data-theme` presets and legacy token layer. | High | Legacy bridge and semantic token map. |
| Tailwind v4 bridge | `src/app/globals.css:170`, `tailwind.config.ts:1` | Maps common color utilities to CSS variables. | Medium | Keep Tailwind structural; do not generate runtime classes. |
| Global slot classes | `src/app/globals.css:280`, `src/app/globals.css:288`, `src/app/globals.css:391`, `src/app/globals.css:407` | `nexus-panel`, `nexus-glass`, agent/datapad window surfaces. | High | First primitive/recipe candidates. |
| React Flow globals | `src/app/globals.css:452`, `src/app/globals.css:466`, `src/app/globals.css:470`, `src/app/globals.css:585` | Graph pane, handles, edges, controls, minimap. | Critical | Adapter-only boundary. |
| App shell hub | `src/components/nexus/nexus-ops.tsx:2020`, `src/components/nexus/nexus-ops.tsx:2127` | Shell and workspace layout with many visual utilities. | Critical | Map first; no broad rewrite. |
| Right theme panel | `src/components/nexus/nexus-ops.tsx:3420`, `src/components/nexus/nexus-ops.tsx:3485`, `src/components/nexus/nexus-ops.tsx:3505` | Preset buttons plus LEGO controls. | Critical | Split preset, preview, apply, save, persist. |
| Graph component | `src/components/nexus/nexus-graph.tsx:125`, `src/components/nexus/nexus-graph.tsx:197`, `src/components/nexus/nexus-graph.tsx:851` | Node/edge visual classes and React Flow behavior. | Critical | React Flow adapter spec. |
| Modal/window surfaces | `src/components/nexus/DatapadWindow.tsx:97`, `src/components/nexus/PromptVaultManager.tsx:126`, `src/components/nexus/AgentBranchModal.tsx:108` | Overlay, z-index, drag, scroll, save/delete behavior. | High | Window/modal recipe only after behavior gate. |
| Auth surface | `src/components/nexus/auth-screen.tsx:81` | Supabase login/signup UI. | High | Visual-only migration must not change auth behavior. |

## 3. Current Theme Data Flow

There are two separate theme flows today.

Preset flow:

```text
themeOptions in nexus-ops
-> handleThemeChange()
-> next-themes setTheme()
-> html[data-theme]
-> globals.css preset variables
```

Anchors:

- `src/components/theme-provider.tsx:9`
- `src/components/nexus/nexus-ops.tsx:211`
- `src/components/nexus/nexus-ops.tsx:1134`

LEGO micro-control flow:

```text
LegoThemeEngineControls
-> updateTransientThemeConfig()
-> document.documentElement.style.setProperty(...)
-> commitThemeConfig()
-> useNexusStore.updateThemeConfig()
-> workspace.themeConfig
-> queueThemeConfigCloudSync()
-> serializeActiveUiStateSnapshot()
-> workspace_snapshots payload
-> workspace_state_entities entity_type=theme
```

Anchors:

- `src/components/nexus/nexus-ops.tsx:160`
- `src/components/nexus/nexus-ops.tsx:170`
- `src/components/nexus/nexus-ops.tsx:291`
- `src/components/nexus/nexus-ops.tsx:4183`
- `src/components/nexus/nexus-ops.tsx:4210`
- `src/components/nexus/nexus-ops.tsx:4214`
- `src/store/nexus-store.ts:843`
- `src/store/nexus-store.ts:3086`
- `src/lib/backend/workspace/workspace-snapshot-serializer.ts:17`
- `src/lib/backend/workspace/workspace-snapshot-serializer.ts:35`
- `src/lib/backend/workspace/workspace-state-entity-repository.ts:134`

Audit decision:

`workspace.themeConfig` is durable active UI state, not a safe preview scratchpad.

## 4. Current Theme Config Drift

`WorkspaceThemeConfig` includes:

```text
radius, blur, borderWidth, glowIntensity, iconWeight, fontFamily, chatOpacity
```

Anchor: `src/lib/nexus-types.ts:477`.

`sanitizeThemeConfig()` currently preserves:

```text
radius, blur, borderWidth, iconWeight, fontFamily, chatOpacity
```

Anchor: `src/lib/workspace-kernel.ts:196`.

Finding:

- `glowIntensity` is in the type, UI defaults, DOM variable map, and controls.
- `glowIntensity` is not preserved by the current sanitizer.
- Any future claim that applied theme micro-controls persist completely must fix or explicitly gate this drift.

## 5. Surface Taxonomy

### Pure Visual Candidates

These are candidates for semantic tokens or recipe variables after V2:

- `--bg-base`, `--bg-elevated`, `--bg-workspace`
- `--panel-bg`, `--panel-muted`
- `--border-subtle`, `--border-glow`
- `--text-main`, `--text-soft`, `--text-muted`
- `--theme-primary`, `--theme-primary-strong`, `--theme-secondary`
- `--theme-success`, `--theme-warning`, `--theme-danger`
- `--shadow-panel`, `--shadow-glow`
- `--workspace-grid-primary`, `--workspace-grid-secondary`, `--workspace-wash`

### Visual But Layout-Sensitive

These need recipe-level migration, not global replacement:

- Padding, gap, height, width, min/max dimensions.
- `text-xs`, `text-[9px]`, line height, truncation, `line-clamp`.
- `backdrop-blur-*` where blur changes readability or stacking perception.
- Radius where hit area or window chrome geometry is involved.

### Protected Layout/Behavior

Do not auto-migrate:

- `fixed`, `absolute`, `relative`, `inset-*`, `top-*`, `right-*`, `bottom-*`, `left-*`.
- `z-*`, `z-[...]`, `overflow-*`.
- `pointer-events-*`, `cursor-*`, `select-none`, `resize-none`.
- `role`, `aria-*`, `data-*`, `tabIndex`.
- `nodrag`, `nopan`, `nowheel`, React Flow selectors, react-rnd handles.

### Persistence-Linked

Do not treat as a visual-only target:

- `workspace.themeConfig`
- `updateThemeConfig`
- `queueThemeConfigCloudSync`
- `serializeActiveUiStateSnapshot`
- `workspace_state_entities` projection rows

## 6. Priority Migration Order

Recommended low-risk order after this audit:

1. V2 written style contract and semantic token registry.
2. V3 manifest safety spec and validator rules.
3. V4 pure compiler contract.
4. V6 legacy bridge mapping.
5. V7 primitive specimens in isolated preview surfaces.

Do not start with:

- `nexus-ops.tsx` broad class replacement.
- React Flow global selector cleanup.
- Window/modal z-index or drag styling.
- Store/sync/backend persistence.

## 7. Acceptance Gate

V1 audit passes when:

- Current style surfaces are listed.
- Theme preset flow is separated from durable `workspace.themeConfig` flow.
- High-risk components are marked read-only for early phases.
- Hardcoded token inventory and React Flow boundary docs exist.
- No runtime code, DB, deploy, package, or `exports/**` files are changed.
