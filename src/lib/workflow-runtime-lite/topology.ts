import type {
  WorkflowNodeInstance,
  WorkflowRuntimeEdge,
} from "@/lib/nexus-types";

import { getWorkflowRuntimeHandleIds } from "./registry";

export type WorkflowTopologyValidationResult =
  | {
      ok: true;
      path: WorkflowNodeInstance[];
    }
  | {
      ok: false;
      error: string;
    };

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

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const handleError = validateHandles({ edges, nodeById });

  if (handleError) {
    return { error: handleError, ok: false };
  }

  if (hasDirectedCycle(edges, nodeById)) {
    return {
      error: "目前 Lite Runner 尚未支援迴圈。",
      ok: false,
    };
  }

  const inputNodes = nodes.filter((node) => node.type === "input.text");

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

  const incoming = countEdges(edges, "target");
  const outgoing = countEdges(edges, "source");

  for (const node of nodes) {
    const outgoingCount = outgoing.get(node.id) ?? 0;
    const incomingCount = incoming.get(node.id) ?? 0;

    if (outgoingCount > 1) {
      return {
        error: `目前 Lite Runner 尚未支援分支：節點 ${node.id} 有 ${outgoingCount} 條輸出。`,
        ok: false,
      };
    }

    if (incomingCount > 1) {
      return {
        error: `目前 Lite Runner 尚未支援 merge：節點 ${node.id} 有 ${incomingCount} 條輸入。`,
        ok: false,
      };
    }
  }

  const startNode = inputNodes[0];

  if ((incoming.get(startNode.id) ?? 0) > 0) {
    return {
      error: "input.text 不能有上游輸入。",
      ok: false,
    };
  }

  const path: WorkflowNodeInstance[] = [];
  const visited = new Set<string>();
  let current: WorkflowNodeInstance | undefined = startNode;

  while (current) {
    if (visited.has(current.id)) {
      return {
        error: "目前 Lite Runner 尚未支援迴圈。",
        ok: false,
      };
    }

    visited.add(current.id);
    path.push(current);

    const edge = edges.find((candidate) => candidate.source === current?.id);

    if (!edge) {
      current = undefined;
      continue;
    }

    current = nodeById.get(edge.target);
  }

  if (visited.size !== nodes.length) {
    return {
      error: "目前 Lite Runner 只支援單一路徑，圖上存在未連接到起始 input.text 的節點。",
      ok: false,
    };
  }

  return {
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

function countEdges(
  edges: WorkflowRuntimeEdge[],
  field: "source" | "target",
) {
  const counts = new Map<string, number>();

  for (const edge of edges) {
    counts.set(edge[field], (counts.get(edge[field]) ?? 0) + 1);
  }

  return counts;
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
