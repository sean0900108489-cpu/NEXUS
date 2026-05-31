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

  it("does not introduce token aliases or an extraction frame in this prep step", () => {
    const css = readGlobalsCssSource();
    const source = readCommandPaletteSource();

    expect(css).not.toContain("--nexus-command-palette");
    expect(source).not.toContain("CommandPaletteShellFrame");
    expect(
      existsSync(new URL("nexus-command-palette-shell-frame.tsx", import.meta.url)),
    ).toBe(false);
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
