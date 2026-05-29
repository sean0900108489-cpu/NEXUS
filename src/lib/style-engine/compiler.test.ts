import { describe, expect, it } from "vitest";

import {
  compileNexusStyleManifestV1,
  type NexusStyleManifestV1,
} from "@/lib/style-engine";

describe("NEXUS Style Engine pure compiler", () => {
  it("emits deterministic compiled output and does not mutate the manifest", () => {
    const manifest = createSafeManifest();
    const before = structuredClone(manifest);
    const first = compileNexusStyleManifestV1(manifest);
    const second = compileNexusStyleManifestV1(structuredClone(manifest));

    expect(first).toEqual(second);
    expect(manifest).toEqual(before);
    expect(first.accepted).toBe(true);

    if (!first.accepted) {
      throw new Error("Expected compiler to accept manifest.");
    }

    expect(first.style).toMatchObject({
      compilerVersion: "nexus-style-compiler-v1",
      manifestId: "legacy-cyberpunk",
      report: {
        accepted: true,
        legacyBridgeUsed: true,
      },
    });
    expect(first.style.manifestChecksum).toMatch(/^nexus-style-fnv1a32:[0-9a-f]{8}$/);
  });

  it("emits semantic and legacy CSS variables", () => {
    const result = compileNexusStyleManifestV1(createSafeManifest());

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected compiler to accept manifest.");
    }

    expect(result.style.cssVariables).toMatchObject({
      "--nexus-accent-primary": "#67e8f9",
      "--nexus-accent-primary-strong": "#22d3ee",
      "--nexus-surface-panel": "rgb(8 16 22 / 0.78)",
      "--nexus-workspace-grid-primary": "rgb(34 211 238 / 0.12)",
    });
    expect(result.style.legacyCssVariables).toMatchObject({
      "--bg-base": "var(--nexus-surface-app)",
      "--panel-bg": "var(--nexus-surface-panel)",
      "--theme-primary": "var(--nexus-accent-primary)",
    });
  });

  it("compiles recipe token references to CSS variable references", () => {
    const result = compileNexusStyleManifestV1(createSafeManifest());

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected compiler to accept manifest.");
    }

    expect(result.style.recipes.button.default).toEqual({
      border: "var(--nexus-border-subtle)",
      surface: "var(--nexus-surface-panel)",
      text: "var(--nexus-text-secondary)",
    });
    expect(result.style.recipes.panel).toEqual({
      border: "var(--nexus-border-subtle)",
      surface: "var(--nexus-surface-panel)",
      text: "var(--nexus-text-primary)",
    });
  });

  it("fails closed for invalid manifests without partial compiled output", () => {
    const manifest = createSafeManifest();

    manifest.tokens.surface.app = "url(https://example.test/texture.png)";

    const result = compileNexusStyleManifestV1(manifest);

    expect(result.accepted).toBe(false);

    if (result.accepted) {
      throw new Error("Expected compiler to reject manifest.");
    }

    expect(result.errors.map((error) => error.code)).toContain("style.forbidden.url");
    expect("style" in result).toBe(false);
  });

  it("rejects React Flow behavior fields through the validator gate", () => {
    const manifest = createSafeManifest();

    manifest.adapters.reactFlow = {
      nodesDraggable: true,
    };

    const result = compileNexusStyleManifestV1(manifest);

    expect(result.accepted).toBe(false);

    if (result.accepted) {
      throw new Error("Expected compiler to reject manifest.");
    }

    expect(result.errors).toContainEqual({
      code: "style.forbiddenReactFlowBehavior",
      message: "React Flow adapter may only contain visual fields.",
      path: "$.adapters.reactFlow.nodesDraggable",
    });
  });
});

function createSafeManifest(): NexusStyleManifestV1 {
  return {
    schemaVersion: 1,
    id: "legacy-cyberpunk",
    name: "Legacy Cyberpunk",
    source: {
      kind: "legacy-preset",
    },
    mode: "dark",
    intent: {
      mood: ["operational"],
      material: ["glass"],
      density: "compact",
      motion: "standard",
      contrast: "standard",
    },
    tokens: {
      accent: {
        primary: "#67e8f9",
        primaryStrong: "#22d3ee",
      },
      blur: {
        glass: "8px",
      },
      border: {
        subtle: "rgb(226 232 240 / 0.12)",
      },
      density: {
        control: "compact",
      },
      motion: {
        durationFast: "140ms",
      },
      radius: {
        surface: "4px",
      },
      shadow: {
        panel: "0 24px 80px rgb(0 0 0 / 0.38)",
      },
      status: {
        danger: "#fda4af",
        success: "#6ee7b7",
        warning: "#fcd34d",
      },
      surface: {
        app: "#030712",
        panel: "rgb(8 16 22 / 0.78)",
        workspace: "#020617",
      },
      text: {
        muted: "#64748b",
        primary: "#f8fafc",
        secondary: "#cbd5e1",
      },
      typography: {
        interface: "Geist",
      },
      workspace: {
        gridPrimary: "rgb(34 211 238 / 0.12)",
      },
    },
    recipes: {
      badge: {},
      button: {
        default: {
          border: "border.subtle",
          surface: "surface.panel",
          text: "text.secondary",
        },
      },
      dock: {},
      input: {},
      modal: {},
      panel: {
        border: "border.subtle",
        surface: "surface.panel",
        text: "text.primary",
      },
      window: {},
    },
    adapters: {
      nextThemes: {
        colorScheme: "dark",
        dataTheme: "cyberpunk",
      },
      tailwindBridge: {
        enabled: true,
        legacyVariableMode: "preserve",
      },
    },
    constraints: {
      allowBackendMutation: false,
      allowDynamicTailwind: false,
      allowJavaScript: false,
      allowRawCss: false,
      allowSyncMutation: false,
      allowWorkspaceMutation: false,
      maxCssVariableCount: 180,
      protectedBehaviorClasses: [],
    },
  };
}
