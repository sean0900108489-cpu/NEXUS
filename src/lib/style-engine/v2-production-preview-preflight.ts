import type { StyleRuntimeBudgetVerdict } from "./v2-style-runtime-budget";

export type ProductionPreviewPreflightVerdict =
  | "eligible"
  | "hold"
  | "blocked";

export type ProductionPreviewApplyMode = "non-persistent-preview";

export type ProductionPreviewDiagnosticsStatus =
  | "idle"
  | "applied"
  | "reverted"
  | "completed"
  | "failed";

export type ProductionPreviewResidueCheck = "not-run" | "pass" | "fail";

export type ProductionPreviewStyleLabGateVerdict = "PASS" | "HOLD" | "BLOCK";

export type ProductionPreviewTargetScopeType =
  | "style-lab"
  | "authenticated-production-route"
  | "isolated-production-container";

export type ProductionPreviewPersistence = "none";

export type ProductionPreviewMutationTarget =
  | "local-container"
  | "isolated-container"
  | "production-route-container"
  | "root-document";

export type ProductionPreviewTargetScope = {
  scopeId: string;
  scopeType: ProductionPreviewTargetScopeType | (string & {});
  persistence: ProductionPreviewPersistence | (string & {});
  mutationTarget: ProductionPreviewMutationTarget | (string & {});
  requiresAuthSmoke: boolean;
};

export type ProductionPreviewSafetyFlags = {
  hasAuthenticatedSmoke: boolean;
  hasRollbackPlan: boolean;
  writesToStore: boolean;
  writesToBackend: boolean;
  writesToStorage: boolean;
  mutatesDocumentRoot: boolean;
  touchesProductionBehavior: boolean;
};

export type ProductionPreviewPreflightReasonCode =
  | "productionPreviewPreflight.invalidInput"
  | "productionPreviewPreflight.unknownMode"
  | "productionPreviewPreflight.invalidTargetScope"
  | "productionPreviewPreflight.persistenceRequested"
  | "productionPreviewPreflight.budgetBlocked"
  | "productionPreviewPreflight.budgetWarning"
  | "productionPreviewPreflight.localGateBlocked"
  | "productionPreviewPreflight.localGateHold"
  | "productionPreviewPreflight.diagnosticsIncomplete"
  | "productionPreviewPreflight.diagnosticsFailed"
  | "productionPreviewPreflight.residueFailed"
  | "productionPreviewPreflight.variableCountZero"
  | "productionPreviewPreflight.checksumMissing"
  | "productionPreviewPreflight.checksumMismatch"
  | "productionPreviewPreflight.authSmokeMissing"
  | "productionPreviewPreflight.rollbackMissing"
  | "productionPreviewPreflight.storeWriteBlocked"
  | "productionPreviewPreflight.backendWriteBlocked"
  | "productionPreviewPreflight.storageWriteBlocked"
  | "productionPreviewPreflight.rootMutationBlocked"
  | "productionPreviewPreflight.productionBehaviorBlocked"
  | "productionPreviewPreflight.targetScopeNeedsEvidence"
  | "productionPreviewPreflight.criticalGapBlocked";

export type ProductionPreviewPreflightReason = {
  code: ProductionPreviewPreflightReasonCode;
  message: string;
  severity: ProductionPreviewPreflightVerdict;
};

export type ProductionPreviewBlocker = ProductionPreviewPreflightReason & {
  severity: "blocked";
};

export type ProductionPreviewRequiredEvidenceStatus =
  | "satisfied"
  | "missing"
  | "blocked";

export type ProductionPreviewRequiredEvidence = {
  id: string;
  label: string;
  status: ProductionPreviewRequiredEvidenceStatus;
  detail: string;
};

export type ProductionPreviewRollbackRequirement = {
  id: string;
  label: string;
  required: true;
};

export type ProductionPreviewPreflightInput = {
  budgetVerdict: StyleRuntimeBudgetVerdict;
  budgetChecksum?: string | null;
  diagnosticsStatus: ProductionPreviewDiagnosticsStatus;
  diagnosticsChecksum?: string | null;
  residueCheck: ProductionPreviewResidueCheck;
  variableCount: number;
  preflightVerdict: ProductionPreviewStyleLabGateVerdict;
  sessionId?: string | null;
  targetScope: ProductionPreviewTargetScope;
  productionApplyMode: ProductionPreviewApplyMode | (string & {});
  unsupportedCriticalGapCount?: number;
  nonCriticalWarningCount?: number;
  diagnosticsError?: string | null;
  flags: ProductionPreviewSafetyFlags;
};

export type ProductionPreviewPreflightSummary = {
  kind: "nexus-production-preview-preflight";
  version: "nexus-production-preview-preflight-v1";
  verdict: ProductionPreviewPreflightVerdict;
  reasons: ProductionPreviewPreflightReason[];
  blockers: ProductionPreviewBlocker[];
  requiredEvidence: ProductionPreviewRequiredEvidence[];
  allowedTargetScope: ProductionPreviewTargetScope | null;
  rollbackRequirements: ProductionPreviewRollbackRequirement[];
  failClosed: boolean;
  nextAction: string;
};

const productionPreviewPreflightVersion =
  "nexus-production-preview-preflight-v1" as const;

const allowedScopeTypes: ProductionPreviewTargetScopeType[] = [
  "authenticated-production-route",
  "isolated-production-container",
  "style-lab",
];

const allowedMutationTargets: ProductionPreviewMutationTarget[] = [
  "isolated-container",
  "local-container",
  "production-route-container",
  "root-document",
];

export function createProductionPreviewPreflight(
  input?: ProductionPreviewPreflightInput | null,
): ProductionPreviewPreflightSummary {
  if (!input) {
    return createSummary({
      allowedTargetScope: null,
      evidence: createMissingEvidence(),
      reasons: [
        createReason({
          code: "productionPreviewPreflight.invalidInput",
          message: "Production preview preflight requires budget, diagnostics, target scope, and safety evidence.",
          severity: "blocked",
        }),
      ],
    });
  }

  const reasons: ProductionPreviewPreflightReason[] = [];
  const targetScope = normalizeTargetScope(input.targetScope);
  const hasBudgetChecksum = hasText(input.budgetChecksum);
  const hasDiagnosticsChecksum = hasText(input.diagnosticsChecksum);
  const checksumMatches =
    hasBudgetChecksum &&
    hasDiagnosticsChecksum &&
    input.budgetChecksum === input.diagnosticsChecksum;
  const diagnosticsCompleted =
    input.diagnosticsStatus === "reverted" ||
    input.diagnosticsStatus === "completed";
  const requiresAuthenticatedSmoke =
    targetScope?.requiresAuthSmoke === true ||
    targetScope?.scopeType === "authenticated-production-route";
  const criticalGapCount = input.unsupportedCriticalGapCount ?? 0;
  const nonCriticalWarningCount = input.nonCriticalWarningCount ?? 0;

  if (input.productionApplyMode !== "non-persistent-preview") {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.unknownMode",
        message: "Only non-persistent preview mode is allowed.",
        severity: "blocked",
      }),
    );
  }

  if (!targetScope) {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.invalidTargetScope",
        message: "Target scope is missing or unsupported.",
        severity: "blocked",
      }),
    );
  }

  if (targetScope && targetScope.persistence !== "none") {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.persistenceRequested",
        message: "Target scope persistence must be none.",
        severity: "blocked",
      }),
    );
  }

  if (input.budgetVerdict === "block") {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.budgetBlocked",
        message: "Budget verdict blocks production preview preflight.",
        severity: "blocked",
      }),
    );
  } else if (input.budgetVerdict === "warn") {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.budgetWarning",
        message: "Budget has non-critical warnings that require review.",
        severity: "hold",
      }),
    );
  }

  if (criticalGapCount > 0) {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.criticalGapBlocked",
        message: "Unsupported critical capability blocks production preview preflight.",
        severity: "blocked",
      }),
    );
  }

  if (nonCriticalWarningCount > 0) {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.targetScopeNeedsEvidence",
        message: "Non-critical warnings require review before production preview preflight.",
        severity: "hold",
      }),
    );
  }

  if (input.preflightVerdict === "BLOCK") {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.localGateBlocked",
        message: "Style Lab preflight gate is blocked.",
        severity: "blocked",
      }),
    );
  } else if (input.preflightVerdict === "HOLD") {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.localGateHold",
        message: "Style Lab preflight gate has not reached pass.",
        severity: "hold",
      }),
    );
  }

  if (input.diagnosticsStatus === "failed" || hasText(input.diagnosticsError)) {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.diagnosticsFailed",
        message: input.diagnosticsError?.trim() || "Diagnostics failed closed.",
        severity: "blocked",
      }),
    );
  } else if (!diagnosticsCompleted) {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.diagnosticsIncomplete",
        message: "Diagnostics must complete apply and revert evidence first.",
        severity: "hold",
      }),
    );
  }

  if (input.residueCheck === "fail") {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.residueFailed",
        message: "Residue check failed after revert.",
        severity: "blocked",
      }),
    );
  } else if (input.residueCheck !== "pass") {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.diagnosticsIncomplete",
        message: "Residue pass evidence is missing.",
        severity: "hold",
      }),
    );
  }

  if (!Number.isFinite(input.variableCount) || input.variableCount <= 0) {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.variableCountZero",
        message: "Variable count must be greater than zero.",
        severity: "blocked",
      }),
    );
  }

  if (!hasBudgetChecksum || !hasDiagnosticsChecksum) {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.checksumMissing",
        message: "Budget and diagnostics checksums are required.",
        severity: "hold",
      }),
    );
  } else if (!checksumMatches) {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.checksumMismatch",
        message: "Budget and diagnostics checksums must match.",
        severity: "blocked",
      }),
    );
  }

  if (requiresAuthenticatedSmoke && !input.flags.hasAuthenticatedSmoke) {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.authSmokeMissing",
        message: "Authenticated production scope requires authenticated smoke evidence.",
        severity: "hold",
      }),
    );
  }

  if (!input.flags.hasRollbackPlan) {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.rollbackMissing",
        message: "Rollback plan is required before production preview preflight.",
        severity: "hold",
      }),
    );
  }

  if (input.flags.writesToStore) {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.storeWriteBlocked",
        message: "Store writes are blocked for non-persistent preview.",
        severity: "blocked",
      }),
    );
  }

  if (input.flags.writesToBackend) {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.backendWriteBlocked",
        message: "Backend writes are blocked for non-persistent preview.",
        severity: "blocked",
      }),
    );
  }

  if (input.flags.writesToStorage) {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.storageWriteBlocked",
        message: "Storage writes are blocked for non-persistent preview.",
        severity: "blocked",
      }),
    );
  }

  if (
    input.flags.mutatesDocumentRoot ||
    (targetScope?.scopeType === "authenticated-production-route" &&
      targetScope.mutationTarget === "root-document")
  ) {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.rootMutationBlocked",
        message: "Root-level mutation is blocked for production route preview.",
        severity: "blocked",
      }),
    );
  }

  if (input.flags.touchesProductionBehavior) {
    reasons.push(
      createReason({
        code: "productionPreviewPreflight.productionBehaviorBlocked",
        message: "Production behavior changes are blocked for preview preflight.",
        severity: "blocked",
      }),
    );
  }

  const evidence = createEvidence({
    checksumMatches,
    diagnosticsCompleted,
    flags: input.flags,
    hasAuthenticatedSmoke: input.flags.hasAuthenticatedSmoke,
    hasBudgetChecksum,
    hasDiagnosticsChecksum,
    preflightVerdict: input.preflightVerdict,
    requiresAuthenticatedSmoke,
    residueCheck: input.residueCheck,
    targetScope,
    variableCount: input.variableCount,
    budgetVerdict: input.budgetVerdict,
  });

  return createSummary({
    allowedTargetScope: targetScope,
    evidence,
    reasons,
  });
}

function createSummary({
  allowedTargetScope,
  evidence,
  reasons,
}: {
  allowedTargetScope: ProductionPreviewTargetScope | null;
  evidence: ProductionPreviewRequiredEvidence[];
  reasons: ProductionPreviewPreflightReason[];
}): ProductionPreviewPreflightSummary {
  const blockers = reasons.filter(
    (reason): reason is ProductionPreviewBlocker =>
      reason.severity === "blocked",
  );
  const verdict: ProductionPreviewPreflightVerdict =
    blockers.length > 0
      ? "blocked"
      : reasons.some((reason) => reason.severity === "hold")
        ? "hold"
        : "eligible";

  return {
    allowedTargetScope: blockers.length > 0 ? null : allowedTargetScope,
    blockers,
    failClosed: verdict === "blocked",
    kind: "nexus-production-preview-preflight",
    nextAction: getNextAction(verdict),
    reasons,
    requiredEvidence: evidence,
    rollbackRequirements: createRollbackRequirements(),
    verdict,
    version: productionPreviewPreflightVersion,
  };
}

function createReason({
  code,
  message,
  severity,
}: ProductionPreviewPreflightReason): ProductionPreviewPreflightReason {
  return { code, message, severity };
}

function createEvidence({
  budgetVerdict,
  checksumMatches,
  diagnosticsCompleted,
  flags,
  hasAuthenticatedSmoke,
  hasBudgetChecksum,
  hasDiagnosticsChecksum,
  preflightVerdict,
  requiresAuthenticatedSmoke,
  residueCheck,
  targetScope,
  variableCount,
}: {
  budgetVerdict: StyleRuntimeBudgetVerdict;
  checksumMatches: boolean;
  diagnosticsCompleted: boolean;
  flags: ProductionPreviewSafetyFlags;
  hasAuthenticatedSmoke: boolean;
  hasBudgetChecksum: boolean;
  hasDiagnosticsChecksum: boolean;
  preflightVerdict: ProductionPreviewStyleLabGateVerdict;
  requiresAuthenticatedSmoke: boolean;
  residueCheck: ProductionPreviewResidueCheck;
  targetScope: ProductionPreviewTargetScope | null;
  variableCount: number;
}): ProductionPreviewRequiredEvidence[] {
  return [
    createEvidenceItem({
      detail: budgetVerdict,
      id: "budget-safe",
      label: "Budget safe",
      status: budgetVerdict === "block" ? "blocked" : budgetVerdict === "safe" ? "satisfied" : "missing",
    }),
    createEvidenceItem({
      detail: preflightVerdict,
      id: "style-lab-preflight-pass",
      label: "Style Lab preflight pass",
      status: preflightVerdict === "PASS" ? "satisfied" : preflightVerdict === "BLOCK" ? "blocked" : "missing",
    }),
    createEvidenceItem({
      detail: diagnosticsCompleted ? "completed" : "incomplete",
      id: "diagnostics-complete",
      label: "Diagnostics complete",
      status: diagnosticsCompleted ? "satisfied" : "missing",
    }),
    createEvidenceItem({
      detail: residueCheck,
      id: "residue-pass",
      label: "Residue pass",
      status: residueCheck === "fail" ? "blocked" : residueCheck === "pass" ? "satisfied" : "missing",
    }),
    createEvidenceItem({
      detail:
        hasBudgetChecksum && hasDiagnosticsChecksum
          ? checksumMatches
            ? "match"
            : "mismatch"
          : "missing",
      id: "checksum-match",
      label: "Checksum match",
      status:
        hasBudgetChecksum && hasDiagnosticsChecksum
          ? checksumMatches
            ? "satisfied"
            : "blocked"
          : "missing",
    }),
    createEvidenceItem({
      detail: String(variableCount),
      id: "variable-count",
      label: "Variable count",
      status: Number.isFinite(variableCount) && variableCount > 0 ? "satisfied" : "blocked",
    }),
    createEvidenceItem({
      detail: targetScope?.scopeType ?? "missing",
      id: "target-scope",
      label: "Target scope",
      status: targetScope ? "satisfied" : "blocked",
    }),
    createEvidenceItem({
      detail: flags.hasRollbackPlan ? "available" : "missing",
      id: "rollback-plan",
      label: "Rollback plan",
      status: flags.hasRollbackPlan ? "satisfied" : "missing",
    }),
    createEvidenceItem({
      detail: requiresAuthenticatedSmoke
        ? hasAuthenticatedSmoke
          ? "available"
          : "missing"
        : "not-required",
      id: "authenticated-smoke",
      label: "Authenticated smoke",
      status:
        requiresAuthenticatedSmoke && !hasAuthenticatedSmoke
          ? "missing"
          : "satisfied",
    }),
    createEvidenceItem({
      detail: hasUnsafeWrites(flags) ? "unsafe" : "clear",
      id: "no-unsafe-writes",
      label: "No unsafe writes",
      status: hasUnsafeWrites(flags) ? "blocked" : "satisfied",
    }),
  ];
}

function createEvidenceItem(
  item: ProductionPreviewRequiredEvidence,
): ProductionPreviewRequiredEvidence {
  return item;
}

function createMissingEvidence(): ProductionPreviewRequiredEvidence[] {
  return [
    createEvidenceItem({
      detail: "missing",
      id: "input",
      label: "Preflight input",
      status: "blocked",
    }),
  ];
}

function createRollbackRequirements(): ProductionPreviewRollbackRequirement[] {
  return [
    {
      id: "session-trace",
      label: "Record preview session id, checksum, and target scope before preview starts.",
      required: true,
    },
    {
      id: "revert-variable-map",
      label: "Revert must remove every applied bridge variable from the declared target scope.",
      required: true,
    },
    {
      id: "memory-only",
      label: "Preview state must remain memory-only and leave no persisted residue.",
      required: true,
    },
    {
      id: "fail-closed",
      label: "Preview must fail closed when evidence is missing or unsafe.",
      required: true,
    },
  ];
}

function normalizeTargetScope(
  targetScope: ProductionPreviewTargetScope | null | undefined,
): ProductionPreviewTargetScope | null {
  if (!targetScope || !hasText(targetScope.scopeId)) {
    return null;
  }

  if (!isAllowedScopeType(targetScope.scopeType)) {
    return null;
  }

  if (targetScope.persistence !== "none") {
    return targetScope;
  }

  if (!isAllowedMutationTarget(targetScope.mutationTarget)) {
    return null;
  }

  return targetScope;
}

function isAllowedScopeType(
  value: ProductionPreviewTargetScope["scopeType"],
): value is ProductionPreviewTargetScopeType {
  return allowedScopeTypes.includes(value as ProductionPreviewTargetScopeType);
}

function isAllowedMutationTarget(
  value: ProductionPreviewTargetScope["mutationTarget"],
): value is ProductionPreviewMutationTarget {
  return allowedMutationTargets.includes(value as ProductionPreviewMutationTarget);
}

function hasUnsafeWrites(flags: ProductionPreviewSafetyFlags) {
  return (
    flags.writesToBackend ||
    flags.writesToStorage ||
    flags.writesToStore ||
    flags.mutatesDocumentRoot ||
    flags.touchesProductionBehavior
  );
}

function hasText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function getNextAction(verdict: ProductionPreviewPreflightVerdict) {
  if (verdict === "eligible") {
    return "Proceed to the next non-persistent preview planning step.";
  }

  if (verdict === "hold") {
    return "Collect missing preflight evidence before preview planning continues.";
  }

  return "Resolve fail-closed blockers before any preview planning continues.";
}
