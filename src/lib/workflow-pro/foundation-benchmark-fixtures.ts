import {
  createWorkflowProCapabilityInventory,
} from "./capability-inventory";
import type {
  WorkflowProContractDraft,
  WorkflowProContractEdge,
  WorkflowProContractNode,
  WorkflowProExecutionPlan,
} from "./workflow-contract";
import type {
  ModelImageNodeData,
  ModelLlmNodeData,
  OutputTextNodeData,
  WorkflowRuntimePosition,
} from "@/lib/nexus-types";

export type WorkflowProFoundationBenchmarkId =
  | "baseline-linear"
  | "llm-to-image"
  | "image-reverse-fanout";

export type WorkflowProFoundationBenchmarkFixture = {
  contract: WorkflowProContractDraft;
  expectedScore: number;
  id: WorkflowProFoundationBenchmarkId;
  title: string;
};

const CREATED_AT = "2026-06-03T00:00:00.000Z";
const WORKSPACE_ID = "workspace-workflow-pro-foundation";
const DEFAULT_LLM_MODEL = "gpt-4o-mini";
const DEFAULT_PROVIDER = "openai";
const DEFAULT_IMAGE_MODEL = "img2";

export function createWorkflowProFoundationBenchmarkFixtures() {
  return [
    createBaselineLinearBenchmark(),
    createLlmToImageBenchmark(),
    createImageReverseFanoutBenchmark(),
  ] satisfies WorkflowProFoundationBenchmarkFixture[];
}

export function findWorkflowProFoundationBenchmarkFixture(
  id: WorkflowProFoundationBenchmarkId,
) {
  return createWorkflowProFoundationBenchmarkFixtures().find(
    (fixture) => fixture.id === id,
  );
}

export function serializeWorkflowProFoundationBenchmarkFixture(
  id: WorkflowProFoundationBenchmarkId,
) {
  const fixture = findWorkflowProFoundationBenchmarkFixture(id);

  if (!fixture) {
    throw new Error(`Unknown Workflow Pro foundation benchmark fixture: ${id}`);
  }

  return JSON.stringify(fixture.contract, null, 2);
}

function createBaselineLinearBenchmark(): WorkflowProFoundationBenchmarkFixture {
  const nodes = [
    inputNode("bench-a-input", "Y2K wide pants product direction brief.", { x: 0, y: 0 }),
    llmNode(
      "bench-a-llm-brief",
      "Brief Analyst",
      "Extract the core product direction, user, constraints, and success criteria from the upstream brief.",
      { x: 260, y: 0 },
      "high",
    ),
    llmNode(
      "bench-a-llm-final",
      "Final Planner",
      "Turn the upstream analysis into a concise production-ready plan with risks and next actions.",
      { x: 520, y: 0 },
      "medium",
    ),
    outputNode("bench-a-output", "Linear Output", { x: 780, y: 0 }),
  ];

  return {
    contract: contract({
      edges: [
        edge("bench-a-input", "bench-a-llm-brief"),
        edge("bench-a-llm-brief", "bench-a-llm-final"),
        edge("bench-a-llm-final", "bench-a-output"),
      ],
      execution: sequentialExecution(),
      id: "workflow-pro-foundation-baseline-linear",
      intent:
        "Foundation benchmark A verifies Input -> LLM -> LLM -> Output ContextPacket continuity.",
      name: "A / Baseline Linear Text Chain",
      nodes,
      outputs: [
        {
          artifactPolicy: textArtifactPolicy(),
          id: "output-bench-a-output",
          sourceNodeId: "bench-a-output",
          type: "text",
        },
      ],
      successCriteria: [
        "The JSON contract validates.",
        "Apply Preview can replace Runtime Lite.",
        "Start All produces a final output packet from the second LLM.",
      ],
    }),
    expectedScore: 10,
    id: "baseline-linear",
    title: "A / Input -> LLM -> LLM -> Output",
  };
}

function createLlmToImageBenchmark(): WorkflowProFoundationBenchmarkFixture {
  const nodes = [
    inputNode(
      "bench-b-input",
      "Generate a 16:9 standard Y2K fashion board focused on trendy wide pants.",
      { x: 0, y: 0 },
    ),
    llmNode(
      "bench-b-llm-prompt",
      "Prompt Enhancer",
      "Rewrite the upstream brief into a vivid image prompt. Preserve 16:9, standard quality, Y2K wide pants, and fashion-board composition.",
      { x: 260, y: 0 },
      "medium",
    ),
    imageNode("bench-b-image", "Y2K Image Model", { x: 520, y: 0 }),
    outputNode("bench-b-output", "Image Output", { x: 780, y: 0 }),
  ];

  return {
    contract: contract({
      edges: [
        edge("bench-b-input", "bench-b-llm-prompt"),
        edge("bench-b-llm-prompt", "bench-b-image", ["text", "image", "file", "json"]),
        edge("bench-b-image", "bench-b-output", ["text", "image", "file", "json"]),
      ],
      execution: sequentialExecution([
        "Image generation persists through artifact-backed history when workspace permission is available.",
      ]),
      id: "workflow-pro-foundation-llm-to-image",
      intent:
        "Foundation benchmark B verifies Input -> LLM prompt enhancement -> Image Model -> Output.",
      name: "B / LLM To Image Artifact Chain",
      nodes,
      outputs: [
        {
          artifactPolicy: generatedImageArtifactPolicy(),
          id: "output-bench-b-image",
          sourceNodeId: "bench-b-image",
          type: "image",
        },
        {
          artifactPolicy: textArtifactPolicy(),
          id: "output-bench-b-output",
          sourceNodeId: "bench-b-output",
          type: "text",
        },
      ],
      successCriteria: [
        "The JSON contract validates.",
        "Apply Preview can replace Runtime Lite.",
        "Start All reaches the image node and exposes imageUrl/artifact metadata downstream.",
      ],
    }),
    expectedScore: 10,
    id: "llm-to-image",
    title: "B / Input -> LLM -> Image Model -> Output",
  };
}

function createImageReverseFanoutBenchmark(): WorkflowProFoundationBenchmarkFixture {
  const nodes = [
    inputNode(
      "bench-c-input",
      "Create one seed Y2K wide-pants fashion image, reverse it into style logic, then branch into three distinct visual directions.",
      { x: 0, y: 120 },
    ),
    llmNode(
      "bench-c-llm-seed",
      "Seed Prompt Designer",
      "Create a focused seed prompt for one Y2K wide-pants editorial image.",
      { x: 260, y: 120 },
      "medium",
    ),
    imageNode("bench-c-seed-image", "Seed Image Model", { x: 520, y: 120 }),
    llmNode(
      "bench-c-llm-reverse",
      "Image Reference Reverse Planner",
      "Read the upstream image URL, artifact metadata, prompt, and revised prompt. Infer reusable style logic, then prepare three branch instructions. If native vision input is unavailable, reason from the upstream artifact reference text.",
      { x: 780, y: 120 },
      "high",
    ),
    llmNode(
      "bench-c-llm-style-1",
      "Cyber Y2K Stylist",
      "Create branch 1: chrome, clubwear, wide pants, high contrast editorial styling.",
      { x: 1040, y: -40 },
      "medium",
    ),
    llmNode(
      "bench-c-llm-style-2",
      "Pop Y2K Stylist",
      "Create branch 2: candy color, streetwear, wide pants, magazine board styling.",
      { x: 1040, y: 120 },
      "medium",
    ),
    llmNode(
      "bench-c-llm-style-3",
      "Minimal Y2K Stylist",
      "Create branch 3: white studio, sculptural wide pants, restrained futuristic styling.",
      { x: 1040, y: 280 },
      "medium",
    ),
    imageNode("bench-c-image-1", "Cyber Image", { x: 1300, y: -40 }),
    imageNode("bench-c-image-2", "Pop Image", { x: 1300, y: 120 }),
    imageNode("bench-c-image-3", "Minimal Image", { x: 1300, y: 280 }),
    outputNode("bench-c-output-1", "Cyber Output", { x: 1560, y: -40 }),
    outputNode("bench-c-output-2", "Pop Output", { x: 1560, y: 120 }),
    outputNode("bench-c-output-3", "Minimal Output", { x: 1560, y: 280 }),
  ];
  const imageOutputs: WorkflowProContractDraft["outputs"] = [
    "bench-c-image-1",
    "bench-c-image-2",
    "bench-c-image-3",
  ].map((sourceNodeId) => ({
    artifactPolicy: generatedImageArtifactPolicy(),
    id: `output-${sourceNodeId}`,
    sourceNodeId,
    type: "image",
  }));
  const textOutputs: WorkflowProContractDraft["outputs"] = [
    "bench-c-output-1",
    "bench-c-output-2",
    "bench-c-output-3",
  ].map((sourceNodeId) => ({
    artifactPolicy: textArtifactPolicy(),
    id: `output-${sourceNodeId}`,
    sourceNodeId,
    type: "text",
  }));

  return {
    contract: contract({
      edges: [
        edge("bench-c-input", "bench-c-llm-seed"),
        edge("bench-c-llm-seed", "bench-c-seed-image", ["text", "image", "file", "json"]),
        edge("bench-c-seed-image", "bench-c-llm-reverse", ["text", "image", "file", "json"]),
        edge("bench-c-llm-reverse", "bench-c-llm-style-1"),
        edge("bench-c-llm-reverse", "bench-c-llm-style-2"),
        edge("bench-c-llm-reverse", "bench-c-llm-style-3"),
        edge("bench-c-llm-style-1", "bench-c-image-1", ["text", "image", "file", "json"]),
        edge("bench-c-llm-style-2", "bench-c-image-2", ["text", "image", "file", "json"]),
        edge("bench-c-llm-style-3", "bench-c-image-3", ["text", "image", "file", "json"]),
        edge("bench-c-image-1", "bench-c-output-1", ["text", "image", "file", "json"]),
        edge("bench-c-image-2", "bench-c-output-2", ["text", "image", "file", "json"]),
        edge("bench-c-image-3", "bench-c-output-3", ["text", "image", "file", "json"]),
      ],
      execution: sequentialExecution(
        [
          "This benchmark represents fan-out groups, but Runtime Lite executes the topological path sequentially today.",
          "Native vision input is not available yet; the reverse planner consumes image URL/artifact metadata text.",
        ],
        [
          {
            id: "style-llm-fanout",
            nodeIds: [
              "bench-c-llm-style-1",
              "bench-c-llm-style-2",
              "bench-c-llm-style-3",
            ],
            reason: "Three style instructions can be evaluated independently after reverse planning.",
            runtimeStatus: "runtime-lite-sequential",
          },
          {
            id: "image-model-fanout",
            nodeIds: ["bench-c-image-1", "bench-c-image-2", "bench-c-image-3"],
            reason: "Three final image generations can be evaluated independently after style prompts.",
            runtimeStatus: "runtime-lite-sequential",
          },
        ],
      ),
      id: "workflow-pro-foundation-image-reverse-fanout",
      intent:
        "Foundation benchmark C verifies image artifact reference propagation, reverse planning, fan-out branch representation, and three independent outputs.",
      name: "C / Image Reference Reverse Fan-Out",
      nodes,
      outputs: [...imageOutputs, ...textOutputs],
      successCriteria: [
        "The JSON contract validates.",
        "Apply Preview can replace Runtime Lite.",
        "Start All reaches all three branch outputs.",
        "The contract explicitly records current limits: runtime-lite-sequential fan-out and text-based image reference reverse planning.",
      ],
    }),
    expectedScore: 10,
    id: "image-reverse-fanout",
    title: "C / Image Reference Reverse Fan-Out",
  };
}

function contract({
  edges,
  execution,
  id,
  intent,
  name,
  nodes,
  outputs,
  successCriteria,
}: Pick<
  WorkflowProContractDraft,
  "edges" | "execution" | "id" | "intent" | "name" | "nodes" | "outputs" | "successCriteria"
>): WorkflowProContractDraft {
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
        "execution.parallelGroups",
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
    capabilityInventory: createWorkflowProCapabilityInventory(),
    edges,
    execution,
    id,
    intent,
    metadata: {
      createdAt: CREATED_AT,
      description:
        "Workflow Pro foundation benchmark fixture. It is intended for UI paste import, validation, apply preview, Graph execution, and regression scoring.",
      source: "runtimeLite",
      workspaceId: WORKSPACE_ID,
    },
    name,
    nodes,
    outputs,
    schema: "nexus.workflow.v1",
    successCriteria,
  };
}

function inputNode(
  id: string,
  text: string,
  position: WorkflowRuntimePosition,
): WorkflowProContractNode {
  return node({
    data: {
      label: "Input",
      text,
    },
    id,
    label: "Input",
    limits: ["One start input is supported by Runtime Lite."],
    position,
    purpose: "Creates the initial ContextPacket for a workflow run.",
    rationale: "Foundation benchmark start node.",
    type: "input.text",
  });
}

function llmNode(
  id: string,
  label: string,
  prompt: string,
  position: WorkflowRuntimePosition,
  reasoningEffort: NonNullable<ModelLlmNodeData["modelSettings"]>["reasoningEffort"],
): WorkflowProContractNode {
  return node({
    data: {
      label,
      model: DEFAULT_LLM_MODEL,
      modelSettings: { reasoningEffort },
      prompt,
      provider: DEFAULT_PROVIDER,
    } satisfies ModelLlmNodeData,
    id,
    label,
    limits: ["Requires authenticated runtime route access for live model calls."],
    model: {
      modelId: DEFAULT_LLM_MODEL,
      provider: DEFAULT_PROVIDER,
      settings: { reasoningEffort },
    },
    position,
    purpose: "Calls the existing model runtime boundary with upstream context.",
    rationale: `${label} is part of the Workflow Pro foundation benchmark chain.`,
    type: "model.llm",
  });
}

function imageNode(
  id: string,
  label: string,
  position: WorkflowRuntimePosition,
): WorkflowProContractNode {
  return node({
    artifactPolicy: generatedImageArtifactPolicy(),
    data: {
      aspectRatio: "16:9",
      label,
      modelId: DEFAULT_IMAGE_MODEL,
      prompt: "",
      quality: "standard",
    } satisfies ModelImageNodeData,
    id,
    label,
    limits: [
      "Requires image generation boundary.",
      "Artifact history requires workspace update permission.",
    ],
    model: {
      modelId: DEFAULT_IMAGE_MODEL,
      provider: "openai-compatible-image",
      settings: { reasoningDetail: "low" },
    },
    position,
    purpose: "Routes upstream context through the image generation boundary.",
    rationale: `${label} verifies image artifact creation and ContextPacket propagation.`,
    type: "model.image",
  });
}

function outputNode(
  id: string,
  label: string,
  position: WorkflowRuntimePosition,
): WorkflowProContractNode {
  return node({
    artifactPolicy: textArtifactPolicy(),
    data: {
      label,
      renderMode: "plain",
    } satisfies OutputTextNodeData,
    id,
    label,
    limits: ["Displays and passes through the upstream ContextPacket."],
    position,
    purpose: "Displays and passes through the upstream ContextPacket.",
    rationale: `${label} is the visible benchmark output node.`,
    type: "output.text",
  });
}

function node(input: WorkflowProContractNode): WorkflowProContractNode {
  return input;
}

function edge(
  source: string,
  target: string,
  allowedMedia: WorkflowProContractEdge["packetContract"]["allowedMedia"] = [
    "text",
    "json",
  ],
): WorkflowProContractEdge {
  return {
    id: `edge-${source}-${target}`,
    mode: "always",
    packetContract: {
      allowedMedia,
      input: "ContextPacket",
      output: "ContextPacket",
    },
    reason: `Pass ContextPacket from ${source} to ${target}.`,
    source,
    sourceHandle: "output",
    target,
    targetHandle: "input",
  };
}

function sequentialExecution(
  notes: string[] = [],
  parallelGroups: WorkflowProExecutionPlan["parallelGroups"] = [],
): WorkflowProExecutionPlan {
  return {
    mode: "topological",
    notes: [
      "Runtime Lite currently validates a DAG and executes nodes in topological order.",
      ...notes,
    ],
    parallelGroups,
  };
}

function generatedImageArtifactPolicy() {
  return {
    downloadable: true,
    historyScope: "workspace",
    persist: true,
    type: "generated-image",
  } satisfies WorkflowProContractNode["artifactPolicy"];
}

function textArtifactPolicy() {
  return {
    downloadable: false,
    historyScope: "run",
    persist: false,
    type: "text",
  } satisfies WorkflowProContractNode["artifactPolicy"];
}
