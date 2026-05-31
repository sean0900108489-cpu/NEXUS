import { createNexusStyleChecksumV1 } from "./checksum";
import type { ProductionPreviewPreflightVerdict } from "./v2-production-preview-preflight";

export const NEXUS_PRODUCTION_PREVIEW_TRANSACTION_VERSION_V1 =
  "nexus-production-preview-transaction-v1" as const;

export const NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR =
  "main.nexus-shell.nexus-outer-shell-frame" as const;

export type ProductionPreviewTransactionVerdict =
  | "ready"
  | "hold"
  | "blocked";

export type ProductionPreviewTransactionReasonCode =
  | "productionPreviewTransaction.invalidInput"
  | "productionPreviewTransaction.invalidTargetSelector"
  | "productionPreviewTransaction.targetCountBlocked"
  | "productionPreviewTransaction.rootTargetBlocked"
  | "productionPreviewTransaction.targetClassBlocked"
  | "productionPreviewTransaction.preflightNotEligible"
  | "productionPreviewTransaction.authenticatedEvidenceMissing"
  | "productionPreviewTransaction.rollbackMissing"
  | "productionPreviewTransaction.networkBaselineMissing"
  | "productionPreviewTransaction.checksumMissing"
  | "productionPreviewTransaction.checksumMismatch"
  | "productionPreviewTransaction.variableCountBlocked"
  | "productionPreviewTransaction.unsafeVariable"
  | "productionPreviewTransaction.unsafeWriteFlag"
  | "productionPreviewTransaction.sessionMismatch"
  | "productionPreviewTransaction.transactionMissing";

export type ProductionPreviewTransactionReason = {
  code: ProductionPreviewTransactionReasonCode;
  message: string;
  severity: ProductionPreviewTransactionVerdict;
};

export type ProductionPreviewTargetFacts = {
  selector: string;
  targetCount: number;
  tagName?: string | null;
  classList?: string[];
  isDocumentRoot?: boolean;
  isHtmlElement?: boolean;
  isBodyElement?: boolean;
  visible?: boolean;
};

export type ProductionPreviewSafetyWriteFlags = {
  writesToStore?: boolean;
  writesToBackend?: boolean;
  writesToStorage?: boolean;
  mutatesDocumentRoot?: boolean;
  touchesProductionBehavior?: boolean;
};

export type ProductionPreviewTransactionChecksums = {
  bridgeChecksum?: string | null;
  budgetChecksum?: string | null;
  diagnosticsChecksum?: string | null;
};

export type ProductionPreviewInlineValueSnapshot = Record<
  string,
  string | undefined
>;

export type ProductionPreviewApplyPlanInput = {
  transactionId: string;
  sessionId: string;
  target: ProductionPreviewTargetFacts;
  variables: Record<string, string>;
  previousInlineValues: ProductionPreviewInlineValueSnapshot;
  checksums: ProductionPreviewTransactionChecksums;
  preflightVerdict: ProductionPreviewPreflightVerdict;
  hasAuthenticatedEvidence: boolean;
  hasRollbackPlan: boolean;
  networkBaselineWindowId?: string | null;
  safetyFlags?: ProductionPreviewSafetyWriteFlags;
  createdAt?: string;
};

export type ProductionPreviewApplyTransaction = {
  kind: "nexus-production-preview-apply-transaction";
  version: typeof NEXUS_PRODUCTION_PREVIEW_TRANSACTION_VERSION_V1;
  transactionId: string;
  sessionId: string;
  targetSelector: typeof NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR;
  targetTagName: string;
  targetClassList: string[];
  variableNames: string[];
  variableCount: number;
  appliedVariables: Record<string, string>;
  previousInlineValues: ProductionPreviewInlineValueSnapshot;
  checksums: {
    bridgeChecksum: string;
    budgetChecksum: string;
    diagnosticsChecksum: string;
    variableMapChecksum: string;
  };
  networkBaselineWindowId: string;
  createdAt: string;
  status: "ready";
};

export type ProductionPreviewApplyPlan = {
  kind: "nexus-production-preview-apply-plan";
  version: typeof NEXUS_PRODUCTION_PREVIEW_TRANSACTION_VERSION_V1;
  verdict: ProductionPreviewTransactionVerdict;
  reasons: ProductionPreviewTransactionReason[];
  transaction: ProductionPreviewApplyTransaction | null;
  failClosed: boolean;
};

export type ProductionPreviewRevertOperation =
  | {
      kind: "remove";
      name: string;
    }
  | {
      kind: "restore";
      name: string;
      value: string;
    };

export type ProductionPreviewRevertPlanInput = {
  transaction: ProductionPreviewApplyTransaction | null | undefined;
  target: ProductionPreviewTargetFacts;
  expectedSessionId?: string | null;
  expectedBridgeChecksum?: string | null;
};

export type ProductionPreviewRevertPlan = {
  kind: "nexus-production-preview-revert-plan";
  version: typeof NEXUS_PRODUCTION_PREVIEW_TRANSACTION_VERSION_V1;
  verdict: ProductionPreviewTransactionVerdict;
  reasons: ProductionPreviewTransactionReason[];
  transactionId: string | null;
  sessionId: string | null;
  operations: ProductionPreviewRevertOperation[];
  residueCheckVariableNames: string[];
  failClosed: boolean;
};

export type ProductionPreviewResidueCheckInput = {
  transaction: ProductionPreviewApplyTransaction;
  currentInlineValues: ProductionPreviewInlineValueSnapshot;
};

export type ProductionPreviewResidueCheckSummary = {
  kind: "nexus-production-preview-residue-check";
  version: typeof NEXUS_PRODUCTION_PREVIEW_TRANSACTION_VERSION_V1;
  result: "pass" | "fail";
  remainingPreviewVariableCount: number;
  mismatchedVariableNames: string[];
};

export function createProductionPreviewApplyPlan(
  input?: ProductionPreviewApplyPlanInput | null,
): ProductionPreviewApplyPlan {
  if (!input) {
    return createApplyPlan({
      reasons: [
        createReason({
          code: "productionPreviewTransaction.invalidInput",
          message: "Production preview apply requires transaction, target, variables, checksums, and safety evidence.",
          severity: "blocked",
        }),
      ],
      transaction: null,
    });
  }

  const sortedVariables = sortStringRecord(input.variables);
  const variableNames = Object.keys(sortedVariables);
  const previousInlineValues = createPreviousInlineSnapshot({
    previousInlineValues: input.previousInlineValues,
    variableNames,
  });
  const reasons = createApplyPlanReasons(input, sortedVariables);
  const verdict = getVerdict(reasons);

  if (verdict !== "ready") {
    return createApplyPlan({ reasons, transaction: null });
  }

  const bridgeChecksum = input.checksums.bridgeChecksum?.trim() ?? "";
  const budgetChecksum = input.checksums.budgetChecksum?.trim() ?? "";
  const diagnosticsChecksum = input.checksums.diagnosticsChecksum?.trim() ?? "";
  const variableMapChecksum = createNexusStyleChecksumV1(sortedVariables);

  return createApplyPlan({
    reasons,
    transaction: {
      appliedVariables: sortedVariables,
      checksums: {
        bridgeChecksum,
        budgetChecksum,
        diagnosticsChecksum,
        variableMapChecksum,
      },
      createdAt: input.createdAt ?? "nexus-production-preview-transaction",
      kind: "nexus-production-preview-apply-transaction",
      networkBaselineWindowId: input.networkBaselineWindowId?.trim() ?? "",
      previousInlineValues,
      sessionId: input.sessionId,
      status: "ready",
      targetClassList: normalizeClassList(input.target.classList),
      targetSelector: NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR,
      targetTagName: normalizeTagName(input.target.tagName),
      transactionId: input.transactionId,
      variableCount: variableNames.length,
      variableNames,
      version: NEXUS_PRODUCTION_PREVIEW_TRANSACTION_VERSION_V1,
    },
  });
}

export function createProductionPreviewRevertPlan(
  input: ProductionPreviewRevertPlanInput,
): ProductionPreviewRevertPlan {
  const reasons: ProductionPreviewTransactionReason[] = [];
  const transaction = input.transaction ?? null;

  if (!transaction) {
    reasons.push(
      createReason({
        code: "productionPreviewTransaction.transactionMissing",
        message: "Revert requires an active production preview transaction.",
        severity: "blocked",
      }),
    );
  }

  if (transaction) {
    reasons.push(...createTargetReasons(input.target));

    if (
      hasText(input.expectedSessionId) &&
      input.expectedSessionId !== transaction.sessionId
    ) {
      reasons.push(
        createReason({
          code: "productionPreviewTransaction.sessionMismatch",
          message: "Revert session id must match the active transaction.",
          severity: "blocked",
        }),
      );
    }

    if (
      hasText(input.expectedBridgeChecksum) &&
      input.expectedBridgeChecksum !== transaction.checksums.bridgeChecksum
    ) {
      reasons.push(
        createReason({
          code: "productionPreviewTransaction.checksumMismatch",
          message: "Revert checksum must match the active transaction.",
          severity: "blocked",
        }),
      );
    }
  }

  const verdict = getVerdict(reasons);
  const operations =
    verdict === "ready" && transaction
      ? transaction.variableNames.map((name) => {
          const previous = transaction.previousInlineValues[name];

          if (previous === undefined) {
            return {
              kind: "remove" as const,
              name,
            };
          }

          return {
            kind: "restore" as const,
            name,
            value: previous,
          };
        })
      : [];

  return {
    failClosed: verdict === "blocked",
    kind: "nexus-production-preview-revert-plan",
    operations,
    reasons,
    residueCheckVariableNames: transaction?.variableNames ?? [],
    sessionId: transaction?.sessionId ?? null,
    transactionId: transaction?.transactionId ?? null,
    verdict,
    version: NEXUS_PRODUCTION_PREVIEW_TRANSACTION_VERSION_V1,
  };
}

export function createProductionPreviewResidueCheck(
  input: ProductionPreviewResidueCheckInput,
): ProductionPreviewResidueCheckSummary {
  const mismatchedVariableNames: string[] = [];
  let remainingPreviewVariableCount = 0;

  for (const name of input.transaction.variableNames) {
    const previous = input.transaction.previousInlineValues[name];
    const current = normalizeInlineValue(input.currentInlineValues[name]);

    if (previous === undefined) {
      if (current !== undefined) {
        remainingPreviewVariableCount += 1;
        mismatchedVariableNames.push(name);
      }

      continue;
    }

    if (current !== previous) {
      mismatchedVariableNames.push(name);
    }
  }

  return {
    kind: "nexus-production-preview-residue-check",
    mismatchedVariableNames,
    remainingPreviewVariableCount,
    result:
      mismatchedVariableNames.length === 0 && remainingPreviewVariableCount === 0
        ? "pass"
        : "fail",
    version: NEXUS_PRODUCTION_PREVIEW_TRANSACTION_VERSION_V1,
  };
}

function createApplyPlanReasons(
  input: ProductionPreviewApplyPlanInput,
  variables: Record<string, string>,
) {
  const reasons: ProductionPreviewTransactionReason[] = [];
  const variableMapChecksum = createNexusStyleChecksumV1(variables);

  reasons.push(...createTargetReasons(input.target));

  if (input.preflightVerdict !== "eligible") {
    reasons.push(
      createReason({
        code: "productionPreviewTransaction.preflightNotEligible",
        message: "Production preview preflight must be eligible before apply.",
        severity: input.preflightVerdict === "hold" ? "hold" : "blocked",
      }),
    );
  }

  if (!input.hasAuthenticatedEvidence) {
    reasons.push(
      createReason({
        code: "productionPreviewTransaction.authenticatedEvidenceMissing",
        message: "Authenticated workspace evidence pass is required.",
        severity: "blocked",
      }),
    );
  }

  if (!input.hasRollbackPlan) {
    reasons.push(
      createReason({
        code: "productionPreviewTransaction.rollbackMissing",
        message: "Rollback plan is required before production preview.",
        severity: "hold",
      }),
    );
  }

  if (!hasText(input.networkBaselineWindowId)) {
    reasons.push(
      createReason({
        code: "productionPreviewTransaction.networkBaselineMissing",
        message: "Route-load network baseline window is required.",
        severity: "hold",
      }),
    );
  }

  reasons.push(...createChecksumReasons(input.checksums, variableMapChecksum));
  reasons.push(...createVariableReasons(variables));
  reasons.push(...createSafetyFlagReasons(input.safetyFlags ?? {}));

  return reasons;
}

function createTargetReasons(
  target: ProductionPreviewTargetFacts,
): ProductionPreviewTransactionReason[] {
  const reasons: ProductionPreviewTransactionReason[] = [];
  const tagName = normalizeTagName(target.tagName);
  const classList = normalizeClassList(target.classList);

  if (target.selector !== NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR) {
    reasons.push(
      createReason({
        code: "productionPreviewTransaction.invalidTargetSelector",
        message: "Production preview first cut only allows the outer shell frame target selector.",
        severity: "blocked",
      }),
    );
  }

  if (target.targetCount !== 1) {
    reasons.push(
      createReason({
        code: "productionPreviewTransaction.targetCountBlocked",
        message: "Production preview target count must be exactly one.",
        severity: "blocked",
      }),
    );
  }

  if (
    target.isDocumentRoot ||
    target.isHtmlElement ||
    target.isBodyElement ||
    tagName === "html" ||
    tagName === "body"
  ) {
    reasons.push(
      createReason({
        code: "productionPreviewTransaction.rootTargetBlocked",
        message: "Document root, html, and body targets are blocked.",
        severity: "blocked",
      }),
    );
  }

  if (
    !classList.includes("nexus-shell") ||
    !classList.includes("nexus-outer-shell-frame")
  ) {
    reasons.push(
      createReason({
        code: "productionPreviewTransaction.targetClassBlocked",
        message: "Target must include nexus-shell and nexus-outer-shell-frame classes.",
        severity: "blocked",
      }),
    );
  }

  return reasons;
}

function createChecksumReasons(
  checksums: ProductionPreviewTransactionChecksums,
  variableMapChecksum: string,
): ProductionPreviewTransactionReason[] {
  const reasons: ProductionPreviewTransactionReason[] = [];
  const bridgeChecksum = checksums.bridgeChecksum?.trim();
  const budgetChecksum = checksums.budgetChecksum?.trim();
  const diagnosticsChecksum = checksums.diagnosticsChecksum?.trim();

  if (
    !hasText(bridgeChecksum) ||
    !hasText(budgetChecksum) ||
    !hasText(diagnosticsChecksum)
  ) {
    reasons.push(
      createReason({
        code: "productionPreviewTransaction.checksumMissing",
        message: "Bridge, budget, and diagnostics checksums are required.",
        severity: "blocked",
      }),
    );

    return reasons;
  }

  if (
    bridgeChecksum !== variableMapChecksum ||
    budgetChecksum !== diagnosticsChecksum
  ) {
    reasons.push(
      createReason({
        code: "productionPreviewTransaction.checksumMismatch",
        message: "Bridge checksum must match the variable map and budget checksum must match diagnostics.",
        severity: "blocked",
      }),
    );
  }

  return reasons;
}

function createVariableReasons(variables: Record<string, string>) {
  const reasons: ProductionPreviewTransactionReason[] = [];
  const entries = Object.entries(variables);

  if (entries.length === 0) {
    reasons.push(
      createReason({
        code: "productionPreviewTransaction.variableCountBlocked",
        message: "Production preview requires at least one variable.",
        severity: "blocked",
      }),
    );
  }

  for (const [name, value] of entries) {
    if (!isSafeVariableName(name) || !isSafeVariableValue(value)) {
      reasons.push(
        createReason({
          code: "productionPreviewTransaction.unsafeVariable",
          message: "Production preview variables must be safe CSS custom properties and values.",
          severity: "blocked",
        }),
      );
      break;
    }
  }

  return reasons;
}

function createSafetyFlagReasons(
  flags: ProductionPreviewSafetyWriteFlags,
): ProductionPreviewTransactionReason[] {
  if (
    flags.writesToStore ||
    flags.writesToBackend ||
    flags.writesToStorage ||
    flags.mutatesDocumentRoot ||
    flags.touchesProductionBehavior
  ) {
    return [
      createReason({
        code: "productionPreviewTransaction.unsafeWriteFlag",
        message: "Production preview first cut blocks store, backend, storage, document root, and behavior writes.",
        severity: "blocked",
      }),
    ];
  }

  return [];
}

function createApplyPlan({
  reasons,
  transaction,
}: {
  reasons: ProductionPreviewTransactionReason[];
  transaction: ProductionPreviewApplyTransaction | null;
}): ProductionPreviewApplyPlan {
  const verdict = getVerdict(reasons);

  return {
    failClosed: verdict === "blocked",
    kind: "nexus-production-preview-apply-plan",
    reasons,
    transaction,
    verdict,
    version: NEXUS_PRODUCTION_PREVIEW_TRANSACTION_VERSION_V1,
  };
}

function createPreviousInlineSnapshot({
  previousInlineValues,
  variableNames,
}: {
  previousInlineValues: ProductionPreviewInlineValueSnapshot;
  variableNames: string[];
}) {
  return Object.fromEntries(
    variableNames.map((name) => [
      name,
      normalizeInlineValue(previousInlineValues[name]),
    ]),
  );
}

function createReason({
  code,
  message,
  severity,
}: ProductionPreviewTransactionReason): ProductionPreviewTransactionReason {
  return { code, message, severity };
}

function getVerdict(
  reasons: ProductionPreviewTransactionReason[],
): ProductionPreviewTransactionVerdict {
  if (reasons.some((reason) => reason.severity === "blocked")) {
    return "blocked";
  }

  if (reasons.some((reason) => reason.severity === "hold")) {
    return "hold";
  }

  return "ready";
}

function sortStringRecord(record: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function normalizeInlineValue(value: string | null | undefined) {
  if (typeof value !== "string") {
    return undefined;
  }

  return value.length > 0 ? value : undefined;
}

function normalizeTagName(value: string | null | undefined) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function normalizeClassList(value: string[] | null | undefined) {
  return [...(value ?? [])].sort((left, right) => left.localeCompare(right));
}

function hasText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function isSafeVariableName(name: string) {
  return /^--[a-z0-9-]+$/i.test(name);
}

function isSafeVariableValue(value: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  return !/[;{}]/.test(value) &&
    !/<script|javascript:|\burl\s*\(|https?:\/\/|ftp:\/\/|\b(?:blob|file|data):|!important/i.test(
      value,
    );
}
