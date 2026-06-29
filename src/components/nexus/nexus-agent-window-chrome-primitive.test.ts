import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Nexus agent window chrome production primitive", () => {
  it("keeps the stable selector on the existing Rnd-owned visual wrapper", () => {
    const source = readAgentWindowSource();

    expect(source).toContain("<Rnd");
    expect(source).toContain('dragHandleClassName="nexus-drag-handle"');
    expect(source).toContain("onDragStop={onDragStop}");
    expect(source).toContain("onResizeStop={onResizeStop}");
    expect(source).toContain("zIndexBase = 0");
    expect(source).toContain("style={{ zIndex: zIndexBase + agent.layout.zIndex }}");
    expect(source).toContain("<motion.section");
    expect(source).toContain(
      '"nexus-agent-window nexus-agent-window-frame-shell relative flex h-full min-h-0 flex-col overflow-visible',
    );
    expect(source).toContain('"nexus-drag-handle h-2 shrink-0 cursor-move"');
  });

  it("routes visual chrome through aliases while preserving dynamic defaults", () => {
    const source = readAgentWindowSource();

    expect(source).not.toContain('"--nexus-agent-frame-accent": agent.accent');
    expect(source).not.toContain('"--nexus-agent-frame-accent-soft"');
    expect(source).not.toContain("const agentWindowFrameAccentSoft");
    expect(source).toContain("const agentWindowBackground = isSandboxAgent");
    expect(source).toContain("const agentWindowBorderColor = isSandboxAgent");
    expect(source).toContain("const agentWindowShadow = isSandboxAgent");
    expect(source).toContain('"--nexus-agent-window-default-bg": agentWindowBackground');
    expect(source).toContain(
      '"--nexus-agent-window-default-border": agentWindowBorderColor',
    );
    expect(source).toContain(
      '"--nexus-agent-window-default-shadow": agentWindowShadow',
    );
    expect(source).toContain(
      "var(--nexus-agent-window-bg, var(--nexus-panel-bg, var(--nexus-agent-window-default-bg)))",
    );
    expect(source).toContain(
      "var(--nexus-agent-window-border, var(--nexus-panel-border, var(--nexus-agent-window-default-border)))",
    );
    expect(source).toContain(
      "var(--nexus-agent-window-shadow, var(--nexus-panel-shadow, var(--nexus-agent-window-default-shadow)))",
    );
    expect(source).toContain(
      "var(--nexus-agent-window-radius, var(--nexus-panel-radius, var(--surface-radius)))",
    );
    expect(source).toContain(
      "var(--nexus-agent-window-blur, var(--nexus-panel-blur, var(--glass-blur)))",
    );
  });

  it("adds a system-toned neon frame around Agent and Sandbox windows", () => {
    const source = readAgentWindowSource();
    const css = readGlobalsCssSource();

    expect(source).toContain("nexus-agent-window-frame-shell");
    expect(source).toContain("nexus-agent-window-top-accent");
    expect(source).toContain("nexus-agent-window-frame-wash");
    expect(source).toContain("nexus-agent-window-side-rail");
    expect(source).not.toContain("nexus-agent-window-side-rail__label");
    expect(source).not.toContain('"SANDBOX"');
    expect(source).not.toContain('"AGENT"');
    expect(source).toContain('aria-hidden="true"');

    expect(css).toContain(".nexus-agent-window-frame-shell");
    expect(css).toContain(".nexus-agent-window-top-accent");
    expect(css).toContain(".nexus-agent-window-frame-wash");
    expect(css).toContain(".nexus-agent-window-side-rail");
    expect(css).not.toContain(".nexus-agent-window-side-rail__label");
    expect(css).toContain("--nexus-agent-frame-accent");
    expect(css).toContain("--nexus-agent-frame-accent-soft");
    expect(css).toContain("--nexus-agent-frame-rail-width");
    expect(css).toContain("--nexus-agent-frame-top-accent-height");
  });

  it("has global alias declarations and fallback chains for browser-only skinning", () => {
    const css = readGlobalsCssSource();

    expect(css).toContain(".nexus-agent-window");
    expect(css).toContain(".nexus-agent-window > .nexus-drag-handle");
    expect(css).toContain("--nexus-agent-window-bg");
    expect(css).toContain("--nexus-agent-window-border");
    expect(css).toContain("--nexus-agent-window-shadow");
    expect(css).toContain("--nexus-agent-window-radius");
    expect(css).toContain("--nexus-agent-window-blur");
    expect(css).toContain("--nexus-agent-window-handle-bg");
    expect(css).toContain("--nexus-agent-window-handle-border");
    expect(css).toContain("--nexus-agent-window-handle-radius");
    expect(css).toContain(
      "--nexus-agent-window-bg,\n    var(\n      --nexus-panel-bg,\n      var(",
    );
    expect(css).toContain(
      "--nexus-agent-window-border,\n    var(--nexus-panel-border, var(--nexus-agent-window-default-border",
    );
    expect(css).toContain(
      "--nexus-agent-window-shadow,\n    var(--nexus-panel-shadow, var(--nexus-agent-window-default-shadow",
    );
    expect(css).toContain(
      "--nexus-agent-window-blur, var(--nexus-panel-blur, var(--glass-blur))",
    );
  });

  it("does not give the CSS primitive layout or interaction authority", () => {
    const css = readAgentWindowCssBlock();
    const forbiddenPatterns = [
      /\bposition\s*:/,
      /\bz-index\s*:/,
      /\bpointer-events\s*:/,
      /\boverflow\s*:/,
      /\bwidth\s*:/,
      /\bheight\s*:/,
      /\bmin-width\s*:/,
      /\bmin-height\s*:/,
      /\bmax-width\s*:/,
      /\bmax-height\s*:/,
      /\btransform\s*:/,
      /\bcursor\s*:/,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(css, `AgentWindow primitive CSS should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });
});

function readAgentWindowSource() {
  const source = readFileSync(
    new URL("nexus-agent-window.tsx", import.meta.url),
    "utf8",
  );

  return source.match(/export function AgentWindow\([\s\S]*$/)?.[0] ?? "";
}

function readGlobalsCssSource() {
  return readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
}

function readAgentWindowCssBlock() {
  const css = readGlobalsCssSource();

  return css.match(/\.nexus-agent-window \{[\s\S]*?\n\}/)
    ?.[0] ?? "";
}
