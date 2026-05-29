import { describe, expect, it } from "vitest";

import {
  applyNexusStylePreviewPatchV1,
  compileNexusStyleManifestV1,
  createLegacyCyberpunkStyleManifestV1,
  createNexusStylePreviewPatchV1,
  revertNexusStylePreviewPatchV1,
} from "@/lib/style-engine";

describe("NEXUS Style Engine local preview patch", () => {
  it("creates a deterministic patch from compiled output", () => {
    const compiled = compilePreset();
    const first = createNexusStylePreviewPatchV1(compiled);
    const second = createNexusStylePreviewPatchV1(structuredClone(compiled));

    expect(first).toEqual(second);
    expect(first.previewId).toBe(`${compiled.manifestId}:${compiled.manifestChecksum}`);
    expect(first.variables).toMatchObject({
      "--bg-base": "var(--nexus-surface-app)",
      "--nexus-surface-app": "#030712",
      "--nexus-text-primary": "#f8fafc",
    });
  });

  it("applies and reverts without mutating the current variable record", () => {
    const patch = createNexusStylePreviewPatchV1(compilePreset());
    const current = {
      "--nexus-surface-app": "#111111",
      "--unrelated": "keep-me",
    };
    const before = structuredClone(current);
    const applied = applyNexusStylePreviewPatchV1(current, patch);

    expect(current).toEqual(before);
    expect(applied.nextVariables).toMatchObject({
      "--nexus-surface-app": "#030712",
      "--unrelated": "keep-me",
    });
    expect(applied.previousVariables).toMatchObject({
      "--nexus-surface-app": "#111111",
    });

    const reverted = revertNexusStylePreviewPatchV1(
      applied.nextVariables,
      applied.previousVariables,
    );

    expect(reverted).toEqual(before);
  });

  it("removes newly introduced variables on revert", () => {
    const patch = createNexusStylePreviewPatchV1(compilePreset());
    const applied = applyNexusStylePreviewPatchV1({}, patch);
    const reverted = revertNexusStylePreviewPatchV1(
      applied.nextVariables,
      applied.previousVariables,
    );

    expect(Object.keys(applied.nextVariables).length).toBeGreaterThan(0);
    expect(reverted).toEqual({});
  });
});

function compilePreset() {
  const result = compileNexusStyleManifestV1(createLegacyCyberpunkStyleManifestV1());

  if (!result.accepted) {
    throw new Error("Expected preset to compile.");
  }

  return result.style;
}
