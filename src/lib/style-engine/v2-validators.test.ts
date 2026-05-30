import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  createCyberpunkCompatibleSkinPackV2,
  createInvalidBehaviorRecipeRegistryV1,
  createInvalidLayoutPresetV1,
  createInvalidUnsafeAssetPackV1,
  createOverBudgetSkinPackV2,
  createUnsupportedVersionSkinPackV2,
  createValidAssetPackV1,
  createValidLayoutPresetV1,
  createValidMinimalSkinPackV2,
  createValidPerformanceBudgetV1,
  createValidRecipeRegistryV1,
  validateNexusAssetPackV1,
  validateNexusLayoutPresetV1,
  validateNexusPerformanceBudgetV1,
  validateNexusRecipeRegistryV1,
  validateNexusSkinPackV2,
} from "@/lib/style-engine";

describe("NEXUS Style Engine V2 pure validators", () => {
  it("accepts valid minimal and cyberpunk-compatible skin packs", () => {
    const minimal = validateNexusSkinPackV2(createValidMinimalSkinPackV2());
    const cyberpunk = validateNexusSkinPackV2(createCyberpunkCompatibleSkinPackV2());

    expect(minimal.errors).toEqual([]);
    expect(minimal.accepted).toBe(true);
    expect(minimal.skinPack?.id).toBe("minimal-carbon-skin");
    expect(minimal.totals?.cssVariableCount).toBeGreaterThan(0);

    expect(cyberpunk.accepted).toBe(true);
    expect(cyberpunk.errors).toEqual([]);
    expect(cyberpunk.skinPack?.id).toBe("cyberpunk-compatible-skin");
  });

  it("accepts valid asset, recipe registry, layout, and performance contracts", () => {
    expect(validateNexusAssetPackV1(createValidAssetPackV1()).accepted).toBe(true);
    expect(validateNexusRecipeRegistryV1(createValidRecipeRegistryV1()).accepted).toBe(true);
    const layout = validateNexusLayoutPresetV1(createValidLayoutPresetV1());
    expect(layout.errors).toEqual([]);
    expect(layout.accepted).toBe(true);
    const performance = validateNexusPerformanceBudgetV1(createValidPerformanceBudgetV1());
    expect(performance.errors).toEqual([]);
    expect(performance.accepted).toBe(true);
  });

  it("fails closed for unsupported skin pack versions without returning a pack", () => {
    const report = validateNexusSkinPackV2(createUnsupportedVersionSkinPackV2());

    expect(report.accepted).toBe(false);
    expect(report.skinPack).toBeUndefined();
    expect(report.errors).toContainEqual({
      code: "stylePack.unsupportedSchemaVersion",
      message: "Skin pack schemaVersion must be 2.",
      path: "$.schemaVersion",
    });
  });

  it("fails closed for missing metadata and forbidden top-level fields", () => {
    const candidate = createValidMinimalSkinPackV2() as unknown as Record<string, unknown>;
    delete candidate.metadata;
    candidate.workspace = {
      themeConfig: "hidden-workspace-payload",
    };

    const report = validateNexusSkinPackV2(candidate);

    expect(report.accepted).toBe(false);
    expect(report.skinPack).toBeUndefined();
    expect(report.errors).toEqual(
      expect.arrayContaining([
        {
          code: "stylePack.missingField",
          message: "Required field is missing.",
          path: "$.metadata",
        },
        {
          code: "stylePack.unknownTopLevelField",
          message: "Unknown top-level fields are not allowed.",
          path: "$.workspace",
        },
      ]),
    );
    expect(JSON.stringify(report)).not.toContain("hidden-workspace-payload");
  });

  it("rejects unsafe asset URLs, paths, MIME, size, hash, dimensions, and platform strings", () => {
    const report = validateNexusAssetPackV1(createInvalidUnsafeAssetPackV1());

    expect(report.accepted).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "assetPack.unsupportedMime",
        "assetPack.missingAssetSize",
        "assetPack.missingAssetHash",
        "assetPack.unsafeAssetReference",
        "assetPack.imageDimensionsExceeded",
        "contract.forbiddenPlatformReference",
        "contract.forbiddenString",
      ]),
    );
    expect(JSON.stringify(report)).not.toContain("private.example");
    expect(JSON.stringify(report)).not.toContain("hidden-token");
    expect(JSON.stringify(report)).not.toContain("service-role hidden");
  });

  it("rejects recipe registry slots that attempt to control behavior", () => {
    const report = validateNexusRecipeRegistryV1(createInvalidBehaviorRecipeRegistryV1());

    expect(report.accepted).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        {
          code: "recipeRegistry.forbiddenSlot",
          message: "Recipe slot attempts to control behavior.",
          path: "$.groups.button.slots[4].slotId",
        },
        {
          code: "recipeRegistry.nonVisualSlot",
          message: "Recipe slots must be visual-only.",
          path: "$.groups.button.slots[4].visualOnly",
        },
      ]),
    );
  });

  it("rejects layout presets that claim protected behavior, z-index, store, or sync authority", () => {
    const report = validateNexusLayoutPresetV1(createInvalidLayoutPresetV1());

    expect(report.accepted).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "layoutPreset.unknownTopLevelField",
        "layoutPreset.protectedField",
        "contract.forbiddenPlatformReference",
      ]),
    );
    expect(JSON.stringify(report)).not.toContain("hidden-layout-payload");
  });

  it("rejects over-budget skin packs without returning manifest data", () => {
    const report = validateNexusSkinPackV2(createOverBudgetSkinPackV2());

    expect(report.accepted).toBe(false);
    expect(report.skinPack).toBeUndefined();
    expect(report.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining(["stylePack.staticBudgetExceeded"]),
    );
    expect(JSON.stringify(report)).not.toContain("High Contrast Carbon");
  });

  it("rejects executable strings, raw CSS, and service role references in skin pack metadata", () => {
    const candidate = createValidMinimalSkinPackV2() as unknown as Record<string, unknown>;
    candidate.metadata = {
      displayName: '<script>hiddenExecutable()</script>',
      lifecycle: "validated",
      source: "built-in",
      tags: [
        "body { display: none; }",
        ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_"),
      ],
    };

    const report = validateNexusSkinPackV2(candidate);

    expect(report.accepted).toBe(false);
    expect(report.skinPack).toBeUndefined();
    expect(report.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "contract.forbiddenExecutable",
        "contract.forbiddenCss",
        "contract.forbiddenPlatformReference",
      ]),
    );
    expect(JSON.stringify(report)).not.toContain("hiddenExecutable");
    expect(JSON.stringify(report)).not.toContain("display: none");
  });

  it("keeps V2 modules free of runtime UI, DOM, store, backend, Supabase, and React Flow imports", () => {
    const files = [
      "v2-contracts.ts",
      "v2-fixtures.ts",
      "v2-validators.ts",
    ];
    const forbiddenImportOrRuntimeUse = [
      /from\s+["']@\/components\//,
      /from\s+["']@\/app\//,
      /from\s+["']@\/store\//,
      /from\s+["']@\/lib\/backend\//,
      /from\s+["']@\/lib\/supabase\//,
      /from\s+["']@supabase\//,
      /from\s+["']@xyflow\//,
      /\bdocument\./,
      /\bwindow\./,
      /\blocalStorage\b/,
      /\bindexedDB\b/,
    ];

    for (const file of files) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");

      for (const pattern of forbiddenImportOrRuntimeUse) {
        expect(source, `${file} should not match ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
