import { describe, expect, it } from "vitest";

import {
  createWorkflowProCapabilityInventory,
  summarizeWorkflowProRuntime,
} from "./capability-inventory";
import type { WorkflowRuntimeLiteState } from "@/lib/nexus-types";

describe("Workflow Pro capability inventory", () => {
  it("exposes available Runtime Lite node types for the Workflow Pro brain", () => {
    const inventory = createWorkflowProCapabilityInventory();

    expect(inventory.schema).toBe("nexus.workflowPro.capabilityInventory.v1");
    expect(inventory.nodeTypes.map((node) => node.type)).toEqual([
      "input.text",
      "node.file",
      "model.llm",
      "model.image",
      "output.text",
    ]);
    expect(inventory.compilers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "compiler.noop", state: "available" }),
      ]),
    );
    expect(inventory.notAvailableYet).not.toContain("node.file");
  });

  it("summarizes runtimeLite counts without mutating the runtime graph", () => {
    const runtimeLite: WorkflowRuntimeLiteState = {
      edges: [
        {
          id: "edge-1",
          source: "input-1",
          sourceHandle: "output",
          target: "llm-1",
          targetHandle: "input",
        },
      ],
      lastError: null,
      lastRunId: "run-1",
      nodes: [
        {
          data: { label: "Input", text: "hello" },
          error: null,
          id: "input-1",
          inputSnapshot: null,
          outputSnapshot: null,
          position: { x: 0, y: 0 },
          status: "success",
          type: "input.text",
        },
        {
          data: { label: "LLM", model: "gpt-5.5", prompt: "respond" },
          error: null,
          id: "llm-1",
          inputSnapshot: null,
          outputSnapshot: null,
          position: { x: 300, y: 0 },
          status: "idle",
          type: "model.llm",
        },
      ],
      runs: [
        {
          nodeExecutions: [],
          runId: "run-1",
          startedAt: "2026-06-03T00:00:00.000Z",
          status: "success",
          workflowId: "workflow-lite",
        },
      ],
      version: 1,
    };

    const summary = summarizeWorkflowProRuntime(runtimeLite);

    expect(summary.nodeCount).toBe(2);
    expect(summary.edgeCount).toBe(1);
    expect(summary.nodeTypeCounts["input.text"]).toBe(1);
    expect(summary.nodeTypeCounts["model.llm"]).toBe(1);
    expect(summary.nodeStatusCounts.success).toBe(1);
    expect(summary.lastRunStatus).toBe("success");
  });
});
