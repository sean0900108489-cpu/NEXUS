import type {
  NodeExecution,
  WorkflowRun,
  WorkflowRuntimeGroupRef,
  WorkflowRuntimeLiteState,
  WorkflowRuntimeNodeStatus,
  WorkflowRuntimeRunStatus,
} from "@/lib/nexus-types";

import type { JsonValue } from "../primitives/metadata";
import type { BackendStatus } from "../primitives/status";
import type { BackendEvent } from "./events";
import type { ObservabilityEventSeverity } from "@/lib/nexus-types";

export const WORKFLOW_RUNTIME_TRACE_EVENT_SCHEMA =
  "nexus.workflowRuntime.traceEvent.v1";

export type WorkflowRuntimeRunEventInput = {
  occurredAt?: string;
  requestId?: string;
  run: WorkflowRun;
  runtimeLite?: WorkflowRuntimeLiteState;
  traceId?: string;
  userId?: string | null;
  workspaceId: string;
};

export function createWorkflowRuntimeRunEvent({
  occurredAt,
  requestId,
  run,
  runtimeLite,
  traceId,
  userId,
  workspaceId,
}: WorkflowRuntimeRunEventInput): BackendEvent {
  const group = resolveWorkflowRunGroup(run, runtimeLite);
  const nodeStatuses = countNodeStatuses(run.nodeExecutions);
  const artifactCount = countRunArtifacts(run);
  const status = mapWorkflowRunStatus(run.status);
  const severity = mapWorkflowRunSeverity(run.status);
  const durationMs = calculateRunDurationMs(run);

  return {
    name: createWorkflowRuntimeEventName(run.status),
    occurredAt: occurredAt ?? run.completedAt ?? run.startedAt,
    payload: {
      artifactCount,
      durationMs,
      message: createWorkflowRuntimeEventMessage(run, group),
      nodeCount: run.nodeExecutions.length,
      nodeStatuses,
      schema: WORKFLOW_RUNTIME_TRACE_EVENT_SCHEMA,
      severity,
      status: run.status,
      workflowGroupId: group?.id ?? "workspace-root",
      workflowGroupLabel: group?.label ?? null,
      workflowGroupSource: group?.source ?? null,
      workflowId: run.workflowId,
      workflowRunId: run.runId,
    },
    status,
    trace: {
      requestId: requestId ?? `workflow-runtime-${run.runId}`,
      resourceId: run.runId,
      resourceType: "workflow.run",
      source: "agent",
      traceId: traceId ?? `workflow-runtime:${run.runId}`,
      userId: userId ?? undefined,
      workspaceId,
    },
  };
}

function createWorkflowRuntimeEventName(status: WorkflowRuntimeRunStatus) {
  if (status === "success") {
    return "workflow.runtime_lite.run.succeeded";
  }

  if (status === "failed" || status === "failed_interrupted") {
    return "workflow.runtime_lite.run.failed";
  }

  return "workflow.runtime_lite.run.updated";
}

function createWorkflowRuntimeEventMessage(
  run: WorkflowRun,
  group: WorkflowRuntimeGroupRef | undefined,
) {
  const groupLabel = group?.label ?? group?.id ?? "workspace-root";

  return `Workflow Runtime Lite ${run.status} for ${groupLabel}`;
}

function mapWorkflowRunStatus(status: WorkflowRuntimeRunStatus): BackendStatus {
  if (status === "success") {
    return "succeeded";
  }

  if (status === "failed" || status === "failed_interrupted") {
    return "failed";
  }

  if (status === "queued") {
    return "queued";
  }

  return "running";
}

function mapWorkflowRunSeverity(
  status: WorkflowRuntimeRunStatus,
): ObservabilityEventSeverity {
  return status === "failed" || status === "failed_interrupted" ? "error" : "info";
}

function resolveWorkflowRunGroup(
  run: WorkflowRun,
  runtimeLite: WorkflowRuntimeLiteState | undefined,
) {
  if (run.group?.id) {
    return run.group;
  }

  const groupByNodeId = new Map<string, WorkflowRuntimeGroupRef>();

  for (const node of runtimeLite?.nodes ?? []) {
    if (node.group?.id) {
      groupByNodeId.set(node.id, node.group);
    }
  }

  for (const execution of run.nodeExecutions) {
    const group = groupByNodeId.get(execution.nodeId);

    if (group) {
      return group;
    }
  }

  return undefined;
}

function countNodeStatuses(executions: NodeExecution[]) {
  const counts: Record<WorkflowRuntimeNodeStatus, number> = {
    failed: 0,
    failed_interrupted: 0,
    idle: 0,
    queued: 0,
    running: 0,
    success: 0,
  };

  for (const execution of executions) {
    counts[execution.status] += 1;
  }

  return counts satisfies JsonValue;
}

function countRunArtifacts(run: WorkflowRun) {
  let count = 0;

  for (const execution of run.nodeExecutions) {
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

function calculateRunDurationMs(run: WorkflowRun) {
  if (!run.completedAt) {
    return null;
  }

  const startedAt = Date.parse(run.startedAt);
  const completedAt = Date.parse(run.completedAt);

  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt)) {
    return null;
  }

  return Math.max(0, completedAt - startedAt);
}
