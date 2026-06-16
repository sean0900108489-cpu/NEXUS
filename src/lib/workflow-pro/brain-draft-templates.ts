import { NEXUS_ATTACHMENT_NOOP_COMPILER } from "@/lib/attachments/attachment-compiler-registry";
import type {
  FileNodeData,
  ModelImageNodeData,
  ModelLlmNodeData,
  OutputTextNodeData,
  WorkflowRuntimePosition,
} from "@/lib/nexus-types";

import { createWorkflowProCapabilityInventory } from "./capability-inventory";
import type {
  WorkflowProContractDraft,
  WorkflowProContractEdge,
  WorkflowProContractNode,
  WorkflowProExecutionPlan,
  WorkflowProPacketContract,
} from "./workflow-contract";
import {
  serializeWorkflowProFoundationBenchmarkFixture,
  type WorkflowProFoundationBenchmarkId,
} from "./foundation-benchmark-fixtures";

export type WorkflowBrainDraftTemplateId =
  | WorkflowProFoundationBenchmarkId
  | "image-file-two-llm-answer"
  | "audio-prompt-image-reverse-fanout";

export type WorkflowBrainDraftTemplate = {
  description: string;
  id: WorkflowBrainDraftTemplateId;
  title: string;
};

export const WORKFLOW_BRAIN_DRAFT_TEMPLATES: WorkflowBrainDraftTemplate[] = [
  {
    description: "圖或檔案進入 input，通過兩個已設定提示詞的 LLM，最後輸出答案。",
    id: "image-file-two-llm-answer",
    title: "Image/File Input -> 2 LLM -> Output",
  },
  {
    description:
      "語音提示詞經過檔案節點、生成圖片、反推提示詞，再分成三路風格生成圖片。",
    id: "audio-prompt-image-reverse-fanout",
    title: "Audio Prompt -> Image Reverse -> 3 Branches",
  },
  {
    description: "標準 A 題：Input -> LLM -> LLM -> Output。",
    id: "baseline-linear",
    title: "Benchmark A / Linear",
  },
  {
    description: "標準 B 題：Input -> LLM -> Image Model -> Output。",
    id: "llm-to-image",
    title: "Benchmark B / LLM To Image",
  },
  {
    description: "標準 C 題：圖片反推後 fan-out 到三路圖片輸出。",
    id: "image-reverse-fanout",
    title: "Benchmark C / Reverse Fan-Out",
  },
];

const CREATED_AT = "2026-06-04T00:00:00.000Z";
const WORKSPACE_ID = "workspace-graph-brain-draft";
const DEFAULT_LLM_MODEL = "gpt-4o-mini";
const DEFAULT_PROVIDER = "openai";
const DEFAULT_IMAGE_MODEL = "img2";

export function serializeWorkflowBrainDraftTemplate({
  description,
  templateId,
}: {
  description?: string;
  templateId: WorkflowBrainDraftTemplateId;
}) {
  if (
    templateId === "baseline-linear" ||
    templateId === "llm-to-image" ||
    templateId === "image-reverse-fanout"
  ) {
    return serializeWorkflowProFoundationBenchmarkFixture(templateId);
  }

  const contract =
    templateId === "audio-prompt-image-reverse-fanout"
      ? createAudioPromptImageReverseFanoutDraft(description)
      : createImageFileTwoLlmAnswerDraft(description);

  return JSON.stringify(contract, null, 2);
}

export function inferWorkflowBrainDraftTemplateId(
  description: string,
): WorkflowBrainDraftTemplateId {
  const normalized = description.toLowerCase();

  if (
    normalized.includes("audio") ||
    description.includes("語音") ||
    description.includes("反推") ||
    description.includes("三個") ||
    description.includes("三路")
  ) {
    return "audio-prompt-image-reverse-fanout";
  }

  if (
    normalized.includes("image") ||
    description.includes("圖") ||
    description.includes("圖片") ||
    description.includes("圖像") ||
    description.includes("檔案")
  ) {
    return "image-file-two-llm-answer";
  }

  return "baseline-linear";
}

function createImageFileTwoLlmAnswerDraft(description = ""): WorkflowProContractDraft {
  const nodes = [
    inputNode("brain-image-input", description || "Attach an image or describe the file-backed task.", {
      x: 0,
      y: 0,
    }),
    fileNode(
      "brain-image-file",
      "Image/File Carrier",
      "Carries uploaded image/file references through a compiler boundary. Current compiler is noop; future image extraction or zip expansion can be plugged in here.",
      { x: 280, y: 0 },
    ),
    llmNode(
      "brain-image-llm-interpret",
      "Image Context Interpreter",
      "Read the upstream text and file attachment metadata. Identify what the source image or file is supposed to provide. If direct vision is not available, state that and reason from available attachment references.",
      { x: 560, y: 0 },
      "xhigh",
    ),
    llmNode(
      "brain-image-llm-answer",
      "Final Answer Synthesizer",
      "Use the interpreter output and original request to produce the final answer. Preserve uncertainty, cite which upstream context was used, and propose missing capability upgrades if the workflow needs native image understanding.",
      { x: 840, y: 0 },
      "xhigh",
    ),
    outputNode("brain-image-output", "Final Answer", { x: 1120, y: 0 }),
  ];

  return contract({
    edges: [
      edge("brain-image-input", "brain-image-file", ["text", "image", "file", "json"]),
      edge("brain-image-file", "brain-image-llm-interpret", [
        "text",
        "image",
        "file",
        "json",
      ]),
      edge("brain-image-llm-interpret", "brain-image-llm-answer"),
      edge("brain-image-llm-answer", "brain-image-output"),
    ],
    execution: executionPlan([
      "This group appends to the canvas as an independent workflow cluster.",
      "The file node is the compiler boundary for future image, zip, audio, or document transforms.",
    ]),
    id: "workflow-brain-image-file-two-llm-answer",
    intent:
      "Graph Brain draft for a file or image-backed input passing through two configured LLM nodes before final answer output.",
    name: "Brain Draft / Image Or File Input To Two LLMs",
    nodes,
    outputs: [
      {
        artifactPolicy: textArtifactPolicy(),
        id: "output-brain-image-output",
        sourceNodeId: "brain-image-output",
        type: "text",
      },
    ],
    successCriteria: [
      "The contract validates as nexus.workflow.v1.",
      "Graph append adds this workflow as a new independent node group.",
      "The file node keeps a compiler insertion point for future native image/file transforms.",
    ],
  });
}

function createAudioPromptImageReverseFanoutDraft(
  description = "",
): WorkflowProContractDraft {
  const nodes = [
    inputNode(
      "brain-audio-input",
      description ||
        "Attach or describe an audio prompt, then generate a seed image, reverse it into prompt logic, and branch into three final image directions.",
      { x: 0, y: 160 },
    ),
    fileNode(
      "brain-audio-file",
      "Audio/File Carrier",
      "Carries audio file references through the compiler boundary. Current compiler is noop; future transcription can be plugged in here.",
      { x: 280, y: 160 },
    ),
    llmNode(
      "brain-audio-llm-prompt",
      "Audio Prompt Interpreter",
      "Convert the upstream audio prompt description or future transcript into a precise image-generation prompt. If transcription is unavailable, reason from text/file metadata and mark the missing capability.",
      { x: 560, y: 160 },
      "xhigh",
    ),
    imageNode("brain-audio-seed-image", "Seed Image Model", { x: 840, y: 160 }),
    llmNode(
      "brain-audio-llm-reverse",
      "Image Prompt Reverse Planner",
      "Read the generated image artifact reference, model prompt, and metadata. Infer a reusable style grammar, then prepare three branch prompts with different visual intent.",
      { x: 1120, y: 160 },
      "xhigh",
    ),
    llmNode(
      "brain-audio-llm-style-1",
      "Style Branch 1",
      "Create branch 1 as a high-contrast editorial direction. Preserve the original garment or subject logic.",
      { x: 1400, y: 0 },
      "high",
    ),
    llmNode(
      "brain-audio-llm-style-2",
      "Style Branch 2",
      "Create branch 2 as a clean commercial lookbook direction. Preserve the original garment or subject logic.",
      { x: 1400, y: 160 },
      "high",
    ),
    llmNode(
      "brain-audio-llm-style-3",
      "Style Branch 3",
      "Create branch 3 as an experimental future-fashion direction. Preserve the original garment or subject logic.",
      { x: 1400, y: 320 },
      "high",
    ),
    imageNode("brain-audio-image-1", "Final Image 1", { x: 1680, y: 0 }),
    imageNode("brain-audio-image-2", "Final Image 2", { x: 1680, y: 160 }),
    imageNode("brain-audio-image-3", "Final Image 3", { x: 1680, y: 320 }),
    outputNode("brain-audio-output-1", "Output 1", { x: 1960, y: 0 }),
    outputNode("brain-audio-output-2", "Output 2", { x: 1960, y: 160 }),
    outputNode("brain-audio-output-3", "Output 3", { x: 1960, y: 320 }),
  ];

  return contract({
    edges: [
      edge("brain-audio-input", "brain-audio-file", ["text", "file", "json"]),
      edge("brain-audio-file", "brain-audio-llm-prompt", [
        "text",
        "file",
        "json",
      ]),
      edge("brain-audio-llm-prompt", "brain-audio-seed-image", [
        "text",
        "image",
        "file",
        "json",
      ]),
      edge("brain-audio-seed-image", "brain-audio-llm-reverse", [
        "text",
        "image",
        "file",
        "json",
      ]),
      edge("brain-audio-llm-reverse", "brain-audio-llm-style-1"),
      edge("brain-audio-llm-reverse", "brain-audio-llm-style-2"),
      edge("brain-audio-llm-reverse", "brain-audio-llm-style-3"),
      edge("brain-audio-llm-style-1", "brain-audio-image-1", [
        "text",
        "image",
        "file",
        "json",
      ]),
      edge("brain-audio-llm-style-2", "brain-audio-image-2", [
        "text",
        "image",
        "file",
        "json",
      ]),
      edge("brain-audio-llm-style-3", "brain-audio-image-3", [
        "text",
        "image",
        "file",
        "json",
      ]),
      edge("brain-audio-image-1", "brain-audio-output-1", [
        "text",
        "image",
        "file",
        "json",
      ]),
      edge("brain-audio-image-2", "brain-audio-output-2", [
        "text",
        "image",
        "file",
        "json",
      ]),
      edge("brain-audio-image-3", "brain-audio-output-3", [
        "text",
        "image",
        "file",
        "json",
      ]),
    ],
    execution: executionPlan(
      [
        "Runtime Lite can execute this fan-out topology as ready-node parallel batches.",
        "The file node is the future audio transcription compiler boundary.",
        "Explicit join nodes are still not available; fan-in currently uses automatic ContextPacket merge behavior.",
      ],
      [
        {
          id: "brain-style-llm-fanout",
          nodeIds: [
            "brain-audio-llm-style-1",
            "brain-audio-llm-style-2",
            "brain-audio-llm-style-3",
          ],
          reason: "Three style prompt rewrites can run independently after reverse planning.",
          runtimeStatus: "native-parallel",
        },
        {
          id: "brain-final-image-fanout",
          nodeIds: ["brain-audio-image-1", "brain-audio-image-2", "brain-audio-image-3"],
          reason: "Three final image generations can run independently after style prompt branches.",
          runtimeStatus: "native-parallel",
        },
      ],
    ),
    id: "workflow-brain-audio-prompt-image-reverse-fanout",
    intent:
      "Graph Brain draft for audio-prompt-to-image generation, image prompt reverse planning, three LLM style branches, and three final image outputs.",
    name: "Brain Draft / Audio Prompt To Three Image Branches",
    nodes,
    outputs: [
      "brain-audio-image-1",
      "brain-audio-image-2",
      "brain-audio-image-3",
    ].map((sourceNodeId) => ({
      artifactPolicy: generatedImageArtifactPolicy(),
      id: `output-${sourceNodeId}`,
      sourceNodeId,
      type: "image" as const,
    })),
    successCriteria: [
      "The contract validates as nexus.workflow.v1.",
      "Graph append adds this workflow as a new independent node group.",
      "The contract marks fan-out groups as native-parallel while explicit join nodes remain a future upgrade.",
      "Generated image nodes keep downloadable artifact history policy.",
    ],
  });
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
        "append workflow group",
        "prompt rewrite",
        "node insertion",
        "model setting changes",
        "missing feature requirements",
        "full optimized workflow",
      ],
      enabled: true,
      mustUnderstand: [
        "canvas can contain multiple workflow groups",
        "append group does not replace existing graph",
        "nodes",
        "edges",
        "execution.parallelGroups",
        "capabilityInventory",
        "limits",
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
        "Graph Brain draft template intended for JSON paste, validation, append-to-graph, and future LLM generation.",
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
    limits: ["Runtime Lite supports text start nodes today."],
    position,
    purpose: "Creates the initial ContextPacket for this appended workflow group.",
    rationale: "Graph Brain starts the generated group from a clear input boundary.",
    type: "input.text",
  });
}

function fileNode(
  id: string,
  label: string,
  note: string,
  position: WorkflowRuntimePosition,
): WorkflowProContractNode {
  return node({
    compiler: {
      id: NEXUS_ATTACHMENT_NOOP_COMPILER.id,
      mode: "noop",
      version: NEXUS_ATTACHMENT_NOOP_COMPILER.version,
    },
    data: {
      attachments: [],
      compilerId: NEXUS_ATTACHMENT_NOOP_COMPILER.id,
      compilerVersion: NEXUS_ATTACHMENT_NOOP_COMPILER.version,
      label,
      note,
    } satisfies FileNodeData,
    id,
    label,
    limits: ["Noop compiler is installed; transform compiler can be swapped in later."],
    position,
    purpose: "Carries file references and marks the compiler insertion point.",
    rationale: "Files and future audio/image/zip transforms need a dedicated pass-through node.",
    type: "node.file",
  });
}

function llmNode(
  id: string,
  label: string,
  prompt: string,
  position: WorkflowRuntimePosition,
  _reasoningEffort?: string,
): WorkflowProContractNode {
  // Draft templates use the default model, which does not require
  // per-node reasoning/verbosity/detail settings.  Operators can
  // adjust model and settings on the canvas after the group is
  // appended.
  const modelSettings = {};

  return node({
    data: {
      label,
      model: DEFAULT_LLM_MODEL,
      modelSettings,
      prompt,
      provider: DEFAULT_PROVIDER,
    } satisfies ModelLlmNodeData,
    id,
    label,
    limits: ["Requires authenticated model runtime access for live execution."],
    model: {
      modelId: DEFAULT_LLM_MODEL,
      provider: DEFAULT_PROVIDER,
      settings: modelSettings,
    },
    position,
    purpose: "Calls the model runtime with upstream ContextPacket data.",
    rationale: `${label} is part of the generated Graph Brain workflow group.`,
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
    limits: ["Requires image generation credentials and artifact save permission."],
    model: {
      modelId: DEFAULT_IMAGE_MODEL,
      provider: DEFAULT_PROVIDER,
    },
    position,
    purpose: "Generates image artifacts from upstream prompt packets.",
    rationale: `${label} is part of the generated Graph Brain image branch.`,
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
      renderMode: "markdown",
    } satisfies OutputTextNodeData,
    id,
    label,
    limits: ["Displays the latest upstream ContextPacket."],
    position,
    purpose: "Receives final packet output for the appended group.",
    rationale: "Every generated group should have a visible terminal output.",
    type: "output.text",
  });
}

function node(input: WorkflowProContractNode): WorkflowProContractNode {
  return input;
}

function edge(
  source: string,
  target: string,
  allowedMedia: WorkflowProPacketContract["allowedMedia"] = ["text", "json"],
): WorkflowProContractEdge {
  return {
    id: `edge-${source}-${target}`,
    mode: "always",
    packetContract: {
      allowedMedia,
      input: "ContextPacket",
      output: "ContextPacket",
    },
    reason: `${source} passes ContextPacket data to ${target}.`,
    source,
    sourceHandle: "output",
    target,
    targetHandle: "input",
  };
}

function executionPlan(
  notes: string[],
  parallelGroups: WorkflowProExecutionPlan["parallelGroups"] = [],
): WorkflowProExecutionPlan {
  return {
    mode: "topological",
    notes,
    parallelGroups,
  };
}

function textArtifactPolicy(): NonNullable<WorkflowProContractNode["artifactPolicy"]> {
  return {
    downloadable: true,
    historyScope: "workspace",
    persist: true,
    type: "text",
  };
}

function generatedImageArtifactPolicy(): NonNullable<
  WorkflowProContractNode["artifactPolicy"]
> {
  return {
    downloadable: true,
    historyScope: "workspace",
    persist: true,
    type: "generated-image",
  };
}
