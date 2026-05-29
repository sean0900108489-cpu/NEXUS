import { describe, expect, it } from "vitest";

import {
  revertNexusStyleVariablePreviewV1,
  startNexusStyleVariablePreviewV1,
  type NexusStylePreviewPatchV1,
  type NexusStyleVariableTargetV1,
} from "@/lib/style-engine";

describe("NEXUS Style Engine runtime variable target", () => {
  it("applies a preview patch to a provided style target and records previous values", () => {
    const target = createFakeVariableTarget({
      "--nexus-surface-app": "#030712",
    });
    const session = startNexusStyleVariablePreviewV1(target, createPatch());

    expect(target.read()).toEqual({
      "--nexus-accent-primary": "#67e8f9",
      "--nexus-surface-app": "#020617",
    });
    expect(session).toEqual({
      appliedVariables: {
        "--nexus-accent-primary": "#67e8f9",
        "--nexus-surface-app": "#020617",
      },
      manifestChecksum: "nexus-style-fnv1a32:00000001",
      manifestId: "legacy-cyberpunk",
      previewId: "legacy-cyberpunk:nexus-style-fnv1a32:00000001",
      previousVariables: {
        "--nexus-accent-primary": undefined,
        "--nexus-surface-app": "#030712",
      },
    });
  });

  it("reverts a preview session without touching unrelated variables", () => {
    const target = createFakeVariableTarget({
      "--nexus-surface-app": "#030712",
      "--unrelated": "keep-me",
    });
    const session = startNexusStyleVariablePreviewV1(target, createPatch());

    revertNexusStyleVariablePreviewV1(target, session);

    expect(target.read()).toEqual({
      "--nexus-surface-app": "#030712",
      "--unrelated": "keep-me",
    });
  });
});

function createPatch(): NexusStylePreviewPatchV1 {
  return {
    manifestChecksum: "nexus-style-fnv1a32:00000001",
    manifestId: "legacy-cyberpunk",
    previewId: "legacy-cyberpunk:nexus-style-fnv1a32:00000001",
    variables: {
      "--nexus-surface-app": "#020617",
      "--nexus-accent-primary": "#67e8f9",
    },
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
