import type { WorkflowProRuntimeSummary } from "./capability-inventory";
import type { WorkflowProContractDraft } from "./workflow-contract";

export type WorkflowBrainContextPack = {
  contract: WorkflowProContractDraft;
  guardrails: {
    mayMutateGraph: false;
    mayReadRuntimeEvidence: true;
    mustReportMissingCapabilities: true;
    mustStayWithinCapabilityInventory: true;
  };
  missingCapabilities: string[];
  operatorQuestion: string;
  requiredOutput: {
    analysis: "markdown";
    missingCapabilities: "array";
    optimizedWorkflow: "nexus.workflow.v1 | null";
    questionsForSean: "array";
  };
  runtimeSummary: WorkflowProRuntimeSummary;
  schema: "nexus.workflowPro.brainContext.v1";
  systemBrief: string;
};

export function createWorkflowBrainContextPack({
  contract,
  operatorQuestion = "Review this workflow and explain what it does before proposing changes.",
  runtimeSummary,
}: {
  contract: WorkflowProContractDraft;
  operatorQuestion?: string;
  runtimeSummary: WorkflowProRuntimeSummary;
}): WorkflowBrainContextPack {
  return {
    contract,
    guardrails: {
      mayMutateGraph: false,
      mayReadRuntimeEvidence: true,
      mustReportMissingCapabilities: true,
      mustStayWithinCapabilityInventory: true,
    },
    missingCapabilities: contract.capabilityInventory.notAvailableYet,
    operatorQuestion,
    requiredOutput: {
      analysis: "markdown",
      missingCapabilities: "array",
      optimizedWorkflow: "nexus.workflow.v1 | null",
      questionsForSean: "array",
    },
    runtimeSummary,
    schema: "nexus.workflowPro.brainContext.v1",
    systemBrief: [
      "You are the NEXUS Workflow Brain.",
      "Read the whole nexus.workflow.v1 contract before answering.",
      "Explain intent, execution order, serial/parallel/fallback logic, node rationale, edge packet flow, limits, runtime evidence, and missing capabilities.",
      "Do not pretend unavailable capabilities exist.",
      "Do not mutate Graph directly; propose an optimized workflow draft only when the improvement is concrete.",
    ].join(" "),
  };
}
