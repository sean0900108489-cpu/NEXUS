import {
  NEXUS_STYLE_TOKEN_GROUPS_V1,
  type NexusStyleRecipesV1,
  type NexusStyleTokenGroupNameV1,
} from "./manifest";
import type {
  NexusSkinPackV2,
  NexusV2ValidationIssue,
  NexusV2ValidationReport,
} from "./v2-contracts";
import { validateNexusSkinPackV2 } from "./v2-validators";

export const NEXUS_SKIN_PACK_SPECIMEN_PREVIEW_VERSION_V2 =
  "nexus-skin-pack-specimen-preview-v2" as const;

export type NexusSpecimenPreviewIssueCodeV2 =
  | "specimenPreview.validationRejected"
  | "specimenPreview.missingRecipe"
  | "specimenPreview.missingRecipeSlot"
  | "specimenPreview.unsupportedRecipeValue"
  | "specimenPreview.missingToken"
  | "specimenPreview.unsafeVisualValue";

export type NexusSpecimenPreviewIssueV2 = {
  code: NexusSpecimenPreviewIssueCodeV2;
  path: string;
  message: string;
};

export type NexusSpecimenStyleV2 = {
  background?: string;
  borderColor?: string;
  borderRadius?: string;
  boxShadow?: string;
  color?: string;
  opacity?: number;
  outlineColor?: string;
};

export type NexusSpecimenIdV2 =
  | "panel"
  | "buttonDefault"
  | "buttonHover"
  | "buttonDisabled"
  | "input"
  | "badgeStatus"
  | "commandPalette"
  | "agentWindow"
  | "modalDialog"
  | "sidebarDock";

export type NexusSpecimenVisualV2 = {
  id: NexusSpecimenIdV2;
  label: string;
  recipeGroup: string;
  style: NexusSpecimenStyleV2;
  parts: Record<string, NexusSpecimenStyleV2>;
};

export type NexusSpecimenRecipeCoverageV2 = {
  supportedRecipeGroups: string[];
  missingRecipeGroups: string[];
  supportedSpecimens: NexusSpecimenIdV2[];
  fallbackCount: number;
};

export type NexusSkinPackSpecimenGalleryV2 = {
  version: typeof NEXUS_SKIN_PACK_SPECIMEN_PREVIEW_VERSION_V2;
  skinPackId: string;
  manifestId: string;
  displayName: string;
  specimens: Record<NexusSpecimenIdV2, NexusSpecimenVisualV2>;
  coverage: NexusSpecimenRecipeCoverageV2;
  fallbacks: NexusSpecimenPreviewIssueV2[];
};

export type NexusSkinPackSpecimenPreviewReportV2 = {
  accepted: boolean;
  version: typeof NEXUS_SKIN_PACK_SPECIMEN_PREVIEW_VERSION_V2;
  errors: NexusSpecimenPreviewIssueV2[];
  warnings: NexusSpecimenPreviewIssueV2[];
  info: NexusSpecimenPreviewIssueV2[];
  validation: NexusV2ValidationReport;
};

export type NexusSkinPackSpecimenPreviewResultV2 =
  | {
      accepted: true;
      gallery: NexusSkinPackSpecimenGalleryV2;
      report: NexusSkinPackSpecimenPreviewReportV2;
    }
  | {
      accepted: false;
      report: NexusSkinPackSpecimenPreviewReportV2;
    };

type SpecimenBuildContext = {
  skinPack: NexusSkinPackV2;
  issues: NexusSpecimenPreviewIssueV2[];
  issueKeys: Set<string>;
};

const supportedSpecimenRecipeGroups: Array<keyof NexusStyleRecipesV1> = [
  "panel",
  "button",
  "input",
  "badge",
  "window",
  "modal",
  "commandPalette",
  "dock",
];

const emptyValidationReport: NexusV2ValidationReport = {
  accepted: true,
  errors: [],
  info: [],
  warnings: [],
};

const safeLiteralFallbacks = {
  accent: "#e5e5e5",
  border: "rgb(226 232 240 / 0.12)",
  radius: "4px",
  shadow: "0 24px 80px rgb(0 0 0 / 0.38)",
  surface: "rgb(20 20 20 / 0.78)",
  text: "#f5f5f5",
} as const;

export function compileNexusSkinPackSpecimenPreviewV2(
  candidate: unknown,
): NexusSkinPackSpecimenPreviewResultV2 {
  const validation = validateNexusSkinPackV2(candidate);

  if (!validation.accepted || !validation.skinPack) {
    return {
      accepted: false,
      report: createSpecimenPreviewReport({
        accepted: false,
        errors: [
          {
            code: "specimenPreview.validationRejected",
            message: "Specimen gallery requires an accepted V2 Skin Pack.",
            path: "$",
          },
        ],
        info: [],
        validation,
        warnings: validation.errors.map(toSpecimenValidationIssue),
      }),
    };
  }

  return createNexusSkinPackSpecimenGalleryFromAcceptedPackV2(
    validation.skinPack,
    validation,
  );
}

export function compileNexusSkinPackSpecimenPreviewTextV2(
  text: string,
): NexusSkinPackSpecimenPreviewResultV2 {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return rejectSpecimenPreviewText(
      "specimenPreview.validationRejected",
      "Specimen gallery requires non-empty V2 Skin Pack JSON.",
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return rejectSpecimenPreviewText(
      "specimenPreview.validationRejected",
      "Specimen gallery requires valid V2 Skin Pack JSON.",
    );
  }

  return compileNexusSkinPackSpecimenPreviewV2(parsed);
}

export function createNexusSkinPackSpecimenGalleryFromAcceptedPackV2(
  skinPack: NexusSkinPackV2,
  validation: NexusV2ValidationReport = emptyValidationReport,
): NexusSkinPackSpecimenPreviewResultV2 {
  const context: SpecimenBuildContext = {
    issueKeys: new Set(),
    issues: [],
    skinPack,
  };

  const specimens: Record<NexusSpecimenIdV2, NexusSpecimenVisualV2> = {
    agentWindow: createAgentWindowSpecimen(context),
    badgeStatus: createBadgeStatusSpecimen(context),
    buttonDefault: createButtonDefaultSpecimen(context),
    buttonDisabled: createButtonDisabledSpecimen(context),
    buttonHover: createButtonHoverSpecimen(context),
    commandPalette: createCommandPaletteSpecimen(context),
    input: createInputSpecimen(context),
    modalDialog: createModalDialogSpecimen(context),
    panel: createPanelSpecimen(context),
    sidebarDock: createSidebarDockSpecimen(context),
  };
  const supportedRecipeGroups = supportedSpecimenRecipeGroups.filter((group) =>
    isRecord(skinPack.manifest.payload.recipes[group]),
  );
  const missingRecipeGroups = supportedSpecimenRecipeGroups.filter(
    (group) => !supportedRecipeGroups.includes(group),
  );
  const fallbacks = sortIssues(context.issues);

  return {
    accepted: true,
    gallery: {
      coverage: {
        fallbackCount: fallbacks.length,
        missingRecipeGroups: missingRecipeGroups.sort(),
        supportedRecipeGroups: supportedRecipeGroups.sort(),
        supportedSpecimens: Object.keys(specimens).sort() as NexusSpecimenIdV2[],
      },
      displayName: skinPack.metadata.displayName,
      fallbacks,
      manifestId: skinPack.manifest.manifestId,
      skinPackId: skinPack.id,
      specimens,
      version: NEXUS_SKIN_PACK_SPECIMEN_PREVIEW_VERSION_V2,
    },
    report: createSpecimenPreviewReport({
      accepted: true,
      errors: [],
      info: [],
      validation,
      warnings: fallbacks,
    }),
  };
}

function createPanelSpecimen(
  context: SpecimenBuildContext,
): NexusSpecimenVisualV2 {
  return createSpecimen(context, {
    id: "panel",
    label: "Panel",
    recipeGroup: "panel",
    style: {
      background: recipeValue(context, ["panel", "surface"], "surface.panel"),
      borderColor: recipeValue(context, ["panel", "border"], "border.subtle"),
      borderRadius: tokenValue(context, "radius.surface", "$.manifest.payload.tokens.radius.surface"),
      boxShadow: recipeValue(context, ["panel", "shadow"], "shadow.panel"),
      color: recipeValue(context, ["panel", "text"], "text.primary"),
    },
  });
}

function createButtonDefaultSpecimen(
  context: SpecimenBuildContext,
): NexusSpecimenVisualV2 {
  return createSpecimen(context, {
    id: "buttonDefault",
    label: "Button / Default",
    recipeGroup: "button",
    style: {
      background: recipeValue(
        context,
        ["button", "default", "surface"],
        "surface.panelMuted",
      ),
      borderColor: recipeValue(
        context,
        ["button", "default", "border"],
        "border.subtle",
      ),
      borderRadius: tokenValue(context, "radius.surface", "$.manifest.payload.tokens.radius.surface"),
      boxShadow: tokenValue(context, "shadow.panel", "$.manifest.payload.tokens.shadow.panel"),
      color: recipeValue(context, ["button", "default", "text"], "text.primary"),
    },
  });
}

function createButtonHoverSpecimen(
  context: SpecimenBuildContext,
): NexusSpecimenVisualV2 {
  return createSpecimen(context, {
    id: "buttonHover",
    label: "Button / Hover-Like",
    recipeGroup: "button",
    style: {
      background: recipeValue(
        context,
        ["button", "hover", "surface"],
        "surface.raised",
      ),
      borderColor: recipeValue(
        context,
        ["button", "hover", "border"],
        "accent.primary",
      ),
      borderRadius: tokenValue(context, "radius.surface", "$.manifest.payload.tokens.radius.surface"),
      boxShadow: tokenValue(context, "shadow.glow", "$.manifest.payload.tokens.shadow.glow"),
      color: recipeValue(context, ["button", "hover", "text"], "text.primary"),
      outlineColor: recipeValue(
        context,
        ["button", "focus", "ring"],
        "accent.primaryStrong",
      ),
    },
  });
}

function createButtonDisabledSpecimen(
  context: SpecimenBuildContext,
): NexusSpecimenVisualV2 {
  return createSpecimen(context, {
    id: "buttonDisabled",
    label: "Button / Disabled-Like",
    recipeGroup: "button",
    style: {
      background: recipeValue(
        context,
        ["button", "default", "surface"],
        "surface.panelMuted",
      ),
      borderColor: recipeValue(
        context,
        ["button", "default", "border"],
        "border.subtle",
      ),
      borderRadius: tokenValue(context, "radius.surface", "$.manifest.payload.tokens.radius.surface"),
      color: tokenValue(context, "text.muted", "$.manifest.payload.tokens.text.muted"),
      opacity: 0.52,
    },
  });
}

function createInputSpecimen(
  context: SpecimenBuildContext,
): NexusSpecimenVisualV2 {
  return createSpecimen(context, {
    id: "input",
    label: "Input",
    recipeGroup: "input",
    style: {
      background: recipeValue(
        context,
        ["input", "default", "surface"],
        "surface.input",
      ),
      borderColor: recipeValue(
        context,
        ["input", "default", "border"],
        "border.subtle",
      ),
      borderRadius: tokenValue(context, "radius.surface", "$.manifest.payload.tokens.radius.surface"),
      color: recipeValue(context, ["input", "default", "text"], "text.primary"),
      outlineColor: recipeValue(
        context,
        ["input", "focus", "border"],
        "accent.primaryStrong",
      ),
    },
  });
}

function createBadgeStatusSpecimen(
  context: SpecimenBuildContext,
): NexusSpecimenVisualV2 {
  return createSpecimen(context, {
    id: "badgeStatus",
    label: "Badge / Status",
    recipeGroup: "badge",
    style: {
      background: recipeValue(
        context,
        ["badge", "default", "surface"],
        "surface.panelMuted",
      ),
      borderColor: recipeValue(
        context,
        ["badge", "default", "border"],
        "status.success",
      ),
      borderRadius: tokenValue(context, "radius.surface", "$.manifest.payload.tokens.radius.surface"),
      color: recipeValue(context, ["badge", "default", "text"], "status.success"),
    },
  });
}

function createCommandPaletteSpecimen(
  context: SpecimenBuildContext,
): NexusSpecimenVisualV2 {
  return createSpecimen(context, {
    id: "commandPalette",
    label: "Command Palette",
    parts: {
      activeItem: {
        background: recipeValue(
          context,
          ["commandPalette", "itemActive"],
          "accent.primary",
        ),
        borderColor: tokenValue(context, "accent.primaryStrong", "$.manifest.payload.tokens.accent.primaryStrong"),
        color: tokenValue(context, "text.inverse", "$.manifest.payload.tokens.text.inverse"),
      },
      input: {
        background: recipeValue(
          context,
          ["commandPalette", "input"],
          "surface.input",
        ),
        borderColor: tokenValue(context, "border.subtle", "$.manifest.payload.tokens.border.subtle"),
        color: tokenValue(context, "text.secondary", "$.manifest.payload.tokens.text.secondary"),
      },
      item: {
        background: recipeValue(
          context,
          ["commandPalette", "itemDefault"],
          "surface.panelMuted",
        ),
        borderColor: tokenValue(context, "border.subtle", "$.manifest.payload.tokens.border.subtle"),
        color: tokenValue(context, "text.primary", "$.manifest.payload.tokens.text.primary"),
      },
    },
    recipeGroup: "commandPalette",
    style: {
      background: recipeValue(
        context,
        ["commandPalette", "surface"],
        "surface.panel",
      ),
      borderColor: tokenValue(context, "border.subtle", "$.manifest.payload.tokens.border.subtle"),
      borderRadius: tokenValue(context, "radius.surface", "$.manifest.payload.tokens.radius.surface"),
      boxShadow: tokenValue(context, "shadow.panel", "$.manifest.payload.tokens.shadow.panel"),
      color: tokenValue(context, "text.primary", "$.manifest.payload.tokens.text.primary"),
    },
  });
}

function createAgentWindowSpecimen(
  context: SpecimenBuildContext,
): NexusSpecimenVisualV2 {
  return createSpecimen(context, {
    id: "agentWindow",
    label: "Agent Window",
    parts: {
      body: {
        background: tokenValue(context, "surface.workspace", "$.manifest.payload.tokens.surface.workspace"),
      },
      chrome: {
        background: tokenValue(context, "surface.panelMuted", "$.manifest.payload.tokens.surface.panelMuted"),
        borderColor: recipeValue(context, ["window", "border"], "border.subtle"),
        color: recipeValue(context, ["window", "text"], "text.secondary"),
      },
      status: {
        background: tokenValue(context, "accent.primary", "$.manifest.payload.tokens.accent.primary"),
        color: tokenValue(context, "text.inverse", "$.manifest.payload.tokens.text.inverse"),
      },
    },
    recipeGroup: "window",
    style: {
      background: recipeValue(context, ["window", "surface"], "surface.panel"),
      borderColor: recipeValue(context, ["window", "border"], "border.subtle"),
      borderRadius: tokenValue(context, "radius.surface", "$.manifest.payload.tokens.radius.surface"),
      boxShadow: recipeValue(context, ["window", "shadow"], "shadow.panel"),
      color: recipeValue(context, ["window", "text"], "text.primary"),
    },
  });
}

function createModalDialogSpecimen(
  context: SpecimenBuildContext,
): NexusSpecimenVisualV2 {
  return createSpecimen(context, {
    id: "modalDialog",
    label: "Modal / Dialog",
    parts: {
      backdrop: {
        background: recipeValue(context, ["modal", "backdrop"], "surface.overlay"),
      },
      callout: {
        background: tokenValue(context, "surface.panelMuted", "$.manifest.payload.tokens.surface.panelMuted"),
        borderColor: tokenValue(context, "status.warning", "$.manifest.payload.tokens.status.warning"),
        color: tokenValue(context, "status.warning", "$.manifest.payload.tokens.status.warning"),
      },
      footer: {
        background: tokenValue(context, "surface.panelMuted", "$.manifest.payload.tokens.surface.panelMuted"),
        borderColor: recipeValue(context, ["modal", "border"], "border.subtle"),
      },
    },
    recipeGroup: "modal",
    style: {
      background: recipeValue(context, ["modal", "surface"], "surface.panel"),
      borderColor: recipeValue(context, ["modal", "border"], "border.subtle"),
      borderRadius: tokenValue(context, "radius.surface", "$.manifest.payload.tokens.radius.surface"),
      boxShadow: tokenValue(context, "shadow.panel", "$.manifest.payload.tokens.shadow.panel"),
      color: recipeValue(context, ["modal", "text"], "text.primary"),
    },
  });
}

function createSidebarDockSpecimen(
  context: SpecimenBuildContext,
): NexusSpecimenVisualV2 {
  return createSpecimen(context, {
    id: "sidebarDock",
    label: "Sidebar / Dock",
    parts: {
      activeItem: {
        background: tokenValue(context, "accent.primary", "$.manifest.payload.tokens.accent.primary"),
        borderColor: tokenValue(context, "accent.primaryStrong", "$.manifest.payload.tokens.accent.primaryStrong"),
        color: tokenValue(context, "text.inverse", "$.manifest.payload.tokens.text.inverse"),
      },
      item: {
        background: tokenValue(context, "surface.panelMuted", "$.manifest.payload.tokens.surface.panelMuted"),
        borderColor: recipeValue(context, ["dock", "border"], "border.subtle"),
        color: tokenValue(context, "text.secondary", "$.manifest.payload.tokens.text.secondary"),
      },
    },
    recipeGroup: "dock",
    style: {
      background: recipeValue(context, ["dock", "surface"], "surface.shell"),
      borderColor: recipeValue(context, ["dock", "border"], "border.subtle"),
      borderRadius: tokenValue(context, "radius.surface", "$.manifest.payload.tokens.radius.surface"),
      boxShadow: tokenValue(context, "shadow.panel", "$.manifest.payload.tokens.shadow.panel"),
      color: tokenValue(context, "text.primary", "$.manifest.payload.tokens.text.primary"),
    },
  });
}

function createSpecimen(
  context: SpecimenBuildContext,
  specimen: {
    id: NexusSpecimenIdV2;
    label: string;
    recipeGroup: string;
    style: NexusSpecimenStyleV2;
    parts?: Record<string, NexusSpecimenStyleV2>;
  },
): NexusSpecimenVisualV2 {
  return {
    id: specimen.id,
    label: specimen.label,
    parts: specimen.parts ?? {},
    recipeGroup: specimen.recipeGroup,
    style: specimen.style,
  };
}

function recipeValue(
  context: SpecimenBuildContext,
  path: readonly string[],
  fallbackReference: string,
) {
  const recipePath = `$.manifest.payload.recipes.${path.join(".")}`;
  const recipeValueCandidate = readPath(
    context.skinPack.manifest.payload.recipes,
    path,
  );

  if (recipeValueCandidate === undefined) {
    const [recipeGroup = "unknown"] = path;
    const code = isRecord(
      context.skinPack.manifest.payload.recipes[
        recipeGroup as keyof NexusStyleRecipesV1
      ],
    )
      ? "specimenPreview.missingRecipeSlot"
      : "specimenPreview.missingRecipe";

    addIssue(context, {
      code,
      message: "Specimen recipe slot was missing and token fallback was used.",
      path: recipePath,
    });

    return tokenValue(context, fallbackReference, recipePath);
  }

  if (typeof recipeValueCandidate !== "string") {
    addIssue(context, {
      code: "specimenPreview.unsupportedRecipeValue",
      message: "Specimen recipe value must be a semantic token reference.",
      path: recipePath,
    });

    return tokenValue(context, fallbackReference, recipePath);
  }

  return resolveReference(context, recipeValueCandidate, fallbackReference, recipePath);
}

function tokenValue(
  context: SpecimenBuildContext,
  reference: string,
  path: string,
) {
  return resolveReference(context, reference, reference, path);
}

function resolveReference(
  context: SpecimenBuildContext,
  reference: string,
  fallbackReference: string,
  path: string,
) {
  const value = readTokenReference(context.skinPack, reference);

  if (value !== undefined) {
    return sanitizeVisualValue(context, value, fallbackReference, path);
  }

  const fallbackValue = readTokenReference(context.skinPack, fallbackReference);

  addIssue(context, {
    code: isSemanticTokenReference(reference)
      ? "specimenPreview.missingToken"
      : "specimenPreview.unsupportedRecipeValue",
    message: "Specimen token reference was unsupported and fallback was used.",
    path,
  });

  return sanitizeVisualValue(
    context,
    fallbackValue ?? getLiteralFallback(fallbackReference),
    fallbackReference,
    path,
  );
}

function readTokenReference(
  skinPack: NexusSkinPackV2,
  reference: string,
) {
  const match = /^([a-z]+)\.([A-Za-z0-9]+)$/.exec(reference);

  if (!match) {
    return undefined;
  }

  const [, group, tokenName] = match;

  if (!isTokenGroup(group)) {
    return undefined;
  }

  const value = skinPack.manifest.payload.tokens[group][tokenName];

  return value === undefined ? undefined : String(value);
}

function sanitizeVisualValue(
  context: SpecimenBuildContext,
  value: string,
  fallbackReference: string,
  path: string,
) {
  if (!isUnsafeVisualValue(value)) {
    return value;
  }

  addIssue(context, {
    code: "specimenPreview.unsafeVisualValue",
    message: "Unsafe visual value was replaced with a local fallback.",
    path,
  });

  return getLiteralFallback(fallbackReference);
}

function getLiteralFallback(reference: string) {
  const [group] = reference.split(".");

  if (
    group === "accent" ||
    group === "border" ||
    group === "radius" ||
    group === "shadow" ||
    group === "surface" ||
    group === "text"
  ) {
    return safeLiteralFallbacks[group];
  }

  return safeLiteralFallbacks.surface;
}

function readPath(value: unknown, path: readonly string[]): unknown {
  let current = value;

  for (const segment of path) {
    if (!isRecord(current) || !(segment in current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function isSemanticTokenReference(value: string) {
  const match = /^([a-z]+)\.([A-Za-z0-9]+)$/.exec(value);

  return Boolean(match && isTokenGroup(match[1]));
}

function isTokenGroup(value: string | undefined): value is NexusStyleTokenGroupNameV1 {
  return NEXUS_STYLE_TOKEN_GROUPS_V1.includes(
    value as NexusStyleTokenGroupNameV1,
  );
}

function isUnsafeVisualValue(value: string) {
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

function rejectSpecimenPreviewText(
  code: NexusSpecimenPreviewIssueCodeV2,
  message: string,
): NexusSkinPackSpecimenPreviewResultV2 {
  const issue: NexusSpecimenPreviewIssueV2 = {
    code,
    message,
    path: "$",
  };

  return {
    accepted: false,
    report: createSpecimenPreviewReport({
      accepted: false,
      errors: [issue],
      info: [],
      validation: {
        accepted: false,
        errors: [],
        info: [],
        warnings: [],
      },
      warnings: [],
    }),
  };
}

function createSpecimenPreviewReport({
  accepted,
  errors,
  info,
  validation,
  warnings,
}: {
  accepted: boolean;
  errors: NexusSpecimenPreviewIssueV2[];
  info: NexusSpecimenPreviewIssueV2[];
  validation: NexusV2ValidationReport;
  warnings: NexusSpecimenPreviewIssueV2[];
}): NexusSkinPackSpecimenPreviewReportV2 {
  return {
    accepted,
    errors: sortIssues(errors),
    info: sortIssues(info),
    validation: stripValidation(validation),
    version: NEXUS_SKIN_PACK_SPECIMEN_PREVIEW_VERSION_V2,
    warnings: sortIssues(warnings),
  };
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

function toSpecimenValidationIssue(
  issue: NexusV2ValidationIssue,
): NexusSpecimenPreviewIssueV2 {
  return {
    code: "specimenPreview.validationRejected",
    message: issue.code,
    path: issue.path,
  };
}

function addIssue(
  context: SpecimenBuildContext,
  issue: NexusSpecimenPreviewIssueV2,
) {
  const key = `${issue.path}:${issue.code}:${issue.message}`;

  if (context.issueKeys.has(key)) {
    return;
  }

  context.issueKeys.add(key);
  context.issues.push(issue);
}

function sortIssues<T extends { code: string; path: string }>(issues: T[]) {
  return [...issues].sort((left, right) => {
    const pathOrder = left.path.localeCompare(right.path);

    return pathOrder === 0 ? left.code.localeCompare(right.code) : pathOrder;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
