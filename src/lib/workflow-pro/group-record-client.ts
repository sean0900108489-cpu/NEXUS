import { nexusApiClient } from "@/lib/api/nexus-api-client";
import { NEXUS_ATTACHMENT_COMPILER_MANIFEST_SCHEMA } from "@/lib/attachments/attachment-compiler-registry";
import type {
  WorkflowGroupRecordWriteRequest,
  WorkflowGroupRecordWriteResponse,
  WorkflowRuntimeLiteState,
} from "@/lib/nexus-types";

export function createWorkflowGroupRecordPayload({
  groupId,
  runtimeLite,
  workspaceId,
}: {
  groupId: string;
  runtimeLite: WorkflowRuntimeLiteState;
  workspaceId: string;
}): WorkflowGroupRecordWriteRequest | null {
  const nodes = runtimeLite.nodes.filter((node) => node.group?.id === groupId);

  if (!nodes.length) {
    return null;
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = runtimeLite.edges.filter(
    (edge) =>
      edge.group?.id === groupId ||
      (nodeIds.has(edge.source) && nodeIds.has(edge.target)),
  );
  const group = nodes[0]?.group ?? edges[0]?.group;

  if (!group?.id) {
    return null;
  }

  return {
    compilerManifestSchema: NEXUS_ATTACHMENT_COMPILER_MANIFEST_SCHEMA,
    edges: edges.map((edge) => ({
      id: edge.id,
      ...(edge.label ? { label: edge.label } : {}),
      source: edge.source,
      target: edge.target,
    })),
    group,
    nodes: nodes.map((node) => ({
      id: node.id,
      label: readWorkflowNodeLabel(node.data),
      status: node.status,
      type: node.type,
    })),
    workflowId: group.id,
    workspaceId,
  };
}

export async function publishWorkflowGroupRecord({
  groupId,
  runtimeLite,
  userId,
  workspaceId,
}: {
  groupId: string;
  runtimeLite: WorkflowRuntimeLiteState;
  userId: string;
  workspaceId: string;
}) {
  const payload = createWorkflowGroupRecordPayload({
    groupId,
    runtimeLite,
    workspaceId,
  });

  if (!payload) {
    return null;
  }

  return nexusApiClient.post<
    WorkflowGroupRecordWriteResponse,
    WorkflowGroupRecordWriteRequest
  >("/api/v1/workflows/groups", payload, {
    userId,
    workspaceId,
  });
}

function readWorkflowNodeLabel(data: { label?: unknown }) {
  return typeof data.label === "string" && data.label.trim()
    ? data.label.trim()
    : undefined;
}
