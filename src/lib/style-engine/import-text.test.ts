import { describe, expect, it } from "vitest";

import {
  createBaselineSurfaceShellStyleManifestV1,
  createNexusStyleExportPackageV1,
  parseNexusStyleImportTextV1,
} from "@/lib/style-engine";

describe("NEXUS Style Engine import text parser", () => {
  it("parses a manifest JSON string and normalizes it for preview", () => {
    const manifest = createBaselineSurfaceShellStyleManifestV1();
    const result = parseNexusStyleImportTextV1(JSON.stringify(manifest));

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected manifest import text to parse.");
    }

    expect(result.source).toBe("manifest");
    expect(result.manifest.id).toBe("baseline-surface-shell");
    expect(result.review.permissions.canPreview).toBe(true);
  });

  it("parses an export package JSON string and preserves the source type", () => {
    const exported = createNexusStyleExportPackageV1(
      createBaselineSurfaceShellStyleManifestV1(),
    );

    if (!exported.accepted) {
      throw new Error("Expected export package creation to pass.");
    }

    const result = parseNexusStyleImportTextV1(
      JSON.stringify(exported.exportPackage, null, 2),
    );

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected export-package import text to parse.");
    }

    expect(result.source).toBe("export-package");
    expect(result.manifest.id).toBe("baseline-surface-shell");
  });

  it("rejects invalid JSON without echoing the imported text", () => {
    const result = parseNexusStyleImportTextV1(
      '{ "id": "baseline-surface-shell", "secret": "do-not-echo" ',
    );

    expect(result.accepted).toBe(false);

    if (result.accepted) {
      throw new Error("Expected invalid JSON to fail.");
    }

    expect(result.source).toBe("text");
    expect(result.errors).toEqual([
      {
        code: "style.importText.invalidJson",
        message: "Style import text must be valid JSON.",
        path: "$",
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("do-not-echo");
  });

  it("rejects unknown parsed JSON without echoing the imported text", () => {
    const result = parseNexusStyleImportTextV1(
      JSON.stringify("not-a-style-pack-do-not-echo"),
    );

    expect(result.accepted).toBe(false);

    if (result.accepted) {
      throw new Error("Expected unknown import text to fail.");
    }

    expect(result.source).toBe("unknown");
    expect(result.errors.map((error) => error.code)).toContain(
      "style.invalidRoot",
    );
    expect("manifest" in result).toBe(false);
    expect(JSON.stringify(result)).not.toContain("do-not-echo");
  });

  it("rejects unsafe parsed JSON without returning the unsafe manifest", () => {
    const manifest = createBaselineSurfaceShellStyleManifestV1();

    manifest.tokens.surface.app = "service_role=do-not-echo";

    const result = parseNexusStyleImportTextV1(JSON.stringify(manifest));

    expect(result.accepted).toBe(false);

    if (result.accepted) {
      throw new Error("Expected unsafe manifest text to fail.");
    }

    expect(result.source).toBe("manifest");
    expect(result.errors.map((error) => error.code)).toContain(
      "style.forbidden.serviceRole",
    );
    expect("manifest" in result).toBe(false);
    expect(JSON.stringify(result)).not.toContain("do-not-echo");
  });

  it("rejects empty or oversized text before parsing", () => {
    const empty = parseNexusStyleImportTextV1("   ");
    const tooLarge = parseNexusStyleImportTextV1("{}", {
      maxCharacters: 1,
    });

    expect(empty).toMatchObject({
      accepted: false,
      errors: [{ code: "style.importText.empty" }],
      source: "text",
    });
    expect(tooLarge).toMatchObject({
      accepted: false,
      errors: [{ code: "style.importText.tooLarge" }],
      source: "text",
    });
  });
});
