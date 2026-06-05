import type { WorkflowBrainContextPack } from "./brain-context";

export type WorkflowProBrainHandoff = {
  guardrails: WorkflowBrainContextPack["guardrails"];
  operatorQuestion: string;
  optimizationRules: string[];
  readingOrder: string[];
  requiredOutput: WorkflowBrainContextPack["requiredOutput"];
  responseChecklist: string[];
  schema: "nexus.workflowPro.brainHandoff.v1";
  systemBrief: string;
};

export function createWorkflowProBrainHandoff({
  brainContext,
}: {
  brainContext: WorkflowBrainContextPack;
}): WorkflowProBrainHandoff {
  return {
    guardrails: brainContext.guardrails,
    operatorQuestion: brainContext.operatorQuestion,
    optimizationRules: [
      "Only propose workflow changes that fit the provided capability inventory.",
      "When a missing capability would improve the workflow, report it as a development requirement instead of pretending it exists.",
      "Prefer small, explainable workflow edits over opaque rewrites unless the current topology is structurally wrong.",
      "Keep generated media, file artifacts, and compiler boundaries addressable through explicit artifact references.",
      "Return an optimized nexus.workflow.v1 draft only when the proposal is concrete enough to preview through Apply Plan.",
    ],
    readingOrder: [
      "Read contract.metadata for intent, workspace identity, success criteria, and version.",
      "Read capabilityInventory before suggesting nodes, compilers, models, or artifact policies.",
      "Read nodes and data blocks to understand model roles, prompts, file compiler boundaries, image settings, and output expectations.",
      "Read edges and packet contracts to infer serial, parallel, branch, and fallback behavior.",
      "Read runtimeSummary and missingCapabilities to separate proven behavior from planned work.",
      "Read guardrails and requiredOutput before answering Sean or returning an optimized workflow.",
    ],
    requiredOutput: brainContext.requiredOutput,
    responseChecklist: [
      "Explain what the workflow currently does in plain language.",
      "Describe execution order, including serial and parallel paths.",
      "Call out weak nodes, fragile edges, missing capabilities, and backend risks.",
      "Ask targeted questions only when the contract lacks enough information.",
      "If proposing an optimized workflow, include why each changed node or edge exists.",
      "Never claim Graph was changed; Graph mutation requires explicit operator Apply Preview.",
    ],
    schema: "nexus.workflowPro.brainHandoff.v1",
    systemBrief: brainContext.systemBrief,
  };
}
