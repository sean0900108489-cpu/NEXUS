import { describe, expect, it } from "vitest";

import {
  applyNexusStylePreviewPatchV1,
  compileNexusStyleManifestV1,
  createBaselineSurfaceShellStyleManifestV1,
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
      "--nexus-graph-background-color": "rgb(210 210 210 / 0.12)",
      "--nexus-graph-edge-selected-stroke": "#d4d4d4",
      "--nexus-graph-node-agent-surface": "rgb(20 20 20 / 0.78)",
      "--nexus-recipe-command-palette-item-active": "#e5e5e5",
      "--nexus-recipe-modal-surface": "rgb(20 20 20 / 0.78)",
      "--nexus-recipe-window-surface": "rgb(20 20 20 / 0.78)",
      "--nexus-surface-app": "#101010",
      "--nexus-text-primary": "#f5f5f5",
    });
    expect(Object.keys(first.variables)).not.toContain("nodesDraggable");
    expect(Object.keys(first.variables)).not.toContain("dragHandleClassName");
  });

  it("emits command palette variables from the command palette recipe group", () => {
    const manifest = createBaselineSurfaceShellStyleManifestV1();
    manifest.recipes.modal.surface = "surface.app";
    manifest.recipes.commandPalette.surface = "surface.panelMuted";
    manifest.recipes.commandPalette.itemActive = "accent.secondary";

    const result = compileNexusStyleManifestV1(manifest);

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected preset to compile.");
    }

    const patch = createNexusStylePreviewPatchV1(result.style);

    expect(patch.variables["--nexus-recipe-modal-surface"]).toBe("#101010");
    expect(patch.variables["--nexus-recipe-command-palette-surface"]).toBe(
      "rgb(18 18 18 / 0.62)",
    );
    expect(patch.variables["--nexus-recipe-command-palette-item-active"]).toBe(
      "#d4d4d4",
    );
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
      "--nexus-surface-app": "#101010",
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
  const result = compileNexusStyleManifestV1(createBaselineSurfaceShellStyleManifestV1());

  if (!result.accepted) {
    throw new Error("Expected preset to compile.");
  }

  return result.style;
}
