import { describe, expect, it } from "vitest";

import {
  createWorkflowProCapabilityInventory,
  summarizeWorkflowProRuntime,
} from "./capability-inventory";
import { createWorkflowBrainContextPack } from "./brain-context";
import { createWorkflowProContractDraftFromRuntimeLite } from "./workflow-contract";

describe("Workflow Brain context pack", () => {
  it("packages the contract, runtime summary, and guardrails for a future LLM", () => {
    const runtimeSummary = summarizeWorkflowProRuntime(undefined);
    const contract = createWorkflowProContractDraftFromRuntimeLite({
      generatedAt: "2026-06-03T00:00:00.000Z",
      inventory: createWorkflowProCapabilityInventory(),
      runtimeLite: undefined,
      workspaceId: "workspace-test",
      workspaceName: "NEXUS TEST",
    });

    const context = createWorkflowBrainContextPack({
      contract,
      operatorQuestion: "Can this workflow generate a storyboard?",
      runtimeSummary,
    });

    expect(context.schema).toBe("nexus.workflowPro.brainContext.v1");
    expect(context.contract.schema).toBe("nexus.workflow.v1");
    expect(context.operatorQuestion).toBe("Can this workflow generate a storyboard?");
    expect(context.guardrails).toEqual({
      mayMutateGraph: false,
      mayReadRuntimeEvidence: true,
      mustReportMissingCapabilities: true,
      mustStayWithinCapabilityInventory: true,
    });
    expect(context.contract.capabilityInventory.nodeTypes.map((node) => node.type)).toContain(
      "node.file",
    );
    expect(context.missingCapabilities).toContain("node.condition.ifElse");
    expect(context.requiredOutput.optimizedWorkflow).toBe("nexus.workflow.v1 | null");
    expect(context.systemBrief).toContain("Do not mutate Graph directly");
  });
});
