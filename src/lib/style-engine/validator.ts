import {
  NEXUS_STYLE_MANIFEST_VERSION,
  NEXUS_STYLE_RECIPE_GROUPS_V1,
  NEXUS_STYLE_REQUIRED_TOKENS_V1,
  NEXUS_STYLE_TOKEN_GROUPS_V1,
  type NexusStyleManifestV1,
  type NexusStyleValidationIssueV1,
  type NexusStyleValidationReportV1,
} from "./manifest";
import { evaluateNexusStyleTextContrast } from "./accessibility";

type MutableReport = {
  manifestId?: string;
  errors: NexusStyleValidationIssueV1[];
  warnings: NexusStyleValidationIssueV1[];
  info: NexusStyleValidationIssueV1[];
};

const topLevelKeys = new Set([
  "schemaVersion",
  "id",
  "name",
  "description",
  "author",
  "source",
  "mode",
  "intent",
  "tokens",
  "recipes",
  "adapters",
  "constraints",
]);

const forbiddenStringPatterns: Array<{ code: string; pattern: RegExp }> = [
  { code: "style.forbidden.script", pattern: /<script/i },
  { code: "style.forbidden.javascriptUrl", pattern: /javascript:/i },
  { code: "style.forbidden.eval", pattern: /\beval\s*\(/i },
  { code: "style.forbidden.functionConstructor", pattern: /\bFunction\s*\(/ },
  { code: "style.forbidden.dynamicImport", pattern: /\bimport\s*\(/ },
  { code: "style.forbidden.cssImport", pattern: /@import/i },
  { code: "style.forbidden.cssBlock", pattern: /[{}]/ },
  { code: "style.forbidden.cssDeclarationList", pattern: /;\s*[-_a-z]+\s*:/i },
  { code: "style.forbidden.url", pattern: /\burl\s*\(/i },
  { code: "style.forbidden.envFile", pattern: /\.env\b/i },
  { code: "style.forbidden.processEnv", pattern: /process\.env/i },
  {
    code: "style.forbidden.serviceRole",
    pattern: /\b(?:service[-_\s]?role|supabase[-_\s]?service[-_\s]?role[-_\s]?key)\b/i,
  },
  { code: "style.forbidden.anonKey", pattern: /NEXT_PUBLIC_SUPABASE_ANON_KEY/i },
  { code: "style.forbidden.themeConfig", pattern: /workspace\.themeConfig/i },
  { code: "style.forbidden.syncQueue", pattern: /queueThemeConfigCloudSync/i },
  { code: "style.forbidden.snapshotSerializer", pattern: /serializeActiveUiStateSnapshot/i },
  { code: "style.forbidden.workspaceProjection", pattern: /workspace_state_entities/i },
  { code: "style.forbidden.dynamicZIndex", pattern: /\bz-\[/i },
  {
    code: "style.forbidden.protectedBehaviorClass",
    pattern: new RegExp(["pointer", "events"].join("-"), "i"),
  },
  {
    code: "style.forbidden.protectedBehaviorClass",
    pattern: new RegExp(`\\b${["no", "drag"].join("")}\\b`, "i"),
  },
  {
    code: "style.forbidden.protectedBehaviorClass",
    pattern: new RegExp(`\\b${["no", "pan"].join("")}\\b`, "i"),
  },
  {
    code: "style.forbidden.protectedBehaviorClass",
    pattern: new RegExp(`\\b${["no", "wheel"].join("")}\\b`, "i"),
  },
];

const unsafeTopLevelTerms = [
  "workspace",
  "sync",
  "backend",
  "route",
  "supabase",
  "vercel",
  "github",
  "auth",
  "env",
  "secret",
  "deployment",
  "migration",
  "database",
];

const recipeForbiddenKeys = [
  "className",
  "style",
  "onClick",
  "onChange",
  "onKeyDown",
  "role",
  "tabIndex",
  "zIndex",
  "pointerEvents",
  "position",
  "overflow",
];

const reactFlowForbiddenKeyParts = [
  "pan",
  "zoom",
  "drag",
  "select",
  "connect",
  "handleid",
  "edgeid",
  "nodeid",
  "hitwidth",
  "keybinding",
  "interactionwidth",
  "onnodedragstop",
  "onconnect",
  "onpaneclick",
  "deletekeycode",
];

export function validateNexusStyleManifestV1(
  candidate: unknown,
): NexusStyleValidationReportV1 {
  const report: MutableReport = {
    errors: [],
    warnings: [],
    info: [],
  };

  if (!isRecord(candidate)) {
    addError(report, "$", "style.invalidRoot", "Manifest candidate must be an object.");
    return finalizeReport(report);
  }

  if (typeof candidate.id === "string") {
    report.manifestId = candidate.id;
  }

  validateTopLevelShape(candidate, report);
  validateIdentity(candidate, report);
  validateIntent(candidate.intent, report);
  validateConstraints(candidate.constraints, report);
  validateTokens(candidate.tokens, report);
  validateAccessibility(candidate.tokens, report);
  validateRecipes(candidate.recipes, report);
  validateAdapters(candidate.adapters, report);
  scanUnsafeStrings(candidate, "$", report);

  return finalizeReport(report);
}

function validateTopLevelShape(
  candidate: Record<string, unknown>,
  report: MutableReport,
) {
  for (const key of topLevelKeys) {
    if (!(key in candidate)) {
      if (["description", "author", "source"].includes(key)) {
        continue;
      }
      addError(report, `$.${key}`, "style.missingField", "Required field is missing.");
    }
  }

  for (const key of Object.keys(candidate).sort()) {
    if (topLevelKeys.has(key)) {
      continue;
    }

    const normalized = key.toLowerCase();
    const unsafe = unsafeTopLevelTerms.some((term) => normalized.includes(term));

    addError(
      report,
      `$.${key}`,
      unsafe ? "style.unsafeTopLevelField" : "style.unknownTopLevelField",
      "Unknown top-level fields are not allowed in a V1 style manifest.",
    );
  }
}

function validateIdentity(candidate: Record<string, unknown>, report: MutableReport) {
  if (candidate.schemaVersion !== NEXUS_STYLE_MANIFEST_VERSION) {
    addError(report, "$.schemaVersion", "style.invalidSchemaVersion", "schemaVersion must be 1.");
  }

  if (typeof candidate.id !== "string" || !/^[a-z0-9-]{3,80}$/.test(candidate.id)) {
    addError(report, "$.id", "style.invalidId", "id must be a lowercase slug.");
  }

  if (typeof candidate.name !== "string" || !withinLength(candidate.name, 1, 80)) {
    addError(report, "$.name", "style.invalidName", "name must be 1-80 characters.");
  }

  if (
    candidate.description !== undefined &&
    (typeof candidate.description !== "string" ||
      !withinLength(candidate.description, 0, 280))
  ) {
    addError(
      report,
      "$.description",
      "style.invalidDescription",
      "description must be 0-280 characters.",
    );
  }

  if (
    candidate.author !== undefined &&
    (typeof candidate.author !== "string" || !withinLength(candidate.author, 0, 80))
  ) {
    addError(report, "$.author", "style.invalidAuthor", "author must be display text.");
  }

  if (!["dark", "light", "adaptive"].includes(String(candidate.mode))) {
    addError(report, "$.mode", "style.invalidMode", "mode must be dark, light, or adaptive.");
  }

  if (candidate.source !== undefined) {
    validateSource(candidate.source, report);
  }
}

function validateSource(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(report, "$.source", "style.invalidSource", "source must be an object.");
    return;
  }

  if (!["human-brief", "ai-draft", "imported-draft", "legacy-preset"].includes(String(value.kind))) {
    addError(report, "$.source.kind", "style.invalidSourceKind", "source.kind is invalid.");
  }

  if (value.reference !== undefined && typeof value.reference !== "string") {
    addError(report, "$.source.reference", "style.invalidSourceReference", "source.reference must be text.");
  }
}

function validateIntent(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(report, "$.intent", "style.invalidIntent", "intent must be an object.");
    return;
  }

  validateStringArray(value.mood, "$.intent.mood", report);
  validateStringArray(value.material, "$.intent.material", report);

  if (!["compact", "comfortable", "spacious"].includes(String(value.density))) {
    addError(report, "$.intent.density", "style.invalidDensity", "density is invalid.");
  }

  if (!["minimal", "standard", "expressive"].includes(String(value.motion))) {
    addError(report, "$.intent.motion", "style.invalidMotion", "motion is invalid.");
  }

  if (!["standard", "high"].includes(String(value.contrast))) {
    addError(report, "$.intent.contrast", "style.invalidContrast", "contrast is invalid.");
  } else if (value.contrast !== "high") {
    addWarning(
      report,
      "$.intent.contrast",
      "style.accessibility.highContrastNotRequested",
      "High contrast is not requested; preview remains allowed.",
    );
  }
}

function validateConstraints(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(report, "$.constraints", "style.invalidConstraints", "constraints must be an object.");
    return;
  }

  if (
    typeof value.maxCssVariableCount !== "number" ||
    !Number.isFinite(value.maxCssVariableCount) ||
    value.maxCssVariableCount < 1
  ) {
    addError(
      report,
      "$.constraints.maxCssVariableCount",
      "style.invalidVariableLimit",
      "maxCssVariableCount must be a positive finite number.",
    );
  }

  for (const key of [
    "allowRawCss",
    "allowJavaScript",
    "allowDynamicTailwind",
    "allowWorkspaceMutation",
    "allowSyncMutation",
    "allowBackendMutation",
  ]) {
    if (value[key] !== false) {
      addError(
        report,
        `$.constraints.${key}`,
        "style.invalidConstraintFlag",
        "Safety constraint flags must be explicitly false.",
      );
    }
  }

  if (!Array.isArray(value.protectedBehaviorClasses)) {
    addError(
      report,
      "$.constraints.protectedBehaviorClasses",
      "style.invalidProtectedBehaviorClasses",
      "protectedBehaviorClasses must be an array.",
    );
  }
}

function validateTokens(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(report, "$.tokens", "style.invalidTokens", "tokens must be an object.");
    return;
  }

  for (const group of NEXUS_STYLE_TOKEN_GROUPS_V1) {
    const groupValue = value[group];
    const path = `$.tokens.${group}`;

    if (!isRecord(groupValue)) {
      addError(report, path, "style.missingTokenGroup", "Required token group is missing.");
      continue;
    }

    for (const token of NEXUS_STYLE_REQUIRED_TOKENS_V1[group]) {
      if (!(token in groupValue)) {
        addError(
          report,
          `${path}.${token}`,
          "style.missingSemanticToken",
          "Required semantic token is missing.",
        );
      }
    }

    for (const [token, tokenValue] of Object.entries(groupValue).sort()) {
      if (typeof tokenValue !== "string" && typeof tokenValue !== "number") {
        addError(
          report,
          `${path}.${token}`,
          "style.invalidTokenValue",
          "Token values must be strings or numbers.",
        );
      }
    }
  }
}

function validateAccessibility(value: unknown, report: MutableReport) {
  if (!isRecord(value) || !isRecord(value.text) || !isRecord(value.surface)) {
    return;
  }

  const primaryText = value.text.primary;
  const appSurface = value.surface.app;

  if (typeof primaryText !== "string" || typeof appSurface !== "string") {
    return;
  }

  const contrast = evaluateNexusStyleTextContrast(primaryText, appSurface);

  if (contrast && !contrast.passes) {
    addError(
      report,
      "$.tokens.text.primary",
      "style.accessibility.primaryTextContrast",
      "Primary text contrast against app surface is below the required ratio.",
    );
  }
}

function validateRecipes(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(report, "$.recipes", "style.invalidRecipes", "recipes must be an object.");
    return;
  }

  for (const group of NEXUS_STYLE_RECIPE_GROUPS_V1) {
    if (!isRecord(value[group])) {
      addError(report, `$.recipes.${group}`, "style.missingRecipeGroup", "Required recipe group is missing.");
    }
  }

  scanRecipeKeys(value, "$.recipes", report);
}

function validateAdapters(value: unknown, report: MutableReport) {
  if (!isRecord(value)) {
    addError(report, "$.adapters", "style.invalidAdapters", "adapters must be an object.");
    return;
  }

  if (value.reactFlow !== undefined) {
    if (!isRecord(value.reactFlow)) {
      addError(report, "$.adapters.reactFlow", "style.invalidReactFlowAdapter", "reactFlow adapter must be an object.");
    } else {
      scanReactFlowAdapterKeys(value.reactFlow, "$.adapters.reactFlow", report);
    }
  }
}

function scanRecipeKeys(value: unknown, path: string, report: MutableReport) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanRecipeKeys(item, `${path}[${index}]`, report));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, nextValue] of Object.entries(value).sort()) {
    const keyPath = `${path}.${key}`;
    const normalized = key.toLowerCase();
    const forbidden =
      recipeForbiddenKeys.some((candidate) => normalized === candidate.toLowerCase()) ||
      normalized.startsWith("aria-") ||
      normalized.startsWith("data-") ||
      normalized.includes("drag") ||
      normalized.includes("resize") ||
      normalized.includes("persist");

    if (forbidden) {
      addError(report, keyPath, "style.forbiddenRecipeField", "Recipe contains a behavior or persistence field.");
    }

    scanRecipeKeys(nextValue, keyPath, report);
  }
}

function scanReactFlowAdapterKeys(value: unknown, path: string, report: MutableReport) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanReactFlowAdapterKeys(item, `${path}[${index}]`, report));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, nextValue] of Object.entries(value).sort()) {
    const keyPath = `${path}.${key}`;
    const normalized = key.toLowerCase().replace(/[-_\s]/g, "");

    if (reactFlowForbiddenKeyParts.some((part) => normalized.includes(part))) {
      addError(
        report,
        keyPath,
        "style.forbiddenReactFlowBehavior",
        "React Flow adapter may only contain visual fields.",
      );
    }

    scanReactFlowAdapterKeys(nextValue, keyPath, report);
  }
}

function scanUnsafeStrings(value: unknown, path: string, report: MutableReport) {
  if (typeof value === "string") {
    for (const { code, pattern } of forbiddenStringPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(value)) {
        addError(report, path, code, "Manifest contains a forbidden string value.");
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => scanUnsafeStrings(item, `${path}[${index}]`, report));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, nextValue] of Object.entries(value).sort()) {
    scanUnsafeStrings(nextValue, `${path}.${key}`, report);
  }
}

function validateStringArray(
  value: unknown,
  path: string,
  report: MutableReport,
) {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.length === 0)
  ) {
    addError(report, path, "style.invalidStringArray", "Expected a non-empty string array.");
  }
}

function finalizeReport(report: MutableReport): NexusStyleValidationReportV1 {
  return {
    ...(report.manifestId ? { manifestId: report.manifestId } : {}),
    accepted: report.errors.length === 0,
    errors: sortIssues(report.errors),
    warnings: sortIssues(report.warnings),
    info: sortIssues(report.info),
  };
}

function addError(
  report: MutableReport,
  path: string,
  code: string,
  message: string,
) {
  report.errors.push({ code, message, path });
}

function addWarning(
  report: MutableReport,
  path: string,
  code: string,
  message: string,
) {
  report.warnings.push({ code, message, path });
}

function sortIssues(issues: NexusStyleValidationIssueV1[]) {
  return [...issues].sort((left, right) => {
    const pathOrder = left.path.localeCompare(right.path);

    return pathOrder === 0 ? left.code.localeCompare(right.code) : pathOrder;
  });
}

function withinLength(value: string, min: number, max: number) {
  return value.length >= min && value.length <= max;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function assertNexusStyleManifestV1(
  candidate: unknown,
): asserts candidate is NexusStyleManifestV1 {
  const report = validateNexusStyleManifestV1(candidate);

  if (!report.accepted) {
    throw new Error("Nexus style manifest failed validation.");
  }
}
