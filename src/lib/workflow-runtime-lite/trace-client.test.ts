import { describe, expect, it } from "vitest";

import type { WorkflowRun } from "@/lib/nexus-types";

import { createWorkflowRuntimeTraceWriteRequestFromRun } from "./trace-client";

describe("workflow runtime trace client", () => {
  it("creates narrow trace write requests without raw context text", () => {
    const run: WorkflowRun = {
      completedAt: "2026-06-04T07:00:04.000Z",
      group: {
        id: "wf_group_client",
        label: "Client Trace Group",
        source: "brain",
      },
      nodeExecutions: [
        {
          completedAt: "2026-06-04T07:00:04.000Z",
          nodeId: "image-node",
          outputSnapshot: {
            createdAt: "2026-06-04T07:00:04.000Z",
            displayText: "Image URL: data:image/png;base64,secret",
            id: "packet-image",
            metadata: {
              artifactId: "artifact-image",
              artifactVaultRecord: {
                id: "vault-image",
              },
            },
            rawText: "raw model output should not be posted",
            runId: "run-client",
            sourceNodeId: "image-node",
          },
          runId: "run-client",
          startedAt: "2026-06-04T07:00:00.000Z",
          status: "success",
        },
      ],
      runId: "run-client",
      startedAt: "2026-06-04T07:00:00.000Z",
      status: "success",
      workflowId: "workspace-client",
    };

    const request = createWorkflowRuntimeTraceWriteRequestFromRun({
      occurredAt: "2026-06-04T07:00:05.000Z",
      run,
      workspaceId: "workspace-client",
    });
    const serialized = JSON.stringify(request);

    expect(request).toMatchObject({
      occurredAt: "2026-06-04T07:00:05.000Z",
      traceId: "workflow-runtime:run-client",
      workspaceId: "workspace-client",
      run: {
        group: {
          id: "wf_group_client",
        },
        nodeExecutions: [
          {
            artifactId: "artifact-image",
            artifactVaultRecordId: "vault-image",
            nodeId: "image-node",
            status: "success",
          },
        ],
        runId: "run-client",
      },
    });
    expect(serialized).not.toContain("raw model output");
    expect(serialized).not.toContain("data:image/png");
    expect(serialized).not.toContain("rawText");
    expect(serialized).not.toContain("displayText");
    expect(serialized).not.toContain("outputSnapshot");
  });
});
