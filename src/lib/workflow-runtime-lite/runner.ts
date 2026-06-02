import type {
  ContextPacket,
  NodeExecution,
  WorkflowNodeInstance,
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
  runId?: string;
  runtimeLite: WorkflowRuntimeLiteState;
  workflowId: string;
};

export async function runWorkflowRuntimeLite({
  callImage,
  callLlm,
  onNodePatch,
  onRunUpdate,
  runId = createWorkflowRuntimeId("run"),
  runtimeLite,
  workflowId,
}: WorkflowRuntimeRunnerOptions): Promise<WorkflowRun> {
  const startedAt = new Date().toISOString();
  let run: WorkflowRun = {
    completedAt: null,
    error: null,
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

  for (const node of validation.path) {
    let packet: ContextPacket | null = null;

    try {
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

      return run;
    }

    const queuedExecution: NodeExecution = {
      error: null,
      inputSnapshot: cloneContextPacket(packet),
      latencyMs: null,
      nodeId: node.id,
      outputSnapshot: null,
      runId,
      status: "queued",
    };

    run = upsertNodeExecution(run, queuedExecution);
    onNodePatch?.(node.id, {
      error: null,
      inputSnapshot: cloneContextPacket(packet),
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
      inputSnapshot: cloneContextPacket(packet),
      status: "running",
    });
    onRunUpdate?.(run);

    try {
      const executor = workflowRuntimeExecutorMap[node.type];
      const outputPacket: ContextPacket = await executor({
        callImage,
        callLlm,
        inputPacket: packet,
        node: node as never,
        onPartialOutput: (partialPacket) => {
          const outputSnapshot = cloneContextPacket(partialPacket);

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
          onRunUpdate?.(run);
        },
        runId,
        workflowId,
      });
      const completedAt = new Date().toISOString();
      const successExecution: NodeExecution = {
        ...runningExecution,
        completedAt,
        latencyMs: Date.now() - latencyStart,
        outputSnapshot: cloneContextPacket(outputPacket),
        status: "success",
      };

      run = upsertNodeExecution(run, successExecution);
      onNodePatch?.(node.id, {
        error: null,
        inputSnapshot: cloneContextPacket(packet),
        outputSnapshot: cloneContextPacket(outputPacket),
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
        inputSnapshot: cloneContextPacket(packet),
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

      return run;
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
