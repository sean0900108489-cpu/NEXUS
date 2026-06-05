import { describe, expect, it } from "vitest";

import type { WorkflowRuntimeLiteState } from "@/lib/nexus-types";

import {
  createWorkflowProRunHistoryGroupsReport,
  inferWorkflowRuntimeGroupId,
} from "./run-history-groups";

describe("Workflow Pro run history groups", () => {
  it("infers workflow group ids from appended RuntimeLite node ids", () => {
    expect(
      inferWorkflowRuntimeGroupId(
        "wf_group_12345678-aaaa-bbbb-cccc-123456789abc_node_brain-image-input",
      ),
    ).toBe("wf_group_12345678-aaaa-bbbb-cccc-123456789abc");
    expect(inferWorkflowRuntimeGroupId("input-root")).toBe("workspace-root");
  });

  it("groups nodes and run evidence by workflow runtime group", () => {
    const runtimeLite: WorkflowRuntimeLiteState = {
      edges: [],
      lastError: null,
      lastRunId: "run-group-a",
      nodes: [
        {
          data: { label: "Input", text: "hello" },
          group: {
            id: "workflow-explicit-a",
            label: "Explicit Workflow A",
            source: "brain",
          },
          id: "wf_group_group-a_node_input",
          position: { x: 0, y: 0 },
          status: "success",
          type: "input.text",
        },
        {
          data: { label: "Image", modelId: "img2", quality: "standard", aspectRatio: "16:9" },
          group: {
            id: "workflow-explicit-a",
            label: "Explicit Workflow A",
            source: "brain",
          },
          id: "wf_group_group-a_node_image",
          position: { x: 260, y: 0 },
          status: "success",
          type: "model.image",
        },
        {
          data: { label: "Input", text: "other" },
          id: "wf_group_group-b_node_input",
          position: { x: 0, y: 260 },
          status: "idle",
          type: "input.text",
        },
      ],
      runs: [
        {
          completedAt: "2026-06-04T00:00:02.000Z",
          error: null,
          group: {
            id: "workflow-explicit-a",
            label: "Explicit Workflow A",
            source: "brain",
          },
          nodeExecutions: [
            {
              completedAt: "2026-06-04T00:00:01.000Z",
              latencyMs: 1000,
              nodeId: "wf_group_group-a_node_input",
              outputSnapshot: null,
              runId: "run-group-a",
              startedAt: "2026-06-04T00:00:00.000Z",
              status: "success",
            },
            {
              completedAt: "2026-06-04T00:00:02.000Z",
              latencyMs: 1000,
              nodeId: "wf_group_group-a_node_image",
              outputSnapshot: {
                createdAt: "2026-06-04T00:00:02.000Z",
                displayText: "Image generated.",
                id: "packet-image",
                metadata: {
                  artifactId: "artifact-a",
                },
                rawText: "Image URL: https://example.test/a.png",
                runId: "run-group-a",
                sourceNodeId: "wf_group_group-a_node_image",
              },
              runId: "run-group-a",
              startedAt: "2026-06-04T00:00:01.000Z",
              status: "success",
            },
          ],
          runId: "run-group-a",
          startedAt: "2026-06-04T00:00:00.000Z",
          status: "success",
          workflowId: "workspace-test",
        },
      ],
      version: 1,
    };

    const report = createWorkflowProRunHistoryGroupsReport(runtimeLite);

    expect(report.schema).toBe("nexus.workflowPro.runHistoryGroups.v1");
    expect(report.groups).toHaveLength(2);

    const groupA = report.groups.find(
      (group) => group.groupId === "workflow-explicit-a",
    );
    const groupB = report.groups.find(
      (group) => group.groupId === "wf_group_group-b",
    );

    expect(groupA).toMatchObject({
      artifactCount: 1,
      label: "Explicit Workflow A",
      latestRunId: "run-group-a",
      latestRunStatus: "success",
      nodeCount: 2,
      runCount: 1,
    });
    expect(groupA?.statusCounts.success).toBe(2);
    expect(groupB).toMatchObject({
      latestRunId: null,
      nodeCount: 1,
      runCount: 0,
    });
    expect(groupB?.statusCounts.idle).toBe(1);
  });
});
