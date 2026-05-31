import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Nexus Style Lab production chrome smoke harness", () => {
  it("renders the isolated production chrome smoke panel and target selectors", () => {
    const source = readStyleLabSource();

    expect(source).toContain("Production Chrome Smoke");
    expect(source).toContain('data-testid="production-chrome-smoke-panel"');
    expect(source).toContain('data-testid="production-chrome-smoke-target"');
    expect(source).toContain("nexus-shell grid min-w-0 gap-3");
    expect(source).toContain("nexus-agent-window");
    expect(source).toContain("nexus-drag-handle");
    expect(source).toContain("nexus-top-bar-frame");
    expect(source).toContain("nexus-right-floating-dock-rail");
    expect(source).toContain("nexus-command-palette-shell");
    expect(source).toContain("nexus-agent-branch-modal-shell");
    expect(source).toContain("nexus-datapad-shell");
    expect(source).toContain("datapad-drag-handle");
    expect(source).toContain("nexus-workspace");
    expect(source).toContain("nexus-message-bubble");
    expect(source).toContain("nexus-message-bubble-user");
    expect(source).toContain("nexus-message-bubble-assistant");
    expect(source).toContain("nexus-message-bubble-tool");
    expect(source).toContain(
      'data-testid="production-chrome-smoke-command-palette"',
    );
    expect(source).toContain(
      'data-testid="production-chrome-smoke-modal-dialog"',
    );
    expect(source).toContain(
      'data-testid="production-chrome-smoke-datapad"',
    );
  });

  it("applies and reverts smoke variables only through a local ref target", () => {
    const source = readStyleLabSource();

    expect(source).toContain("productionChromeSmokeTargetRef");
    expect(source).toContain("productionChromeSmokeTargetRef.current");
    expect(source).toContain("target.style.setProperty(name, value)");
    expect(source).toContain("target.style.removeProperty(name)");
    expect(source).toContain("Apply Smoke Vars");
    expect(source).toContain("Revert Smoke Vars");
    expect(source).not.toContain("document.documentElement");
    expect(source).not.toContain("document.body");
    expect(source).not.toContain("window.localStorage");
    expect(source).not.toContain("indexedDB");
  });

  it("covers current production chrome aliases without adding forbidden runtime imports", () => {
    const source = readStyleLabSource();
    const forbiddenImports = [
      /from\s+["']@\/components\/nexus\/nexus-ops["']/,
      /from\s+["']@\/store\//,
      /from\s+["']@\/lib\/backend\//,
      /from\s+["']@\/lib\/sync\//,
      /from\s+["']@\/lib\/supabase\//,
      /from\s+["']@\/lib\/api\//,
      /from\s+["']react-rnd["']/,
      /\bRnd\b/,
      /\buseNexusStore\b/,
      /\bfetch\s*\(/,
      /\bsupabase\b/i,
    ];

    expect(source).toContain("--nexus-agent-window-bg");
    expect(source).toContain("--nexus-agent-window-border");
    expect(source).toContain("--nexus-agent-window-shadow");
    expect(source).toContain("--nexus-agent-window-radius");
    expect(source).toContain("--nexus-agent-window-handle-bg");
    expect(source).toContain("--nexus-top-bar-bg");
    expect(source).toContain("--nexus-top-bar-border");
    expect(source).toContain("--nexus-right-dock-bg");
    expect(source).toContain("--nexus-right-dock-border");
    expect(source).toContain("--nexus-command-palette-bg");
    expect(source).toContain("--nexus-command-palette-border");
    expect(source).toContain("--nexus-command-palette-shadow");
    expect(source).toContain("--nexus-command-palette-radius");
    expect(source).toContain("--nexus-command-palette-blur");
    expect(source).toContain("--nexus-modal-shell-bg");
    expect(source).toContain("--nexus-modal-shell-border");
    expect(source).toContain("--nexus-modal-shell-shadow");
    expect(source).toContain("--nexus-modal-shell-radius");
    expect(source).toContain("--nexus-modal-shell-blur");
    expect(source).toContain("--nexus-datapad-shell-bg");
    expect(source).toContain("--nexus-datapad-shell-border");
    expect(source).toContain("--nexus-datapad-shell-shadow");
    expect(source).toContain("--nexus-datapad-shell-radius");
    expect(source).toContain("--nexus-datapad-shell-blur");
    expect(source).toContain("--nexus-workspace-bg");
    expect(source).toContain("--nexus-message-user-bg");
    expect(source).toContain("--nexus-message-assistant-bg");
    expect(source).toContain("--nexus-message-tool-bg");

    for (const pattern of forbiddenImports) {
      expect(source, `Style Lab smoke harness should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });
});

function readStyleLabSource() {
  return readFileSync(new URL("nexus-style-lab.tsx", import.meta.url), "utf8");
}
