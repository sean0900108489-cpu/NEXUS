import {
  NexusApiError,
  nexusApiClient,
} from "@/lib/api/nexus-api-client";
import type {
  NodeExecution,
  WorkflowRun,
  WorkflowRuntimeTraceNodeExecutionInput,
  WorkflowRuntimeTraceWriteRequest,
  WorkflowRuntimeTraceWriteResponse,
} from "@/lib/nexus-types";

export type PublishWorkflowRuntimeTraceInput = {
  run: WorkflowRun;
  userId?: string | null;
  workspaceId: string;
};

export async function publishWorkflowRuntimeTrace({
  run,
  userId,
  workspaceId,
}: PublishWorkflowRuntimeTraceInput) {
  const request = createWorkflowRuntimeTraceWriteRequestFromRun({
    run,
    workspaceId,
  });

  return nexusApiClient.post<
    WorkflowRuntimeTraceWriteResponse,
    WorkflowRuntimeTraceWriteRequest
  >("/api/v1/workflows/runtime-trace", request, {
    traceId: request.traceId,
    userId: userId ?? undefined,
    workspaceId,
  });
}

export function createWorkflowRuntimeTraceWriteRequestFromRun({
  occurredAt = new Date().toISOString(),
  run,
  workspaceId,
}: {
  occurredAt?: string;
  run: WorkflowRun;
  workspaceId: string;
}): WorkflowRuntimeTraceWriteRequest {
  return {
    occurredAt,
    run: {
      ...(run.completedAt ? { completedAt: run.completedAt } : {}),
      ...(run.group ? { group: run.group } : {}),
      nodeExecutions: run.nodeExecutions.map(createNodeExecutionTraceInput),
      runId: run.runId,
      startedAt: run.startedAt,
      status: run.status,
      workflowId: run.workflowId,
    },
    traceId: createWorkflowRuntimeTraceId(run.runId),
    workspaceId,
  };
}

export function createWorkflowRuntimeTraceSyncError(error: unknown) {
  if (error instanceof NexusApiError) {
    return {
      error: `${error.code}: ${error.message}`,
      retryable: error.retryable,
    };
  }

  return {
    error: error instanceof Error ? error.message : "Workflow trace sync failed.",
    retryable: true,
  };
}

function createNodeExecutionTraceInput(
  execution: NodeExecution,
): WorkflowRuntimeTraceNodeExecutionInput {
  const artifactReferences = collectArtifactReferences(execution);

  return {
    ...artifactReferences,
    ...(execution.completedAt ? { completedAt: execution.completedAt } : {}),
    ...(execution.latencyMs !== undefined && execution.latencyMs !== null
      ? { latencyMs: execution.latencyMs }
      : {}),
    ...(execution.startedAt ? { startedAt: execution.startedAt } : {}),
    nodeId: execution.nodeId,
    runId: execution.runId,
    status: execution.status,
  };
}

function collectArtifactReferences(execution: NodeExecution) {
  const metadata = execution.outputSnapshot?.metadata;
  const artifactId = metadata?.artifactId;
  const artifactVaultRecord = metadata?.artifactVaultRecord;
  const references: Pick<
    WorkflowRuntimeTraceNodeExecutionInput,
    "artifactId" | "artifactVaultRecordId"
  > = {};

  if (typeof artifactId === "string" && artifactId.trim()) {
    references.artifactId = artifactId.trim();
  }

  if (
    artifactVaultRecord &&
    typeof artifactVaultRecord === "object" &&
    "id" in artifactVaultRecord &&
    typeof artifactVaultRecord.id === "string" &&
    artifactVaultRecord.id.trim()
  ) {
    references.artifactVaultRecordId = artifactVaultRecord.id.trim();
  }

  return references;
}

function createWorkflowRuntimeTraceId(runId: string) {
  return `workflow-runtime:${runId}`;
}
