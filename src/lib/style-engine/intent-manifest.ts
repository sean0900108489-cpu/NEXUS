import { createNexusStyleChecksumV1 } from "./checksum";
import type {
  NexusStyleIntentV1,
  NexusStyleManifestV1,
  NexusStyleValidationIssueV1,
  NexusStyleValidationReportV1,
} from "./manifest";
import {
  createHighContrastCarbonStyleManifestV1,
  createLegacyCyberpunkStyleManifestV1,
  HIGH_CONTRAST_CARBON_STYLE_ID,
  LEGACY_CYBERPUNK_STYLE_ID,
} from "./presets";
import {
  type NexusStyleNormalizedIntentV1,
  type NexusStyleIntentNormalizerResultV1,
  type NexusStyleIntentNormalizerSafetyV1,
} from "./intent-normalizer";
import { validateNexusStyleManifestV1 } from "./validator";

export const NEXUS_STYLE_INTENT_MANIFEST_DRAFT_VERSION_V1 =
  "nexus-style-intent-manifest-draft-v1" as const;

export type NexusStyleIntentManifestBasePresetV1 =
  | "auto"
  | typeof HIGH_CONTRAST_CARBON_STYLE_ID
  | typeof LEGACY_CYBERPUNK_STYLE_ID;

export type NexusStyleIntentManifestDraftOptionsV1 = {
  basePreset?: NexusStyleIntentManifestBasePresetV1;
  id?: string;
  name?: string;
};

export type NexusStyleIntentManifestDraftResultV1 =
  | {
      accepted: true;
      draftVersion: typeof NEXUS_STYLE_INTENT_MANIFEST_DRAFT_VERSION_V1;
      manifest: NexusStyleManifestV1;
      safety: NexusStyleIntentNormalizerSafetyV1;
      validation: NexusStyleValidationReportV1;
    }
  | {
      accepted: false;
      errors: NexusStyleValidationIssueV1[];
      safety?: NexusStyleIntentNormalizerSafetyV1;
      validation?: NexusStyleValidationReportV1;
      warnings: NexusStyleValidationIssueV1[];
    };

export function createNexusStyleManifestDraftFromIntentV1(
  result: NexusStyleIntentNormalizerResultV1,
  options: NexusStyleIntentManifestDraftOptionsV1 = {},
): NexusStyleIntentManifestDraftResultV1 {
  if (!result.accepted) {
    return {
      accepted: false,
      errors: result.errors,
      safety: result.safety,
      warnings: result.warnings,
    };
  }

  const intent = toManifestIntent(result.draft.intent);
  const manifest: NexusStyleManifestV1 = {
    ...selectBaseManifest(intent, options.basePreset),
    description: "Draft manifest derived from normalized style intent.",
    id: options.id ?? createDraftId(intent),
    intent,
    name: options.name ?? "Intent Draft",
    source: {
      kind: result.draft.source,
      reference: result.draft.normalizerVersion,
    },
  };
  const validation = validateNexusStyleManifestV1(manifest);

  if (!validation.accepted) {
    return {
      accepted: false,
      errors: validation.errors,
      safety: result.draft.safety,
      validation,
      warnings: validation.warnings,
    };
  }

  return {
    accepted: true,
    draftVersion: NEXUS_STYLE_INTENT_MANIFEST_DRAFT_VERSION_V1,
    manifest,
    safety: result.draft.safety,
    validation,
  };
}

function selectBaseManifest(
  intent: NexusStyleIntentV1,
  basePreset: NexusStyleIntentManifestBasePresetV1 = "auto",
): NexusStyleManifestV1 {
  if (
    basePreset === HIGH_CONTRAST_CARBON_STYLE_ID ||
    (basePreset === "auto" && intent.contrast === "high")
  ) {
    return createHighContrastCarbonStyleManifestV1();
  }

  return createLegacyCyberpunkStyleManifestV1();
}

function toManifestIntent(intent: NexusStyleNormalizedIntentV1): NexusStyleIntentV1 {
  return {
    contrast: intent.contrast,
    density: intent.density,
    material: [...intent.material],
    mood: [...intent.mood],
    motion: intent.motion,
  };
}

function createDraftId(intent: NexusStyleIntentV1): string {
  const hash = createNexusStyleChecksumV1(intent).split(":").at(1) ?? "00000000";

  return `intent-draft-${hash}`;
}
