# NEXUS Style Pack Authoring Reference V1

Status: current implementation reference for V2 review-only import and token-only preview.

This document is the concrete companion to `style-pack-authoring-guide-v1.md`.
It describes what the current `/style-lab` implementation actually changes,
what it only reviews, and how users, designers, and external language models
should rewrite a valid Skin Pack V2 fixture without inventing fields.

## Current Token-Only Preview Capability Map

The current Style Lab V2 path has three separate stages:

1. Review import parses JSON and validates the Skin Pack V2 envelope plus its
   embedded V1 manifest payload.
2. Token preview reparses and revalidates the same JSON, then compiles a local
   preview patch from manifest tokens only.
3. Revert removes that local token preview patch by preview session id.

No V2 Skin Pack path applies assets, recipes, layout presets, workspace state,
backend state, Supabase state, or production app shell changes.

| Skin Pack V2 field | Current behavior | Visible effect in `/style-lab` |
| --- | --- | --- |
| `manifest.payload.tokens` | Validated as V1 manifest tokens, then converted to scoped CSS variables when the related group is listed in `tokens.manifestTokenGroups`. | Yes, when current Style Lab UI reads the emitted variable or a recipe/graph fallback reads it. |
| `tokens.source` | Must be `manifest`. | No direct visual effect; it enables the token-only compiler path. |
| `tokens.manifestTokenGroups` | Controls which V1 token groups are emitted into the token preview patch. | Yes. A group not listed here is not emitted, even if it exists in `manifest.payload.tokens`. |
| `tokens.derivedOnly` | Review metadata for the current binding model. | No direct visual effect. |
| `performanceBudget.maxCssVariableCount` | Blocks token preview if emitted token variables exceed the budget. | Yes as an eligibility gate; not a styling token. |
| `performanceBudget.maxStaticManifestBytes` | Static validation budget for normalized payload size. | Review/validation gate only. |
| `performanceBudget.maxRecipeGroups` | Static validation budget for recipe group count. | Review/validation gate only. |
| `performanceBudget.maxAdapterOutputs` | Static validation budget for adapter output count. | Review/validation gate only. |
| `recipes` | Validates that V2 points to manifest recipe groups and registry version. | Review-only. V2 token preview does not emit `--nexus-recipe-*` variables. |
| `manifest.payload.recipes` | Validated as V1 manifest recipes. | Review-only for V2. Some Style Lab specimen styles have recipe variables with token fallbacks, so token changes can still be visible through the fallback path. |
| `assets` | Validates Asset Pack binding references when present. | Review-only. No image, icon, texture, font, or asset URL is loaded or previewed. |
| `layoutPreset` | Validates allowed visual hints when present. | Review-only. It cannot move panes, alter drag behavior, change React Flow, or persist layout. |
| `metadata` | Validated and summarized in the review report. | No direct visual effect. |
| `compatibility` | Validated and summarized in the review report. | No direct visual effect. |
| `fallback` | Validated and summarized in the review report. | No direct visual effect unless future gates implement failure routing. |

## Token Preview Emission Rule

Current token preview emits one CSS variable per token in each listed manifest
token group:

```text
manifest.payload.tokens[group][tokenName] -> --nexus-{group}-{token-name}
```

Examples:

| Manifest token path | Emitted CSS variable |
| --- | --- |
| `tokens.surface.panel` | `--nexus-surface-panel` |
| `tokens.surface.panelMuted` | `--nexus-surface-panel-muted` |
| `tokens.accent.primaryStrong` | `--nexus-accent-primary-strong` |
| `tokens.text.inverse` | `--nexus-text-inverse` |
| `tokens.workspace.gridPrimary` | `--nexus-workspace-grid-primary` |
| `tokens.motion.durationFast` | `--nexus-motion-duration-fast` |

The compiler fails closed when:

- the JSON is empty or invalid,
- Skin Pack V2 validation rejects the candidate,
- zero CSS variables would be emitted,
- emitted variable count exceeds `performanceBudget.maxCssVariableCount`.

Rejected candidates return a redacted issue report. They do not return the
unsafe rejected payload.

## Required V1 Token Groups And Semantic Tokens

The embedded V1 manifest must include all required token groups. The current
validator also requires the semantic token names listed below.

| Group | Required semantic tokens today | Notes |
| --- | --- | --- |
| `surface` | `app`, `panel`, `workspace` | Additional current fixture keys include `input`, `overlay`, `panelMuted`, `raised`, `shell`. |
| `text` | `primary`, `secondary`, `muted` | Additional current fixture keys include `danger`, `inverse`, `success`, `warning`. |
| `accent` | `primary`, `primaryStrong` | Current fixture also includes `secondary`. |
| `status` | `success`, `warning`, `danger` | Current fixture also includes `info`. |
| `border` | `subtle` | Current fixture also includes `glow`. |
| `shadow` | `panel` | Current fixture also includes `glow`. |
| `radius` | `surface` | Current fixture also includes `base`. |
| `blur` | `glass` | Current fixture also includes `backdrop`. |
| `workspace` | none | Keep the group present even when only hints are used. |
| `typography` | none | Keep the group present. |
| `density` | none | Keep the group present. |
| `motion` | none | Keep the group present. |

`tokens.manifestTokenGroups` should list the same twelve groups for full
token-only preview coverage:

```json
[
  "surface",
  "text",
  "accent",
  "status",
  "border",
  "shadow",
  "radius",
  "blur",
  "workspace",
  "typography",
  "density",
  "motion"
]
```

## Token Fields That Currently Affect Visible Style Lab Preview

These fields have the clearest visible impact in the current `/style-lab`
surface because the component styles read their emitted variables directly, or
read recipe/graph variables that fall back to these tokens.

| Token path | Current visible target |
| --- | --- |
| `surface.panel` | Main review surface, modal/window/prompt/graph fallbacks. |
| `surface.panelMuted` | Primitive panel, command palette items, modal footer, window chrome fallbacks. |
| `surface.workspace` | Preview surface, workspace/body fallbacks, graph canvas fallback. |
| `surface.input` | Input specimen, prompt content, command palette input fallbacks. |
| `surface.overlay` | Modal and command palette overlay only through recipe fallback paths. |
| `surface.raised` | Command palette hover/default future fallback; limited visible effect today. |
| `accent.primary` | Sample border, progress bars, buttons, active command item, handles, graph fallbacks. |
| `accent.primaryStrong` | Button borders and active command item borders. |
| `text.primary` | Main surface text, modal/window/command/graph text fallbacks. |
| `text.secondary` | Command palette input and window chrome text fallbacks. |
| `text.inverse` | Button/action text. |
| `text.muted` | Token map and static labels mostly remain Tailwind classes, so visible effect is limited. |
| `status.warning` | Badge and warning callout color. |
| `status.success` | Datapad action, target handle fallback, success specimen accents. |
| `status.danger` | Required for contract; limited current direct Style Lab usage. |
| `border.subtle` | Main surface, panel, input, modal/window/command/graph fallback borders. |
| `border.glow` | Emitted and valid, but limited current direct Style Lab usage. |
| `shadow.panel` | Main surface, panel, modal/window/graph fallback shadows. |
| `shadow.glow` | Emitted and valid, but limited current direct Style Lab usage. |
| `radius.*` | Emitted and valid; current specimen structure mostly uses fixed class radii, so effect is limited. |
| `blur.*` | Emitted and valid; current V2 token-only path does not activate blur effects. |
| `workspace.*` | Emitted and valid; current graph/background specimens mostly use fixed styles or graph variables, so effect is limited. |
| `typography.*` | Emitted and valid; current Style Lab text mostly uses fixed class names and font stacks. |
| `density.*` | Emitted and valid; current V2 path does not run a density/layout scheduler. |
| `motion.*` | Emitted and valid; current V2 path does not run an animation scheduler. |

The small Token Map panel displays the active compiled V1 manifest variables:
`--nexus-surface-app`, `--nexus-surface-panel`, `--nexus-text-primary`,
`--nexus-text-secondary`, `--nexus-accent-primary`, and
`--nexus-status-warning`. V2 token preview can still change other visible
specimens even when a token is not listed in that compact panel.

## Fields Currently Review-Only

### Assets

`assets` can identify required, lazy, and optional asset ids, but current Style
Lab does not load or render them. Asset ids are summarized and omitted from the
token preview report. Asset local preview requires a later Asset Pack local
preview gate.

### Recipes Beyond Existing V1 Token References

The V2 `recipes` binding proves that the Skin Pack points at manifest recipe
groups and `recipe-registry-v1`. It does not emit `--nexus-recipe-*` variables
in token-only preview. Current specimens can still respond to token changes
where their recipe variable fallbacks reference token variables.

### Layout Preset

`layoutPreset` can carry reviewable hints such as density, surface treatment,
slot ordering, sidebar visibility, and toolrail visibility. It cannot move
runtime components, change drag/resize behavior, alter React Flow behavior,
write workspace state, or persist layout.

### Performance Diagnostics Beyond Static Summary

Current diagnostics are static validator and token preview summaries: variable
count, group count, budget state, and omitted review-only sections. Runtime
duration, critical bytes, asset decode cost, animation cost, React rerender
cost, and safe-for-production verdict require Render Plan IR and scheduler
instrumentation.

## Why Some UI Colors Do Not Change Yet

Some visible colors do not change after V2 token preview because the current
pipeline is deliberately narrow:

- Token-only preview emits scoped `--nexus-{group}-{token}` variables only.
- It does not emit recipe variables such as `--nexus-recipe-window-surface`.
- It does not emit graph adapter variables such as `--nexus-graph-node-agent-surface`.
- It does not load asset packs or turn asset ids into images, textures, or icons.
- It does not apply layout presets or alter density, ordering, or visibility.
- Some Style Lab labels and placeholders still use fixed Tailwind classes for
  readability and do not bind to V2 token variables.
- Existing V1 Preview/Revert and V2 Token Preview are separate local preview
  sessions; V2 does not replace the active V1 manifest state.

In short: if the current JSX reads an emitted token variable or a fallback to
one, it can change. If it reads a recipe variable, graph variable, fixed class,
asset, layout hint, or production state, it will not change in this gate.

## Full Valid Skin Pack V2 Skeleton

This skeleton mirrors the current `createValidMinimalSkinPackV2()` shape. It is
safe for external authors to use because it avoids `assets` and `layoutPreset`
and keeps all previewable changes inside the embedded V1 manifest tokens.

```json
{
  "kind": "nexus-skin-pack",
  "schemaVersion": 2,
  "id": "minimal-carbon-skin",
  "slug": "minimal-carbon-skin",
  "packVersion": "1.0.0",
  "metadata": {
    "displayName": "Minimal Carbon Skin",
    "lifecycle": "validated",
    "source": "built-in",
    "tags": ["minimal", "carbon"]
  },
  "manifest": {
    "manifestVersion": 1,
    "manifestId": "high-contrast-carbon",
    "payload": {
      "schemaVersion": 1,
      "id": "high-contrast-carbon",
      "name": "High Contrast Carbon",
      "description": "High-contrast V1 manifest for dense operational review surfaces.",
      "source": {
        "kind": "legacy-preset",
        "reference": "built-in high contrast carbon preset"
      },
      "mode": "dark",
      "intent": {
        "mood": ["focused", "legible", "low-glare"],
        "material": ["carbon", "matte-glass"],
        "density": "comfortable",
        "motion": "minimal",
        "contrast": "high"
      },
      "tokens": {
        "surface": {
          "app": "#050505",
          "input": "rgb(18 18 18 / 0.92)",
          "overlay": "rgb(0 0 0 / 0.82)",
          "panel": "rgb(16 16 16 / 0.94)",
          "panelMuted": "rgb(28 28 28 / 0.88)",
          "raised": "#18181b",
          "shell": "rgb(8 8 8 / 0.96)",
          "workspace": "#0a0a0a"
        },
        "text": {
          "danger": "#fecdd3",
          "inverse": "#050505",
          "muted": "#a1a1aa",
          "primary": "#ffffff",
          "secondary": "#e4e4e7",
          "success": "#bbf7d0",
          "warning": "#fef08a"
        },
        "accent": {
          "primary": "#38bdf8",
          "primaryStrong": "#0ea5e9",
          "secondary": "#facc15"
        },
        "status": {
          "danger": "#fb7185",
          "info": "#38bdf8",
          "success": "#22c55e",
          "warning": "#facc15"
        },
        "border": {
          "glow": "rgb(56 189 248 / 0.36)",
          "subtle": "rgb(255 255 255 / 0.24)"
        },
        "shadow": {
          "glow": "0 0 22px rgb(56 189 248 / 0.18)",
          "panel": "0 18px 52px rgb(0 0 0 / 0.46)"
        },
        "radius": {
          "base": "3px",
          "surface": "3px"
        },
        "blur": {
          "backdrop": "10px",
          "glass": "4px"
        },
        "workspace": {
          "gridPrimary": "rgb(56 189 248 / 0.16)",
          "gridSecondary": "rgb(250 204 21 / 0.12)",
          "wash": "rgb(255 255 255 / 0.04)"
        },
        "typography": {
          "interface": "Geist",
          "mono": "Geist Mono"
        },
        "density": {
          "control": "comfortable",
          "panel": "comfortable"
        },
        "motion": {
          "durationFast": "90ms",
          "durationNormal": "140ms"
        }
      },
      "recipes": {
        "panel": {
          "border": "border.subtle",
          "shadow": "shadow.panel",
          "surface": "surface.panel",
          "text": "text.primary"
        },
        "button": {
          "default": {
            "border": "border.subtle",
            "surface": "surface.panelMuted",
            "text": "text.secondary"
          },
          "focus": {
            "ring": "accent.primaryStrong"
          },
          "hover": {
            "border": "accent.primary",
            "surface": "surface.panel",
            "text": "text.primary"
          }
        },
        "input": {
          "default": {
            "border": "border.subtle",
            "placeholder": "text.muted",
            "surface": "surface.input",
            "text": "text.primary"
          },
          "focus": {
            "border": "accent.primaryStrong"
          }
        },
        "badge": {
          "default": {
            "border": "border.subtle",
            "surface": "surface.panelMuted",
            "text": "text.secondary"
          }
        },
        "window": {
          "border": "border.subtle",
          "shadow": "shadow.panel",
          "surface": "surface.panel",
          "text": "text.primary"
        },
        "modal": {
          "backdrop": "surface.overlay",
          "border": "border.subtle",
          "surface": "surface.panel",
          "text": "text.primary"
        },
        "commandPalette": {
          "emptyState": "text.muted",
          "icon": "accent.primary",
          "input": "surface.input",
          "itemActive": "accent.primary",
          "itemDefault": "surface.panelMuted",
          "itemHover": "surface.raised",
          "overlay": "surface.overlay",
          "surface": "surface.panel"
        },
        "dock": {
          "border": "border.subtle",
          "surface": "surface.shell"
        }
      },
      "adapters": {
        "nextThemes": {
          "colorScheme": "dark",
          "dataTheme": "terminal"
        },
        "tailwindBridge": {
          "enabled": true,
          "legacyVariableMode": "preserve"
        }
      },
      "constraints": {
        "allowBackendMutation": false,
        "allowDynamicTailwind": false,
        "allowJavaScript": false,
        "allowRawCss": false,
        "allowSyncMutation": false,
        "allowWorkspaceMutation": false,
        "maxCssVariableCount": 180,
        "protectedBehaviorClasses": []
      }
    }
  },
  "tokens": {
    "source": "manifest",
    "derivedOnly": true,
    "manifestTokenGroups": [
      "surface",
      "text",
      "accent",
      "status",
      "border",
      "shadow",
      "radius",
      "blur",
      "workspace",
      "typography",
      "density",
      "motion"
    ]
  },
  "recipes": {
    "source": "manifest",
    "registryVersion": "recipe-registry-v1",
    "groups": ["panel", "button", "input", "window", "modal"],
    "adapterCoverage": {
      "primitives": "partial",
      "windowModal": "complete"
    }
  },
  "performanceBudget": {
    "contract": "performance-budget-validator-v1",
    "maxAdapterOutputs": 24,
    "maxCssVariableCount": 220,
    "maxRecipeGroups": 12,
    "maxStaticManifestBytes": 70000
  },
  "compatibility": {
    "appStyleEngineVersion": "nexus-style-engine-v2",
    "compilerVersion": "nexus-style-compiler-v1",
    "manifestVersion": 1,
    "recipeRegistryVersion": "recipe-registry-v1",
    "result": "compatible",
    "validatorVersion": "nexus-style-validator-v1"
  },
  "fallback": {
    "fallbackLegacyPreset": "cyberpunk",
    "fallbackManifestId": "legacy-cyberpunk",
    "fallbackPackId": "legacy-cyberpunk-skin",
    "onAssetFailure": "omit-asset",
    "onBudgetFailure": "reject-pack",
    "onLayoutFailure": "use-default-layout"
  }
}
```

## Pixel/Minecraft Rewrite Example

This example starts from the valid fixture shape above and changes only allowed
identity, metadata, intent, token, recipe-reference, adapter, and fallback
values. It keeps every required group and semantic token. It does not add raw
CSS, scripts, URLs, remote images, behavior fields, assets, or layout authority.

```json
{
  "kind": "nexus-skin-pack",
  "schemaVersion": 2,
  "id": "pixel-mineshaft-skin",
  "slug": "pixel-mineshaft-skin",
  "packVersion": "1.0.0",
  "metadata": {
    "displayName": "Pixel Mineshaft Skin",
    "description": "Blocky grass, dirt, stone, and diamond palette for token-only Style Lab preview.",
    "lifecycle": "draft",
    "source": "human-authored",
    "tags": ["pixel", "minecraft", "blocky", "low-blur"]
  },
  "manifest": {
    "manifestVersion": 1,
    "manifestId": "pixel-mineshaft-manifest",
    "payload": {
      "schemaVersion": 1,
      "id": "pixel-mineshaft-manifest",
      "name": "Pixel Mineshaft",
      "description": "Token-only block style manifest based on the valid V2 fixture shape.",
      "source": {
        "kind": "human-brief",
        "reference": "rewritten from createValidMinimalSkinPackV2 fixture"
      },
      "mode": "dark",
      "intent": {
        "mood": ["blocky", "adventurous", "high-contrast"],
        "material": ["pixel-stone", "grass", "dirt", "diamond"],
        "density": "compact",
        "motion": "minimal",
        "contrast": "high"
      },
      "tokens": {
        "surface": {
          "app": "#10140a",
          "input": "#2a2416",
          "overlay": "rgb(16 20 10 / 0.88)",
          "panel": "#26331a",
          "panelMuted": "#3f321f",
          "raised": "#4c5b2d",
          "shell": "#161b10",
          "workspace": "#1f2717"
        },
        "text": {
          "danger": "#ff9b8f",
          "inverse": "#07100c",
          "muted": "#b8c48f",
          "primary": "#f3ffd1",
          "secondary": "#d8e7a7",
          "success": "#a8ff8a",
          "warning": "#ffe066"
        },
        "accent": {
          "primary": "#45f0d7",
          "primaryStrong": "#18b8d8",
          "secondary": "#7bbf2a"
        },
        "status": {
          "danger": "#ff6b5f",
          "info": "#45f0d7",
          "success": "#63d247",
          "warning": "#ffd34e"
        },
        "border": {
          "glow": "rgb(69 240 215 / 0.28)",
          "subtle": "rgb(216 231 167 / 0.32)"
        },
        "shadow": {
          "glow": "0 0 0 rgb(0 0 0 / 0)",
          "panel": "0 8px 0 rgb(0 0 0 / 0.42)"
        },
        "radius": {
          "base": "0px",
          "surface": "0px"
        },
        "blur": {
          "backdrop": "0px",
          "glass": "0px"
        },
        "workspace": {
          "gridPrimary": "rgb(99 210 71 / 0.22)",
          "gridSecondary": "rgb(69 240 215 / 0.18)",
          "wash": "rgb(123 191 42 / 0.12)"
        },
        "typography": {
          "interface": "Geist Mono",
          "mono": "Geist Mono"
        },
        "density": {
          "control": "compact",
          "panel": "compact"
        },
        "motion": {
          "durationFast": "80ms",
          "durationNormal": "120ms"
        }
      },
      "recipes": {
        "panel": {
          "border": "border.subtle",
          "shadow": "shadow.panel",
          "surface": "surface.panel",
          "text": "text.primary"
        },
        "button": {
          "default": {
            "border": "border.subtle",
            "surface": "surface.panelMuted",
            "text": "text.secondary"
          },
          "focus": {
            "ring": "accent.primaryStrong"
          },
          "hover": {
            "border": "accent.primary",
            "surface": "surface.raised",
            "text": "text.primary"
          }
        },
        "input": {
          "default": {
            "border": "border.subtle",
            "placeholder": "text.muted",
            "surface": "surface.input",
            "text": "text.primary"
          },
          "focus": {
            "border": "accent.primaryStrong"
          }
        },
        "badge": {
          "default": {
            "border": "border.subtle",
            "surface": "surface.panelMuted",
            "text": "text.secondary"
          }
        },
        "window": {
          "border": "border.subtle",
          "shadow": "shadow.panel",
          "surface": "surface.panel",
          "text": "text.primary"
        },
        "modal": {
          "backdrop": "surface.overlay",
          "border": "border.subtle",
          "surface": "surface.panel",
          "text": "text.primary"
        },
        "commandPalette": {
          "emptyState": "text.muted",
          "icon": "accent.primary",
          "input": "surface.input",
          "itemActive": "accent.primary",
          "itemDefault": "surface.panelMuted",
          "itemHover": "surface.raised",
          "overlay": "surface.overlay",
          "surface": "surface.panel"
        },
        "dock": {
          "border": "border.subtle",
          "surface": "surface.shell"
        }
      },
      "adapters": {
        "nextThemes": {
          "colorScheme": "dark",
          "dataTheme": "terminal"
        },
        "tailwindBridge": {
          "enabled": true,
          "legacyVariableMode": "preserve"
        }
      },
      "constraints": {
        "allowBackendMutation": false,
        "allowDynamicTailwind": false,
        "allowJavaScript": false,
        "allowRawCss": false,
        "allowSyncMutation": false,
        "allowWorkspaceMutation": false,
        "maxCssVariableCount": 180,
        "protectedBehaviorClasses": []
      }
    }
  },
  "tokens": {
    "source": "manifest",
    "derivedOnly": true,
    "manifestTokenGroups": [
      "surface",
      "text",
      "accent",
      "status",
      "border",
      "shadow",
      "radius",
      "blur",
      "workspace",
      "typography",
      "density",
      "motion"
    ]
  },
  "recipes": {
    "source": "manifest",
    "registryVersion": "recipe-registry-v1",
    "groups": ["panel", "button", "input", "window", "modal"],
    "adapterCoverage": {
      "primitives": "partial",
      "windowModal": "complete"
    }
  },
  "performanceBudget": {
    "contract": "performance-budget-validator-v1",
    "maxAdapterOutputs": 24,
    "maxCssVariableCount": 220,
    "maxRecipeGroups": 12,
    "maxStaticManifestBytes": 70000
  },
  "compatibility": {
    "appStyleEngineVersion": "nexus-style-engine-v2",
    "compilerVersion": "nexus-style-compiler-v1",
    "manifestVersion": 1,
    "recipeRegistryVersion": "recipe-registry-v1",
    "result": "compatible",
    "validatorVersion": "nexus-style-validator-v1"
  },
  "fallback": {
    "fallbackLegacyPreset": "cyberpunk",
    "fallbackManifestId": "legacy-cyberpunk",
    "fallbackPackId": "legacy-cyberpunk-skin",
    "onAssetFailure": "omit-asset",
    "onBudgetFailure": "reject-pack",
    "onLayoutFailure": "use-default-layout"
  }
}
```

## External LLM Prompt

Use this prompt when asking another model to generate or revise a Skin Pack:

```text
You are generating a NEXUS Skin Pack V2 JSON candidate for Style Lab review.
Use this skeleton, only replace allowed values. Keep the same object shape,
required top-level fields, required V1 token groups, required semantic tokens,
recipe groups, adapters, constraints, compatibility fields, and fallback fields.

Allowed replacements:
- id, slug, packVersion, metadata display text, metadata tags, metadata source,
  metadata lifecycle
- manifest.manifestId
- manifest.payload id, name, description, source reference, mode, intent values
- values inside manifest.payload.tokens
- V1 recipe token references, but only references like "surface.panel" or
  "accent.primary"; do not invent behavior slots
- adapters.nextThemes.dataTheme only as cyberpunk, apple, tesla, or terminal
- performanceBudget numbers only when lowering or keeping safe budgets

Forbidden output:
- raw CSS blocks or style tags
- script tags, JavaScript, event handlers, functions, or executable content
- url(...), remote image URLs, private URLs, or large base64 assets
- Supabase, backend, workspace, sync, persistence, user, auth, or API fields
- z-index, pointer-events, drag, resize, routing, React Flow behavior, or layout
  behavior fields
- unknown top-level fields

Return JSON only. Do not include Markdown fences.
```

## Rejected Issue Repair Guide

### `stylePack.invalidManifestPayload`

The embedded `manifest.payload` failed V1 validation. Repair the V1 manifest
first: keep `schemaVersion`, `id`, `name`, `mode`, `intent`, `tokens`,
`recipes`, `adapters`, and `constraints`; include all token groups; include all
recipe groups; keep all mutation and executable constraints set to `false`.

### Missing Token Group

Every group in the required group list must exist under
`manifest.payload.tokens`. If a group has no required semantic tokens, keep it
as an object with safe current fixture-style keys rather than removing it.
Also keep that group in `tokens.manifestTokenGroups` if it should be emitted.

### Missing Semantic Token

Use the required semantic token table in this document. Common misses are:

- `surface.app`, `surface.panel`, `surface.workspace`
- `text.primary`, `text.secondary`, `text.muted`
- `accent.primary`, `accent.primaryStrong`
- `status.success`, `status.warning`, `status.danger`
- `border.subtle`
- `shadow.panel`
- `radius.surface`
- `blur.glass`

### Invalid Adapters

Current safe adapter shape is intentionally small:

```json
{
  "nextThemes": {
    "colorScheme": "dark",
    "dataTheme": "terminal"
  },
  "tailwindBridge": {
    "enabled": true,
    "legacyVariableMode": "preserve"
  }
}
```

`nextThemes.dataTheme` must be one of `cyberpunk`, `apple`, `tesla`, or
`terminal`. `colorScheme` must be `dark` or `light`. Do not add runtime
behavior adapters, React Flow behavior fields, event handlers, selectors, or
raw class generation.

### Unknown Top-Level Fields

Remove any top-level field outside the current Skin Pack V2 contract. The
allowed top-level fields are:

```text
kind, schemaVersion, id, slug, packVersion, metadata, manifest, tokens,
recipes, performanceBudget, compatibility, fallback, assets, layoutPreset
```

For current token-only authoring, prefer omitting `assets` and `layoutPreset`
unless the goal is specifically to review those future fields without preview.

## Next Gates Required To Make More UI Surfaces Change

The next implementation gate should not be asset preview. It should be pure
Render Plan IR types and tests.

| Gate | Unlocks | Current status |
| --- | --- | --- |
| Render Plan IR | A source-aligned `SkinPack -> CompiledSkin -> RenderPlan` boundary, deterministic diagnostics, render cost accounting. | Required next. |
| Recipe specimen preview | Emits reviewed visual recipe slots into isolated specimens without touching production behavior. | Blocked until registry and Render Plan IR are ready. |
| Asset local preview | Loads packaged/local safe assets by id with byte, hash, mime, and fallback enforcement. | Blocked until Protocol 96 asset handling gate. |
| Layout preset preview | Applies visual-only density/slot/surface hints in an isolated lab surface. | Blocked until Protocol 98 layout compatibility gate. |
| Production apply/persistence | Applies governed style packs to the production app and durable state. | Blocked until Protocol 95 compatibility/persistence gate plus production apply design. |

Current authors should target review import plus token-only preview. Broader UI
change requires those gates, not more fields in the JSON.
