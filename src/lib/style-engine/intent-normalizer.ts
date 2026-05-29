import type {
  NexusStyleContrastV1,
  NexusStyleDensityV1,
  NexusStyleIntentV1,
  NexusStyleMotionV1,
} from "./manifest";

export const NEXUS_STYLE_INTENT_NORMALIZER_VERSION_V1 =
  "nexus-style-intent-normalizer-v1" as const;
export const NEXUS_STYLE_INTENT_NORMALIZER_MAX_CHARACTERS_V1 = 40_000;

export type NexusStyleIntentNormalizerSourceV1 =
  | "ai-draft"
  | "human-brief"
  | "imported-draft";

export type NexusStyleIntentNormalizerIssueV1 = {
  code: string;
  path: string;
  message: string;
};

export type NexusStyleNormalizedIntentV1 = NexusStyleIntentV1 & {
  accessibilityNotes: string[];
  accentStrategy: string;
  forbiddenAssumptions: string[];
  graphVisualDirection: string;
  statusStrategy: string;
  surfaceHierarchy: string;
  typographyDirection: string;
};

export type NexusStyleIntentNormalizerSafetyV1 = {
  canApply: false;
  canPersist: false;
  canPreview: false;
  canSave: false;
  omittedUnsafeInstructionCodes: string[];
  persistence: "not-persistent";
};

export type NexusStyleIntentNormalizerResultV1 =
  | {
      accepted: true;
      draft: {
        intent: NexusStyleNormalizedIntentV1;
        normalizerVersion: typeof NEXUS_STYLE_INTENT_NORMALIZER_VERSION_V1;
        safety: NexusStyleIntentNormalizerSafetyV1;
        source: NexusStyleIntentNormalizerSourceV1;
      };
      questions: NexusStyleIntentNormalizerIssueV1[];
      warnings: NexusStyleIntentNormalizerIssueV1[];
    }
  | {
      accepted: false;
      errors: NexusStyleIntentNormalizerIssueV1[];
      safety: NexusStyleIntentNormalizerSafetyV1;
      warnings: NexusStyleIntentNormalizerIssueV1[];
    };

export type NexusStyleIntentNormalizerOptionsV1 = {
  maxCharacters?: number;
  source?: NexusStyleIntentNormalizerSourceV1;
};

type KeywordTag = {
  tag: string;
  words: string[];
};

type UnsafeInstructionRule = {
  code: string;
  message: string;
  pattern: RegExp;
};

const defaultForbiddenAssumptions = [
  "No raw CSS, JavaScript, workspace, sync, backend, database, deploy, or React Flow behavior permission is inferred.",
  "Any manifest draft produced later must pass validation before compile or preview.",
];

const moodTags: KeywordTag[] = [
  { tag: "operational", words: ["ops", "operator", "operational", "mission"] },
  { tag: "neon", words: ["neon", "cyberpunk", "glow"] },
  { tag: "minimal", words: ["minimal", "quiet", "clean", "simple"] },
  { tag: "editorial", words: ["editorial", "magazine", "story"] },
  { tag: "calm", words: ["calm", "soft", "gentle"] },
  { tag: "high-focus", words: ["focus", "focused", "dashboard"] },
];

const materialTags: KeywordTag[] = [
  { tag: "glass", words: ["glass", "translucent", "frosted"] },
  { tag: "dark-metal", words: ["metal", "carbon", "graphite", "black"] },
  { tag: "matte", words: ["matte", "flat", "paper"] },
  { tag: "terminal", words: ["terminal", "console", "monospace"] },
];

const unsafeInstructionRules: UnsafeInstructionRule[] = [
  {
    code: "style.intent.omittedSecretInstruction",
    message: "Secret-reading instructions were ignored.",
    pattern: /\b(?:read|load|open|print|exfiltrate)\b.{0,48}(?:\.env|\bsecret\b|\bapi[-_\s]?key\b|\bservice[-_\s]?role\b|\btoken\b|\bpassword\b)/i,
  },
  {
    code: "style.intent.omittedExternalMutation",
    message: "Push, deploy, merge, or publish instructions were ignored.",
    pattern: /\b(?:push|deploy|merge|publish|production)\b/i,
  },
  {
    code: "style.intent.omittedDatabaseInstruction",
    message: "Database, schema, migration, or Supabase instructions were ignored.",
    pattern: /\b(?:database|schema|migration|rls|supabase)\b/i,
  },
  {
    code: "style.intent.omittedWorkspacePersistenceInstruction",
    message: "Workspace, sync, snapshot, or persistence instructions were ignored.",
    pattern: /\b(?:workspace\.themeConfig|workspace_state_entities|sync|snapshot|persist|persistence)\b/i,
  },
  {
    code: "style.intent.omittedExecutableStyleInstruction",
    message: "Raw CSS, JavaScript, and dynamic Tailwind instructions were ignored.",
    pattern: /\b(?:raw css|javascript|script|dynamic tailwind|tailwind class)\b/i,
  },
  {
    code: "style.intent.omittedReactFlowBehaviorInstruction",
    message: "React Flow behavior instructions were ignored.",
    pattern: /\b(?:nodesDraggable|pan|zoom|drag|select|connect|react flow behavior)\b/i,
  },
];

const forbiddenSecretPatterns = [
  /\bsk-[A-Za-z0-9_-]{8,}\b/,
  /\b(?:api[-_\s]?key|password|token)\s*[:=]\s*\S+/i,
  /\b(?:service[-_\s]?role|supabase[-_\s]?service[-_\s]?role[-_\s]?key)\s*[:=]\s*\S+/i,
];

export function normalizeNexusStyleIntentV1(
  text: string,
  options: NexusStyleIntentNormalizerOptionsV1 = {},
): NexusStyleIntentNormalizerResultV1 {
  const maxCharacters =
    options.maxCharacters ?? NEXUS_STYLE_INTENT_NORMALIZER_MAX_CHARACTERS_V1;
  const source = options.source ?? "human-brief";
  const trimmed = text.trim();
  const safety = createDraftOnlySafety([]);

  if (trimmed.length === 0) {
    return rejectIntent("style.intent.empty", "Style brief is empty.", safety);
  }

  if (trimmed.length > maxCharacters) {
    return rejectIntent(
      "style.intent.tooLarge",
      "Style brief exceeds the allowed size.",
      safety,
    );
  }

  if (forbiddenSecretPatterns.some((pattern) => pattern.test(trimmed))) {
    return rejectIntent(
      "style.intent.forbiddenSecret",
      "Style brief contains a forbidden secret-like value.",
      safety,
    );
  }

  const omittedUnsafeInstructionCodes = collectUnsafeInstructionCodes(trimmed);
  const intent = normalizeIntent(trimmed);
  const warnings = omittedUnsafeInstructionCodes.map(createOmittedInstructionIssue);

  return {
    accepted: true,
    draft: {
      intent,
      normalizerVersion: NEXUS_STYLE_INTENT_NORMALIZER_VERSION_V1,
      safety: createDraftOnlySafety(omittedUnsafeInstructionCodes),
      source,
    },
    questions: createReviewQuestions(intent),
    warnings,
  };
}

function normalizeIntent(text: string): NexusStyleNormalizedIntentV1 {
  const lower = text.toLowerCase();
  const contrast: NexusStyleContrastV1 = includesAny(lower, [
    "accessibility",
    "accessible",
    "a11y",
    "high contrast",
    "wcag",
  ])
    ? "high"
    : "standard";
  const density: NexusStyleDensityV1 = includesAny(lower, [
    "airy",
    "spacious",
    "wide",
  ])
    ? "spacious"
    : includesAny(lower, ["comfortable", "cozy", "balanced"])
      ? "comfortable"
      : "compact";
  const motion: NexusStyleMotionV1 = includesAny(lower, [
    "reduced motion",
    "minimal motion",
    "static",
  ])
    ? "minimal"
    : includesAny(lower, ["animated", "expressive", "kinetic"])
      ? "expressive"
      : "standard";

  return {
    accessibilityNotes: createAccessibilityNotes(contrast, motion),
    accentStrategy: getAccentStrategy(lower),
    contrast,
    density,
    forbiddenAssumptions: [...defaultForbiddenAssumptions],
    graphVisualDirection: getGraphVisualDirection(lower),
    material: collectTags(lower, materialTags, ["dark-metal"]),
    mood: collectTags(lower, moodTags, ["operational"]),
    motion,
    statusStrategy: "semantic",
    surfaceHierarchy: getSurfaceHierarchy(lower),
    typographyDirection: getTypographyDirection(lower),
  };
}

function collectUnsafeInstructionCodes(text: string): string[] {
  const codes = unsafeInstructionRules
    .filter((rule) => rule.pattern.test(text))
    .map((rule) => rule.code);

  return [...new Set(codes)].sort();
}

function createOmittedInstructionIssue(
  code: string,
): NexusStyleIntentNormalizerIssueV1 {
  const rule = unsafeInstructionRules.find((candidate) => candidate.code === code);

  return {
    code,
    message: rule?.message ?? "Unsafe instruction was ignored.",
    path: "$.input",
  };
}

function createReviewQuestions(
  intent: NexusStyleNormalizedIntentV1,
): NexusStyleIntentNormalizerIssueV1[] {
  const questions: NexusStyleIntentNormalizerIssueV1[] = [];

  if (intent.contrast === "standard") {
    questions.push({
      code: "style.intent.question.contrast",
      message: "Confirm whether standard contrast is acceptable.",
      path: "$.intent.contrast",
    });
  }

  if (intent.motion === "expressive") {
    questions.push({
      code: "style.intent.question.reducedMotion",
      message: "Confirm reduced-motion compatibility before manifest generation.",
      path: "$.intent.motion",
    });
  }

  return questions;
}

function createDraftOnlySafety(
  omittedUnsafeInstructionCodes: string[],
): NexusStyleIntentNormalizerSafetyV1 {
  return {
    canApply: false,
    canPersist: false,
    canPreview: false,
    canSave: false,
    omittedUnsafeInstructionCodes,
    persistence: "not-persistent",
  };
}

function rejectIntent(
  code: string,
  message: string,
  safety: NexusStyleIntentNormalizerSafetyV1,
): Extract<NexusStyleIntentNormalizerResultV1, { accepted: false }> {
  return {
    accepted: false,
    errors: [
      {
        code,
        message,
        path: "$",
      },
    ],
    safety,
    warnings: [],
  };
}

function collectTags(
  text: string,
  tags: KeywordTag[],
  fallback: string[],
): string[] {
  const matches = tags
    .filter((tag) => includesAny(text, tag.words))
    .map((tag) => tag.tag);

  return matches.length > 0 ? [...new Set(matches)].sort() : fallback;
}

function createAccessibilityNotes(
  contrast: NexusStyleContrastV1,
  motion: NexusStyleMotionV1,
): string[] {
  const notes = [];

  if (contrast === "high") {
    notes.push("High contrast requested.");
  }

  if (motion === "minimal") {
    notes.push("Reduced or minimal motion requested.");
  }

  return notes.length > 0 ? notes : ["No explicit accessibility request."];
}

function getAccentStrategy(text: string): string {
  if (includesAny(text, ["amber", "gold", "orange", "warm"])) {
    return "warm";
  }

  if (includesAny(text, ["mono", "monochrome", "black and white"])) {
    return "monochrome";
  }

  if (includesAny(text, ["cyan", "blue", "neon", "cyberpunk"])) {
    return "cool";
  }

  return "balanced";
}

function getGraphVisualDirection(text: string): string {
  if (includesAny(text, ["graph", "node", "edge", "network", "flow"])) {
    return "visual-adapter-only";
  }

  return "unspecified";
}

function getSurfaceHierarchy(text: string): string {
  if (includesAny(text, ["flat", "matte", "simple"])) {
    return "flat";
  }

  if (includesAny(text, ["glass", "layer", "depth", "shadow"])) {
    return "layered";
  }

  return "standard";
}

function getTypographyDirection(text: string): string {
  if (includesAny(text, ["terminal", "console", "mono", "monospace"])) {
    return "mono";
  }

  if (includesAny(text, ["editorial", "magazine", "serif"])) {
    return "editorial";
  }

  return "interface";
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}
