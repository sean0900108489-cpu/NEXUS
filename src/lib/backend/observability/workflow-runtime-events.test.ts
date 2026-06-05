import { describe, expect, it } from "vitest";

import type { WorkflowRun, WorkflowRuntimeLiteState } from "@/lib/nexus-types";

import {
  createWorkflowRuntimeRunEvent,
  WORKFLOW_RUNTIME_TRACE_EVENT_SCHEMA,
} from "./workflow-runtime-events";

describe("workflow runtime observability events", () => {
  it("creates group-aware durable trace event payloads without raw packet text", () => {
    const run: WorkflowRun = {
      completedAt: "2026-06-04T00:00:04.000Z",
      error: null,
      group: {
        id: "wf_group_brain",
        label: "Brain Draft",
        source: "brain",
      },
      nodeExecutions: [
        {
          completedAt: "2026-06-04T00:00:02.000Z",
          latencyMs: 2000,
          nodeId: "input",
          outputSnapshot: {
            createdAt: "2026-06-04T00:00:02.000Z",
            displayText: "do not copy secret display",
            id: "packet-input",
            metadata: {},
            rawText: "OPENAI_API_KEY=secret should never be in event payload",
            runId: "run-a",
            sourceNodeId: "input",
          },
          runId: "run-a",
          startedAt: "2026-06-04T00:00:00.000Z",
          status: "success",
        },
        {
          completedAt: "2026-06-04T00:00:04.000Z",
          latencyMs: 2000,
          nodeId: "image",
          outputSnapshot: {
            createdAt: "2026-06-04T00:00:04.000Z",
            displayText: "Image generated",
            id: "packet-image",
            metadata: {
              artifactId: "artifact-image",
            },
            rawText: "Image URL: https://example.test/image.png",
            runId: "run-a",
            sourceNodeId: "image",
          },
          runId: "run-a",
          startedAt: "2026-06-04T00:00:02.000Z",
          status: "success",
        },
      ],
      runId: "run-a",
      startedAt: "2026-06-04T00:00:00.000Z",
      status: "success",
      workflowId: "workspace-a",
    };

    const event = createWorkflowRuntimeRunEvent({
      requestId: "request-a",
      run,
      traceId: "trace-a",
      userId: "user-a",
      workspaceId: "workspace-a",
    });
    const serialized = JSON.stringify(event);

    expect(event.name).toBe("workflow.runtime_lite.run.succeeded");
    expect(event.status).toBe("succeeded");
    expect(event.trace).toMatchObject({
      requestId: "request-a",
      resourceId: "run-a",
      resourceType: "workflow.run",
      source: "agent",
      traceId: "trace-a",
      userId: "user-a",
      workspaceId: "workspace-a",
    });
    expect(event.payload).toMatchObject({
      artifactCount: 1,
      durationMs: 4000,
      nodeCount: 2,
      schema: WORKFLOW_RUNTIME_TRACE_EVENT_SCHEMA,
      severity: "info",
      workflowGroupId: "wf_group_brain",
      workflowGroupLabel: "Brain Draft",
      workflowGroupSource: "brain",
      workflowRunId: "run-a",
    });
    expect(serialized).not.toContain("OPENAI_API_KEY");
    expect(serialized).not.toContain("secret should never");
    expect(serialized).not.toContain("Image URL:");
  });

  it("falls back to node group metadata when the run has no group", () => {
    const runtimeLite: WorkflowRuntimeLiteState = {
      edges: [],
      lastError: null,
      lastRunId: "run-a",
      nodes: [
        {
          data: { label: "Input", text: "hello" },
          group: {
            id: "wf_group_from_node",
            label: "Node Group",
            source: "brain",
          },
          id: "node-a",
          position: { x: 0, y: 0 },
          status: "success",
          type: "input.text",
        },
      ],
      runs: [],
      version: 1,
    };
    const run: WorkflowRun = {
      completedAt: "2026-06-04T00:00:01.000Z",
      error: null,
      nodeExecutions: [
        {
          completedAt: "2026-06-04T00:00:01.000Z",
          latencyMs: 1000,
          nodeId: "node-a",
          runId: "run-a",
          startedAt: "2026-06-04T00:00:00.000Z",
          status: "success",
        },
      ],
      runId: "run-a",
      startedAt: "2026-06-04T00:00:00.000Z",
      status: "success",
      workflowId: "workspace-a",
    };

    const event = createWorkflowRuntimeRunEvent({
      run,
      runtimeLite,
      workspaceId: "workspace-a",
    });

    expect(event.payload).toMatchObject({
      workflowGroupId: "wf_group_from_node",
      workflowGroupLabel: "Node Group",
      workflowGroupSource: "brain",
    });
  });

  it("marks failed workflow runs as error events", () => {
    const run: WorkflowRun = {
      completedAt: "2026-06-04T00:00:01.000Z",
      error: "Image provider failed",
      nodeExecutions: [],
      runId: "run-failed",
      startedAt: "2026-06-04T00:00:00.000Z",
      status: "failed",
      workflowId: "workspace-a",
    };

    const event = createWorkflowRuntimeRunEvent({
      run,
      workspaceId: "workspace-a",
    });

    expect(event.name).toBe("workflow.runtime_lite.run.failed");
    expect(event.status).toBe("failed");
    expect(event.payload).toMatchObject({
      severity: "error",
      workflowGroupId: "workspace-root",
    });
  });
});
