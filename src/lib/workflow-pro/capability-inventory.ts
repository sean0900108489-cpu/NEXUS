import type {
  WorkflowRuntimeLiteState,
  WorkflowRuntimeNodeStatus,
  WorkflowRuntimeNodeType,
  WorkflowRuntimeRunStatus,
} from "@/lib/nexus-types";
import {
  WORKFLOW_RUNTIME_NODE_DEFINITIONS,
  WORKFLOW_RUNTIME_NODE_TYPES,
} from "@/lib/workflow-runtime-lite/registry";
import { validateWorkflowRuntimeLiteTopology } from "@/lib/workflow-runtime-lite/topology";

export type WorkflowProCapabilityState = "available" | "planned";

export type WorkflowProNodeCapability = {
  description: string;
  handles: Array<{
    id: string;
    kind: "source" | "target";
    label: string;
  }>;
  label: string;
  state: WorkflowProCapabilityState;
  type: WorkflowRuntimeNodeType;
};

export type WorkflowProCompilerCapability = {
  id: string;
  mode: "noop" | "transform" | "extract" | "embed" | "custom";
  state: WorkflowProCapabilityState;
  summary: string;
};

export type WorkflowProArtifactPolicyCapability = {
  id: string;
  state: WorkflowProCapabilityState;
  summary: string;
};

export type WorkflowProCapabilityInventory = {
  artifactPolicies: WorkflowProArtifactPolicyCapability[];
  compilers: WorkflowProCompilerCapability[];
  nodeTypes: WorkflowProNodeCapability[];
  notAvailableYet: string[];
  schema: "nexus.workflowPro.capabilityInventory.v1";
};

export type WorkflowProRuntimeSummary = {
  edgeCount: number;
  lastError: string | null;
  lastRunId: string | null;
  lastRunStatus: WorkflowRuntimeRunStatus | null;
  nodeCount: number;
  nodeStatusCounts: Record<WorkflowRuntimeNodeStatus, number>;
  nodeTypeCounts: Record<WorkflowRuntimeNodeType, number>;
  runCount: number;
};

export type WorkflowProRuntimeCapabilityReport = {
  executionPolicy: {
    mode: "ready-parallel";
    nativeParallelExecution: true;
    pauseControl: "abort-signal";
    workflowTimeout: "none";
  };
  graphShape: {
    disconnectedNodeIds: string[];
    fanInNodeIds: string[];
    fanOutNodeIds: string[];
    inputNodeCount: number;
  };
  recommendations: string[];
  schema: "nexus.workflowPro.runtimeCapabilityReport.v1";
  support: {
    contextMerge: true;
    fileNoopCompiler: true;
    imageGenerationBoundary: true;
    joinNode: false;
    loops: false;
    nativeParallelExecution: true;
    singleStartInput: true;
  };
  validation: {
    error: string | null;
    ok: boolean;
    runnableEdgeCount: number;
    runnableNodeCount: number;
  };
};

export function createWorkflowProCapabilityInventory(): WorkflowProCapabilityInventory {
  return {
    artifactPolicies: [
      {
        id: "artifact.generated-media.history",
        state: "available",
        summary: "Generated image output can be persisted, listed, previewed, and downloaded through the existing artifact vault.",
      },
      {
        id: "artifact.file.raw-compiled-link",
        state: "planned",
        summary: "File node raw artifacts and compiled artifacts need an explicit link before advanced compilers land.",
      },
    ],
    compilers: [
      {
        id: "compiler.noop",
        mode: "noop",
        state: "available",
        summary: "Existing attachment compiler metadata can represent files that do not need transformation.",
      },
      {
        id: "compiler.file.transform",
        mode: "transform",
        state: "planned",
        summary: "Reserved slot for zip/pdf/video/image extraction, OCR, frame extraction, embedding, or custom package transforms.",
      },
    ],
    nodeTypes: WORKFLOW_RUNTIME_NODE_TYPES.map((type) => {
      const definition = WORKFLOW_RUNTIME_NODE_DEFINITIONS[type];

      return {
        description: definition.description,
        handles: definition.handles.map((handle) => ({ ...handle })),
        label: definition.label,
        state: "available",
        type,
      };
    }),
    notAvailableYet: [
      "workflow.schema.validator",
      "workflow.import.apply",
      "workflow.brain.review.apply",
      "node.condition.ifElse",
      "node.parallel.join",
      "model.video",
      "compiler.zip.extract",
      "compiler.media.transcode",
    ],
    schema: "nexus.workflowPro.capabilityInventory.v1",
  };
}

export function summarizeWorkflowProRuntime(
  runtimeLite: WorkflowRuntimeLiteState | undefined,
): WorkflowProRuntimeSummary {
  const nodeTypeCounts = createNodeTypeCountRecord();
  const nodeStatusCounts = createNodeStatusCountRecord();
  const runs = runtimeLite?.runs ?? [];
  const lastRun =
    runtimeLite?.lastRunId
      ? runs.find((run) => run.runId === runtimeLite.lastRunId)
      : runs.at(0);

  for (const node of runtimeLite?.nodes ?? []) {
    nodeTypeCounts[node.type] += 1;
    nodeStatusCounts[node.status] += 1;
  }

  return {
    edgeCount: runtimeLite?.edges.length ?? 0,
    lastError: runtimeLite?.lastError ?? null,
    lastRunId: runtimeLite?.lastRunId ?? null,
    lastRunStatus: lastRun?.status ?? null,
    nodeCount: runtimeLite?.nodes.length ?? 0,
    nodeStatusCounts,
    nodeTypeCounts,
    runCount: runs.length,
  };
}

export function createWorkflowProRuntimeCapabilityReport(
  runtimeLite: WorkflowRuntimeLiteState | undefined,
): WorkflowProRuntimeCapabilityReport {
  const nodes = runtimeLite?.nodes ?? [];
  const edges = runtimeLite?.edges ?? [];
  const incomingCounts = countEdgesByNode(edges, "target");
  const outgoingCounts = countEdgesByNode(edges, "source");
  const fanInNodeIds = nodes
    .filter((node) => (incomingCounts.get(node.id) ?? 0) > 1)
    .map((node) => node.id);
  const fanOutNodeIds = nodes
    .filter((node) => (outgoingCounts.get(node.id) ?? 0) > 1)
    .map((node) => node.id);
  const disconnectedNodeIds = nodes
    .filter(
      (node) =>
        nodes.length > 1 &&
        (incomingCounts.get(node.id) ?? 0) === 0 &&
        (outgoingCounts.get(node.id) ?? 0) === 0,
    )
    .map((node) => node.id);
  const validation = validateWorkflowRuntimeLiteTopology({ edges, nodes });
  const recommendations = createRuntimeCapabilityRecommendations({
    disconnectedNodeIds,
    fanInNodeIds,
    fanOutNodeIds,
    validationError: validation.ok ? null : validation.error,
  });

  return {
    executionPolicy: {
      mode: "ready-parallel",
      nativeParallelExecution: true,
      pauseControl: "abort-signal",
      workflowTimeout: "none",
    },
    graphShape: {
      disconnectedNodeIds,
      fanInNodeIds,
      fanOutNodeIds,
      inputNodeCount: nodes.filter((node) => node.type === "input.text").length,
    },
    recommendations,
    schema: "nexus.workflowPro.runtimeCapabilityReport.v1",
    support: {
      contextMerge: true,
      fileNoopCompiler: true,
      imageGenerationBoundary: true,
      joinNode: false,
      loops: false,
      nativeParallelExecution: true,
      singleStartInput: true,
    },
    validation: {
      error: validation.ok ? null : validation.error,
      ok: validation.ok,
      runnableEdgeCount: validation.ok ? validation.edges.length : 0,
      runnableNodeCount: validation.ok ? validation.path.length : 0,
    },
  };
}

function createNodeTypeCountRecord(): Record<WorkflowRuntimeNodeType, number> {
  return WORKFLOW_RUNTIME_NODE_TYPES.reduce(
    (record, type) => ({
      ...record,
      [type]: 0,
    }),
    {} as Record<WorkflowRuntimeNodeType, number>,
  );
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

function countEdgesByNode(
  edges: WorkflowRuntimeLiteState["edges"],
  field: "source" | "target",
) {
  const counts = new Map<string, number>();

  for (const edge of edges) {
    counts.set(edge[field], (counts.get(edge[field]) ?? 0) + 1);
  }

  return counts;
}

function createRuntimeCapabilityRecommendations({
  disconnectedNodeIds,
  fanInNodeIds,
  fanOutNodeIds,
  validationError,
}: {
  disconnectedNodeIds: string[];
  fanInNodeIds: string[];
  fanOutNodeIds: string[];
  validationError: string | null;
}) {
  const recommendations: string[] = [];

  if (validationError) {
    recommendations.push(`Resolve topology validation before execution: ${validationError}`);
  }

  if (fanOutNodeIds.length) {
    recommendations.push(
      "Fan-out branches can run as ready-node parallel batches; add an explicit join node before treating merge behavior as user-configurable.",
    );
  }

  if (fanInNodeIds.length) {
    recommendations.push(
      "Fan-in currently merges ContextPackets automatically; add an explicit join node before treating merge behavior as user-configurable.",
    );
  }

  if (disconnectedNodeIds.length) {
    recommendations.push(
      "Disconnected draft nodes are safe on the canvas, but a runnable workflow group should be selected from one populated input.",
    );
  }

  if (!recommendations.length) {
    recommendations.push(
      "Current graph shape is compatible with RuntimeLite ready-node parallel execution.",
    );
  }

  return recommendations;
}
