import type {
  WorkflowRuntimeLiteState,
  WorkflowRuntimeNodeType,
} from "@/lib/nexus-types";

import {
  createWorkflowProRuntimeCapabilityReport,
  createWorkflowProCapabilityInventory,
  summarizeWorkflowProRuntime,
  type WorkflowProRuntimeCapabilityReport,
  type WorkflowProRuntimeSummary,
} from "./capability-inventory";
import {
  createWorkflowProRuntimeEvidenceReport,
  type WorkflowProRuntimeEvidenceReport,
} from "./runtime-evidence";
import {
  inferWorkflowBrainDraftTemplateId,
  serializeWorkflowBrainDraftTemplate,
  type WorkflowBrainDraftTemplateId,
} from "./brain-draft-templates";
import {
  validateWorkflowProBrainReviewProposal,
  type WorkflowProBrainReviewProposal,
  type WorkflowProBrainReviewProposalValidationResult,
} from "./brain-review-proposal";
import { parseWorkflowProContractImportText } from "./workflow-contract-import";
import type {
  WorkflowProContractDraft,
  WorkflowProContractEdge,
  WorkflowProContractNode,
  WorkflowProContractOutput,
  WorkflowProExecutionPlan,
} from "./workflow-contract";
import { isWorkflowRuntimeNodeType } from "@/lib/workflow-runtime-lite/registry";

export type WorkflowGraphBrainModelSettings = {
  modelId: string;
  reasoningDetail: "low" | "medium" | "high";
  reasoningEffort: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
  verbosity: "low" | "medium" | "high";
};

export type WorkflowGraphBrainPlannerRequest = {
  modelSettings?: Partial<WorkflowGraphBrainModelSettings>;
  operatorRequest: string;
  runtimeLite?: WorkflowRuntimeLiteState | null;
  templateHint?: WorkflowBrainDraftTemplateId | "auto";
};

export type WorkflowGraphBrainPlannerMessage = {
  content: string;
  role: "operator" | "architect" | "compiler" | "system";
  title: string;
};

export type WorkflowGraphBrainPlannerResult = {
  architect: {
    interpretedGoal: string;
    missingCapabilities: string[];
    nodePath: string[];
    rationale: string;
    runtimeCapabilityReport: WorkflowProRuntimeCapabilityReport;
    runtimeEvidenceReport: WorkflowProRuntimeEvidenceReport;
    runtimeRead: WorkflowProRuntimeSummary;
  };
  compiler: {
    appendMode: "new-workflow-group";
    contractJson: string;
    selectedTemplateId: WorkflowBrainDraftTemplateId;
    validation: WorkflowProBrainReviewProposalValidationResult;
  };
  messages: WorkflowGraphBrainPlannerMessage[];
  modelSettings: WorkflowGraphBrainModelSettings;
  proposal: WorkflowProBrainReviewProposal;
  schema: "nexus.workflowPro.graphBrainPlannerResult.v1";
  scoreTarget: {
    appendableWorkflowJson: number;
    brainUnderstanding: number;
    screenTestReadiness: number;
  };
  source:
    | "deterministic-planner"
    | "openai-architect-deterministic-compiler"
    | "openai-workflow-planner";
};

const DEFAULT_MODEL_SETTINGS: WorkflowGraphBrainModelSettings = {
  modelId: "gpt-4o-mini",
  reasoningDetail: "low",
  reasoningEffort: "none",
  verbosity: "medium",
};

export function createWorkflowGraphBrainPlannerResult({
  modelSettings,
  operatorRequest,
  runtimeLite,
  templateHint = "auto",
}: WorkflowGraphBrainPlannerRequest): WorkflowGraphBrainPlannerResult {
  const normalizedRequest = normalizeOperatorRequest(operatorRequest);
  const selectedTemplateId =
    templateHint && templateHint !== "auto"
      ? templateHint
      : inferWorkflowBrainDraftTemplateId(normalizedRequest);
  const contract = createContractFromTemplate({
    operatorRequest: normalizedRequest,
    templateId: selectedTemplateId,
  });
  const runtimeRead = summarizeWorkflowProRuntime(runtimeLite ?? undefined);
  const runtimeCapabilityReport = createWorkflowProRuntimeCapabilityReport(
    runtimeLite ?? undefined,
  );
  const runtimeEvidenceReport = createWorkflowProRuntimeEvidenceReport(
    runtimeLite ?? undefined,
  );
  const nodePath = describeNodePath(contract);
  const missingCapabilities = inferMissingCapabilitiesForPlan({
    contract,
    operatorRequest: normalizedRequest,
    selectedTemplateId,
  });
  const proposal = createProposal({
    contract,
    missingCapabilities,
    modelSettings: normalizeModelSettings(modelSettings),
    nodePath,
    operatorRequest: normalizedRequest,
    runtimeCapabilityReport,
    runtimeEvidenceReport,
    runtimeRead,
    selectedTemplateId,
  });
  const validation = validateWorkflowProBrainReviewProposal(proposal);

  return {
    architect: {
      interpretedGoal: createInterpretedGoal({
        operatorRequest: normalizedRequest,
        selectedTemplateId,
      }),
      missingCapabilities,
      nodePath,
      rationale: createArchitectRationale({
        contract,
        runtimeCapabilityReport,
        runtimeRead,
        selectedTemplateId,
      }),
      runtimeCapabilityReport,
      runtimeEvidenceReport,
      runtimeRead,
    },
    compiler: {
      appendMode: "new-workflow-group",
      contractJson: JSON.stringify(contract, null, 2),
      selectedTemplateId,
      validation,
    },
    messages: createPlannerMessages({
      contract,
      missingCapabilities,
      nodePath,
      operatorRequest: normalizedRequest,
      selectedTemplateId,
    }),
    modelSettings: normalizeModelSettings(modelSettings),
    proposal,
    schema: "nexus.workflowPro.graphBrainPlannerResult.v1",
    scoreTarget: {
      appendableWorkflowJson: validation.ok ? 10 : 0,
      brainUnderstanding: 10,
      screenTestReadiness: validation.ok ? 8 : 3,
    },
    source: "deterministic-planner",
  };
}

export function createWorkflowGraphBrainPlannerResultFromModelProposal({
  fallback,
  model,
  proposal,
}: {
  fallback: WorkflowGraphBrainPlannerResult;
  model: string;
  proposal: WorkflowProBrainReviewProposal;
}): WorkflowGraphBrainPlannerResult {
  const normalizedInput = normalizeModelGeneratedProposal({
    fallback,
    proposal,
  });
  const validation = validateWorkflowProBrainReviewProposal(normalizedInput);

  if (!validation.ok || !validation.proposal?.optimizedWorkflow) {
    const detail = validation.errors
      .map((error) => `${error.path}: ${error.message}`)
      .join("; ");

    throw new Error(
      detail
        ? `Graph Brain LLM returned invalid workflow proposal: ${detail}`
        : "Graph Brain LLM did not return an optimizedWorkflow.",
    );
  }

  const optimizedWorkflow = validation.proposal.optimizedWorkflow;
  const nodePath = describeNodePath(optimizedWorkflow);
  const selectedTemplateId = inferTemplateIdFromOptimizedWorkflow({
    fallbackTemplateId: fallback.compiler.selectedTemplateId,
    workflow: optimizedWorkflow,
  });
  const missingCapabilities = [
    ...new Set([
      ...validation.proposal.missingCapabilities,
      ...inferMissingCapabilitiesForPlan({
        contract: optimizedWorkflow,
        operatorRequest:
          optimizedWorkflow.intent || fallback.architect.interpretedGoal,
        selectedTemplateId,
      }),
    ]),
  ].sort();
  const sourceModel =
    validation.proposal.source?.model?.trim() ||
    `${model}/${fallback.modelSettings.reasoningEffort}/${fallback.modelSettings.reasoningDetail}/${fallback.modelSettings.verbosity}`;
  const normalizedProposal: WorkflowProBrainReviewProposal = {
    ...validation.proposal,
    missingCapabilities,
    source: {
      ...validation.proposal.source,
      createdAt:
        validation.proposal.source?.createdAt ?? new Date().toISOString(),
      model: sourceModel,
    },
  };
  const compilerValidation =
    validateWorkflowProBrainReviewProposal(normalizedProposal);

  return {
    ...fallback,
    architect: {
      ...fallback.architect,
      interpretedGoal:
        optimizedWorkflow.intent ||
        fallback.architect.interpretedGoal,
      missingCapabilities,
      nodePath,
      rationale: normalizedProposal.analysis,
    },
    compiler: {
      ...fallback.compiler,
      contractJson: JSON.stringify(optimizedWorkflow, null, 2),
      selectedTemplateId,
      validation: compilerValidation,
    },
    messages: [
      {
        content:
          optimizedWorkflow.intent ||
          fallback.architect.interpretedGoal,
        role: "operator",
        title: "Operator Request",
      },
      {
        content: normalizedProposal.analysis,
        role: "architect",
        title: "LLM Workflow Architect",
      },
      {
        content: [
          `LLM generated ${optimizedWorkflow.nodes.length} nodes / ${optimizedWorkflow.edges.length} edges as nexus.workflow.v1 JSON.`,
          missingCapabilities.length
            ? `Missing capabilities: ${missingCapabilities.join(", ")}.`
            : "No missing capabilities were declared.",
        ].join("\n"),
        role: "compiler",
        title: "LLM JSON Contract Compiler",
      },
    ],
    proposal: normalizedProposal,
    scoreTarget: {
      appendableWorkflowJson: compilerValidation.ok ? 10 : 0,
      brainUnderstanding: 10,
      screenTestReadiness: compilerValidation.ok ? 10 : 3,
    },
    source: "openai-workflow-planner",
  };
}

function normalizeModelGeneratedProposal({
  fallback,
  proposal,
}: {
  fallback: WorkflowGraphBrainPlannerResult;
  proposal: WorkflowProBrainReviewProposal;
}): WorkflowProBrainReviewProposal {
  if (!proposal.optimizedWorkflow) {
    return proposal;
  }

  const workflow = cloneWorkflowContract(proposal.optimizedWorkflow);
  const fallbackWorkflow = fallback.proposal.optimizedWorkflow;
  workflow.nodes = Array.isArray(workflow.nodes)
    ? workflow.nodes.map((node, index) =>
        normalizeModelGeneratedNode({
          fallbackWorkflow,
          index,
          node,
        }),
      )
    : [];
  const nodeIds = new Set(workflow.nodes.map((node) => node.id));
  workflow.edges = Array.isArray(workflow.edges) ? workflow.edges : [];
  workflow.outputs = Array.isArray(workflow.outputs) ? workflow.outputs : [];

  workflow.metadata = {
    ...workflow.metadata,
    createdAt:
      workflow.metadata?.createdAt ||
      fallbackWorkflow?.metadata.createdAt ||
      new Date().toISOString(),
    description:
      workflow.metadata?.description ||
      fallbackWorkflow?.metadata.description ||
      proposal.analysis,
    source: "runtimeLite",
    workspaceId:
      workflow.metadata?.workspaceId ||
      fallbackWorkflow?.metadata.workspaceId ||
      "workspace-graph-brain-draft",
  };

  workflow.capabilityInventory =
    fallbackWorkflow?.capabilityInventory || workflow.capabilityInventory;
  workflow.brain = workflow.brain || fallbackWorkflow?.brain;
  workflow.successCriteria =
    workflow.successCriteria?.length > 0
      ? workflow.successCriteria
      : fallbackWorkflow?.successCriteria ?? [
          "Graph Brain can explain the inferred topology.",
          "The generated workflow can be appended as a new independent group.",
        ];
  workflow.execution = normalizeModelGeneratedExecution({
    fallbackWorkflow,
    workflow,
  });
  workflow.edges = workflow.edges.map((edge, index) =>
    normalizeModelGeneratedEdge({
      edge,
      index,
      workflow,
    }),
  );
  workflow.outputs = normalizeModelGeneratedOutputs({
    nodeIds,
    outputs: workflow.outputs,
    workflow,
  });

  return {
    ...proposal,
    optimizedWorkflow: workflow,
  };
}

function normalizeModelGeneratedNode({
  fallbackWorkflow,
  index,
  node,
}: {
  fallbackWorkflow: WorkflowProContractDraft | null;
  index: number;
  node: WorkflowProContractNode;
}): WorkflowProContractNode {
  const rawType = (node as Record<string, unknown>).type;
  const type = isWorkflowRuntimeNodeType(rawType)
    ? rawType
    : rawType === "model.vision" || rawType === "model.vision.llm"
      ? "model.llm"
      : fallbackWorkflow?.nodes[index]?.type ?? "model.llm";
  const id =
    typeof node.id === "string" && node.id.trim()
      ? node.id.trim()
      : `model-node-${index + 1}`;
  const label =
    typeof node.label === "string" && node.label.trim()
      ? node.label.trim()
      : id;
  const fallbackNode = fallbackWorkflow?.nodes[index];

  return {
    ...node,
    data: isRecord(node.data) ? node.data : {},
    id,
    label,
    limits: Array.isArray(node.limits)
      ? node.limits.filter((item): item is string => typeof item === "string")
      : fallbackNode?.limits ?? [],
    position: isWorkflowPosition(node.position)
      ? node.position
      : fallbackNode?.position ?? {
          x: 80 + index * 280,
          y: type === "model.image" ? 280 : 120,
        },
    purpose:
      typeof node.purpose === "string" && node.purpose.trim()
        ? node.purpose
        : fallbackNode?.purpose ?? `Generated ${type} node.`,
    rationale:
      typeof node.rationale === "string" && node.rationale.trim()
        ? node.rationale
        : fallbackNode?.rationale ??
          "Graph Brain generated this node from the operator request.",
    type,
  };
}

function normalizeModelGeneratedExecution({
  fallbackWorkflow,
  workflow,
}: {
  fallbackWorkflow: WorkflowProContractDraft | null;
  workflow: WorkflowProContractDraft;
}): WorkflowProExecutionPlan {
  const rawExecution: Record<string, unknown> = isRecord(workflow.execution)
    ? workflow.execution
    : {};
  const rawNotes = rawExecution.notes;
  const rawParallelGroups = rawExecution.parallelGroups;
  const notes = Array.isArray(rawNotes)
    ? rawNotes.filter((item): item is string => typeof item === "string")
    : fallbackWorkflow?.execution?.notes ?? [
        "Generated by Graph Brain from a business requirement.",
        "Contract normalization only fills runtime boilerplate; topology remains model-authored.",
      ];
  const explicitGroups = Array.isArray(rawParallelGroups)
    ? rawParallelGroups
    : [];
  const normalizedGroups = explicitGroups
    .map((group, index) =>
      normalizeModelGeneratedParallelGroup({
        group,
        index,
        workflow,
      }),
    )
    .filter((group): group is WorkflowProExecutionPlan["parallelGroups"][number] =>
      Boolean(group),
    );
  const inferredGroups = inferParallelGroupsFromWorkflow(workflow);
  const groupsById = new Map(
    [...normalizedGroups, ...inferredGroups].map((group) => [group.id, group]),
  );

  return {
    mode: "topological",
    notes,
    parallelGroups: [...groupsById.values()],
  };
}

function normalizeModelGeneratedParallelGroup({
  group,
  index,
  workflow,
}: {
  group: unknown;
  index: number;
  workflow: WorkflowProContractDraft;
}): WorkflowProExecutionPlan["parallelGroups"][number] | null {
  if (!isRecord(group)) {
    return null;
  }

  const knownNodeIds = new Set(workflow.nodes.map((node) => node.id));
  const nodeIds = extractParallelNodeIds(group).filter((nodeId) =>
    knownNodeIds.has(nodeId),
  );

  if (nodeIds.length < 2) {
    return null;
  }

  const rawRuntimeStatus = group.runtimeStatus;
  const runtimeStatus =
    rawRuntimeStatus === "native-parallel" ||
    rawRuntimeStatus === "runtime-lite-sequential" ||
    rawRuntimeStatus === "planned"
      ? rawRuntimeStatus
      : "planned";

  return {
    id:
      typeof group.id === "string" && group.id.trim()
        ? group.id.trim()
        : `parallel-group-${index + 1}`,
    nodeIds: [...new Set(nodeIds)],
    reason:
      typeof group.reason === "string" && group.reason.trim()
        ? group.reason.trim()
        : "Graph Brain marked these nodes as a same-stage fan-out group.",
    runtimeStatus,
  };
}

function extractParallelNodeIds(group: Record<string, unknown>) {
  const directCandidates = [
    group.nodeIds,
    group.nodes,
    group.branchNodeIds,
    group.members,
  ];

  for (const candidate of directCandidates) {
    const ids = collectStringNodeIds(candidate);

    if (ids.length > 0) {
      return ids;
    }
  }

  return collectStringNodeIds(group.branches);
}

function collectStringNodeIds(value: unknown): string[] {
  if (typeof value === "string") {
    return [value.trim()].filter(Boolean);
  }

  if (!Array.isArray(value)) {
    if (!isRecord(value)) {
      return [];
    }

    return collectStringNodeIds(value.nodeId ?? value.id ?? value.nodeIds);
  }

  return value.flatMap((item) => collectStringNodeIds(item));
}

function inferParallelGroupsFromWorkflow(
  workflow: WorkflowProContractDraft,
): WorkflowProExecutionPlan["parallelGroups"] {
  const groups: WorkflowProExecutionPlan["parallelGroups"] = [];
  const targetsBySource = new Map<string, string[]>();

  for (const edge of workflow.edges) {
    if (!edge.source || !edge.target) {
      continue;
    }

    targetsBySource.set(edge.source, [
      ...(targetsBySource.get(edge.source) ?? []),
      edge.target,
    ]);
  }

  for (const [source, targetIds] of targetsBySource) {
    const uniqueTargetIds = [...new Set(targetIds)];

    if (uniqueTargetIds.length < 2) {
      continue;
    }

    groups.push({
      id: `fanout-from-${source}`,
      nodeIds: uniqueTargetIds,
      reason: `${source} fans out to ${uniqueTargetIds.length} same-stage downstream nodes.`,
      runtimeStatus: "planned",
    });
  }

  const finalImageNodeIds = inferFinalImageNodeIds(workflow);

  if (finalImageNodeIds.length >= 3) {
    groups.push({
      id: "parallel-final-image-generation",
      nodeIds: finalImageNodeIds,
      reason: "Final image model nodes can run as the same fan-out generation stage.",
      runtimeStatus: "planned",
    });
  }

  return groups;
}

function inferFinalImageNodeIds(workflow: WorkflowProContractDraft) {
  const imageNodes = workflow.nodes.filter((node) => node.type === "model.image");

  if (imageNodes.length < 3) {
    return [];
  }

  const nonSeedImages = imageNodes.filter((node) => {
    const text = `${node.id} ${node.label}`.toLowerCase();

    return (
      !text.includes("seed") &&
      !text.includes("standard") &&
      !text.includes("base") &&
      !text.includes("原畫") &&
      !text.includes("標準")
    );
  });

  return (nonSeedImages.length >= 3 ? nonSeedImages : imageNodes.slice(-3)).map(
    (node) => node.id,
  );
}

function normalizeModelGeneratedEdge({
  edge,
  index,
  workflow,
}: {
  edge: WorkflowProContractEdge;
  index: number;
  workflow: WorkflowProContractDraft;
}): WorkflowProContractEdge {
  const sourceNode = workflow.nodes.find((node) => node.id === edge.source);
  const targetNode = workflow.nodes.find((node) => node.id === edge.target);

  return {
    ...edge,
    id: edge.id || `edge-${edge.source}-${edge.target}-${index + 1}`,
    mode: edge.mode || "always",
    packetContract: edge.packetContract || {
      allowedMedia: inferAllowedMedia(sourceNode?.type, targetNode?.type),
      input: "ContextPacket",
      output: "ContextPacket",
    },
    reason:
      edge.reason ||
      `${sourceNode?.label ?? edge.source} passes ContextPacket data to ${targetNode?.label ?? edge.target}.`,
    sourceHandle: edge.sourceHandle || "output",
    targetHandle: edge.targetHandle || "input",
  };
}

function normalizeModelGeneratedOutputs({
  nodeIds,
  outputs,
  workflow,
}: {
  nodeIds: Set<string>;
  outputs: WorkflowProContractOutput[];
  workflow: WorkflowProContractDraft;
}): WorkflowProContractOutput[] {
  const finalImageNodeIds = new Set(inferFinalImageNodeIds(workflow));
  const fallbackOutputs = workflow.nodes
    .filter(
      (node) =>
        node.type === "output.text" ||
        (node.type === "model.image" &&
          (finalImageNodeIds.size === 0 || finalImageNodeIds.has(node.id))),
    )
    .map((node): WorkflowProContractOutput => ({
      artifactPolicy: node.artifactPolicy,
      id: `output-${node.id}`,
      sourceNodeId: node.id,
      type: node.type === "model.image" ? "image" : "text",
    }));

  const normalizedOutputs = outputs.map((output, index) => {
    const explicitNodeId = getModelGeneratedOutputNodeId(output);

    if (explicitNodeId && nodeIds.has(explicitNodeId)) {
      return {
        ...output,
        sourceNodeId: explicitNodeId,
      };
    }

    if (nodeIds.has(output.sourceNodeId)) {
      return output;
    }

    const replacement =
      inferOutputSourceNodeId({
        preferredType: output.type,
        workflow,
      }) ?? fallbackOutputs[index]?.sourceNodeId;

    return {
      ...output,
      sourceNodeId: replacement ?? output.sourceNodeId,
    };
  });

  return normalizedOutputs.length > 0 ? normalizedOutputs : fallbackOutputs;
}

function getModelGeneratedOutputNodeId(output: WorkflowProContractOutput) {
  const value = (output as Record<string, unknown>).nodeId;

  return typeof value === "string" ? value.trim() : "";
}

function inferOutputSourceNodeId({
  preferredType,
  workflow,
}: {
  preferredType: WorkflowProContractOutput["type"];
  workflow: WorkflowProContractDraft;
}) {
  if (preferredType === "image" || preferredType === "artifact") {
    return workflow.nodes.find((node) => node.type === "model.image")?.id;
  }

  return (
    workflow.nodes.find((node) => node.type === "output.text")?.id ??
    workflow.nodes.at(-1)?.id
  );
}

function inferTemplateIdFromOptimizedWorkflow({
  fallbackTemplateId,
  workflow,
}: {
  fallbackTemplateId: WorkflowBrainDraftTemplateId;
  workflow: WorkflowProContractDraft;
}): WorkflowBrainDraftTemplateId {
  const llmCount = workflow.nodes.filter((node) => node.type === "model.llm").length;
  const imageCount = workflow.nodes.filter((node) => node.type === "model.image").length;
  const fileCount = workflow.nodes.filter((node) => node.type === "node.file").length;
  const parallelGroupCount =
    workflow.execution?.parallelGroups?.filter((group) => group.nodeIds.length > 1)
      .length ?? 0;

  if (imageCount >= 3 || parallelGroupCount > 0) {
    return "image-reverse-fanout";
  }

  if (imageCount === 1 && llmCount === 1 && fileCount === 0) {
    return "llm-to-image";
  }

  if (imageCount === 0 && llmCount >= 2 && fileCount === 0) {
    return "baseline-linear";
  }

  return fallbackTemplateId;
}

function inferAllowedMedia(
  sourceType: WorkflowRuntimeNodeType | undefined,
  targetType: WorkflowRuntimeNodeType | undefined,
): Array<"text" | "image" | "video" | "file" | "json"> {
  if (sourceType === "model.image") {
    return ["image", "json"];
  }

  if (sourceType === "node.file" || targetType === "node.file") {
    return ["text", "image", "file", "json"];
  }

  return ["text", "json"];
}

function cloneWorkflowContract(
  workflow: WorkflowProContractDraft,
): WorkflowProContractDraft {
  return JSON.parse(JSON.stringify(workflow)) as WorkflowProContractDraft;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWorkflowPosition(value: unknown): value is { x: number; y: number } {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.x === "number" && typeof value.y === "number";
}

function createContractFromTemplate({
  operatorRequest,
  templateId,
}: {
  operatorRequest: string;
  templateId: WorkflowBrainDraftTemplateId;
}): WorkflowProContractDraft {
  const serialized = serializeWorkflowBrainDraftTemplate({
    description: operatorRequest,
    templateId,
  });
  const review = parseWorkflowProContractImportText({
    receivedAt: "2026-06-04T00:00:00.000Z",
    sourceName: `graph-brain-${templateId}.json`,
    text: serialized,
  });

  if (review.status === "accepted" && review.contract) {
    return review.contract;
  }

  throw new Error(
    review.status === "rejected"
      ? review.error
      : "Graph Brain template did not produce an accepted workflow contract.",
  );
}

function createProposal({
  contract,
  missingCapabilities,
  modelSettings,
  nodePath,
  operatorRequest,
  runtimeCapabilityReport,
  runtimeEvidenceReport,
  runtimeRead,
  selectedTemplateId,
}: {
  contract: WorkflowProContractDraft;
  missingCapabilities: string[];
  modelSettings: WorkflowGraphBrainModelSettings;
  nodePath: string[];
  operatorRequest: string;
  runtimeCapabilityReport: WorkflowProRuntimeCapabilityReport;
  runtimeEvidenceReport: WorkflowProRuntimeEvidenceReport;
  runtimeRead: WorkflowProRuntimeSummary;
  selectedTemplateId: WorkflowBrainDraftTemplateId;
}): WorkflowProBrainReviewProposal {
  return {
    analysis: [
      `我已讀取目前畫布摘要：${runtimeRead.nodeCount} 個節點、${runtimeRead.edgeCount} 條連線、${runtimeRead.runCount} 次 runtime 紀錄。`,
      `你的需求被判斷為 ${selectedTemplateId} 類型；我會新增一整組 workflow 節點，而不是覆蓋現有畫布。`,
      `建議節點路徑：${nodePath.join(" -> ")}。`,
      `目前 RuntimeLite 執行政策是 ${runtimeCapabilityReport.executionPolicy.mode}，workflowTimeout=${runtimeCapabilityReport.executionPolicy.workflowTimeout}，nativeParallelExecution=${runtimeCapabilityReport.executionPolicy.nativeParallelExecution}。`,
      runtimeEvidenceReport.latestRun
        ? `最近一次 run=${runtimeEvidenceReport.latestRun.runId}，狀態=${runtimeEvidenceReport.latestRun.status}，節點證據=${runtimeEvidenceReport.timeline.length} 筆，artifact=${runtimeEvidenceReport.latestRun.artifactCount}。`
        : "目前沒有可讀取的 runtime run evidence；Brain 只能做規劃，還不能根據實跑結果修復節點。",
      "這個方案先用現有 RuntimeLite 可支援的 input、file、LLM、image、output 節點打通，再把還不能真正執行的能力列入 missingCapabilities。",
    ].join("\n"),
    missingCapabilities,
    optimizedWorkflow: contract,
    questionsForSean: createQuestionsForSean({
      missingCapabilities,
      operatorRequest,
      selectedTemplateId,
    }),
    schema: "nexus.workflowPro.brainReviewProposal.v1",
    source: {
      createdAt: "2026-06-04T00:00:00.000Z",
      model: `${modelSettings.modelId}/${modelSettings.reasoningEffort}/${modelSettings.reasoningDetail}/${modelSettings.verbosity}`,
    },
  };
}

function describeNodePath(contract: WorkflowProContractDraft) {
  const labelById = new Map(
    contract.nodes.map((node) => [node.id, `${node.label} (${node.type})`]),
  );

  if (!contract.edges.length) {
    return contract.nodes.map((node) => `${node.label} (${node.type})`);
  }

  return contract.edges.map((edge) => {
    const source = labelById.get(edge.source) ?? edge.source;
    const target = labelById.get(edge.target) ?? edge.target;

    return `${source} -> ${target}`;
  });
}

function inferMissingCapabilitiesForPlan({
  contract,
  operatorRequest,
  selectedTemplateId,
}: {
  contract: WorkflowProContractDraft;
  operatorRequest: string;
  selectedTemplateId: WorkflowBrainDraftTemplateId;
}) {
  const inventory = createWorkflowProCapabilityInventory();
  const missing = new Set<string>();

  if (operatorRequest.includes("語音") || /\baudio\b/i.test(operatorRequest)) {
    missing.add("compiler.audio.transcribe");
  }

  if (
    operatorRequest.includes("反推") ||
    operatorRequest.includes("圖像") ||
    /\bvision\b/i.test(operatorRequest)
  ) {
    missing.add("model.vision.prompt-reverse");
  }

  if (
    selectedTemplateId === "audio-prompt-image-reverse-fanout" ||
    selectedTemplateId === "image-reverse-fanout"
  ) {
    missing.add("model.vision.prompt-reverse");
    missing.add("node.parallel.join");
  }

  if (contract.nodes.some((node) => node.type === "node.file")) {
    missing.add("artifact.file.raw-compiled-link");
  }

  for (const capability of inventory.notAvailableYet) {
    if (isRelevantInventoryCapability(capability, contract, operatorRequest)) {
      missing.add(capability);
    }
  }

  return [...missing].sort();
}

function isRelevantInventoryCapability(
  capability: string,
  contract: WorkflowProContractDraft,
  operatorRequest: string,
) {
  if (capability.includes("validator") || capability.includes("import")) {
    return false;
  }

  if (capability === "model.video") {
    return operatorRequest.includes("影片") || /\bvideo\b/i.test(operatorRequest);
  }

  if (capability.includes("zip")) {
    return operatorRequest.includes("zip") || operatorRequest.includes("壓縮");
  }

  if (capability.includes("parallel")) {
    return contract.execution?.parallelGroups.some((group) => group.nodeIds.length > 1);
  }

  return capability.includes("brain") || capability.includes("compiler");
}

function createInterpretedGoal({
  operatorRequest,
  selectedTemplateId,
}: {
  operatorRequest: string;
  selectedTemplateId: WorkflowBrainDraftTemplateId;
}) {
  if (selectedTemplateId === "audio-prompt-image-reverse-fanout") {
    return "建立一組從語音/文字提示出發，產生 seed image，再反推出提示詞邏輯，最後 fan-out 到三路風格圖片的工作流。";
  }

  if (selectedTemplateId === "image-file-two-llm-answer") {
    return "建立一組從圖片或檔案輸入出發，經過檔案編譯邊界與兩個高推理 LLM，最後輸出答案的工作流。";
  }

  return `依照使用者需求建立可 append 的 workflow：${operatorRequest}`;
}

function createArchitectRationale({
  contract,
  runtimeCapabilityReport,
  runtimeRead,
  selectedTemplateId,
}: {
  contract: WorkflowProContractDraft;
  runtimeCapabilityReport: WorkflowProRuntimeCapabilityReport;
  runtimeRead: WorkflowProRuntimeSummary;
  selectedTemplateId: WorkflowBrainDraftTemplateId;
}) {
  return [
    `目前畫布已經有 ${runtimeRead.nodeCount} 個 RuntimeLite 節點，所以新方案採 append group，避免污染既有節點組。`,
    `選用 ${selectedTemplateId} 是因為它最貼近需求描述，且所有節點型別都存在於 RuntimeLite registry。`,
    `產出的 contract 含 ${contract.nodes.length} 個節點與 ${contract.edges.length} 條邊，可走現有 validator、runtime bridge、append group。`,
    `Runner 目前是 ${runtimeCapabilityReport.executionPolicy.mode}，不設 workflow timeout；fan-out 可用 ready-node parallel 批次執行，explicit join node 仍需後續升級。`,
  ].join(" ");
}

function createPlannerMessages({
  contract,
  missingCapabilities,
  nodePath,
  operatorRequest,
  selectedTemplateId,
}: {
  contract: WorkflowProContractDraft;
  missingCapabilities: string[];
  nodePath: string[];
  operatorRequest: string;
  selectedTemplateId: WorkflowBrainDraftTemplateId;
}): WorkflowGraphBrainPlannerMessage[] {
  return [
    {
      content: operatorRequest,
      role: "operator",
      title: "Operator Request",
    },
    {
      content: [
        `我會把這次需求歸類為 ${selectedTemplateId}。`,
        "畫布可以同時存在多組 workflow，所以這次只新增一組新節點，不改舊節點。",
        `路徑規劃：${nodePath.slice(0, 6).join(" | ")}${nodePath.length > 6 ? " | ..." : ""}`,
      ].join("\n"),
      role: "architect",
      title: "Intent Architect",
    },
    {
      content: [
        `已產生 ${contract.nodes.length} nodes / ${contract.edges.length} edges 的 nexus.workflow.v1 JSON。`,
        missingCapabilities.length
          ? `目前需標記但不能假裝已完成的能力：${missingCapabilities.join(", ")}。`
          : "目前沒有額外 missing capability。",
      ].join("\n"),
      role: "compiler",
      title: "JSON Contract Compiler",
    },
  ];
}

function createQuestionsForSean({
  missingCapabilities,
  operatorRequest,
  selectedTemplateId,
}: {
  missingCapabilities: string[];
  operatorRequest: string;
  selectedTemplateId: WorkflowBrainDraftTemplateId;
}) {
  const questions = [
    "這組新 workflow 是否要保留在目前畫布，還是之後需要一鍵封裝成可重用 template？",
  ];

  if (selectedTemplateId.includes("fanout")) {
    questions.push("三路 fan-out 的最終圖片是否需要最後再加一個 gallery 或 zip compiler output？");
  }

  if (missingCapabilities.includes("compiler.audio.transcribe")) {
    questions.push("語音節點下一步要先接轉文字 compiler，還是先維持檔案引用與文字描述並行？");
  }

  if (operatorRequest.includes("圖") || operatorRequest.includes("image")) {
    questions.push("圖片輸入要優先做 vision 讀圖，還是先做圖片 metadata / artifact 引用的穩定傳遞？");
  }

  return questions;
}

function normalizeOperatorRequest(value: string) {
  const trimmed = value.trim();

  return trimmed || "請依照目前畫布能力，建立一組新的可執行 workflow。";
}

function normalizeModelSettings(
  input: Partial<WorkflowGraphBrainModelSettings> | undefined,
): WorkflowGraphBrainModelSettings {
  return {
    modelId: input?.modelId?.trim() || DEFAULT_MODEL_SETTINGS.modelId,
    reasoningDetail: input?.reasoningDetail ?? DEFAULT_MODEL_SETTINGS.reasoningDetail,
    reasoningEffort: input?.reasoningEffort ?? DEFAULT_MODEL_SETTINGS.reasoningEffort,
    verbosity: input?.verbosity ?? DEFAULT_MODEL_SETTINGS.verbosity,
  };
}

export function getWorkflowGraphBrainNodeTypeSummary(
  contract: WorkflowProContractDraft,
) {
  const summary = new Map<WorkflowRuntimeNodeType, number>();

  for (const node of contract.nodes) {
    summary.set(node.type, (summary.get(node.type) ?? 0) + 1);
  }

  return [...summary.entries()].map(([type, count]) => ({ count, type }));
}
