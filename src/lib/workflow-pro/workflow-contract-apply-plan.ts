import type { WorkflowRuntimeLiteState } from "@/lib/nexus-types";

import type { WorkflowProContractDraft } from "./workflow-contract";
import { createWorkflowProRuntimeBridge } from "./runtime-bridge";
import {
  validateWorkflowProContractDraft,
  type WorkflowProContractValidationResult,
} from "./workflow-contract-validator";

export type WorkflowProApplyOperation = {
  action: "replace-runtime-lite-preview";
  description: string;
  edgeDelta: number;
  id: string;
  nodeDelta: number;
};

export type WorkflowProApplyPlan = {
  candidateRuntimeLite: WorkflowRuntimeLiteState | null;
  createdAt: string;
  operations: WorkflowProApplyOperation[];
  reasons: string[];
  safety: {
    mutatesGraphNow: false;
    requiresExplicitOperatorApply: true;
    sourceSchema: "nexus.workflow.v1";
  };
  schema: "nexus.workflowPro.applyPlan.v1";
  status: "blocked" | "ready";
  validation: WorkflowProContractValidationResult;
};

export function createWorkflowProApplyPlan({
  contract,
  createdAt = new Date().toISOString(),
  currentRuntimeLite,
}: {
  contract: WorkflowProContractDraft;
  createdAt?: string;
  currentRuntimeLite: WorkflowRuntimeLiteState | undefined;
}): WorkflowProApplyPlan {
  const validation = validateWorkflowProContractDraft(contract);
  const reasons: string[] = [];
  let candidateRuntimeLite: WorkflowRuntimeLiteState | null = null;

  if (!validation.ok) {
    reasons.push("Contract validation failed; apply preview is blocked.");
  } else {
    const bridge = createWorkflowProRuntimeBridge(contract);
    candidateRuntimeLite = bridge.runtimeLite;

    if (bridge.droppedNodes) {
      reasons.push("Runtime Lite normalization dropped one or more contract nodes.");
    }

    if (bridge.droppedEdges) {
      reasons.push("Runtime Lite normalization dropped one or more contract edges.");
    }
  }

  const status = reasons.length ? "blocked" : "ready";
  const currentNodeCount = currentRuntimeLite?.nodes.length ?? 0;
  const currentEdgeCount = currentRuntimeLite?.edges.length ?? 0;
  const candidateNodeCount = candidateRuntimeLite?.nodes.length ?? 0;
  const candidateEdgeCount = candidateRuntimeLite?.edges.length ?? 0;

  return {
    candidateRuntimeLite,
    createdAt,
    operations:
      status === "ready"
        ? [
            {
              action: "replace-runtime-lite-preview",
              description:
                "Preview replacing the current Runtime Lite graph with the validated nexus.workflow.v1 contract. No graph mutation happens in this plan.",
              edgeDelta: candidateEdgeCount - currentEdgeCount,
              id: "replace-runtime-lite-preview",
              nodeDelta: candidateNodeCount - currentNodeCount,
            },
          ]
        : [],
    reasons,
    safety: {
      mutatesGraphNow: false,
      requiresExplicitOperatorApply: true,
      sourceSchema: "nexus.workflow.v1",
    },
    schema: "nexus.workflowPro.applyPlan.v1",
    status,
    validation,
  };
}
