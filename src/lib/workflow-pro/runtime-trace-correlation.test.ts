import { describe, expect, it } from "vitest";

import type { SystemEventRecord } from "@/lib/nexus-types";

import { createWorkflowRuntimeTraceCorrelationReport } from "./runtime-trace-correlation";

describe("workflow runtime trace correlation", () => {
  it("reports no-local-run when there is no local runtime evidence", () => {
    const report = createWorkflowRuntimeTraceCorrelationReport({
      latestRun: null,
    });

    expect(report).toMatchObject({
      runId: null,
      status: "no-local-run",
      traceId: null,
    });
  });

  it("reports synced-unloaded before backend trace events are fetched", () => {
    const report = createWorkflowRuntimeTraceCorrelationReport({
      latestRun: {
        runId: "run-a",
        status: "success",
        traceSync: {
          status: "synced",
          traceId: "workflow-runtime:run-a",
        },
      },
      loaded: false,
    });

    expect(report).toMatchObject({
      status: "synced-unloaded",
      traceId: "workflow-runtime:run-a",
    });
  });

  it("matches workflow runtime backend events by trace id or run id", () => {
    const report = createWorkflowRuntimeTraceCorrelationReport({
      events: [
        makeEvent({
          eventType: "workflow.runtime_lite.run.succeeded",
          resourceId: "run-a",
          traceId: "workflow-runtime:run-a",
        }),
      ],
      latestRun: {
        runId: "run-a",
        status: "success",
        traceSync: {
          status: "synced",
          traceId: "workflow-runtime:run-a",
        },
      },
      loaded: true,
    });

    expect(report).toMatchObject({
      eventCount: 1,
      latestEventType: "workflow.runtime_lite.run.succeeded",
      status: "matched",
    });
  });

  it("reports missing when sync succeeded but no matching backend event is loaded", () => {
    const report = createWorkflowRuntimeTraceCorrelationReport({
      events: [
        makeEvent({
          eventType: "api.v1.request",
          resourceId: "run-a",
          traceId: "workflow-runtime:run-a",
        }),
      ],
      latestRun: {
        runId: "run-a",
        status: "success",
        traceSync: {
          status: "synced",
          traceId: "workflow-runtime:run-a",
        },
      },
      loaded: true,
    });

    expect(report).toMatchObject({
      eventCount: 0,
      status: "missing",
    });
  });
});

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
