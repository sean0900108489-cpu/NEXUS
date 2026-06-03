import { describe, expect, it } from "vitest";

import { createWorkflowProCapabilityInventory } from "./capability-inventory";
import { createWorkflowProContractDraftFromRuntimeLite } from "./workflow-contract";
import {
  assertWorkflowProContractDraft,
  validateWorkflowProContractDraft,
} from "./workflow-contract-validator";
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
      id: "edge-file-output",
      source: "file-1",
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
      data: {
        attachments: [],
        compilerId: "nexus-attachment-noop-compiler-v1",
        compilerVersion: "v1",
        label: "File Node",
        note: "keep file refs",
      },
      error: null,
      id: "file-1",
      inputSnapshot: null,
      outputSnapshot: null,
      position: { x: 260, y: 0 },
      status: "idle",
      type: "node.file",
    },
    {
      data: { label: "Output", renderMode: "markdown" },
      error: null,
      id: "output-1",
      inputSnapshot: null,
      outputSnapshot: null,
      position: { x: 520, y: 0 },
      status: "idle",
      type: "output.text",
    },
  ],
  runs: [],
  version: 1,
};

describe("Workflow Pro contract validator", () => {
  it("accepts a Runtime Lite generated nexus.workflow.v1 contract", () => {
    const draft = createWorkflowProContractDraftFromRuntimeLite({
      generatedAt: "2026-06-03T00:00:00.000Z",
      inventory: createWorkflowProCapabilityInventory(),
      runtimeLite,
      workspaceId: "workspace-test",
      workspaceName: "NEXUS TEST",
    });
    const validation = validateWorkflowProContractDraft(draft);

    expect(validation.ok).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(validation.summary).toMatchObject({
      edgeCount: 2,
      nodeCount: 3,
      outputCount: 1,
      schema: "nexus.workflow.v1",
    });
    expect(validation.summary.availableNodeTypes).toContain("node.file");
    expect(() => assertWorkflowProContractDraft(draft)).not.toThrow();
  });

  it("rejects contracts with broken edge references", () => {
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
          target: "missing-node",
        },
      ],
    };
    const validation = validateWorkflowProContractDraft(invalidDraft);

    expect(validation.ok).toBe(false);
    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "$.edges[0].target",
        }),
      ]),
    );
  });
});
