import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Nexus Style Lab imported workspace style review panel", () => {
  const source = readFileSync(
    new URL("nexus-style-lab.tsx", import.meta.url),
    "utf8",
  );
  const nexusOpsSource = readFileSync(
    new URL("../nexus/nexus-ops.tsx", import.meta.url),
    "utf8",
  );

  it("renders imported workspace style review state and metadata", () => {
    expect(source).toContain("Imported Workspace Style");
    expect(source).toContain('data-testid="imported-workspace-style-panel"');
    expect(source).toContain('data-testid="imported-workspace-style-status"');
    expect(source).toContain('data-testid="imported-workspace-style-reasons"');
    expect(source).toContain("syncImportedWorkspaceStyleReview");
    expect(source).toContain("importedWorkspaceStyleRows");
    expect(source).toContain("Direct Aliases");
    expect(source).toContain("Families");
    expect(source).toContain("Controls");
    expect(source).toContain("Import Result");
    expect(source).toContain("Review Load");
    expect(source).toContain("Export Retention");
    expect(source).toContain("review-only / not auto-applied");
  });

  it("explains accepted, rejected, missing, and unsupported imported style states", () => {
    expect(source).toContain("stylePack imported and available for review");
    expect(source).toContain(
      "style section ignored; workspace import still succeeded",
    );
    expect(source).toContain("this workspace has no stylePack");
    expect(source).toContain(
      "style version not supported; workspace import still succeeded",
    );
    expect(source).toContain(
      'data-testid="imported-workspace-style-status-note"',
    );
    expect(source).toContain(
      'data-testid="imported-workspace-style-auto-apply"',
    );
  });

  it("shows export retention only for accepted style packs", () => {
    expect(source).toContain(
      "accepted stylePack will be included in next workspace export",
    );
    expect(source).toContain(
      "rejected style section will not be exported as valid stylePack",
    );
    expect(source).toContain(
      "unsupported style section will not be exported as valid stylePack",
    );
    expect(source).toContain("no stylePack will be added to workspace export");
    expect(source).toContain(
      'data-testid="imported-workspace-style-retention"',
    );
  });

  it("loads valid imported skin packs into the existing V2 review flow only when available", () => {
    expect(source).toContain("readImportedWorkspaceStyleReviewState");
    expect(source).toContain("subscribeImportedWorkspaceStyleReviewState");
    expect(source).toContain("loadImportedWorkspaceStyleIntoReview");
    expect(source).toContain("importedWorkspaceStyleCanLoadSkinPack");
    expect(source).toContain("importedWorkspaceStyleLoadedIntoReview");
    expect(source).toContain("setImportedWorkspaceStyleLoadedReviewId");
    expect(source).toContain("loaded into Style Lab review");
    expect(source).toContain("metadata only; no previewable skinPack");
    expect(source).toContain(
      'data-testid="imported-workspace-style-load-review"',
    );
    expect(source).toContain(
      'data-testid="imported-workspace-style-load-state"',
    );
    expect(source).toContain("parseNexusSkinPackReviewImportTextV2");
    expect(source).toContain("setSkinPackReviewResult");
    expect(source).toContain("setSkinPackText(nextSkinPackText)");
  });

  it("keeps workspace import review-only and free of production auto-apply hooks", () => {
    const handleImportSource = extractCallbackSource(
      nexusOpsSource,
      "handleImport",
    );
    const importedPanelSource = extractSectionSource(
      source,
      "imported-workspace-style-panel",
    );

    expect(handleImportSource).toContain(
      "writeImportedWorkspaceStyleReviewState",
    );
    expect(handleImportSource).toContain(
      "createImportedWorkspaceStyleReviewState",
    );
    expect(importedPanelSource).not.toContain("previewProductionBridge");
    expect(importedPanelSource).not.toContain("previewPatch(");
    expect(importedPanelSource).not.toContain("setProperty(");
    expect(importedPanelSource).not.toContain("document.documentElement");
    expect(importedPanelSource).not.toContain("document.body");
    expect(importedPanelSource).not.toContain("localStorage");
    expect(importedPanelSource).not.toContain("indexedDB");
    expect(importedPanelSource).not.toContain("fetch(");
  });
});

function extractCallbackSource(source: string, callbackName: string) {
  const start = source.indexOf(`const ${callbackName} = useCallback`);

  expect(start).toBeGreaterThanOrEqual(0);

  const nextCallback = source.indexOf("\n  const ", start + 1);

  return source.slice(start, nextCallback === -1 ? undefined : nextCallback);
}

function extractSectionSource(source: string, testId: string) {
  const testIdIndex = source.indexOf(`data-testid="${testId}"`);

  expect(testIdIndex).toBeGreaterThanOrEqual(0);

  const sectionStart = source.lastIndexOf("<section", testIdIndex);
  const nextSection = source.indexOf("\n            <section", testIdIndex + 1);

  expect(sectionStart).toBeGreaterThanOrEqual(0);

  return source.slice(sectionStart, nextSection === -1 ? undefined : nextSection);
}
