# NEXUS Style Pack Authoring Context V1

Status: copyable external-LLM context for current V2 Style Lab review and
token-only preview.

Use this file when giving an external language model enough context to generate
a NEXUS Skin Pack V2 candidate. This is not a production apply contract. It is
for JSON that can be pasted into `/style-lab`, reviewed by the V2 validator, and
previewed through the current token-only CSS variable path.

## Copyable Context

```text
You are generating one NEXUS Skin Pack V2 JSON object for Style Lab.
Use the skeleton shape below and only replace allowed values.
Return JSON only. Do not include Markdown fences.

Current preview scope:
- Style Lab can review a V2 Skin Pack envelope around one V1 manifest payload.
- If review accepts the pack, Style Lab can Preview Tokens.
- Preview Tokens emits scoped CSS variables named --nexus-{group}-{token}.
- It does not apply assets, recipe expansion, layout presets, behavior, save,
  apply, persistence, backend, Supabase, or production app shell changes.
- Rejected candidates expose redacted issue codes and do not return unsafe
  rejected payloads.

Required top-level fields:
kind, schemaVersion, id, slug, packVersion, metadata, manifest, tokens,
recipes, performanceBudget, compatibility, fallback.

Optional top-level fields:
assets, layoutPreset. These are review-only today.

Editable fields:
- metadata display text, source, lifecycle, and tags
- manifest identity, name, description, source reference, mode, and intent
- manifest.payload.tokens values inside approved V1 token groups
- manifest.payload.recipes token references such as surface.panel or accent.primary
- adapters.nextThemes dataTheme and colorScheme from the existing allowlist
- static performance budget numbers within the approved local budget shape

Review-only fields:
- assets are ID references only and are not loaded or rendered
- recipes do not emit V2 recipe variables in token-only preview
- layoutPreset is inert metadata and cannot move, hide, resize, or reorder production UI
- performance diagnostics are static summaries until Render Plan IR exists
- compatibility and fallback fields are reviewed but do not apply production state

Forbidden output:
- raw CSS blocks, selectors, style tags, or CSS declarations
- script tags, JavaScript, event handlers, functions, eval, or dynamic imports
- url(...), remote URLs, file/blob/data URLs, or base64 assets
- workspace, sync, backend, database, API route, Supabase, deployment, or secret fields
- z-index, pointer events, drag, resize, focus trap, layout behavior, or React Flow behavior
- unknown top-level Skin Pack fields

Required V1 token groups:
surface, text, accent, status, border, shadow, radius, blur, workspace,
typography, density, motion.

Required semantic tokens:
surface.app, surface.panel, surface.workspace
text.primary, text.secondary, text.muted
accent.primary, accent.primaryStrong
status.success, status.warning, status.danger
border.subtle
shadow.panel
radius.surface
blur.glass

Prompt task:
- Convert the user brief or UI image description into safe V1 manifest tokens.
- Preserve the valid Skin Pack V2 object shape.
- Map palette to surface, text, accent, status, border, shadow, and workspace tokens.
- Map material, shape, density, and motion to intent and safe token values.
- Keep assets, recipe expansion, and layout ideas as review-only metadata or omit them.
- Prefer high contrast, low blur, low motion, and a safe CSS variable budget.
```

## Prompt Template For A Brief Or UI Image

```text
Input style brief or UI image description:
<paste style brief, palette notes, UI screenshot description, or design language>

Generate one NEXUS Skin Pack V2 JSON object.
Use the valid skeleton below.
Only replace allowed values.
Return JSON only.

When converting a UI image:
- Extract background, panel, input, text, muted text, accent, warning, success,
  and danger colors.
- Extract material language such as pixel, carbon, glass, matte, paper, stone,
  chrome, or clay into intent.material and safe token values.
- Extract border and shape language into border, radius, shadow, and blur tokens.
- Extract typography mood into typography, density, and intent.mood tokens.
- Put icon, texture, background image, layout, and recipe expansion ideas only
  into safe review-only metadata or leave them out.

Do not include raw CSS, JS, selectors, URLs, base64, backend fields, Supabase
fields, workspace fields, z-index, pointer events, drag, resize, focus, or
React Flow behavior.
```

## Minimal Usable JSON

This is intentionally small but still valid for current review and token-only
preview. It omits `assets` and `layoutPreset`.

```json
{
  "kind": "nexus-skin-pack",
  "schemaVersion": 2,
  "id": "minimal-ink-skin",
  "slug": "minimal-ink-skin",
  "packVersion": "1.0.0",
  "metadata": {
    "displayName": "Minimal Ink Skin",
    "description": "Small safe Skin Pack V2 example for token-only Style Lab preview.",
    "source": "human-authored",
    "tags": ["minimal", "ink", "token-preview"],
    "lifecycle": "validated"
  },
  "manifest": {
    "manifestVersion": 1,
    "manifestId": "minimal-ink",
    "payload": {
      "schemaVersion": 1,
      "id": "minimal-ink",
      "name": "Minimal Ink",
      "description": "Minimal V1 manifest payload embedded inside Skin Pack V2.",
      "source": {
        "kind": "human-brief",
        "reference": "style-pack-authoring-context-v1"
      },
      "mode": "dark",
      "intent": {
        "mood": ["focused", "plain", "legible"],
        "material": ["ink", "matte"],
        "density": "comfortable",
        "motion": "minimal",
        "contrast": "high"
      },
      "tokens": {
        "surface": {
          "app": "#050507",
          "shell": "#09090b",
          "workspace": "#0a0a0f",
          "panel": "rgb(18 18 24 / 0.96)",
          "panelMuted": "rgb(30 30 38 / 0.9)",
          "raised": "#27272f",
          "input": "rgb(12 12 18 / 0.94)",
          "overlay": "rgb(0 0 0 / 0.82)"
        },
        "text": {
          "primary": "#ffffff",
          "secondary": "#d4d4dc",
          "muted": "#8f8f9d",
          "inverse": "#050507",
          "danger": "#fecdd3",
          "success": "#bbf7d0",
          "warning": "#fef08a"
        },
        "accent": {
          "primary": "#93c5fd",
          "primaryStrong": "#60a5fa",
          "secondary": "#eeeeee"
        },
        "status": {
          "success": "#22c55e",
          "warning": "#eeeeee",
          "danger": "#c7c7c7",
          "info": "#93c5fd"
        },
        "border": {
          "subtle": "rgb(255 255 255 / 0.2)",
          "glow": "rgb(147 197 253 / 0.28)"
        },
        "shadow": {
          "panel": "0 18px 52px rgb(0 0 0 / 0.42)",
          "glow": "0 0 18px rgb(147 197 253 / 0.16)"
        },
        "radius": {
          "base": "3px",
          "surface": "3px"
        },
        "blur": {
          "glass": "2px",
          "backdrop": "6px"
        },
        "workspace": {
          "gridPrimary": "rgb(147 197 253 / 0.14)",
          "gridSecondary": "rgb(250 204 21 / 0.1)",
          "wash": "rgb(147 197 253 / 0.05)"
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

## Pixel Workshop JSON Example

This is the same safe shape as the current Pixel Workshop fixture. It is
Minecraft-like in palette and blockiness, but it does not embed official assets,
remote images, raw CSS, scripts, selectors, layout behavior, or production
state. The `assets` and `layoutPreset` sections are safe review-only metadata.

```json
{
  "kind": "nexus-skin-pack",
  "schemaVersion": 2,
  "id": "pixel-workshop-skin",
  "slug": "pixel-workshop-skin",
  "packVersion": "1.0.0",
  "metadata": {
    "displayName": "Pixel Workshop Skin",
    "description": "Minecraft-like pixel workshop palette with grass, dirt, stone, and diamond tones for token-only preview.",
    "source": "human-authored",
    "tags": ["pixel", "minecraft-like", "workshop", "token-preview"],
    "lifecycle": "validated"
  },
  "manifest": {
    "manifestVersion": 1,
    "manifestId": "pixel-workshop",
    "payload": {
      "schemaVersion": 1,
      "id": "pixel-workshop",
      "name": "Pixel Workshop",
      "description": "Pixel workshop visual language expressed as safe NEXUS tokens for Style Lab token preview.",
      "source": {
        "kind": "human-brief",
        "reference": "style-pack-authoring-closed-loop-fixture"
      },
      "mode": "dark",
      "intent": {
        "mood": ["blocky", "playful", "workshop"],
        "material": ["pixel-stone", "dirt", "grass", "diamond"],
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
  "assets": {
    "assetPackContract": "asset-pack-v1",
    "assetPackId": "pixel-workshop-safe-assets",
    "requiredAssetIds": [],
    "lazyAssetIds": ["pixel-workshop-panel-texture"],
    "optionalAssetIds": ["pixel-workshop-tool-icon"],
    "fallbackAssetPackId": "minimal-safe-assets"
  },
  "layoutPreset": {
    "contract": "layout-preset-boundary-v1",
    "presetId": "pixel-workshop-compact",
    "density": "compact",
    "surfaceTreatment": "outlined",
    "slotOrdering": ["header", "body", "actions"],
    "visibilityHints": {
      "sidebar": "compact",
      "toolrail": "compact"
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
    "assetPackContract": "asset-pack-v1",
    "layoutPresetContract": "layout-preset-boundary-v1",
    "result": "compatible_with_warnings",
    "warnings": [
      "stylePack.compatibility.reviewOnlyAssets",
      "stylePack.compatibility.reviewOnlyLayout"
    ]
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

## Common Rejections And Repairs

| Issue | Likely cause | Repair |
| --- | --- | --- |
| `stylePack.invalidManifestPayload` | Embedded V1 manifest is missing token groups, recipes, adapters, or constraints. | Start from the minimal JSON and replace values only. |
| Missing token group | One of the twelve V1 token groups was removed. | Put the group back under `manifest.payload.tokens` and list it in `tokens.manifestTokenGroups`. |
| Missing semantic token | Required names such as `surface.panel` or `accent.primaryStrong` are missing. | Restore the required semantic token and use a safe color or length value. |
| `stylePack.invalidRecipeBinding` | Wrong registry version or unsupported V2 recipe group. | Use `recipe-registry-v1` and groups such as `panel`, `button`, `input`, `window`, `modal`. |
| `stylePack.unknownTopLevelField` | External model added fields like `theme`, `css`, `workspace`, or `components`. | Delete the unknown field entirely. |
| `contract.forbiddenCss` | Raw CSS, selectors, braces, imports, declarations, or `url(...)`. | Replace with semantic token values or omit. |
| `contract.forbiddenExecutable` | Script-like or JavaScript-like strings. | Remove executable content. |
| `contract.forbiddenBehaviorField` | Layout, pointer, z-index, drag, resize, focus, or React Flow behavior leaked in. | Remove behavior fields; V2 Style Pack is visual data only. |
| `stylePack.staticBudgetExceeded` | Variable count, manifest bytes, recipe groups, or adapter outputs exceed static budget. | Reduce manifest size or return to the approved budget shape. |

## Current Closed Loop

1. Give the Copyable Context and one example JSON to an external LLM.
2. Ask it to return JSON only.
3. Paste the JSON into `/style-lab` V2 Skin Pack Review.
4. Click `Review`.
5. If rejected, copy only the redacted issue codes and paths into the repair
   prompt.
6. If accepted, inspect metadata, assets, recipes, layout, budget, and token
   eligibility.
7. Click `Preview Tokens`.
8. Inspect the scoped CSS variables shown by Style Lab.
9. Click `Revert V2`.

The current loop ends at token-only preview. More visible UI surfaces require
Render Plan IR, recipe specimen preview, asset local preview, and layout preset
preview gates.
