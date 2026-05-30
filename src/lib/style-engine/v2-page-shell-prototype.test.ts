import { describe, expect, it } from "vitest";

import {
  NEXUS_WORKSPACE_LAYOUT_SLOT_IDS_V1,
  createDefaultWorkspaceLayoutPresetV1,
  createDefaultWorkspacePageShellFeatureMountPlanV1,
  createInvalidUnsafePageShellFeatureMountPlanV1,
  createInvalidUnsafeWorkspaceLayoutPresetV1,
  createLeftRightSwappedWorkspaceLayoutPresetV1,
  createNexusPageShellPrototypeV1,
  createPageShellFeatureMountPlanV1,
  createPageShellLayoutPresetV1,
  createTopBottomSwappedWorkspaceLayoutPresetV1,
  validateNexusPageShellFeatureMountPlanV1,
  validateNexusWorkspaceLayoutPresetV1,
} from "@/lib/style-engine";

function createPrototype(
  layoutPreset: unknown,
  featurePlan: unknown,
) {
  return createNexusPageShellPrototypeV1({
    featurePlanResult: validateNexusPageShellFeatureMountPlanV1(featurePlan),
    layoutResult: validateNexusWorkspaceLayoutPresetV1(layoutPreset),
  });
}

describe("NEXUS isolated page shell prototype", () => {
  it("creates a home shell display model", () => {
    const result = createPrototype(
      createPageShellLayoutPresetV1("home"),
      createPageShellFeatureMountPlanV1("home"),
    );

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected home page shell prototype to be accepted.");
    }

    expect(result.prototype.pageShell).toBe("home");
    expect(result.prototype.protectedBoundary).toBe(
      "style-lab-only-production-layout-blocked",
    );
    expect(result.prototype.featurePlacementSummary).toContainEqual({
      featureId: "home-overview",
      label: "Home Overview",
      mode: "review-only",
      regionId: "main",
      slotId: "home",
    });
  });

  it("creates a workspace shell display model", () => {
    const result = createPrototype(
      createDefaultWorkspaceLayoutPresetV1(),
      createDefaultWorkspacePageShellFeatureMountPlanV1(),
    );

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected workspace page shell prototype to be accepted.");
    }

    expect(result.prototype.pageShell).toBe("workspace");
    expect(result.prototype.regions.find((region) => region.regionId === "main"))
      .toMatchObject({
        slots: [
          {
            features: [
              {
                featureId: "workspace-primary-canvas",
                label: "Workspace Primary Canvas",
                mode: "review-only",
              },
            ],
            label: "Main Canvas",
            owner: "workspace-shell",
            slotId: "mainCanvas",
          },
        ],
      });
  });

  it("creates swapped arrangement display models", () => {
    const leftRight = createPrototype(
      createLeftRightSwappedWorkspaceLayoutPresetV1(),
      createDefaultWorkspacePageShellFeatureMountPlanV1(),
    );
    const topBottom = createPrototype(
      createTopBottomSwappedWorkspaceLayoutPresetV1(),
      createDefaultWorkspacePageShellFeatureMountPlanV1(),
    );

    expect(leftRight.accepted).toBe(true);
    expect(topBottom.accepted).toBe(true);

    if (!leftRight.accepted || !topBottom.accepted) {
      throw new Error("Expected swapped page shell prototypes to be accepted.");
    }

    expect(leftRight.prototype.regions.find((region) => region.regionId === "left"))
      .toMatchObject({
        slots: [{ slotId: "rightInspector" }],
      });
    expect(leftRight.prototype.regions.find((region) => region.regionId === "right"))
      .toMatchObject({
        slots: [{ slotId: "leftSidebar" }],
      });
    expect(topBottom.prototype.regions.find((region) => region.regionId === "top"))
      .toMatchObject({
        slots: [{ slotId: "bottomBar" }],
      });
    expect(topBottom.prototype.regions.find((region) => region.regionId === "bottom"))
      .toMatchObject({
        slots: [{ slotId: "topBar" }],
      });
  });

  it("rejects unsafe or invalid inputs without leaking unsafe payload", () => {
    const unsafeLayout = createPrototype(
      createInvalidUnsafeWorkspaceLayoutPresetV1(),
      createDefaultWorkspacePageShellFeatureMountPlanV1(),
    );
    const unsafeFeaturePlan = createPrototype(
      createDefaultWorkspaceLayoutPresetV1(),
      createInvalidUnsafePageShellFeatureMountPlanV1(),
    );
    const serialized = JSON.stringify({ unsafeFeaturePlan, unsafeLayout });

    expect(unsafeLayout.accepted).toBe(false);
    expect(unsafeFeaturePlan.accepted).toBe(false);
    expect("prototype" in unsafeLayout).toBe(false);
    expect("prototype" in unsafeFeaturePlan).toBe(false);
    expect(serialized).not.toContain("hidden-layout-payload");
    expect(serialized).not.toContain("hidden-feature-mount-payload");
    expect(serialized).not.toContain("nexus-ops.tsx");
    expect(serialized).not.toContain("nexus-graph.tsx");
  });

  it("rejects mismatched page shell inputs", () => {
    const result = createPrototype(
      createPageShellLayoutPresetV1("home"),
      createPageShellFeatureMountPlanV1("settings"),
    );

    expect(result.accepted).toBe(false);
    expect(result.issues).toContainEqual({
      code: "pageShellPrototype.pageShellMismatch",
      message:
        "Layout preset and feature mount plan must target the same page shell.",
      path: "$.pageShell",
    });
  });

  it("reuses slot ids from the layout boundary registry", () => {
    const result = createPrototype(
      createDefaultWorkspaceLayoutPresetV1(),
      createDefaultWorkspacePageShellFeatureMountPlanV1(),
    );

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected workspace page shell prototype to be accepted.");
    }

    const approvedSlots = new Set(NEXUS_WORKSPACE_LAYOUT_SLOT_IDS_V1);
    const prototypeSlots = result.prototype.regions.flatMap((region) =>
      region.slots.map((slot) => slot.slotId),
    );

    expect(prototypeSlots.length).toBeGreaterThan(0);
    expect(prototypeSlots.every((slotId) => approvedSlots.has(slotId))).toBe(true);
  });
});
