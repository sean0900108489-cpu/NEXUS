import { describe, expect, it } from "vitest";

import type { WorkflowRuntimeLiteState } from "@/lib/nexus-types";
import { createWorkflowProCapabilityInventory } from "./capability-inventory";
import { createWorkflowProContractDraftFromRuntimeLite } from "./workflow-contract";

describe("Workflow Pro contract bridge", () => {
  it("creates a brain-readable nexus.workflow.v1 draft from runtimeLite", () => {
    const runtimeLite: WorkflowRuntimeLiteState = {
      edges: [
        {
          id: "edge-input-llm",
          source: "input-1",
          sourceHandle: "output",
          target: "llm-1",
          targetHandle: "input",
        },
      ],
      lastError: null,
      lastRunId: null,
      nodes: [
        {
          data: { label: "Seed", text: "strategy brief" },
          error: null,
          id: "input-1",
          inputSnapshot: null,
          outputSnapshot: null,
          position: { x: 10, y: 20 },
          status: "idle",
          type: "input.text",
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
          position: { x: 170, y: 20 },
          status: "idle",
          type: "node.file",
        },
        {
          data: {
            label: "Strategist",
            model: "gpt-5.5",
            modelSettings: { reasoningEffort: "high" },
            prompt: "Analyze the brief.",
            provider: "openai",
          },
          error: null,
          id: "llm-1",
          inputSnapshot: null,
          outputSnapshot: null,
          position: { x: 500, y: 20 },
          status: "idle",
          type: "model.llm",
        },
      ],
      runs: [],
      version: 1,
    };

    const draft = createWorkflowProContractDraftFromRuntimeLite({
      generatedAt: "2026-06-03T00:00:00.000Z",
      inventory: createWorkflowProCapabilityInventory(),
      runtimeLite,
      workspaceId: "workspace-test",
      workspaceName: "NEXUS TEST",
    });

    expect(draft.schema).toBe("nexus.workflow.v1");
    expect(draft.nodes).toHaveLength(3);
    expect(draft.nodes[1]).toMatchObject({
      compiler: {
        id: "nexus-attachment-noop-compiler-v1",
        mode: "noop",
        version: "v1",
      },
      id: "file-1",
      type: "node.file",
    });
    expect(draft.nodes[2]).toMatchObject({
      id: "llm-1",
      label: "Strategist",
      model: {
        modelId: "gpt-5.5",
        provider: "openai",
        settings: { reasoningEffort: "high" },
      },
      type: "model.llm",
    });
    expect(draft.edges[0]).toMatchObject({
      mode: "always",
      packetContract: {
        input: "ContextPacket",
        output: "ContextPacket",
      },
      source: "input-1",
      target: "llm-1",
    });
    expect(draft.brain.readBeforeRun).toBe(true);
    expect(draft.capabilityInventory.nodeTypes.map((node) => node.type)).toContain(
      "node.file",
    );
    expect(draft.capabilityInventory.notAvailableYet).toContain("node.condition.ifElse");
  });

  it("marks image model nodes as generated artifact outputs", () => {
    const runtimeLite: WorkflowRuntimeLiteState = {
      edges: [],
      lastError: null,
      lastRunId: null,
      nodes: [
        {
          data: {
            aspectRatio: "16:9",
            label: "Image",
            modelId: "img2",
            prompt: "Y2K clothing board",
            quality: "standard",
          },
          error: null,
          id: "image-1",
          inputSnapshot: null,
          outputSnapshot: null,
          position: { x: 0, y: 0 },
          status: "idle",
          type: "model.image",
        },
      ],
      runs: [],
      version: 1,
    };

    const draft = createWorkflowProContractDraftFromRuntimeLite({
      generatedAt: "2026-06-03T00:00:00.000Z",
      inventory: createWorkflowProCapabilityInventory(),
      runtimeLite,
      workspaceId: "workspace-test",
      workspaceName: "NEXUS TEST",
    });

    expect(draft.outputs).toEqual([
      expect.objectContaining({
        sourceNodeId: "image-1",
        type: "image",
      }),
    ]);
    expect(draft.nodes[0]?.artifactPolicy).toMatchObject({
      downloadable: true,
      persist: true,
      type: "generated-image",
    });
  });
});
