import type {
  ContextPacket,
  NodeExecution,
  SystemEventRecord,
  WorkflowRun,
  WorkflowRuntimeLiteState,
  WorkflowRuntimeNodeStatus,
  WorkflowRuntimeRunStatus,
  WorkflowRuntimeTraceSyncState,
} from "@/lib/nexus-types";

import {
  createWorkflowProRunHistoryGroupsReport,
  inferWorkflowRuntimeGroupId,
  type WorkflowProRunHistoryGroup,
} from "./run-history-groups";
import {
  createWorkflowRuntimeTraceCorrelationReport,
  type WorkflowRuntimeTraceCorrelationReport,
} from "./runtime-trace-correlation";

export type WorkflowProRunGroupExecutionSummary = {
  artifactIds: string[];
  completedAt: string | null;
  error: string | null;
  latencyMs: number | null;
  nodeId: string;
  startedAt: string | null;
  status: WorkflowRuntimeNodeStatus;
};

export type WorkflowProRunGroupInspectorReport = {
  artifactIds: string[];
  group: WorkflowProRunHistoryGroup | null;
  latestRun: {
    completedAt: string | null;
    durationMs: number | null;
    error: string | null;
    executions: WorkflowProRunGroupExecutionSummary[];
    runId: string;
    startedAt: string;
    status: WorkflowRuntimeRunStatus;
    traceSync: WorkflowRuntimeTraceSyncState | null;
  } | null;
  recommendation: string;
  schema: "nexus.workflowPro.runGroupInspector.v1";
  traceCorrelation: WorkflowRuntimeTraceCorrelationReport;
};

export function createWorkflowProRunGroupInspectorReport({
  events = [],
  eventsLoaded = false,
  eventsTraceId = null,
  groupId,
  runtimeLite,
}: {
  events?: SystemEventRecord[];
  eventsLoaded?: boolean;
  eventsTraceId?: string | null;
  groupId?: string | null;
  runtimeLite?: WorkflowRuntimeLiteState;
}): WorkflowProRunGroupInspectorReport {
  const groupsReport = createWorkflowProRunHistoryGroupsReport(runtimeLite);
  const group =
    groupsReport.groups.find((candidate) => candidate.groupId === groupId) ??
    groupsReport.groups[0] ??
    null;

  if (!group) {
    return createReport({
      group: null,
      latestRun: null,
      recommendation:
        "No workflow group is available yet. Add or import a workflow group before inspecting run evidence.",
      traceCorrelation: createWorkflowRuntimeTraceCorrelationReport({ latestRun: null }),
    });
  }

  const nodeGroupById = createNodeGroupIndex(runtimeLite);
  const latestRun = selectLatestRunForGroup(runtimeLite, group.groupId, nodeGroupById);
  const executions = (latestRun?.nodeExecutions ?? [])
    .filter((execution) => belongsToGroup(execution.nodeId, group.groupId, nodeGroupById))
    .map(createExecutionSummary);
  const artifactIds = [...new Set(executions.flatMap((execution) => execution.artifactIds))];
  const traceSync = latestRun?.traceSync ?? null;
  const traceLoaded =
    Boolean(
      traceSync?.traceId &&
        eventsLoaded &&
        eventsTraceId &&
        eventsTraceId === traceSync.traceId,
    ) || Boolean(traceSync?.traceId && eventsLoaded && !eventsTraceId);
  const traceCorrelation = createWorkflowRuntimeTraceCorrelationReport({
    events,
    latestRun: latestRun
      ? {
          runId: latestRun.runId,
          status: latestRun.status,
          traceSync,
        }
      : null,
    loaded: traceLoaded,
  });

  return createReport({
    artifactIds,
    group,
    latestRun: latestRun
      ? {
          completedAt: latestRun.completedAt ?? null,
          durationMs: measureDurationMs(latestRun.startedAt, latestRun.completedAt),
          error: latestRun.error ?? null,
          executions,
          runId: latestRun.runId,
          startedAt: latestRun.startedAt,
          status: latestRun.status,
          traceSync,
        }
      : null,
    recommendation: createRecommendation({ group, latestRun, traceCorrelation }),
    traceCorrelation,
  });
}

function createReport(
  input: Omit<WorkflowProRunGroupInspectorReport, "artifactIds" | "schema"> & {
    artifactIds?: string[];
  },
): WorkflowProRunGroupInspectorReport {
  return {
    artifactIds: input.artifactIds ?? [],
    group: input.group,
    latestRun: input.latestRun,
    recommendation: input.recommendation,
    schema: "nexus.workflowPro.runGroupInspector.v1",
    traceCorrelation: input.traceCorrelation,
  };
}

function createNodeGroupIndex(runtimeLite: WorkflowRuntimeLiteState | undefined) {
  const index = new Map<string, string>();

  for (const node of runtimeLite?.nodes ?? []) {
    index.set(node.id, node.group?.id ?? inferWorkflowRuntimeGroupId(node.id));
  }

  return index;
}

function selectLatestRunForGroup(
  runtimeLite: WorkflowRuntimeLiteState | undefined,
  groupId: string,
  nodeGroupById: Map<string, string>,
) {
  const runs = (runtimeLite?.runs ?? []).filter((run) =>
    runBelongsToGroup(run, groupId, nodeGroupById),
  );

  if (!runs.length) {
    return null;
  }

  if (runtimeLite?.lastRunId) {
    const latest = runs.find((run) => run.runId === runtimeLite.lastRunId);

    if (latest) {
      return latest;
    }
  }

  return runs
    .slice()
    .sort(
      (left, right) =>
        Date.parse(right.completedAt ?? right.startedAt) -
        Date.parse(left.completedAt ?? left.startedAt),
    )[0];
}

function runBelongsToGroup(
  run: WorkflowRun,
  groupId: string,
  nodeGroupById: Map<string, string>,
) {
  if (run.group?.id === groupId) {
    return true;
  }

  return run.nodeExecutions.some((execution) =>
    belongsToGroup(execution.nodeId, groupId, nodeGroupById),
  );
}

function belongsToGroup(
  nodeId: string,
  groupId: string,
  nodeGroupById: Map<string, string>,
) {
  return (nodeGroupById.get(nodeId) ?? inferWorkflowRuntimeGroupId(nodeId)) === groupId;
}

function createExecutionSummary(
  execution: NodeExecution,
): WorkflowProRunGroupExecutionSummary {
  return {
    artifactIds: collectArtifactIds(execution.outputSnapshot),
    completedAt: execution.completedAt ?? null,
    error: execution.error ?? null,
    latencyMs: execution.latencyMs ?? null,
    nodeId: execution.nodeId,
    startedAt: execution.startedAt ?? null,
    status: execution.status,
  };
}

function collectArtifactIds(packet: ContextPacket | null | undefined) {
  const ids = new Set<string>();
  const artifactId = packet?.metadata.artifactId;
  const artifactVaultRecord = packet?.metadata.artifactVaultRecord;

  if (typeof artifactId === "string" && artifactId.trim()) {
    ids.add(artifactId);
  }

  if (
    artifactVaultRecord &&
    typeof artifactVaultRecord === "object" &&
    "id" in artifactVaultRecord &&
    typeof artifactVaultRecord.id === "string" &&
    artifactVaultRecord.id.trim()
  ) {
    ids.add(artifactVaultRecord.id);
  }

  return [...ids];
}

function measureDurationMs(startedAt: string, completedAt: string | null | undefined) {
  if (!completedAt) {
    return null;
  }

  const started = Date.parse(startedAt);
  const completed = Date.parse(completedAt);

  if (!Number.isFinite(started) || !Number.isFinite(completed)) {
    return null;
  }

  return Math.max(0, completed - started);
}

function createRecommendation({
  group,
  latestRun,
  traceCorrelation,
}: {
  group: WorkflowProRunHistoryGroup;
  latestRun: WorkflowRun | null;
  traceCorrelation: WorkflowRuntimeTraceCorrelationReport;
}) {
  if (!latestRun) {
    return `${group.label} has not run yet. Start this workflow group to collect local and durable evidence.`;
  }

  if (latestRun.status === "running") {
    return `${group.label} is still running. Keep the inspector open until node evidence settles.`;
  }

  if (latestRun.status === "failed" || latestRun.status === "failed_interrupted") {
    return `${group.label} failed. Inspect failed node executions before re-running.`;
  }

  if (traceCorrelation.status !== "matched") {
    return traceCorrelation.recommendation;
  }

  return `${group.label} has local run evidence and a matching durable backend trace.`;
}
