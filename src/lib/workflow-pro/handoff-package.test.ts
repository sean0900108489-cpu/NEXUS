import { describe, expect, it } from "vitest";

import {
  createWorkflowProCapabilityInventory,
  summarizeWorkflowProRuntime,
} from "./capability-inventory";
import { createWorkflowBrainContextPack } from "./brain-context";
import { createWorkflowProHandoffPackage } from "./handoff-package";
import { parseWorkflowProContractImportText } from "./workflow-contract-import";
import { createWorkflowProContractDraftFromRuntimeLite } from "./workflow-contract";

describe("Workflow Pro handoff package", () => {
  it("packages contract, runtime summary, capabilities, and brain guardrails", () => {
    const runtimeSummary = summarizeWorkflowProRuntime(undefined);
    const contract = createWorkflowProContractDraftFromRuntimeLite({
      generatedAt: "2026-06-04T00:00:00.000Z",
      inventory: createWorkflowProCapabilityInventory(),
      runtimeLite: undefined,
      workspaceId: "workspace-test",
      workspaceName: "NEXUS TEST",
    });
    const brainContext = createWorkflowBrainContextPack({
      contract,
      operatorQuestion: "Optimize this workflow without inventing unavailable nodes.",
      runtimeSummary,
    });
    const handoff = createWorkflowProHandoffPackage({
      brainContext,
      contract,
      createdAt: "2026-06-04T00:00:01.000Z",
      runtimeSummary,
      sourceKind: "current-runtime-draft",
      sourceName: "nexus-workflow-pro-handoff.json",
    });

    expect(handoff.schema).toBe("nexus.workflowPro.handoffPackage.v1");
    expect(handoff.contract.schema).toBe("nexus.workflow.v1");
    expect(handoff.capabilityInventory.schema).toBe(
      "nexus.workflowPro.capabilityInventory.v1",
    );
    expect(handoff.brainHandoff.schema).toBe("nexus.workflowPro.brainHandoff.v1");
    expect(handoff.brainHandoff.guardrails).toEqual(brainContext.guardrails);
    expect(handoff.brainHandoff.readingOrder).toContain(
      "Read edges and packet contracts to infer serial, parallel, branch, and fallback behavior.",
    );
    expect(handoff.brainHandoff.responseChecklist).toContain(
      "Never claim Graph was changed; Graph mutation requires explicit operator Apply Preview.",
    );
    expect(handoff.brainHandoff.requiredOutput.optimizedWorkflow).toBe(
      "nexus.workflow.v1 | null",
    );
    expect(handoff.runtimeSummary).toEqual(runtimeSummary);
    expect(handoff.validation).toMatchObject({
      errorCount: 0,
      ok: true,
    });
  });

  it("stays compatible with the existing Workflow Pro import parser", () => {
    const runtimeSummary = summarizeWorkflowProRuntime(undefined);
    const contract = createWorkflowProContractDraftFromRuntimeLite({
      inventory: createWorkflowProCapabilityInventory(),
      runtimeLite: undefined,
      workspaceId: "workspace-test",
      workspaceName: "NEXUS TEST",
    });
    const brainContext = createWorkflowBrainContextPack({
      contract,
      runtimeSummary,
    });
    const handoff = createWorkflowProHandoffPackage({
      brainContext,
      contract,
      runtimeSummary,
      sourceKind: "imported-contract",
      sourceName: "handoff.json",
    });
    const review = parseWorkflowProContractImportText({
      sourceName: "handoff.json",
      text: JSON.stringify(handoff),
    });

    expect(review.status).toBe("accepted");
    expect(review.contract?.id).toBe(contract.id);
  });
});
