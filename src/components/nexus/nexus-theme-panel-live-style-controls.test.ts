import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Nexus production Theme panel live style controls", () => {
  const source = readFileSync(new URL("nexus-ops.tsx", import.meta.url), "utf8");
  const bodyFrameSource = readFileSync(
    new URL("nexus-ops-body-frame.tsx", import.meta.url),
    "utf8",
  );
  const graphSource = readFileSync(
    new URL("nexus-graph.tsx", import.meta.url),
    "utf8",
  );
  const controlsPanelSource = extractFunctionSource(
    source,
    "WorkspaceStyleControlsPanel",
    "ModelTuningSelect",
  );
  const topBarSource = extractFunctionSource(source, "TopBar", "SyncBadge");
  const topMenuActionSource = extractFunctionSource(
    source,
    "TopMenuAction",
    "MacroComposerModal",
  );
  const saveHandlerSource = extractCallbackSource(
    source,
    "handleSaveWorkspaceThemeStyleControls",
  );

  it("renders Workspace Style Controls inside the production Theme panel", () => {
    expect(source).toContain("Workspace Style Controls");
    expect(source).toContain('data-testid="workspace-style-controls-panel"');
    expect(source).toContain("Base theme seed plus scoped workspace override");
    expect(source).toContain("not backend persisted");
    expect(source).toContain("not auto-applied to other workspaces");
    expect(source).toContain("Save to workspace style");
    expect(source).toContain("Revert preview");
    expect(source).toContain("Reset controls");
  });

  it("keeps the Theme panel focused on workspace-scoped controls", () => {
    expect(source).not.toContain('data-testid="workspace-day-night-toggle"');
    expect(source).not.toContain("Day / Night");
    expect(source).not.toContain("Theme / Style");
    expect(source).not.toContain("LEGO THEME ENGINE");
    expect(source).not.toContain("LegoThemeEngineControls");
  });

  it("makes the workspace style layer relationship explicit", () => {
    expect(source).toContain("createDefaultWorkspaceThemeStyleControlsV1");
    expect(controlsPanelSource).toContain("workspace-style-system-relation");
    expect(controlsPanelSource).toContain("synced to workspace seed");
    expect(controlsPanelSource).toContain("workspace override saved");
    expect(controlsPanelSource).toContain("live override unsaved");
  });

  it("uses the first-cut target selector and transaction planner for live preview", () => {
    expect(source).toContain(
      "NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR",
    );
    expect(controlsPanelSource).toContain("getWorkspaceThemePreviewTargets");
    expect(controlsPanelSource).toContain("createProductionPreviewApplyPlan");
    expect(controlsPanelSource).toContain("createProductionPreviewRevertPlan");
    expect(controlsPanelSource).toContain("createProductionPreviewResidueCheck");
    expect(controlsPanelSource).toContain("target.style.setProperty");
    expect(controlsPanelSource).toContain("target.style.removeProperty");
    expect(controlsPanelSource).toContain("targetStatus");
    expect(controlsPanelSource).not.toContain("document.documentElement.style");
    expect(controlsPanelSource).not.toContain("document.body.style");
    expect(controlsPanelSource).not.toContain("localStorage");
    expect(controlsPanelSource).not.toContain("indexedDB");
    expect(controlsPanelSource).not.toContain("fetch(");
  });

  it("saves normalized controls into the existing workspace style payload export path", () => {
    expect(saveHandlerSource).toContain(
      "createWorkspaceThemeStylePayloadForExport",
    );
    expect(saveHandlerSource).toContain("writeImportedWorkspaceStyleReviewState");
    expect(saveHandlerSource).toContain(
      "Workspace style controls saved to workspace export; not backend persisted",
    );
    expect(saveHandlerSource).not.toContain("nexusApiClient");
    expect(saveHandlerSource).not.toContain("supabase");
    expect(saveHandlerSource).not.toContain("localSyncQueueAdapter");
  });

  it("keeps the mapping and payload validation in pure style-engine helpers", () => {
    expect(source).toContain("createWorkspaceThemeStylePreviewVariablesV1");
    expect(source).toContain("createWorkspaceThemeStyleControlsPayloadV1");
    expect(source).toContain("extractWorkspaceThemeStyleControlsV1");
    expect(source).not.toContain("rawCss");
    expect(source).not.toContain("remoteUrl");
  });

  it("uses a safe native color picker for accent tuning", () => {
    expect(controlsPanelSource).toContain('type="color"');
    expect(controlsPanelSource).toContain('data-testid="workspace-style-accent-color"');
    expect(controlsPanelSource).toContain('accent: "custom"');
    expect(controlsPanelSource).toContain("accentColor: event.currentTarget.value.toLowerCase()");
    expect(controlsPanelSource).toContain("activeAccent");
    expect(controlsPanelSource).toContain("borderColor");
    expect(controlsPanelSource).toContain("text-slate-100");
    expect(controlsPanelSource).not.toContain("workspaceThemeAccentOptions.map");
    expect(controlsPanelSource).not.toContain("option.swatch");
  });

  it("keeps Workspace Style Controls material on shared panel variables while controls follow the active accent", () => {
    expect(controlsPanelSource).toContain("const panelMaterialStyle");
    expect(controlsPanelSource).toContain("const panelMutedMaterialStyle");
    expect(controlsPanelSource).toContain("var(--nexus-layout-panel-bg");
    expect(controlsPanelSource).toContain("var(--nexus-layout-panel-muted-bg");
    expect(controlsPanelSource).toContain("var(--nexus-layout-panel-border");
    expect(controlsPanelSource).toContain("style={{ accentColor: activeAccent }}");
    expect(controlsPanelSource).toContain("const controlRadius = `${controls.radius}px`");
    expect(controlsPanelSource).toContain("borderRadius: controlRadius");
    expect(controlsPanelSource).not.toContain("linear-gradient(180deg, ${activeAccent}18, ${activeAccent}0b)");
    expect(controlsPanelSource).not.toContain("backgroundColor: `${activeAccent}0d`");
    expect(controlsPanelSource).not.toContain("backgroundColor: `${activeAccent}0a`");
    expect(controlsPanelSource).not.toContain("backgroundColor: `${activeAccent}1f`");
    expect(controlsPanelSource).not.toContain("text-amber-100");
    expect(controlsPanelSource).not.toContain("text-cyan-100");
    expect(controlsPanelSource).not.toContain("text-emerald-100");
    expect(controlsPanelSource).not.toContain("text-rose-100");
    expect(controlsPanelSource).not.toContain("text-violet-100");
  });

  it("lets left menu actions follow the workspace primary accent", () => {
    expect(topBarSource).toContain("var(--theme-primary, #67e8f9)");
    expect(topBarSource).toContain("New Workspace");
    expect(topMenuActionSource).toContain("var(--theme-primary, #67e8f9)");
    expect(topBarSource).not.toContain(
      "flex w-full items-center justify-center gap-2 border border-emerald-300/35 bg-emerald-300/10",
    );
    expect(topMenuActionSource).not.toContain(
      "hover:border-cyan-300/35 hover:text-cyan-100",
    );
  });

  it("lets the Theme panel and workspace menu chrome follow radius controls", () => {
    expect(source).toContain(
      "var(--nexus-right-dock-radius, var(--nexus-panel-radius, var(--surface-radius)))",
    );
    expect(topBarSource).toContain(
      "var(--nexus-top-bar-radius, var(--nexus-panel-radius, var(--surface-radius)))",
    );
    expect(topBarSource).not.toContain(
      "border border-cyan-300/25 bg-cyan-300/[0.045]",
    );
  });

  it("layers Theme panel fills through shared material variables instead of local accent fills", () => {
    expect(source).toContain("color-mix(in srgb, var(--theme-primary, #67e8f9) 13%");
    expect(source).toContain("color-mix(in srgb, var(--theme-primary, #67e8f9) 12%");
    expect(source).toContain("color-mix(in srgb, var(--theme-primary, #67e8f9) 4%");
    expect(source).toContain("var(--nexus-layout-panel-bg");
    expect(source).toContain("var(--nexus-layout-panel-muted-bg");
    expect(source).toContain("var(--nexus-layout-panel-border");
    expect(controlsPanelSource).toContain("...panelMaterialStyle");
    expect(controlsPanelSource).toContain("...panelMutedMaterialStyle");
    expect(controlsPanelSource).not.toContain("linear-gradient(180deg, ${activeAccent}18, ${activeAccent}0b)");
    expect(controlsPanelSource).not.toContain("backgroundColor: `${activeAccent}0d`");
    expect(controlsPanelSource).not.toContain("backgroundColor: `${activeAccent}0a`");
  });

  it("syncs central panels and graph backgrounds to shared layout material variables", () => {
    expect(source).toContain("nexus-workspace nexus-scanline");
    expect(source).not.toContain("bg-slate-950/80 shadow-2xl");
    expect(bodyFrameSource).toContain(
      "[background:var(--nexus-body-frame-bg,transparent)]",
    );
    expect(graphSource).toContain("bg-transparent");
    expect(graphSource).toContain("[&_.react-flow]:!bg-transparent");
    expect(graphSource).toContain("[&_.react-flow__pane]:!bg-transparent");
    expect(graphSource).toContain('bgColor="transparent"');
    expect(graphSource).toContain("--nexus-workspace-grid-primary");
    expect(graphSource).toContain("--nexus-workspace-minimap-mask");
    expect(controlsPanelSource).toContain("Surface Lightness");
  });
});

function extractFunctionSource(
  source: string,
  functionName: string,
  nextFunctionName: string,
) {
  const start = source.indexOf(`function ${functionName}`);
  const end = source.indexOf(`function ${nextFunctionName}`, start + 1);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

function extractCallbackSource(source: string, callbackName: string) {
  const start = source.indexOf(`const ${callbackName} = useCallback`);
  const nextCallback = source.indexOf("\n  const ", start + 1);

  expect(start).toBeGreaterThanOrEqual(0);

  return source.slice(start, nextCallback === -1 ? undefined : nextCallback);
}
