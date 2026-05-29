import { describe, expect, it } from "vitest";

import {
  validateNexusStyleManifestV1,
  type NexusStyleManifestV1,
} from "@/lib/style-engine";

describe("NEXUS Style Engine manifest validator", () => {
  it("accepts a minimal safe V1 manifest with deterministic reporting", () => {
    const manifest = createSafeManifest();
    const first = validateNexusStyleManifestV1(manifest);
    const second = validateNexusStyleManifestV1(structuredClone(manifest));

    expect(first).toEqual(second);
    expect(first.accepted).toBe(true);
    expect(first.errors).toEqual([]);
    expect(first.warnings).toEqual([
      {
        code: "style.accessibility.highContrastNotRequested",
        message: "High contrast is not requested; preview remains allowed.",
        path: "$.intent.contrast",
      },
    ]);
  });

  it("rejects raw CSS, URLs, and service-role strings without echoing values", () => {
    const manifest = createSafeManifest({
      tokens: {
        surface: {
          app: "url(https://example.test/texture.png)",
          panel: "service_role=super-secret-value",
        },
      },
    });
    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "style.forbidden.url",
        "style.forbidden.serviceRole",
      ]),
    );
    expect(JSON.stringify(report)).not.toContain("super-secret-value");
    expect(JSON.stringify(report)).not.toContain("example.test");
  });

  it("rejects recipe behavior fields", () => {
    const manifest = createSafeManifest({
      recipes: {
        button: {
          default: {
            onClick: "do something",
          },
        },
      },
    });
    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toContainEqual({
      code: "style.forbiddenRecipeField",
      message: "Recipe contains a behavior or persistence field.",
      path: "$.recipes.button.default.onClick",
    });
  });

  it("requires the command palette recipe group", () => {
    const manifest = createSafeManifest();
    delete (manifest.recipes as Partial<NexusStyleManifestV1["recipes"]>)
      .commandPalette;

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toContainEqual({
      code: "style.missingRecipeGroup",
      message: "Required recipe group is missing.",
      path: "$.recipes.commandPalette",
    });
  });

  it("rejects React Flow behavior fields but allows the workspace token group", () => {
    const manifest = createSafeManifest({
      adapters: {
        reactFlow: {
          nodesDraggable: true,
        },
      },
    });
    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toContainEqual({
      code: "style.forbiddenReactFlowBehavior",
      message: "React Flow adapter may only contain visual fields.",
      path: "$.adapters.reactFlow.nodesDraggable",
    });
    expect(report.errors).not.toContainEqual(
      expect.objectContaining({
        path: "$.tokens.workspace",
      }),
    );
  });

  it("rejects workspace and backend top-level pollution", () => {
    const manifest = {
      ...createSafeManifest(),
      backendRoute: "/api/v1/style-packs",
      workspace: {
        themeConfig: {},
      },
    };
    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "style.unsafeTopLevelField",
          path: "$.backendRoute",
        }),
        expect.objectContaining({
          code: "style.unsafeTopLevelField",
          path: "$.workspace",
        }),
      ]),
    );
  });
});

function createSafeManifest(
  overrides: {
    adapters?: Partial<NexusStyleManifestV1["adapters"]>;
    recipes?: DeepPartial<NexusStyleManifestV1["recipes"]>;
    tokens?: Partial<
      Record<keyof NexusStyleManifestV1["tokens"], Record<string, string | number>>
    >;
  } = {},
): NexusStyleManifestV1 {
  const manifest: NexusStyleManifestV1 = {
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
        focus: {
          ring: "border.focus",
        },
      },
      commandPalette: {},
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

  for (const [group, values] of Object.entries(overrides.tokens ?? {})) {
    Object.assign(
      manifest.tokens[group as keyof NexusStyleManifestV1["tokens"]],
      values,
    );
  }

  if (overrides.recipes) {
    mergeRecord(manifest.recipes, overrides.recipes);
  }

  if (overrides.adapters) {
    manifest.adapters = {
      ...manifest.adapters,
      ...overrides.adapters,
    };
  }

  return manifest;
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown>
    ? DeepPartial<T[K]>
    : T[K];
};

function mergeRecord(target: Record<string, unknown>, patch: Record<string, unknown>) {
  for (const [key, value] of Object.entries(patch)) {
    if (isRecord(value) && isRecord(target[key])) {
      mergeRecord(target[key], value);
    } else {
      target[key] = value;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
