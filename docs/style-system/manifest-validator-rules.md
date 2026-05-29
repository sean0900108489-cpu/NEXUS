# NEXUS Manifest Validator Rules

Phase: V3 - Safety Validator
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Status: partially implemented pure validator. Runtime persistence, workspace sync, backend, Supabase/database, deploy, and production UI integration are not implemented.

## Implementation Evidence

- `src/lib/style-engine/validator.ts` implements pure V1 validation for top-level shape, identity, source metadata, intent, required constraints, required token groups/tokens, unsafe string patterns, data URL rejection, VBScript URL rejection, CSS variable namespace guarding, dynamic Tailwind arbitrary value class guarding, recipe behavior-key scanning, focus-capable recipe warnings, recommended recipe slot warnings, React Flow behavior-key scanning, primary and secondary text contrast, and deterministic display-safe reports.
- `src/lib/style-engine/validator.test.ts` covers safe manifest acceptance, identity metadata rejection, source metadata shape rejection without payload echo, unsafe string redaction, data URL and VBScript URL rejection without payload echo, generic HTML tag rejection, unapproved CSS variable reference rejection, approved NEXUS and legacy bridge CSS variable references, dynamic Tailwind arbitrary value class rejection, legacy CSS expression rejection, recipe behavior rejection, focus recipe warnings, recommended recipe slot warnings, unknown recipe semantic token reference rejection, React Flow behavior rejection, benign unknown top-level rejection, workspace/backend top-level pollution rejection, external platform top-level pollution rejection, and required `recipes.commandPalette` group rejection.
- The validator is used before compilation by `src/lib/style-engine/compiler.ts`; invalid manifests fail closed without partial compiled output.
- The current implementation is local-only and pure. It does not mutate workspace state, sync queues, backend routes, Supabase/database, DOM, external services, deploy config, or `exports/**`.

Known remaining gaps:

- Token value parsing now includes targeted unsafe string and CSS variable namespace guards, but is still not a full structured CSS/value parser.
- Accessibility validation currently covers parseable primary text contrast, parseable secondary text contrast against panel surfaces, and high-contrast intent warnings.

## 0. Validator Purpose

The validator is the gate between an untrusted style candidate and the pure
compiler.

It must reject or quarantine unsafe manifests before they can:

- preview
- apply
- save
- persist
- compile into CSS variables
- reach components
- reach React Flow adapter config

## 1. Validation Stages

```text
candidate
-> shape validation
-> identity validation
-> value validation
-> semantic token validation
-> recipe validation
-> adapter validation
-> protected behavior validation
-> data-flow pollution validation
-> accessibility minimum validation
-> safe manifest or reject report
```

No stage may mutate workspace, sync, backend, DOM, or external services.

## 2. Severity Model

| Severity | Meaning | Result |
| --- | --- | --- |
| `error` | Unsafe or structurally invalid | Reject; do not compile or preview. |
| `warning` | Safe but degraded or incomplete | Allow preview only if required fields are present. |
| `info` | Non-blocking note | Include in report. |

## 3. Required Shape Rules

Reject if:

- `schemaVersion` is not `1`.
- `id`, `name`, `mode`, `intent`, `tokens`, `recipes`, `adapters`, or `constraints` is missing.
- Unknown top-level keys include workspace, sync, backend, route, Supabase, Vercel, GitHub, auth, env, secret, deployment, migration, or database concepts.
- Required constraints are not explicitly false:
  - `allowRawCss`
  - `allowJavaScript`
  - `allowDynamicTailwind`
  - `allowWorkspaceMutation`
  - `allowSyncMutation`
  - `allowBackendMutation`

## 4. Forbidden String Rules

Reject any string value containing:

- `<script`
- generic HTML tags such as `<img`
- `javascript:`
- `vbscript:`
- `data:`
- `eval(`
- `Function(`
- `import(`
- `@import`
- `expression(`
- `{` or `}` when used as CSS block syntax
- `;` followed by another CSS-looking declaration
- `url(`
- CSS custom property references outside approved `--nexus-*` and legacy bridge variables
- `.env`
- `process.env`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `workspace.themeConfig`
- `queueThemeConfigCloudSync`
- `serializeActiveUiStateSnapshot`
- `workspace_state_entities`
- `z-[`
- Tailwind arbitrary value classes such as `bg-[#0f172a]`
- `pointer-events`
- `nodrag`
- `nopan`
- `nowheel`

Note:

Some future values may legitimately need CSS functions such as `rgb()` or
`color-mix()`. These must be allowlisted by value parser, not by broad string
trust.

## 5. Token Value Rules

Allow only:

- hex colors
- `rgb()` / `rgba()`
- approved `color-mix()` expressions
- CSS length units for radius/blur/border
- `ms` durations
- cubic-bezier or named easing values from an allowlist
- approved font family names
- finite numbers for density/motion values
- semantic token references such as `surface.panel`

Reject:

- raw selectors
- CSS declarations
- CSS custom property names not in the contract or compiler output namespace
- arbitrary URLs
- HTML
- JS-like strings
- Tailwind classes
- behavior classes
- workspace/sync/backend strings

## 6. Semantic Coverage Rules

Minimum required token groups:

- `surface`
- `text`
- `accent`
- `status`
- `border`
- `shadow`
- `radius`
- `blur`
- `workspace`
- `typography`
- `density`
- `motion`

Minimum required semantic tokens:

- `surface.app`
- `surface.panel`
- `surface.workspace`
- `text.primary`
- `text.secondary`
- `text.muted`
- `accent.primary`
- `accent.primaryStrong`
- `status.success`
- `status.warning`
- `status.danger`
- `border.subtle`
- `shadow.panel`
- `radius.surface`
- `blur.glass`

Warning if focus-capable `button` or `input` recipes omit a visual `focus`
state.

Warning if recommended visual recipe slots are missing from `panel`,
`button.default`, `input.default`, `badge.default`, `window`, `modal`,
`commandPalette`, or `dock`.

Error if recipe semantic token references point to unknown tokens.

Current required recipe groups include `panel`, `button`, `input`, `badge`,
`window`, `modal`, `commandPalette`, and `dock`.

## 7. Recipe Rules

Reject recipes that include:

- `className`
- `style`
- `onClick`
- `onChange`
- `onKeyDown`
- `role`
- `aria-*`
- `tabIndex`
- `data-*`
- `zIndex`
- `pointerEvents`
- `position`
- `overflow`
- drag/resize settings
- persistence settings

Allow recipes to reference:

- semantic token paths
- visual state names
- approved recipe variables

## 8. React Flow Adapter Rules

The React Flow adapter may include only visual groups documented in
`react-flow-style-boundary.md`.

Reject adapter fields that mention:

- pan
- zoom
- drag
- select
- connect
- handle ids
- edge ids
- node ids
- hit width
- key bindings
- `interactionWidth`
- `onNodeDragStop`
- `onConnect`
- `onPaneClick`
- `deleteKeyCode`

Warning if adapter omits optional minimap or controls visual values.

## 9. Data-Flow Pollution Rules

Reject if the manifest includes:

- `workspace`
- `NexusWorkspace`
- `ActiveUiStateSnapshot`
- `WorkspaceCloudSnapshotPayload`
- `themeConfig`
- `sync`
- `localStorage`
- `IndexedDB`
- `state-sync`
- `Supabase`
- `workspace_snapshots`
- `workspace_state_entities`
- `migration`
- `RLS`
- API route paths

Reason:

V1-V12 Style Engine assets are not durable workspace data.

## 10. Accessibility Rules

Current implementation status:

- Primary text contrast is validated against the project-defined threshold.
- Secondary text contrast against panel surfaces is validated when both colors are parseable.
- Missing high-contrast intent produces a warning, not a hard rejection.

Future implementation requirements:

- Focus state must be present for buttons and inputs.
- Disabled state must be distinguishable from default state.
- Destructive state must not rely on color alone where labels/icons exist.
- Motion must allow a minimal mode.
- High contrast mode must not remove graph affordances.

Warning if a manifest omits high-contrast intent.

Warning if a focus-capable recipe omits focus styles.

## 11. Validator Report Shape

Current pure report shape:

```ts
type NexusStyleValidationReportV1 = {
  manifestId?: string;
  accepted: boolean;
  errors: Array<{
    code: string;
    path: string;
    message: string;
  }>;
  warnings: Array<{
    code: string;
    path: string;
    message: string;
  }>;
  info: Array<{
    code: string;
    path: string;
    message: string;
  }>;
};
```

Reports must be safe to display in the UI and logs. They must not echo secrets
or large imported source documents.

## 12. Acceptance Gate

Validator rules are acceptable when:

- Unsafe candidates fail before compiler or preview.
- Raw CSS and JavaScript are blocked.
- Dynamic Tailwind class generation is blocked.
- Workspace/sync/backend pollution is blocked.
- React Flow behavior fields are blocked.
- Accessibility minimums are listed.
- The report shape is deterministic and display-safe.
