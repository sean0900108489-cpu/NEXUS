import type { NexusSkinPackV2 } from "./v2-contracts";
import { createNexusStyleChecksumV1 } from "./checksum";
import { validateNexusSkinPackV2 } from "./v2-validators";

export const NEXUS_WORKSPACE_STYLE_PAYLOAD_VERSION_V1 =
  "style-pack-v2" as const;

export const NEXUS_WORKSPACE_STYLE_PAYLOAD_MAX_BYTES = 96 * 1024;

export type WorkspaceStylePayloadSource =
  | "style-lab"
  | "warm-glass-controls"
  | "imported";

export type WorkspaceStylePayloadBridgeSummary = {
  checksum: string;
  directAliases: number;
  families: number;
};

export const NEXUS_WORKSPACE_THEME_STYLE_CONTROLS_VERSION_V1 =
  "theme-controls-v1" as const;

export const NEXUS_WORKSPACE_THEME_STYLE_CONTROLS_KEY_V1 =
  "themeControlsV1" as const;

export type WorkspaceThemeStyleAccentV1 =
  | "amber"
  | "cyan"
  | "emerald"
  | "rose"
  | "violet"
  | "custom";

export type WorkspaceThemeStyleControlsV1 = {
  version: typeof NEXUS_WORKSPACE_THEME_STYLE_CONTROLS_VERSION_V1;
  warmth: number;
  glass: number;
  blur: number;
  radius: number;
  shadow: number;
  accent: WorkspaceThemeStyleAccentV1;
  accentColor: string;
  workspaceWash: number;
};

export type WorkspaceThemeStyleControlsNormalizeResult =
  | {
      accepted: true;
      controls: WorkspaceThemeStyleControlsV1;
      reasons: [];
    }
  | {
      accepted: false;
      controls: null;
      reasons: string[];
    };

export type WorkspaceThemeStylePreviewVariablesResult =
  | {
      accepted: true;
      checksum: string;
      controls: WorkspaceThemeStyleControlsV1;
      variableNames: string[];
      variables: Record<string, string>;
    }
  | {
      accepted: false;
      checksum: null;
      controls: null;
      reasons: string[];
      variableNames: [];
      variables: Record<string, never>;
    };

export type WorkspaceStylePayloadV1 = {
  version: typeof NEXUS_WORKSPACE_STYLE_PAYLOAD_VERSION_V1;
  source: WorkspaceStylePayloadSource;
  skinPack?: NexusSkinPackV2;
  controls?: Record<string, unknown>;
  bridgeSummary?: WorkspaceStylePayloadBridgeSummary;
};

export type WorkspaceStylePayloadImportStatus =
  | "accepted"
  | "rejected-style-only"
  | "ignored-missing"
  | "unsupported-version";

export type WorkspaceStylePayloadImportDecision = {
  status: WorkspaceStylePayloadImportStatus;
  payload: WorkspaceStylePayloadV1 | null;
  reasons: string[];
};

export type WorkspaceStylePayloadExportStatus =
  | "included"
  | "omitted-missing"
  | "omitted-invalid";

export type WorkspaceStylePayloadExportDecision<TSnapshot extends object> = {
  status: WorkspaceStylePayloadExportStatus;
  snapshot: TSnapshot & { stylePack?: WorkspaceStylePayloadV1 };
  payload: WorkspaceStylePayloadV1 | null;
  reasons: string[];
};

export type ImportedWorkspaceStyleReviewState = {
  decision: WorkspaceStylePayloadImportDecision;
  updatedAt: string;
};

export const NEXUS_IMPORTED_WORKSPACE_STYLE_REVIEW_STORAGE_KEY =
  "nexus.importedWorkspaceStyleReview.v1" as const;

export const NEXUS_IMPORTED_WORKSPACE_STYLE_REVIEW_EVENT =
  "nexus:imported-workspace-style-review" as const;

const allowedPayloadKeys = new Set([
  "version",
  "source",
  "skinPack",
  "controls",
  "bridgeSummary",
]);

const allowedSources = new Set<WorkspaceStylePayloadSource>([
  "style-lab",
  "warm-glass-controls",
  "imported",
]);

const allowedImportStatuses = new Set<WorkspaceStylePayloadImportStatus>([
  "accepted",
  "ignored-missing",
  "rejected-style-only",
  "unsupported-version",
]);

const themeControlRanges = {
  blur: [0, 40],
  glass: [0, 100],
  radius: [0, 32],
  shadow: [0, 100],
  warmth: [0, 100],
  workspaceWash: [0, 100],
} as const satisfies Record<
  Exclude<keyof WorkspaceThemeStyleControlsV1, "accent" | "accentColor" | "version">,
  readonly [number, number]
>;

const allowedThemeControlAccents = new Set<WorkspaceThemeStyleAccentV1>([
  "amber",
  "cyan",
  "emerald",
  "rose",
  "violet",
  "custom",
]);

const workspaceThemeStyleDefaultControls: WorkspaceThemeStyleControlsV1 = {
  accent: "custom",
  accentColor: "#e5e7eb",
  blur: 18,
  glass: 58,
  radius: 18,
  shadow: 42,
  version: NEXUS_WORKSPACE_THEME_STYLE_CONTROLS_VERSION_V1,
  warmth: 50,
  workspaceWash: 48,
};

const workspaceThemeStyleAccentTokens: Record<
  WorkspaceThemeStyleAccentV1,
  {
    primary: string;
    primaryStrong: string;
    secondary: string;
    rgb: [number, number, number];
  }
> = {
  amber: {
    primary: "#f4c27a",
    primaryStrong: "#f59e0b",
    rgb: [244, 194, 122],
    secondary: "#f7dbc0",
  },
  cyan: {
    primary: "#67e8f9",
    primaryStrong: "#22d3ee",
    rgb: [103, 232, 249],
    secondary: "#bae6fd",
  },
  emerald: {
    primary: "#6ee7b7",
    primaryStrong: "#10b981",
    rgb: [110, 231, 183],
    secondary: "#d1fae5",
  },
  rose: {
    primary: "#fda4af",
    primaryStrong: "#fb7185",
    rgb: [253, 164, 175],
    secondary: "#ffe4e6",
  },
  violet: {
    primary: "#c4b5fd",
    primaryStrong: "#8b5cf6",
    rgb: [196, 181, 253],
    secondary: "#ede9fe",
  },
  custom: {
    primary: "#e5e7eb",
    primaryStrong: "#cbd5e1",
    rgb: [229, 231, 235],
    secondary: "#f8fafc",
  },
};

const workspaceThemeStylePreviewVariableNames = [
  "--nexus-outer-shell-bg",
  "--nexus-body-frame-bg",
  "--nexus-layout-panel-bg",
  "--nexus-layout-panel-muted-bg",
  "--nexus-layout-panel-border",
  "--nexus-layout-panel-shadow",
  "--nexus-panel-bg",
  "--nexus-glass-bg",
  "--nexus-right-dock-bg",
  "--nexus-top-bar-bg",
  "--nexus-agent-window-bg",
  "--nexus-command-palette-bg",
  "--nexus-modal-shell-bg",
  "--nexus-datapad-shell-bg",
  "--nexus-message-bubble-bg",
  "--nexus-workspace-bg",
  "--nexus-workspace-wash",
  "--nexus-workspace-grid-primary",
  "--nexus-workspace-grid-secondary",
  "--nexus-workspace-minimap-mask",
  "--nexus-panel-border",
  "--nexus-glass-border",
  "--nexus-right-dock-border",
  "--nexus-top-bar-border",
  "--nexus-workspace-border",
  "--nexus-panel-radius",
  "--nexus-glass-radius",
  "--nexus-right-dock-radius",
  "--nexus-top-bar-radius",
  "--nexus-workspace-radius",
  "--nexus-agent-window-radius",
  "--nexus-agent-window-handle-radius",
  "--nexus-command-palette-radius",
  "--nexus-datapad-shell-radius",
  "--nexus-message-bubble-radius",
  "--nexus-modal-shell-radius",
  "--nexus-panel-blur",
  "--nexus-glass-blur",
  "--nexus-right-dock-blur",
  "--nexus-top-bar-blur",
  "--nexus-agent-window-blur",
  "--nexus-panel-shadow",
  "--nexus-workspace-shadow",
  "--nexus-right-dock-shadow",
  "--nexus-top-bar-shadow",
  "--nexus-agent-window-shadow",
  "--nexus-accent-primary",
  "--nexus-accent-primary-strong",
  "--nexus-accent-secondary",
  "--theme-primary",
  "--theme-primary-strong",
  "--theme-secondary",
] as const;

let importedWorkspaceStyleReviewState: ImportedWorkspaceStyleReviewState | null =
  null;
const importedWorkspaceStyleReviewListeners = new Set<() => void>();

const unsafeKeyPattern =
  /(^|[._-])(rawcss|cssText|styleTag|script|javascript|eval|function|remoteUrl|remoteURL|html)([._-]|$)/i;

const unsafeStringPatterns = [
  /<\s*script/i,
  /<\s*style/i,
  /\bjavascript\s*:/i,
  /\bdata\s*:/i,
  /\bhttps?:\/\//i,
  /@import/i,
  /\burl\s*\(/i,
  /^\s*(?:\.|#|:root\b|html\b|body\b)/i,
  /(?:^|[\s;{}])(?:body|html|:root|\.|\#)[^{]*\{[^}]*\}/i,
  /[A-Za-z-]+\s*:\s*[^;{}]+;/,
];

export function extractWorkspaceStylePayloadFromSnapshot(
  snapshot: unknown,
): WorkspaceStylePayloadImportDecision {
  if (!isRecord(snapshot) || !("stylePack" in snapshot)) {
    return {
      payload: null,
      reasons: ["workspaceStylePayload.missing"],
      status: "ignored-missing",
    };
  }

  return normalizeWorkspaceStylePayload(snapshot.stylePack);
}

export function createWorkspaceStylePayloadExportSnapshot<
  TSnapshot extends object,
>(
  snapshot: TSnapshot,
  candidate?: unknown,
): WorkspaceStylePayloadExportDecision<TSnapshot> {
  const snapshotWithoutStyle = omitStylePayload(snapshot);

  if (candidate === undefined || candidate === null) {
    return {
      payload: null,
      reasons: ["workspaceStylePayload.exportMissing"],
      snapshot: snapshotWithoutStyle,
      status: "omitted-missing",
    };
  }

  const decision = normalizeWorkspaceStylePayload(candidate);

  if (decision.status !== "accepted" || !decision.payload) {
    return {
      payload: null,
      reasons: decision.reasons,
      snapshot: snapshotWithoutStyle,
      status: "omitted-invalid",
    };
  }

  return {
    payload: decision.payload,
    reasons: [],
    snapshot: {
      ...snapshotWithoutStyle,
      stylePack: decision.payload,
    },
    status: "included",
  };
}

export function createDefaultWorkspaceThemeStyleControlsV1():
  WorkspaceThemeStyleControlsV1 {
  return { ...workspaceThemeStyleDefaultControls };
}

export function createWorkspaceThemeStyleControlsPayloadV1(
  candidate: unknown,
): Record<typeof NEXUS_WORKSPACE_THEME_STYLE_CONTROLS_KEY_V1, WorkspaceThemeStyleControlsV1> {
  const result = normalizeWorkspaceThemeStyleControlsV1(candidate);

  return {
    [NEXUS_WORKSPACE_THEME_STYLE_CONTROLS_KEY_V1]: result.accepted
      ? result.controls
      : createDefaultWorkspaceThemeStyleControlsV1(),
  };
}

export function extractWorkspaceThemeStyleControlsV1(
  controls: unknown,
): WorkspaceThemeStyleControlsNormalizeResult {
  if (!isRecord(controls)) {
    return rejectThemeStyleControls("workspaceThemeStyleControls.invalidRoot");
  }

  if (NEXUS_WORKSPACE_THEME_STYLE_CONTROLS_KEY_V1 in controls) {
    return normalizeWorkspaceThemeStyleControlsV1(
      controls[NEXUS_WORKSPACE_THEME_STYLE_CONTROLS_KEY_V1],
    );
  }

  return normalizeWorkspaceThemeStyleControlsV1(controls);
}

export function normalizeWorkspaceThemeStyleControlsV1(
  candidate: unknown,
): WorkspaceThemeStyleControlsNormalizeResult {
  if (!isRecord(candidate)) {
    return rejectThemeStyleControls("workspaceThemeStyleControls.invalidRoot");
  }

  if (candidate.version !== NEXUS_WORKSPACE_THEME_STYLE_CONTROLS_VERSION_V1) {
    return rejectThemeStyleControls("workspaceThemeStyleControls.unsupportedVersion");
  }

  const result: WorkspaceThemeStyleControlsV1 = {
    accent: "custom",
    accentColor: "#e5e7eb",
    blur: 0,
    glass: 0,
    radius: 0,
    shadow: 0,
    version: NEXUS_WORKSPACE_THEME_STYLE_CONTROLS_VERSION_V1,
    warmth: 0,
    workspaceWash: 0,
  };
  const reasons: string[] = [];

  for (const key of Object.keys(themeControlRanges) as Array<
    keyof typeof themeControlRanges
  >) {
    const value = candidate[key];

    if (typeof value !== "number" || !Number.isFinite(value)) {
      reasons.push(`workspaceThemeStyleControls.invalidNumber:${key}`);
      continue;
    }

    const [min, max] = themeControlRanges[key];

    if (value < min || value > max) {
      reasons.push(`workspaceThemeStyleControls.outOfRange:${key}`);
      continue;
    }

    result[key] = roundControlValue(value);
  }

  if (candidate.accent === undefined) {
    result.accent = isSafeThemeHexColor(candidate.accentColor)
      ? "custom"
      : "custom";
  } else if (!allowedThemeControlAccents.has(candidate.accent as WorkspaceThemeStyleAccentV1)) {
    reasons.push("workspaceThemeStyleControls.invalidAccent");
  } else {
    result.accent = candidate.accent as WorkspaceThemeStyleAccentV1;
  }

  if (candidate.accentColor === undefined) {
    result.accentColor = workspaceThemeStyleAccentTokens[result.accent].primary;
  } else if (!isSafeThemeHexColor(candidate.accentColor)) {
    reasons.push("workspaceThemeStyleControls.invalidAccentColor");
  } else {
    result.accentColor = normalizeThemeHexColor(candidate.accentColor);
    result.accent = "custom";
  }

  if (reasons.length > 0) {
    return rejectThemeStyleControls(...reasons);
  }

  return {
    accepted: true,
    controls: result,
    reasons: [],
  };
}

export function createWorkspaceThemeStylePreviewVariablesV1(
  candidate: unknown,
): WorkspaceThemeStylePreviewVariablesResult {
  const controlsResult = normalizeWorkspaceThemeStyleControlsV1(candidate);

  if (!controlsResult.accepted) {
    return {
      accepted: false,
      checksum: null,
      controls: null,
      reasons: controlsResult.reasons,
      variableNames: [],
      variables: {},
    };
  }

  const variables = createWorkspaceThemeStylePreviewVariables(
    controlsResult.controls,
  );

  return {
    accepted: true,
    checksum: createNexusStyleChecksumV1(variables),
    controls: controlsResult.controls,
    variableNames: Object.keys(variables),
    variables,
  };
}

export function createImportedWorkspaceStyleReviewState(
  decision: WorkspaceStylePayloadImportDecision,
  updatedAt = new Date().toISOString(),
): ImportedWorkspaceStyleReviewState {
  return {
    decision: normalizeWorkspaceStyleImportDecision(decision),
    updatedAt,
  };
}

export function readImportedWorkspaceStyleReviewState():
  | ImportedWorkspaceStyleReviewState
  | null {
  if (importedWorkspaceStyleReviewState) {
    return importedWorkspaceStyleReviewState;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.sessionStorage.getItem(
      NEXUS_IMPORTED_WORKSPACE_STYLE_REVIEW_STORAGE_KEY,
    );

    if (!stored) {
      return null;
    }

    importedWorkspaceStyleReviewState =
      normalizeImportedWorkspaceStyleReviewState(JSON.parse(stored));

    return importedWorkspaceStyleReviewState;
  } catch {
    return null;
  }
}

export function writeImportedWorkspaceStyleReviewState(
  review: ImportedWorkspaceStyleReviewState,
) {
  importedWorkspaceStyleReviewState =
    normalizeImportedWorkspaceStyleReviewState(review);

  if (typeof window !== "undefined") {
    try {
      if (importedWorkspaceStyleReviewState) {
        window.sessionStorage.setItem(
          NEXUS_IMPORTED_WORKSPACE_STYLE_REVIEW_STORAGE_KEY,
          JSON.stringify(importedWorkspaceStyleReviewState),
        );
      } else {
        window.sessionStorage.removeItem(
          NEXUS_IMPORTED_WORKSPACE_STYLE_REVIEW_STORAGE_KEY,
        );
      }

      window.dispatchEvent(
        new CustomEvent(NEXUS_IMPORTED_WORKSPACE_STYLE_REVIEW_EVENT),
      );
    } catch {
      // Keep the in-memory review state even if the browser blocks session storage.
    }
  }

  notifyImportedWorkspaceStyleReviewListeners();
  return importedWorkspaceStyleReviewState;
}

export function clearImportedWorkspaceStyleReviewState() {
  importedWorkspaceStyleReviewState = null;

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(
        NEXUS_IMPORTED_WORKSPACE_STYLE_REVIEW_STORAGE_KEY,
      );
      window.dispatchEvent(
        new CustomEvent(NEXUS_IMPORTED_WORKSPACE_STYLE_REVIEW_EVENT),
      );
    } catch {
      // Nothing to clear beyond the in-memory state.
    }
  }

  notifyImportedWorkspaceStyleReviewListeners();
}

export function subscribeImportedWorkspaceStyleReviewState(
  listener: () => void,
) {
  importedWorkspaceStyleReviewListeners.add(listener);

  if (typeof window !== "undefined") {
    window.addEventListener(
      NEXUS_IMPORTED_WORKSPACE_STYLE_REVIEW_EVENT,
      listener,
    );
  }

  return () => {
    importedWorkspaceStyleReviewListeners.delete(listener);

    if (typeof window !== "undefined") {
      window.removeEventListener(
        NEXUS_IMPORTED_WORKSPACE_STYLE_REVIEW_EVENT,
        listener,
      );
    }
  };
}

export function normalizeWorkspaceStylePayload(
  candidate: unknown,
): WorkspaceStylePayloadImportDecision {
  if (!isRecord(candidate)) {
    return rejectStyleOnly("workspaceStylePayload.invalidRoot");
  }

  const byteSize = calculateJsonSize(candidate);

  if (byteSize > NEXUS_WORKSPACE_STYLE_PAYLOAD_MAX_BYTES) {
    return rejectStyleOnly("workspaceStylePayload.tooLarge");
  }

  const unknownKeys = Object.keys(candidate).filter(
    (key) => !allowedPayloadKeys.has(key),
  );

  if (unknownKeys.length > 0) {
    return rejectStyleOnly("workspaceStylePayload.unknownField");
  }

  if (candidate.version !== NEXUS_WORKSPACE_STYLE_PAYLOAD_VERSION_V1) {
    return {
      payload: null,
      reasons: ["workspaceStylePayload.unsupportedVersion"],
      status: "unsupported-version",
    };
  }

  if (!allowedSources.has(candidate.source as WorkspaceStylePayloadSource)) {
    return rejectStyleOnly("workspaceStylePayload.invalidSource");
  }

  const payload: WorkspaceStylePayloadV1 = {
    source: candidate.source as WorkspaceStylePayloadSource,
    version: NEXUS_WORKSPACE_STYLE_PAYLOAD_VERSION_V1,
  };
  let hasStyleBody = false;

  if ("skinPack" in candidate) {
    const validation = validateNexusSkinPackV2(candidate.skinPack);

    if (!validation.accepted || !validation.skinPack) {
      return rejectStyleOnly("workspaceStylePayload.invalidSkinPack");
    }

    payload.skinPack = validation.skinPack;
    hasStyleBody = true;
  }

  if ("controls" in candidate) {
    if (!isRecord(candidate.controls)) {
      return rejectStyleOnly("workspaceStylePayload.invalidControls");
    }

    const controlsScan = scanUnsafeJson(candidate.controls, "$.controls");

    if (controlsScan.length > 0) {
      return {
        payload: null,
        reasons: controlsScan,
        status: "rejected-style-only",
      };
    }

    if (NEXUS_WORKSPACE_THEME_STYLE_CONTROLS_KEY_V1 in candidate.controls) {
      const themeControls = extractWorkspaceThemeStyleControlsV1(
        candidate.controls,
      );

      if (!themeControls.accepted) {
        return {
          payload: null,
          reasons: themeControls.reasons,
          status: "rejected-style-only",
        };
      }
    }

    payload.controls = cloneJsonRecord(candidate.controls);
    hasStyleBody = true;
  }

  if ("bridgeSummary" in candidate) {
    const bridgeSummary = normalizeBridgeSummary(candidate.bridgeSummary);

    if (!bridgeSummary) {
      return rejectStyleOnly("workspaceStylePayload.invalidBridgeSummary");
    }

    payload.bridgeSummary = bridgeSummary;
  }

  if (!hasStyleBody) {
    return rejectStyleOnly("workspaceStylePayload.emptyStyleBody");
  }

  return {
    payload,
    reasons: [],
    status: "accepted",
  };
}

function normalizeBridgeSummary(
  value: unknown,
): WorkspaceStylePayloadBridgeSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.checksum !== "string" ||
    !/^nexus-style-fnv1a32:[a-f0-9]{8}$/.test(value.checksum) ||
    !isNonNegativeInteger(value.directAliases) ||
    !isNonNegativeInteger(value.families)
  ) {
    return null;
  }

  return {
    checksum: value.checksum,
    directAliases: value.directAliases,
    families: value.families,
  };
}

function rejectStyleOnly(reason: string): WorkspaceStylePayloadImportDecision {
  return {
    payload: null,
    reasons: [reason],
    status: "rejected-style-only",
  };
}

function rejectThemeStyleControls(
  ...reasons: string[]
): WorkspaceThemeStyleControlsNormalizeResult {
  return {
    accepted: false,
    controls: null,
    reasons: reasons.length > 0
      ? reasons
      : ["workspaceThemeStyleControls.invalidControls"],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function calculateJsonSize(value: unknown) {
  return JSON.stringify(value)?.length ?? Number.POSITIVE_INFINITY;
}

function cloneJsonRecord(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function roundControlValue(value: number) {
  return Math.round(value * 100) / 100;
}

function controlRatio(
  controls: WorkspaceThemeStyleControlsV1,
  key: keyof typeof themeControlRanges,
) {
  const [min, max] = themeControlRanges[key];

  return (controls[key] - min) / (max - min);
}

function alpha(value: number) {
  return roundCssNumber(value, 3);
}

function roundCssNumber(value: number, precision: number) {
  const factor = 10 ** precision;

  return Math.round(value * factor) / factor;
}

function rgb([red, green, blue]: [number, number, number], opacity = 1) {
  return `rgb(${red} ${green} ${blue} / ${alpha(opacity)})`;
}

function isSafeThemeHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeThemeHexColor(value: string) {
  return value.toLowerCase();
}

function hexToRgb(value: string): [number, number, number] {
  const normalized = normalizeThemeHexColor(value);

  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
}

function rgbToHex([red, green, blue]: [number, number, number]) {
  return `#${[red, green, blue]
    .map((channel) =>
      clampColorChannel(channel).toString(16).padStart(2, "0"),
    )
    .join("")}`;
}

function clampColorChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function mixRgb(
  source: [number, number, number],
  target: [number, number, number],
  amount: number,
): [number, number, number] {
  return [
    source[0] + (target[0] - source[0]) * amount,
    source[1] + (target[1] - source[1]) * amount,
    source[2] + (target[2] - source[2]) * amount,
  ].map(clampColorChannel) as [number, number, number];
}

function createThemeAccentTokensFromColor(value: string) {
  const primary = normalizeThemeHexColor(value);
  const source = hexToRgb(primary);

  return {
    primary,
    primaryStrong: rgbToHex(mixRgb(source, [0, 0, 0], 0.18)),
    rgb: source,
    secondary: rgbToHex(mixRgb(source, [255, 255, 255], 0.68)),
  };
}

function createWorkspaceThemeStylePreviewVariables(
  controls: WorkspaceThemeStyleControlsV1,
) {
  const warmth = controlRatio(controls, "warmth");
  const glass = controlRatio(controls, "glass");
  const shadow = controlRatio(controls, "shadow");
  const wash = controlRatio(controls, "workspaceWash");
  const accent = createThemeAccentTokensFromColor(controls.accentColor);
  const panelOpacity = 0.1 + glass * 0.22;
  const glassOpacity = 0.08 + glass * 0.18;
  const borderOpacity = 0.18 + glass * 0.18;
  const radius = `${controls.radius}px`;
  const blur = `${controls.blur}px`;
  const shadowOpacity = 0.18 + shadow * 0.22;
  const accentGlowOpacity = 0.05 + shadow * 0.13;
  const workspaceWashOpacity = 0.014 + wash * 0.045;
  const layoutTintOpacity = 0.05 + wash * 0.08;
  const surfaceWarmShift = (warmth - 0.5) * 6;
  const neutralSurface = (level: number): [number, number, number] => [
    clampColorChannel(level + surfaceWarmShift),
    clampColorChannel(level + surfaceWarmShift * 0.25),
    clampColorChannel(level - surfaceWarmShift * 0.25),
  ];
  const surfaceDeep = neutralSurface(8 + wash * 10);
  const surfaceBase = neutralSurface(14 + wash * 18);
  const surfacePanel = neutralSurface(22 + wash * 20);
  const surfaceRaised = neutralSurface(32 + wash * 22);
  const panel = rgb(surfacePanel, panelOpacity);
  const glassPanel = rgb(surfaceRaised, glassOpacity);
  const border = rgb(accent.rgb, borderOpacity);
  const layoutPanel = `linear-gradient(180deg, ${rgb(accent.rgb, layoutTintOpacity)}, ${rgb(surfaceBase, 0.16 + glass * 0.16)})`;
  const layoutPanelMuted = `linear-gradient(180deg, ${rgb(accent.rgb, 0.025 + wash * 0.045)}, ${rgb(surfaceBase, 0.08 + glass * 0.12)})`;
  const workspaceSurfaceRgb = neutralSurface(9 + wash * 30);
  const workspaceBg = rgb(workspaceSurfaceRgb, 0.98);
  const workspaceWash =
    `linear-gradient(135deg, ${rgb(accent.rgb, workspaceWashOpacity)}, ${rgb(surfaceBase, 0.012 + wash * 0.032)})`;
  const shadowValue =
    `0 24px ${Math.round(42 + shadow * 58)}px rgb(0 0 0 / ${alpha(shadowOpacity)}), 0 0 ${Math.round(14 + shadow * 34)}px ${rgb(accent.rgb, accentGlowOpacity)}`;
  const outerShellBg =
    `linear-gradient(135deg, ${rgb(surfaceDeep, 0.98)}, ${rgb(surfaceBase, 0.86)} 48%, ${rgb(accent.rgb, 0.04 + wash * 0.07)})`;
  const bodyFrameBg =
    `linear-gradient(180deg, ${rgb(accent.rgb, 0.02 + wash * 0.035)}, ${rgb(surfaceBase, 0.05 + wash * 0.07)})`;

  return ensureThemePreviewVariableOrder({
    "--nexus-body-frame-bg": bodyFrameBg,
    "--nexus-layout-panel-bg": layoutPanel,
    "--nexus-layout-panel-border": border,
    "--nexus-layout-panel-muted-bg": layoutPanelMuted,
    "--nexus-layout-panel-shadow": shadowValue,
    "--nexus-outer-shell-bg": outerShellBg,
    "--nexus-accent-primary": accent.primary,
    "--nexus-accent-primary-strong": accent.primaryStrong,
    "--nexus-accent-secondary": accent.secondary,
    "--nexus-agent-window-bg": glassPanel,
    "--nexus-agent-window-blur": blur,
    "--nexus-agent-window-handle-radius": radius,
    "--nexus-agent-window-radius": radius,
    "--nexus-agent-window-shadow": shadowValue,
    "--nexus-command-palette-bg": glassPanel,
    "--nexus-command-palette-radius": radius,
    "--nexus-datapad-shell-bg": glassPanel,
    "--nexus-datapad-shell-radius": radius,
    "--nexus-glass-bg": glassPanel,
    "--nexus-glass-blur": blur,
    "--nexus-glass-border": border,
    "--nexus-glass-radius": radius,
    "--nexus-message-bubble-bg": rgb(accent.rgb, 0.08 + glass * 0.12),
    "--nexus-message-bubble-radius": radius,
    "--nexus-modal-shell-bg": glassPanel,
    "--nexus-modal-shell-radius": radius,
    "--nexus-panel-bg": panel,
    "--nexus-panel-blur": blur,
    "--nexus-panel-border": border,
    "--nexus-panel-radius": radius,
    "--nexus-panel-shadow": shadowValue,
    "--nexus-right-dock-bg": glassPanel,
    "--nexus-right-dock-blur": blur,
    "--nexus-right-dock-border": border,
    "--nexus-right-dock-radius": radius,
    "--nexus-right-dock-shadow": shadowValue,
    "--nexus-top-bar-bg": rgb(surfacePanel, 0.12 + glass * 0.16),
    "--nexus-top-bar-blur": blur,
    "--nexus-top-bar-border": border,
    "--nexus-top-bar-radius": radius,
    "--nexus-top-bar-shadow": shadowValue,
    "--nexus-workspace-bg": workspaceBg,
    "--nexus-workspace-border": border,
    "--nexus-workspace-grid-primary": rgb(accent.rgb, 0.07 + wash * 0.08),
    "--nexus-workspace-grid-secondary": rgb(accent.rgb, 0.03 + wash * 0.05),
    "--nexus-workspace-minimap-mask": rgb(
      neutralSurface(10 + wash * 24),
      0.76,
    ),
    "--nexus-workspace-radius": radius,
    "--nexus-workspace-shadow": shadowValue,
    "--nexus-workspace-wash": workspaceWash,
    "--theme-primary": accent.primary,
    "--theme-primary-strong": accent.primaryStrong,
    "--theme-secondary": accent.secondary,
  });
}

function ensureThemePreviewVariableOrder(variables: Record<string, string>) {
  return Object.fromEntries(
    workspaceThemeStylePreviewVariableNames.map((name) => [name, variables[name]]),
  ) as Record<(typeof workspaceThemeStylePreviewVariableNames)[number], string>;
}

function normalizeImportedWorkspaceStyleReviewState(
  value: unknown,
): ImportedWorkspaceStyleReviewState | null {
  if (!isRecord(value) || typeof value.updatedAt !== "string") {
    return null;
  }

  if (!isRecord(value.decision)) {
    return null;
  }

  return {
    decision: normalizeWorkspaceStyleImportDecision(
      value.decision as WorkspaceStylePayloadImportDecision,
    ),
    updatedAt: value.updatedAt,
  };
}

function normalizeWorkspaceStyleImportDecision(
  decision: WorkspaceStylePayloadImportDecision,
): WorkspaceStylePayloadImportDecision {
  if (!allowedImportStatuses.has(decision.status)) {
    return {
      payload: null,
      reasons: ["workspaceStylePayload.invalidStatus"],
      status: "rejected-style-only",
    };
  }

  if (decision.status === "accepted") {
    const payloadDecision = normalizeWorkspaceStylePayload(decision.payload);

    if (payloadDecision.status === "accepted" && payloadDecision.payload) {
      return payloadDecision;
    }

    return {
      payload: null,
      reasons: payloadDecision.reasons,
      status: "rejected-style-only",
    };
  }

  return {
    payload: null,
    reasons: Array.isArray(decision.reasons)
      ? decision.reasons.filter((reason) => typeof reason === "string")
      : [],
    status: decision.status,
  };
}

function omitStylePayload<TSnapshot extends object>(
  snapshot: TSnapshot,
): TSnapshot & { stylePack?: WorkspaceStylePayloadV1 } {
  const rest = { ...(snapshot as TSnapshot & { stylePack?: unknown }) };

  delete (rest as TSnapshot & {
    stylePack?: unknown;
  }).stylePack;

  return rest as TSnapshot & { stylePack?: WorkspaceStylePayloadV1 };
}

function notifyImportedWorkspaceStyleReviewListeners() {
  for (const listener of importedWorkspaceStyleReviewListeners) {
    listener();
  }
}

function scanUnsafeJson(value: unknown, path: string): string[] {
  const reasons: string[] = [];

  function visit(nextValue: unknown, nextPath: string) {
    if (typeof nextValue === "string") {
      if (isSafeThemeHexColor(nextValue)) {
        return;
      }

      if (unsafeStringPatterns.some((pattern) => pattern.test(nextValue))) {
        reasons.push(`workspaceStylePayload.unsafeString:${nextPath}`);
      }

      return;
    }

    if (Array.isArray(nextValue)) {
      nextValue.forEach((item, index) => visit(item, `${nextPath}[${index}]`));
      return;
    }

    if (!isRecord(nextValue)) {
      return;
    }

    for (const [key, child] of Object.entries(nextValue)) {
      const childPath = `${nextPath}.${key}`;

      if (unsafeKeyPattern.test(key)) {
        reasons.push(`workspaceStylePayload.unsafeKey:${childPath}`);
        continue;
      }

      visit(child, childPath);
    }
  }

  visit(value, path);
  return reasons;
}
