import type {
  WorkflowRuntimeLiteState,
  WorkflowRuntimeNodeData,
} from "@/lib/nexus-types";
import { WORKFLOW_RUNTIME_LITE_VERSION } from "@/lib/workflow-runtime-lite/constants";
import { normalizeWorkflowRuntimeLiteState } from "@/lib/workflow-runtime-lite/state";

import type { WorkflowProContractDraft } from "./workflow-contract";
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
    candidateRuntimeLite = createRuntimeLiteCandidate(contract);

    if (candidateRuntimeLite.nodes.length !== contract.nodes.length) {
      reasons.push("Runtime Lite normalization dropped one or more contract nodes.");
    }

    if (candidateRuntimeLite.edges.length !== contract.edges.length) {
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

function createRuntimeLiteCandidate(
  contract: WorkflowProContractDraft,
): WorkflowRuntimeLiteState {
  return normalizeWorkflowRuntimeLiteState({
    edges: contract.edges.map((edge) => ({
      animated: true,
      id: edge.id,
      label: edge.mode === "always" ? undefined : edge.mode,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
    })),
    lastError: null,
    lastRunId: null,
    nodes: contract.nodes.map((node) => ({
      data: node.data as WorkflowRuntimeNodeData,
      error: null,
      id: node.id,
      inputSnapshot: null,
      outputSnapshot: null,
      position: node.position,
      status: "idle",
      type: node.type,
    })),
    runs: [],
    version: WORKFLOW_RUNTIME_LITE_VERSION,
  });
}
