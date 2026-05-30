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
          windowModal: "complete",
        },
        compatibility: "compatible_with_warnings",
        manifestId: "legacy-cyberpunk",
        previewVariableCount: expect.any(Number),
        state: "warning",
        validatorVersion: "nexus-style-validator-v1",
      },
    });
    expect(result.exportPackage.review.previewVariableCount).toBeGreaterThan(0);
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

  it("returns a cloned manifest for export package imports", () => {
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
      throw new Error("Expected export package import to pass.");
    }

    imported.manifest.tokens.surface.app = "#000000";

    expect(exported.exportPackage.manifest.tokens.surface.app).toBe("#030712");
  });

  it("normalizes a direct manifest candidate without an export package wrapper", () => {
    const imported = normalizeNexusStyleImportCandidateV1(
      createLegacyCyberpunkStyleManifestV1(),
    );

    expect(imported.accepted).toBe(true);

    if (!imported.accepted) {
      throw new Error("Expected direct manifest import to pass.");
    }

    expect(imported.source).toBe("manifest");
    expect(imported.manifest.id).toBe("legacy-cyberpunk");
    expect(imported.review).toMatchObject({
      compatibility: "compatible_with_warnings",
      manifestId: "legacy-cyberpunk",
      state: "warning",
      validatorVersion: "nexus-style-validator-v1",
    });
  });

  it("returns a cloned manifest for direct manifest imports", () => {
    const manifest = createLegacyCyberpunkStyleManifestV1();
    const imported = normalizeNexusStyleImportCandidateV1(manifest);

    expect(imported.accepted).toBe(true);

    if (!imported.accepted) {
      throw new Error("Expected direct manifest import to pass.");
    }

    imported.manifest.tokens.surface.app = "#000000";

    expect(manifest.tokens.surface.app).toBe("#030712");
  });

  it("refuses to create export packages for unsafe manifests", () => {
    const manifest = createLegacyCyberpunkStyleManifestV1();

    manifest.tokens.surface.app = "service_role=super-secret-value";

    const result = createNexusStyleExportPackageV1(manifest);

    expect(result.accepted).toBe(false);

    if (result.accepted) {
      throw new Error("Expected unsafe export package creation to fail.");
    }

    expect(result.review.rejectionCodes).toContain("style.forbidden.serviceRole");
    expect("exportPackage" in result).toBe(false);
    expect(JSON.stringify(result)).not.toContain("super-secret-value");
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

  it("rejects unknown import sources without returning a manifest", () => {
    const imported = normalizeNexusStyleImportCandidateV1("not-a-style-pack");

    expect(imported.accepted).toBe(false);

    if (imported.accepted) {
      throw new Error("Expected unknown import source to fail.");
    }

    expect(imported.source).toBe("unknown");
    expect(imported.review.rejectionCodes).toContain("style.invalidRoot");
    expect("manifest" in imported).toBe(false);
    expect(JSON.stringify(imported)).not.toContain("not-a-style-pack");
  });

  it("rejects unsupported export-package shapes as unknown sources", () => {
    const imported = normalizeNexusStyleImportCandidateV1({
      formatVersion: 999,
      kind: "nexus-style-pack",
      manifest: createLegacyCyberpunkStyleManifestV1(),
    });

    expect(imported.accepted).toBe(false);

    if (imported.accepted) {
      throw new Error("Expected unsupported export package to fail.");
    }

    expect(imported.source).toBe("unknown");
    expect("manifest" in imported).toBe(false);
  });

  it("redacts governance review fields for exchange output", () => {
    const review = reviewNexusStylePackV1(createLegacyCyberpunkStyleManifestV1());
    const redacted = redactNexusStyleReviewForExchangeV1(review);

    expect(redacted).not.toHaveProperty("governanceVersion");
    expect(redacted.validatorVersion).toBe("nexus-style-validator-v1");
    expect(redacted).toMatchObject({
      adapterCoverage: {
        reactFlow: "complete",
        windowModal: "complete",
      },
      checksums: review.checksums,
      compatibility: review.compatibility,
      manifestId: "legacy-cyberpunk",
      previewVariableCount: expect.any(Number),
      state: "warning",
    });
  });
});
