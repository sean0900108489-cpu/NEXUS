import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Nexus UI comfort round 1", () => {
  const panelsSource = readSource("nexus-panels.tsx");
  const opsSource = readSource("nexus-ops.tsx");
  const graphSource = readSource("nexus-graph.tsx");
  const sidebarSource = readSource("nexus-agent-settings-sidebar.tsx");

  it("hides expert-only Workflow Pro and Trace from normal navigation", () => {
    const topBarSource = extractFunctionSource(panelsSource, "TopBar", "RightIntel");
    const rightDockPanelSource = extractConstSource(
      panelsSource,
      "rightDockPanels",
      "export function RightFloatingDock",
    );

    expect(topBarSource).toContain("visibleWorkspaceModes");
    expect(topBarSource).not.toContain('"workflow-pro"] as const');
    expect(topBarSource).not.toContain("workflow pro");
    expect(rightDockPanelSource).not.toContain('id: "trace"');
    expect(rightDockPanelSource).not.toContain("Runtime trace and diagnostics");
    expect(opsSource).toContain('viewMode === "workflow-pro"');
    expect(opsSource).toContain('setViewMode("graph")');
  });

  it("keeps the graph toolbar quiet until hover or keyboard focus", () => {
    expect(graphSource).toContain("nexus-graph-quiet-toolbar");
    expect(graphSource).toContain("nexus-graph-secondary-tools");
    expect(graphSource).toContain("pointer-events-none flex flex-wrap");
    expect(graphSource).toContain("group-hover:pointer-events-auto");
    expect(graphSource).toContain("group-hover:opacity-100");
    expect(graphSource).toContain("group-focus-within:opacity-100");
    expect(graphSource).toContain('label="Brain"');
    expect(graphSource).toContain('label={workflowRunning ? "Running" : "Start All"}');
  });

  it("moves Graph Brain diagnostics behind an advanced disclosure", () => {
    expect(graphSource).toContain("Advanced / Diagnostics");
    expect(graphSource).toContain("nexus-graph-brain-diagnostics");
    expect(graphSource).toContain("<summary");
    expect(graphSource).toContain("Runtime Evidence");
    expect(graphSource).toContain("Brain Thread");
    expect(graphSource).toContain("scoreTarget");
    expect(graphSource).toContain("brainModel,");
  });

  it("makes Global Datapads read as a note warehouse", () => {
    expect(sidebarSource).toContain("nexus-datapad-warehouse");
    expect(sidebarSource).toContain("Shared notes that stay available across workspaces.");
    expect(sidebarSource).toContain("Create a datapad for prompts, decisions, fragments, or anything you want nearby.");
    expect(sidebarSource).toContain("New Datapad");
    expect(sidebarSource).not.toContain("📓 Global Datapads");
    expect(sidebarSource).not.toContain("➕ New Datapad");
  });

  it("gives the workspace menu its own readable material", () => {
    expect(panelsSource).toContain("nexus-workspace-menu-panel");
    expect(panelsSource).toContain("--nexus-workspace-menu-bg");
    expect(panelsSource).not.toContain("--nexus-workspace-menu-bg, var(--nexus-layout-panel-bg");
    expect(panelsSource).toContain("rgb(10 10 10 / 0.98)");
    expect(panelsSource).toContain("visibleWorkspaceModes");
  });
});

function readSource(fileName: string) {
  return readFileSync(new URL(fileName, import.meta.url), "utf8");
}

function extractConstSource(source: string, start: string, end: string) {
  const startIndex = source.indexOf(`const ${start}`);
  const endIndex = source.indexOf(end, startIndex);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error(`Unable to extract const ${start}`);
  }

  return source.slice(startIndex, endIndex);
}

function extractFunctionSource(source: string, start: string, end: string) {
  const startIndex = source.indexOf(`function ${start}`);
  const exportStartIndex = source.indexOf(`export function ${start}`);
  const actualStartIndex =
    exportStartIndex === -1
      ? startIndex
      : startIndex === -1
        ? exportStartIndex
        : Math.min(startIndex, exportStartIndex);
  const endIndex = source.indexOf(end, actualStartIndex);

  if (actualStartIndex === -1 || endIndex === -1) {
    throw new Error(`Unable to extract function ${start}`);
  }

  return source.slice(actualStartIndex, endIndex);
}
