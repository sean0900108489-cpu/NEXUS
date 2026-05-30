import {
  NEXUS_STYLE_REQUIRED_TOKENS_V1,
  NEXUS_STYLE_TOKEN_GROUPS_V1,
} from "./manifest";
import {
  createPixelWorkshopSkinPackV2,
  createValidMinimalSkinPackV2,
} from "./v2-fixtures";
import type { NexusV2ValidationIssueCode } from "./v2-contracts";

export const NEXUS_SKIN_PACK_AUTHORING_CONTEXT_VERSION_V1 =
  "nexus-skin-pack-authoring-context-v1" as const;

export type NexusSkinPackAuthoringContextV1 = {
  version: typeof NEXUS_SKIN_PACK_AUTHORING_CONTEXT_VERSION_V1;
  requiredTopLevelFields: string[];
  editableFields: string[];
  reviewOnlyFields: string[];
  forbiddenOutputs: string[];
  tokenPreviewNotes: string[];
  commonRejects: Array<{
    code: NexusV2ValidationIssueCode | string;
    repair: string;
  }>;
  promptTemplate: string;
  contextText: string;
  minimalJson: string;
  pixelWorkshopJson: string;
};

const requiredTopLevelFields = [
  "kind",
  "schemaVersion",
  "id",
  "slug",
  "packVersion",
  "metadata",
  "manifest",
  "tokens",
  "recipes",
  "performanceBudget",
  "compatibility",
  "fallback",
];

const editableFields = [
  "metadata display text, source, lifecycle, and tags",
  "manifest identity, name, description, source reference, mode, and intent",
  "manifest.payload.tokens values inside the approved V1 token groups",
  "manifest.payload.recipes token references such as surface.panel or accent.primary",
  "adapters.nextThemes dataTheme and colorScheme from the existing allowlist",
  "static performance budget numbers within the approved local budget shape",
];

const reviewOnlyFields = [
  "assets are ID references only and are not loaded or rendered",
  "recipes do not emit V2 recipe variables in token-only preview",
  "layoutPreset is inert metadata and cannot move, hide, resize, or reorder production UI",
  "performance diagnostics are static summaries until Render Plan IR exists",
  "compatibility and fallback fields are reviewed but do not apply production state",
];

const forbiddenOutputs = [
  "raw CSS blocks, selectors, style tags, or CSS declarations",
  "script tags, JavaScript, event handlers, functions, eval, or dynamic imports",
  "url(...), remote URLs, file/blob/data URLs, or base64 assets",
  "workspace, sync, backend, database, API route, Supabase, deployment, or secret fields",
  "z-index, pointer events, drag, resize, focus trap, layout behavior, or React Flow behavior",
  "unknown top-level Skin Pack fields",
];

const tokenPreviewNotes = [
  "Token-only preview emits scoped CSS variables named --nexus-{group}-{token}.",
  "Only groups listed in tokens.manifestTokenGroups are emitted.",
  "Preview Tokens can alter current Style Lab surfaces that read those variables or token fallbacks.",
  "It does not apply assets, recipe expansion, layout presets, behavior, save, apply, or persistence.",
  "Rejected candidates expose redacted issue codes and never return the unsafe rejected payload.",
];

const commonRejects: NexusSkinPackAuthoringContextV1["commonRejects"] = [
  {
    code: "stylePack.invalidManifestPayload",
    repair:
      "Repair manifest.payload as a valid V1 manifest with all token groups, required recipes, safe adapters, and false mutation/script/raw CSS constraints.",
  },
  {
    code: "stylePack.invalidTokenBinding",
    repair:
      "Use tokens.source manifest and list only approved V1 token groups in manifestTokenGroups.",
  },
  {
    code: "stylePack.invalidRecipeBinding",
    repair:
      "Use recipes.source manifest, registryVersion recipe-registry-v1, and supported visual groups only.",
  },
  {
    code: "stylePack.unknownTopLevelField",
    repair:
      "Remove fields outside the Skin Pack V2 contract instead of moving them into metadata.",
  },
  {
    code: "contract.forbiddenCss",
    repair:
      "Replace raw CSS, selectors, declarations, imports, and url(...) with semantic tokens or omit them.",
  },
  {
    code: "contract.forbiddenExecutable",
    repair:
      "Remove scripts, JavaScript URLs, event handlers, eval-like strings, and dynamic imports.",
  },
  {
    code: "contract.forbiddenBehaviorField",
    repair:
      "Remove z-index, pointer, drag, resize, focus, keyboard, React Flow, and layout behavior fields.",
  },
  {
    code: "stylePack.staticBudgetExceeded",
    repair:
      "Reduce token, recipe, adapter, or manifest size, or return to the approved static budget shape.",
  },
];

export function createNexusSkinPackAuthoringContextV1():
  NexusSkinPackAuthoringContextV1 {
  const minimalJson = JSON.stringify(createValidMinimalSkinPackV2(), null, 2);
  const pixelWorkshopJson = JSON.stringify(
    createPixelWorkshopSkinPackV2(),
    null,
    2,
  );
  const requiredSemanticTokens = NEXUS_STYLE_TOKEN_GROUPS_V1
    .map((group) => {
      const tokens = NEXUS_STYLE_REQUIRED_TOKENS_V1[group];

      return `${group}: ${tokens.length > 0 ? tokens.join(", ") : "group required"}`;
    })
    .join("; ");
  const promptTemplate = createPromptTemplate(requiredSemanticTokens);

  return {
    commonRejects,
    contextText: createContextText({
      minimalJson,
      pixelWorkshopJson,
      promptTemplate,
      requiredSemanticTokens,
    }),
    editableFields,
    forbiddenOutputs,
    minimalJson,
    pixelWorkshopJson,
    promptTemplate,
    requiredTopLevelFields,
    reviewOnlyFields,
    tokenPreviewNotes,
    version: NEXUS_SKIN_PACK_AUTHORING_CONTEXT_VERSION_V1,
  };
}

export function getNexusSkinPackIssueRepairHintV1(
  code: NexusV2ValidationIssueCode | string,
): string {
  return (
    commonRejects.find((entry) => entry.code === code)?.repair ??
    "Use the accepted fixture shape, remove unsafe or unknown fields, then rerun Review."
  );
}

function createPromptTemplate(requiredSemanticTokens: string) {
  return [
    "You are generating one NEXUS Skin Pack V2 JSON object for Style Lab.",
    "Use this skeleton, only replace allowed values.",
    "Return JSON only. Do not include Markdown fences.",
    "",
    "Required top-level fields:",
    requiredTopLevelFields.join(", "),
    "",
    "Required V1 token groups and semantic tokens:",
    requiredSemanticTokens,
    "",
    "Allowed replacements:",
    editableFields.map((field) => `- ${field}`).join("\n"),
    "",
    "Forbidden output:",
    forbiddenOutputs.map((field) => `- ${field}`).join("\n"),
    "",
    "Current preview scope:",
    tokenPreviewNotes.map((note) => `- ${note}`).join("\n"),
    "",
    "Input style brief or UI image description:",
    "<paste style brief, palette notes, UI screenshot description, or design language>",
    "",
    "Task:",
    "- Preserve the valid skeleton shape.",
    "- Map palette to surface, text, accent, status, border, shadow, workspace tokens.",
    "- Map material, shape, density, and motion to intent and safe token values.",
    "- Keep assets, recipe expansion, and layout ideas as review-only metadata or omit them.",
    "- Prefer high contrast, low blur, low motion, and a safe CSS variable budget.",
  ].join("\n");
}

function createContextText({
  minimalJson,
  pixelWorkshopJson,
  promptTemplate,
  requiredSemanticTokens,
}: {
  minimalJson: string;
  pixelWorkshopJson: string;
  promptTemplate: string;
  requiredSemanticTokens: string;
}) {
  return [
    "# NEXUS Skin Pack V2 Authoring Context",
    "",
    "Generate data-only Skin Pack V2 JSON for Style Lab review and token-only preview.",
    "",
    "Required top-level fields:",
    requiredTopLevelFields.join(", "),
    "",
    "Editable fields:",
    editableFields.map((field) => `- ${field}`).join("\n"),
    "",
    "Review-only fields:",
    reviewOnlyFields.map((field) => `- ${field}`).join("\n"),
    "",
    "Forbidden outputs:",
    forbiddenOutputs.map((field) => `- ${field}`).join("\n"),
    "",
    "Required semantic tokens:",
    requiredSemanticTokens,
    "",
    "Token-only preview scope:",
    tokenPreviewNotes.map((note) => `- ${note}`).join("\n"),
    "",
    "Prompt template:",
    promptTemplate,
    "",
    "Minimal valid JSON:",
    minimalJson,
    "",
    "Pixel workshop valid JSON:",
    pixelWorkshopJson,
  ].join("\n");
}
