import { describe, expect, it } from "vitest";

import { createWorkflowProCapabilityInventory } from "./capability-inventory";
import { createWorkflowProApplyPlan } from "./workflow-contract-apply-plan";
import { createWorkflowProContractDraftFromRuntimeLite } from "./workflow-contract";
import { createWorkflowProProposalDiff } from "./proposal-diff";
import type { WorkflowRuntimeLiteState } from "@/lib/nexus-types";

const currentRuntimeLite: WorkflowRuntimeLiteState = {
  edges: [
    {
      id: "edge-input-output",
      source: "input-1",
      sourceHandle: "output",
      target: "output-1",
      targetHandle: "input",
    },
  ],
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
    {
      data: { label: "Output", renderMode: "plain" },
      error: null,
      id: "output-1",
      inputSnapshot: null,
      outputSnapshot: null,
      position: { x: 300, y: 0 },
      status: "idle",
      type: "output.text",
    },
  ],
  runs: [],
  version: 1,
};

const candidateRuntimeLite: WorkflowRuntimeLiteState = {
  ...currentRuntimeLite,
  edges: [
    {
      id: "edge-input-file",
      source: "input-1",
      sourceHandle: "output",
      target: "file-1",
      targetHandle: "input",
    },
  ],
  nodes: [
    {
      ...currentRuntimeLite.nodes[0],
      data: { label: "Input", text: "better brief" },
    },
    {
      data: {
        attachments: [],
        compilerId: "nexus-attachment-noop-compiler-v1",
        compilerVersion: "v1",
        label: "Files",
        note: "carry files",
      },
      error: null,
      id: "file-1",
      inputSnapshot: null,
      outputSnapshot: null,
      position: { x: 300, y: 0 },
      status: "idle",
      type: "node.file",
    },
  ],
};

describe("Workflow Pro proposal diff", () => {
  it("summarizes node and edge changes between current and candidate runtime graphs", () => {
    const contract = createWorkflowProContractDraftFromRuntimeLite({
      inventory: createWorkflowProCapabilityInventory(),
      runtimeLite: candidateRuntimeLite,
      workspaceId: "workspace-test",
      workspaceName: "NEXUS TEST",
    });
    const applyPlan = createWorkflowProApplyPlan({
      contract,
      currentRuntimeLite,
    });
    const diff = createWorkflowProProposalDiff({
      applyPlan,
      currentRuntimeLite,
    });

    expect(diff.status).toBe("ready");
    expect(diff.summary).toMatchObject({
      addedEdges: 1,
      addedNodes: 1,
      changedNodes: 1,
      removedEdges: 1,
      removedNodes: 1,
    });
    expect(diff.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "file-1", kind: "added", type: "node" }),
        expect.objectContaining({ id: "input-1", kind: "changed", type: "node" }),
        expect.objectContaining({ id: "output-1", kind: "removed", type: "node" }),
      ]),
    );
  });

  it("blocks diff output when the apply plan is blocked", () => {
    const contract = createWorkflowProContractDraftFromRuntimeLite({
      inventory: createWorkflowProCapabilityInventory(),
      runtimeLite: candidateRuntimeLite,
      workspaceId: "workspace-test",
      workspaceName: "NEXUS TEST",
    });
    const applyPlan = createWorkflowProApplyPlan({
      contract: {
        ...contract,
        edges: [
          {
            ...contract.edges[0],
            target: "missing-node",
          },
        ],
      } as typeof contract,
      currentRuntimeLite,
    });
    const diff = createWorkflowProProposalDiff({
      applyPlan,
      currentRuntimeLite,
    });

    expect(applyPlan.status).toBe("blocked");
    expect(diff.status).toBe("blocked");
    expect(diff.changes).toEqual([]);
  });
});
