import {
  createNexusStyleChecksumV1,
  createNexusStyleCanonicalJsonV1,
} from "./checksum";
import type { NexusStylePreviewPatchV1 } from "./preview";
import type {
  NexusSkinPackSpecimenGalleryV2,
  NexusSpecimenPreviewIssueV2,
  NexusSpecimenVisualV2,
} from "./v2-recipe-specimen-preview";
import {
  createNexusSkinPackSpecimenGalleryFromAcceptedPackV2,
} from "./v2-recipe-specimen-preview";
import {
  createNexusSkinPackTokenPreviewPatchV2,
  NEXUS_SKIN_PACK_TOKEN_PREVIEW_TEXT_MAX_CHARACTERS_V2,
} from "./v2-token-preview";
import type {
  NexusSkinPackV2,
  NexusV2ValidationIssue,
  NexusV2ValidationReport,
} from "./v2-contracts";
import { validateNexusSkinPackV2 } from "./v2-validators";

export const NEXUS_SKIN_PACK_RENDER_PLAN_IR_VERSION_V1 =
  "nexus-skin-pack-render-plan-ir-v1" as const;

export type NexusSkinPackRenderPlanIssueCodeV1 =
  | "renderPlan.validationRejected"
  | "renderPlan.invalidJson"
  | "renderPlan.textEmpty"
  | "renderPlan.textTooLarge"
  | "renderPlan.tokenPreviewRejected"
  | "renderPlan.specimenPreviewRejected"
  | "renderPlan.unsafeVisualValue";

export type NexusSkinPackRenderPlanIssueV1 = {
  code: NexusSkinPackRenderPlanIssueCodeV1;
  path: string;
  message: string;
};

export type NexusSkinPackRenderPlanPerformanceBudgetSummaryV1 = {
  contract: string;
  maxCssVariableCount: number;
  maxStaticManifestBytes: number;
  maxRecipeGroups: number;
  maxAdapterOutputs: number;
  observedCssVariableCount: number;
  observedStaticManifestBytes: number;
  observedRecipeGroups: number;
  observedAdapterOutputs: number;
  tokenVariableCount: number;
  specimenCount: number;
  fallbackCount: number;
  status: "within-static-budget" | "blocked";
  safeForProduction: false;
  reasonCodes: string[];
};

export type NexusSkinPackRenderPlanRecipeCoverageV1 =
  NexusSkinPackSpecimenGalleryV2["coverage"];

export type NexusSkinPackRenderPlanStageV1 =
  | {
      kind: "set-scoped-css-variables";
      stageId: "tokens";
      variableCount: number;
      variables: Record<string, string>;
      checksum: string;
    }
  | {
      kind: "render-style-lab-specimens";
      stageId: "specimens";
      specimenCount: number;
      recipeCoverage: NexusSkinPackRenderPlanRecipeCoverageV1;
      checksum: string;
    }
  | {
      kind: "review-only-assets";
      stageId: "assets";
      assetPackId?: string;
      requiredAssetCount: number;
      lazyAssetCount: number;
      optionalAssetCount: number;
      criticalBytes: number;
      checksum: string;
    }
  | {
      kind: "review-only-layout";
      stageId: "layout";
      density?: string;
      presetId?: string;
      surfaceTreatment?: string;
      checksum: string;
    };

export type NexusSkinPackRenderPlanV1 = {
  kind: "nexus-render-plan";
  version: typeof NEXUS_SKIN_PACK_RENDER_PLAN_IR_VERSION_V1;
  planId: string;
  renderMode: "style-lab-preview";
  skinPackId: string;
  manifestId: string;
  displayName: string;
  tokenPreviewPatch: NexusStylePreviewPatchV1;
  tokenVariables: Record<string, string>;
  specimenGallery: NexusSkinPackSpecimenGalleryV2;
  specimens: NexusSkinPackSpecimenGalleryV2["specimens"];
  recipeCoverage: NexusSkinPackRenderPlanRecipeCoverageV1;
  fallbacks: NexusSpecimenPreviewIssueV2[];
  performanceBudget: NexusSkinPackRenderPlanPerformanceBudgetSummaryV1;
  stages: NexusSkinPackRenderPlanStageV1[];
  diagnostics: {
    checksum: string;
    tokenVariableCount: number;
    specimenCount: number;
    fallbackCount: number;
    warningCount: number;
    cssVariableBudgetUsedPercent: number;
    staticManifestBudgetUsedPercent: number;
  };
  eligibility: {
    canPreviewTokens: boolean;
    canRenderSpecimens: boolean;
    canPreviewAssets: false;
    canPreviewLayout: false;
    canApplyProduction: false;
    reasonCodes: string[];
  };
  checksums: {
    tokenVariables: string;
    specimens: string;
    performanceBudget: string;
    renderPlan: string;
  };
};

export type NexusSkinPackRenderPlanReportV1 = {
  accepted: boolean;
  version: typeof NEXUS_SKIN_PACK_RENDER_PLAN_IR_VERSION_V1;
  errors: NexusSkinPackRenderPlanIssueV1[];
  warnings: NexusSkinPackRenderPlanIssueV1[];
  info: NexusSkinPackRenderPlanIssueV1[];
  validation: NexusV2ValidationReport;
};

export type NexusSkinPackRenderPlanResultV1 =
  | {
      accepted: true;
      renderPlan: NexusSkinPackRenderPlanV1;
      report: NexusSkinPackRenderPlanReportV1;
    }
  | {
      accepted: false;
      report: NexusSkinPackRenderPlanReportV1;
    };

const emptyValidationReport: NexusV2ValidationReport = {
  accepted: false,
  errors: [],
  info: [],
  warnings: [],
};

export function compileNexusSkinPackRenderPlanTextV2(
  text: string,
): NexusSkinPackRenderPlanResultV1 {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return rejectRenderPlan(
      "renderPlan.textEmpty",
      "Render Plan IR requires non-empty V2 Skin Pack JSON.",
      "$",
    );
  }

  if (trimmed.length > NEXUS_SKIN_PACK_TOKEN_PREVIEW_TEXT_MAX_CHARACTERS_V2) {
    return rejectRenderPlan(
      "renderPlan.textTooLarge",
      "Render Plan IR input exceeds the allowed size.",
      "$",
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return rejectRenderPlan(
      "renderPlan.invalidJson",
      "Render Plan IR requires valid V2 Skin Pack JSON.",
      "$",
    );
  }

  return compileNexusSkinPackRenderPlanV2(parsed);
}

export function compileNexusSkinPackRenderPlanV2(
  candidate: unknown,
): NexusSkinPackRenderPlanResultV1 {
  const validation = validateNexusSkinPackV2(candidate);

  if (!validation.accepted || !validation.skinPack) {
    return rejectRenderPlan(
      "renderPlan.validationRejected",
      "Render Plan IR requires an accepted V2 Skin Pack.",
      "$",
      validation,
      validation.errors.map(toRenderPlanValidationWarning),
    );
  }

  return createNexusSkinPackRenderPlanFromAcceptedPackV2(
    validation.skinPack,
    validation,
  );
}

export function createNexusSkinPackRenderPlanFromAcceptedPackV2(
  skinPack: NexusSkinPackV2,
  validation: NexusV2ValidationReport = {
    accepted: true,
    errors: [],
    info: [],
    warnings: [],
  },
): NexusSkinPackRenderPlanResultV1 {
  const tokenPreview = createNexusSkinPackTokenPreviewPatchV2(skinPack, validation);

  if (!tokenPreview.accepted) {
    return rejectRenderPlan(
      "renderPlan.tokenPreviewRejected",
      "Render Plan IR could not compile token-only preview variables.",
      "$.tokens",
      tokenPreview.report.validation,
      tokenPreview.report.errors.map(toRenderPlanValidationWarning),
    );
  }

  const unsafeTokenIssue = findUnsafeRecordValue(
    tokenPreview.patch.variables,
    "$.renderPlan.tokenVariables",
  );

  if (unsafeTokenIssue) {
    return rejectRenderPlan(
      "renderPlan.unsafeVisualValue",
      "Render Plan IR rejected unsafe token preview output.",
      unsafeTokenIssue.path,
      validation,
      [unsafeTokenIssue],
    );
  }

  const specimenPreview = createNexusSkinPackSpecimenGalleryFromAcceptedPackV2(
    skinPack,
    validation,
  );

  if (!specimenPreview.accepted) {
    return rejectRenderPlan(
      "renderPlan.specimenPreviewRejected",
      "Render Plan IR could not compile Style Lab specimen styles.",
      "$.recipes",
      specimenPreview.report.validation,
      specimenPreview.report.errors.map(toRenderPlanSpecimenWarning),
    );
  }

  const unsafeSpecimenIssue = findUnsafeSpecimenValue(specimenPreview.gallery.specimens);

  if (unsafeSpecimenIssue) {
    return rejectRenderPlan(
      "renderPlan.unsafeVisualValue",
      "Render Plan IR rejected unsafe specimen style output.",
      unsafeSpecimenIssue.path,
      validation,
      [unsafeSpecimenIssue],
    );
  }

  const tokenVariables = sortStringRecord(tokenPreview.patch.variables);
  const tokenChecksum = createNexusStyleChecksumV1(tokenVariables);
  const specimens = specimenPreview.gallery.specimens;
  const specimenChecksum = createNexusStyleChecksumV1(specimens);
  const performanceBudget = createPerformanceBudgetSummary({
    fallbackCount: specimenPreview.gallery.fallbacks.length,
    skinPack,
    specimenCount: Object.keys(specimens).length,
    tokenVariableCount: Object.keys(tokenVariables).length,
    validation,
  });
  const performanceBudgetChecksum = createNexusStyleChecksumV1(performanceBudget);
  const stages = createRenderPlanStages({
    skinPack,
    specimenChecksum,
    specimenPreview,
    tokenChecksum,
    tokenVariables,
  });
  const renderPlanChecksum = createNexusStyleChecksumV1({
    manifestId: skinPack.manifest.manifestId,
    performanceBudget,
    skinPackId: skinPack.id,
    specimenChecksum,
    stages,
    tokenChecksum,
  });
  const reasonCodes = createEligibilityReasonCodes(skinPack, performanceBudget);

  return {
    accepted: true,
    renderPlan: {
      checksums: {
        performanceBudget: performanceBudgetChecksum,
        renderPlan: renderPlanChecksum,
        specimens: specimenChecksum,
        tokenVariables: tokenChecksum,
      },
      diagnostics: {
        checksum: renderPlanChecksum,
        cssVariableBudgetUsedPercent: percentage(
          performanceBudget.tokenVariableCount,
          performanceBudget.maxCssVariableCount,
        ),
        fallbackCount: performanceBudget.fallbackCount,
        specimenCount: performanceBudget.specimenCount,
        staticManifestBudgetUsedPercent: percentage(
          performanceBudget.observedStaticManifestBytes,
          performanceBudget.maxStaticManifestBytes,
        ),
        tokenVariableCount: performanceBudget.tokenVariableCount,
        warningCount:
          validation.warnings.length + specimenPreview.gallery.fallbacks.length,
      },
      displayName: skinPack.metadata.displayName,
      eligibility: {
        canApplyProduction: false,
        canPreviewAssets: false,
        canPreviewLayout: false,
        canPreviewTokens: true,
        canRenderSpecimens: true,
        reasonCodes,
      },
      fallbacks: specimenPreview.gallery.fallbacks,
      kind: "nexus-render-plan",
      manifestId: skinPack.manifest.manifestId,
      performanceBudget,
      planId: `${skinPack.id}:style-lab-render-plan:${renderPlanChecksum}`,
      recipeCoverage: specimenPreview.gallery.coverage,
      renderMode: "style-lab-preview",
      skinPackId: skinPack.id,
      specimenGallery: specimenPreview.gallery,
      specimens,
      stages,
      tokenPreviewPatch: tokenPreview.patch,
      tokenVariables,
      version: NEXUS_SKIN_PACK_RENDER_PLAN_IR_VERSION_V1,
    },
    report: createRenderPlanReport({
      accepted: true,
      errors: [],
      info: [],
      validation,
      warnings: specimenPreview.gallery.fallbacks.map(toRenderPlanSpecimenWarning),
    }),
  };
}

function createRenderPlanStages({
  skinPack,
  specimenChecksum,
  specimenPreview,
  tokenChecksum,
  tokenVariables,
}: {
  skinPack: NexusSkinPackV2;
  specimenChecksum: string;
  specimenPreview: { gallery: NexusSkinPackSpecimenGalleryV2 };
  tokenChecksum: string;
  tokenVariables: Record<string, string>;
}): NexusSkinPackRenderPlanStageV1[] {
  return [
    {
      checksum: tokenChecksum,
      kind: "set-scoped-css-variables",
      stageId: "tokens",
      variableCount: Object.keys(tokenVariables).length,
      variables: tokenVariables,
    },
    {
      checksum: specimenChecksum,
      kind: "render-style-lab-specimens",
      recipeCoverage: specimenPreview.gallery.coverage,
      specimenCount: Object.keys(specimenPreview.gallery.specimens).length,
      stageId: "specimens",
    },
    {
      assetPackId: skinPack.assets?.assetPackId,
      checksum: createNexusStyleChecksumV1({
        assetPackId: skinPack.assets?.assetPackId ?? "none",
        lazyAssetIds: skinPack.assets?.lazyAssetIds ?? [],
        optionalAssetIds: skinPack.assets?.optionalAssetIds ?? [],
        requiredAssetIds: skinPack.assets?.requiredAssetIds ?? [],
      }),
      criticalBytes: 0,
      kind: "review-only-assets",
      lazyAssetCount: skinPack.assets?.lazyAssetIds?.length ?? 0,
      optionalAssetCount: skinPack.assets?.optionalAssetIds?.length ?? 0,
      requiredAssetCount: skinPack.assets?.requiredAssetIds.length ?? 0,
      stageId: "assets",
    },
    {
      checksum: createNexusStyleChecksumV1(skinPack.layoutPreset ?? "none"),
      density: skinPack.layoutPreset?.density,
      kind: "review-only-layout",
      presetId: skinPack.layoutPreset?.presetId,
      stageId: "layout",
      surfaceTreatment: skinPack.layoutPreset?.surfaceTreatment,
    },
  ];
}

function createPerformanceBudgetSummary({
  fallbackCount,
  skinPack,
  specimenCount,
  tokenVariableCount,
  validation,
}: {
  fallbackCount: number;
  skinPack: NexusSkinPackV2;
  specimenCount: number;
  tokenVariableCount: number;
  validation: NexusV2ValidationReport;
}): NexusSkinPackRenderPlanPerformanceBudgetSummaryV1 {
  const reasonCodes = ["renderPlan.productionApplyBlocked"];

  if (skinPack.assets) {
    reasonCodes.push("renderPlan.assetsReviewOnly");
  }

  if (skinPack.layoutPreset) {
    reasonCodes.push("renderPlan.layoutReviewOnly");
  }

  reasonCodes.push("renderPlan.recipesStyleLabOnly");

  if (fallbackCount > 0) {
    reasonCodes.push("renderPlan.specimenFallbacks");
  }

  return {
    contract: skinPack.performanceBudget.contract,
    fallbackCount,
    maxAdapterOutputs: skinPack.performanceBudget.maxAdapterOutputs,
    maxCssVariableCount: skinPack.performanceBudget.maxCssVariableCount,
    maxRecipeGroups: skinPack.performanceBudget.maxRecipeGroups,
    maxStaticManifestBytes: skinPack.performanceBudget.maxStaticManifestBytes,
    observedAdapterOutputs: validation.totals?.adapterOutputs ?? 0,
    observedCssVariableCount: validation.totals?.cssVariableCount ?? tokenVariableCount,
    observedRecipeGroups: validation.totals?.recipeGroups ?? 0,
    observedStaticManifestBytes: validation.totals?.normalizedManifestBytes ?? 0,
    reasonCodes,
    safeForProduction: false,
    specimenCount,
    status: validation.accepted ? "within-static-budget" : "blocked",
    tokenVariableCount,
  };
}

function createEligibilityReasonCodes(
  skinPack: NexusSkinPackV2,
  performanceBudget: NexusSkinPackRenderPlanPerformanceBudgetSummaryV1,
) {
  return Array.from(
    new Set([
      "renderPlan.styleLabOnly",
      ...performanceBudget.reasonCodes,
      ...(skinPack.compatibility.warnings ?? []),
    ]),
  ).sort((left, right) => left.localeCompare(right));
}

function rejectRenderPlan(
  code: NexusSkinPackRenderPlanIssueCodeV1,
  message: string,
  path: string,
  validation: NexusV2ValidationReport = emptyValidationReport,
  warnings: NexusSkinPackRenderPlanIssueV1[] = [],
): NexusSkinPackRenderPlanResultV1 {
  return {
    accepted: false,
    report: createRenderPlanReport({
      accepted: false,
      errors: [{ code, message, path }],
      info: [],
      validation,
      warnings,
    }),
  };
}

function createRenderPlanReport({
  accepted,
  errors,
  info,
  validation,
  warnings,
}: {
  accepted: boolean;
  errors: NexusSkinPackRenderPlanIssueV1[];
  info: NexusSkinPackRenderPlanIssueV1[];
  validation: NexusV2ValidationReport;
  warnings: NexusSkinPackRenderPlanIssueV1[];
}): NexusSkinPackRenderPlanReportV1 {
  return {
    accepted,
    errors: sortIssues(errors),
    info: sortIssues(info),
    validation: stripValidation(validation),
    version: NEXUS_SKIN_PACK_RENDER_PLAN_IR_VERSION_V1,
    warnings: sortIssues(warnings),
  };
}

function toRenderPlanValidationWarning(
  issue: NexusV2ValidationIssue,
): NexusSkinPackRenderPlanIssueV1 {
  return {
    code: "renderPlan.validationRejected",
    message: issue.code,
    path: issue.path,
  };
}

function toRenderPlanSpecimenWarning(
  issue: NexusSpecimenPreviewIssueV2,
): NexusSkinPackRenderPlanIssueV1 {
  return {
    code:
      issue.code === "specimenPreview.unsafeVisualValue"
        ? "renderPlan.unsafeVisualValue"
        : "renderPlan.specimenPreviewRejected",
    message: issue.code,
    path: issue.path,
  };
}

function findUnsafeSpecimenValue(
  specimens: Record<string, NexusSpecimenVisualV2>,
): NexusSkinPackRenderPlanIssueV1 | undefined {
  for (const [specimenId, specimen] of Object.entries(specimens).sort()) {
    const styleIssue = findUnsafeRecordValue(
      specimen.style,
      `$.renderPlan.specimens.${specimenId}.style`,
    );

    if (styleIssue) {
      return styleIssue;
    }

    for (const [partId, partStyle] of Object.entries(specimen.parts).sort()) {
      const partIssue = findUnsafeRecordValue(
        partStyle,
        `$.renderPlan.specimens.${specimenId}.parts.${partId}`,
      );

      if (partIssue) {
        return partIssue;
      }
    }
  }

  return undefined;
}

function findUnsafeRecordValue(
  record: Record<string, unknown>,
  path: string,
): NexusSkinPackRenderPlanIssueV1 | undefined {
  for (const [key, value] of Object.entries(record).sort()) {
    if (forbiddenRenderPlanKeys.has(key.toLowerCase())) {
      return {
        code: "renderPlan.unsafeVisualValue",
        message: "Render Plan IR output included a forbidden visual key.",
        path: `${path}.${key}`,
      };
    }

    if (typeof value === "string" && isUnsafeRenderPlanValue(value)) {
      return {
        code: "renderPlan.unsafeVisualValue",
        message: "Render Plan IR output included an unsafe visual value.",
        path: `${path}.${key}`,
      };
    }
  }

  return undefined;
}

const forbiddenRenderPlanKeys = new Set([
  "classname",
  "selector",
  "style",
  "zindex",
  "pointerevents",
  "position",
  "overflow",
  "onclick",
  "onchange",
  "drag",
  "resize",
  "role",
  "tabindex",
]);

function isUnsafeRenderPlanValue(value: string) {
  return (
    /<script/i.test(value) ||
    /javascript:/i.test(value) ||
    /\burl\s*\(/i.test(value) ||
    /\b(?:https?|ftp):\/\//i.test(value) ||
    /\b(?:blob|file|data):/i.test(value) ||
    /[{}]/.test(value) ||
    /;\s*[-_a-z]+\s*:/i.test(value)
  );
}

function percentage(value: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }

  return Math.round((value / max) * 10_000) / 100;
}

function stripValidation(
  validation: NexusV2ValidationReport,
): NexusV2ValidationReport {
  return {
    accepted: validation.accepted,
    errors: validation.errors.map(stripValidationIssue),
    info: validation.info.map(stripValidationIssue),
    ...(validation.totals ? { totals: validation.totals } : {}),
    warnings: validation.warnings.map(stripValidationIssue),
  };
}

function stripValidationIssue(issue: NexusV2ValidationIssue) {
  return {
    code: issue.code,
    message: issue.message,
    path: issue.path,
  };
}

function sortIssues<T extends { code: string; path: string }>(issues: T[]) {
  return [...issues].sort((left, right) => {
    const pathOrder = left.path.localeCompare(right.path);

    return pathOrder === 0 ? left.code.localeCompare(right.code) : pathOrder;
  });
}

function sortStringRecord(record: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function stringifyNexusSkinPackRenderPlanSummaryV1(
  renderPlan: NexusSkinPackRenderPlanV1,
) {
  return createNexusStyleCanonicalJsonV1({
    diagnostics: renderPlan.diagnostics,
    eligibility: renderPlan.eligibility,
    manifestId: renderPlan.manifestId,
    performanceBudget: renderPlan.performanceBudget,
    planId: renderPlan.planId,
    recipeCoverage: renderPlan.recipeCoverage,
    skinPackId: renderPlan.skinPackId,
    stages: renderPlan.stages.map((stage) => ({
      checksum: stage.checksum,
      kind: stage.kind,
      stageId: stage.stageId,
    })),
    version: renderPlan.version,
  });
}
