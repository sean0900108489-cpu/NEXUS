# NEXUS Production Token Bridge Contract V1

Status: bridge readiness contract
Scope: Render Plan token variables to production-compatible legacy variables
Runtime authority: Style Lab isolated preview only

## 1. Purpose

The V2 Render Plan IR can already compile an accepted Skin Pack into
display-safe token variables, specimen styles, recipe coverage, fallbacks, and
static budget diagnostics. This contract defines the next safe bridge layer:
how a Render Plan may be translated into a production-compatible token bridge
plan without applying it to the real NEXUS shell.

The bridge is a readiness foundation, not production integration. It exists so
future work can adopt a small set of legacy CSS variables with clear rollback
rules.

## 2. Inputs And Outputs

Input:

- accepted `NexusSkinPackRenderPlanV1`
- `renderMode: "style-lab-preview"`
- `eligibility.canApplyProduction: false`
- display-safe `tokenVariables`

Rejected input:

- raw Skin Pack JSON
- rejected validation reports
- rejected Render Plan results
- mutable workspace state
- production component props

Output:

- bridge plan id and source Render Plan id
- source scoped variable map for bridged `--nexus-*` variables
- production-compatible legacy variable map
- legacy preserve map
- unsupported variable list
- fallback summary
- static budget summary reference

The bridge plan must not output selectors, raw CSS blocks, component classes,
behavior props, DOM operations, persistence commands, or backend calls.

## 3. Bridgeable Token Variables

These V2 token variables may bridge to legacy production CSS variables because
they already represent visual-only color, radius, blur, shadow, or workspace
surface values.

| V2 source variable | Legacy/surface target variable | Risk | Notes |
| --- | --- | --- | --- |
| `--nexus-surface-app` | `--bg-base` | Low | Root background color only. |
| `--nexus-surface-raised` | `--bg-elevated` | Low | Elevated neutral surface. |
| `--nexus-surface-workspace` | `--bg-workspace`, `--nexus-workspace-bg` | Low | Workspace base color, not layout. |
| `--nexus-surface-panel` | `--panel-bg` | Low | Panel fill. |
| `--nexus-surface-panel-muted` | `--panel-muted` | Low | Muted panel fill. |
| `--nexus-border-subtle` | `--border-subtle` | Low | Border color only. |
| `--nexus-border-glow` | `--border-glow` | Low | Glow border color only. |
| `--nexus-text-primary` | `--text-main` | Low | Main foreground color. |
| `--nexus-text-secondary` | `--text-soft` | Low | Secondary foreground color. |
| `--nexus-text-muted` | `--text-muted` | Low | Muted foreground color. |
| `--nexus-accent-primary` | `--theme-primary` | Low | Primary accent color. |
| `--nexus-accent-primary-strong` | `--theme-primary-strong` | Low | Strong accent color. |
| `--nexus-accent-secondary` | `--theme-secondary` | Low | Secondary accent color. |
| `--nexus-status-success` | `--theme-success` | Low | Status color only. |
| `--nexus-status-warning` | `--theme-warning` | Low | Status color only. |
| `--nexus-status-danger` | `--theme-danger` | Low | Status color only. |
| `--nexus-shadow-panel` | `--shadow-panel` | Medium | Visual cost can be high; must stay inside budget diagnostics. |
| `--nexus-shadow-glow` | `--shadow-glow` | Medium | Glow cost can be high; must preserve rollback. |
| `--nexus-radius-base` | `--radius-base` | Low | Radius only. |
| `--nexus-radius-surface` | `--surface-radius` | Low | Surface radius only. |
| `--nexus-blur-backdrop` | `--backdrop-blur` | Medium | Blur can be expensive; diagnostics must show budget status. |
| `--nexus-blur-glass` | `--glass-blur` | Medium | Blur can be expensive; isolated preview only in V2. |
| `--nexus-workspace-grid-primary` | `--workspace-grid-primary`, `--nexus-workspace-grid-primary` | Low | Grid color only. |
| `--nexus-workspace-grid-secondary` | `--workspace-grid-secondary`, `--nexus-workspace-grid-secondary` | Low | Grid color only. |
| `--nexus-workspace-wash` | `--workspace-wash`, `--nexus-workspace-wash` | Medium | Color-only source is converted into a controlled solid gradient layer; no URL allowed. |

## 4. Legacy Variables To Preserve

Bridge apply must capture previous values for every target variable it sets.
The following legacy variables are also treated as preserve-sensitive because
they are owned by the existing production theme or LEGO/theme controls.

| Legacy variable | Preserve reason |
| --- | --- |
| `--bg-base` | Existing theme root background. |
| `--bg-elevated` | Existing elevated surface token. |
| `--bg-workspace` | Existing workspace surface token. |
| `--panel-bg` | Existing panel primitive token. |
| `--panel-muted` | Existing muted panel primitive token. |
| `--border-subtle` | Existing border primitive token. |
| `--border-glow` | Existing glow border token. |
| `--text-main` | Existing foreground token. |
| `--text-soft` | Existing secondary foreground token. |
| `--text-muted` | Existing muted foreground token. |
| `--theme-primary` | Existing primary accent token. |
| `--theme-primary-strong` | Existing strong accent token. |
| `--theme-secondary` | Existing secondary accent token. |
| `--theme-success` | Existing status token. |
| `--theme-warning` | Existing status token. |
| `--theme-danger` | Existing status token. |
| `--shadow-panel` | Existing expensive visual effect token. |
| `--shadow-glow` | Existing expensive visual effect token. |
| `--radius-base` | Existing LEGO/theme radius token. |
| `--surface-radius` | Existing derived radius token. |
| `--backdrop-blur` | Existing LEGO/theme blur token. |
| `--glass-blur` | Existing derived blur token. |
| `--workspace-grid-primary` | Existing workspace grid token. |
| `--workspace-grid-secondary` | Existing workspace grid token. |
| `--workspace-wash` | Existing workspace wash token. |
| `--border-width` | Existing LEGO/theme border width token; bridge must not set it in V2. |
| `--agent-glow-intensity` | Existing LEGO/theme effect token; bridge must not set it in V2. |
| `--icon-weight` | Existing LEGO/theme icon token; bridge must not set it in V2. |
| `--font-main` | Existing typography token; bridge must not set it in V2. |
| `--chat-panel-opacity` | Existing workspace/agent opacity token; bridge must not set it in V2. |
| `--shell-surface` | Existing shell background composition; bridge must not set it in V2. |
| `--asset-background-image` | Existing asset URL slot; bridge must not set it in V2. |
| `--scanline-opacity` | Existing theme effect token; bridge must not set it in V2. |

## 5. Style-Lab-Only Variables

These V2 variables may remain visible in Style Lab token preview and specimen
gallery, but must not be bridged into production-compatible legacy variables in
V2:

- `--nexus-surface-shell`
- `--nexus-surface-overlay`
- `--nexus-surface-input`
- `--nexus-border-strong`
- `--nexus-text-inverse`
- `--nexus-density-*`
- `--nexus-motion-*`
- `--nexus-typography-*`
- future recipe specimen variables
- future asset, texture, image, or generated background variables
- future layout preset variables
- React Flow behavior, pointer, drag, resize, z-index, route, store, or sync
  variables

Unsupported variables must be reported by name and reason. The report must not
include unsafe rejected payload values.

## 6. Apply And Revert Contract

V2 bridge preview may apply only to an injected target supplied by Style Lab.
The bridge helper must not directly import or access `document`, `window`,
workspace stores, sync, backend clients, Supabase clients, Vercel APIs, or
GitHub APIs.

Apply rules:

1. accept only an accepted bridge plan
2. capture previous target values for variables being set
3. set only bridge plan legacy variables
4. return a small preview session containing bridge plan id, applied variables,
   and previous variables
5. leave Skin Pack payload and Render Plan payload out of runtime state

Revert rules:

1. accept only the injected target and preview session
2. restore captured previous values
3. remove variables that did not previously exist
4. be safe to call more than once
5. never reconstruct or reparse Skin Pack JSON

Production apply remains blocked. A future production bridge can reuse this
contract only after a separate production surface adoption gate.

## 7. Fallback And Rollback

Fallback rules:

- if Render Plan is rejected, no bridge plan is produced
- if a supported source variable is missing, omit its legacy target and report
  fallback
- if a source value contains unsafe CSS, URL, script, data/blob/file reference,
  selector-like block, or declaration syntax, reject the bridge plan
- if a variable has no approved legacy target, report it as unsupported
- if performance budget summary is blocked, bridge plan is rejected

Rollback rules:

- Style Lab preview rollback is variable-session revert
- phase rollback is local commit revert
- production rollback remains out of scope because no production shell behavior
  is changed in V2

## 8. V2 Boundary

V2 can implement:

- pure bridge plan builder from accepted Render Plan
- injected-target apply/revert helper
- Style Lab readiness panel
- tests proving fail-closed behavior and no forbidden coupling

V2 must not implement:

- production shell token adoption
- persistence or export/import governance
- asset or texture application
- recipe adoption in real components
- layout preset adoption
- backend, Supabase, Vercel, or GitHub mutation

The next production-facing implementation after this readiness work should be a
small primitive surface adoption, starting with the existing `.nexus-panel`
contract, not a broad shell restyle.
