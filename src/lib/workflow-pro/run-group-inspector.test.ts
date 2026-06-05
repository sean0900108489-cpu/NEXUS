import { describe, expect, it } from "vitest";

import type {
  SystemEventRecord,
  WorkflowRuntimeLiteState,
} from "@/lib/nexus-types";

import { createWorkflowProRunGroupInspectorReport } from "./run-group-inspector";

describe("Workflow Pro run group inspector", () => {
  it("summarizes selected group run evidence and matches durable trace events", () => {
    const report = createWorkflowProRunGroupInspectorReport({
      events: [
        makeEvent({
          eventType: "workflow.runtime_lite.run.succeeded",
          resourceId: "run-a",
          traceId: "workflow-runtime:run-a",
        }),
      ],
      eventsLoaded: true,
      eventsTraceId: "workflow-runtime:run-a",
      groupId: "workflow-explicit-a",
      runtimeLite: makeRuntimeLite(),
    });

    expect(report.schema).toBe("nexus.workflowPro.runGroupInspector.v1");
    expect(report.group).toMatchObject({
      groupId: "workflow-explicit-a",
      label: "Explicit Workflow A",
      nodeCount: 2,
      runCount: 1,
    });
    expect(report.latestRun).toMatchObject({
      durationMs: 2000,
      runId: "run-a",
      status: "success",
    });
    expect(report.latestRun?.executions).toHaveLength(2);
    expect(report.artifactIds).toEqual(["artifact-a", "vault-a"]);
    expect(report.traceCorrelation).toMatchObject({
      latestEventType: "workflow.runtime_lite.run.succeeded",
      status: "matched",
    });
  });

  it("keeps synced runs unloaded when events belong to another trace id", () => {
    const report = createWorkflowProRunGroupInspectorReport({
      events: [
        makeEvent({
          eventType: "workflow.runtime_lite.run.succeeded",
          resourceId: "run-other",
          traceId: "workflow-runtime:run-other",
        }),
      ],
      eventsLoaded: true,
      eventsTraceId: "workflow-runtime:run-other",
      groupId: "workflow-explicit-a",
      runtimeLite: makeRuntimeLite(),
    });

    expect(report.traceCorrelation).toMatchObject({
      status: "synced-unloaded",
      traceId: "workflow-runtime:run-a",
    });
  });

  it("reports a selectable group before it has run", () => {
    const report = createWorkflowProRunGroupInspectorReport({
      groupId: "wf_group_group-b",
      runtimeLite: makeRuntimeLite(),
    });

    expect(report.group).toMatchObject({
      groupId: "wf_group_group-b",
      nodeCount: 1,
      runCount: 0,
    });
    expect(report.latestRun).toBeNull();
    expect(report.traceCorrelation.status).toBe("no-local-run");
  });
});

function makeRuntimeLite(): WorkflowRuntimeLiteState {
  return {
    edges: [],
    lastError: null,
    lastRunId: "run-a",
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
            runId: "run-a",
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
                artifactVaultRecord: {
                  id: "vault-a",
                },
              },
              rawText: "Image URL: https://example.test/a.png",
              runId: "run-a",
              sourceNodeId: "wf_group_group-a_node_image",
            },
            runId: "run-a",
            startedAt: "2026-06-04T00:00:01.000Z",
            status: "success",
          },
        ],
        runId: "run-a",
        startedAt: "2026-06-04T00:00:00.000Z",
        status: "success",
        traceSync: {
          completedAt: "2026-06-04T00:00:03.000Z",
          eventId: "event-a",
          eventType: "workflow.runtime_lite.run.succeeded",
          status: "synced",
          traceId: "workflow-runtime:run-a",
        },
        workflowId: "workspace-test",
      },
    ],
    version: 1,
  };
}

function makeEvent(
  input: Pick<SystemEventRecord, "eventType" | "resourceId" | "traceId">,
): SystemEventRecord {
  return {
    createdAt: "2026-06-04T07:30:00.000Z",
    eventType: input.eventType,
    id: `event-${input.eventType}`,
    message: null,
    metadata: {},
    requestId: "request-a",
    resourceId: input.resourceId,
    resourceType: "workflow.run",
    severity: "info",
    source: "agent",
    traceId: input.traceId,
    userId: "local-editor",
    workspaceId: "workspace-a",
  };
}
