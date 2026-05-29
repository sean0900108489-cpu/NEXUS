import type {
  WorkflowNodeInstance,
  WorkflowRuntimeEdge,
} from "@/lib/nexus-types";

import { getWorkflowRuntimeHandleIds } from "./registry";

export type WorkflowTopologyValidationResult =
  | {
      edges: WorkflowRuntimeEdge[];
      ok: true;
      path: WorkflowNodeInstance[];
    }
  | {
      error: string;
      ok: false;
    };

export function inferLinearWorkflowRuntimeLiteEdges({
  edges,
  nodes,
}: {
  edges: WorkflowRuntimeEdge[];
  nodes: WorkflowNodeInstance[];
}) {
  if (edges.length || nodes.length < 2) {
    return edges;
  }

  const inputNodes = nodes.filter((node) => node.type === "input.text");

  if (inputNodes.length !== 1) {
    return edges;
  }

  const sortedNodes = [...nodes].sort(compareWorkflowRuntimeNodes);
  const [startNode] = sortedNodes;

  if (!startNode || startNode.id !== inputNodes[0].id) {
    return edges;
  }

  const inferredEdges: WorkflowRuntimeEdge[] = [];

  for (let index = 0; index < sortedNodes.length - 1; index += 1) {
    const source = sortedNodes[index];
    const target = sortedNodes[index + 1];

    if (
      !source ||
      !target ||
      !getWorkflowRuntimeHandleIds(source.type, "source").includes("output") ||
      !getWorkflowRuntimeHandleIds(target.type, "target").includes("input")
    ) {
      return edges;
    }

    inferredEdges.push({
      animated: true,
      id: `wf_edge_auto_${source.id}_${target.id}`,
      source: source.id,
      sourceHandle: "output",
      target: target.id,
      targetHandle: "input",
    });
  }

  return inferredEdges;
}

export function validateWorkflowRuntimeLiteTopology({
  edges,
  nodes,
}: {
  edges: WorkflowRuntimeEdge[];
  nodes: WorkflowNodeInstance[];
}): WorkflowTopologyValidationResult {
  if (!nodes.length) {
    return {
      error: "目前 Lite Runner 找不到可執行節點。",
      ok: false,
    };
  }

  const subgraph = selectWorkflowRuntimeSubgraph({ edges, nodes });

  if (!subgraph.nodes.length) {
    return {
      error: "目前 Lite Runner 找不到可執行節點。",
      ok: false,
    };
  }

  const nodeById = new Map(subgraph.nodes.map((node) => [node.id, node]));
  const handleError = validateHandles({ edges: subgraph.edges, nodeById });

  if (handleError) {
    return { error: handleError, ok: false };
  }

  if (hasDirectedCycle(subgraph.edges, nodeById)) {
    return {
      error: "目前 Lite Runner 尚未支援迴圈。",
      ok: false,
    };
  }

  const runnableNodes = subgraph.nodes;
  const runnableEdges = subgraph.edges;
  const inputNodes = runnableNodes.filter((node) => node.type === "input.text");

  if (!inputNodes.length) {
    return {
      error: "目前 Lite Runner 找不到起始 input.text 節點。",
      ok: false,
    };
  }

  if (inputNodes.length > 1) {
    return {
      error: "目前 Lite Runner 尚未支援多個起始 input.text 節點。",
      ok: false,
    };
  }

  const incoming = collectEdges(runnableEdges, "target");
  const outgoing = collectEdges(runnableEdges, "source");

  const startNode = inputNodes[0];

  if ((incoming.get(startNode.id)?.length ?? 0) > 0) {
    return {
      error: "input.text 不能有上游輸入。",
      ok: false,
    };
  }

  for (const node of runnableNodes) {
    if (node.id === startNode.id) {
      continue;
    }

    if ((incoming.get(node.id)?.length ?? 0) === 0) {
      return {
        error: `節點 ${node.id} 沒有上游輸入，無法執行。`,
        ok: false,
      };
    }
  }

  const reachable = collectReachableNodeIds(startNode.id, outgoing);

  if (reachable.size !== runnableNodes.length) {
    return {
      error: "圖上存在未連接到起始 input.text 的節點。",
      ok: false,
    };
  }

  const path = topologicalSort(runnableNodes, incoming, outgoing);

  if (!path) {
    return {
      error: "目前 Lite Runner 尚未支援迴圈。",
      ok: false,
    };
  }

  return {
    edges: runnableEdges,
    ok: true,
    path,
  };
}

function validateHandles({
  edges,
  nodeById,
}: {
  edges: WorkflowRuntimeEdge[];
  nodeById: Map<string, WorkflowNodeInstance>;
}) {
  for (const edge of edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);

    if (!source || !target) {
      return `連線 ${edge.id} 指向不存在的節點。`;
    }

    const sourceHandles = getWorkflowRuntimeHandleIds(source.type, "source");
    const targetHandles = getWorkflowRuntimeHandleIds(target.type, "target");

    if (!sourceHandles.includes(edge.sourceHandle as "output")) {
      return `連線 ${edge.id} 使用了不合法的 sourceHandle: ${edge.sourceHandle}`;
    }

    if (!targetHandles.includes(edge.targetHandle as "input")) {
      return `連線 ${edge.id} 使用了不合法的 targetHandle: ${edge.targetHandle}`;
    }
  }

  return undefined;
}

function collectEdges(
  edges: WorkflowRuntimeEdge[],
  field: "source" | "target",
) {
  const grouped = new Map<string, WorkflowRuntimeEdge[]>();

  for (const edge of edges) {
    const group = grouped.get(edge[field]) ?? [];
    group.push(edge);
    grouped.set(edge[field], group);
  }

  return grouped;
}

function selectWorkflowRuntimeSubgraph({
  edges,
  nodes,
}: {
  edges: WorkflowRuntimeEdge[];
  nodes: WorkflowNodeInstance[];
}) {
  if (!edges.length) {
    return { edges, nodes };
  }

  const connectedNodeIds = new Set<string>();
  const allNodeIds = new Set(nodes.map((node) => node.id));

  for (const edge of edges) {
    if (!allNodeIds.has(edge.source) || !allNodeIds.has(edge.target)) {
      continue;
    }

    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }

  const connectedNodes = nodes.filter((node) => connectedNodeIds.has(node.id));
  const connectedEdges = edges.filter(
    (edge) => connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target),
  );
  const inputNodes = connectedNodes.filter((node) => node.type === "input.text");

  if (inputNodes.length <= 1) {
    return { edges: connectedEdges, nodes: connectedNodes };
  }

  const populatedInputs = inputNodes.filter(hasSeedText);

  if (populatedInputs.length !== 1) {
    return { edges: connectedEdges, nodes: connectedNodes };
  }

  const outgoing = collectEdges(connectedEdges, "source");
  const reachable = collectReachableNodeIds(populatedInputs[0].id, outgoing);

  return {
    edges: connectedEdges.filter(
      (edge) => reachable.has(edge.source) && reachable.has(edge.target),
    ),
    nodes: connectedNodes.filter((node) => reachable.has(node.id)),
  };
}

function hasSeedText(node: WorkflowNodeInstance) {
  if (node.type !== "input.text") {
    return false;
  }

  const data = node.data as { text?: unknown };

  return typeof data.text === "string" && data.text.trim().length > 0;
}

function collectReachableNodeIds(
  startNodeId: string,
  outgoing: Map<string, WorkflowRuntimeEdge[]>,
) {
  const reachable = new Set<string>();
  const stack = [startNodeId];

  while (stack.length) {
    const nodeId = stack.pop();

    if (!nodeId || reachable.has(nodeId)) {
      continue;
    }

    reachable.add(nodeId);

    for (const edge of outgoing.get(nodeId) ?? []) {
      stack.push(edge.target);
    }
  }

  return reachable;
}

function topologicalSort(
  nodes: WorkflowNodeInstance[],
  incoming: Map<string, WorkflowRuntimeEdge[]>,
  outgoing: Map<string, WorkflowRuntimeEdge[]>,
) {
  const remainingIncoming = new Map(
    nodes.map((node) => [node.id, incoming.get(node.id)?.length ?? 0]),
  );
  const queue = nodes
    .filter((node) => (remainingIncoming.get(node.id) ?? 0) === 0)
    .sort(compareWorkflowRuntimeNodes);
  const sorted: WorkflowNodeInstance[] = [];

  while (queue.length) {
    const node = queue.shift();

    if (!node) {
      continue;
    }

    sorted.push(node);

    for (const edge of outgoing.get(node.id) ?? []) {
      const nextIncoming = (remainingIncoming.get(edge.target) ?? 0) - 1;
      remainingIncoming.set(edge.target, nextIncoming);

      if (nextIncoming === 0) {
        const nextNode = nodes.find((candidate) => candidate.id === edge.target);

        if (nextNode) {
          queue.push(nextNode);
          queue.sort(compareWorkflowRuntimeNodes);
        }
      }
    }
  }

  return sorted.length === nodes.length ? sorted : undefined;
}

function compareWorkflowRuntimeNodes(
  a: WorkflowNodeInstance,
  b: WorkflowNodeInstance,
) {
  return (
    a.position.x - b.position.x ||
    a.position.y - b.position.y ||
    a.id.localeCompare(b.id)
  );
}

function hasDirectedCycle(
  edges: WorkflowRuntimeEdge[],
  nodeById: Map<string, WorkflowNodeInstance>,
) {
  const outgoing = new Map<string, string[]>();
  const visiting = new Set<string>();
  const visited = new Set<string>();

  for (const edge of edges) {
    const targets = outgoing.get(edge.source) ?? [];
    targets.push(edge.target);
    outgoing.set(edge.source, targets);
  }

  const visit = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) {
      return true;
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visiting.add(nodeId);

    for (const target of outgoing.get(nodeId) ?? []) {
      if (visit(target)) {
        return true;
      }
    }

    visiting.delete(nodeId);
    visited.add(nodeId);

    return false;
  };

  for (const nodeId of nodeById.keys()) {
    if (visit(nodeId)) {
      return true;
    }
  }

  return false;
}
