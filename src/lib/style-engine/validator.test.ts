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

  it("rejects data URL strings without echoing payloads", () => {
    const manifest = createSafeManifest();
    manifest.source = {
      kind: "imported-draft",
      reference: "data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk=",
    };

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toContainEqual({
      code: "style.forbidden.dataUrl",
      message: "Manifest contains a forbidden string value.",
      path: "$.source.reference",
    });
    expect(JSON.stringify(report)).not.toContain("PHN2Zy");
  });

  it("rejects VBScript URL strings without echoing payloads", () => {
    const manifest = createSafeManifest();
    manifest.source = {
      kind: "imported-draft",
      reference: 'vbscript:msgbox("hidden-payload")',
    };

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toContainEqual({
      code: "style.forbidden.vbscriptUrl",
      message: "Manifest contains a forbidden string value.",
      path: "$.source.reference",
    });
    expect(JSON.stringify(report)).not.toContain("hidden-payload");
  });

  it("rejects invalid source metadata without echoing reference payloads", () => {
    const manifest = createSafeManifest() as unknown as Record<string, unknown>;
    manifest.source = {
      kind: "remote-url",
      reference: {
        note: "hidden-source-reference",
      },
    };

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        {
          code: "style.invalidSourceKind",
          message: "source.kind is invalid.",
          path: "$.source.kind",
        },
        {
          code: "style.invalidSourceReference",
          message: "source.reference must be text.",
          path: "$.source.reference",
        },
      ]),
    );
    expect(JSON.stringify(report)).not.toContain("hidden-source-reference");
  });

  it("rejects CSS variable references outside approved namespaces", () => {
    const manifest = createSafeManifest({
      tokens: {
        surface: {
          app: "var(--secret-token)",
        },
      },
    });

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toContainEqual({
      code: "style.forbidden.cssVariableReference",
      message: "Manifest contains a forbidden string value.",
      path: "$.tokens.surface.app",
    });
  });

  it("allows CSS variable references inside the approved NEXUS namespace", () => {
    const manifest = createSafeManifest({
      tokens: {
        surface: {
          app: "var(--nexus-surface-app)",
        },
      },
    });

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(true);
    expect(report.errors).toEqual([]);
  });

  it("allows CSS variable references inside the legacy bridge namespace", () => {
    const manifest = createSafeManifest({
      tokens: {
        surface: {
          app: "var(--bg-base)",
        },
      },
    });

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(true);
    expect(report.errors).toEqual([]);
  });

  it("rejects dynamic Tailwind arbitrary value classes", () => {
    const manifest = createSafeManifest({
      tokens: {
        surface: {
          app: "bg-[#0f172a]",
        },
      },
    });

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toContainEqual({
      code: "style.forbidden.dynamicTailwind",
      message: "Manifest contains a forbidden string value.",
      path: "$.tokens.surface.app",
    });
  });

  it("rejects legacy CSS expression strings", () => {
    const manifest = createSafeManifest({
      tokens: {
        surface: {
          app: "expression(alert(1))",
        },
      },
    });

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toContainEqual({
      code: "style.forbidden.cssExpression",
      message: "Manifest contains a forbidden string value.",
      path: "$.tokens.surface.app",
    });
  });

  it("rejects generic HTML tag strings", () => {
    const manifest = createSafeManifest({
      tokens: {
        text: {
          primary: "<img src=x>",
        },
      },
    });

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toContainEqual({
      code: "style.forbidden.htmlTag",
      message: "Manifest contains a forbidden string value.",
      path: "$.tokens.text.primary",
    });
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

  it("warns without rejecting when a focus-capable recipe omits focus styling", () => {
    const manifest = createSafeManifest();
    delete (
      manifest.recipes.button as Partial<NexusStyleManifestV1["recipes"]["button"]>
    ).focus;

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(true);
    expect(report.warnings).toContainEqual({
      code: "style.missingFocusRecipe",
      message: "Focus-capable recipes should define a visual focus state.",
      path: "$.recipes.button.focus",
    });
  });

  it("warns without rejecting when a recommended recipe slot is missing", () => {
    const manifest = createSafeManifest();
    delete manifest.recipes.panel.text;

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(true);
    expect(report.warnings).toContainEqual({
      code: "style.incompleteRecipe",
      message: "Recommended visual recipe slot is missing.",
      path: "$.recipes.panel.text",
    });
  });

  it("rejects recipe references to unknown semantic tokens", () => {
    const manifest = createSafeManifest({
      recipes: {
        panel: {
          surface: "surface.missing",
        },
      },
    });

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toContainEqual({
      code: "style.unknownTokenReference",
      message: "Recipe references an unknown semantic token.",
      path: "$.recipes.panel.surface",
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

  it("rejects external platform top-level pollution", () => {
    const manifest = {
      ...createSafeManifest(),
      authConfig: {},
      databaseMigration: "hidden-platform-secret",
      envVars: {},
      githubRepo: "owner/repo",
      secretStore: {},
      supabaseProject: "project-ref",
      vercelDeployment: "production",
    };
    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "style.unsafeTopLevelField",
          path: "$.authConfig",
        }),
        expect.objectContaining({
          code: "style.unsafeTopLevelField",
          path: "$.databaseMigration",
        }),
        expect.objectContaining({
          code: "style.unsafeTopLevelField",
          path: "$.envVars",
        }),
        expect.objectContaining({
          code: "style.unsafeTopLevelField",
          path: "$.githubRepo",
        }),
        expect.objectContaining({
          code: "style.unsafeTopLevelField",
          path: "$.secretStore",
        }),
        expect.objectContaining({
          code: "style.unsafeTopLevelField",
          path: "$.supabaseProject",
        }),
        expect.objectContaining({
          code: "style.unsafeTopLevelField",
          path: "$.vercelDeployment",
        }),
      ]),
    );
    expect(JSON.stringify(report)).not.toContain("hidden-platform-secret");
  });

  it("distinguishes unsupported top-level fields from unsafe platform fields", () => {
    const manifest = {
      ...createSafeManifest(),
      visualNotes: "keep panels quiet",
    };
    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toContainEqual({
      code: "style.unknownTopLevelField",
      message: "Unknown top-level fields are not allowed in a V1 style manifest.",
      path: "$.visualNotes",
    });
    expect(report.errors).not.toContainEqual(
      expect.objectContaining({
        code: "style.unsafeTopLevelField",
        path: "$.visualNotes",
      }),
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
      badge: {
        default: {
          border: "border.subtle",
          surface: "surface.panel",
          text: "text.secondary",
        },
      },
      button: {
        default: {
          border: "border.subtle",
          surface: "surface.panel",
          text: "text.secondary",
        },
        focus: {
          ring: "border.subtle",
        },
      },
      commandPalette: {
        input: "surface.panel",
        itemActive: "accent.primary",
        itemDefault: "surface.panel",
        itemHover: "surface.panel",
        surface: "surface.panel",
      },
      dock: {
        border: "border.subtle",
        surface: "surface.panel",
      },
      input: {
        default: {
          border: "border.subtle",
          surface: "surface.panel",
          text: "text.primary",
        },
        focus: {
          border: "border.subtle",
        },
      },
      modal: {
        border: "border.subtle",
        surface: "surface.panel",
        text: "text.primary",
      },
      panel: {
        border: "border.subtle",
        surface: "surface.panel",
        text: "text.primary",
      },
      window: {
        border: "border.subtle",
        surface: "surface.panel",
        text: "text.primary",
      },
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
