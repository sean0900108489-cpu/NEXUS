import type {
  WorkflowRun,
  WorkflowRuntimeGroupRef,
  WorkflowRuntimeLiteState,
  WorkflowRuntimeNodeStatus,
  WorkflowRuntimeRunStatus,
} from "@/lib/nexus-types";

export type WorkflowProRunHistoryGroup = {
  artifactCount: number;
  groupId: string;
  label: string;
  latestRunId: string | null;
  latestRunStatus: WorkflowRuntimeRunStatus | null;
  nodeCount: number;
  nodeIds: string[];
  runCount: number;
  statusCounts: Record<WorkflowRuntimeNodeStatus, number>;
};

export type WorkflowProRunHistoryGroupsReport = {
  groups: WorkflowProRunHistoryGroup[];
  runCount: number;
  schema: "nexus.workflowPro.runHistoryGroups.v1";
};

const DEFAULT_GROUP_ID = "workspace-root";

export function createWorkflowProRunHistoryGroupsReport(
  runtimeLite: WorkflowRuntimeLiteState | undefined,
): WorkflowProRunHistoryGroupsReport {
  const nodes = runtimeLite?.nodes ?? [];
  const runs = runtimeLite?.runs ?? [];
  const nodeGroupById = new Map<string, string>();
  const groupRefById = new Map<string, WorkflowRuntimeGroupRef>();
  const groups = new Map<string, WorkflowProRunHistoryGroup>();

  for (const node of nodes) {
    const groupId = node.group?.id ?? inferWorkflowRuntimeGroupId(node.id);
    const groupRef = node.group;
    const group = getOrCreateGroup(groups, groupId, groupRef);

    if (groupRef?.id) {
      groupRefById.set(groupRef.id, groupRef);
    }
    nodeGroupById.set(node.id, groupId);
    group.nodeIds.push(node.id);
    group.nodeCount += 1;
    group.statusCounts[node.status] += 1;
  }

  for (const run of runs) {
    const runGroupIds = inferWorkflowRunGroupIds(run, nodeGroupById);

    for (const groupId of runGroupIds) {
      const group = getOrCreateGroup(groups, groupId, run.group ?? groupRefById.get(groupId));

      group.runCount += 1;
      group.artifactCount += countRunArtifactsForGroup(run, groupId, nodeGroupById);

      if (!group.latestRunId || run.runId === runtimeLite?.lastRunId) {
        group.latestRunId = run.runId;
        group.latestRunStatus = run.status;
      }
    }
  }

  return {
    groups: [...groups.values()].sort((left, right) => {
      if (left.latestRunId && !right.latestRunId) {
        return -1;
      }

      if (!left.latestRunId && right.latestRunId) {
        return 1;
      }

      return left.label.localeCompare(right.label);
    }),
    runCount: runs.length,
    schema: "nexus.workflowPro.runHistoryGroups.v1",
  };
}

export function inferWorkflowRuntimeGroupId(nodeId: string) {
  const nodeMarker = "_node_";
  const markerIndex = nodeId.indexOf(nodeMarker);

  if (nodeId.startsWith("wf_group_") && markerIndex > 0) {
    return nodeId.slice(0, markerIndex);
  }

  return DEFAULT_GROUP_ID;
}

function getOrCreateGroup(
  groups: Map<string, WorkflowProRunHistoryGroup>,
  groupId: string,
  groupRef?: WorkflowRuntimeGroupRef,
) {
  const existing = groups.get(groupId);

  if (existing) {
    return existing;
  }

  const group: WorkflowProRunHistoryGroup = {
    artifactCount: 0,
    groupId,
    label: groupRef?.label?.trim() || createGroupLabel(groupId),
    latestRunId: null,
    latestRunStatus: null,
    nodeCount: 0,
    nodeIds: [],
    runCount: 0,
    statusCounts: createNodeStatusCountRecord(),
  };

  groups.set(groupId, group);

  return group;
}

function createGroupLabel(groupId: string) {
  if (groupId === DEFAULT_GROUP_ID) {
    return "Workspace Root";
  }

  return `Group ${groupId.replace(/^wf_group_/, "").slice(0, 8).toUpperCase()}`;
}

function createNodeStatusCountRecord(): Record<WorkflowRuntimeNodeStatus, number> {
  return {
    failed: 0,
    failed_interrupted: 0,
    idle: 0,
    queued: 0,
    running: 0,
    success: 0,
  };
}

function inferWorkflowRunGroupIds(
  run: WorkflowRun,
  nodeGroupById: Map<string, string>,
) {
  const groupIds = new Set<string>();

  if (run.group?.id) {
    groupIds.add(run.group.id);
  }

  for (const execution of run.nodeExecutions) {
    groupIds.add(nodeGroupById.get(execution.nodeId) ?? inferWorkflowRuntimeGroupId(execution.nodeId));
  }

  if (!groupIds.size) {
    groupIds.add(DEFAULT_GROUP_ID);
  }

  return groupIds;
}

function countRunArtifactsForGroup(
  run: WorkflowRun,
  groupId: string,
  nodeGroupById: Map<string, string>,
) {
  let count = 0;

  for (const execution of run.nodeExecutions) {
    const executionGroupId =
      nodeGroupById.get(execution.nodeId) ?? inferWorkflowRuntimeGroupId(execution.nodeId);

    if (executionGroupId !== groupId) {
      continue;
    }

    const artifactId = execution.outputSnapshot?.metadata.artifactId;
    const artifactVaultRecord = execution.outputSnapshot?.metadata.artifactVaultRecord;

    if (typeof artifactId === "string" && artifactId.trim()) {
      count += 1;
    }

    if (
      artifactVaultRecord &&
      typeof artifactVaultRecord === "object" &&
      "id" in artifactVaultRecord &&
      typeof artifactVaultRecord.id === "string" &&
      artifactVaultRecord.id.trim()
    ) {
      count += 1;
    }
  }

  return count;
}
