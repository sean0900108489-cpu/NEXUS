import type {
  WorkflowProCapabilityInventory,
  WorkflowProRuntimeSummary,
} from "./capability-inventory";
import type { WorkflowBrainContextPack } from "./brain-context";
import {
  createWorkflowProBrainHandoff,
  type WorkflowProBrainHandoff,
} from "./brain-handoff";
import type { WorkflowProContractDraft } from "./workflow-contract";
import { validateWorkflowProContractDraft } from "./workflow-contract-validator";

export type WorkflowProHandoffPackage = {
  brainHandoff: WorkflowProBrainHandoff;
  capabilityInventory: WorkflowProCapabilityInventory;
  contract: WorkflowProContractDraft;
  createdAt: string;
  importBack: {
    acceptedShapes: string[];
    optimizedWorkflowPath: "brainHandoff.requiredOutput.optimizedWorkflow";
    targetSchema: "nexus.workflow.v1";
  };
  runtimeSummary: WorkflowProRuntimeSummary;
  schema: "nexus.workflowPro.handoffPackage.v1";
  source: {
    contractId: string;
    sourceKind: "current-runtime-draft" | "imported-contract";
    sourceName: string;
    workspaceId: string;
  };
  validation: {
    errorCount: number;
    ok: boolean;
    warningCount: number;
  };
};

export function createWorkflowProHandoffPackage({
  brainContext,
  contract,
  createdAt = new Date().toISOString(),
  runtimeSummary,
  sourceKind,
  sourceName,
}: {
  brainContext: WorkflowBrainContextPack;
  contract: WorkflowProContractDraft;
  createdAt?: string;
  runtimeSummary: WorkflowProRuntimeSummary;
  sourceKind: WorkflowProHandoffPackage["source"]["sourceKind"];
  sourceName: string;
}): WorkflowProHandoffPackage {
  const validation = validateWorkflowProContractDraft(contract);

  return {
    brainHandoff: createWorkflowProBrainHandoff({ brainContext }),
    capabilityInventory: contract.capabilityInventory,
    contract,
    createdAt,
    importBack: {
      acceptedShapes: [
        "Raw nexus.workflow.v1 JSON contract.",
        "Wrapped object with a top-level contract property containing nexus.workflow.v1.",
        "nexus.workflowPro.handoffPackage.v1 because it also exposes the contract property.",
      ],
      optimizedWorkflowPath: "brainHandoff.requiredOutput.optimizedWorkflow",
      targetSchema: "nexus.workflow.v1",
    },
    runtimeSummary,
    schema: "nexus.workflowPro.handoffPackage.v1",
    source: {
      contractId: contract.id,
      sourceKind,
      sourceName,
      workspaceId: contract.metadata.workspaceId,
    },
    validation: {
      errorCount: validation.errors.length,
      ok: validation.ok,
      warningCount: validation.warnings.length,
    },
  };
}
