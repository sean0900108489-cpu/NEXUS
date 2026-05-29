# NEXUS Style Manifest V1 Spec

Phase: V3 - Manifest Schema
Run: `docs/style-system/execution-runs/20260529-163524+1000`
Status: partially implemented pure manifest schema/types and local validation/compiler pipeline. Provider integration, workspace persistence, backend, Supabase/database, deploy, and production component consumption are not implemented.

## Implementation Evidence

- `src/lib/style-engine/manifest.ts` defines `NexusStyleManifestV1`, token groups, required tokens, recipe groups, validation report types, and manifest version constants.
- `src/lib/style-engine/presets.ts` provides built-in V1 manifests for legacy Cyberpunk and High Contrast Carbon.
- `src/lib/style-engine/validator.ts` validates candidate shape and safety before compilation, including command palette recipe group presence and unknown recipe semantic token references.
- `src/lib/style-engine/compiler.ts` accepts only validator-approved manifests, emits deterministic CSS variables, recipes, React Flow adapter output, window/modal recipe adapter output, and report metadata, and fails closed if emitted CSS variables exceed `constraints.maxCssVariableCount`.
- The manifest remains data-only. It is not consumed directly by components, workspace state, sync queues, backend routes, Supabase/database, deploy config, or `exports/**`.

## 0. Purpose

`NexusStyleManifestV1` is the first safe data shape for describing a NEXUS
style asset.

It is:

- data-only
- versioned
- deterministic
- validator-first
- compiler input, not component input

It is not:

- raw CSS
- JavaScript
- Tailwind class generation instructions
- workspace state
- sync state
- backend route config
- Supabase persistence data
- React component props

## 1. Lifecycle

```text
Human brief / imported draft / AI draft
-> normalized intent
-> NexusStyleManifestV1 candidate
-> schema validation
-> safety validation
-> safe manifest
-> pure compiler
-> compiled CSS variable map / recipes / adapter config
```

No component, provider, store, sync queue, or backend route may consume a
manifest candidate before validation.

## 2. Top-Level Shape

Current TypeScript shape:

```ts
type NexusStyleManifestV1 = {
  schemaVersion: 1;
  id: string;
  name: string;
  description?: string;
  author?: string;
  source?: {
    kind: "human-brief" | "ai-draft" | "imported-draft" | "legacy-preset";
    reference?: string;
  };
  mode: "dark" | "light" | "adaptive";
  intent: NexusStyleIntentV1;
  tokens: NexusStyleTokensV1;
  recipes: NexusStyleRecipesV1;
  adapters: NexusStyleAdaptersV1;
  constraints: NexusStyleConstraintsV1;
};
```

Required fields:

- `schemaVersion`
- `id`
- `name`
- `mode`
- `intent`
- `tokens`
- `recipes`
- `adapters`
- `constraints`

## 3. Identity Rules

| Field | Rule |
| --- | --- |
| `schemaVersion` | Must equal `1`. |
| `id` | Lowercase slug, 3-80 chars, letters/numbers/dashes only. |
| `name` | Human-readable, 1-80 chars. |
| `description` | Optional, 0-280 chars. |
| `author` | Optional display string only; no identity/auth semantics. |
| `source.reference` | Optional note only; must not be a script, CSS, env var, secret, data URL, VBScript URL, or other executable URL. |

## 4. Intent Shape

```ts
type NexusStyleIntentV1 = {
  mood: string[];
  material: string[];
  density: "compact" | "comfortable" | "spacious";
  motion: "minimal" | "standard" | "expressive";
  contrast: "standard" | "high";
};
```

Intent is descriptive metadata. It must not carry implementation instructions
such as class names, selectors, CSS declarations, scripts, database fields, or
route names.

## 5. Token Shape

Tokens follow `docs/style-system/style-contract-v1.md`.

```ts
type NexusStyleTokensV1 = {
  surface: Record<string, string>;
  text: Record<string, string>;
  accent: Record<string, string>;
  status: Record<string, string>;
  border: Record<string, string>;
  shadow: Record<string, string>;
  radius: Record<string, string>;
  blur: Record<string, string>;
  workspace: Record<string, string>;
  typography: Record<string, string>;
  density: Record<string, string | number>;
  motion: Record<string, string | number>;
};
```

Allowed token values:

- hex colors
- `rgb()` / `rgba()`
- `color-mix()` only when all referenced variables are approved contract tokens
- CSS lengths for radius/blur/border width
- duration/easing values for motion
- font family strings from approved font lists
- numbers for density/motion values

Forbidden token values:

- `url(...)`
- `@import`
- `vbscript:`
- `data:`
- `{` or `}`
- semicolon-delimited CSS declarations
- arbitrary selectors
- `var(--secret...)`
- environment variable names
- JavaScript snippets
- HTML
- Tailwind class strings
- workspace/sync/backend field names

## 6. Recipe Shape

```ts
type NexusStyleRecipesV1 = {
  panel: Record<string, string>;
  button: Record<string, Record<string, string>>;
  input: Record<string, Record<string, string>>;
  badge: Record<string, Record<string, string>>;
  window: Record<string, string>;
  modal: Record<string, string>;
  commandPalette: Record<string, string>;
  dock: Record<string, string>;
};
```

Recipes may contain:

- semantic token references
- future compiled CSS variable names
- visual states

Recipes must not contain:

- event handlers
- component names to import
- `aria-*`, `role`, `tabIndex`
- layout classes
- drag/resize/z-index/pointer-events behavior
- persistence instructions

## 7. Adapter Shape

```ts
type NexusStyleAdaptersV1 = {
  tailwindBridge?: {
    enabled: boolean;
    legacyVariableMode: "preserve";
  };
  nextThemes?: {
    dataTheme?: "cyberpunk" | "apple" | "tesla" | "terminal";
    colorScheme: "dark" | "light";
  };
  reactFlow?: NexusReactFlowStyleAdapterV1;
};
```

Adapter rules:

- `tailwindBridge` can preserve legacy variable mapping only.
- `nextThemes` can identify a legacy preset bridge only.
- `reactFlow` is visual-only and must follow `react-flow-style-boundary.md`.

Forbidden adapter fields:

- pan/zoom behavior
- drag behavior
- edge connection logic
- route handlers
- Supabase table names
- workspace ids
- arbitrary selectors
- raw CSS

## 8. Constraints Shape

```ts
type NexusStyleConstraintsV1 = {
  maxCssVariableCount: number;
  allowRawCss: false;
  allowJavaScript: false;
  allowDynamicTailwind: false;
  allowWorkspaceMutation: false;
  allowSyncMutation: false;
  allowBackendMutation: false;
  protectedBehaviorClasses: string[];
};
```

Required values for V1:

- `maxCssVariableCount` must be high enough for the compiler's namespaced variables plus legacy bridge variables, or compilation rejects the manifest with `style.variableCountExceeded`.
- `allowRawCss: false`
- `allowJavaScript: false`
- `allowDynamicTailwind: false`
- `allowWorkspaceMutation: false`
- `allowSyncMutation: false`
- `allowBackendMutation: false`

## 9. Valid Example: Legacy Cyberpunk Draft

This is intentionally partial and illustrative.

```json
{
  "schemaVersion": 1,
  "id": "legacy-cyberpunk",
  "name": "Legacy Cyberpunk",
  "source": { "kind": "legacy-preset" },
  "mode": "dark",
  "intent": {
    "mood": ["operational", "neon", "high-focus"],
    "material": ["glass", "dark-metal"],
    "density": "compact",
    "motion": "standard",
    "contrast": "standard"
  },
  "tokens": {
    "surface": {
      "app": "#030712",
      "panel": "rgb(8 16 22 / 0.78)"
    },
    "text": {
      "primary": "#f8fafc",
      "secondary": "#cbd5e1",
      "muted": "#64748b"
    },
    "accent": {
      "primary": "#67e8f9",
      "primaryStrong": "#22d3ee",
      "secondary": "#f0abfc"
    },
    "status": {
      "success": "#6ee7b7",
      "warning": "#fcd34d",
      "danger": "#fda4af"
    },
    "border": {
      "subtle": "rgb(226 232 240 / 0.12)",
      "glow": "rgb(34 211 238 / 0.42)"
    },
    "shadow": {
      "panel": "0 24px 80px rgb(0 0 0 / 0.38)"
    },
    "radius": {
      "base": "4px",
      "surface": "4px"
    },
    "blur": {
      "glass": "8px"
    },
    "workspace": {
      "gridPrimary": "rgb(34 211 238 / 0.12)",
      "gridSecondary": "rgb(244 114 182 / 0.11)"
    },
    "typography": {
      "interface": "Geist"
    },
    "density": {
      "control": "compact"
    },
    "motion": {
      "durationFast": "140ms"
    }
  },
  "recipes": {
    "panel": {
      "surface": "surface.panel",
      "text": "text.primary",
      "border": "border.subtle"
    },
    "button": {
      "default": {
        "surface": "surface.panelMuted",
        "text": "text.secondary",
        "border": "border.subtle"
      }
    },
    "input": {},
    "badge": {},
    "window": {},
    "modal": {},
    "commandPalette": {
      "overlay": "surface.overlay",
      "surface": "surface.panel",
      "input": "surface.input",
      "itemDefault": "surface.panelMuted",
      "itemHover": "surface.raised",
      "itemActive": "accent.primary",
      "icon": "accent.primary",
      "emptyState": "text.muted"
    },
    "dock": {}
  },
  "adapters": {
    "tailwindBridge": {
      "enabled": true,
      "legacyVariableMode": "preserve"
    },
    "nextThemes": {
      "dataTheme": "cyberpunk",
      "colorScheme": "dark"
    }
  },
  "constraints": {
    "maxCssVariableCount": 180,
    "allowRawCss": false,
    "allowJavaScript": false,
    "allowDynamicTailwind": false,
    "allowWorkspaceMutation": false,
    "allowSyncMutation": false,
    "allowBackendMutation": false,
    "protectedBehaviorClasses": ["nodrag", "nopan", "nowheel"]
  }
}
```

## 10. Invalid Examples

### Raw CSS Injection

```json
{
  "schemaVersion": 1,
  "id": "bad-css",
  "name": "Bad CSS",
  "tokens": {
    "surface": {
      "app": "body { display: none; }"
    }
  }
}
```

Reject because token values cannot contain raw CSS declarations or selectors.

### Workspace Mutation

```json
{
  "schemaVersion": 1,
  "id": "bad-workspace",
  "name": "Bad Workspace",
  "workspace": {
    "themeConfig": {
      "radius": "24px"
    }
  }
}
```

Reject because manifests cannot carry workspace state.

### Dynamic Tailwind

```json
{
  "schemaVersion": 1,
  "id": "bad-tailwind",
  "name": "Bad Tailwind",
  "recipes": {
    "button": {
      "default": {
        "className": "bg-${userColor}-500"
      }
    }
  }
}
```

Reject because manifests cannot generate runtime Tailwind class strings.

## 11. Acceptance Gate

This spec is acceptable when:

- It defines a data-only manifest shape.
- It blocks raw CSS, JS, workspace, sync, backend, and dynamic Tailwind instructions.
- It references the V2 style contract and React Flow adapter boundary.
- It provides valid and invalid examples.
- It authorizes only pure local schema/types, validation, compiler, preset, and exchange code.
- It does not authorize component consumption, workspace persistence, backend routes, Supabase/database, deploy, package, or `exports/**` changes.
