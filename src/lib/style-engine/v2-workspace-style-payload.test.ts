import { describe, expect, it } from "vitest";

import { createSurfaceStyleOpsSkinPackV2Fixture } from "./v2-fixtures";
import {
  clearImportedWorkspaceStyleReviewState,
  createDefaultWorkspaceThemeStyleControlsV1,
  createImportedWorkspaceStyleReviewState,
  createWorkspaceThemeStyleControlsPayloadV1,
  createWorkspaceThemeStylePreviewVariablesV1,
  createWorkspaceStylePayloadExportSnapshot,
  extractWorkspaceThemeStyleControlsV1,
  extractWorkspaceStylePayloadFromSnapshot,
  normalizeWorkspaceStylePayload,
  normalizeWorkspaceThemeStyleControlsV1,
  NEXUS_WORKSPACE_STYLE_PAYLOAD_MAX_BYTES,
  readImportedWorkspaceStyleReviewState,
  writeImportedWorkspaceStyleReviewState,
} from "./v2-workspace-style-payload";

describe("workspace style payload adapter", () => {
  it("ignores old workspace snapshots without a style payload", () => {
    const result = extractWorkspaceStylePayloadFromSnapshot({
      schemaVersion: 1,
      workspace: { id: "workspace-old" },
    });

    expect(result.status).toBe("ignored-missing");
    expect(result.payload).toBeNull();
  });

  it("accepts a valid optional Surface Style skin pack payload", () => {
    const result = extractWorkspaceStylePayloadFromSnapshot({
      schemaVersion: 1,
      stylePack: {
        bridgeSummary: {
          checksum: "nexus-style-fnv1a32:85e89afc",
          directAliases: 58,
          families: 10,
        },
        skinPack: createSurfaceStyleOpsSkinPackV2Fixture(),
        source: "style-lab",
        version: "style-pack-v2",
      },
      workspace: { id: "workspace-style" },
    });

    expect(result.status).toBe("accepted");
    expect(result.payload?.skinPack?.id).toBe("surface-style-ops-skin");
    expect(result.payload?.bridgeSummary?.directAliases).toBe(58);
  });

  it("rejects only the style section when the skin pack is invalid", () => {
    const result = normalizeWorkspaceStylePayload({
      skinPack: {
        id: "not-a-valid-skin-pack",
      },
      source: "style-lab",
      version: "style-pack-v2",
    });

    expect(result.status).toBe("rejected-style-only");
    expect(result.reasons).toContain("workspaceStylePayload.invalidSkinPack");
    expect(result.payload).toBeNull();
  });

  it("returns unsupported-version without accepting the style payload", () => {
    const result = normalizeWorkspaceStylePayload({
      controls: { density: "comfortable" },
      source: "imported",
      version: "style-pack-v3",
    });

    expect(result.status).toBe("unsupported-version");
    expect(result.payload).toBeNull();
  });

  it("accepts safe controls as review-only data", () => {
    const result = normalizeWorkspaceStylePayload({
      controls: {
        palette: "surface-style",
        radius: "soft",
        status: ["live", "idle"],
      },
      source: "surface-style-controls",
      version: "style-pack-v2",
    });

    expect(result.status).toBe("accepted");
    expect(result.payload?.controls?.palette).toBe("surface-style");
  });

  it("normalizes first-cut theme controls for workspace export/import", () => {
    const controls = createDefaultWorkspaceThemeStyleControlsV1();
    const payloadControls = createWorkspaceThemeStyleControlsPayloadV1({
      ...controls,
      accent: "custom",
      accentColor: "#e5e5e5",
      radius: 20,
      warmth: 72,
    });
    const result = normalizeWorkspaceStylePayload({
      controls: payloadControls,
      source: "surface-style-controls",
      version: "style-pack-v2",
    });

    expect(result.status).toBe("accepted");
    expect(
      extractWorkspaceThemeStyleControlsV1(result.payload?.controls).controls,
    ).toMatchObject({
      accent: "custom",
      accentColor: "#e5e5e5",
      radius: 20,
      warmth: 72,
    });
  });

  it("uses neutral default theme controls instead of the old neutral preview preset", () => {
    const controls = createDefaultWorkspaceThemeStyleControlsV1();

    expect(controls).toMatchObject({
      accent: "custom",
      accentColor: "#e5e7eb",
      warmth: 50,
      workspaceWash: 48,
    });
    expect("bodySurfaceColor" in controls).toBe(false);
  });

  it("maps theme controls to deterministic allowlisted production preview variables", () => {
    const first = createWorkspaceThemeStylePreviewVariablesV1({
      ...createDefaultWorkspaceThemeStyleControlsV1(),
      accent: "custom",
      accentColor: "#d6d6d6",
      blur: 22,
      radius: 16,
    });
    const second = createWorkspaceThemeStylePreviewVariablesV1({
      ...createDefaultWorkspaceThemeStyleControlsV1(),
      accent: "custom",
      accentColor: "#d6d6d6",
      blur: 22,
      radius: 16,
    });

    expect(first.accepted).toBe(true);
    expect(second.accepted).toBe(true);

    if (!first.accepted || !second.accepted) {
      throw new Error("Expected accepted controls.");
    }

    expect(first.checksum).toBe(second.checksum);
    expect(first.variables["--nexus-panel-radius"]).toBe("16px");
    expect(first.variables["--nexus-message-bubble-radius"]).toBe("16px");
    expect(first.variables["--nexus-command-palette-radius"]).toBe("16px");
    expect(first.variables["--nexus-modal-shell-radius"]).toBe("16px");
    expect(first.variables["--nexus-datapad-shell-radius"]).toBe("16px");
    expect(first.variables["--nexus-agent-window-handle-radius"]).toBe("16px");
    expect(first.variables["--nexus-panel-blur"]).toBe("22px");
    expect(first.variables["--nexus-accent-primary"]).toBe("#d6d6d6");
    expect(first.variables["--nexus-outer-shell-bg"]).toBeUndefined();
    expect(first.variables["--nexus-body-frame-bg"]).toMatch(/^rgb\(/);
    expect(first.variables["--nexus-body-frame-bg"]).not.toContain(
      "linear-gradient",
    );
    expect(first.variables["--nexus-body-frame-bg"]).not.toContain("/");
    expect(first.variables["--nexus-layout-panel-bg"]).toContain("linear-gradient");
    expect(first.variables["--nexus-layout-panel-border"]).toBe(
      first.variables["--nexus-panel-border"],
    );
    expect(first.variables["--nexus-workspace-minimap-mask"]).toContain("rgb(");
    expect(first.variables["--nexus-workspace-wash"]).not.toContain("255 240 216");
    expect(first.variableNames.every((name) => name.startsWith("--"))).toBe(true);
    expect(JSON.stringify(first.variables)).not.toMatch(
      /<script|javascript:|https?:\/\/|url\(|body\s*\{|html\s*\{|:root\s*\{/i,
    );
  });

  it("uses workspace wash as the shared layout brightness control without a color-wheel body fill", () => {
    const lowWash = createWorkspaceThemeStylePreviewVariablesV1({
      ...createDefaultWorkspaceThemeStyleControlsV1(),
      workspaceWash: 8,
    });
    const highWash = createWorkspaceThemeStylePreviewVariablesV1({
      ...createDefaultWorkspaceThemeStyleControlsV1(),
      workspaceWash: 92,
    });

    expect(lowWash.accepted).toBe(true);
    expect(highWash.accepted).toBe(true);

    if (!lowWash.accepted || !highWash.accepted) {
      throw new Error("Expected accepted controls.");
    }

    expect(lowWash.variables["--nexus-workspace-bg"]).not.toBe(
      highWash.variables["--nexus-workspace-bg"],
    );
    expect(lowWash.variables["--nexus-workspace-wash"]).not.toBe(
      highWash.variables["--nexus-workspace-wash"],
    );
    expect(lowWash.variables["--nexus-body-frame-bg"]).not.toBe(
      highWash.variables["--nexus-body-frame-bg"],
    );
    expect(lowWash.variables["--nexus-layout-panel-bg"]).not.toBe(
      highWash.variables["--nexus-layout-panel-bg"],
    );
  });

  it("keeps saturated accents from reintroducing the old brown surface preset", () => {
    const result = createWorkspaceThemeStylePreviewVariablesV1({
      ...createDefaultWorkspaceThemeStyleControlsV1(),
      accent: "custom",
      accentColor: "#f6fa00",
      warmth: 80,
      workspaceWash: 54,
    });

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected accepted controls.");
    }

    const serializedVariables = JSON.stringify(result.variables);

    expect(result.variables["--theme-primary"]).toBe("#f6fa00");
    expect(result.variables["--nexus-body-frame-bg"]).not.toContain("/");
    expect(result.variables["--nexus-body-frame-bg"]).not.toContain(
      "246 250 0",
    );
    expect(result.variables["--nexus-agent-window-bg"]).toContain("246 250 0");
    expect(result.variables["--nexus-message-bubble-bg"]).not.toContain(
      "246 250 0",
    );
    expect(result.variables["--nexus-workspace-grid-primary"]).toContain(
      "246 250 0",
    );
    expect(serializedVariables).not.toMatch(
      /48 32 20|42 32 24|67 42 26|101 70 46|109 76 50|123 90 64|255 240 216/i,
    );
    expect(result.variables["--nexus-panel-shadow"]).toContain("rgb(0 0 0");
  });

  it("rejects invalid first-cut theme controls without rejecting old missing controls", () => {
    expect(
      normalizeWorkspaceThemeStyleControlsV1({
        ...createDefaultWorkspaceThemeStyleControlsV1(),
        radius: 88,
      }).accepted,
    ).toBe(false);
    expect(
      normalizeWorkspaceStylePayload({
        controls: {
          themeControlsV1: {
            ...createDefaultWorkspaceThemeStyleControlsV1(),
            accent: "remote-url",
          },
        },
        source: "surface-style-controls",
        version: "style-pack-v2",
      }).status,
    ).toBe("rejected-style-only");
    expect(
      normalizeWorkspaceThemeStyleControlsV1({
        ...createDefaultWorkspaceThemeStyleControlsV1(),
        accent: "custom",
        accentColor: "javascript:alert(1)",
      }).accepted,
    ).toBe(false);
    const legacyBodySurfaceColorResult = normalizeWorkspaceThemeStyleControlsV1({
      ...createDefaultWorkspaceThemeStyleControlsV1(),
      bodySurfaceColor: "javascript:alert(1)",
    });

    expect(legacyBodySurfaceColorResult.accepted).toBe(true);

    if (!legacyBodySurfaceColorResult.accepted) {
      throw new Error("Expected legacy bodySurfaceColor to be ignored.");
    }

    expect("bodySurfaceColor" in legacyBodySurfaceColorResult.controls).toBe(false);
    expect(
      normalizeWorkspaceStylePayload({
        controls: {
          palette: "surface-style",
        },
        source: "surface-style-controls",
        version: "style-pack-v2",
      }).status,
    ).toBe("accepted");
  });

  it("rejects unsafe controls with raw CSS, scripts, or remote URLs", () => {
    const result = normalizeWorkspaceStylePayload({
      controls: {
        rawCss: "body { display: none; }",
        remoteUrl: "https://example.test/style.css",
        script: "javascript:alert(1)",
      },
      source: "surface-style-controls",
      version: "style-pack-v2",
    });

    expect(result.status).toBe("rejected-style-only");
    expect(result.reasons.join(" ")).toContain("workspaceStylePayload.unsafeKey");
  });

  it("rejects raw selector strings in controls", () => {
    const result = normalizeWorkspaceStylePayload({
      controls: {
        selector: ".nexus-shell",
      },
      source: "surface-style-controls",
      version: "style-pack-v2",
    });

    expect(result.status).toBe("rejected-style-only");
    expect(result.reasons.join(" ")).toContain(
      "workspaceStylePayload.unsafeString",
    );
  });

  it("rejects oversized style payloads without leaking a normalized payload", () => {
    const result = normalizeWorkspaceStylePayload({
      controls: {
        note: "x".repeat(NEXUS_WORKSPACE_STYLE_PAYLOAD_MAX_BYTES + 1),
      },
      source: "imported",
      version: "style-pack-v2",
    });

    expect(result.status).toBe("rejected-style-only");
    expect(result.reasons).toContain("workspaceStylePayload.tooLarge");
    expect(result.payload).toBeNull();
  });

  it("requires a style-bearing section instead of accepting metadata only", () => {
    const result = normalizeWorkspaceStylePayload({
      bridgeSummary: {
        checksum: "nexus-style-fnv1a32:85e89afc",
        directAliases: 58,
        families: 10,
      },
      source: "imported",
      version: "style-pack-v2",
    });

    expect(result.status).toBe("rejected-style-only");
    expect(result.reasons).toContain("workspaceStylePayload.emptyStyleBody");
  });

  it("keeps export snapshots old-compatible when there is no style payload", () => {
    const snapshot = {
      exportedAt: "2026-05-31T00:00:00.000Z",
      schemaVersion: 1,
      workspace: { id: "workspace-old-compatible" },
    };
    const result = createWorkspaceStylePayloadExportSnapshot(snapshot);

    expect(result.status).toBe("omitted-missing");
    expect(result.snapshot).toEqual(snapshot);
    expect("stylePack" in result.snapshot).toBe(false);
  });

  it("includes a normalized style payload in export snapshots when valid", () => {
    const snapshot = {
      exportedAt: "2026-05-31T00:00:00.000Z",
      schemaVersion: 1,
      workspace: { id: "workspace-with-style" },
    };
    const stylePack = {
      bridgeSummary: {
        checksum: "nexus-style-fnv1a32:85e89afc",
        directAliases: 58,
        families: 10,
      },
      skinPack: createSurfaceStyleOpsSkinPackV2Fixture(),
      source: "style-lab",
      version: "style-pack-v2",
    };
    const result = createWorkspaceStylePayloadExportSnapshot(snapshot, stylePack);

    expect(result.status).toBe("included");
    expect(result.snapshot.stylePack?.skinPack?.id).toBe("surface-style-ops-skin");
    expect(result.snapshot.workspace).toEqual(snapshot.workspace);
  });

  it("round-trips saved theme controls through workspace export/import payloads", () => {
    const snapshot = {
      exportedAt: "2026-05-31T00:00:00.000Z",
      schemaVersion: 1,
      workspace: { id: "workspace-with-theme-controls" },
    };
    const before = structuredClone(snapshot);
    const controls = {
      ...createDefaultWorkspaceThemeStyleControlsV1(),
      accent: "custom" as const,
      accentColor: "#f6fa00",
      glass: 58,
      radius: 22,
      warmth: 64,
      workspaceWash: 42,
    };
    const payloadDecision = normalizeWorkspaceStylePayload({
      controls: createWorkspaceThemeStyleControlsPayloadV1(controls),
      source: "surface-style-controls",
      version: "style-pack-v2",
    });

    expect(payloadDecision.status).toBe("accepted");

    const exportDecision = createWorkspaceStylePayloadExportSnapshot(
      snapshot,
      payloadDecision.payload,
    );

    expect(exportDecision.status).toBe("included");
    expect(snapshot).toEqual(before);
    expect(exportDecision.snapshot.workspace).toEqual(snapshot.workspace);
    expect(exportDecision.snapshot.stylePack?.controls).toBeDefined();

    const importDecision = extractWorkspaceStylePayloadFromSnapshot(
      exportDecision.snapshot,
    );

    expect(importDecision.status).toBe("accepted");

    const importedControls = extractWorkspaceThemeStyleControlsV1(
      importDecision.payload?.controls,
    );

    expect(importedControls.accepted).toBe(true);

    if (!importedControls.accepted) {
      throw new Error("Expected imported controls to be accepted.");
    }

    expect(importedControls.controls).toMatchObject({
      accent: "custom",
      accentColor: "#f6fa00",
      glass: 58,
      radius: 22,
      warmth: 64,
      workspaceWash: 42,
    });
    expect("bodySurfaceColor" in importedControls.controls).toBe(false);
  });

  it("omits invalid style payloads during export without mutating the input", () => {
    const snapshot = {
      exportedAt: "2026-05-31T00:00:00.000Z",
      schemaVersion: 1,
      stylePack: { version: "unsafe-existing" },
      workspace: { id: "workspace-invalid-style" },
    };
    const before = structuredClone(snapshot);
    const result = createWorkspaceStylePayloadExportSnapshot(snapshot, {
      controls: { rawCss: "body { display: none; }" },
      source: "style-lab",
      version: "style-pack-v2",
    });

    expect(result.status).toBe("omitted-invalid");
    expect("stylePack" in result.snapshot).toBe(false);
    expect(snapshot).toEqual(before);
  });

  it("stores accepted imported workspace style review state without mutating the payload", () => {
    clearImportedWorkspaceStyleReviewState();
    const decision = extractWorkspaceStylePayloadFromSnapshot({
      stylePack: {
        controls: { palette: "surface-style" },
        source: "imported",
        version: "style-pack-v2",
      },
    });
    const reviewState = createImportedWorkspaceStyleReviewState(
      decision,
      "2026-05-31T00:00:00.000Z",
    );

    const written = writeImportedWorkspaceStyleReviewState(reviewState);
    const read = readImportedWorkspaceStyleReviewState();

    expect(written?.decision.status).toBe("accepted");
    expect(read?.decision.status).toBe("accepted");
    expect(read?.decision.payload?.controls?.palette).toBe("surface-style");
    expect(read?.updatedAt).toBe("2026-05-31T00:00:00.000Z");
  });

  it("keeps rejected imported workspace style review state review-only", () => {
    clearImportedWorkspaceStyleReviewState();
    const reviewState = createImportedWorkspaceStyleReviewState(
      {
        payload: null,
        reasons: ["workspaceStylePayload.unsafeKey:$.controls.rawCss"],
        status: "rejected-style-only",
      },
      "2026-05-31T00:00:01.000Z",
    );

    writeImportedWorkspaceStyleReviewState(reviewState);
    const read = readImportedWorkspaceStyleReviewState();

    expect(read?.decision.status).toBe("rejected-style-only");
    expect(read?.decision.payload).toBeNull();
    expect(read?.decision.reasons).toContain(
      "workspaceStylePayload.unsafeKey:$.controls.rawCss",
    );
  });
});
