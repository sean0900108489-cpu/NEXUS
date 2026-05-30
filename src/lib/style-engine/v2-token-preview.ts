import { createNexusStyleChecksumV1 } from "./checksum";
import type {
  NexusStylePreviewPatchV1,
} from "./preview";
import type {
  NexusStyleTokenGroupNameV1,
} from "./manifest";
import type {
  NexusSkinPackV2,
  NexusV2ValidationIssue,
  NexusV2ValidationReport,
} from "./v2-contracts";
import { validateNexusSkinPackV2 } from "./v2-validators";

export const NEXUS_SKIN_PACK_TOKEN_PREVIEW_COMPILER_VERSION_V2 =
  "nexus-skin-pack-token-preview-v2" as const;
export const NEXUS_SKIN_PACK_TOKEN_PREVIEW_TEXT_MAX_CHARACTERS_V2 = 200_000;

export type NexusSkinPackTokenPreviewReportV2 = {
  accepted: boolean;
  compilerVersion: typeof NEXUS_SKIN_PACK_TOKEN_PREVIEW_COMPILER_VERSION_V2;
  errors: NexusV2ValidationIssue[];
  warnings: NexusV2ValidationIssue[];
  info: NexusV2ValidationIssue[];
  tokenGroups: NexusStyleTokenGroupNameV1[];
  omitted: {
    assets: boolean;
    recipes: boolean;
    layoutPreset: boolean;
  };
  variableCount: number;
  validation: NexusV2ValidationReport;
};

export type NexusSkinPackTokenPreviewResultV2 =
  | {
      accepted: true;
      patch: NexusStylePreviewPatchV1;
      report: NexusSkinPackTokenPreviewReportV2;
    }
  | {
      accepted: false;
      report: NexusSkinPackTokenPreviewReportV2;
    };

export function compileNexusSkinPackTokenPreviewTextV2(
  text: string,
): NexusSkinPackTokenPreviewResultV2 {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return rejectTokenPreviewText(
      "stylePack.reviewTextEmpty",
      "Skin pack preview text is empty.",
    );
  }

  if (trimmed.length > NEXUS_SKIN_PACK_TOKEN_PREVIEW_TEXT_MAX_CHARACTERS_V2) {
    return rejectTokenPreviewText(
      "stylePack.reviewTextTooLarge",
      "Skin pack preview text exceeds the allowed size.",
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return rejectTokenPreviewText(
      "stylePack.reviewInvalidJson",
      "Skin pack preview text must be valid JSON.",
    );
  }

  return compileNexusSkinPackTokenPreviewV2(parsed);
}

export function compileNexusSkinPackTokenPreviewV2(
  candidate: unknown,
): NexusSkinPackTokenPreviewResultV2 {
  const validation = validateNexusSkinPackV2(candidate);

  if (!validation.accepted || !validation.skinPack) {
    return {
      accepted: false,
      report: createTokenPreviewReport({
        accepted: false,
        errors: validation.errors,
        info: validation.info,
        skinPack: undefined,
        validation,
        variables: {},
        warnings: validation.warnings,
      }),
    };
  }

  return createNexusSkinPackTokenPreviewPatchV2(
    validation.skinPack,
    validation,
  );
}

export function createNexusSkinPackTokenPreviewPatchV2(
  skinPack: NexusSkinPackV2,
  validation: NexusV2ValidationReport = {
    accepted: true,
    errors: [],
    info: [],
    warnings: [],
  },
): NexusSkinPackTokenPreviewResultV2 {
  const variables = emitTokenOnlyVariables(skinPack);
  const variableCount = Object.keys(variables).length;
  const errors: NexusV2ValidationIssue[] = [];

  if (variableCount === 0) {
    errors.push({
      code: "stylePack.invalidTokenBinding",
      message: "Token-only preview requires at least one token variable.",
      path: "$.tokens.manifestTokenGroups",
    });
  }

  if (variableCount > skinPack.performanceBudget.maxCssVariableCount) {
    errors.push({
      code: "stylePack.staticBudgetExceeded",
      message: "Token-only preview exceeds the CSS variable budget.",
      path: "$.performanceBudget.maxCssVariableCount",
    });
  }

  if (errors.length > 0) {
    return {
      accepted: false,
      report: createTokenPreviewReport({
        accepted: false,
        errors,
        info: [],
        skinPack,
        validation,
        variables,
        warnings: [],
      }),
    };
  }

  const checksum = createNexusStyleChecksumV1({
    compilerVersion: NEXUS_SKIN_PACK_TOKEN_PREVIEW_COMPILER_VERSION_V2,
    manifestId: skinPack.manifest.manifestId,
    skinPackId: skinPack.id,
    tokenGroups: getTokenGroups(skinPack),
    variables,
  });

  return {
    accepted: true,
    patch: {
      manifestChecksum: checksum,
      manifestId: skinPack.manifest.manifestId,
      previewId: `${skinPack.id}:token-only:${checksum}`,
      variables,
    },
    report: createTokenPreviewReport({
      accepted: true,
      errors: [],
      info: [
        {
          code: "stylePack.invalidAssetBinding",
          message: "Asset binding was reviewed only and omitted from token preview.",
          path: "$.assets",
        },
        {
          code: "stylePack.invalidRecipeBinding",
          message: "Recipe binding was reviewed only and omitted from token preview.",
          path: "$.recipes",
        },
        {
          code: "stylePack.invalidLayoutBinding",
          message: "Layout preset binding was reviewed only and omitted from token preview.",
          path: "$.layoutPreset",
        },
      ],
      skinPack,
      validation,
      variables,
      warnings: [],
    }),
  };
}

function rejectTokenPreviewText(
  code: NexusV2ValidationIssue["code"],
  message: string,
): NexusSkinPackTokenPreviewResultV2 {
  const issue: NexusV2ValidationIssue = {
    code,
    message,
    path: "$",
  };
  const validation: NexusV2ValidationReport = {
    accepted: false,
    errors: [issue],
    info: [],
    warnings: [],
  };

  return {
    accepted: false,
    report: createTokenPreviewReport({
      accepted: false,
      errors: [issue],
      info: [],
      skinPack: undefined,
      validation,
      variables: {},
      warnings: [],
    }),
  };
}

function createTokenPreviewReport({
  accepted,
  errors,
  info,
  skinPack,
  validation,
  variables,
  warnings,
}: {
  accepted: boolean;
  errors: NexusV2ValidationIssue[];
  info: NexusV2ValidationIssue[];
  skinPack: NexusSkinPackV2 | undefined;
  validation: NexusV2ValidationReport;
  variables: Record<string, string>;
  warnings: NexusV2ValidationIssue[];
}): NexusSkinPackTokenPreviewReportV2 {
  return {
    accepted,
    compilerVersion: NEXUS_SKIN_PACK_TOKEN_PREVIEW_COMPILER_VERSION_V2,
    errors: sortIssues(errors),
    info: sortIssues(info.filter((issue) => isRelevantOmission(issue, skinPack))),
    omitted: {
      assets: Boolean(skinPack?.assets),
      layoutPreset: Boolean(skinPack?.layoutPreset),
      recipes: Boolean(skinPack),
    },
    tokenGroups: skinPack ? getTokenGroups(skinPack) : [],
    validation: stripValidation(validation),
    variableCount: Object.keys(variables).length,
    warnings: sortIssues(warnings),
  };
}

function isRelevantOmission(
  issue: NexusV2ValidationIssue,
  skinPack: NexusSkinPackV2 | undefined,
) {
  if (issue.path === "$.assets") {
    return Boolean(skinPack?.assets);
  }

  if (issue.path === "$.layoutPreset") {
    return Boolean(skinPack?.layoutPreset);
  }

  return true;
}

function emitTokenOnlyVariables(skinPack: NexusSkinPackV2) {
  const entries: Array<[string, string]> = [];

  for (const group of getTokenGroups(skinPack)) {
    const tokens = skinPack.manifest.payload.tokens[group];

    for (const [tokenName, tokenValue] of Object.entries(tokens).sort()) {
      entries.push([
        toCssVariableName(group, tokenName),
        String(tokenValue),
      ]);
    }
  }

  return Object.fromEntries(
    entries.sort(([left], [right]) => left.localeCompare(right)),
  );
}

function getTokenGroups(skinPack: NexusSkinPackV2) {
  return Array.from(new Set(skinPack.tokens.manifestTokenGroups)).sort(
    (left, right) => left.localeCompare(right),
  );
}

function stripValidation(
  validation: NexusV2ValidationReport,
): NexusV2ValidationReport {
  return {
    accepted: validation.accepted,
    errors: validation.errors,
    info: validation.info,
    ...(validation.totals ? { totals: validation.totals } : {}),
    warnings: validation.warnings,
  };
}

function sortIssues(issues: NexusV2ValidationIssue[]) {
  return [...issues].sort((left, right) => {
    const pathOrder = left.path.localeCompare(right.path);

    return pathOrder === 0 ? left.code.localeCompare(right.code) : pathOrder;
  });
}

function toCssVariableName(group: string, tokenName: string) {
  return `--nexus-${toKebabCase(group)}-${toKebabCase(tokenName)}`;
}

function toKebabCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s.]+/g, "-")
    .toLowerCase();
}
