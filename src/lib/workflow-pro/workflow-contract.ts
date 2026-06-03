import type {
  AgentModelSettings,
  FileNodeData,
  ModelImageNodeData,
  ModelLlmNodeData,
  WorkflowNodeInstance,
  WorkflowRuntimeEdge,
  WorkflowRuntimeLiteState,
  WorkflowRuntimeNodeData,
  WorkflowRuntimeNodeType,
  WorkflowRuntimePosition,
} from "@/lib/nexus-types";
import type { WorkflowProCapabilityInventory } from "./capability-inventory";
import { getWorkflowRuntimeNodeDefinition } from "@/lib/workflow-runtime-lite/registry";

export type WorkflowProEdgeMode =
  | "always"
  | "fallback"
  | "guard"
  | "manual";

export type WorkflowProPacketContract = {
  allowedMedia: Array<"text" | "image" | "video" | "file" | "json">;
  input: "ContextPacket";
  output: "ContextPacket";
};

export type WorkflowProContractNode = {
  data: Record<string, unknown>;
  id: string;
  label: string;
  limits: string[];
  compiler?: {
    id: string;
    mode: "noop" | "transform" | "extract" | "embed" | "custom";
    version: string;
  };
  model?: {
    modelId: string;
    provider: string;
    settings?: AgentModelSettings;
  };
  artifactPolicy?: {
    downloadable: boolean;
    historyScope: "workspace" | "agent" | "node" | "run";
    persist: boolean;
    type: "generated-image" | "text" | "custom";
  };
  position: WorkflowRuntimePosition;
  purpose: string;
  rationale: string;
  type: WorkflowRuntimeNodeType;
};

export type WorkflowProContractEdge = {
  id: string;
  mode: WorkflowProEdgeMode;
  packetContract: WorkflowProPacketContract;
  reason: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
};

export type WorkflowProContractOutput = {
  artifactPolicy?: WorkflowProContractNode["artifactPolicy"];
  id: string;
  sourceNodeId: string;
  type: "text" | "image" | "artifact" | "json";
};

export type WorkflowProExecutionPlan = {
  mode: "topological";
  notes: string[];
  parallelGroups: Array<{
    id: string;
    nodeIds: string[];
    reason: string;
    runtimeStatus: "native-parallel" | "runtime-lite-sequential" | "planned";
  }>;
};

export type WorkflowProContractDraft = {
  brain: {
    canPropose: string[];
    enabled: boolean;
    mustUnderstand: string[];
    outputFormat: {
      analysis: "markdown";
      missingCapabilities: "array";
      optimizedWorkflow: "nexus.workflow.v1";
    };
    readBeforeRun: boolean;
    runtimeEvidence: string[];
  };
  capabilityInventory: WorkflowProCapabilityInventory;
  edges: WorkflowProContractEdge[];
  execution?: WorkflowProExecutionPlan;
  id: string;
  intent: string;
  metadata: {
    createdAt: string;
    description: string;
    source: "runtimeLite";
    workspaceId: string;
  };
  name: string;
  nodes: WorkflowProContractNode[];
  outputs: WorkflowProContractOutput[];
  schema: "nexus.workflow.v1";
  successCriteria: string[];
};

export function createWorkflowProContractDraftFromRuntimeLite({
  generatedAt = new Date().toISOString(),
  inventory,
  runtimeLite,
  workspaceId,
  workspaceName,
}: {
  generatedAt?: string;
  inventory: WorkflowProCapabilityInventory;
  runtimeLite: WorkflowRuntimeLiteState | undefined;
  workspaceId: string;
  workspaceName: string;
}): WorkflowProContractDraft {
  const runtimeNodes = runtimeLite?.nodes ?? [];
  const nodeLabelById = new Map(
    runtimeNodes.map((node) => [node.id, getWorkflowProNodeLabel(node)]),
  );
  const nodes = runtimeNodes.map(mapRuntimeNodeToContractNode);
  const edges = (runtimeLite?.edges ?? []).map((edge) =>
    mapRuntimeEdgeToContractEdge(edge, nodeLabelById),
  );

  return {
    brain: {
      canPropose: [
        "prompt rewrite",
        "node insertion",
        "node deletion",
        "model setting changes",
        "missing feature requirements",
        "full optimized workflow",
      ],
      enabled: true,
      mustUnderstand: [
        "intent",
        "nodes",
        "edges",
        "execution.order",
        "capabilityInventory",
        "limits",
        "rationale",
      ],
      outputFormat: {
        analysis: "markdown",
        missingCapabilities: "array",
        optimizedWorkflow: "nexus.workflow.v1",
      },
      readBeforeRun: true,
      runtimeEvidence: ["runs", "artifacts", "errors", "contextPackets"],
    },
    capabilityInventory: inventory,
    edges,
    execution: {
      mode: "topological",
      notes: [
        "Runtime Lite currently executes a validated topological path sequentially.",
        "Parallel groups are representable for brain analysis but not native concurrent execution yet.",
      ],
      parallelGroups: [],
    },
    id: `workflow-pro-${workspaceId}`,
    intent: "Drafted from the current Runtime Lite graph for Workflow Pro review.",
    metadata: {
      createdAt: generatedAt,
      description:
        "Read-only Workflow Pro draft generated from Runtime Lite. It is not applied back to Graph until an explicit apply bridge exists.",
      source: "runtimeLite",
      workspaceId,
    },
    name: `${workspaceName} Workflow Pro Draft`,
    nodes,
    outputs: nodes
      .filter((node) => node.type === "output.text" || node.type === "model.image")
      .map((node) => ({
        artifactPolicy: node.artifactPolicy,
        id: `output-${node.id}`,
        sourceNodeId: node.id,
        type: node.type === "model.image" ? "image" : "text",
      })),
    schema: "nexus.workflow.v1",
    successCriteria: [
      "Workflow Pro can explain the current runtime topology without mutating Graph.",
      "A Workflow Brain can read node purpose, edge packet flow, capability limits, and missing capabilities.",
    ],
  };
}

function mapRuntimeNodeToContractNode(
  node: WorkflowNodeInstance,
): WorkflowProContractNode {
  const definition = getWorkflowRuntimeNodeDefinition(node.type);
  const base = {
    data: cloneNodeData(node.data),
    id: node.id,
    label: getWorkflowProNodeLabel(node),
    limits: getWorkflowProNodeLimits(node.type),
    position: node.position,
    purpose: definition.description,
    rationale: `Imported from Runtime Lite node ${node.id}; Workflow Pro has not rewritten this node yet.`,
    type: node.type,
  } satisfies WorkflowProContractNode;

  if (node.type === "model.llm") {
    const data = node.data as ModelLlmNodeData;

    return {
      ...base,
      model: {
        modelId: data.model,
        provider: data.provider ?? "openai",
        settings: data.modelSettings,
      },
    };
  }

  if (node.type === "node.file") {
    const data = node.data as FileNodeData;

    return {
      ...base,
      compiler: {
        id: data.compilerId,
        mode: "noop",
        version: data.compilerVersion,
      },
    };
  }

  if (node.type === "model.image") {
    const data = node.data as ModelImageNodeData;

    return {
      ...base,
      artifactPolicy: {
        downloadable: true,
        historyScope: "workspace",
        persist: true,
        type: "generated-image",
      },
      model: {
        modelId: data.modelId,
        provider: "openai-compatible-image",
        settings: {
          reasoningDetail: "low",
        },
      },
    };
  }

  if (node.type === "output.text") {
    return {
      ...base,
      artifactPolicy: {
        downloadable: false,
        historyScope: "run",
        persist: false,
        type: "text",
      },
    };
  }

  return base;
}

function mapRuntimeEdgeToContractEdge(
  edge: WorkflowRuntimeEdge,
  nodeLabelById: Map<string, string>,
): WorkflowProContractEdge {
  const sourceLabel = nodeLabelById.get(edge.source) ?? edge.source;
  const targetLabel = nodeLabelById.get(edge.target) ?? edge.target;

  return {
    id: edge.id,
    mode: "always",
    packetContract: {
      allowedMedia: ["text", "image", "json"],
      input: "ContextPacket",
      output: "ContextPacket",
    },
    reason: `Runtime Lite currently sends ContextPacket output from ${sourceLabel} to ${targetLabel}.`,
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: edge.target,
    targetHandle: edge.targetHandle,
  };
}

function getWorkflowProNodeLabel(node: WorkflowNodeInstance) {
  const data = node.data as { label?: unknown };

  return typeof data.label === "string" && data.label.trim()
    ? data.label.trim()
    : getWorkflowRuntimeNodeDefinition(node.type).label;
}

function getWorkflowProNodeLimits(type: WorkflowRuntimeNodeType) {
  if (type === "input.text") {
    return ["Text-only input until file nodes are implemented."];
  }

  if (type === "model.llm") {
    return ["Receives text ContextPacket input; file compiler attachments are planned but not applied here yet."];
  }

  if (type === "node.file") {
    return ["Uses the no-op compiler until advanced file transforms are connected."];
  }

  if (type === "model.image") {
    return ["Generates image artifacts; video generation remains a planned capability."];
  }

  return ["Displays current ContextPacket output; advanced artifact routing is planned."];
}

function cloneNodeData(data: WorkflowRuntimeNodeData): Record<string, unknown> {
  return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
}
