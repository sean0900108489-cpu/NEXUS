import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("production control primitive selector prep", () => {
  it("adds a stable selector to the AgentWindow toolbar icon control shell", () => {
    const source = readNexusOpsSource();
    const toolbarIconButton = extractFunctionSource(source, "ToolbarIconButton");

    expect(toolbarIconButton).toContain("nexus-control-icon-button-shell");
    expect(toolbarIconButton).toContain("aria-label={label}");
    expect(toolbarIconButton).toContain("disabled={disabled}");
    expect(toolbarIconButton).toContain("onClick={onClick}");
    expect(toolbarIconButton).toContain("title={label}");
    expect(toolbarIconButton).toContain('type="button"');
  });

  it("keeps active, disabled, and danger behavior ownership unchanged", () => {
    const source = readNexusOpsSource();
    const toolbarIconButton = extractFunctionSource(source, "ToolbarIconButton");

    expect(toolbarIconButton).toContain("active &&");
    expect(toolbarIconButton).toContain('tone === "default"');
    expect(toolbarIconButton).toContain('tone === "danger"');
    expect(toolbarIconButton).toContain("disabled:cursor-not-allowed");
    expect(toolbarIconButton).toContain("disabled:opacity-35");
  });

  it("does not add control primitive CSS aliases in globals", () => {
    const globals = readGlobalsSource();

    expect(globals).not.toContain(".nexus-control-icon-button-shell");
    expect(globals).not.toContain("--nexus-control-button");
    expect(globals).not.toContain("--nexus-control-icon");
    expect(globals).not.toContain("--nexus-control-badge");
    expect(globals).not.toContain("--nexus-control-input");
  });
});

function extractFunctionSource(source: string, functionName: string) {
  const start = source.indexOf(`function ${functionName}`);

  expect(start).toBeGreaterThanOrEqual(0);

  const nextFunction = source.indexOf("\nfunction ", start + 1);

  return source.slice(start, nextFunction === -1 ? undefined : nextFunction);
}

function readNexusOpsSource() {
  return readFileSync(new URL("nexus-ops.tsx", import.meta.url), "utf8");
}

function readGlobalsSource() {
  return readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
}
