import { describe, expect, it } from "vitest";

import { createWorkflowProCapabilityInventory } from "./capability-inventory";
import { createWorkflowProApplyPlan } from "./workflow-contract-apply-plan";
import { createWorkflowProContractDraftFromRuntimeLite } from "./workflow-contract";
import type { WorkflowRuntimeLiteState } from "@/lib/nexus-types";

const runtimeLite: WorkflowRuntimeLiteState = {
  edges: [
    {
      id: "edge-input-file",
      source: "input-1",
      sourceHandle: "output",
      target: "file-1",
      targetHandle: "input",
    },
  ],
  lastError: null,
  lastRunId: null,
  nodes: [
    {
      data: { label: "Input", text: "strategy brief" },
      error: null,
      id: "input-1",
      inputSnapshot: null,
      outputSnapshot: null,
      position: { x: 0, y: 0 },
      status: "idle",
      type: "input.text",
    },
    {
      data: {
        attachments: [],
        compilerId: "nexus-attachment-noop-compiler-v1",
        compilerVersion: "v1",
        label: "File Node",
        note: "carry source files",
      },
      error: null,
      id: "file-1",
      inputSnapshot: null,
      outputSnapshot: null,
      position: { x: 240, y: 0 },
      status: "idle",
      type: "node.file",
    },
  ],
  runs: [],
  version: 1,
};

describe("Workflow Pro apply plan", () => {
  it("creates a non-mutating Runtime Lite replacement preview from a valid contract", () => {
    const draft = createWorkflowProContractDraftFromRuntimeLite({
      generatedAt: "2026-06-03T00:00:00.000Z",
      inventory: createWorkflowProCapabilityInventory(),
      runtimeLite,
      workspaceId: "workspace-test",
      workspaceName: "NEXUS TEST",
    });
    const plan = createWorkflowProApplyPlan({
      contract: draft,
      createdAt: "2026-06-03T00:00:01.000Z",
      currentRuntimeLite: undefined,
    });

    expect(plan.schema).toBe("nexus.workflowPro.applyPlan.v1");
    expect(plan.status).toBe("ready");
    expect(plan.safety).toMatchObject({
      mutatesGraphNow: false,
      requiresExplicitOperatorApply: true,
      sourceSchema: "nexus.workflow.v1",
    });
    expect(plan.candidateRuntimeLite?.nodes.map((node) => node.type)).toEqual([
      "input.text",
      "node.file",
    ]);
    expect(plan.operations[0]).toMatchObject({
      action: "replace-runtime-lite-preview",
      edgeDelta: 1,
      nodeDelta: 2,
    });
  });

  it("blocks apply preview when validation fails", () => {
    const draft = createWorkflowProContractDraftFromRuntimeLite({
      inventory: createWorkflowProCapabilityInventory(),
      runtimeLite,
      workspaceId: "workspace-test",
      workspaceName: "NEXUS TEST",
    });
    const invalidDraft = {
      ...draft,
      edges: [
        {
          ...draft.edges[0],
          source: "missing-node",
        },
      ],
    };
    const plan = createWorkflowProApplyPlan({
      contract: invalidDraft as typeof draft,
      currentRuntimeLite: runtimeLite,
    });

    expect(plan.status).toBe("blocked");
    expect(plan.candidateRuntimeLite).toBeNull();
    expect(plan.operations).toEqual([]);
    expect(plan.reasons[0]).toContain("validation failed");
  });
});
