import type {
  WorkflowGroupRecordWriteRequest,
  WorkflowRuntimeNodeType,
} from "@/lib/nexus-types";

import type { JsonValue } from "../primitives/metadata";
import type { BackendEvent } from "./events";

export const WORKFLOW_GROUP_RECORD_EVENT_SCHEMA =
  "nexus.workflowPro.groupRecord.v1";

export function createWorkflowGroupRecordEvent({
  occurredAt,
  requestId,
  record,
  traceId,
  userId,
}: {
  occurredAt?: string;
  record: WorkflowGroupRecordWriteRequest;
  requestId?: string;
  traceId?: string;
  userId?: string | null;
}): BackendEvent {
  const nodeTypes = countNodeTypes(record.nodes);
  const workflowId = record.workflowId?.trim() || record.group.id;

  return {
    name: "workflow.group_record.upserted",
    occurredAt: occurredAt ?? new Date().toISOString(),
    payload: {
      capabilityGaps: record.capabilityGaps ?? [],
      compilerManifestSchema: record.compilerManifestSchema ?? null,
      contractName: record.contract?.name ?? null,
      contractSchema: record.contract?.schema ?? null,
      contractVersion: record.contract?.version ?? null,
      edgeCount: record.edges.length,
      message: `Workflow group record stored for ${record.group.label ?? record.group.id}`,
      nodeCount: record.nodes.length,
      nodeTypes,
      schema: WORKFLOW_GROUP_RECORD_EVENT_SCHEMA,
      severity: "info",
      status: "stored",
      workflowGroupId: record.group.id,
      workflowGroupLabel: record.group.label ?? null,
      workflowGroupSource: record.group.source ?? null,
      workflowId,
    },
    status: "succeeded",
    trace: {
      requestId: requestId ?? `workflow-group-record-${record.group.id}`,
      resourceId: record.group.id,
      resourceType: "workflow.group",
      source: "agent",
      traceId: traceId ?? `workflow-group-record:${record.group.id}`,
      userId: userId ?? undefined,
      workspaceId: record.workspaceId,
    },
  };
}

function countNodeTypes(nodes: WorkflowGroupRecordWriteRequest["nodes"]) {
  const counts: Record<WorkflowRuntimeNodeType, number> = {
    "input.text": 0,
    "model.image": 0,
    "model.llm": 0,
    "node.file": 0,
    "output.text": 0,
  };

  for (const node of nodes) {
    counts[node.type] += 1;
  }

  return counts satisfies JsonValue;
}
