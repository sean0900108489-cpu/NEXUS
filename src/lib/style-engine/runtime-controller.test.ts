import { describe, expect, it } from "vitest";

import {
  createNexusStylePreviewControllerV1,
  type NexusStylePreviewPatchV1,
  type NexusStyleVariableTargetV1,
} from "@/lib/style-engine";

describe("NEXUS Style Engine runtime preview controller", () => {
  it("previews a patch and returns an immutable active-session snapshot", () => {
    const target = createFakeVariableTarget({
      "--nexus-surface-app": "#030712",
    });
    const controller = createNexusStylePreviewControllerV1(target);
    const session = controller.preview(
      createPatch("first", {
        "--nexus-accent-primary": "#67e8f9",
        "--nexus-surface-app": "#020617",
      }),
    );

    session.appliedVariables["--nexus-surface-app"] = "mutated";

    expect(target.read()).toEqual({
      "--nexus-accent-primary": "#67e8f9",
      "--nexus-surface-app": "#020617",
    });
    expect(controller.getActivePreview()?.appliedVariables).toEqual({
      "--nexus-accent-primary": "#67e8f9",
      "--nexus-surface-app": "#020617",
    });
  });

  it("reverts the previous active session before previewing a new patch", () => {
    const target = createFakeVariableTarget({
      "--nexus-surface-app": "#030712",
    });
    const controller = createNexusStylePreviewControllerV1(target);

    controller.preview(
      createPatch("first", {
        "--nexus-accent-primary": "#67e8f9",
        "--nexus-surface-app": "#020617",
      }),
    );
    controller.preview(
      createPatch("second", {
        "--nexus-text-primary": "#f8fafc",
      }),
    );

    expect(target.read()).toEqual({
      "--nexus-surface-app": "#030712",
      "--nexus-text-primary": "#f8fafc",
    });
    expect(controller.getActivePreview()?.previewId).toBe("second");
  });

  it("reports no active session when reverting before any preview", () => {
    const target = createFakeVariableTarget({
      "--nexus-surface-app": "#030712",
    });
    const controller = createNexusStylePreviewControllerV1(target);

    expect(controller.revert()).toEqual({
      reasonCode: "style.preview.noActiveSession",
      reverted: false,
    });
    expect(controller.getActivePreview()).toBeNull();
    expect(target.read()).toEqual({
      "--nexus-surface-app": "#030712",
    });
  });

  it("rejects mismatched reverts and clears the active preview on match", () => {
    const target = createFakeVariableTarget({
      "--nexus-surface-app": "#030712",
    });
    const controller = createNexusStylePreviewControllerV1(target);

    controller.preview(
      createPatch("first", {
        "--nexus-surface-app": "#020617",
      }),
    );

    expect(controller.revert("other")).toEqual({
      reasonCode: "style.preview.sessionMismatch",
      reverted: false,
    });
    expect(target.read()).toEqual({
      "--nexus-surface-app": "#020617",
    });
    expect(controller.revert("first")).toEqual({
      reverted: true,
    });
    expect(controller.getActivePreview()).toBeNull();
    expect(target.read()).toEqual({
      "--nexus-surface-app": "#030712",
    });
    expect(controller.clearAll()).toEqual({
      reasonCode: "style.preview.noActiveSession",
      reverted: false,
    });
  });

  it("reverts the active preview when no preview id is provided", () => {
    const target = createFakeVariableTarget({
      "--nexus-surface-app": "#030712",
    });
    const controller = createNexusStylePreviewControllerV1(target);

    controller.preview(
      createPatch("first", {
        "--nexus-surface-app": "#020617",
      }),
    );

    expect(controller.revert()).toEqual({
      reverted: true,
    });
    expect(controller.getActivePreview()).toBeNull();
    expect(target.read()).toEqual({
      "--nexus-surface-app": "#030712",
    });
  });

  it("clearAll reverts the active preview session and clears it", () => {
    const target = createFakeVariableTarget({
      "--nexus-surface-app": "#030712",
      "--nexus-text-primary": "#e5e7eb",
    });
    const controller = createNexusStylePreviewControllerV1(target);

    controller.preview(
      createPatch("first", {
        "--nexus-accent-primary": "#67e8f9",
        "--nexus-surface-app": "#020617",
      }),
    );

    expect(controller.clearAll()).toEqual({
      reverted: true,
    });
    expect(controller.getActivePreview()).toBeNull();
    expect(target.read()).toEqual({
      "--nexus-surface-app": "#030712",
      "--nexus-text-primary": "#e5e7eb",
    });
  });
});

function createPatch(
  previewId: string,
  variables: Record<string, string>,
): NexusStylePreviewPatchV1 {
  return {
    manifestChecksum: "nexus-style-fnv1a32:00000001",
    manifestId: "legacy-cyberpunk",
    previewId,
    variables,
  };
}

function createFakeVariableTarget(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial));
  const target: NexusStyleVariableTargetV1 & {
    read: () => Record<string, string>;
  } = {
    read: () =>
      Object.fromEntries(
        [...values.entries()].sort(([left], [right]) => left.localeCompare(right)),
      ),
    style: {
      getPropertyValue: (name) => values.get(name) ?? "",
      removeProperty: (name) => {
        values.delete(name);
      },
      setProperty: (name, value) => {
        values.set(name, value);
      },
    },
  };

  return target;
}
