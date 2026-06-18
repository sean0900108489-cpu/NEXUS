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
  const panelsSource = readFileSync(
    new URL("nexus-panels.tsx", import.meta.url),
    "utf8",
  );
  const utilsSource = readFileSync(
    new URL("nexus-utils.tsx", import.meta.url),
    "utf8",
  );
  const settingsSidebarSource = readFileSync(
    new URL("nexus-agent-settings-sidebar.tsx", import.meta.url),
    "utf8",
  );
  const controlsPanelSource = extractFunctionSource(
    source,
    "createWorkspaceAttachmentMessagePayload",
    "export function NexusOps",
  );
  const presetDefinitionsSource = extractConstSource(
    source,
    "workspaceStylePresetDefinitions",
    "export function NexusOps",
  );
  const topBarSource = extractFunctionSource(panelsSource, "TopBar", "MacroComposerModal");
  const topMenuActionSource = extractFunctionSource(
    utilsSource,
    "TopMenuAction",
    "",
  );
  const saveHandlerSource = extractCallbackSource(
    source,
    "handleSaveWorkspaceThemeStyleControls",
  );
  const bootControlsSource = extractFunctionSource(
    source,
    "resolveWorkspaceThemeControlsForBoot",
    "applyWorkspaceThemeControlsToProductionTarget",
  );
  const bootApplySource = extractFunctionSource(
    source,
    "applyWorkspaceThemeControlsToProductionTarget",
    "createWorkspaceThemeTargetFacts",
  );

  it("renders Workspace Style Controls inside the production Theme panel", () => {
    expect(source).toContain("Workspace Style Controls");
    expect(source).toContain('data-testid="workspace-style-controls-panel"');
    expect(source).toContain("Base theme seed plus scoped workspace override");
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

  it("keeps noisy workspace style diagnostics out of the Theme panel chrome", () => {
    expect(source).toContain("createDefaultWorkspaceThemeStyleControlsV1");
    expect(controlsPanelSource).not.toContain("workspace-style-target-status");
    expect(controlsPanelSource).not.toContain("workspace-style-live-status");
    expect(controlsPanelSource).not.toContain("workspace-style-save-status");
    expect(controlsPanelSource).not.toContain("workspace-style-system-relation");
    expect(controlsPanelSource).not.toContain("workspace-style-current-preset-status");
    expect(controlsPanelSource).not.toContain("workspace-style-baseline-status");
    expect(controlsPanelSource).not.toContain("workspace-style-preview-trace");
    expect(controlsPanelSource).not.toContain("workspace-style-residue-status");
    expect(controlsPanelSource).not.toContain("target {previewState.targetStatus}");
    expect(controlsPanelSource).not.toContain("<span>live preview</span>");
    expect(controlsPanelSource).not.toContain("<span>workspace export</span>");
    expect(controlsPanelSource).not.toContain("<span>style system</span>");
    expect(controlsPanelSource).not.toContain("<span>current preset</span>");
    expect(controlsPanelSource).not.toContain("<span>saved baseline</span>");
    expect(controlsPanelSource).not.toContain("<span>vars / checksum</span>");
    expect(controlsPanelSource).not.toContain("<span>apply / revert</span>");
    expect(controlsPanelSource).not.toContain("<span>residue</span>");
    expect(controlsPanelSource).not.toContain("not auto-applied to other workspaces");
  });

  it("adds workspace style presets as Layer 4 shortcuts on the existing controls chain", () => {
    expect(source).toContain("workspaceStylePresetDefinitions");
    expect(source).toContain("type WorkspaceStylePresetDefinition");
    expect(source).toContain("createWorkspaceStylePresetControls");
    expect(controlsPanelSource).toContain("Workspace Style Presets");
    expect(controlsPanelSource).toContain('data-testid="workspace-style-presets"');
    expect(controlsPanelSource).toContain(
      'data-testid={`workspace-style-preset-${preset.id}`}',
    );
    expect(controlsPanelSource).toContain("applyWorkspaceStylePreset");
    expect(controlsPanelSource).toContain(
      "createWorkspaceStylePresetControls(baseThemeControls, preset)",
    );
    expect(controlsPanelSource).toContain("compareWorkspaceThemeControls");
    expect(controlsPanelSource).toContain("aria-pressed={isActivePreset}");
    expect(controlsPanelSource).toContain("Layer 4");
  });

  it("keeps presets deterministic and free of raw style payload escape hatches", () => {
    expect(presetDefinitionsSource).toContain('id: "neutral"');
    expect(presetDefinitionsSource).toContain('id: "clear"');
    expect(presetDefinitionsSource).toContain('id: "soft"');
    expect(presetDefinitionsSource).toContain('id: "signal"');
    expect(presetDefinitionsSource).toContain('accent: "custom"');
    expect(presetDefinitionsSource).not.toContain("rawSelector");
    expect(presetDefinitionsSource).not.toContain("rawJs");
    expect(presetDefinitionsSource).not.toContain("javascript:");
    expect(presetDefinitionsSource).not.toContain("http://");
    expect(presetDefinitionsSource).not.toContain("https://");
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

  it("applies the workspace theme seed to the production target after authenticated load", () => {
    expect(source).toContain("workspaceStyleReviewLoaded");
    expect(source).toContain("workspaceThemeBootAppliedRef");
    expect(source).toContain("resolveWorkspaceThemeControlsForBoot");
    expect(source).toContain("applyWorkspaceThemeControlsToProductionTarget");
    expect(source).toContain("authChecked");
    expect(source).toContain("authVault.user?.id");
    expect(bootControlsSource).toContain("createDefaultWorkspaceThemeStyleControlsV1()");
    expect(bootControlsSource).toContain("extractWorkspaceThemeStyleControlsV1");
    expect(bootControlsSource).toContain(
      "stylePayloadReview?.decision.status === \"accepted\"",
    );
    expect(bootApplySource).toContain(
      "createWorkspaceThemeStylePreviewVariablesV1(controls)",
    );
    expect(bootApplySource).toContain("getWorkspaceThemePreviewTargets");
    expect(bootApplySource).toContain("createWorkspaceThemeTargetFacts");
    expect(bootApplySource).toContain("createProductionPreviewApplyPlan");
    expect(bootApplySource).toContain("preflightVerdict: \"eligible\"");
    expect(bootApplySource).toContain("target.style.setProperty");
    expect(bootApplySource).toContain("writesToBackend: false");
    expect(bootApplySource).toContain("writesToStore: false");
    expect(bootApplySource).toContain("mutatesDocumentRoot: false");
    expect(bootApplySource).not.toContain("document.documentElement.style");
    expect(bootApplySource).not.toContain("document.body.style");
    expect(bootApplySource).not.toContain("localStorage");
    expect(bootApplySource).not.toContain("indexedDB");
    expect(bootApplySource).not.toContain("fetch(");
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

  it("restores imported workspace style controls as the Theme panel saved baseline", () => {
    expect(controlsPanelSource).toContain("const importedControls = useMemo");
    expect(controlsPanelSource).toContain(
      "stylePayloadReview?.decision.status !== \"accepted\"",
    );
    expect(controlsPanelSource).toContain(
      "extractWorkspaceThemeStyleControlsV1",
    );
    expect(controlsPanelSource).toContain(
      "stylePayloadReview.decision.payload?.controls",
    );
    expect(controlsPanelSource).toContain(
      "() => importedControls ?? baseThemeControls",
    );
    expect(controlsPanelSource).toContain("setControls(importedControls)");
    expect(controlsPanelSource).toContain("setSavedControls(importedControls)");
    expect(controlsPanelSource).toContain("setControls(baseThemeControls)");
    expect(controlsPanelSource).toContain("setSavedControls(null)");
  });

  it("keeps the mapping and payload validation in pure style-engine helpers", () => {
    expect(source).toContain("createWorkspaceThemeStylePreviewVariablesV1");
    expect(source).toContain("createWorkspaceThemeStyleControlsPayloadV1");
    expect(source).toContain("extractWorkspaceThemeStyleControlsV1");
    expect(source).not.toContain("rawCss");
    expect(source).not.toContain("remoteUrl");
  });

  it("does not expose native color-wheel controls in the production Theme panel", () => {
    expect(controlsPanelSource).not.toContain('type="color"');
    expect(controlsPanelSource).not.toContain(
      'data-testid="workspace-style-accent-color"',
    );
    expect(controlsPanelSource).not.toContain(
      'data-testid="workspace-style-body-surface-color"',
    );
    expect(controlsPanelSource).not.toContain("Workspace Body Surface");
    expect(controlsPanelSource).not.toContain("Color wheel");
    expect(controlsPanelSource).not.toContain(
      "accentColor: event.currentTarget.value.toLowerCase()",
    );
    expect(controlsPanelSource).not.toContain(
      "bodySurfaceColor: event.currentTarget.value.toLowerCase()",
    );
    expect(controlsPanelSource).toContain("activeAccent");
    expect(controlsPanelSource).toContain("borderColor");
    expect(controlsPanelSource).toContain("text-neutral-100");
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
  });

  it("lets left menu actions follow the workspace primary accent", () => {
    expect(topBarSource).toContain("var(--theme-primary, #e5e5e5)");
    expect(topBarSource).toContain("New Workspace");
    expect(topMenuActionSource).toContain("var(--theme-primary, #e5e5e5)");
    expect(topBarSource).not.toContain(
      "flex w-full items-center justify-center gap-2 border border-neutral-300/35 bg-neutral-300/10",
    );
    expect(topMenuActionSource).not.toContain(
      "hover:border-neutral-300/35 hover:text-neutral-100",
    );
  });

  it("lets the Theme panel and workspace menu chrome follow radius controls", () => {
    expect(settingsSidebarSource).toContain(
      "var(--nexus-right-dock-radius, var(--nexus-panel-radius, var(--surface-radius)))",
    );
    expect(topBarSource).toContain(
      "var(--nexus-top-bar-radius, var(--nexus-panel-radius, var(--surface-radius)))",
    );
    expect(topBarSource).not.toContain(
      "border border-neutral-300/25 bg-neutral-300/[0.045]",
    );
  });

  it("layers Theme panel fills through shared material variables instead of local accent fills", () => {
    expect(settingsSidebarSource).toContain("color-mix(in srgb, var(--theme-primary, #e5e5e5) 13%");
    expect(settingsSidebarSource).toContain("color-mix(in srgb, var(--theme-primary, #e5e5e5) 12%");
    expect(settingsSidebarSource).toContain("color-mix(in srgb, var(--theme-primary, #e5e5e5) 4%");
    expect(settingsSidebarSource).toContain("var(--nexus-layout-panel-bg");
    expect(settingsSidebarSource).toContain("var(--nexus-layout-panel-muted-bg");
    expect(settingsSidebarSource).toContain("var(--nexus-layout-panel-border");
    expect(controlsPanelSource).toContain("...panelMaterialStyle");
    expect(controlsPanelSource).toContain("...panelMutedMaterialStyle");
    expect(controlsPanelSource).not.toContain("linear-gradient(180deg, ${activeAccent}18, ${activeAccent}0b)");
    expect(controlsPanelSource).not.toContain("backgroundColor: `${activeAccent}0d`");
    expect(controlsPanelSource).not.toContain("backgroundColor: `${activeAccent}0a`");
  });

  it("syncs central panels and graph backgrounds to shared layout material variables", () => {
    expect(source).toContain("nexus-workspace nexus-scanline");
    expect(source).not.toContain("bg-neutral-950/80 shadow-2xl");
    expect(bodyFrameSource).toContain(
      "var(--nexus-body-frame-bg, rgb(18 18 18))",
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
  const end = nextFunctionName
    ? source.indexOf(`function ${nextFunctionName}`, start + 1)
    : source.length;

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

function extractConstSource(
  source: string,
  constName: string,
  nextMarker: string,
) {
  const start = source.indexOf(`const ${constName}`);
  const end = source.indexOf(nextMarker, start + 1);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}
