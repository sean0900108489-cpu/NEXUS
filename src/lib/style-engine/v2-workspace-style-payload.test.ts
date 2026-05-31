import { describe, expect, it } from "vitest";

import { createWarmGlassOpsSkinPackV2Fixture } from "./v2-fixtures";
import {
  extractWorkspaceStylePayloadFromSnapshot,
  normalizeWorkspaceStylePayload,
  NEXUS_WORKSPACE_STYLE_PAYLOAD_MAX_BYTES,
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

  it("accepts a valid optional Warm Glass skin pack payload", () => {
    const result = extractWorkspaceStylePayloadFromSnapshot({
      schemaVersion: 1,
      stylePack: {
        bridgeSummary: {
          checksum: "nexus-style-fnv1a32:85e89afc",
          directAliases: 58,
          families: 10,
        },
        skinPack: createWarmGlassOpsSkinPackV2Fixture(),
        source: "style-lab",
        version: "style-pack-v2",
      },
      workspace: { id: "workspace-style" },
    });

    expect(result.status).toBe("accepted");
    expect(result.payload?.skinPack?.id).toBe("warm-glass-ops-skin");
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
        palette: "warm-glass",
        radius: "soft",
        status: ["live", "idle"],
      },
      source: "warm-glass-controls",
      version: "style-pack-v2",
    });

    expect(result.status).toBe("accepted");
    expect(result.payload?.controls?.palette).toBe("warm-glass");
  });

  it("rejects unsafe controls with raw CSS, scripts, or remote URLs", () => {
    const result = normalizeWorkspaceStylePayload({
      controls: {
        rawCss: "body { display: none; }",
        remoteUrl: "https://example.test/style.css",
        script: "javascript:alert(1)",
      },
      source: "warm-glass-controls",
      version: "style-pack-v2",
    });

    expect(result.status).toBe("rejected-style-only");
    expect(result.reasons.join(" ")).toContain("workspaceStylePayload.unsafeKey");
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
});
