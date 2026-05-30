import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  NEXUS_PAGE_SHELL_FEATURE_IDS_V1,
  NEXUS_PAGE_SHELL_FEATURE_REGISTRY_V1,
  createDefaultWorkspacePageShellFeatureMountPlanV1,
  createInvalidUnsafePageShellFeatureMountPlanV1,
  createPageShellFeatureMountPlanV1,
  reviewNexusPageShellFeatureMountPlanTextV1,
  validateNexusPageShellFeatureMountPlanV1,
} from "@/lib/style-engine";

describe("NEXUS page shell feature registry boundary", () => {
  it("defines approved feature ids as visual-slot-only entries", () => {
    expect(NEXUS_PAGE_SHELL_FEATURE_IDS_V1).toEqual([
      "home-overview",
      "workspace-top-bar",
      "workspace-left-navigation",
      "workspace-primary-canvas",
      "workspace-right-inspector",
      "workspace-bottom-status",
      "floating-window-layer",
      "command-palette-surface",
      "settings-surface",
      "style-lab-surface",
    ]);

    for (const featureId of NEXUS_PAGE_SHELL_FEATURE_IDS_V1) {
      expect(NEXUS_PAGE_SHELL_FEATURE_REGISTRY_V1[featureId]).toMatchObject({
        acceptsVisualSlotOnly: true,
        id: featureId,
        productionBehaviorProtected: true,
      });
    }
  });

  it("accepts the default workspace feature-to-slot plan", () => {
    const result = validateNexusPageShellFeatureMountPlanV1(
      createDefaultWorkspacePageShellFeatureMountPlanV1(),
    );

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected default workspace feature mounts to be accepted.");
    }

    expect(result.summary.pageShell).toBe("workspace");
    expect(result.summary.featureCount).toBe(7);
    expect(result.summary.protectedBoundary).toBe(
      "production-feature-mount-blocked",
    );
    expect(result.summary.features).toContainEqual({
      featureId: "workspace-primary-canvas",
      label: "Workspace Primary Canvas",
      mode: "review-only",
      slotId: "mainCanvas",
    });
  });

  it("accepts home, settings, style lab, and workspace page shell plans", () => {
    for (const pageShell of ["home", "settings", "styleLab", "workspace"] as const) {
      const result = validateNexusPageShellFeatureMountPlanV1(
        createPageShellFeatureMountPlanV1(pageShell),
      );

      expect(result.accepted).toBe(true);

      if (!result.accepted) {
        throw new Error(`Expected ${pageShell} feature mounts to be accepted.`);
      }

      expect(result.summary.pageShell).toBe(pageShell);
    }
  });

  it("rejects unknown, duplicate, and unsupported feature mounts", () => {
    const candidate = createDefaultWorkspacePageShellFeatureMountPlanV1() as unknown as {
      features: Array<Record<string, unknown>>;
    };
    candidate.features[0].slotId = "mainCanvas";
    candidate.features.push({
      featureId: "unknown-feature",
      mode: "review-only",
      slotId: "topBar",
    });
    candidate.features.push({
      featureId: "workspace-primary-canvas",
      mode: "review-only",
      slotId: "mainCanvas",
    });

    const result = validateNexusPageShellFeatureMountPlanV1(candidate);

    expect(result.accepted).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "pageShellFeature.duplicateFeature",
        "pageShellFeature.unknownFeature",
        "pageShellFeature.unsupportedSlot",
      ]),
    );
  });

  it("rejects features mounted into unsupported page shells", () => {
    const candidate = createPageShellFeatureMountPlanV1("home") as unknown as {
      features: Array<Record<string, unknown>>;
    };
    candidate.features.push({
      featureId: "workspace-right-inspector",
      mode: "review-only",
      slotId: "rightInspector",
    });

    const result = validateNexusPageShellFeatureMountPlanV1(candidate);

    expect(result.accepted).toBe(false);
    expect(result.issues).toContainEqual({
      code: "pageShellFeature.unsupportedPageShell",
      message: "Feature is not approved for this page shell.",
      path: "$.features[2].featureId",
    });
  });

  it("rejects unsafe fields without returning the rejected payload", () => {
    const result = validateNexusPageShellFeatureMountPlanV1(
      createInvalidUnsafePageShellFeatureMountPlanV1(),
    );
    const serialized = JSON.stringify(result);

    expect(result.accepted).toBe(false);
    expect("plan" in result).toBe(false);
    expect(serialized).not.toContain("hidden-feature-mount-payload");
    expect(serialized).not.toContain("nexus-ops.tsx");
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "pageShellFeature.duplicateFeature",
        "pageShellFeature.protectedField",
        "pageShellFeature.unknownTopLevelField",
        "pageShellFeature.forbiddenString",
      ]),
    );
  });

  it("reviews JSON text and fails closed for invalid JSON", () => {
    const accepted = reviewNexusPageShellFeatureMountPlanTextV1(
      JSON.stringify(createDefaultWorkspacePageShellFeatureMountPlanV1()),
    );
    const rejected = reviewNexusPageShellFeatureMountPlanTextV1("{");

    expect(accepted.accepted).toBe(true);
    expect(rejected.accepted).toBe(false);
    expect(rejected.issues).toContainEqual({
      code: "pageShellFeature.reviewInvalidJson",
      message: "Feature mount plan review text must be valid JSON.",
      path: "$",
    });
  });

  it("keeps the registry free of production UI and runtime platform imports", () => {
    const source = readFileSync(
      new URL("v2-page-shell-feature-registry.ts", import.meta.url),
      "utf8",
    );
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

    for (const pattern of forbiddenImportOrRuntimeUse) {
      expect(source, `registry should not match ${pattern}`).not.toMatch(pattern);
    }
  });
});
