import { describe, expect, it } from "vitest";

import { createWorkflowGroupRecordEvent } from "./workflow-group-records";
import type { WorkflowGroupRecordWriteRequest } from "@/lib/nexus-types";

describe("workflow group record events", () => {
  it("creates a sanitized durable workflow group record event", () => {
    const event = createWorkflowGroupRecordEvent({
      record: makeRecord(),
      requestId: "req-group-a",
      traceId: "trace-group-a",
      userId: "user-a",
    });

    expect(event).toMatchObject({
      name: "workflow.group_record.upserted",
      payload: {
        compilerManifestSchema: "nexus.attachmentCompilerManifest.v1",
        contractSchema: "nexus.workflow.v1",
        edgeCount: 1,
        nodeCount: 2,
        nodeTypes: {
          "input.text": 1,
          "model.llm": 1,
        },
        schema: "nexus.workflowPro.groupRecord.v1",
        workflowGroupId: "wf_group_record_a",
      },
      trace: {
        resourceId: "wf_group_record_a",
        resourceType: "workflow.group",
        source: "agent",
        traceId: "trace-group-a",
        workspaceId: "workspace-group-records",
      },
    });
    expect(JSON.stringify(event.payload)).not.toContain("prompt");
    expect(JSON.stringify(event.payload)).not.toContain("rawText");
  });
});

function makeRecord(): WorkflowGroupRecordWriteRequest {
  return {
    capabilityGaps: ["workflow.parallel.native-execution"],
    compilerManifestSchema: "nexus.attachmentCompilerManifest.v1",
    contract: {
      name: "Brain Draft",
      schema: "nexus.workflow.v1",
      version: "1",
    },
    edges: [
      {
        id: "edge-input-llm",
        source: "input",
        target: "llm",
      },
    ],
    group: {
      id: "wf_group_record_a",
      label: "Record A",
      source: "brain",
    },
    nodes: [
      {
        id: "input",
        label: "Input",
        status: "idle",
        type: "input.text",
      },
      {
        id: "llm",
        label: "LLM",
        status: "idle",
        type: "model.llm",
      },
    ],
    workflowId: "workflow-record-a",
    workspaceId: "workspace-group-records",
  };
}
