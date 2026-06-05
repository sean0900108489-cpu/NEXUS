import type {
  WorkflowRuntimeLiteState,
  WorkflowRuntimeNodeData,
} from "@/lib/nexus-types";
import { WORKFLOW_RUNTIME_LITE_VERSION } from "@/lib/workflow-runtime-lite/constants";
import { normalizeWorkflowRuntimeLiteState } from "@/lib/workflow-runtime-lite/state";

import type { WorkflowProContractDraft } from "./workflow-contract";

export type WorkflowProRuntimeBridgeResult = {
  droppedEdges: number;
  droppedNodes: number;
  runtimeLite: WorkflowRuntimeLiteState;
  source: {
    contractId: string;
    edgeCount: number;
    nodeCount: number;
    schema: "nexus.workflow.v1";
  };
};

export function createWorkflowRuntimeLiteStateFromContract(
  contract: WorkflowProContractDraft,
): WorkflowRuntimeLiteState {
  return createWorkflowProRuntimeBridge(contract).runtimeLite;
}

export function createWorkflowProRuntimeBridge(
  contract: WorkflowProContractDraft,
): WorkflowProRuntimeBridgeResult {
  const runtimeLite = normalizeWorkflowRuntimeLiteState({
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

  return {
    droppedEdges: contract.edges.length - runtimeLite.edges.length,
    droppedNodes: contract.nodes.length - runtimeLite.nodes.length,
    runtimeLite,
    source: {
      contractId: contract.id,
      edgeCount: contract.edges.length,
      nodeCount: contract.nodes.length,
      schema: contract.schema,
    },
  };
}
