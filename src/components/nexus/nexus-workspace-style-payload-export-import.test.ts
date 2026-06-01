import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Nexus workspace style payload export/import wiring", () => {
  const source = readFileSync(
    new URL("nexus-ops.tsx", import.meta.url),
    "utf8",
  );

  it("routes existing workspace export/import through the style payload adapter", () => {
    expect(source).toContain("createWorkspaceStylePayloadExportSnapshot");
    expect(source).toContain("extractWorkspaceStylePayloadFromSnapshot");
    expect(source).toContain("writeImportedWorkspaceStyleReviewState");
    expect(source).toContain("setWorkspaceStylePayloadReview");
    expect(source).toContain(
      "Workspace snapshot exported with reviewed stylePack",
    );
    expect(source).toContain(
      "Workspace snapshot imported; stylePack accepted for Style Lab review; not auto-applied",
    );
    expect(source).toContain(
      "Workspace snapshot imported; stylePack rejected style-only; workspace kept",
    );
    expect(source).toContain(
      "Workspace snapshot imported; no stylePack found",
    );
  });

  it("keeps style payload import review-only instead of applying production style", () => {
    const handleImportSource = extractCallbackSource(source, "handleImport");

    expect(handleImportSource).toContain(
      "extractWorkspaceStylePayloadFromSnapshot",
    );
    expect(handleImportSource).toContain(
      "writeImportedWorkspaceStyleReviewState",
    );
    expect(handleImportSource).toContain("importWorkspace({");
    expect(handleImportSource).toContain("setWorkspaceStylePayloadReview");
    expect(handleImportSource).not.toContain("ProductionPreview");
    expect(handleImportSource).not.toContain("setProperty(");
    expect(handleImportSource).not.toContain("document.documentElement");
    expect(handleImportSource).not.toContain("localStorage");
    expect(handleImportSource).not.toContain("indexedDB");
  });

  it("saves theme controls into accepted review state before workspace export", () => {
    const handleSaveSource = extractCallbackSource(
      source,
      "handleSaveWorkspaceThemeStyleControls",
    );
    const handleExportSource = extractCallbackSource(source, "handleExport");

    expect(source).toContain("createWorkspaceThemeStylePayloadForExport");
    expect(handleSaveSource).toContain(
      "createWorkspaceThemeStylePayloadForExport",
    );
    expect(handleSaveSource).toContain(
      "writeImportedWorkspaceStyleReviewState",
    );
    expect(handleSaveSource).toContain("setWorkspaceStylePayloadReview");
    expect(handleSaveSource).toContain(
      "Workspace style controls saved to workspace export; not backend persisted",
    );
    expect(handleExportSource).toContain(
      "workspaceStylePayloadReview?.decision.status === \"accepted\"",
    );
    expect(handleExportSource).toContain(
      "workspaceStylePayloadReview.decision.payload",
    );
    expect(handleExportSource).not.toContain("setProperty(");
    expect(handleExportSource).not.toContain("document.documentElement");
    expect(handleExportSource).not.toContain("localStorage");
    expect(handleExportSource).not.toContain("indexedDB");
  });
});

function extractCallbackSource(source: string, callbackName: string) {
  const start = source.indexOf(`const ${callbackName} = useCallback`);

  expect(start).toBeGreaterThanOrEqual(0);

  const nextCallback = source.indexOf("\n  const ", start + 1);

  return source.slice(start, nextCallback === -1 ? undefined : nextCallback);
}
