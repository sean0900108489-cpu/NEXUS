import { describe, expect, it } from "vitest";

import {
  createLegacyCyberpunkStyleManifestV1,
  createNexusStyleExportPackageV1,
  normalizeNexusStyleImportCandidateV1,
  redactNexusStyleReviewForExchangeV1,
  reviewNexusStylePackV1,
} from "@/lib/style-engine";

describe("NEXUS Style Engine import/export normalization", () => {
  it("creates a previewable V1 export package from a safe manifest", () => {
    const result = createNexusStyleExportPackageV1(
      createLegacyCyberpunkStyleManifestV1(),
    );

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected export package creation to pass.");
    }

    expect(result.exportPackage).toMatchObject({
      formatVersion: 1,
      kind: "nexus-style-pack",
      manifest: {
        id: "legacy-cyberpunk",
        schemaVersion: 1,
      },
      review: {
        adapterCoverage: {
          reactFlow: "complete",
        },
        compatibility: "compatible_with_warnings",
        manifestId: "legacy-cyberpunk",
        state: "warning",
      },
    });
    expect(result.exportPackage.review.checksums.normalizedManifest).toMatch(
      /^nexus-style-fnv1a32:[0-9a-f]{8}$/,
    );
    expect(result.exportPackage.review.checksums.compiledOutput).toMatch(
      /^nexus-style-fnv1a32:[0-9a-f]{8}$/,
    );
  });

  it("normalizes a V1 export package back to a manifest candidate", () => {
    const exported = createNexusStyleExportPackageV1(
      createLegacyCyberpunkStyleManifestV1(),
    );

    if (!exported.accepted) {
      throw new Error("Expected export package creation to pass.");
    }

    const imported = normalizeNexusStyleImportCandidateV1(
      exported.exportPackage,
    );

    expect(imported.accepted).toBe(true);

    if (!imported.accepted) {
      throw new Error("Expected import normalization to pass.");
    }

    expect(imported.source).toBe("export-package");
    expect(imported.manifest.id).toBe("legacy-cyberpunk");
    expect(Object.keys(imported.manifest.tokens)).toEqual([
      "accent",
      "blur",
      "border",
      "density",
      "motion",
      "radius",
      "shadow",
      "status",
      "surface",
      "text",
      "typography",
      "workspace",
    ]);
  });

  it("rejects unsafe imports without returning the unsafe manifest", () => {
    const manifest = createLegacyCyberpunkStyleManifestV1();

    manifest.tokens.surface.app = "service_role=super-secret-value";

    const imported = normalizeNexusStyleImportCandidateV1({
      formatVersion: 1,
      kind: "nexus-style-pack",
      manifest,
    });

    expect(imported.accepted).toBe(false);

    if (imported.accepted) {
      throw new Error("Expected unsafe import to fail.");
    }

    expect(imported.source).toBe("export-package");
    expect(imported.review.rejectionCodes).toContain("style.forbidden.serviceRole");
    expect("manifest" in imported).toBe(false);
    expect(JSON.stringify(imported)).not.toContain("super-secret-value");
  });

  it("redacts governance review fields for exchange output", () => {
    const review = reviewNexusStylePackV1(createLegacyCyberpunkStyleManifestV1());
    const redacted = redactNexusStyleReviewForExchangeV1(review);

    expect(redacted).not.toHaveProperty("governanceVersion");
    expect(redacted).toMatchObject({
      adapterCoverage: {
        reactFlow: "complete",
      },
      checksums: review.checksums,
      compatibility: review.compatibility,
      manifestId: "legacy-cyberpunk",
      state: "warning",
    });
  });
});
