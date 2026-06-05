import { describe, expect, it } from "vitest";

import type { WorkflowRuntimeLiteState } from "@/lib/nexus-types";

import { createWorkflowGroupRecordPayload } from "./group-record-client";

describe("workflow group record client", () => {
  it("creates a narrow durable group record payload from one RuntimeLite group", () => {
    const payload = createWorkflowGroupRecordPayload({
      groupId: "wf_group_a",
      runtimeLite: {
        edges: [
          {
            id: "edge-a",
            source: "node-input",
            sourceHandle: "output",
            target: "node-llm",
            targetHandle: "input",
          },
          {
            id: "edge-other",
            source: "other-input",
            sourceHandle: "output",
            target: "other-output",
            targetHandle: "input",
          },
        ],
        nodes: [
          {
            data: {
              label: "Input",
              text: "raw text is not copied by the record payload",
            },
            group: {
              id: "wf_group_a",
              label: "Group A",
              source: "brain",
            },
            id: "node-input",
            inputSnapshot: null,
            outputSnapshot: null,
            position: { x: 0, y: 0 },
            status: "idle",
            type: "input.text",
          },
          {
            data: {
              label: "LLM",
              model: "gpt-5.5",
              prompt: "this prompt must not be copied",
            },
            group: {
              id: "wf_group_a",
              label: "Group A",
              source: "brain",
            },
            id: "node-llm",
            inputSnapshot: null,
            outputSnapshot: null,
            position: { x: 240, y: 0 },
            status: "idle",
            type: "model.llm",
          },
          {
            data: {
              label: "Other",
              text: "",
            },
            group: {
              id: "wf_group_other",
              source: "manual",
            },
            id: "other-input",
            inputSnapshot: null,
            outputSnapshot: null,
            position: { x: 0, y: 120 },
            status: "idle",
            type: "input.text",
          },
        ],
        runs: [],
        version: 1,
      } satisfies WorkflowRuntimeLiteState,
      workspaceId: "workspace-a",
    });

    expect(payload).toMatchObject({
      compilerManifestSchema: "nexus.attachmentCompilerManifest.v1",
      edges: [
        {
          id: "edge-a",
          source: "node-input",
          target: "node-llm",
        },
      ],
      group: {
        id: "wf_group_a",
        label: "Group A",
      },
      nodes: [
        {
          id: "node-input",
          label: "Input",
          type: "input.text",
        },
        {
          id: "node-llm",
          label: "LLM",
          type: "model.llm",
        },
      ],
      workflowId: "wf_group_a",
      workspaceId: "workspace-a",
    });
    expect(JSON.stringify(payload)).not.toContain("this prompt must not be copied");
    expect(JSON.stringify(payload)).not.toContain("raw text is not copied");
  });

  it("returns null when the requested group is absent", () => {
    expect(
      createWorkflowGroupRecordPayload({
        groupId: "missing",
        runtimeLite: {
          edges: [],
          nodes: [],
          runs: [],
          version: 1,
        },
        workspaceId: "workspace-a",
      }),
    ).toBeNull();
  });
});
