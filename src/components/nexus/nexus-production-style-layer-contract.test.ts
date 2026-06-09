import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Nexus production style layer contract", () => {
  const nexusOpsSource = readFileSync(
    new URL("nexus-ops.tsx", import.meta.url),
    "utf8",
  );
  const workspaceStylePayloadSource = readFileSync(
    new URL("../../lib/style-engine/v2-workspace-style-payload.ts", import.meta.url),
    "utf8",
  );
  const previewTransactionSource = readFileSync(
    new URL("../../lib/style-engine/v2-production-preview-transaction.ts", import.meta.url),
    "utf8",
  );
  const controlsPanelSource = extractFunctionSource(
    nexusOpsSource,
    "WorkspaceStyleControlsPanel",
    "ModelTuningSelect",
  );
  const stylePreviewMapperSource = extractFunctionSource(
    workspaceStylePayloadSource,
    "createWorkspaceThemeStylePreviewVariables(",
    "ensureThemePreviewVariableOrder",
  );
  const getPreviewTargetsSource = extractFunctionSource(
    nexusOpsSource,
    "getWorkspaceThemePreviewTargets",
    "createWorkspaceThemeTargetFacts",
  );
  const saveHandlerSource = extractCallbackSource(
    nexusOpsSource,
    "handleSaveWorkspaceThemeStyleControls",
  );

  it("defines Layer 1 as a pure controls-to-variable mapper", () => {
    expect(stylePreviewMapperSource).not.toContain("--nexus-outer-shell-bg");
    expect(stylePreviewMapperSource).toContain("--nexus-body-frame-bg");
    expect(stylePreviewMapperSource).toContain("--nexus-workspace-bg");
    expect(stylePreviewMapperSource).toContain("--nexus-layout-panel-bg");
    expect(stylePreviewMapperSource).toContain("--nexus-layout-panel-muted-bg");
    expect(stylePreviewMapperSource).toContain("--nexus-panel-bg");
    expect(stylePreviewMapperSource).toContain("--nexus-accent-primary");
    expect(stylePreviewMapperSource).not.toContain("document.");
    expect(stylePreviewMapperSource).not.toContain("window.");
    expect(stylePreviewMapperSource).not.toContain("localStorage");
    expect(stylePreviewMapperSource).not.toContain("sessionStorage");
    expect(stylePreviewMapperSource).not.toContain("fetch(");
    expect(stylePreviewMapperSource).not.toContain("querySelector");
    expect(stylePreviewMapperSource).not.toContain("style.setProperty");
  });

  it("keeps Layer 2 scoped to the first-cut production workspace target", () => {
    expect(previewTransactionSource).toContain(
      'export const NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR =\n  "main.nexus-shell.nexus-outer-shell-frame" as const;',
    );
    expect(getPreviewTargetsSource).toContain(
      "NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR",
    );
    expect(getPreviewTargetsSource).not.toContain('"main.nexus-shell"');
    expect(getPreviewTargetsSource).not.toContain('"body"');
    expect(getPreviewTargetsSource).not.toContain('"html"');
    expect(controlsPanelSource).not.toContain("document.documentElement.style");
    expect(controlsPanelSource).not.toContain("document.body.style");
  });

  it("keeps Layer 3 panel material on shared surface variables", () => {
    expect(controlsPanelSource).toContain("const panelMaterialStyle");
    expect(controlsPanelSource).toContain("const panelMutedMaterialStyle");
    expect(controlsPanelSource).toContain("var(--nexus-layout-panel-bg");
    expect(controlsPanelSource).toContain("var(--nexus-layout-panel-muted-bg");
    expect(controlsPanelSource).toContain("var(--nexus-layout-panel-border");
    expect(controlsPanelSource).toContain("var(--nexus-panel-bg");
    expect(controlsPanelSource).not.toContain(
      "linear-gradient(180deg, ${activeAccent}18, ${activeAccent}0b)",
    );
    expect(controlsPanelSource).not.toContain("backgroundColor: `${activeAccent}0d`");
    expect(controlsPanelSource).not.toContain("backgroundColor: `${activeAccent}0a`");
    expect(controlsPanelSource).not.toContain("backgroundColor: `${activeAccent}1f`");
  });

  it("keeps Layer 4 accent as control chrome without exposing a color wheel", () => {
    expect(controlsPanelSource).toContain("style={{ accentColor: activeAccent }}");
    expect(controlsPanelSource).toContain("borderColor: isActivePreset");
    expect(controlsPanelSource).toContain("? `${activeAccent}99`");
    expect(controlsPanelSource).toContain("borderColor: `${activeAccent}59`");
    expect(controlsPanelSource).toContain("borderColor: `${activeAccent}40`");
    expect(controlsPanelSource).not.toContain('type="color"');
    expect(controlsPanelSource).not.toContain("Color wheel");
    expect(controlsPanelSource).not.toContain("Workspace Body Surface");
  });

  it("keeps workspace style presets as Layer 4 control shortcuts, not a second apply path", () => {
    expect(nexusOpsSource).toContain("workspaceStylePresetDefinitions");
    expect(nexusOpsSource).toContain("createWorkspaceStylePresetControls");
    expect(controlsPanelSource).toContain("Workspace Style Presets");
    expect(controlsPanelSource).toContain("applyWorkspaceStylePreset");
    expect(controlsPanelSource).toContain("updateControls(");
    expect(controlsPanelSource).toContain(
      "createWorkspaceStylePresetControls(baseThemeControls, preset)",
    );
    expect(controlsPanelSource).not.toContain("workspace-style-current-preset-status");
    expect(controlsPanelSource).not.toContain("workspace-style-baseline-status");
    expect(controlsPanelSource).not.toContain("querySelectorAll");
    expect(controlsPanelSource).not.toContain("document.documentElement");
    expect(controlsPanelSource).not.toContain("document.body");
  });

  it("keeps workspace style export on normalized controls without backend persistence", () => {
    expect(nexusOpsSource).toContain("createWorkspaceThemeStylePayloadForExport");
    expect(nexusOpsSource).toContain("createWorkspaceThemeStyleControlsPayloadV1");
    expect(nexusOpsSource).toContain("normalizeWorkspaceStylePayload(candidate)");
    expect(saveHandlerSource).toContain("writeImportedWorkspaceStyleReviewState");
    expect(saveHandlerSource).not.toContain("nexusApiClient");
    expect(saveHandlerSource).not.toContain("fetch(");
    expect(saveHandlerSource).not.toContain("supabase");
    expect(saveHandlerSource).not.toContain("localSyncQueueAdapter");
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
