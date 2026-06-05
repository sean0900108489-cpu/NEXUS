import { describe, expect, it } from "vitest";

import { createWorkflowProCapabilityInventory } from "./capability-inventory";
import {
  createWorkflowRuntimeLiteStateFromContract,
  createWorkflowProRuntimeBridge,
} from "./runtime-bridge";
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
    {
      id: "edge-file-image",
      source: "file-1",
      sourceHandle: "output",
      target: "image-1",
      targetHandle: "input",
    },
  ],
  lastError: "old run failed",
  lastRunId: "run_old",
  nodes: [
    {
      data: { label: "Input", text: "Y2K product board" },
      error: null,
      id: "input-1",
      inputSnapshot: null,
      outputSnapshot: null,
      position: { x: 0, y: 0 },
      status: "success",
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
      status: "running",
      type: "node.file",
    },
    {
      data: {
        aspectRatio: "16:9",
        label: "Image",
        modelId: "img2",
        prompt: "wide pants editorial",
        quality: "standard",
      },
      error: "previous image failed",
      id: "image-1",
      inputSnapshot: null,
      outputSnapshot: null,
      position: { x: 520, y: 0 },
      status: "failed",
      type: "model.image",
    },
  ],
  runs: [
    {
      completedAt: "2026-06-04T00:00:03.000Z",
      nodeExecutions: [],
      runId: "run_old",
      startedAt: "2026-06-04T00:00:00.000Z",
      status: "failed",
      workflowId: "workflow-old",
    },
  ],
  version: 1,
};

describe("Workflow Pro runtime bridge", () => {
  it("creates the canonical Runtime Lite candidate from nexus.workflow.v1", () => {
    const contract = createWorkflowProContractDraftFromRuntimeLite({
      generatedAt: "2026-06-04T00:00:00.000Z",
      inventory: createWorkflowProCapabilityInventory(),
      runtimeLite,
      workspaceId: "workspace-test",
      workspaceName: "NEXUS TEST",
    });
    const bridge = createWorkflowProRuntimeBridge(contract);

    expect(bridge.source).toMatchObject({
      contractId: contract.id,
      edgeCount: 2,
      nodeCount: 3,
      schema: "nexus.workflow.v1",
    });
    expect(bridge.droppedEdges).toBe(0);
    expect(bridge.droppedNodes).toBe(0);
    expect(bridge.runtimeLite).toMatchObject({
      lastError: null,
      lastRunId: null,
      runs: [],
      version: 1,
    });
    expect(bridge.runtimeLite.nodes.map((node) => node.status)).toEqual([
      "idle",
      "idle",
      "idle",
    ]);
    expect(bridge.runtimeLite.nodes[1]?.data).toMatchObject({
      compilerId: "nexus-attachment-noop-compiler-v1",
      compilerVersion: "v1",
    });
    expect(bridge.runtimeLite.nodes[2]?.data).toMatchObject({
      aspectRatio: "16:9",
      modelId: "img2",
      quality: "standard",
    });
  });

  it("exports a small convenience helper for callers that only need the state", () => {
    const contract = createWorkflowProContractDraftFromRuntimeLite({
      inventory: createWorkflowProCapabilityInventory(),
      runtimeLite,
      workspaceId: "workspace-test",
      workspaceName: "NEXUS TEST",
    });
    const runtimeCandidate = createWorkflowRuntimeLiteStateFromContract(contract);

    expect(runtimeCandidate.nodes).toHaveLength(contract.nodes.length);
    expect(runtimeCandidate.edges).toHaveLength(contract.edges.length);
  });
});
