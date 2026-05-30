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

  it("rejects non-object roots and missing required top-level fields", () => {
    const invalidRoot = validateNexusStyleManifestV1("not-a-manifest");

    expect(invalidRoot.accepted).toBe(false);
    expect(invalidRoot.errors).toEqual([
      {
        code: "style.invalidRoot",
        message: "Manifest candidate must be an object.",
        path: "$",
      },
    ]);

    const manifest = createSafeManifest() as unknown as Record<string, unknown>;
    delete manifest.intent;
    delete manifest.constraints;

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        {
          code: "style.missingField",
          message: "Required field is missing.",
          path: "$.constraints",
        },
        {
          code: "style.missingField",
          message: "Required field is missing.",
          path: "$.intent",
        },
        {
          code: "style.invalidConstraints",
          message: "constraints must be an object.",
          path: "$.constraints",
        },
        {
          code: "style.invalidIntent",
          message: "intent must be an object.",
          path: "$.intent",
        },
      ]),
    );
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

  it("rejects CSS import, block, and declaration-list strings without echoing payloads", () => {
    const manifest = createSafeManifest({
      tokens: {
        surface: {
          app: '@import "private-style.css"',
          panel: ".private { color: secret-payload }",
        },
        text: {
          primary: "color: red; background: hidden-declaration",
        },
      },
    });

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        {
          code: "style.forbidden.cssImport",
          message: "Manifest contains a forbidden string value.",
          path: "$.tokens.surface.app",
        },
        {
          code: "style.forbidden.cssBlock",
          message: "Manifest contains a forbidden string value.",
          path: "$.tokens.surface.panel",
        },
        {
          code: "style.forbidden.cssDeclarationList",
          message: "Manifest contains a forbidden string value.",
          path: "$.tokens.text.primary",
        },
      ]),
    );
    expect(JSON.stringify(report)).not.toContain("private-style");
    expect(JSON.stringify(report)).not.toContain("secret-payload");
    expect(JSON.stringify(report)).not.toContain("hidden-declaration");
  });

  it("rejects executable string values without echoing payloads", () => {
    const manifest = createSafeManifest({
      tokens: {
        surface: {
          app: "<script>privateScriptPayload()</script>",
          panel: "javascript:alert(hidden-js-payload)",
        },
        text: {
          primary: 'eval("hidden-eval-payload")',
          secondary: 'Function("hidden-function-payload")',
        },
      },
    });
    manifest.source = {
      kind: "imported-draft",
      reference: 'import("hidden-import-payload")',
    };

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        {
          code: "style.forbidden.script",
          message: "Manifest contains a forbidden string value.",
          path: "$.tokens.surface.app",
        },
        {
          code: "style.forbidden.javascriptUrl",
          message: "Manifest contains a forbidden string value.",
          path: "$.tokens.surface.panel",
        },
        {
          code: "style.forbidden.eval",
          message: "Manifest contains a forbidden string value.",
          path: "$.tokens.text.primary",
        },
        {
          code: "style.forbidden.functionConstructor",
          message: "Manifest contains a forbidden string value.",
          path: "$.tokens.text.secondary",
        },
        {
          code: "style.forbidden.dynamicImport",
          message: "Manifest contains a forbidden string value.",
          path: "$.source.reference",
        },
      ]),
    );
    expect(JSON.stringify(report)).not.toContain("privateScriptPayload");
    expect(JSON.stringify(report)).not.toContain("hidden-js-payload");
    expect(JSON.stringify(report)).not.toContain("hidden-eval-payload");
    expect(JSON.stringify(report)).not.toContain("hidden-function-payload");
    expect(JSON.stringify(report)).not.toContain("hidden-import-payload");
  });

  it("rejects direct URL strings without echoing private hosts", () => {
    const manifest = createSafeManifest();
    manifest.source = {
      kind: "human-brief",
      reference: "https://private.example/style-pack.json",
    };

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toContainEqual({
      code: "style.forbidden.url",
      message: "Manifest contains a forbidden string value.",
      path: "$.source.reference",
    });
    expect(JSON.stringify(report)).not.toContain("private.example");
  });

  it("rejects file and blob URL strings without echoing payloads", () => {
    const fileManifest = createSafeManifest();
    fileManifest.source = {
      kind: "imported-draft",
      reference: "file:///Users/private/style-pack.json",
    };
    const blobManifest = createSafeManifest();
    blobManifest.source = {
      kind: "imported-draft",
      reference: "blob:private-payload",
    };

    const fileReport = validateNexusStyleManifestV1(fileManifest);
    const blobReport = validateNexusStyleManifestV1(blobManifest);

    expect(fileReport.accepted).toBe(false);
    expect(blobReport.accepted).toBe(false);
    expect(fileReport.errors).toContainEqual({
      code: "style.forbidden.url",
      message: "Manifest contains a forbidden string value.",
      path: "$.source.reference",
    });
    expect(blobReport.errors).toContainEqual({
      code: "style.forbidden.url",
      message: "Manifest contains a forbidden string value.",
      path: "$.source.reference",
    });
    expect(JSON.stringify(fileReport)).not.toContain("/Users/private");
    expect(JSON.stringify(blobReport)).not.toContain("private-payload");
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

  it("rejects invalid identity metadata", () => {
    const manifest = createSafeManifest() as unknown as Record<string, unknown>;
    manifest.schemaVersion = 2;
    manifest.id = "Bad ID!";
    manifest.name = "";
    manifest.description = "x".repeat(281);
    manifest.author = 42;
    manifest.mode = "sepia";

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        {
          code: "style.invalidSchemaVersion",
          message: "schemaVersion must be 1.",
          path: "$.schemaVersion",
        },
        {
          code: "style.invalidId",
          message: "id must be a lowercase slug.",
          path: "$.id",
        },
        {
          code: "style.invalidName",
          message: "name must be 1-80 characters.",
          path: "$.name",
        },
        {
          code: "style.invalidDescription",
          message: "description must be 0-280 characters.",
          path: "$.description",
        },
        {
          code: "style.invalidAuthor",
          message: "author must be display text.",
          path: "$.author",
        },
        {
          code: "style.invalidMode",
          message: "mode must be dark, light, or adaptive.",
          path: "$.mode",
        },
      ]),
    );
  });

  it("rejects invalid intent metadata and safety constraints", () => {
    const manifest = createSafeManifest() as unknown as Record<string, unknown>;
    manifest.intent = {
      contrast: "low",
      density: "crowded",
      material: "glass",
      mood: ["operational", ""],
      motion: "chaotic",
    };
    manifest.constraints = {
      allowBackendMutation: true,
      allowDynamicTailwind: true,
      allowJavaScript: true,
      allowRawCss: true,
      allowSyncMutation: true,
      allowWorkspaceMutation: true,
      maxCssVariableCount: Number.NaN,
      protectedBehaviorClasses: "visual-boundary-list",
    };

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        {
          code: "style.invalidStringArray",
          message: "Expected a non-empty string array.",
          path: "$.intent.material",
        },
        {
          code: "style.invalidStringArray",
          message: "Expected a non-empty string array.",
          path: "$.intent.mood",
        },
        {
          code: "style.invalidDensity",
          message: "density is invalid.",
          path: "$.intent.density",
        },
        {
          code: "style.invalidMotion",
          message: "motion is invalid.",
          path: "$.intent.motion",
        },
        {
          code: "style.invalidContrast",
          message: "contrast is invalid.",
          path: "$.intent.contrast",
        },
        {
          code: "style.invalidVariableLimit",
          message: "maxCssVariableCount must be a positive finite number.",
          path: "$.constraints.maxCssVariableCount",
        },
        {
          code: "style.invalidConstraintFlag",
          message: "Safety constraint flags must be explicitly false.",
          path: "$.constraints.allowRawCss",
        },
        {
          code: "style.invalidConstraintFlag",
          message: "Safety constraint flags must be explicitly false.",
          path: "$.constraints.allowWorkspaceMutation",
        },
        {
          code: "style.invalidProtectedBehaviorClasses",
          message: "protectedBehaviorClasses must be an array.",
          path: "$.constraints.protectedBehaviorClasses",
        },
      ]),
    );
  });

  it("rejects empty intent mood and material arrays", () => {
    const manifest = createSafeManifest();
    manifest.intent.mood = [];
    manifest.intent.material = [];

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        {
          code: "style.invalidStringArray",
          message: "Expected a non-empty string array.",
          path: "$.intent.material",
        },
        {
          code: "style.invalidStringArray",
          message: "Expected a non-empty string array.",
          path: "$.intent.mood",
        },
      ]),
    );
  });

  it("rejects invalid protected behavior class entries", () => {
    const manifest = createSafeManifest();

    manifest.constraints.protectedBehaviorClasses = [
      "visual-boundary",
      "",
      42 as never,
    ];

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        {
          code: "style.invalidProtectedBehaviorClass",
          message: "protectedBehaviorClasses entries must be non-empty strings.",
          path: "$.constraints.protectedBehaviorClasses[1]",
        },
        {
          code: "style.invalidProtectedBehaviorClass",
          message: "protectedBehaviorClasses entries must be non-empty strings.",
          path: "$.constraints.protectedBehaviorClasses[2]",
        },
      ]),
    );
  });

  it("rejects missing token groups, semantic tokens, and invalid token values", () => {
    const manifest = createSafeManifest();
    const tokens = manifest.tokens as unknown as Record<
      string,
      Record<string, unknown>
    >;
    delete tokens.accent;
    delete tokens.surface.panel;
    tokens.text.primary = {
      nested: "not-a-token-value",
    };

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        {
          code: "style.missingTokenGroup",
          message: "Required token group is missing.",
          path: "$.tokens.accent",
        },
        {
          code: "style.missingSemanticToken",
          message: "Required semantic token is missing.",
          path: "$.tokens.surface.panel",
        },
        {
          code: "style.invalidTokenValue",
          message: "Token values must be strings or numbers.",
          path: "$.tokens.text.primary",
        },
      ]),
    );
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

  it("rejects environment and workspace persistence references without echoing payloads", () => {
    const manifest = createSafeManifest({
      tokens: {
        surface: {
          app: "process.env.PRIVATE_STYLE_TOKEN",
          panel: "NEXT_PUBLIC_SUPABASE_ANON_KEY=hidden-anon-payload",
        },
        text: {
          muted: "serializeActiveUiStateSnapshot hidden-snapshot-payload",
          primary: "workspace.themeConfig hidden-theme-payload",
          secondary: "queueThemeConfigCloudSync hidden-sync-payload",
        },
        workspace: {
          gridPrimary: "workspace_state_entities hidden-projection-payload",
        },
      },
    });
    manifest.source = {
      kind: "imported-draft",
      reference: ".env.local hidden-env-payload",
    };

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        {
          code: "style.forbidden.envFile",
          message: "Manifest contains a forbidden string value.",
          path: "$.source.reference",
        },
        {
          code: "style.forbidden.processEnv",
          message: "Manifest contains a forbidden string value.",
          path: "$.tokens.surface.app",
        },
        {
          code: "style.forbidden.anonKey",
          message: "Manifest contains a forbidden string value.",
          path: "$.tokens.surface.panel",
        },
        {
          code: "style.forbidden.snapshotSerializer",
          message: "Manifest contains a forbidden string value.",
          path: "$.tokens.text.muted",
        },
        {
          code: "style.forbidden.themeConfig",
          message: "Manifest contains a forbidden string value.",
          path: "$.tokens.text.primary",
        },
        {
          code: "style.forbidden.syncQueue",
          message: "Manifest contains a forbidden string value.",
          path: "$.tokens.text.secondary",
        },
        {
          code: "style.forbidden.workspaceProjection",
          message: "Manifest contains a forbidden string value.",
          path: "$.tokens.workspace.gridPrimary",
        },
      ]),
    );
    expect(JSON.stringify(report)).not.toContain("hidden-env-payload");
    expect(JSON.stringify(report)).not.toContain("PRIVATE_STYLE_TOKEN");
    expect(JSON.stringify(report)).not.toContain("hidden-anon-payload");
    expect(JSON.stringify(report)).not.toContain("hidden-snapshot-payload");
    expect(JSON.stringify(report)).not.toContain("hidden-theme-payload");
    expect(JSON.stringify(report)).not.toContain("hidden-sync-payload");
    expect(JSON.stringify(report)).not.toContain("hidden-projection-payload");
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

  it("rejects dynamic z-index and protected behavior class strings", () => {
    const manifest = createSafeManifest({
      tokens: {
        status: {
          danger: "nowheel",
          warning: "nopan",
        },
        surface: {
          app: "z-[9999]",
        },
        text: {
          primary: "pointer-events-none",
          secondary: "nodrag",
        },
      },
    });

    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        {
          code: "style.forbidden.dynamicZIndex",
          message: "Manifest contains a forbidden string value.",
          path: "$.tokens.surface.app",
        },
        {
          code: "style.forbidden.protectedBehaviorClass",
          message: "Manifest contains a forbidden string value.",
          path: "$.tokens.status.danger",
        },
        {
          code: "style.forbidden.protectedBehaviorClass",
          message: "Manifest contains a forbidden string value.",
          path: "$.tokens.status.warning",
        },
        {
          code: "style.forbidden.protectedBehaviorClass",
          message: "Manifest contains a forbidden string value.",
          path: "$.tokens.text.primary",
        },
        {
          code: "style.forbidden.protectedBehaviorClass",
          message: "Manifest contains a forbidden string value.",
          path: "$.tokens.text.secondary",
        },
      ]),
    );
    expect(JSON.stringify(report)).not.toContain("9999");
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

  it("rejects invalid recipe and adapter container shapes", () => {
    const invalidRecipes = createSafeManifest() as unknown as Record<
      string,
      unknown
    >;
    invalidRecipes.recipes = "not-recipe-data";

    const invalidAdapters = createSafeManifest() as unknown as Record<
      string,
      unknown
    >;
    invalidAdapters.adapters = "not-adapter-data";

    const invalidReactFlowAdapter = createSafeManifest() as unknown as Record<
      string,
      unknown
    >;
    invalidReactFlowAdapter.adapters = {
      reactFlow: "not-react-flow-adapter-data",
    };

    expect(validateNexusStyleManifestV1(invalidRecipes).errors).toContainEqual({
      code: "style.invalidRecipes",
      message: "recipes must be an object.",
      path: "$.recipes",
    });
    expect(validateNexusStyleManifestV1(invalidAdapters).errors).toContainEqual({
      code: "style.invalidAdapters",
      message: "adapters must be an object.",
      path: "$.adapters",
    });
    expect(
      validateNexusStyleManifestV1(invalidReactFlowAdapter).errors,
    ).toContainEqual({
      code: "style.invalidReactFlowAdapter",
      message: "reactFlow adapter must be an object.",
      path: "$.adapters.reactFlow",
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

  it("warns without rejecting when React Flow visual adapter slots are missing", () => {
    const manifest = createSafeManifest({
      adapters: {
        reactFlow: {
          background: {
            color: "surface.panel",
          },
        },
      },
    });
    const report = validateNexusStyleManifestV1(manifest);

    expect(report.accepted).toBe(true);
    expect(report.warnings).toEqual(
      expect.arrayContaining([
        {
          code: "style.incompleteReactFlowAdapter",
          message: "Recommended React Flow visual adapter slot is missing.",
          path: "$.adapters.reactFlow.controls",
        },
        {
          code: "style.incompleteReactFlowAdapter",
          message: "Recommended React Flow visual adapter slot is missing.",
          path: "$.adapters.reactFlow.minimap",
        },
      ]),
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
