import type {
  WorkflowRuntimeEdge,
  WorkflowRuntimeLiteState,
  WorkflowNodeInstance,
} from "@/lib/nexus-types";

import type { WorkflowProApplyPlan } from "./workflow-contract-apply-plan";

export type WorkflowProProposalDiffChange = {
  id: string;
  kind: "added" | "removed" | "changed";
  label: string;
  type: "node" | "edge";
};

export type WorkflowProProposalDiff = {
  changes: WorkflowProProposalDiffChange[];
  schema: "nexus.workflowPro.proposalDiff.v1";
  status: "blocked" | "ready";
  summary: {
    addedEdges: number;
    addedNodes: number;
    changedEdges: number;
    changedNodes: number;
    removedEdges: number;
    removedNodes: number;
  };
};

export function createWorkflowProProposalDiff({
  applyPlan,
  currentRuntimeLite,
}: {
  applyPlan: WorkflowProApplyPlan;
  currentRuntimeLite: WorkflowRuntimeLiteState | undefined;
}): WorkflowProProposalDiff {
  if (applyPlan.status !== "ready" || !applyPlan.candidateRuntimeLite) {
    return createDiffResult("blocked", []);
  }

  const currentNodes = currentRuntimeLite?.nodes ?? [];
  const currentEdges = currentRuntimeLite?.edges ?? [];
  const candidateNodes = applyPlan.candidateRuntimeLite.nodes;
  const candidateEdges = applyPlan.candidateRuntimeLite.edges;
  const changes = [
    ...diffNodes(currentNodes, candidateNodes),
    ...diffEdges(currentEdges, candidateEdges),
  ];

  return createDiffResult("ready", changes);
}

function diffNodes(
  currentNodes: WorkflowNodeInstance[],
  candidateNodes: WorkflowNodeInstance[],
) {
  const currentById = new Map(currentNodes.map((node) => [node.id, node]));
  const candidateById = new Map(candidateNodes.map((node) => [node.id, node]));
  const changes: WorkflowProProposalDiffChange[] = [];

  for (const candidate of candidateNodes) {
    const current = currentById.get(candidate.id);

    if (!current) {
      changes.push({
        id: candidate.id,
        kind: "added",
        label: getNodeLabel(candidate),
        type: "node",
      });
      continue;
    }

    if (serializeNodeForDiff(current) !== serializeNodeForDiff(candidate)) {
      changes.push({
        id: candidate.id,
        kind: "changed",
        label: getNodeLabel(candidate),
        type: "node",
      });
    }
  }

  for (const current of currentNodes) {
    if (!candidateById.has(current.id)) {
      changes.push({
        id: current.id,
        kind: "removed",
        label: getNodeLabel(current),
        type: "node",
      });
    }
  }

  return changes;
}

function diffEdges(
  currentEdges: WorkflowRuntimeEdge[],
  candidateEdges: WorkflowRuntimeEdge[],
) {
  const currentById = new Map(currentEdges.map((edge) => [edge.id, edge]));
  const candidateById = new Map(candidateEdges.map((edge) => [edge.id, edge]));
  const changes: WorkflowProProposalDiffChange[] = [];

  for (const candidate of candidateEdges) {
    const current = currentById.get(candidate.id);

    if (!current) {
      changes.push({
        id: candidate.id,
        kind: "added",
        label: `${candidate.source} -> ${candidate.target}`,
        type: "edge",
      });
      continue;
    }

    if (serializeEdgeForDiff(current) !== serializeEdgeForDiff(candidate)) {
      changes.push({
        id: candidate.id,
        kind: "changed",
        label: `${candidate.source} -> ${candidate.target}`,
        type: "edge",
      });
    }
  }

  for (const current of currentEdges) {
    if (!candidateById.has(current.id)) {
      changes.push({
        id: current.id,
        kind: "removed",
        label: `${current.source} -> ${current.target}`,
        type: "edge",
      });
    }
  }

  return changes;
}

function createDiffResult(
  status: WorkflowProProposalDiff["status"],
  changes: WorkflowProProposalDiffChange[],
): WorkflowProProposalDiff {
  return {
    changes,
    schema: "nexus.workflowPro.proposalDiff.v1",
    status,
    summary: {
      addedEdges: countChanges(changes, "edge", "added"),
      addedNodes: countChanges(changes, "node", "added"),
      changedEdges: countChanges(changes, "edge", "changed"),
      changedNodes: countChanges(changes, "node", "changed"),
      removedEdges: countChanges(changes, "edge", "removed"),
      removedNodes: countChanges(changes, "node", "removed"),
    },
  };
}

function countChanges(
  changes: WorkflowProProposalDiffChange[],
  type: WorkflowProProposalDiffChange["type"],
  kind: WorkflowProProposalDiffChange["kind"],
) {
  return changes.filter((change) => change.type === type && change.kind === kind)
    .length;
}

function getNodeLabel(node: WorkflowNodeInstance) {
  const label = (node.data as { label?: unknown }).label;

  return typeof label === "string" && label.trim() ? label.trim() : node.type;
}

function serializeNodeForDiff(node: WorkflowNodeInstance) {
  return stableStringify({
    data: node.data,
    position: node.position,
    type: node.type,
  });
}

function serializeEdgeForDiff(edge: WorkflowRuntimeEdge) {
  return stableStringify({
    label: edge.label ?? null,
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: edge.target,
    targetHandle: edge.targetHandle,
  });
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
