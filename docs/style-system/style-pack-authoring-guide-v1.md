# NEXUS Style Pack Authoring Guide V1

Status: authoring guide only
Scope: user, designer, and LLM guidance for producing reviewable Skin Pack V2 JSON
Authorized files for this phase: `docs/style-system/**` only

## 0. Purpose

This guide explains how a person, designer, or LLM should turn a written style
brief, UI screenshot, brand direction, game-like visual language, or product
identity into a NEXUS Style Pack that can be validated, reviewed, and
token-previewed in Style Lab.

The current authoring target is:

```text
text / image description / design language
-> NexusStyleManifestV1 payload
-> NexusSkinPackV2 envelope
-> Style Lab review-only import
-> token-only preview
-> future RenderPlan / asset / recipe / layout gates
```

This guide does not authorize runtime code, asset preview, recipe preview,
layout preview, production apply, persistence, backend work, Supabase work, or
deployment changes.

## 1. Style Insertion Model

### V1 Manifest

The V1 manifest is the actual style payload accepted by the current validator
and compiler. It owns:

- semantic token values
- visual recipe references
- adapter declarations
- safety constraints

It must be data-only. It must not include raw CSS declarations, selectors,
scripts, URLs, component props, routes, backend fields, workspace fields, or
React Flow behavior.

### V2 Skin Pack

The V2 Skin Pack is the package envelope around one V1 manifest payload. It
adds:

- pack identity
- metadata
- token group index
- recipe registry reference
- optional asset pack ID references
- optional layout preset reference
- static performance budget
- compatibility and fallback metadata

It does not replace the V1 manifest. The embedded V1 manifest remains the
source of truth for token values.

### Review-Only Import

Style Lab can parse a V2 Skin Pack JSON document and show:

- accepted or rejected status
- redacted issue report
- metadata summary
- asset summary
- recipe summary
- layout preset summary
- performance budget summary

Rejected payloads must not be echoed back raw.

### Token-Only Preview

If the pack passes validation, Style Lab can compile the allowed manifest token
subset into scoped CSS variables and preview those variables locally.

Current token preview can use only:

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

Current token preview cannot apply:

- assets
- recipe expansion beyond existing V1 behavior
- layout presets
- production app shell changes
- save/apply/persist

### Future Path

Future implementation may add:

- Render Plan IR
- Asset Pack local preview
- Recipe specimen preview
- Layout preset preview
- production apply and persistence

Those are separate gates. Asset generation, recovery, external URLs, or
durability need Protocol 96. Backend routes and auth-gated style pack access
need Protocol 98. Supabase schema, storage, RLS, and generated types need
Protocol 95.

## 2. Minimal Valid Skin Pack V2 JSON

Use this as the smallest practical copyable shape. It omits optional `assets`
and `layoutPreset`, so it is reviewable and token-preview compatible without
future gates.

```json
{
  "kind": "nexus-skin-pack",
  "schemaVersion": 2,
  "id": "minimal-carbon-skin",
  "slug": "minimal-carbon-skin",
  "packVersion": "1.0.0",
  "metadata": {
    "displayName": "Minimal Carbon Skin",
    "description": "Dense high-contrast operational surfaces with restrained blue accents.",
    "source": "human-authored",
    "tags": ["minimal", "carbon", "high-contrast"],
    "lifecycle": "validated"
  },
  "manifest": {
    "manifestVersion": 1,
    "manifestId": "minimal-carbon",
    "payload": {
      "schemaVersion": 1,
      "id": "minimal-carbon",
      "name": "Minimal Carbon",
      "description": "A compact, high-contrast V1 manifest for Style Lab token preview.",
      "source": {
        "kind": "human-brief",
        "reference": "style-pack-authoring-guide-v1"
      },
      "mode": "dark",
      "intent": {
        "mood": ["focused", "legible", "low-glare"],
        "material": ["carbon", "matte"],
        "density": "comfortable",
        "motion": "minimal",
        "contrast": "high"
      },
      "tokens": {
        "surface": {
          "app": "#050505",
          "shell": "rgb(8 8 8 / 0.96)",
          "workspace": "#0a0a0a",
          "panel": "rgb(16 16 16 / 0.94)",
          "panelMuted": "rgb(28 28 28 / 0.88)",
          "raised": "#18181b",
          "input": "rgb(18 18 18 / 0.92)",
          "overlay": "rgb(0 0 0 / 0.82)"
        },
        "text": {
          "primary": "#ffffff",
          "secondary": "#e4e4e7",
          "muted": "#a1a1aa",
          "inverse": "#050505",
          "danger": "#fecdd3",
          "success": "#bbf7d0",
          "warning": "#fef08a"
        },
        "accent": {
          "primary": "#d8d8d8",
          "primaryStrong": "#c8c8c8",
          "secondary": "#eeeeee"
        },
        "status": {
          "success": "#22c55e",
          "warning": "#eeeeee",
          "danger": "#c7c7c7",
          "info": "#d8d8d8"
        },
        "border": {
          "subtle": "rgb(255 255 255 / 0.24)",
          "glow": "rgb(216 216 216 / 0.36)"
        },
        "shadow": {
          "panel": "0 18px 52px rgb(0 0 0 / 0.46)",
          "glow": "0 0 22px rgb(216 216 216 / 0.18)"
        },
        "radius": {
          "base": "3px",
          "surface": "3px"
        },
        "blur": {
          "glass": "4px",
          "backdrop": "10px"
        },
        "workspace": {
          "gridPrimary": "rgb(216 216 216 / 0.16)",
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
          "surface": "surface.panel",
          "text": "text.primary",
          "border": "border.subtle",
          "shadow": "shadow.panel"
        },
        "button": {
          "default": {
            "surface": "surface.panelMuted",
            "text": "text.secondary",
            "border": "border.subtle"
          },
          "hover": {
            "surface": "surface.panel",
            "text": "text.primary",
            "border": "accent.primary"
          },
          "focus": {
            "ring": "accent.primaryStrong"
          }
        },
        "input": {
          "default": {
            "surface": "surface.input",
            "text": "text.primary",
            "placeholder": "text.muted",
            "border": "border.subtle"
          },
          "focus": {
            "border": "accent.primaryStrong"
          }
        },
        "badge": {
          "default": {
            "surface": "surface.panelMuted",
            "text": "text.secondary",
            "border": "border.subtle"
          }
        },
        "window": {
          "surface": "surface.panel",
          "text": "text.primary",
          "border": "border.subtle",
          "shadow": "shadow.panel"
        },
        "modal": {
          "surface": "surface.panel",
          "text": "text.primary",
          "border": "border.subtle",
          "backdrop": "surface.overlay"
        },
        "commandPalette": {
          "surface": "surface.panel",
          "overlay": "surface.overlay",
          "input": "surface.input",
          "itemDefault": "surface.panelMuted",
          "itemHover": "surface.raised",
          "itemActive": "accent.primary",
          "emptyState": "text.muted",
          "icon": "accent.primary"
        },
        "dock": {
          "surface": "surface.shell",
          "border": "border.subtle"
        }
      },
      "adapters": {
        "tailwindBridge": {
          "enabled": true,
          "legacyVariableMode": "preserve"
        },
        "nextThemes": {
          "dataTheme": "terminal",
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
    "maxCssVariableCount": 220,
    "maxStaticManifestBytes": 70000,
    "maxRecipeGroups": 12,
    "maxAdapterOutputs": 24
  },
  "compatibility": {
    "appStyleEngineVersion": "nexus-style-engine-v2",
    "manifestVersion": 1,
    "validatorVersion": "nexus-style-validator-v1",
    "compilerVersion": "nexus-style-compiler-v1",
    "recipeRegistryVersion": "recipe-registry-v1",
    "result": "compatible"
  },
  "fallback": {
    "fallbackPackId": "baseline-surface-shell-skin",
    "fallbackManifestId": "baseline-surface-shell",
    "fallbackLegacyPreset": "surface-shell",
    "onAssetFailure": "omit-asset",
    "onLayoutFailure": "use-default-layout",
    "onBudgetFailure": "reject-pack"
  }
}
```

## 3. Minecraft-Inspired Pixel Style Example

This is a Minecraft-inspired pixel/block style. It is not an official Minecraft
asset pack. It uses only semantic tokens and V1 manifest recipes, so it is
token-preview compatible today.

Authoring goals:

- grass, dirt, stone, and diamond palette
- pixel/blocky surface language
- low blur
- high contrast
- no raw CSS declarations
- no remote URLs
- no JavaScript
- no asset preview dependency

```json
{
  "kind": "nexus-skin-pack",
  "schemaVersion": 2,
  "id": "pixel-mineshaft-skin",
  "slug": "pixel-mineshaft-skin",
  "packVersion": "1.0.0",
  "metadata": {
    "displayName": "Pixel Mineshaft Skin",
    "description": "Blocky grass, dirt, stone, and diamond visual language for NEXUS token preview.",
    "source": "human-authored",
    "tags": ["pixel", "blocky", "game-inspired", "high-contrast"],
    "lifecycle": "validated"
  },
  "manifest": {
    "manifestVersion": 1,
    "manifestId": "pixel-mineshaft",
    "payload": {
      "schemaVersion": 1,
      "id": "pixel-mineshaft",
      "name": "Pixel Mineshaft",
      "description": "Minecraft-inspired pixel/block visual language expressed as safe NEXUS tokens.",
      "source": {
        "kind": "human-brief",
        "reference": "pixel block game style brief"
      },
      "mode": "dark",
      "intent": {
        "mood": ["playful", "adventure", "craft"],
        "material": ["pixel", "stone", "dirt", "grass", "diamond"],
        "density": "compact",
        "motion": "minimal",
        "contrast": "high"
      },
      "tokens": {
        "surface": {
          "app": "#10160c",
          "shell": "rgb(18 26 14 / 0.96)",
          "workspace": "#0b0f08",
          "panel": "rgb(45 32 20 / 0.94)",
          "panelMuted": "rgb(82 59 36 / 0.88)",
          "raised": "#3f3f3f",
          "input": "rgb(28 28 28 / 0.92)",
          "overlay": "rgb(7 10 6 / 0.84)"
        },
        "text": {
          "primary": "#f6ffd7",
          "secondary": "#d8e8b0",
          "muted": "#a6b58a",
          "inverse": "#10160c",
          "danger": "#ffb4a6",
          "success": "#9be564",
          "warning": "#ffd36a"
        },
        "accent": {
          "primary": "#5eead4",
          "primaryStrong": "#d4d4d4",
          "secondary": "#84cc16"
        },
        "status": {
          "success": "#65a30d",
          "warning": "#eab308",
          "danger": "#dc2626",
          "info": "#d4d4d4"
        },
        "border": {
          "subtle": "rgb(246 255 215 / 0.28)",
          "glow": "rgb(94 234 212 / 0.34)"
        },
        "shadow": {
          "panel": "0 10px 0 rgb(0 0 0 / 0.42)",
          "glow": "0 0 12px rgb(94 234 212 / 0.16)"
        },
        "radius": {
          "base": "2px",
          "surface": "2px"
        },
        "blur": {
          "glass": "0px",
          "backdrop": "0px"
        },
        "workspace": {
          "gridPrimary": "rgb(132 204 22 / 0.18)",
          "gridSecondary": "rgb(94 234 212 / 0.14)",
          "wash": "rgb(132 204 22 / 0.08)"
        },
        "typography": {
          "interface": "Geist",
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
          "surface": "surface.panel",
          "text": "text.primary",
          "border": "border.subtle",
          "shadow": "shadow.panel"
        },
        "button": {
          "default": {
            "surface": "surface.panelMuted",
            "text": "text.primary",
            "border": "border.subtle"
          },
          "hover": {
            "surface": "surface.raised",
            "text": "text.primary",
            "border": "accent.primary"
          },
          "focus": {
            "ring": "accent.primaryStrong"
          }
        },
        "input": {
          "default": {
            "surface": "surface.input",
            "text": "text.primary",
            "placeholder": "text.muted",
            "border": "border.subtle"
          },
          "focus": {
            "border": "accent.primaryStrong"
          }
        },
        "badge": {
          "default": {
            "surface": "surface.panelMuted",
            "text": "text.secondary",
            "border": "accent.secondary"
          }
        },
        "window": {
          "surface": "surface.panel",
          "text": "text.primary",
          "border": "border.subtle",
          "shadow": "shadow.panel"
        },
        "modal": {
          "surface": "surface.panel",
          "text": "text.primary",
          "border": "border.subtle",
          "backdrop": "surface.overlay"
        },
        "commandPalette": {
          "surface": "surface.panel",
          "overlay": "surface.overlay",
          "input": "surface.input",
          "itemDefault": "surface.panelMuted",
          "itemHover": "surface.raised",
          "itemActive": "accent.primary",
          "emptyState": "text.muted",
          "icon": "accent.primary"
        },
        "dock": {
          "surface": "surface.shell",
          "border": "border.subtle"
        }
      },
      "adapters": {
        "tailwindBridge": {
          "enabled": true,
          "legacyVariableMode": "preserve"
        },
        "nextThemes": {
          "dataTheme": "terminal",
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
      "windowModal": "partial"
    }
  },
  "performanceBudget": {
    "contract": "performance-budget-validator-v1",
    "maxCssVariableCount": 220,
    "maxStaticManifestBytes": 70000,
    "maxRecipeGroups": 12,
    "maxAdapterOutputs": 24
  },
  "compatibility": {
    "appStyleEngineVersion": "nexus-style-engine-v2",
    "manifestVersion": 1,
    "validatorVersion": "nexus-style-validator-v1",
    "compilerVersion": "nexus-style-compiler-v1",
    "recipeRegistryVersion": "recipe-registry-v1",
    "result": "compatible"
  },
  "fallback": {
    "fallbackPackId": "minimal-carbon-skin",
    "fallbackManifestId": "baseline-surface-shell",
    "fallbackLegacyPreset": "surface-shell",
    "onAssetFailure": "omit-asset",
    "onLayoutFailure": "use-default-layout",
    "onBudgetFailure": "reject-pack"
  }
}
```

Notes:

- Pixel texture ideas belong in future Asset Pack metadata, not in this JSON as
  image URLs or base64.
- Blocky window chrome belongs in future recipe/layout specimens, not in
  behavior fields.
- The zero blur and low shadow cost make this pack a good token-preview
  candidate.

## 4. Image-To-Style Workflow

When starting from one or more UI images, extract design language first. Do not
try to embed the image in the Skin Pack.

### Step 1: Extract Palette

Identify:

- background color
- panel color
- raised/input color
- primary text
- secondary text
- muted text
- primary accent
- strong accent
- warning, success, danger, info colors

Map to:

- `tokens.surface`
- `tokens.text`
- `tokens.accent`
- `tokens.status`
- `tokens.workspace`

Good output:

```text
surface.app: near-black green
surface.panel: dirt brown
accent.primary: diamond neutral
accent.secondary: grass green
status.warning: torch gold
```

Bad output:

```text
background-image: url(...)
copy the screenshot into base64
use CSS selector .minecraft-panel
```

### Step 2: Extract Material Language

Name the surface feel:

- matte
- glass
- carbon
- paper
- pixel
- stone
- clay
- chrome
- neon

Map to:

- `intent.material`
- `tokens.surface`
- `tokens.border`
- `tokens.shadow`
- future Asset Pack notes outside the Skin Pack JSON

Currently token-previewable:

- color
- radius
- blur amount
- shadow strength
- border tone

Future-only:

- real texture images
- frame assets
- background images
- SVG/icon assets

### Step 3: Extract Border And Shape Language

Identify:

- square, slightly rounded, or pill shape
- thin or heavy border
- glowing or flat border
- hard pixel edge or soft glass edge

Map to:

- `tokens.radius.base`
- `tokens.radius.surface`
- `tokens.border.subtle`
- `tokens.border.glow`
- `recipes.panel.border`
- `recipes.button.focus.ring`

Do not map to:

- `zIndex`
- `position`
- `pointerEvents`
- drag handles
- resize handles

### Step 4: Extract Typography Mood

Describe type as:

- utilitarian
- terminal
- editorial
- game HUD
- mono
- geometric
- soft
- compact

Map to:

- `intent.mood`
- `tokens.typography.interface`
- `tokens.typography.mono`
- `tokens.density`

Do not add remote fonts. Future packaged font references require the Asset Pack
contract and possibly Protocol 96.

### Step 5: Map To Tokens, Recipes, Assets, Layout

| Image observation | Current target | Current status |
| --- | --- | --- |
| dominant palette | V1 manifest tokens | token-previewable |
| text contrast | V1 text/surface tokens | token-previewable |
| border style | V1 border/radius/shadow tokens | token-previewable |
| button state colors | V1 recipe token references | reviewable through V1 compiler |
| icon set | Asset Pack IDs | future review-only until asset preview gate |
| texture/background | Asset Pack IDs | future only |
| panel ordering | layout preset hints | future review-only |
| dense/spacious rhythm | intent and density tokens | token-previewable |
| graph node/edge styling | recipe registry and React Flow adapter | future adapter gate |

## 5. LLM Prompt Templates

Use these prompts when asking an LLM to produce or repair a Style Pack. Always
tell the LLM to return JSON only for pack-generation tasks.

### Text Brief To Skin Pack

```text
You are authoring a NEXUS Skin Pack V2 JSON document.

Input style brief:
<paste brief>

Output requirements:
- Return one JSON object only.
- Use kind "nexus-skin-pack" and schemaVersion 2.
- Embed exactly one NexusStyleManifestV1 payload under manifest.payload.
- Keep tokens.source as "manifest".
- Use only approved V1 token groups: surface, text, accent, status, border, shadow, radius, blur, workspace, typography, density, motion.
- Make the pack token-preview compatible in Style Lab.
- Do not include assets unless they are ID references only.
- Do not include raw CSS declarations, selectors, scripts, URLs, base64, workspace fields, backend fields, Supabase fields, z-index, pointer-events, drag, resize, or React Flow behavior.
- Keep maxCssVariableCount at 220 or below unless the brief explicitly requires a stricter value.
- Prefer high text contrast and low performance cost.
```

### UI Image Description To Skin Pack

```text
You are converting a UI screenshot description into a NEXUS Skin Pack V2.

Image description:
<describe visible palette, materials, shapes, typography, density, shadows, blur, and mood>

Task:
- Extract palette into V1 semantic tokens.
- Extract material language into intent.material and surface/border/shadow/blur tokens.
- Extract shape language into radius and border tokens.
- Extract typography mood into typography and density tokens.
- Write future asset/recipe/layout ideas only as explanation outside the JSON, not inside the JSON.
- Return a Skin Pack V2 JSON object that can pass review and token-only preview.
- No raw CSS declarations, no url(...), no remote image URLs, no base64, no JavaScript, no backend/store/Supabase fields.
```

### Multiple Images To Design Language

```text
You are synthesizing a design language from multiple reference images.

Reference summaries:
1. <image one summary>
2. <image two summary>
3. <image three summary>

First produce a compact design language:
- palette
- surface material
- border/shape language
- typography mood
- density and motion
- future asset notes
- future layout notes

Then produce one NEXUS Skin Pack V2 JSON object.
Only include data that is valid for V2 review and token-only preview.
Keep assets, recipes, and layout beyond current token preview as future notes outside the JSON.
```

### Repair A Rejected Skin Pack

```text
You are repairing a rejected NEXUS Skin Pack V2.

Rejected JSON:
<paste JSON>

Issue report:
<paste redacted Style Lab issue codes and paths>

Repair rules:
- Preserve the intended visual language.
- Fix only the fields needed to satisfy the issue report.
- Remove unsafe or unsupported fields rather than moving them elsewhere.
- If the report mentions unsupported version, use schemaVersion 2 for Skin Pack and manifestVersion 1 for the embedded manifest.
- If the report mentions unsafe asset, remove raw URLs/base64 and use asset ID references only.
- If the report mentions behavior recipe or protected layout, remove behavior fields entirely.
- If the report mentions over budget, reduce token/recipe/adapter counts or raise only to an approved static budget ceiling.
- Return one corrected JSON object only.
```

### Lower Performance Cost

```text
You are optimizing a NEXUS Skin Pack V2 for lower Style Lab preview cost.

Skin Pack JSON:
<paste JSON>

Optimization goals:
- Keep the same visual identity.
- Reduce blur, shadow, glow, and animation intensity.
- Keep maxCssVariableCount safe.
- Remove optional asset references unless they are essential.
- Keep critical asset counts and bytes low.
- Prefer token changes over asset or layout changes.
- Do not add dependencies, URLs, raw CSS, JavaScript, backend fields, workspace fields, Supabase fields, z-index, pointer-events, drag, resize, or React Flow behavior.
- Return one corrected JSON object only.
```

## 6. Forbidden Output Guide

Do not output these in Skin Pack V2 JSON:

- raw CSS declarations
- CSS selectors
- `<script>`
- JavaScript strings
- `url(...)`
- remote image URLs
- `http://` or `https://`
- `data:`, `blob:`, or `file:`
- large base64 assets
- `@import`
- dynamic Tailwind classes
- Supabase fields
- workspace fields
- backend route fields
- API route fields
- database or migration fields
- `zIndex`
- `pointerEvents`
- `position`
- `overflow`
- drag or resize fields
- focus trap fields
- React Flow behavior fields such as pan, zoom, connect, delete, node IDs,
  edge IDs, handle IDs, hit width, or interaction width

Use these instead:

| Desired effect | Safe V2 expression |
| --- | --- |
| palette | semantic tokens |
| pixel look | low radius, low blur, blocky palette, future asset note |
| glass look | surface alpha tokens, low blur within budget |
| glowing border | `border.glow` and restrained `shadow.glow` values |
| icon style | future Asset Pack ID references |
| layout feel | future layout preset hints |
| graph style | future recipe/adapter notes |

## 7. Style Lab Usage Flow

1. Open `/style-lab`.
2. Paste the Skin Pack V2 JSON into the V2 Skin Pack Review panel.
3. Click `Review`.
4. If accepted, read:
   - metadata summary
   - asset summary
   - recipe summary
   - layout preset summary
   - performance budget summary
   - token preview eligibility
5. Click `Preview Tokens` only after accepted review.
6. Inspect the scoped Style Lab surface.
7. Click `Revert V2` to remove token preview variables.
8. If rejected, use the redacted issue codes and paths to repair the JSON.

Important:

- `Preview Tokens` is local and temporary.
- `Revert V2` removes the scoped token preview variables.
- Review accepted does not mean production apply is approved.
- Asset, recipe, and layout summaries are review-only in the current phase.

## 8. Troubleshooting

| Symptom or issue code | Likely cause | Fix |
| --- | --- | --- |
| `stylePack.unsupportedSchemaVersion` | Skin Pack is not schemaVersion 2. | Set top-level `schemaVersion` to `2`. |
| `stylePack.invalidManifestBinding` | Manifest binding is missing or not V1. | Use `manifest.manifestVersion: 1` and a lowercase manifest ID. |
| `stylePack.invalidManifestPayload` | Embedded V1 manifest failed validation. | Ensure required token groups, required recipes, adapters, and constraints are present. |
| `stylePack.invalidTokenBinding` | Unknown token group or wrong token source. | Use `tokens.source: "manifest"` and only approved V1 token group names. |
| `stylePack.invalidRecipeBinding` | Unknown recipe group or wrong registry. | Use `recipe-registry-v1` and supported groups such as `panel`, `button`, `input`, `window`, and `modal`. |
| `stylePack.invalidAssetBinding` | Asset binding uses wrong contract or invalid IDs. | Use `asset-pack-v1` and lowercase asset IDs only, or omit assets for token-only preview. |
| `stylePack.invalidLayoutBinding` | Layout preset reference is malformed. | Use `layout-preset-boundary-v1`, lowercase `presetId`, and visual-only hints. |
| `stylePack.staticBudgetExceeded` | CSS variables, manifest bytes, recipe groups, or adapter outputs exceed budget. | Reduce tokens/recipes/adapters or use approved budget values. |
| `contract.forbiddenCss` | Raw CSS, braces, declarations, `@import`, or `url(...)` were included. | Replace with semantic token values or remove the field. |
| `contract.forbiddenExecutable` | Script-like content was included. | Remove scripts, `javascript:`, `eval`, dynamic imports, and executable strings. |
| `contract.forbiddenPlatformReference` | Workspace, Supabase, API, env, or backend strings appeared. | Remove platform fields entirely. |
| `contract.forbiddenBehaviorField` | Behavior/layout authority leaked into the pack. | Remove fields such as `zIndex`, `pointerEvents`, `position`, `drag`, `resize`, `onClick`, or React Flow behavior. |
| `assetPack.unsafeAssetReference` | Asset source contains a URL, local path, secret, signed parameter, or traversal. | Use stable built-in or packaged content-addressed paths only in future Asset Pack metadata. |
| `assetPack.protocol96Required` | Generated/recoverable asset durability was claimed. | Run Protocol 96 before implementation or remove the generated-reference. |
| `layoutPreset.protectedField` | Layout preset tried to control behavior or geometry. | Keep only density, slot ordering, surface treatment, visibility, and workspace decoration hints. |

## 9. Authoring Checklist

Before pasting into Style Lab:

- top-level `kind` is `nexus-skin-pack`
- top-level `schemaVersion` is `2`
- `id`, `slug`, manifest IDs, asset IDs, and preset IDs are lowercase slugs
- embedded manifest has `schemaVersion: 1`
- embedded manifest has required token groups and required recipes
- constraints all keep mutation/script/raw CSS flags false
- performance budget values are positive finite numbers
- no raw CSS declarations, selectors, scripts, URLs, base64, or platform fields
- no behavior, drag, resize, z-index, pointer, focus, or React Flow behavior
  fields
- optional asset/layout sections are ID references only
- pack can explain its fallback path
- token preview is the only expected current visual application

## 10. Future Path

### Render Plan IR

The next implementation gate should be pure Render Plan IR types and tests. It
should turn an accepted Skin Pack into a deterministic plan with:

- token stage
- review-only asset stage
- review-only recipe stage
- review-only layout stage
- diagnostics
- degradation notes
- checksums

### Asset Pack Local Preview

Asset preview is not authorized yet. It requires:

- Asset Pack validator maturity
- safe local or packaged source policy
- no external URL channel
- Protocol 96 for generated or durable assets
- dependency review before image tooling

### Recipe Specimen Preview

Recipe preview must go through Recipe Registry V1 and Style Lab specimens. It
must not add component behavior, event handlers, z-index authority, drag/resize,
or React Flow behavior.

### Layout Preset Preview

Layout preset preview must stay visual and specimen-only. It may show density,
slot ordering, surface treatment, and visibility hints, but it must not mutate
production layout or app skeleton behavior.

### Production Apply And Persistence

Production apply and persistence require separate gates:

- Protocol 98 before routes, auth, backend services, or persisted audit events
- Protocol 95 before Supabase schema, storage, RLS, or generated types
- stricter production safety policy than Style Lab preview
- no automatic workspace mutation from a review-only pack

## 11. Completion Criteria For Authored Packs

An authored pack is ready for the current V2 Style Lab flow when:

- Style Lab review accepts it.
- Token preview eligibility is `yes`.
- `Preview Tokens` applies scoped CSS variables.
- `Revert V2` removes the variables.
- Asset, recipe, and layout ideas are either omitted or represented only as
  current-contract ID references.
- No issue report shows unsafe, platform, behavior, or budget errors.

It is not ready for production apply until future apply and persistence gates
exist and pass.
