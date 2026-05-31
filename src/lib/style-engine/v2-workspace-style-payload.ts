import type { NexusSkinPackV2 } from "./v2-contracts";
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
