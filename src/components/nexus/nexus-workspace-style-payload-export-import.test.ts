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
    expect(source).toContain("setWorkspaceStylePayloadReview");
    expect(source).toContain("Workspace snapshot exported with style payload");
    expect(source).toContain(
      "Workspace snapshot imported; style payload accepted for review",
    );
    expect(source).toContain(
      "Workspace snapshot imported; style payload rejected",
    );
  });

  it("keeps style payload import review-only instead of applying production style", () => {
    const handleImportSource = extractCallbackSource(source, "handleImport");

    expect(handleImportSource).toContain(
      "extractWorkspaceStylePayloadFromSnapshot",
    );
    expect(handleImportSource).toContain("importWorkspace({");
    expect(handleImportSource).toContain("setWorkspaceStylePayloadReview");
    expect(handleImportSource).not.toContain("ProductionPreview");
    expect(handleImportSource).not.toContain("setProperty(");
    expect(handleImportSource).not.toContain("document.documentElement");
    expect(handleImportSource).not.toContain("localStorage");
    expect(handleImportSource).not.toContain("indexedDB");
  });
});

function extractCallbackSource(source: string, callbackName: string) {
  const start = source.indexOf(`const ${callbackName} = useCallback`);

  expect(start).toBeGreaterThanOrEqual(0);

  const nextCallback = source.indexOf("\n  const ", start + 1);

  return source.slice(start, nextCallback === -1 ? undefined : nextCallback);
}
