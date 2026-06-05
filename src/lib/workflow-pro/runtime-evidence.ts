import type {
  ContextPacket,
  NodeExecution,
  WorkflowRun,
  WorkflowRuntimeLiteState,
  WorkflowRuntimeNodeStatus,
  WorkflowRuntimeRunStatus,
  WorkflowRuntimeTraceSyncState,
} from "@/lib/nexus-types";

export type WorkflowProRuntimeExecutionEvidence = {
  artifactIds: string[];
  completedAt: string | null;
  error: string | null;
  inputPreview: string | null;
  latencyMs: number | null;
  nodeId: string;
  outputPreview: string | null;
  startedAt: string | null;
  status: WorkflowRuntimeNodeStatus;
};

export type WorkflowProRuntimeEvidenceReport = {
  latestRun: {
    artifactCount: number;
    completedAt: string | null;
    durationMs: number | null;
    error: string | null;
    nodeCount: number;
    runId: string;
    startedAt: string;
    status: WorkflowRuntimeRunStatus;
    traceSync: WorkflowRuntimeTraceSyncState | null;
  } | null;
  persistence: "local-workspace-runtime-snapshot";
  recommendations: string[];
  runCount: number;
  schema: "nexus.workflowPro.runtimeEvidence.v1";
  source: "workflow-runtime-lite";
  timeline: WorkflowProRuntimeExecutionEvidence[];
  totals: {
    artifactCount: number;
    failedExecutions: number;
    runningExecutions: number;
    successfulExecutions: number;
  };
  warnings: string[];
};

export type WorkflowProRuntimeEvidenceManifest = {
  createdAt: string;
  evidence: WorkflowProRuntimeEvidenceReport;
  nextPersistenceGate: string;
  regressionUse: {
    emptyStateWarning: string | null;
    screenSections: string[];
    sourceOfTruth: "runtimeLite.runs";
  };
  schema: "nexus.workflowPro.runtimeEvidenceManifest.v1";
  workspace: {
    id: string;
    name?: string;
  };
};

const DEFAULT_MAX_TIMELINE_ITEMS = 10;
const PREVIEW_MAX_CHARS = 180;

export function createWorkflowProRuntimeEvidenceReport(
  runtimeLite: WorkflowRuntimeLiteState | undefined,
  options: { maxTimelineItems?: number } = {},
): WorkflowProRuntimeEvidenceReport {
  const runs = runtimeLite?.runs ?? [];
  const latestRun = selectLatestWorkflowRun(runtimeLite);
  const timeline = (latestRun?.nodeExecutions ?? [])
    .slice(0, options.maxTimelineItems ?? DEFAULT_MAX_TIMELINE_ITEMS)
    .map(createExecutionEvidence);
  const artifactCount = countArtifacts(latestRun?.nodeExecutions ?? []);
  const warnings = createRuntimeEvidenceWarnings({
    latestRun,
    runCount: runs.length,
    timeline,
  });

  return {
    latestRun: latestRun
      ? {
          artifactCount,
          completedAt: latestRun.completedAt ?? null,
          durationMs: measureDurationMs(latestRun.startedAt, latestRun.completedAt),
          error: latestRun.error ?? null,
          nodeCount: latestRun.nodeExecutions.length,
          runId: latestRun.runId,
          startedAt: latestRun.startedAt,
          status: latestRun.status,
          traceSync: latestRun.traceSync ?? null,
        }
      : null,
    persistence: "local-workspace-runtime-snapshot",
    recommendations: createRuntimeEvidenceRecommendations({ latestRun, warnings }),
    runCount: runs.length,
    schema: "nexus.workflowPro.runtimeEvidence.v1",
    source: "workflow-runtime-lite",
    timeline,
    totals: {
      artifactCount,
      failedExecutions: timeline.filter((item) => isFailedStatus(item.status)).length,
      runningExecutions: timeline.filter((item) => item.status === "running").length,
      successfulExecutions: timeline.filter((item) => item.status === "success").length,
    },
    warnings,
  };
}

export function createWorkflowProRuntimeEvidenceManifest({
  createdAt = new Date().toISOString(),
  evidence,
  workspaceId,
  workspaceName,
}: {
  createdAt?: string;
  evidence: WorkflowProRuntimeEvidenceReport;
  workspaceId: string;
  workspaceName?: string;
}): WorkflowProRuntimeEvidenceManifest {
  return {
    createdAt,
    evidence,
    nextPersistenceGate:
      "Persist this local runtime evidence through a backend trace table after the runtime evidence contract is stable.",
    regressionUse: {
      emptyStateWarning: evidence.warnings[0] ?? null,
      screenSections: [
        "Trace Viewer",
        "Local Workflow Evidence",
        "Runs",
        "Latest",
        "Artifacts",
      ],
      sourceOfTruth: "runtimeLite.runs",
    },
    schema: "nexus.workflowPro.runtimeEvidenceManifest.v1",
    workspace: {
      id: workspaceId,
      ...(workspaceName ? { name: workspaceName } : {}),
    },
  };
}

function selectLatestWorkflowRun(runtimeLite: WorkflowRuntimeLiteState | undefined) {
  if (!runtimeLite?.runs.length) {
    return null;
  }

  if (runtimeLite.lastRunId) {
    const lastRun = runtimeLite.runs.find((run) => run.runId === runtimeLite.lastRunId);

    if (lastRun) {
      return lastRun;
    }
  }

  return runtimeLite.runs[0] ?? null;
}

function createExecutionEvidence(
  execution: NodeExecution,
): WorkflowProRuntimeExecutionEvidence {
  return {
    artifactIds: collectArtifactIds(execution.outputSnapshot),
    completedAt: execution.completedAt ?? null,
    error: execution.error ?? null,
    inputPreview: createPacketPreview(execution.inputSnapshot),
    latencyMs: execution.latencyMs ?? null,
    nodeId: execution.nodeId,
    outputPreview: createPacketPreview(execution.outputSnapshot),
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

function createPacketPreview(packet: ContextPacket | null | undefined) {
  const text = packet?.displayText?.trim() || packet?.rawText?.trim();

  if (!text) {
    return null;
  }

  return text.length > PREVIEW_MAX_CHARS
    ? `${text.slice(0, PREVIEW_MAX_CHARS - 1)}...`
    : text;
}

function countArtifacts(executions: NodeExecution[]) {
  return executions.reduce(
    (count, execution) => count + collectArtifactIds(execution.outputSnapshot).length,
    0,
  );
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

function createRuntimeEvidenceWarnings({
  latestRun,
  runCount,
  timeline,
}: {
  latestRun: WorkflowRun | null;
  runCount: number;
  timeline: WorkflowProRuntimeExecutionEvidence[];
}) {
  const warnings: string[] = [];

  if (!latestRun || runCount === 0) {
    warnings.push("No workflow runtime runs have been recorded in the local snapshot yet.");
  }

  if (latestRun?.status === "running") {
    warnings.push("Latest workflow run is still running; downstream evidence may change.");
  }

  if (latestRun?.status === "failed" || latestRun?.status === "failed_interrupted") {
    warnings.push("Latest workflow run did not complete successfully; inspect failed node evidence before re-running.");
  }

  if (
    latestRun?.completedAt &&
    (!latestRun.traceSync || latestRun.traceSync.status === "failed")
  ) {
    warnings.push("Latest workflow run has no confirmed durable backend trace yet.");
  }

  if (timeline.some((item) => item.outputPreview === null && item.status === "success")) {
    warnings.push("At least one successful node has no output preview in the runtime snapshot.");
  }

  return warnings;
}

function createRuntimeEvidenceRecommendations({
  latestRun,
  warnings,
}: {
  latestRun: WorkflowRun | null;
  warnings: string[];
}) {
  if (!latestRun) {
    return [
      "Run the workflow from an input node or Start All before asking Brain to debug execution quality.",
    ];
  }

  const recommendations = [
    "Use this report as Brain-readable run evidence before proposing node repairs or workflow upgrades.",
  ];

  if (warnings.length) {
    recommendations.push(
      "Treat warnings as constraints in the next Brain planning pass instead of hiding them from the operator.",
    );
  }

  if (latestRun.traceSync?.status === "syncing") {
    recommendations.push("Durable backend trace sync is still in progress.");
  }

  if (latestRun.traceSync?.status === "synced") {
    recommendations.push("Durable backend trace evidence is available through the Trace Viewer.");
  }

  if (latestRun.traceSync?.status === "failed") {
    recommendations.push(
      "Inspect authentication and workspace permission before relying on durable backend trace evidence.",
    );
  }

  return recommendations;
}

function isFailedStatus(status: WorkflowRuntimeNodeStatus) {
  return status === "failed" || status === "failed_interrupted";
}
