import { describe, expect, it } from "vitest";

import {
  compileNexusStyleManifestV1,
  createNexusStyleManifestDraftFromIntentV1,
  normalizeNexusStyleIntentV1,
  validateNexusStyleManifestV1,
} from "@/lib/style-engine";

describe("NEXUS Style Engine intent manifest drafts", () => {
  it("creates a validated high-contrast manifest draft from normalized intent", () => {
    const intent = normalizeNexusStyleIntentV1(
      "High contrast terminal dashboard with reduced motion and cyan graph visuals.",
      { source: "ai-draft" },
    );
    const draft = createNexusStyleManifestDraftFromIntentV1(intent, {
      name: "Operator Draft",
    });

    expect(draft.accepted).toBe(true);

    if (!draft.accepted) {
      throw new Error("Expected accepted manifest draft.");
    }

    expect(draft.manifest.id).toMatch(/^intent-draft-[a-f0-9]{8}$/);
    expect(draft.manifest.name).toBe("Operator Draft");
    expect(draft.manifest.source).toEqual({
      kind: "ai-draft",
      reference: "nexus-style-intent-normalizer-v1",
    });
    expect(draft.manifest.intent.contrast).toBe("high");
    expect(draft.manifest.tokens.surface.app).toBe("#050505");
    expect(draft.validation.accepted).toBe(true);
    expect(compileNexusStyleManifestV1(draft.manifest).accepted).toBe(true);
  });

  it("keeps standard-contrast drafts on the legacy base with validation warnings", () => {
    const intent = normalizeNexusStyleIntentV1(
      "Quiet matte interface with comfortable density and warm accents.",
    );
    const draft = createNexusStyleManifestDraftFromIntentV1(intent);

    expect(draft.accepted).toBe(true);

    if (!draft.accepted) {
      throw new Error("Expected accepted manifest draft.");
    }

    expect(draft.manifest.intent.contrast).toBe("standard");
    expect(draft.manifest.tokens.surface.app).toBe("#030712");
    expect(draft.validation.warnings.map((warning) => warning.code)).toContain(
      "style.accessibility.highContrastNotRequested",
    );
  });

  it("fails closed when the normalized intent was rejected", () => {
    const intent = normalizeNexusStyleIntentV1(
      "service_role=super-secret-value",
    );
    const draft = createNexusStyleManifestDraftFromIntentV1(intent);

    expect(draft.accepted).toBe(false);
    expect(JSON.stringify(draft)).toContain("style.intent.forbiddenSecret");
    expect(JSON.stringify(draft)).not.toContain("super-secret-value");
  });

  it("fails closed when draft identity options violate manifest validation", () => {
    const intent = normalizeNexusStyleIntentV1("High contrast calm console.");
    const draft = createNexusStyleManifestDraftFromIntentV1(intent, {
      id: "Not A Slug",
    });

    expect(draft.accepted).toBe(false);

    if (draft.accepted) {
      throw new Error("Expected invalid draft identity to be rejected.");
    }

    expect(draft.errors).toContainEqual({
      code: "style.invalidId",
      message: "id must be a lowercase slug.",
      path: "$.id",
    });
  });

  it("creates deterministic fresh manifest drafts", () => {
    const intent = normalizeNexusStyleIntentV1("High contrast glass console.");
    const first = createNexusStyleManifestDraftFromIntentV1(intent);
    const second = createNexusStyleManifestDraftFromIntentV1(intent);

    expect(first).toEqual(second);

    if (!first.accepted || !second.accepted) {
      throw new Error("Expected accepted manifest drafts.");
    }

    first.manifest.tokens.surface.app = "#111111";
    expect(second.manifest.tokens.surface.app).toBe("#050505");
    expect(validateNexusStyleManifestV1(second.manifest).accepted).toBe(true);
  });
});
