import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Nexus agent window chrome production primitive", () => {
  it("keeps the stable selector on the existing Rnd-owned visual wrapper", () => {
    const source = readAgentWindowSource();

    expect(source).toContain("<Rnd");
    expect(source).toContain('dragHandleClassName="nexus-drag-handle"');
    expect(source).toContain("onDragStop={onDragStop}");
    expect(source).toContain("onResizeStop={onResizeStop}");
    expect(source).toContain("style={{ zIndex: agent.layout.zIndex }}");
    expect(source).toContain("<motion.section");
    expect(source).toContain(
      '"nexus-agent-window relative flex h-full min-h-0 flex-col overflow-visible',
    );
    expect(source).toContain('"nexus-drag-handle h-2 shrink-0 cursor-move"');
  });

  it("routes visual chrome through aliases while preserving dynamic defaults", () => {
    const source = readAgentWindowSource();

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
  const source = readFileSync(new URL("nexus-ops.tsx", import.meta.url), "utf8");

  return source.match(/function AgentWindow\([\s\S]*?\n}\n\nfunction SandboxCanvas/)?.[0] ?? "";
}

function readGlobalsCssSource() {
  return readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
}

function readAgentWindowCssBlock() {
  const css = readGlobalsCssSource();

  return css.match(/\.nexus-agent-window \{[\s\S]*?\.nexus-datapad-window \{/)
    ?.[0] ?? "";
}
