import { describe, expect, it } from "vitest";

import {
  NEXUS_WORKSPACE_LAYOUT_SLOT_IDS_V1,
  createDefaultWorkspaceLayoutPresetV1,
  createInvalidUnsafeWorkspaceLayoutPresetV1,
  createLeftRightSwappedWorkspaceLayoutPresetV1,
  createPageShellLayoutPresetV1,
  createTopBottomSwappedWorkspaceLayoutPresetV1,
  reviewNexusWorkspaceLayoutPresetTextV1,
  validateNexusWorkspaceLayoutPresetV1,
} from "@/lib/style-engine";

describe("NEXUS workspace layout slot boundary", () => {
  it("defines the stable slot ids needed for future page shell work", () => {
    expect(NEXUS_WORKSPACE_LAYOUT_SLOT_IDS_V1).toEqual([
      "home",
      "workspace",
      "topBar",
      "leftSidebar",
      "rightInspector",
      "mainCanvas",
      "bottomBar",
      "floatingWindows",
      "commandPalette",
      "settings",
      "styleLab",
    ]);
  });

  it("accepts the default workspace arrangement", () => {
    const result = validateNexusWorkspaceLayoutPresetV1(
      createDefaultWorkspaceLayoutPresetV1(),
    );

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected default workspace layout to be accepted.");
    }

    expect(result.summary.arrangement).toBe("default-workspace");
    expect(result.summary.pageShell).toBe("workspace");
    expect(result.summary.protectedBoundary).toBe("production-layout-blocked");
    expect(result.summary.regions).toContainEqual({
      regionId: "main",
      slots: ["mainCanvas"],
    });
  });

  it("accepts left/right and top/bottom swapped intents", () => {
    const leftRight = validateNexusWorkspaceLayoutPresetV1(
      createLeftRightSwappedWorkspaceLayoutPresetV1(),
    );
    const topBottom = validateNexusWorkspaceLayoutPresetV1(
      createTopBottomSwappedWorkspaceLayoutPresetV1(),
    );

    expect(leftRight.accepted).toBe(true);
    expect(topBottom.accepted).toBe(true);

    if (!leftRight.accepted || !topBottom.accepted) {
      throw new Error("Expected swapped layout intents to be accepted.");
    }

    expect(leftRight.summary.regions).toContainEqual({
      regionId: "left",
      slots: ["rightInspector"],
    });
    expect(leftRight.summary.regions).toContainEqual({
      regionId: "right",
      slots: ["leftSidebar"],
    });
    expect(topBottom.summary.regions).toContainEqual({
      regionId: "top",
      slots: ["bottomBar"],
    });
    expect(topBottom.summary.regions).toContainEqual({
      regionId: "bottom",
      slots: ["topBar"],
    });
  });

  it("accepts home, workspace, settings, and style lab page shell intents", () => {
    for (const pageShell of ["home", "workspace", "settings", "styleLab"] as const) {
      const result = validateNexusWorkspaceLayoutPresetV1(
        createPageShellLayoutPresetV1(pageShell),
      );

      expect(result.accepted).toBe(true);

      if (!result.accepted) {
        throw new Error(`Expected ${pageShell} shell to be accepted.`);
      }

      expect(result.summary.pageShell).toBe(pageShell);
    }
  });

  it("rejects unsafe fields without returning the rejected payload", () => {
    const result = validateNexusWorkspaceLayoutPresetV1(
      createInvalidUnsafeWorkspaceLayoutPresetV1(),
    );
    const serialized = JSON.stringify(result);

    expect(result.accepted).toBe(false);
    expect("preset" in result).toBe(false);
    expect(serialized).not.toContain("hidden-layout-payload");
    expect(serialized).not.toContain("nexus-ops.tsx");
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "workspaceLayout.unknownTopLevelField",
        "workspaceLayout.protectedField",
        "workspaceLayout.forbiddenString",
      ]),
    );
  });

  it("rejects unknown and duplicate slots", () => {
    const candidate = createLeftRightSwappedWorkspaceLayoutPresetV1() as unknown as {
      regions: Record<string, string[]>;
    };
    candidate.regions.left = ["leftSidebar", "unknownSlot"];
    candidate.regions.right = ["leftSidebar"];

    const result = validateNexusWorkspaceLayoutPresetV1(candidate);

    expect(result.accepted).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "workspaceLayout.unknownSlot",
        "workspaceLayout.duplicateSlot",
      ]),
    );
  });

  it("rejects arrangement mismatches", () => {
    const candidate = createLeftRightSwappedWorkspaceLayoutPresetV1() as unknown as {
      regions: Record<string, string[]>;
    };
    candidate.regions.left = ["leftSidebar"];
    candidate.regions.right = ["rightInspector"];

    const result = validateNexusWorkspaceLayoutPresetV1(candidate);

    expect(result.accepted).toBe(false);
    expect(result.issues).toContainEqual({
      code: "workspaceLayout.arrangementMismatch",
      message:
        "Left/right swapped intent must place rightInspector on the left and leftSidebar on the right.",
      path: "$.regions",
    });
  });

  it("reviews JSON text and fails closed for invalid JSON", () => {
    const accepted = reviewNexusWorkspaceLayoutPresetTextV1(
      JSON.stringify(createDefaultWorkspaceLayoutPresetV1()),
    );
    const rejected = reviewNexusWorkspaceLayoutPresetTextV1("{");

    expect(accepted.accepted).toBe(true);
    expect(rejected.accepted).toBe(false);
    expect(rejected.issues).toContainEqual({
      code: "workspaceLayout.reviewInvalidJson",
      message: "Layout preset review text must be valid JSON.",
      path: "$",
    });
  });
});
