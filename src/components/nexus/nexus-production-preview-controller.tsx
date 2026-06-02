"use client";

import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import {
  createSurfaceStyleOpsProductionAliasCoverageReportV1,
} from "@/lib/style-engine/v2-production-alias-coverage";
import {
  createProductionPreviewPreflight,
} from "@/lib/style-engine/v2-production-preview-preflight";
import {
  createProductionPreviewApplyPlan,
  createProductionPreviewResidueCheck,
  createProductionPreviewRevertPlan,
  NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR,
  type ProductionPreviewApplyTransaction,
  type ProductionPreviewInlineValueSnapshot,
  type ProductionPreviewTargetFacts,
} from "@/lib/style-engine/v2-production-preview-transaction";
import {
  createNexusProductionTokenBridgePlanV1,
} from "@/lib/style-engine/v2-production-token-bridge";
import { createSurfaceStyleOpsSkinPackV2Fixture } from "@/lib/style-engine/v2-fixtures";
import { compileNexusSkinPackRenderPlanV2 } from "@/lib/style-engine/v2-render-plan";
import {
  createStyleRuntimeBudgetSummaryFromRenderPlan,
} from "@/lib/style-engine/v2-style-runtime-budget";

type NexusProductionPreviewControllerStatus =
  | "idle"
  | "applied"
  | "reverted"
  | "failed";

type NexusProductionPreviewControllerState = {
  applyDurationMs: number | null;
  bridgeChecksum: string;
  budgetChecksum: string;
  error: string | null;
  preflightVerdict: string;
  remainingPreviewVariableCount: number | null;
  residueCheck: "not-run" | "pass" | "fail";
  revertDurationMs: number | null;
  sessionId: string;
  status: NexusProductionPreviewControllerStatus;
  targetCount: number | null;
  targetScope: typeof NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR;
  transactionId: string;
  variableCount: number;
};

type NexusProductionPreviewReadiness =
  | {
      accepted: true;
      bridgeChecksum: string;
      budgetChecksum: string;
      preflightVerdict: "eligible" | "hold" | "blocked";
      variables: Record<string, string>;
    }
  | {
      accepted: false;
      reason: string;
    };

type NexusProductionPreviewControllerProps = {
  enabled?: boolean;
};

const productionPreviewNetworkBaselineWindowId =
  "authenticated-route-load-baseline:004cb27";

const productionPreviewControllerStyle: CSSProperties = {
  alignItems: "center",
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(148, 163, 184, 0.36)",
  color: "rgb(226, 232, 240)",
  display: "flex",
  gap: 6,
  height: 36,
  insetBlockEnd: 0,
  insetInlineStart: 0,
  padding: 4,
  pointerEvents: "auto",
  position: "fixed",
  width: 280,
  zIndex: 90,
};

const productionPreviewButtonStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.42)",
  fontSize: 10,
  height: 24,
  padding: "0 8px",
};

const initialControllerState: NexusProductionPreviewControllerState = {
  applyDurationMs: null,
  bridgeChecksum: "",
  budgetChecksum: "",
  error: null,
  preflightVerdict: "unknown",
  remainingPreviewVariableCount: null,
  residueCheck: "not-run",
  revertDurationMs: null,
  sessionId: "",
  status: "idle",
  targetCount: null,
  targetScope: NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR,
  transactionId: "",
  variableCount: 0,
};

export function NexusProductionPreviewController({
  enabled = false,
}: NexusProductionPreviewControllerProps) {
  const readiness = useMemo(
    () =>
      enabled
        ? createSurfaceStyleProductionPreviewReadiness()
        : {
            accepted: false as const,
            reason: "Production preview first cut is disabled.",
          },
    [enabled],
  );
  const activeTransactionRef = useRef<ProductionPreviewApplyTransaction | null>(
    null,
  );
  const [state, setState] =
    useState<NexusProductionPreviewControllerState>(initialControllerState);

  function handleApplyPreview() {
    if (!readiness.accepted) {
      setState(createFailedState({ error: readiness.reason }));
      return;
    }

    const targets = getProductionPreviewTargets();
    const target = targets[0] ?? null;
    const targetFacts = createTargetFacts(targets, target);
    const variableNames = Object.keys(readiness.variables);
    const transactionId = createPreviewId("transaction");
    const sessionId = createPreviewId("session");
    const startedAt = getNow();
    const plan = createProductionPreviewApplyPlan({
      checksums: {
        bridgeChecksum: readiness.bridgeChecksum,
        budgetChecksum: readiness.budgetChecksum,
        diagnosticsChecksum: readiness.budgetChecksum,
      },
      createdAt: new Date().toISOString(),
      hasAuthenticatedEvidence: true,
      hasRollbackPlan: true,
      networkBaselineWindowId: productionPreviewNetworkBaselineWindowId,
      preflightVerdict: readiness.preflightVerdict,
      previousInlineValues: target
        ? snapshotInlineValues(target, variableNames)
        : {},
      safetyFlags: {
        mutatesDocumentRoot: false,
        touchesProductionBehavior: false,
        writesToBackend: false,
        writesToStorage: false,
        writesToStore: false,
      },
      sessionId,
      target: targetFacts,
      transactionId,
      variables: readiness.variables,
    });

    if (!target || plan.verdict !== "ready" || !plan.transaction) {
      setState(
        createFailedState({
          bridgeChecksum: readiness.bridgeChecksum,
          budgetChecksum: readiness.budgetChecksum,
          error: createReasonText(plan.reasons),
          preflightVerdict: readiness.preflightVerdict,
          sessionId,
          targetCount: targets.length,
          transactionId,
          variableCount: variableNames.length,
        }),
      );
      return;
    }

    for (const [name, value] of Object.entries(plan.transaction.appliedVariables)) {
      target.style.setProperty(name, value);
    }

    activeTransactionRef.current = plan.transaction;
    setState({
      applyDurationMs: roundDuration(getNow() - startedAt),
      bridgeChecksum: readiness.bridgeChecksum,
      budgetChecksum: readiness.budgetChecksum,
      error: null,
      preflightVerdict: readiness.preflightVerdict,
      remainingPreviewVariableCount: null,
      residueCheck: "not-run",
      revertDurationMs: null,
      sessionId,
      status: "applied",
      targetCount: targets.length,
      targetScope: NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR,
      transactionId,
      variableCount: variableNames.length,
    });
  }

  function handleRevertPreview() {
    const transaction = activeTransactionRef.current;
    const targets = getProductionPreviewTargets();
    const target = targets[0] ?? null;
    const targetFacts = createTargetFacts(targets, target);
    const startedAt = getNow();
    const revertPlan = createProductionPreviewRevertPlan({
      expectedBridgeChecksum: transaction?.checksums.bridgeChecksum,
      expectedSessionId: transaction?.sessionId,
      target: targetFacts,
      transaction,
    });

    if (!target || revertPlan.verdict !== "ready" || !transaction) {
      setState((current) =>
        createFailedState({
          bridgeChecksum: current.bridgeChecksum,
          budgetChecksum: current.budgetChecksum,
          error: createReasonText(revertPlan.reasons),
          preflightVerdict: current.preflightVerdict,
          sessionId: current.sessionId,
          targetCount: targets.length,
          transactionId: current.transactionId,
          variableCount: current.variableCount,
        }),
      );
      return;
    }

    for (const operation of revertPlan.operations) {
      if (operation.kind === "remove") {
        target.style.removeProperty(operation.name);
      } else {
        target.style.setProperty(operation.name, operation.value);
      }
    }

    const residue = createProductionPreviewResidueCheck({
      currentInlineValues: snapshotInlineValues(target, transaction.variableNames),
      transaction,
    });
    const revertDurationMs = roundDuration(getNow() - startedAt);

    if (residue.result === "pass") {
      activeTransactionRef.current = null;
    }

    setState({
      applyDurationMs: state.applyDurationMs,
      bridgeChecksum: transaction.checksums.bridgeChecksum,
      budgetChecksum: transaction.checksums.budgetChecksum,
      error:
        residue.result === "pass"
          ? null
          : `Residue check failed for ${residue.mismatchedVariableNames.length} variables.`,
      preflightVerdict: "eligible",
      remainingPreviewVariableCount: residue.remainingPreviewVariableCount,
      residueCheck: residue.result,
      revertDurationMs,
      sessionId: transaction.sessionId,
      status: residue.result === "pass" ? "reverted" : "failed",
      targetCount: targets.length,
      targetScope: NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR,
      transactionId: transaction.transactionId,
      variableCount: transaction.variableCount,
    });
  }

  if (!enabled) {
    return null;
  }

  return (
    <section
      data-nexus-production-preview-controller="first-cut"
      data-nexus-production-preview-target={
        NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR
      }
      style={productionPreviewControllerStyle}
    >
      <span data-nexus-production-preview-label="temporary">
        Preview test
      </span>
      <button
        type="button"
        data-nexus-production-preview-action="apply"
        onClick={handleApplyPreview}
        style={productionPreviewButtonStyle}
      >
        Apply
      </button>
      <button
        type="button"
        data-nexus-production-preview-action="revert"
        onClick={handleRevertPreview}
        style={productionPreviewButtonStyle}
      >
        Revert
      </button>
      <output
        data-nexus-production-preview-status={state.status}
        data-nexus-production-preview-residue={state.residueCheck}
        data-nexus-production-preview-variable-count={state.variableCount}
        data-nexus-production-preview-session-id={state.sessionId}
      >
        {JSON.stringify(state)}
      </output>
    </section>
  );
}

function createSurfaceStyleProductionPreviewReadiness(): NexusProductionPreviewReadiness {
  const renderPlanResult = compileNexusSkinPackRenderPlanV2(
    createSurfaceStyleOpsSkinPackV2Fixture(),
  );

  if (!renderPlanResult.accepted) {
    return {
      accepted: false,
      reason: "Surface Style Render Plan was rejected.",
    };
  }

  const bridgeResult = createNexusProductionTokenBridgePlanV1(
    renderPlanResult.renderPlan,
  );

  if (!bridgeResult.accepted) {
    return {
      accepted: false,
      reason: "Surface Style production bridge was rejected.",
    };
  }

  const budgetSummary = createStyleRuntimeBudgetSummaryFromRenderPlan(
    renderPlanResult.renderPlan,
    {
      bridgePlan: bridgeResult.bridgePlan,
      coverage: createSurfaceStyleOpsProductionAliasCoverageReportV1(),
    },
  );
  const preflight = createProductionPreviewPreflight({
    budgetChecksum: budgetSummary.checksum,
    budgetVerdict: budgetSummary.verdict,
    diagnosticsChecksum: budgetSummary.checksum,
    diagnosticsStatus: "completed",
    flags: {
      hasAuthenticatedSmoke: true,
      hasRollbackPlan: true,
      mutatesDocumentRoot: false,
      touchesProductionBehavior: false,
      writesToBackend: false,
      writesToStorage: false,
      writesToStore: false,
    },
    preflightVerdict: budgetSummary.verdict === "safe" ? "PASS" : "HOLD",
    productionApplyMode: "non-persistent-preview",
    residueCheck: "pass",
    targetScope: {
      mutationTarget: "production-route-container",
      persistence: "none",
      requiresAuthSmoke: true,
      scopeId: "nexus-outer-shell-frame",
      scopeType: "authenticated-production-route",
    },
    unsupportedCriticalGapCount: 0,
    variableCount: Object.keys(bridgeResult.bridgePlan.variables).length,
  });

  return {
    accepted: true,
    bridgeChecksum: bridgeResult.bridgePlan.checksums.variables,
    budgetChecksum: budgetSummary.checksum,
    preflightVerdict: preflight.verdict,
    variables: bridgeResult.bridgePlan.variables,
  };
}

function getProductionPreviewTargets() {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR,
    ),
  );
}

function createTargetFacts(
  targets: HTMLElement[],
  target: HTMLElement | null,
): ProductionPreviewTargetFacts {
  const tagName = target?.tagName.toLowerCase() ?? "";
  const rect = target?.getBoundingClientRect();

  return {
    classList: target ? Array.from(target.classList) : [],
    isBodyElement: tagName === "body",
    isDocumentRoot: false,
    isHtmlElement: tagName === "html",
    selector: NEXUS_PRODUCTION_PREVIEW_FIRST_CUT_TARGET_SELECTOR,
    tagName,
    targetCount: targets.length,
    visible: rect ? rect.width > 0 && rect.height > 0 : false,
  };
}

function snapshotInlineValues(
  target: HTMLElement,
  variableNames: string[],
): ProductionPreviewInlineValueSnapshot {
  return Object.fromEntries(
    variableNames.map((name) => {
      const value = target.style.getPropertyValue(name);

      return [name, value.length > 0 ? value : undefined];
    }),
  );
}

function createPreviewId(kind: "session" | "transaction") {
  return `nexus-production-preview:${kind}:${Date.now().toString(36)}`;
}

function getNow() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function roundDuration(value: number) {
  return Math.round(value * 100) / 100;
}

function createReasonText(reasons: { message: string }[]) {
  return reasons[0]?.message ?? "Production preview failed closed.";
}

function createFailedState(
  input: Partial<NexusProductionPreviewControllerState> & { error: string },
): NexusProductionPreviewControllerState {
  return {
    ...initialControllerState,
    ...input,
    residueCheck: "fail",
    status: "failed",
  };
}
