import { describe, expect, it } from "vitest";

import type { WorkflowRuntimeLiteState } from "@/lib/nexus-types";

import { appendWorkflowRuntimeGroupToRuntime } from "./group-append";

const currentRuntimeLite: WorkflowRuntimeLiteState = {
  edges: [
    {
      id: "edge-existing",
      source: "existing-input",
      sourceHandle: "output",
      target: "existing-output",
      targetHandle: "input",
    },
  ],
  lastError: "previous runtime warning",
  lastRunId: "run_existing",
  nodes: [
    {
      data: { label: "Existing Input", text: "Keep me" },
      error: null,
      id: "existing-input",
      inputSnapshot: null,
      outputSnapshot: null,
      position: { x: 100, y: 200 },
      status: "success",
      type: "input.text",
    },
    {
      data: { label: "Existing Output", renderMode: "markdown" },
      error: null,
      id: "existing-output",
      inputSnapshot: null,
      outputSnapshot: null,
      position: { x: 420, y: 200 },
      status: "success",
      type: "output.text",
    },
  ],
  runs: [
    {
      completedAt: "2026-06-04T00:00:03.000Z",
      nodeExecutions: [],
      runId: "run_existing",
      startedAt: "2026-06-04T00:00:00.000Z",
      status: "success",
      workflowId: "workflow-existing",
    },
  ],
  version: 1,
};

const incomingRuntimeLite: WorkflowRuntimeLiteState = {
  edges: [
    {
      id: "edge-existing",
      source: "incoming-input",
      sourceHandle: "output",
      target: "incoming-llm",
      targetHandle: "input",
    },
    {
      id: "incoming-edge-2",
      source: "incoming-llm",
      sourceHandle: "output",
      target: "incoming-output",
      targetHandle: "input",
    },
  ],
  lastError: "incoming error should not survive",
  lastRunId: "run_incoming",
  nodes: [
    {
      data: { label: "Incoming Input", text: "Append me" },
      error: "old input error",
      id: "incoming-input",
      inputSnapshot: null,
      outputSnapshot: {
        createdAt: "2026-06-04T00:00:01.000Z",
        displayText: "stale output",
        id: "packet-old",
        metadata: {},
        rawText: "stale output",
        runId: "run_incoming",
        sourceNodeId: "incoming-input",
        tokenEstimate: 2,
      },
      position: { x: 0, y: 0 },
      status: "success",
      type: "input.text",
    },
    {
      data: {
        label: "Incoming LLM",
        model: "gpt-4o-mini",
        modelSettings: { reasoningEffort: "high" },
        prompt: "Plan the output.",
        provider: "openai",
      },
      error: null,
      id: "incoming-llm",
      inputSnapshot: null,
      outputSnapshot: null,
      position: { x: 260, y: 0 },
      status: "running",
      type: "model.llm",
    },
    {
      data: { label: "Incoming Output", renderMode: "markdown" },
      error: null,
      id: "incoming-output",
      inputSnapshot: null,
      outputSnapshot: null,
      position: { x: 520, y: 0 },
      status: "failed",
      type: "output.text",
    },
  ],
  runs: [],
  version: 1,
};

describe("appendWorkflowRuntimeGroupToRuntime", () => {
  it("appends a renamed independent workflow group beside the existing canvas", () => {
    const result = appendWorkflowRuntimeGroupToRuntime({
      currentRuntimeLite,
      groupRuntimeLite: incomingRuntimeLite,
      options: { groupId: "wf_group_test" },
    });

    expect(result.groupId).toBe("wf_group_test");
    expect(result.nodeIds).toEqual([
      "wf_group_test_node_incoming-input",
      "wf_group_test_node_incoming-llm",
      "wf_group_test_node_incoming-output",
    ]);
    expect(result.edgeIds).toEqual([
      "wf_group_test_edge_edge-existing",
      "wf_group_test_edge_incoming-edge-2",
    ]);
    expect(result.runtimeLite.nodes).toHaveLength(5);
    expect(result.runtimeLite.edges).toHaveLength(3);
    expect(result.runtimeLite.runs[0]).toMatchObject(currentRuntimeLite.runs[0] ?? {});
    expect(result.runtimeLite.lastRunId).toBe("run_existing");
    expect(result.runtimeLite.lastError).toBeNull();

    const appendedInput = result.runtimeLite.nodes.find(
      (node) => node.id === "wf_group_test_node_incoming-input",
    );
    const appendedLlm = result.runtimeLite.nodes.find(
      (node) => node.id === "wf_group_test_node_incoming-llm",
    );
    const appendedEdge = result.runtimeLite.edges.find(
      (edge) => edge.id === "wf_group_test_edge_edge-existing",
    );

    expect(appendedInput?.group).toMatchObject({
      id: "wf_group_test",
      source: "runtime-append",
    });
    expect(appendedEdge?.group).toMatchObject({
      id: "wf_group_test",
      source: "runtime-append",
    });
    expect(appendedInput?.position).toEqual({ x: 860, y: 200 });
    expect(appendedLlm?.position).toEqual({ x: 1120, y: 200 });
    expect(appendedInput?.status).toBe("idle");
    expect(appendedInput?.error).toBeNull();
    expect(appendedInput?.outputSnapshot).toBeNull();
    expect(appendedEdge).toMatchObject({
      source: "wf_group_test_node_incoming-input",
      target: "wf_group_test_node_incoming-llm",
    });
  });

  it("places the first appended group at the default runtime origin", () => {
    const result = appendWorkflowRuntimeGroupToRuntime({
      currentRuntimeLite: undefined,
      groupRuntimeLite: incomingRuntimeLite,
      options: { groupId: "wf_group_first" },
    });

    expect(result.runtimeLite.nodes[0]?.position).toEqual({ x: 120, y: 96 });
    expect(result.runtimeLite.nodes[1]?.position).toEqual({ x: 380, y: 96 });
  });

  it("can attach explicit workflow group labels and sources", () => {
    const result = appendWorkflowRuntimeGroupToRuntime({
      currentRuntimeLite: undefined,
      groupRuntimeLite: incomingRuntimeLite,
      options: {
        groupId: "wf_group_brain",
        groupLabel: "Brain Planned Image Workflow",
        groupSource: "brain",
      },
    });

    expect(result.runtimeLite.nodes[0]?.group).toMatchObject({
      id: "wf_group_brain",
      label: "Brain Planned Image Workflow",
      source: "brain",
    });
    expect(result.runtimeLite.edges[0]?.group).toMatchObject({
      id: "wf_group_brain",
      label: "Brain Planned Image Workflow",
      source: "brain",
    });
  });
});
