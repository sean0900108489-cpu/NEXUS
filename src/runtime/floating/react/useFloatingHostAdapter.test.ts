import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hookModuleUrl = new URL("./useFloatingHostAdapter.ts", import.meta.url);

describe("useFloatingHostAdapter source boundary", () => {
  it("exposes a reactive Workspace host adapter over pure floating lifecycle helpers", () => {
    expect(existsSync(hookModuleUrl)).toBe(true);

    const source = readFileSync(hookModuleUrl, "utf8");

    expect(source).toContain('"use client"');
    expect(source).toContain("useState<FloatingWindowState>");
    expect(source).toContain("openFloatingWindow");
    expect(source).toContain("focusFloatingWindow");
    expect(source).toContain("maximizeFloatingWindowInState");
    expect(source).toContain("return adapter");
  });
});
