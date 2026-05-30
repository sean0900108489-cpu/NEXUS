import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  compileNexusStyleManifestV1,
  createCyberpunkCompatibleSkinPackV2,
  createLegacyCyberpunkStyleManifestV1,
  createNexusStyleExportPackageV1,
  createNexusStylePreviewPatchV1,
  createOverBudgetSkinPackV2,
  createValidMinimalSkinPackV2,
  parseNexusSkinPackReviewImportTextV2,
  parseNexusStyleImportTextV1,
} from "@/lib/style-engine";

describe("NEXUS Style Engine V2 review-only import", () => {
  it("produces an accepted display-safe summary for a valid V2 fixture", () => {
    const result = parseNexusSkinPackReviewImportTextV2(
      JSON.stringify(createCyberpunkCompatibleSkinPackV2()),
    );

    expect(result.accepted).toBe(true);
    expect(result.summary.status).toBe("accepted");
    expect(result.summary.metadata.rows).toEqual(
      expect.arrayContaining([
        { label: "Status", value: "accepted" },
        { label: "Pack", value: "cyberpunk-compatible-skin" },
        { label: "Compatibility", value: "compatible_with_warnings" },
      ]),
    );
    expect(result.summary.assets.rows).toEqual(
      expect.arrayContaining([
        { label: "Binding", value: "referenced" },
        { label: "Asset Pack", value: "cyberpunk-safe-assets" },
      ]),
    );
    expect(result.summary.recipes.rows).toEqual(
      expect.arrayContaining([
        { label: "Registry", value: "recipe-registry-v1" },
        { label: "Group Count", value: "5" },
      ]),
    );
    expect(result.summary.layoutPreset.rows).toEqual(
      expect.arrayContaining([
        { label: "Binding", value: "referenced" },
        { label: "Preset", value: "compact-glass-ops" },
      ]),
    );
    expect(result.summary.performanceBudget.rows).toEqual(
      expect.arrayContaining([
        { label: "Contract", value: "performance-budget-validator-v1" },
      ]),
    );
  });

  it("produces a rejected redacted report for an invalid V2 fixture", () => {
    const result = parseNexusSkinPackReviewImportTextV2(
      JSON.stringify(createOverBudgetSkinPackV2()),
    );

    expect(result.accepted).toBe(false);
    expect(result.summary.status).toBe("rejected");
    expect(result.summary.metadata.rows).toEqual(
      expect.arrayContaining([
        { label: "Status", value: "rejected" },
        { label: "Pack", value: "redacted" },
        { label: "Manifest", value: "redacted" },
      ]),
    );
    expect(result.issues.map((issue) => issue.code)).toContain(
      "stylePack.staticBudgetExceeded",
    );
    expect(JSON.stringify(result)).not.toContain("Over Budget Skin");
    expect(JSON.stringify(result)).not.toContain("High Contrast Carbon");
  });

  it("does not expose unsafe rejected payload values", () => {
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
    candidate.workspace = {
      themeConfig: "hidden-workspace-payload",
    };

    const result = parseNexusSkinPackReviewImportTextV2(
      JSON.stringify(candidate),
    );
    const serialized = JSON.stringify(result);

    expect(result.accepted).toBe(false);
    expect(result.summary.status).toBe("rejected");
    expect(serialized).not.toContain("hiddenExecutable");
    expect(serialized).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(serialized).not.toContain("private.example");
    expect(serialized).not.toContain("hidden-workspace-payload");
  });

  it("does not generate a preview patch for the V2 review path", () => {
    const result = parseNexusSkinPackReviewImportTextV2(
      JSON.stringify(createCyberpunkCompatibleSkinPackV2()),
    );
    const helperSource = readFileSync(
      new URL("v2-review-import.ts", import.meta.url),
      "utf8",
    );
    const serialized = JSON.stringify(result);

    expect(result.accepted).toBe(true);
    expect(serialized).not.toContain("previewId");
    expect(serialized).not.toContain("appliedVariables");
    expect(helperSource).not.toContain("createNexusStylePreviewPatchV1");
    expect(helperSource).not.toContain("compileNexusStyleManifestV1");
    expect(helperSource).not.toContain("runtime");
  });

  it("keeps the existing V1 import and preview helpers intact", () => {
    const manifest = createLegacyCyberpunkStyleManifestV1();
    const exportResult = createNexusStyleExportPackageV1(manifest);

    expect(exportResult.accepted).toBe(true);

    if (!exportResult.accepted) {
      throw new Error("Expected V1 export package to be accepted.");
    }

    const parsed = parseNexusStyleImportTextV1(
      JSON.stringify(exportResult.exportPackage),
    );

    expect(parsed.accepted).toBe(true);

    if (!parsed.accepted) {
      throw new Error("Expected V1 import text to be accepted.");
    }

    const compiled = compileNexusStyleManifestV1(parsed.manifest);

    expect(compiled.accepted).toBe(true);

    if (!compiled.accepted) {
      throw new Error("Expected V1 manifest to compile.");
    }

    const previewPatch = createNexusStylePreviewPatchV1(compiled.style);

    expect(previewPatch.previewId).toContain(manifest.id);
    expect(Object.keys(previewPatch.variables).length).toBeGreaterThan(0);
  });
});
