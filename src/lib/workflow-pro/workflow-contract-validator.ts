import type { WorkflowRuntimeNodeType } from "@/lib/nexus-types";
import { isWorkflowRuntimeNodeType } from "@/lib/workflow-runtime-lite/registry";

import type { WorkflowProContractDraft } from "./workflow-contract";

export type WorkflowProContractValidationIssue = {
  message: string;
  path: string;
  severity: "error" | "warning";
};

export type WorkflowProContractValidationResult = {
  errors: WorkflowProContractValidationIssue[];
  ok: boolean;
  summary: {
    availableNodeTypes: WorkflowRuntimeNodeType[];
    edgeCount: number;
    nodeCount: number;
    outputCount: number;
    schema: string | null;
  };
  warnings: WorkflowProContractValidationIssue[];
};

export function validateWorkflowProContractDraft(
  value: unknown,
): WorkflowProContractValidationResult {
  const errors: WorkflowProContractValidationIssue[] = [];
  const warnings: WorkflowProContractValidationIssue[] = [];
  const issue = (
    severity: WorkflowProContractValidationIssue["severity"],
    path: string,
    message: string,
  ) => {
    const target = severity === "error" ? errors : warnings;
    target.push({ message, path, severity });
  };

  if (!isRecord(value)) {
    issue("error", "$", "Workflow contract must be an object.");

    return createValidationResult({
      errors,
      warnings,
      value: null,
    });
  }

  if (value.schema !== "nexus.workflow.v1") {
    issue("error", "$.schema", "Workflow contract schema must be nexus.workflow.v1.");
  }

  if (!isNonEmptyString(value.id)) {
    issue("error", "$.id", "Workflow contract id is required.");
  }

  if (!isNonEmptyString(value.name)) {
    issue("error", "$.name", "Workflow contract name is required.");
  }

  if (!isNonEmptyString(value.intent)) {
    issue("warning", "$.intent", "Workflow intent is empty; brain analysis will be weaker.");
  }

  if (!isRecord(value.metadata)) {
    issue("error", "$.metadata", "Workflow metadata object is required.");
  } else {
    if (value.metadata.source !== "runtimeLite") {
      issue("warning", "$.metadata.source", "Workflow metadata source is not runtimeLite.");
    }

    if (!isNonEmptyString(value.metadata.workspaceId)) {
      issue("error", "$.metadata.workspaceId", "Workflow metadata workspaceId is required.");
    }
  }

  const availableNodeTypes = extractAvailableNodeTypes(value, issue);
  const nodeIds = validateNodes(value.nodes, availableNodeTypes, issue);
  validateEdges(value.edges, nodeIds, issue);
  validateOutputs(value.outputs, nodeIds, issue);
  validateBrain(value.brain, issue);

  return createValidationResult({
    errors,
    value,
    warnings,
  });
}

function validateNodes(
  value: unknown,
  availableNodeTypes: Set<WorkflowRuntimeNodeType>,
  issue: (
    severity: WorkflowProContractValidationIssue["severity"],
    path: string,
    message: string,
  ) => void,
) {
  const nodeIds = new Set<string>();

  if (!Array.isArray(value)) {
    issue("error", "$.nodes", "Workflow nodes must be an array.");

    return nodeIds;
  }

  value.forEach((node, index) => {
    const path = `$.nodes[${index}]`;

    if (!isRecord(node)) {
      issue("error", path, "Workflow node must be an object.");
      return;
    }

    if (!isNonEmptyString(node.id)) {
      issue("error", `${path}.id`, "Workflow node id is required.");
    } else if (nodeIds.has(node.id)) {
      issue("error", `${path}.id`, `Duplicate workflow node id ${node.id}.`);
    } else {
      nodeIds.add(node.id);
    }

    if (!isWorkflowRuntimeNodeType(node.type)) {
      issue("error", `${path}.type`, "Workflow node type is not supported.");
    } else if (
      availableNodeTypes.size > 0 &&
      !availableNodeTypes.has(node.type)
    ) {
      issue(
        "warning",
        `${path}.type`,
        `Workflow node type ${node.type} is not in the capability inventory.`,
      );
    }

    if (!isRecord(node.position)) {
      issue("error", `${path}.position`, "Workflow node position is required.");
    }

    if (!Array.isArray(node.limits)) {
      issue("warning", `${path}.limits`, "Workflow node limits should be listed.");
    }
  });

  return nodeIds;
}

function validateEdges(
  value: unknown,
  nodeIds: Set<string>,
  issue: (
    severity: WorkflowProContractValidationIssue["severity"],
    path: string,
    message: string,
  ) => void,
) {
  if (!Array.isArray(value)) {
    issue("error", "$.edges", "Workflow edges must be an array.");
    return;
  }

  value.forEach((edge, index) => {
    const path = `$.edges[${index}]`;

    if (!isRecord(edge)) {
      issue("error", path, "Workflow edge must be an object.");
      return;
    }

    if (!isNonEmptyString(edge.id)) {
      issue("error", `${path}.id`, "Workflow edge id is required.");
    }

    if (!isNonEmptyString(edge.source) || !nodeIds.has(edge.source)) {
      issue("error", `${path}.source`, "Workflow edge source must reference an existing node.");
    }

    if (!isNonEmptyString(edge.target) || !nodeIds.has(edge.target)) {
      issue("error", `${path}.target`, "Workflow edge target must reference an existing node.");
    }

    if (!isRecord(edge.packetContract)) {
      issue("error", `${path}.packetContract`, "Workflow edge packetContract is required.");
    }
  });
}

function validateOutputs(
  value: unknown,
  nodeIds: Set<string>,
  issue: (
    severity: WorkflowProContractValidationIssue["severity"],
    path: string,
    message: string,
  ) => void,
) {
  if (!Array.isArray(value)) {
    issue("error", "$.outputs", "Workflow outputs must be an array.");
    return;
  }

  value.forEach((output, index) => {
    const path = `$.outputs[${index}]`;

    if (!isRecord(output)) {
      issue("error", path, "Workflow output must be an object.");
      return;
    }

    if (!isNonEmptyString(output.id)) {
      issue("error", `${path}.id`, "Workflow output id is required.");
    }

    if (
      !isNonEmptyString(output.sourceNodeId) ||
      !nodeIds.has(output.sourceNodeId)
    ) {
      issue(
        "error",
        `${path}.sourceNodeId`,
        "Workflow output must reference an existing source node.",
      );
    }
  });
}

function validateBrain(
  value: unknown,
  issue: (
    severity: WorkflowProContractValidationIssue["severity"],
    path: string,
    message: string,
  ) => void,
) {
  if (!isRecord(value)) {
    issue("error", "$.brain", "Workflow brain contract is required.");
    return;
  }

  if (value.readBeforeRun !== true) {
    issue("warning", "$.brain.readBeforeRun", "Workflow brain should read the graph before execution.");
  }

  if (!Array.isArray(value.mustUnderstand) || value.mustUnderstand.length === 0) {
    issue("warning", "$.brain.mustUnderstand", "Workflow brain mustUnderstand list is empty.");
  }
}

function extractAvailableNodeTypes(
  value: Record<string, unknown>,
  issue: (
    severity: WorkflowProContractValidationIssue["severity"],
    path: string,
    message: string,
  ) => void,
) {
  const availableNodeTypes = new Set<WorkflowRuntimeNodeType>();
  const inventory = value.capabilityInventory;

  if (!isRecord(inventory)) {
    issue("error", "$.capabilityInventory", "Workflow capability inventory is required.");
    return availableNodeTypes;
  }

  if (!Array.isArray(inventory.nodeTypes)) {
    issue("error", "$.capabilityInventory.nodeTypes", "Capability inventory nodeTypes must be an array.");
    return availableNodeTypes;
  }

  inventory.nodeTypes.forEach((nodeType, index) => {
    if (!isRecord(nodeType) || !isWorkflowRuntimeNodeType(nodeType.type)) {
      issue(
        "warning",
        `$.capabilityInventory.nodeTypes[${index}]`,
        "Capability inventory node type is not recognized.",
      );
      return;
    }

    availableNodeTypes.add(nodeType.type);
  });

  return availableNodeTypes;
}

function createValidationResult({
  errors,
  value,
  warnings,
}: {
  errors: WorkflowProContractValidationIssue[];
  value: Record<string, unknown> | null;
  warnings: WorkflowProContractValidationIssue[];
}): WorkflowProContractValidationResult {
  return {
    errors,
    ok: errors.length === 0,
    summary: {
      availableNodeTypes: extractSummaryAvailableNodeTypes(value),
      edgeCount: Array.isArray(value?.edges) ? value.edges.length : 0,
      nodeCount: Array.isArray(value?.nodes) ? value.nodes.length : 0,
      outputCount: Array.isArray(value?.outputs) ? value.outputs.length : 0,
      schema: typeof value?.schema === "string" ? value.schema : null,
    },
    warnings,
  };
}

function extractSummaryAvailableNodeTypes(value: Record<string, unknown> | null) {
  if (!isRecord(value?.capabilityInventory)) {
    return [];
  }

  const nodeTypes = value.capabilityInventory.nodeTypes;

  if (!Array.isArray(nodeTypes)) {
    return [];
  }

  return nodeTypes
    .map((nodeType) =>
      isRecord(nodeType) && isWorkflowRuntimeNodeType(nodeType.type)
        ? nodeType.type
        : null,
    )
    .filter((type): type is WorkflowRuntimeNodeType => Boolean(type));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function assertWorkflowProContractDraft(
  value: unknown,
): asserts value is WorkflowProContractDraft {
  const validation = validateWorkflowProContractDraft(value);

  if (!validation.ok) {
    throw new Error(
      validation.errors
        .map((error) => `${error.path}: ${error.message}`)
        .join("\n"),
    );
  }
}
