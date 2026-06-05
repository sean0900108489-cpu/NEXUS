import { describe, expect, it } from "vitest";

import type { SystemEventRecord } from "@/lib/nexus-types";

import { createWorkflowProDurableGroupRecordReport } from "./durable-group-records";

describe("durable workflow group record report", () => {
  it("reports not-loaded before workspace trace events are refreshed", () => {
    expect(
      createWorkflowProDurableGroupRecordReport({
        events: [],
        groupId: "wf_group_a",
        loaded: false,
      }),
    ).toMatchObject({
      eventCount: 0,
      groupId: "wf_group_a",
      schema: "nexus.workflowPro.durableGroupRecordReport.v1",
      status: "not-loaded",
    });
  });

  it("matches workflow group record events by workflowGroupId metadata", () => {
    const report = createWorkflowProDurableGroupRecordReport({
      events: [
        event({
          edgeCount: 2,
          id: "event-a",
          nodeCount: 3,
          workflowGroupId: "wf_group_a",
        }),
        event({
          edgeCount: 1,
          id: "event-other",
          nodeCount: 2,
          workflowGroupId: "wf_group_other",
        }),
      ],
      groupId: "wf_group_a",
      loaded: true,
    });

    expect(report).toMatchObject({
      compilerManifestSchema: "nexus.attachmentCompilerManifest.v1",
      contractSchema: "nexus.workflow.v1",
      edgeCount: 2,
      eventCount: 1,
      latestEventId: "event-a",
      nodeCount: 3,
      status: "matched",
    });
  });

  it("reports missing when loaded events do not include the selected group", () => {
    expect(
      createWorkflowProDurableGroupRecordReport({
        events: [event({ workflowGroupId: "wf_group_other" })],
        groupId: "wf_group_a",
        loaded: true,
      }),
    ).toMatchObject({
      eventCount: 0,
      status: "missing",
    });
  });
});

function event(
  metadata: Partial<{
    compilerManifestSchema: string;
    contractSchema: string;
    edgeCount: number;
    nodeCount: number;
    workflowGroupId: string;
  }> & { id?: string },
): SystemEventRecord {
  return {
    createdAt: "2026-06-04T07:00:00.000Z",
    eventType: "workflow.group_record.upserted",
    id: metadata.id ?? "event",
    metadata: {
      compilerManifestSchema:
        metadata.compilerManifestSchema ?? "nexus.attachmentCompilerManifest.v1",
      contractSchema: metadata.contractSchema ?? "nexus.workflow.v1",
      edgeCount: metadata.edgeCount ?? 1,
      nodeCount: metadata.nodeCount ?? 1,
      workflowGroupId: metadata.workflowGroupId,
    },
    resourceId: metadata.workflowGroupId,
    resourceType: "workflow.group",
    severity: "info",
    source: "agent",
    traceId: `trace-${metadata.workflowGroupId ?? "none"}`,
    workspaceId: "workspace-a",
  };
}
