import type {
  WorkflowNodeInstance,
  WorkflowRuntimeEdge,
  WorkflowRuntimeLiteState,
  WorkflowRuntimePosition,
} from "@/lib/nexus-types";

import {
  createEmptyWorkflowRuntimeLiteState,
  createWorkflowRuntimeGroupRef,
  createWorkflowRuntimeId,
  normalizeWorkflowRuntimeLiteState,
} from "./state";

export type AppendWorkflowRuntimeGroupOptions = {
  groupId?: string;
  groupLabel?: string;
  groupSource?: "brain" | "import" | "manual" | "runtime-append";
  targetGapX?: number;
  targetOrigin?: WorkflowRuntimePosition;
};

export type AppendWorkflowRuntimeGroupResult = {
  edgeIds: string[];
  groupId: string;
  nodeIds: string[];
  runtimeLite: WorkflowRuntimeLiteState;
};

const DEFAULT_TARGET_GAP_X = 440;
const DEFAULT_EMPTY_ORIGIN = { x: 120, y: 96 };

export function appendWorkflowRuntimeGroupToRuntime({
  currentRuntimeLite,
  groupRuntimeLite,
  options,
}: {
  currentRuntimeLite?: WorkflowRuntimeLiteState | null;
  groupRuntimeLite: WorkflowRuntimeLiteState;
  options?: AppendWorkflowRuntimeGroupOptions;
}): AppendWorkflowRuntimeGroupResult {
  const current = normalizeWorkflowRuntimeLiteState(
    currentRuntimeLite ?? createEmptyWorkflowRuntimeLiteState(),
    { resetInterrupted: false },
  );
  const incoming = normalizeWorkflowRuntimeLiteState(groupRuntimeLite, {
    resetInterrupted: false,
  });
  const groupId = options?.groupId ?? createWorkflowRuntimeId("wf_group");

  if (!incoming.nodes.length) {
    return {
      edgeIds: [],
      groupId,
      nodeIds: [],
      runtimeLite: {
        ...current,
        lastError: null,
      },
    };
  }

  const currentBounds = getNodeBounds(current.nodes);
  const incomingBounds = getNodeBounds(incoming.nodes);

  if (!incomingBounds) {
    return {
      edgeIds: [],
      groupId,
      nodeIds: [],
      runtimeLite: {
        ...current,
        lastError: null,
      },
    };
  }

  const targetOrigin =
    options?.targetOrigin ??
    (currentBounds
      ? {
          x: currentBounds.maxX + (options?.targetGapX ?? DEFAULT_TARGET_GAP_X),
          y: currentBounds.minY,
        }
      : DEFAULT_EMPTY_ORIGIN);
  const existingNodeIds = new Set(current.nodes.map((node) => node.id));
  const existingEdgeIds = new Set(current.edges.map((edge) => edge.id));
  const nodeIdByOldId = new Map<string, string>();
  const incomingNodeIds = new Set(incoming.nodes.map((node) => node.id));
  const group = createWorkflowRuntimeGroupRef({
    id: groupId,
    label: options?.groupLabel,
    source: options?.groupSource ?? "runtime-append",
  });

  const appendedNodes = incoming.nodes.map((node) => {
    const nextId = createUniqueRuntimeId({
      existingIds: existingNodeIds,
      groupId,
      id: node.id,
      kind: "node",
    });
    nodeIdByOldId.set(node.id, nextId);

    return resetNodeForAppend({
      node,
      group,
      id: nextId,
      position: {
        x: node.position.x - incomingBounds.minX + targetOrigin.x,
        y: node.position.y - incomingBounds.minY + targetOrigin.y,
      },
    });
  });

  const appendedEdges = incoming.edges
    .filter((edge) => incomingNodeIds.has(edge.source) && incomingNodeIds.has(edge.target))
    .map((edge) => {
      const nextId = createUniqueRuntimeId({
        existingIds: existingEdgeIds,
        groupId,
        id: edge.id,
        kind: "edge",
      });

      return {
        ...edge,
        group,
        id: nextId,
        source: nodeIdByOldId.get(edge.source) ?? edge.source,
        target: nodeIdByOldId.get(edge.target) ?? edge.target,
      } satisfies WorkflowRuntimeEdge;
    });

  return {
    edgeIds: appendedEdges.map((edge) => edge.id),
    groupId,
    nodeIds: appendedNodes.map((node) => node.id),
    runtimeLite: {
      ...current,
      edges: [...current.edges, ...appendedEdges],
      lastError: null,
      nodes: [...current.nodes, ...appendedNodes],
    },
  };
}

function resetNodeForAppend({
  group,
  id,
  node,
  position,
}: {
  group: WorkflowNodeInstance["group"];
  id: string;
  node: WorkflowNodeInstance;
  position: WorkflowRuntimePosition;
}): WorkflowNodeInstance {
  return {
    ...node,
    error: null,
    group,
    id,
    inputSnapshot: null,
    outputSnapshot: null,
    position,
    status: "idle",
  };
}

function createUniqueRuntimeId({
  existingIds,
  groupId,
  id,
  kind,
}: {
  existingIds: Set<string>;
  groupId: string;
  id: string;
  kind: "edge" | "node";
}) {
  const safeBase = `${groupId}_${kind}_${slugId(id)}`;
  let candidate = safeBase;
  let counter = 2;

  while (existingIds.has(candidate)) {
    candidate = `${safeBase}_${counter}`;
    counter += 1;
  }

  existingIds.add(candidate);

  return candidate;
}

function slugId(value: string) {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return normalized || "item";
}

function getNodeBounds(nodes: WorkflowNodeInstance[]) {
  if (!nodes.length) {
    return null;
  }

  return nodes.reduce(
    (bounds, node) => ({
      maxX: Math.max(bounds.maxX, node.position.x),
      maxY: Math.max(bounds.maxY, node.position.y),
      minX: Math.min(bounds.minX, node.position.x),
      minY: Math.min(bounds.minY, node.position.y),
    }),
    {
      maxX: nodes[0]?.position.x ?? 0,
      maxY: nodes[0]?.position.y ?? 0,
      minX: nodes[0]?.position.x ?? 0,
      minY: nodes[0]?.position.y ?? 0,
    },
  );
}
