export const NEXUS_STYLE_MANIFEST_VERSION = 1 as const;

export type NexusStyleModeV1 = "dark" | "light" | "adaptive";
export type NexusStyleDensityV1 = "compact" | "comfortable" | "spacious";
export type NexusStyleMotionV1 = "minimal" | "standard" | "expressive";
export type NexusStyleContrastV1 = "standard" | "high";

export type NexusStyleIntentV1 = {
  mood: string[];
  material: string[];
  density: NexusStyleDensityV1;
  motion: NexusStyleMotionV1;
  contrast: NexusStyleContrastV1;
};

export type NexusStyleTokenGroupNameV1 =
  | "surface"
  | "text"
  | "accent"
  | "status"
  | "border"
  | "shadow"
  | "radius"
  | "blur"
  | "workspace"
  | "typography"
  | "density"
  | "motion";

export type NexusStyleTokensV1 = Record<
  NexusStyleTokenGroupNameV1,
  Record<string, string | number>
>;

export type NexusStyleRecipesV1 = {
  panel: Record<string, string>;
  button: Record<string, Record<string, string>>;
  input: Record<string, Record<string, string>>;
  badge: Record<string, Record<string, string>>;
  window: Record<string, string>;
  modal: Record<string, string>;
  commandPalette: Record<string, string>;
  dock: Record<string, string>;
};

export type NexusStyleAdaptersV1 = {
  tailwindBridge?: {
    enabled: boolean;
    legacyVariableMode: "preserve";
  };
  nextThemes?: {
    dataTheme?: "cyberpunk" | "apple" | "tesla" | "terminal";
    colorScheme: "dark" | "light";
  };
  reactFlow?: Record<string, unknown>;
};

export type NexusStyleConstraintsV1 = {
  maxCssVariableCount: number;
  allowRawCss: false;
  allowJavaScript: false;
  allowDynamicTailwind: false;
  allowWorkspaceMutation: false;
  allowSyncMutation: false;
  allowBackendMutation: false;
  protectedBehaviorClasses: string[];
};

export type NexusStyleManifestV1 = {
  schemaVersion: typeof NEXUS_STYLE_MANIFEST_VERSION;
  id: string;
  name: string;
  description?: string;
  author?: string;
  source?: {
    kind: "human-brief" | "ai-draft" | "imported-draft" | "legacy-preset";
    reference?: string;
  };
  mode: NexusStyleModeV1;
  intent: NexusStyleIntentV1;
  tokens: NexusStyleTokensV1;
  recipes: NexusStyleRecipesV1;
  adapters: NexusStyleAdaptersV1;
  constraints: NexusStyleConstraintsV1;
};

export type NexusStyleValidationIssueV1 = {
  code: string;
  path: string;
  message: string;
};

export type NexusStyleValidationReportV1 = {
  manifestId?: string;
  accepted: boolean;
  errors: NexusStyleValidationIssueV1[];
  warnings: NexusStyleValidationIssueV1[];
  info: NexusStyleValidationIssueV1[];
};

export const NEXUS_STYLE_TOKEN_GROUPS_V1: NexusStyleTokenGroupNameV1[] = [
  "surface",
  "text",
  "accent",
  "status",
  "border",
  "shadow",
  "radius",
  "blur",
  "workspace",
  "typography",
  "density",
  "motion",
];

export const NEXUS_STYLE_REQUIRED_TOKENS_V1: Record<
  NexusStyleTokenGroupNameV1,
  string[]
> = {
  accent: ["primary", "primaryStrong"],
  blur: ["glass"],
  border: ["subtle"],
  density: [],
  motion: [],
  radius: ["surface"],
  shadow: ["panel"],
  status: ["success", "warning", "danger"],
  surface: ["app", "panel", "workspace"],
  text: ["primary", "secondary", "muted"],
  typography: [],
  workspace: [],
};

export const NEXUS_STYLE_RECIPE_GROUPS_V1: Array<keyof NexusStyleRecipesV1> = [
  "panel",
  "button",
  "input",
  "badge",
  "window",
  "modal",
  "commandPalette",
  "dock",
];
