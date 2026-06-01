import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Nexus workspace production primitive", () => {
  it("keeps the workspace primitive anchored on the existing behavior-owned element", () => {
    const source = readNexusOpsSource();

    expect(source).toContain('ref={workspaceRef}');
    expect(source).toContain(
      'className="nexus-workspace nexus-scanline relative z-0 isolate min-h-0 min-w-0 flex-1 overflow-hidden border"',
    );
    expect(source).not.toContain("bg-slate-950/80 shadow-2xl");
    expect(source).toContain('viewMode === "panels"');
    expect(source).toContain("<NexusGraph");
  });

  it("has workspace aliases for surface, grid, border, shadow, and radius", () => {
    const css = readGlobalsCssSource();

    expect(css).toContain(".nexus-workspace");
    expect(css).toContain(".nexus-shell .nexus-workspace");
    expect(css).toContain("--nexus-workspace-bg");
    expect(css).toContain("--nexus-workspace-grid-primary");
    expect(css).toContain("--nexus-workspace-grid-secondary");
    expect(css).toContain("--nexus-workspace-wash");
    expect(css).toContain("--nexus-workspace-border");
    expect(css).toContain("--nexus-workspace-shadow");
    expect(css).toContain("--nexus-workspace-radius");
  });

  it("uses panel aliases and cyberpunk baselines as workspace chrome fallbacks", () => {
    const css = readGlobalsCssSource();

    expect(css).toContain(
      "var(--nexus-workspace-border, var(--nexus-panel-border, rgb(255 255 255 / 0.1)))",
    );
    expect(css).toContain(
      "var(--nexus-workspace-radius, var(--nexus-panel-radius, var(--surface-radius)))",
    );
    expect(css).toContain(
      "var(--nexus-workspace-shadow, var(--nexus-panel-shadow, 0 25px 50px -12px rgb(0 0 0 / 0.25)))",
    );
  });

  it("does not add layout, pointer, positioning, or z-index authority to the CSS primitive", () => {
    const css = readGlobalsCssSource();
    const workspaceChromeRule = css.match(
      /\.nexus-shell \.nexus-workspace \{[\s\S]*?\n\}/,
    )?.[0];

    expect(workspaceChromeRule).toBeTruthy();
    expect(workspaceChromeRule).not.toMatch(
      /\b(position|inset|top|right|bottom|left|z-index|pointer-events|overflow|display|width|height|min-width|min-height|max-width|max-height|flex|grid)\s*:/,
    );
  });
});

function readNexusOpsSource() {
  return readFileSync(new URL("nexus-ops.tsx", import.meta.url), "utf8");
}

function readGlobalsCssSource() {
  return readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
}
