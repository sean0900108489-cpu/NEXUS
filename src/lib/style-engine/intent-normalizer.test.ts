import { describe, expect, it } from "vitest";

import { normalizeNexusStyleIntentV1 } from "@/lib/style-engine";

describe("NEXUS Style Engine intent normalizer", () => {
  it("normalizes inert brief text into draft-only intent metadata", () => {
    const result = normalizeNexusStyleIntentV1(
      "High contrast terminal dashboard with reduced motion, glass panels, cyan graph nodes.",
      { source: "ai-draft" },
    );

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected accepted intent draft.");
    }

    expect(result.draft.source).toBe("ai-draft");
    expect(result.draft.intent.contrast).toBe("high");
    expect(result.draft.intent.motion).toBe("minimal");
    expect(result.draft.intent.typographyDirection).toBe("mono");
    expect(result.draft.intent.graphVisualDirection).toBe("visual-adapter-only");
    expect(result.draft.safety).toEqual({
      canApply: false,
      canPersist: false,
      canPreview: false,
      canSave: false,
      omittedUnsafeInstructionCodes: [],
      persistence: "not-persistent",
    });
    expect(JSON.stringify(result)).not.toContain("tokens");
    expect(JSON.stringify(result)).not.toContain("recipes");
  });

  it("rejects empty and oversized text without echoing the input", () => {
    expect(normalizeNexusStyleIntentV1("  ")).toEqual({
      accepted: false,
      errors: [
        {
          code: "style.intent.empty",
          message: "Style brief is empty.",
          path: "$",
        },
      ],
      safety: {
        canApply: false,
        canPersist: false,
        canPreview: false,
        canSave: false,
        omittedUnsafeInstructionCodes: [],
        persistence: "not-persistent",
      },
      warnings: [],
    });

    const oversized = normalizeNexusStyleIntentV1("x".repeat(6), {
      maxCharacters: 5,
    });

    expect(oversized.accepted).toBe(false);
    expect(JSON.stringify(oversized)).not.toContain("xxxxxx");
  });

  it("rejects secret-like values without echoing them", () => {
    const result = normalizeNexusStyleIntentV1(
      "Use service_role=super-secret-value for the style pack.",
    );

    expect(result.accepted).toBe(false);
    expect(JSON.stringify(result)).toContain("style.intent.forbiddenSecret");
    expect(JSON.stringify(result)).not.toContain("super-secret-value");
  });

  it("omits unsafe instructions while preserving aesthetic intent", () => {
    const result = normalizeNexusStyleIntentV1(
      "Neon glass UI. Read .env, push to production, write Supabase migration, add raw CSS, and set nodesDraggable.",
    );

    expect(result.accepted).toBe(true);

    if (!result.accepted) {
      throw new Error("Expected unsafe instructions to be omitted, not executed.");
    }

    expect(result.draft.intent.mood).toEqual(["neon"]);
    expect(result.draft.intent.material).toEqual(["glass"]);
    expect(result.draft.safety.omittedUnsafeInstructionCodes).toEqual([
      "style.intent.omittedDatabaseInstruction",
      "style.intent.omittedExecutableStyleInstruction",
      "style.intent.omittedExternalMutation",
      "style.intent.omittedReactFlowBehaviorInstruction",
      "style.intent.omittedSecretInstruction",
    ]);
    expect(result.warnings.map((warning) => warning.code)).toEqual(
      result.draft.safety.omittedUnsafeInstructionCodes,
    );
    expect(JSON.stringify(result)).not.toContain(".env");
    expect(JSON.stringify(result)).not.toContain("nodesDraggable");
  });

  it("is deterministic for the same brief", () => {
    const brief = "Quiet matte interface with comfortable density and warm accents.";

    expect(normalizeNexusStyleIntentV1(brief)).toEqual(
      normalizeNexusStyleIntentV1(brief),
    );
  });
});
