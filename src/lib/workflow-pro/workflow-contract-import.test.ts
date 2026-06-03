import { describe, expect, it } from "vitest";

import { createWorkflowProCapabilityInventory } from "./capability-inventory";
import { parseWorkflowProContractImportText } from "./workflow-contract-import";
import { createWorkflowProContractDraftFromRuntimeLite } from "./workflow-contract";
import type { WorkflowRuntimeLiteState } from "@/lib/nexus-types";

const runtimeLite: WorkflowRuntimeLiteState = {
  edges: [],
  lastError: null,
  lastRunId: null,
  nodes: [
    {
      data: { label: "Input", text: "brief" },
      error: null,
      id: "input-1",
      inputSnapshot: null,
      outputSnapshot: null,
      position: { x: 0, y: 0 },
      status: "idle",
      type: "input.text",
    },
  ],
  runs: [],
  version: 1,
};

describe("Workflow Pro contract import", () => {
  it("accepts a valid exported nexus.workflow.v1 contract", () => {
    const contract = createWorkflowProContractDraftFromRuntimeLite({
      generatedAt: "2026-06-03T00:00:00.000Z",
      inventory: createWorkflowProCapabilityInventory(),
      runtimeLite,
      workspaceId: "workspace-test",
      workspaceName: "NEXUS TEST",
    });
    const review = parseWorkflowProContractImportText({
      receivedAt: "2026-06-03T00:00:01.000Z",
      sourceName: "workflow.json",
      text: JSON.stringify(contract),
    });

    expect(review.status).toBe("accepted");
    expect(review.contract?.schema).toBe("nexus.workflow.v1");
    expect(review.validation.ok).toBe(true);
  });

  it("accepts a wrapped contract payload", () => {
    const contract = createWorkflowProContractDraftFromRuntimeLite({
      inventory: createWorkflowProCapabilityInventory(),
      runtimeLite,
      workspaceId: "workspace-test",
      workspaceName: "NEXUS TEST",
    });
    const review = parseWorkflowProContractImportText({
      sourceName: "wrapped.json",
      text: JSON.stringify({ contract }),
    });

    expect(review.status).toBe("accepted");
    expect(review.contract?.id).toBe(contract.id);
  });

  it("rejects invalid JSON without throwing", () => {
    const review = parseWorkflowProContractImportText({
      sourceName: "broken.json",
      text: "{not json",
    });

    expect(review.status).toBe("rejected");
    expect(review.contract).toBeNull();
    expect(review.error).toContain("Expected property name");
  });
});
