import type {
  NexusSkinPackV2,
  NexusSkinPackV2ValidationResult,
  NexusV2ValidationIssue,
  NexusV2ValidationReport,
} from "./v2-contracts";
import { validateNexusSkinPackV2 } from "./v2-validators";

export const NEXUS_SKIN_PACK_REVIEW_TEXT_MAX_CHARACTERS_V2 = 200_000;

export type NexusSkinPackReviewSummarySectionV2 = {
  title: string;
  rows: Array<{
    label: string;
    value: string;
  }>;
};

export type NexusSkinPackReviewSummaryV2 = {
  status: "accepted" | "rejected";
  metadata: NexusSkinPackReviewSummarySectionV2;
  assets: NexusSkinPackReviewSummarySectionV2;
  recipes: NexusSkinPackReviewSummarySectionV2;
  layoutPreset: NexusSkinPackReviewSummarySectionV2;
  performanceBudget: NexusSkinPackReviewSummarySectionV2;
};

export type NexusSkinPackReviewImportResultV2 = {
  accepted: boolean;
  source: "skin-pack-json" | "text";
  report: NexusV2ValidationReport;
  issues: NexusV2ValidationIssue[];
  summary: NexusSkinPackReviewSummaryV2;
  tokenPreview: {
    canPreviewTokens: boolean;
    reasonCodes: string[];
    tokenGroups: string[];
    variableCount: number;
  };
};

export type NexusSkinPackReviewImportOptionsV2 = {
  maxCharacters?: number;
};

export function parseNexusSkinPackReviewImportTextV2(
  text: string,
  options: NexusSkinPackReviewImportOptionsV2 = {},
): NexusSkinPackReviewImportResultV2 {
  const maxCharacters =
    options.maxCharacters ?? NEXUS_SKIN_PACK_REVIEW_TEXT_MAX_CHARACTERS_V2;
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return rejectSkinPackReviewText(
      "stylePack.reviewTextEmpty",
      "Skin pack review text is empty.",
    );
  }

  if (trimmed.length > maxCharacters) {
    return rejectSkinPackReviewText(
      "stylePack.reviewTextTooLarge",
      "Skin pack review text exceeds the allowed size.",
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return rejectSkinPackReviewText(
      "stylePack.reviewInvalidJson",
      "Skin pack review text must be valid JSON.",
    );
  }

  const validation = validateNexusSkinPackV2(parsed);

  return {
    accepted: validation.accepted,
    issues: getReviewIssues(validation),
    report: stripAcceptedSkinPack(validation),
    source: "skin-pack-json",
    summary: validation.accepted && validation.skinPack
      ? createAcceptedSummary(validation.skinPack, validation)
      : createRejectedSummary(validation),
    tokenPreview: validation.accepted && validation.skinPack
      ? createAcceptedTokenPreviewEligibility(validation.skinPack)
      : createRejectedTokenPreviewEligibility(validation),
  };
}

function rejectSkinPackReviewText(
  code: NexusV2ValidationIssue["code"],
  message: string,
): NexusSkinPackReviewImportResultV2 {
  const issue: NexusV2ValidationIssue = {
    code,
    message,
    path: "$",
  };
  const report: NexusV2ValidationReport = {
    accepted: false,
    errors: [issue],
    info: [],
    warnings: [],
  };

  return {
    accepted: false,
    issues: [issue],
    report,
    source: "text",
    summary: createRejectedSummary(report),
    tokenPreview: createRejectedTokenPreviewEligibility(report),
  };
}

function stripAcceptedSkinPack(
  validation: NexusSkinPackV2ValidationResult,
): NexusV2ValidationReport {
  return {
    accepted: validation.accepted,
    errors: validation.errors,
    info: validation.info,
    ...(validation.totals ? { totals: validation.totals } : {}),
    warnings: validation.warnings,
  };
}

function getReviewIssues(
  report: NexusV2ValidationReport,
): NexusV2ValidationIssue[] {
  return [...report.errors, ...report.warnings, ...report.info]
    .map((issue) => ({
      code: issue.code,
      message: safeText(issue.message, 140),
      path: safeText(issue.path, 120),
    }))
    .sort((left, right) => {
      const pathOrder = left.path.localeCompare(right.path);

      return pathOrder === 0
        ? left.code.localeCompare(right.code)
        : pathOrder;
    });
}

function createAcceptedSummary(
  skinPack: NexusSkinPackV2,
  report: NexusV2ValidationReport,
): NexusSkinPackReviewSummaryV2 {
  return {
    assets: {
      rows: [
        ["Binding", skinPack.assets ? "referenced" : "none"],
        ["Asset Pack", skinPack.assets?.assetPackId ?? "none"],
        ["Required", String(skinPack.assets?.requiredAssetIds.length ?? 0)],
        ["Lazy", String(skinPack.assets?.lazyAssetIds?.length ?? 0)],
        ["Optional", String(skinPack.assets?.optionalAssetIds?.length ?? 0)],
        ["Fallback", skinPack.assets?.fallbackAssetPackId ?? "none"],
      ].map(toRow),
      title: "Asset Summary",
    },
    layoutPreset: {
      rows: [
        ["Binding", skinPack.layoutPreset ? "referenced" : "none"],
        ["Preset", skinPack.layoutPreset?.presetId ?? "none"],
        ["Density", skinPack.layoutPreset?.density ?? "manifest"],
        ["Surface", skinPack.layoutPreset?.surfaceTreatment ?? "manifest"],
        ["Slot Order", String(skinPack.layoutPreset?.slotOrdering?.length ?? 0)],
        [
          "Visibility",
          [
            skinPack.layoutPreset?.visibilityHints?.sidebar ?? "sidebar:default",
            skinPack.layoutPreset?.visibilityHints?.toolrail ?? "toolrail:default",
          ].join(" / "),
        ],
      ].map(toRow),
      title: "Layout Preset Summary",
    },
    metadata: {
      rows: [
        ["Status", "accepted"],
        ["Pack", skinPack.id],
        ["Slug", skinPack.slug],
        ["Version", skinPack.packVersion],
        ["Name", skinPack.metadata.displayName],
        ["Lifecycle", skinPack.metadata.lifecycle],
        ["Source", skinPack.metadata.source],
        ["Manifest", skinPack.manifest.manifestId],
        ["Compatibility", skinPack.compatibility.result],
      ].map(toRow),
      title: "Metadata Summary",
    },
    performanceBudget: {
      rows: [
        ["Contract", skinPack.performanceBudget.contract],
        ["Max CSS Vars", String(skinPack.performanceBudget.maxCssVariableCount)],
        ["Manifest Bytes", String(skinPack.performanceBudget.maxStaticManifestBytes)],
        ["Max Recipes", String(skinPack.performanceBudget.maxRecipeGroups)],
        ["Max Adapters", String(skinPack.performanceBudget.maxAdapterOutputs)],
        ["Observed CSS Vars", String(report.totals?.cssVariableCount ?? 0)],
        ["Observed Recipes", String(report.totals?.recipeGroups ?? 0)],
        ["Observed Adapters", String(report.totals?.adapterOutputs ?? 0)],
      ].map(toRow),
      title: "Performance Budget Summary",
    },
    recipes: {
      rows: [
        ["Source", skinPack.recipes.source],
        ["Registry", skinPack.recipes.registryVersion],
        ["Groups", skinPack.recipes.groups.join(", ") || "none"],
        ["Group Count", String(skinPack.recipes.groups.length)],
        [
          "Coverage",
          [
            `window:${skinPack.recipes.adapterCoverage.windowModal ?? "none"}`,
            `flow:${skinPack.recipes.adapterCoverage.reactFlow ?? "none"}`,
            `primitive:${skinPack.recipes.adapterCoverage.primitives ?? "none"}`,
          ].join(" / "),
        ],
      ].map(toRow),
      title: "Recipe Summary",
    },
    status: "accepted",
  };
}

function createRejectedSummary(
  report: NexusV2ValidationReport,
): NexusSkinPackReviewSummaryV2 {
  return {
    assets: {
      rows: [
        ["Binding", "redacted"],
        ["Total Assets", String(report.totals?.totalAssets ?? 0)],
        ["Critical Assets", String(report.totals?.criticalAssets ?? 0)],
        ["Critical Bytes", String(report.totals?.criticalBytes ?? 0)],
        ["Total Bytes", String(report.totals?.totalBytes ?? 0)],
      ].map(toRow),
      title: "Asset Summary",
    },
    layoutPreset: {
      rows: [
        ["Binding", "redacted"],
        ["Preset", "redacted"],
        ["Density", "redacted"],
        ["Surface", "redacted"],
      ].map(toRow),
      title: "Layout Preset Summary",
    },
    metadata: {
      rows: [
        ["Status", "rejected"],
        ["Errors", String(report.errors.length)],
        ["Warnings", String(report.warnings.length)],
        ["Info", String(report.info.length)],
        ["Pack", "redacted"],
        ["Manifest", "redacted"],
      ].map(toRow),
      title: "Metadata Summary",
    },
    performanceBudget: {
      rows: [
        ["Contract", "redacted"],
        ["Observed CSS Vars", String(report.totals?.cssVariableCount ?? 0)],
        ["Manifest Bytes", String(report.totals?.normalizedManifestBytes ?? 0)],
        ["Observed Recipes", String(report.totals?.recipeGroups ?? 0)],
        ["Observed Adapters", String(report.totals?.adapterOutputs ?? 0)],
      ].map(toRow),
      title: "Performance Budget Summary",
    },
    recipes: {
      rows: [
        ["Source", "redacted"],
        ["Registry", "redacted"],
        ["Groups", "redacted"],
        ["Observed Groups", String(report.totals?.recipeGroups ?? 0)],
      ].map(toRow),
      title: "Recipe Summary",
    },
    status: "rejected",
  };
}

function createAcceptedTokenPreviewEligibility(skinPack: NexusSkinPackV2) {
  const tokenGroups = Array.from(new Set(skinPack.tokens.manifestTokenGroups))
    .sort((left, right) => left.localeCompare(right));
  const variableCount = tokenGroups.reduce((sum, group) => {
    return sum + Object.keys(skinPack.manifest.payload.tokens[group]).length;
  }, 0);

  if (variableCount === 0) {
    return {
      canPreviewTokens: false,
      reasonCodes: ["stylePack.tokenPreview.noTokenVariables"],
      tokenGroups,
      variableCount,
    };
  }

  if (variableCount > skinPack.performanceBudget.maxCssVariableCount) {
    return {
      canPreviewTokens: false,
      reasonCodes: ["stylePack.tokenPreview.variableBudgetExceeded"],
      tokenGroups,
      variableCount,
    };
  }

  return {
    canPreviewTokens: true,
    reasonCodes: [],
    tokenGroups,
    variableCount,
  };
}

function createRejectedTokenPreviewEligibility(
  report: NexusV2ValidationReport,
) {
  return {
    canPreviewTokens: false,
    reasonCodes: report.errors.length > 0
      ? report.errors.map((issue) => issue.code)
      : ["stylePack.tokenPreview.notAccepted"],
    tokenGroups: [],
    variableCount: 0,
  };
}

function toRow(row: readonly string[]) {
  const [label = "", value = ""] = row;

  return {
    label,
    value: safeText(value, 160),
  };
}

function safeText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1)}...`
    : normalized;
}
