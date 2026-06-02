import { describe, expect, it } from "vitest";

import {
  compileNexusStyleManifestV1,
  createBaselineSurfaceShellStyleManifestV1,
  createNexusStylePreviewPatchV1,
  getNexusStylePackPermissionsV1,
  reviewNexusStylePackV1,
} from "@/lib/style-engine";

describe("NEXUS Style Engine governance review", () => {
  it("marks warning manifests as previewable but not directly applyable", () => {
    const review = reviewNexusStylePackV1(createBaselineSurfaceShellStyleManifestV1());

    expect(review).toMatchObject({
      adapterCoverage: {
        reactFlow: "complete",
        windowModal: "complete",
      },
      compatibility: "compatible_with_warnings",
      compilerVersion: "nexus-style-compiler-v1",
      governanceVersion: "nexus-style-governance-v1",
      manifestId: "baseline-surface-shell",
      manifestVersion: 1,
      permissions: {
        canApply: false,
        canPreview: true,
        reasonCodes: ["style.pack.warningRequiresReview"],
      },
      previewVariableCount: expect.any(Number),
      state: "warning",
      validatorVersion: "nexus-style-validator-v1",
    });
    expect(review.previewVariableCount).toBeGreaterThan(0);
    expect(review.adapterCoverage?.windowModal).toBe("complete");
    expect(review.checksums.normalizedManifest).toMatch(
      /^nexus-style-fnv1a32:[0-9a-f]{8}$/,
    );
    expect(review.checksums.compiledOutput).toMatch(
      /^nexus-style-fnv1a32:[0-9a-f]{8}$/,
    );
    expect(review.checksums.report).toMatch(/^nexus-style-fnv1a32:[0-9a-f]{8}$/);
  });

  it("marks warning-free manifests as validated and applyable", () => {
    const manifest = createBaselineSurfaceShellStyleManifestV1();

    manifest.intent.contrast = "high";

    const review = reviewNexusStylePackV1(manifest);

    expect(review.state).toBe("validated");
    expect(review.compatibility).toBe("compatible");
    expect(review.permissions).toEqual({
      canApply: true,
      canPreview: true,
      reasonCodes: [],
    });
    expect(review.validation.warningCount).toBe(0);
  });

  it("keeps preview variable count aligned with the actual preview patch", () => {
    const manifest = createBaselineSurfaceShellStyleManifestV1();
    const review = reviewNexusStylePackV1(manifest);
    const compiled = compileNexusStyleManifestV1(manifest);

    if (!compiled.accepted) {
      throw new Error("Expected preset to compile.");
    }

    const patch = createNexusStylePreviewPatchV1(compiled.style);

    expect(review.previewVariableCount).toBe(Object.keys(patch.variables).length);
  });

  it("rejects unsafe manifests without echoing unsafe values", () => {
    const manifest = createBaselineSurfaceShellStyleManifestV1();

    manifest.tokens.surface.app = "service_role=super-secret-value";

    const review = reviewNexusStylePackV1(manifest);

    expect(review.state).toBe("rejected");
    expect(review.compatibility).toBe("incompatible");
    expect(review.permissions).toEqual({
      canApply: false,
      canPreview: false,
      reasonCodes: ["style.pack.rejected"],
    });
    expect(review.rejectionCodes).toContain("style.forbidden.serviceRole");
    expect(review.validatorVersion).toBe("nexus-style-validator-v1");
    expect(review.checksums.normalizedManifest).toBeUndefined();
    expect(review.checksums.compiledOutput).toBeUndefined();
    expect(review).not.toHaveProperty("adapterCoverage");
    expect(review).not.toHaveProperty("previewVariableCount");
    expect(JSON.stringify(review)).not.toContain("super-secret-value");
  });

  it("rejects compiler-failed manifests without preview metadata", () => {
    const manifest = createBaselineSurfaceShellStyleManifestV1();

    manifest.intent.contrast = "high";
    manifest.constraints.maxCssVariableCount = 1;

    const review = reviewNexusStylePackV1(manifest);

    expect(review.state).toBe("rejected");
    expect(review.compatibility).toBe("incompatible");
    expect(review.permissions).toEqual({
      canApply: false,
      canPreview: false,
      reasonCodes: ["style.pack.rejected"],
    });
    expect(review.rejectionCodes).toContain("style.variableCountExceeded");
    expect(review.validation.accepted).toBe(false);
    expect(review.checksums.normalizedManifest).toBeUndefined();
    expect(review.checksums.compiledOutput).toBeUndefined();
    expect(review).not.toHaveProperty("adapterCoverage");
    expect(review).not.toHaveProperty("previewVariableCount");
  });

  it("maps non-active lifecycle states to conservative permissions", () => {
    expect(getNexusStylePackPermissionsV1("draft")).toEqual({
      canApply: false,
      canPreview: false,
      reasonCodes: ["style.pack.draftNotValidated"],
    });
    expect(getNexusStylePackPermissionsV1("deprecated")).toEqual({
      canApply: false,
      canPreview: true,
      reasonCodes: ["style.pack.deprecated"],
    });
    expect(getNexusStylePackPermissionsV1("retired")).toEqual({
      canApply: false,
      canPreview: false,
      reasonCodes: ["style.pack.retired"],
    });
    expect(getNexusStylePackPermissionsV1("quarantined")).toEqual({
      canApply: false,
      canPreview: false,
      reasonCodes: ["style.pack.quarantined"],
    });
    expect(getNexusStylePackPermissionsV1("rejected")).toEqual({
      canApply: false,
      canPreview: false,
      reasonCodes: ["style.pack.rejected"],
    });
  });
});
