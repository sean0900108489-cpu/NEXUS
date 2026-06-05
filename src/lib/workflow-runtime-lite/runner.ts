import type {
  ContextPacket,
  NodeExecution,
  WorkflowNodeInstance,
  WorkflowRuntimeGroupRef,
  WorkflowRuntimeEdge,
  WorkflowRun,
  WorkflowRuntimeLiteState,
} from "@/lib/nexus-types";

import {
  type WorkflowRuntimeImageCall,
  type WorkflowRuntimeLlmCall,
  workflowRuntimeExecutorMap,
} from "./executors";
import {
  cloneContextPacket,
  createContextPacket,
  createWorkflowRuntimeId,
} from "./state";
import { WORKFLOW_RUNTIME_MAX_PACKET_DISPLAY_CHARS } from "./constants";
import { validateWorkflowRuntimeLiteTopology } from "./topology";

export type WorkflowRuntimeNodePatch = Partial<
  Pick<
    WorkflowNodeInstance,
    "error" | "inputSnapshot" | "outputSnapshot" | "status"
  >
>;

export type WorkflowRuntimeRunnerOptions = {
  callImage?: WorkflowRuntimeImageCall;
  callLlm: WorkflowRuntimeLlmCall;
  onNodePatch?: (nodeId: string, patch: WorkflowRuntimeNodePatch) => void;
  onRunUpdate?: (run: WorkflowRun) => void;
  maxParallelNodes?: number;
  runId?: string;
  runtimeLite: WorkflowRuntimeLiteState;
  signal?: AbortSignal;
  workflowGroup?: WorkflowRuntimeGroupRef;
  workflowId: string;
};

export async function runWorkflowRuntimeLite({
  callImage,
  callLlm,
  maxParallelNodes = 1,
  onNodePatch,
  onRunUpdate,
  runId = createWorkflowRuntimeId("run"),
  runtimeLite,
  signal,
  workflowGroup,
  workflowId,
}: WorkflowRuntimeRunnerOptions): Promise<WorkflowRun> {
  const startedAt = new Date().toISOString();
  let run: WorkflowRun = {
    completedAt: null,
    error: null,
    ...(workflowGroup ? { group: workflowGroup } : {}),
    nodeExecutions: [],
    runId,
    startedAt,
    status: "running",
    workflowId,
  };
  const validation = validateWorkflowRuntimeLiteTopology({
    edges: runtimeLite.edges,
    nodes: runtimeLite.nodes,
  });

  if (!validation.ok) {
    run = {
      ...run,
      completedAt: new Date().toISOString(),
      error: validation.error,
      status: "failed",
    };
    onRunUpdate?.(run);

    return run;
  }

  onRunUpdate?.(run);

  const runtimeEdges = validation.edges;
  const incomingEdgesByTarget = groupIncomingEdges(runtimeEdges);
  const outputPacketsByNodeId = new Map<string, ContextPacket>();
  const readyNodeBatchSize = normalizeMaxParallelNodes(maxParallelNodes);
  const pendingNodeIds = new Set(validation.path.map((node) => node.id));

  const executeReadyNode = async (node: WorkflowNodeInstance) => {
    let packet: ContextPacket | null = null;

    try {
      assertWorkflowRuntimeNotAborted(signal);
      packet = createNodeInputPacket({
        incomingEdges: incomingEdgesByTarget.get(node.id) ?? [],
        node,
        outputPacketsByNodeId,
        runId,
      });
    } catch (error) {
      const completedAt = new Date().toISOString();
      const message =
        error instanceof Error ? error.message : "Workflow node input assembly failed.";
      const failedExecution: NodeExecution = {
        completedAt,
        error: message,
        inputSnapshot: null,
        latencyMs: null,
        nodeId: node.id,
        outputSnapshot: null,
        runId,
        startedAt: completedAt,
        status: "failed",
      };

      run = upsertNodeExecution(run, failedExecution);
      onNodePatch?.(node.id, {
        error: message,
        inputSnapshot: null,
        status: "failed",
      });
      run = markBlockedDownstreamNodes({
        completedAt,
        failedNodeId: node.id,
        onNodePatch,
        reason: `Skipped because upstream node ${node.id} failed.`,
        run,
        runId,
        runtimeEdges,
      });
      run = {
        ...run,
        completedAt,
        error: `Node ${node.id} failed: ${message}`,
        status: "failed",
      };
      onRunUpdate?.(run);

      return false;
    }

    const inputSnapshot = cloneContextPacketForRuntimeSnapshot(packet);
    const queuedExecution: NodeExecution = {
      error: null,
      inputSnapshot,
      latencyMs: null,
      nodeId: node.id,
      outputSnapshot: null,
      runId,
      status: "queued",
    };

    run = upsertNodeExecution(run, queuedExecution);
    onNodePatch?.(node.id, {
      error: null,
      inputSnapshot,
      outputSnapshot: null,
      status: "queued",
    });
    onRunUpdate?.(run);

    const executionStartedAt = new Date().toISOString();
    const latencyStart = Date.now();
    const runningExecution: NodeExecution = {
      ...queuedExecution,
      startedAt: executionStartedAt,
      status: "running",
    };

    run = upsertNodeExecution(run, runningExecution);
    onNodePatch?.(node.id, {
      inputSnapshot,
      status: "running",
    });
    onRunUpdate?.(run);

    try {
      assertWorkflowRuntimeNotAborted(signal);
      const executor = workflowRuntimeExecutorMap[node.type];
      const outputPacket: ContextPacket = await executor({
        callImage,
        callLlm,
        inputPacket: packet,
        node: node as never,
        onPartialOutput: (partialPacket) => {
          const outputSnapshot =
            cloneContextPacketForRuntimeSnapshot(partialPacket);

          run = upsertNodeExecution(run, {
            ...runningExecution,
            latencyMs: Date.now() - latencyStart,
            outputSnapshot,
            status: "running",
          });
          onNodePatch?.(node.id, {
            error: null,
            outputSnapshot,
            status: "running",
          });
        },
        runId,
        signal,
        workflowId,
      });
      const completedAt = new Date().toISOString();
      const outputSnapshot = cloneContextPacketForRuntimeSnapshot(outputPacket);
      const successExecution: NodeExecution = {
        ...runningExecution,
        completedAt,
        latencyMs: Date.now() - latencyStart,
        outputSnapshot,
        status: "success",
      };

      run = upsertNodeExecution(run, successExecution);
      onNodePatch?.(node.id, {
        error: null,
        inputSnapshot,
        outputSnapshot,
        status: "success",
      });
      onRunUpdate?.(run);
      outputPacketsByNodeId.set(node.id, outputPacket);
    } catch (error) {
      const completedAt = new Date().toISOString();
      const message =
        error instanceof Error ? error.message : "Workflow node execution failed.";
      const failedExecution: NodeExecution = {
        ...runningExecution,
        completedAt,
        error: message,
        latencyMs: Date.now() - latencyStart,
        status: "failed",
      };

      run = upsertNodeExecution(run, failedExecution);
      onNodePatch?.(node.id, {
        error: message,
        inputSnapshot,
        status: "failed",
      });
      run = markBlockedDownstreamNodes({
        completedAt,
        failedNodeId: node.id,
        onNodePatch,
        reason: `Skipped because upstream node ${node.id} failed.`,
        run,
        runId,
        runtimeEdges,
      });
      run = {
        ...run,
        completedAt,
        error: `Node ${node.id} failed: ${message}`,
        status: "failed",
      };
      onRunUpdate?.(run);

      return false;
    }

    return true;
  };

  while (pendingNodeIds.size) {
    assertWorkflowRuntimeNotAborted(signal);

    const readyNodes = validation.path.filter(
      (node) =>
        pendingNodeIds.has(node.id) &&
        (incomingEdgesByTarget.get(node.id) ?? []).every((edge) =>
          outputPacketsByNodeId.has(edge.source),
        ),
    );

    if (!readyNodes.length) {
      const completedAt = new Date().toISOString();

      run = {
        ...run,
        completedAt,
        error: "Workflow Runtime Lite could not find a ready node to execute.",
        status: "failed",
      };
      onRunUpdate?.(run);

      return run;
    }

    for (const readyNodeBatch of chunkNodes(readyNodes, readyNodeBatchSize)) {
      const results = await Promise.all(readyNodeBatch.map(executeReadyNode));

      for (const [index, ok] of results.entries()) {
        const node = readyNodeBatch[index];

        if (ok && node) {
          pendingNodeIds.delete(node.id);
        }
      }

      if (results.some((ok) => !ok)) {
        return run;
      }
    }
  }

  run = {
    ...run,
    completedAt: new Date().toISOString(),
    status: "success",
  };
  onRunUpdate?.(run);

  return run;
}

function normalizeMaxParallelNodes(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
}

function chunkNodes<TNode>(nodes: TNode[], size: number) {
  const chunks: TNode[][] = [];

  for (let index = 0; index < nodes.length; index += size) {
    chunks.push(nodes.slice(index, index + size));
  }

  return chunks;
}

function cloneContextPacketForRuntimeSnapshot(
  packet: ContextPacket | null | undefined,
) {
  const snapshot = cloneContextPacket(packet);

  if (!snapshot) {
    return snapshot;
  }

  if (snapshot.rawText.length <= WORKFLOW_RUNTIME_MAX_PACKET_DISPLAY_CHARS) {
    return snapshot;
  }

  return {
    ...snapshot,
    metadata: {
      ...snapshot.metadata,
      originalTokenEstimate: snapshot.tokenEstimate,
      snapshotRawTextTruncated: true,
    },
    rawText:
      snapshot.displayText ||
      snapshot.rawText.slice(0, WORKFLOW_RUNTIME_MAX_PACKET_DISPLAY_CHARS),
  };
}

function createWorkflowRuntimeAbortError() {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Workflow Runtime Lite paused.", "AbortError");
  }

  const error = new Error("Workflow Runtime Lite paused.");
  error.name = "AbortError";

  return error;
}

function assertWorkflowRuntimeNotAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) {
    throw createWorkflowRuntimeAbortError();
  }
}

function groupIncomingEdges(edges: WorkflowRuntimeEdge[]) {
  const incoming = new Map<string, WorkflowRuntimeEdge[]>();

  for (const edge of edges) {
    const group = incoming.get(edge.target) ?? [];
    group.push(edge);
    incoming.set(edge.target, group);
  }

  return incoming;
}

function createNodeInputPacket({
  incomingEdges,
  node,
  outputPacketsByNodeId,
  runId,
}: {
  incomingEdges: WorkflowRuntimeEdge[];
  node: WorkflowNodeInstance;
  outputPacketsByNodeId: Map<string, ContextPacket>;
  runId: string;
}) {
  if (!incomingEdges.length) {
    return null;
  }

  const upstreamPackets = incomingEdges.map((edge) => {
    const packet = outputPacketsByNodeId.get(edge.source);

    if (!packet) {
      throw new Error(`Missing upstream output from node ${edge.source}.`);
    }

    return packet;
  });

  if (upstreamPackets.length === 1) {
    return cloneContextPacket(upstreamPackets[0]);
  }

  return createContextPacket({
    displayText: upstreamPackets
      .map((packet, index) =>
        [`Upstream ${index + 1} (${packet.sourceNodeId})`, packet.displayText].join(
          "\n",
        ),
      )
      .join("\n\n"),
    metadata: {
      nodeType: "merge.context",
      upstreamPacketIds: upstreamPackets.map((packet) => packet.id),
      upstreamSourceNodeIds: upstreamPackets.map((packet) => packet.sourceNodeId),
    },
    rawText: upstreamPackets
      .map((packet, index) =>
        [
          `[Upstream ${index + 1}]`,
          `sourceNodeId: ${packet.sourceNodeId}`,
          `packetId: ${packet.id}`,
          "",
          packet.rawText,
        ].join("\n"),
      )
      .join("\n\n"),
    runId,
    sourceNodeId: node.id,
  });
}

function upsertNodeExecution(run: WorkflowRun, execution: NodeExecution) {
  const existingIndex = run.nodeExecutions.findIndex(
    (candidate) => candidate.nodeId === execution.nodeId,
  );

  if (existingIndex === -1) {
    return {
      ...run,
      nodeExecutions: [...run.nodeExecutions, execution],
    };
  }

  return {
    ...run,
    nodeExecutions: run.nodeExecutions.map((candidate, index) =>
      index === existingIndex ? execution : candidate,
    ),
  };
}

function markBlockedDownstreamNodes({
  completedAt,
  failedNodeId,
  onNodePatch,
  reason,
  run,
  runId,
  runtimeEdges,
}: {
  completedAt: string;
  failedNodeId: string;
  onNodePatch?: (nodeId: string, patch: WorkflowRuntimeNodePatch) => void;
  reason: string;
  run: WorkflowRun;
  runId: string;
  runtimeEdges: WorkflowRuntimeEdge[];
}) {
  const executedNodeIds = new Set(
    run.nodeExecutions.map((execution) => execution.nodeId),
  );
  const downstreamNodeIds = collectDownstreamNodeIds(
    failedNodeId,
    runtimeEdges,
  );
  let nextRun = run;

  for (const nodeId of downstreamNodeIds) {
    if (executedNodeIds.has(nodeId)) {
      continue;
    }

    nextRun = upsertNodeExecution(nextRun, {
      completedAt,
      error: reason,
      inputSnapshot: null,
      latencyMs: null,
      nodeId,
      outputSnapshot: null,
      runId,
      startedAt: completedAt,
      status: "failed",
    });
    onNodePatch?.(nodeId, {
      error: reason,
      inputSnapshot: null,
      outputSnapshot: null,
      status: "failed",
    });
  }

  return nextRun;
}

function collectDownstreamNodeIds(
  sourceNodeId: string,
  edges: WorkflowRuntimeEdge[],
) {
  const outgoing = new Map<string, string[]>();

  for (const edge of edges) {
    const targets = outgoing.get(edge.source) ?? [];
    targets.push(edge.target);
    outgoing.set(edge.source, targets);
  }

  const downstream = new Set<string>();
  const stack = [...(outgoing.get(sourceNodeId) ?? [])];

  while (stack.length) {
    const nodeId = stack.pop();

    if (!nodeId || downstream.has(nodeId)) {
      continue;
    }

    downstream.add(nodeId);
    stack.push(...(outgoing.get(nodeId) ?? []));
  }

  return downstream;
}
