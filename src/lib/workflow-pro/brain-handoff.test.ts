import { describe, expect, it } from "vitest";

import {
  createWorkflowProCapabilityInventory,
  summarizeWorkflowProRuntime,
} from "./capability-inventory";
import { createWorkflowBrainContextPack } from "./brain-context";
import { createWorkflowProBrainHandoff } from "./brain-handoff";
import { createWorkflowProContractDraftFromRuntimeLite } from "./workflow-contract";

describe("Workflow Pro brain handoff protocol", () => {
  it("turns a brain context pack into an explicit LLM handoff protocol", () => {
    const runtimeSummary = summarizeWorkflowProRuntime(undefined);
    const contract = createWorkflowProContractDraftFromRuntimeLite({
      inventory: createWorkflowProCapabilityInventory(),
      runtimeLite: undefined,
      workspaceId: "workspace-test",
      workspaceName: "NEXUS TEST",
    });
    const brainContext = createWorkflowBrainContextPack({
      contract,
      operatorQuestion: "How should this workflow improve?",
      runtimeSummary,
    });
    const handoff = createWorkflowProBrainHandoff({ brainContext });

    expect(handoff.schema).toBe("nexus.workflowPro.brainHandoff.v1");
    expect(handoff.operatorQuestion).toBe("How should this workflow improve?");
    expect(handoff.guardrails).toEqual(brainContext.guardrails);
    expect(handoff.requiredOutput.optimizedWorkflow).toBe(
      "nexus.workflow.v1 | null",
    );
    expect(handoff.readingOrder).toContain(
      "Read capabilityInventory before suggesting nodes, compilers, models, or artifact policies.",
    );
    expect(handoff.optimizationRules).toContain(
      "Only propose workflow changes that fit the provided capability inventory.",
    );
    expect(handoff.responseChecklist).toContain(
      "Describe execution order, including serial and parallel paths.",
    );
  });
});
