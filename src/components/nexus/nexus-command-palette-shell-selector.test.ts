import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Nexus command palette shell selector", () => {
  it("adds the stable selector to the existing visual shell", () => {
    const source = readCommandPaletteSource();

    expect(source).toContain("function CommandPalette({");
    expect(source).toContain(
      'className="fixed inset-0 z-[999] grid place-items-start bg-black/62 px-4 pt-24 backdrop-blur-sm"',
    );
    expect(source).toContain(
      'className="nexus-command-palette-shell nexus-panel mx-auto w-full max-w-2xl overflow-hidden"',
    );
    expect(source).toContain("onMouseDown={close}");
    expect(source).toContain(
      "onMouseDown={(event) => event.stopPropagation()}",
    );
  });

  it("keeps focus, input state, close, and command execution ownership in place", () => {
    const source = readCommandPaletteSource();

    expect(source).toContain('const [query, setQuery] = useState("");');
    expect(source).toContain("const inputRef = useRef<HTMLInputElement | null>(null);");
    expect(source).toContain(
      "requestAnimationFrame(() => inputRef.current?.focus())",
    );
    expect(source).toContain("const close = () => {");
    expect(source).toContain("setQuery(\"\");");
    expect(source).toContain("onClose();");
    expect(source).toContain(
      "onChange={(event) => setQuery(event.target.value)}",
    );
    expect(source).toContain("onClick={command.run}");
    expect(source).toContain("value={query}");
  });

  it("routes visual chrome through dedicated aliases with panel fallbacks", () => {
    const css = readGlobalsCssSource();
    const block = readCommandPaletteCssBlock();

    expect(css).toContain(".nexus-shell .nexus-command-palette-shell");
    expect(block).toContain("--nexus-command-palette-bg");
    expect(block).toContain("--nexus-command-palette-border");
    expect(block).toContain("--nexus-command-palette-shadow");
    expect(block).toContain("--nexus-command-palette-radius");
    expect(block).toContain("--nexus-command-palette-blur");
    expect(block).toContain(
      "var(--nexus-command-palette-bg, var(--nexus-panel-bg, var(--panel-bg)))",
    );
    expect(block).toContain(
      "var(--nexus-command-palette-border, var(--nexus-panel-border, var(--border-subtle)))",
    );
    expect(block).toContain(
      "var(--nexus-command-palette-shadow, var(--nexus-panel-shadow, var(--shadow-panel)))",
    );
    expect(block).toContain(
      "var(--nexus-command-palette-radius, var(--nexus-panel-radius, var(--surface-radius)))",
    );
    expect(block).toContain(
      "var(--nexus-command-palette-blur, var(--nexus-panel-blur, var(--glass-blur)))",
    );
  });

  it("keeps CSS aliasing out of behavior, layout, input, and command item states", () => {
    const source = readCommandPaletteSource();
    const block = readCommandPaletteCssBlock();
    const forbiddenCssPatterns = [
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
      /\n\s*color\s*:/,
      /:hover/,
      /:focus/,
      /\binput\b/,
      /\bbutton\b/,
    ];

    expect(source).not.toContain("CommandPaletteShellFrame");
    expect(
      existsSync(new URL("nexus-command-palette-shell-frame.tsx", import.meta.url)),
    ).toBe(false);

    for (const pattern of forbiddenCssPatterns) {
      expect(block, `Command palette CSS should not match ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });
});

function readNexusOpsSource() {
  return readFileSync(new URL("nexus-ops.tsx", import.meta.url), "utf8");
}

function readCommandPaletteSource() {
  const source = readNexusOpsSource();
  const start = source.indexOf("function CommandPalette(");

  return start === -1 ? "" : source.slice(start);
}

function readGlobalsCssSource() {
  return readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
}

function readCommandPaletteCssBlock() {
  const css = readGlobalsCssSource();

  return css.match(
    /\.nexus-shell \.nexus-command-palette-shell \{[\s\S]*?\.nexus-shell \.nexus-message-bubble \{/,
  )?.[0] ?? "";
}
