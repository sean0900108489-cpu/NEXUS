import type { SystemEventRecord } from "@/lib/nexus-types";

export const WORKFLOW_PRO_DURABLE_GROUP_RECORD_REPORT_SCHEMA =
  "nexus.workflowPro.durableGroupRecordReport.v1";

export type WorkflowProDurableGroupRecordReport = {
  compilerManifestSchema?: string | null;
  contractSchema?: string | null;
  edgeCount: number | null;
  eventCount: number;
  groupId: string | null;
  latestEventCreatedAt?: string | null;
  latestEventId?: string | null;
  latestEventType?: string | null;
  nodeCount: number | null;
  recommendation: string;
  schema: typeof WORKFLOW_PRO_DURABLE_GROUP_RECORD_REPORT_SCHEMA;
  status: "no-group" | "not-loaded" | "matched" | "missing";
};

export function createWorkflowProDurableGroupRecordReport({
  events,
  groupId,
  loaded,
}: {
  events: SystemEventRecord[];
  groupId?: string | null;
  loaded: boolean;
}): WorkflowProDurableGroupRecordReport {
  if (!groupId) {
    return {
      edgeCount: null,
      eventCount: 0,
      groupId: null,
      nodeCount: null,
      recommendation: "Select a workflow group before checking durable group records.",
      schema: WORKFLOW_PRO_DURABLE_GROUP_RECORD_REPORT_SCHEMA,
      status: "no-group",
    };
  }

  if (!loaded) {
    return {
      edgeCount: null,
      eventCount: 0,
      groupId,
      nodeCount: null,
      recommendation: "Refresh workspace trace events to check durable group records.",
      schema: WORKFLOW_PRO_DURABLE_GROUP_RECORD_REPORT_SCHEMA,
      status: "not-loaded",
    };
  }

  const matches = events.filter(
    (event) =>
      event.eventType === "workflow.group_record.upserted" &&
      readString(event.metadata.workflowGroupId) === groupId,
  );
  const latest = matches[0];

  if (!latest) {
    return {
      edgeCount: null,
      eventCount: 0,
      groupId,
      nodeCount: null,
      recommendation:
        "No durable group record event was found in the loaded workspace events.",
      schema: WORKFLOW_PRO_DURABLE_GROUP_RECORD_REPORT_SCHEMA,
      status: "missing",
    };
  }

  return {
    compilerManifestSchema: readString(latest.metadata.compilerManifestSchema),
    contractSchema: readString(latest.metadata.contractSchema),
    edgeCount: readNumber(latest.metadata.edgeCount),
    eventCount: matches.length,
    groupId,
    latestEventCreatedAt: latest.createdAt,
    latestEventId: latest.id,
    latestEventType: latest.eventType,
    nodeCount: readNumber(latest.metadata.nodeCount),
    recommendation: "Durable group record event is loaded for the selected group.",
    schema: WORKFLOW_PRO_DURABLE_GROUP_RECORD_REPORT_SCHEMA,
    status: "matched",
  };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
