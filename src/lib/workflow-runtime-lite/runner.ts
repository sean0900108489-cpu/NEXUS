import type {
  ContextPacket,
  NodeExecution,
  WorkflowNodeInstance,
  WorkflowRuntimeEdge,
  WorkflowRun,
  WorkflowRuntimeLiteState,
} from "@/lib/nexus-types";

import {
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
  callLlm: WorkflowRuntimeLlmCall;
  onNodePatch?: (nodeId: string, patch: WorkflowRuntimeNodePatch) => void;
  onRunUpdate?: (run: WorkflowRun) => void;
  runId?: string;
  runtimeLite: WorkflowRuntimeLiteState;
  workflowId: string;
};

export async function runWorkflowRuntimeLite({
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

  const incomingEdgesByTarget = groupIncomingEdges(runtimeLite.edges);
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
      run = {
        ...run,
        completedAt,
        error: `Node ${node.id} failed: ${message}`,
        status: "failed",
      };
      onNodePatch?.(node.id, {
        error: message,
        inputSnapshot: null,
        status: "failed",
      });
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
        callLlm,
        inputPacket: packet,
        node: node as never,
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
      run = {
        ...run,
        completedAt,
        error: `Node ${node.id} failed: ${message}`,
        status: "failed",
      };
      onNodePatch?.(node.id, {
        error: message,
        inputSnapshot: cloneContextPacket(packet),
        status: "failed",
      });
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
