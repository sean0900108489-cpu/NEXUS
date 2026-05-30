import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  compileNexusSkinPackTokenPreviewTextV2,
  compileNexusSkinPackTokenPreviewV2,
  createCyberpunkCompatibleSkinPackV2,
  createOverBudgetSkinPackV2,
  createPixelWorkshopSkinPackV2,
  createValidMinimalSkinPackV2,
} from "@/lib/style-engine";

describe("NEXUS Style Engine V2 token-only preview compiler", () => {
  it("compiles a valid V2 fixture into a token-only preview patch", () => {
    const result = compileNexusSkinPackTokenPreviewV2(
      createCyberpunkCompatibleSkinPackV2(),
    );

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected V2 token preview to be accepted.");
    }

    expect(result.patch.previewId).toContain("token-only");
    expect(result.patch.manifestId).toBe("legacy-cyberpunk");
    expect(result.report.variableCount).toBeGreaterThan(0);
    expect(result.report.omitted.assets).toBe(true);
    expect(result.report.omitted.recipes).toBe(true);
    expect(result.report.omitted.layoutPreset).toBe(true);
    expect(Object.keys(result.patch.variables)).toEqual(
      expect.arrayContaining([
        "--nexus-surface-app",
        "--nexus-text-primary",
        "--nexus-accent-primary",
      ]),
    );
  });

  it("fails closed for an invalid V2 fixture", () => {
    const result = compileNexusSkinPackTokenPreviewV2(
      createOverBudgetSkinPackV2(),
    );

    expect(result.accepted).toBe(false);
    expect("patch" in result).toBe(false);
    expect("skinPack" in result).toBe(false);
    expect(result.report.errors.map((issue) => issue.code)).toContain(
      "stylePack.staticBudgetExceeded",
    );
    expect(JSON.stringify(result)).not.toContain("Over Budget Skin");
    expect(JSON.stringify(result)).not.toContain("High Contrast Carbon");
  });

  it("keeps asset, recipe, layout, adapter, and legacy data out of the preview patch", () => {
    const result = compileNexusSkinPackTokenPreviewV2(
      createCyberpunkCompatibleSkinPackV2(),
    );

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected V2 token preview to be accepted.");
    }

    const serializedVariables = JSON.stringify(result.patch.variables);
    const variableNames = Object.keys(result.patch.variables);

    expect(variableNames.every((name) => name.startsWith("--nexus-"))).toBe(true);
    expect(variableNames.some((name) => name.startsWith("--nexus-recipe-"))).toBe(false);
    expect(variableNames.some((name) => name.startsWith("--nexus-graph-"))).toBe(false);
    expect(variableNames.some((name) => name.startsWith("--bg-"))).toBe(false);
    expect(serializedVariables).not.toContain("cyberpunk-safe-assets");
    expect(serializedVariables).not.toContain("cyberpunk-action-icon");
    expect(serializedVariables).not.toContain("compact-glass-ops");
    expect(serializedVariables).not.toContain("surface.panel");
  });

  it("compiles the pixel workshop fixture into scoped token variables", () => {
    const result = compileNexusSkinPackTokenPreviewV2(
      createPixelWorkshopSkinPackV2(),
    );

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected pixel workshop token preview to be accepted.");
    }

    expect(result.patch.manifestId).toBe("pixel-workshop");
    expect(result.patch.variables["--nexus-accent-primary"]).toBe("#45f0d7");
    expect(result.patch.variables["--nexus-radius-surface"]).toBe("0px");
    expect(result.report.omitted.assets).toBe(true);
    expect(result.report.omitted.layoutPreset).toBe(true);
    expect(JSON.stringify(result.patch.variables)).not.toContain(
      "pixel-workshop-panel-texture",
    );
    expect(JSON.stringify(result.patch.variables)).not.toContain(
      "pixel-workshop-compact",
    );
  });

  it("only emits variables from requested token groups", () => {
    const skinPack = createValidMinimalSkinPackV2();
    skinPack.tokens.manifestTokenGroups = ["surface", "accent"];

    const result = compileNexusSkinPackTokenPreviewV2(skinPack);

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected V2 token preview to be accepted.");
    }

    const variableNames = Object.keys(result.patch.variables);

    expect(variableNames.length).toBeGreaterThan(0);
    expect(
      variableNames.every(
        (name) =>
          name.startsWith("--nexus-accent-") ||
          name.startsWith("--nexus-surface-"),
      ),
    ).toBe(true);
  });

  it("fails closed for rejected text without returning unsafe payload", () => {
    const candidate = createValidMinimalSkinPackV2() as unknown as Record<
      string,
      unknown
    >;

    candidate.metadata = {
      displayName: "<script>hiddenExecutable()</script>",
      lifecycle: "validated",
      source: "built-in",
      tags: ["SUPABASE_SERVICE_ROLE_KEY", "https://private.example/secret"],
    };

    const result = compileNexusSkinPackTokenPreviewTextV2(
      JSON.stringify(candidate),
    );
    const serialized = JSON.stringify(result);

    expect(result.accepted).toBe(false);
    expect("patch" in result).toBe(false);
    expect("skinPack" in result).toBe(false);
    expect(serialized).not.toContain("hiddenExecutable");
    expect(serialized).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(serialized).not.toContain("private.example");
  });

  it("keeps the token preview module free of runtime, store, backend, and Supabase coupling", () => {
    const source = readFileSync(
      new URL("v2-token-preview.ts", import.meta.url),
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
      expect(source, `v2-token-preview.ts should not match ${pattern}`).not.toMatch(pattern);
    }
  });
});
