import {
  normalizeNexusStyleImportCandidateV1,
  type NexusStyleImportNormalizationResultV1,
} from "./exchange";
import type {
  NexusStyleManifestV1,
  NexusStyleValidationIssueV1,
} from "./manifest";

export const NEXUS_STYLE_IMPORT_TEXT_MAX_CHARACTERS_V1 = 200_000;

export type NexusStyleImportTextOptionsV1 = {
  maxCharacters?: number;
};

export type NexusStyleImportTextResultV1 =
  | {
      accepted: true;
      source: "export-package" | "manifest";
      manifest: NexusStyleManifestV1;
      review: Extract<NexusStyleImportNormalizationResultV1, { accepted: true }>["review"];
    }
  | {
      accepted: false;
      source: NexusStyleImportNormalizationResultV1["source"] | "text";
      review?: Extract<NexusStyleImportNormalizationResultV1, { accepted: false }>["review"];
      errors: NexusStyleValidationIssueV1[];
    };

export function parseNexusStyleImportTextV1(
  text: string,
  options: NexusStyleImportTextOptionsV1 = {},
): NexusStyleImportTextResultV1 {
  const maxCharacters =
    options.maxCharacters ?? NEXUS_STYLE_IMPORT_TEXT_MAX_CHARACTERS_V1;
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return rejectText("style.importText.empty", "Style import text is empty.");
  }

  if (trimmed.length > maxCharacters) {
    return rejectText(
      "style.importText.tooLarge",
      "Style import text exceeds the allowed size.",
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return rejectText(
      "style.importText.invalidJson",
      "Style import text must be valid JSON.",
    );
  }

  const normalized = normalizeNexusStyleImportCandidateV1(parsed);

  if (normalized.accepted) {
    return normalized;
  }

  return {
    accepted: false,
    errors: normalized.review.validation.errors,
    review: normalized.review,
    source: normalized.source,
  };
}

function rejectText(
  code: string,
  message: string,
): Extract<NexusStyleImportTextResultV1, { accepted: false }> {
  return {
    accepted: false,
    errors: [
      {
        code,
        message,
        path: "$",
      },
    ],
    source: "text",
  };
}
