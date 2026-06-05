import type {
  SystemEventRecord,
  WorkflowRuntimeTraceSyncState,
  WorkflowRuntimeRunStatus,
} from "@/lib/nexus-types";

export type WorkflowRuntimeTraceCorrelationStatus =
  | "no-local-run"
  | "local-only"
  | "syncing"
  | "failed"
  | "synced-unloaded"
  | "matched"
  | "missing";

export type WorkflowRuntimeTraceCorrelationInput = {
  events?: SystemEventRecord[];
  latestRun: {
    runId: string;
    status: WorkflowRuntimeRunStatus;
    traceSync: WorkflowRuntimeTraceSyncState | null;
  } | null;
  loaded?: boolean;
};

export type WorkflowRuntimeTraceCorrelationReport = {
  eventCount: number;
  latestEventType: string | null;
  recommendation: string;
  runId: string | null;
  schema: "nexus.workflowPro.runtimeTraceCorrelation.v1";
  status: WorkflowRuntimeTraceCorrelationStatus;
  traceId: string | null;
};

export function createWorkflowRuntimeTraceCorrelationReport({
  events = [],
  latestRun,
  loaded = false,
}: WorkflowRuntimeTraceCorrelationInput): WorkflowRuntimeTraceCorrelationReport {
  if (!latestRun) {
    return createReport({
      recommendation: "Run a workflow before checking durable trace correlation.",
      status: "no-local-run",
    });
  }

  const traceSync = latestRun.traceSync;

  if (!traceSync) {
    return createReport({
      recommendation: "This run only has local evidence. Durable trace sync has not started.",
      runId: latestRun.runId,
      status: "local-only",
    });
  }

  if (traceSync.status === "syncing") {
    return createReport({
      recommendation: "Durable trace sync is still in progress.",
      runId: latestRun.runId,
      status: "syncing",
      traceId: traceSync.traceId ?? null,
    });
  }

  if (traceSync.status === "failed") {
    return createReport({
      recommendation: "Trace sync failed. Inspect authentication and workspace permissions.",
      runId: latestRun.runId,
      status: "failed",
      traceId: traceSync.traceId ?? null,
    });
  }

  if (traceSync.status === "skipped") {
    return createReport({
      recommendation: "Trace sync was skipped for this run.",
      runId: latestRun.runId,
      status: "local-only",
      traceId: traceSync.traceId ?? null,
    });
  }

  if (!loaded) {
    return createReport({
      recommendation: "Durable trace was marked synced; load matching backend events to confirm.",
      runId: latestRun.runId,
      status: "synced-unloaded",
      traceId: traceSync.traceId ?? null,
    });
  }

  const matchingEvents = events.filter((event) =>
    isMatchingWorkflowRuntimeTraceEvent(event, {
      runId: latestRun.runId,
      traceId: traceSync.traceId,
    }),
  );

  if (matchingEvents.length) {
    return createReport({
      eventCount: matchingEvents.length,
      latestEventType: matchingEvents[0]?.eventType ?? null,
      recommendation: "Durable backend trace event is correlated with the latest local run.",
      runId: latestRun.runId,
      status: "matched",
      traceId: traceSync.traceId ?? null,
    });
  }

  return createReport({
    recommendation: "Trace sync says synced, but no matching backend event was loaded.",
    runId: latestRun.runId,
    status: "missing",
    traceId: traceSync.traceId ?? null,
  });
}

function isMatchingWorkflowRuntimeTraceEvent(
  event: SystemEventRecord,
  input: { runId: string; traceId?: string | null },
) {
  return (
    event.eventType.startsWith("workflow.runtime_lite") &&
    (event.traceId === input.traceId || event.resourceId === input.runId)
  );
}

function createReport(
  input: Partial<WorkflowRuntimeTraceCorrelationReport> & {
    recommendation: string;
    status: WorkflowRuntimeTraceCorrelationStatus;
  },
): WorkflowRuntimeTraceCorrelationReport {
  return {
    eventCount: input.eventCount ?? 0,
    latestEventType: input.latestEventType ?? null,
    recommendation: input.recommendation,
    runId: input.runId ?? null,
    schema: "nexus.workflowPro.runtimeTraceCorrelation.v1",
    status: input.status,
    traceId: input.traceId ?? null,
  };
}
