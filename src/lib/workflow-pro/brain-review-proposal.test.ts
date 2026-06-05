import { describe, expect, it } from "vitest";

import {
  createWorkflowProCapabilityInventory,
  summarizeWorkflowProRuntime,
} from "./capability-inventory";
import { createWorkflowBrainContextPack } from "./brain-context";
import { createWorkflowProBrainHandoff } from "./brain-handoff";
import {
  parseWorkflowProBrainReviewProposalText,
  validateWorkflowProBrainReviewProposal,
} from "./brain-review-proposal";
import { createWorkflowProContractDraftFromRuntimeLite } from "./workflow-contract";

describe("Workflow Pro brain review proposal validator", () => {
  it("accepts a textual analysis proposal without an optimized workflow", () => {
    const proposal = {
      analysis: "The workflow is a linear prompt enhancement path.",
      missingCapabilities: ["node.condition.ifElse"],
      optimizedWorkflow: null,
      questionsForSean: ["Should image branches share a seed?"],
      schema: "nexus.workflowPro.brainReviewProposal.v1",
      source: {
        createdAt: "2026-06-04T00:00:00.000Z",
        model: "gpt-5.5",
      },
    };
    const validation = validateWorkflowProBrainReviewProposal(proposal);

    expect(validation.ok).toBe(true);
    expect(validation.proposal?.optimizedWorkflow).toBeNull();
  });

  it("accepts a proposal that includes a valid optimized nexus.workflow.v1 draft", () => {
    const runtimeSummary = summarizeWorkflowProRuntime(undefined);
    const contract = createWorkflowProContractDraftFromRuntimeLite({
      inventory: createWorkflowProCapabilityInventory(),
      runtimeLite: undefined,
      workspaceId: "workspace-test",
      workspaceName: "NEXUS TEST",
    });
    const handoff = createWorkflowProBrainHandoff({
      brainContext: createWorkflowBrainContextPack({
        contract,
        runtimeSummary,
      }),
    });
    const validation = validateWorkflowProBrainReviewProposal({
      analysis: "The workflow is valid; keep the same topology for now.",
      missingCapabilities: [],
      optimizedWorkflow: contract,
      questionsForSean: [],
      schema: "nexus.workflowPro.brainReviewProposal.v1",
    });

    expect(handoff.requiredOutput.optimizedWorkflow).toBe(
      "nexus.workflow.v1 | null",
    );
    expect(validation.ok).toBe(true);
    expect(validation.proposal?.optimizedWorkflow?.schema).toBe("nexus.workflow.v1");
  });

  it("rejects malformed proposal JSON before it can affect apply preview", () => {
    const validation = parseWorkflowProBrainReviewProposalText({
      text: "{not-json",
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors[0]?.path).toBe("$");
  });

  it("rejects invalid optimized workflow drafts", () => {
    const validation = validateWorkflowProBrainReviewProposal({
      analysis: "Use this optimized workflow.",
      missingCapabilities: [],
      optimizedWorkflow: {
        schema: "nexus.workflow.v1",
      },
      questionsForSean: [],
      schema: "nexus.workflowPro.brainReviewProposal.v1",
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.some((error) => error.path.startsWith("$.optimizedWorkflow."))).toBe(
      true,
    );
  });
});
