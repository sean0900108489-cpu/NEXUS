import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  compileNexusSkinPackSpecimenPreviewV2,
  createNexusSkinPackSpecimenGalleryFromAcceptedPackV2,
  createOverBudgetSkinPackV2,
  createPixelWorkshopSkinPackV2,
  type NexusSkinPackV2,
} from "@/lib/style-engine";

const forbiddenStyleKeys = [
  "className",
  "style",
  "selector",
  "zIndex",
  "pointerEvents",
  "position",
  "overflow",
  "onClick",
  "onChange",
  "drag",
  "resize",
  "role",
  "tabIndex",
];

describe("NEXUS Style Engine V2 recipe specimen preview", () => {
  it("creates display-safe specimen styles from the Pixel fixture", () => {
    const result = compileNexusSkinPackSpecimenPreviewV2(
      createPixelWorkshopSkinPackV2(),
    );

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected Pixel fixture specimen preview to be accepted.");
    }

    expect(result.gallery.skinPackId).toBe("pixel-workshop-skin");
    expect(result.gallery.specimens.panel.style.background).toBe("#26331a");
    expect(result.gallery.specimens.buttonDefault.style.borderRadius).toBe("0px");
    expect(result.gallery.specimens.commandPalette.parts.activeItem.background).toBe("#45f0d7");
    expect(result.gallery.coverage.supportedSpecimens).toEqual(
      expect.arrayContaining([
        "panel",
        "buttonDefault",
        "input",
        "badgeStatus",
        "commandPalette",
        "agentWindow",
        "modalDialog",
        "sidebarDock",
      ]),
    );
  });

  it("fails closed for rejected packs without returning gallery styles", () => {
    const result = compileNexusSkinPackSpecimenPreviewV2(
      createOverBudgetSkinPackV2(),
    );
    const serialized = JSON.stringify(result);

    expect(result.accepted).toBe(false);
    expect("gallery" in result).toBe(false);
    expect(serialized).not.toContain("Over Budget Skin");
    expect(serialized).not.toContain("High Contrast Carbon");
  });

  it("falls back safely when a recipe group is missing", () => {
    const skinPack = createPixelWorkshopSkinPackV2() as NexusSkinPackV2;
    const recipes = skinPack.manifest.payload.recipes as unknown as Record<
      string,
      unknown
    >;

    delete recipes.dock;

    const result = createNexusSkinPackSpecimenGalleryFromAcceptedPackV2(skinPack);

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected direct accepted-pack gallery build.");
    }

    expect(result.gallery.specimens.sidebarDock.style.background).toBe("#161b10");
    expect(result.gallery.coverage.missingRecipeGroups).toContain("dock");
    expect(result.gallery.fallbacks.map((issue) => issue.code)).toContain(
      "specimenPreview.missingRecipe",
    );
  });

  it("does not emit raw CSS, selectors, or behavior class output", () => {
    const result = compileNexusSkinPackSpecimenPreviewV2(
      createPixelWorkshopSkinPackV2(),
    );

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected Pixel fixture specimen preview to be accepted.");
    }

    const styleObjects = Object.values(result.gallery.specimens).flatMap(
      (specimen) => [specimen.style, ...Object.values(specimen.parts)],
    );

    for (const style of styleObjects) {
      expect(Object.keys(style)).not.toEqual(
        expect.arrayContaining(forbiddenStyleKeys),
      );

      for (const value of Object.values(style)) {
        if (typeof value !== "string") {
          continue;
        }

        expect(value).not.toMatch(/[{}]/);
        expect(value).not.toMatch(/;\s*[-_a-z]+\s*:/i);
        expect(value).not.toMatch(/\burl\s*\(/i);
        expect(value).not.toMatch(/<script/i);
      }
    }
  });

  it("reports fallback for unsupported token references without crashing", () => {
    const skinPack = createPixelWorkshopSkinPackV2();

    skinPack.manifest.payload.recipes.button.hover.surface =
      "surface.missingToken";

    const result = createNexusSkinPackSpecimenGalleryFromAcceptedPackV2(skinPack);

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected direct accepted-pack gallery build.");
    }

    expect(result.gallery.specimens.buttonHover.style.background).toBe("#4c5b2d");
    expect(result.gallery.fallbacks.map((issue) => issue.code)).toContain(
      "specimenPreview.missingToken",
    );
  });

  it("keeps the specimen helper free of runtime, store, backend, and Supabase coupling", () => {
    const source = readFileSync(
      new URL("v2-recipe-specimen-preview.ts", import.meta.url),
      "utf8",
    );
    const forbidden = [
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
      /\bfetch\s*\(/,
      /emitReactFlowAdapterCssVariablesV1/,
      /emitWindowModalRecipeCssVariablesV1/,
    ];

    for (const pattern of forbidden) {
      expect(source, `v2-recipe-specimen-preview.ts should not match ${pattern}`).not.toMatch(pattern);
    }
  });
});
