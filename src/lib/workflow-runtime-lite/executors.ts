import type {
  AgentMediaArtifact,
  ContextPacket,
  WorkflowNodeInstance,
  WorkflowRuntimeNodeType,
} from "@/lib/nexus-types";

import { createContextPacket } from "./state";

export type WorkflowRuntimeLlmCallInput = {
  node: WorkflowNodeInstance<"model.llm">;
  onToken?: (delta: string, text: string) => void;
  prompt: string;
  runId: string;
  signal?: AbortSignal;
  upstream: ContextPacket;
  workflowId: string;
};

export type WorkflowRuntimeLlmCall = (
  input: WorkflowRuntimeLlmCallInput,
) => Promise<{
  metadata?: Record<string, unknown>;
  text: string;
}>;

export type WorkflowRuntimeImageCallInput = {
  node: WorkflowNodeInstance<"model.image">;
  prompt: string;
  runId: string;
  signal?: AbortSignal;
  upstream: ContextPacket;
  workflowId: string;
};

export type WorkflowRuntimeImageCall = (
  input: WorkflowRuntimeImageCallInput,
) => Promise<{
  media: AgentMediaArtifact;
  metadata?: Record<string, unknown>;
  revisedPrompt?: string;
  text?: string;
}>;

export type WorkflowRuntimeExecutorInput<TType extends WorkflowRuntimeNodeType> = {
  callImage?: WorkflowRuntimeImageCall;
  callLlm: WorkflowRuntimeLlmCall;
  inputPacket?: ContextPacket | null;
  node: WorkflowNodeInstance<TType>;
  onPartialOutput?: (packet: ContextPacket) => void;
  runId: string;
  signal?: AbortSignal;
  workflowId: string;
};

export type WorkflowRuntimeExecutor<TType extends WorkflowRuntimeNodeType> = (
  input: WorkflowRuntimeExecutorInput<TType>,
) => Promise<ContextPacket>;

export async function executeInputText({
  node,
  runId,
}: WorkflowRuntimeExecutorInput<"input.text">) {
  return createContextPacket({
    metadata: {
      nodeType: node.type,
    },
    rawText: node.data.text,
    runId,
    sourceNodeId: node.id,
  });
}

export async function executeLLM({
  callLlm,
  inputPacket,
  node,
  onPartialOutput,
  runId,
  signal,
  workflowId,
}: WorkflowRuntimeExecutorInput<"model.llm">) {
  if (!inputPacket) {
    throw new Error("model.llm requires an upstream ContextPacket.");
  }

  const prompt = node.data.prompt.trim() || "Continue from the upstream context.";
  let streamedText = "";
  let lastPartialLength = 0;
  let lastPartialAt = 0;
  const createLlmPacket = (text: string, partial = false) =>
    createContextPacket({
      metadata: {
        model: node.data.model,
        nodeType: node.type,
        partial,
        upstreamPacketId: inputPacket.id,
      },
      rawText: text,
      runId,
      sourceNodeId: node.id,
    });
  const emitPartialOutput = (force = false) => {
    if (!onPartialOutput || !streamedText) {
      return;
    }

    const now = Date.now();
    const gainedChars = streamedText.length - lastPartialLength;

    if (!force && now - lastPartialAt < 120 && gainedChars < 160) {
      return;
    }

    lastPartialAt = now;
    lastPartialLength = streamedText.length;
    onPartialOutput(createLlmPacket(streamedText, true));
  };
  const result = await callLlm({
    node,
    onToken: (_delta, text) => {
      streamedText = text;
      emitPartialOutput();
    },
    prompt,
    runId,
    signal,
    upstream: inputPacket,
    workflowId,
  });
  const finalText = result.text || streamedText;

  if (finalText) {
    streamedText = finalText;
    emitPartialOutput(true);
  }

  return createContextPacket({
    metadata: {
      ...(result.metadata ?? {}),
      model: node.data.model,
      nodeType: node.type,
      upstreamPacketId: inputPacket.id,
    },
    rawText: finalText,
    runId,
    sourceNodeId: node.id,
  });
}

export async function executeFileNode({
  inputPacket,
  node,
  runId,
}: WorkflowRuntimeExecutorInput<"node.file">) {
  if (!inputPacket) {
    throw new Error("node.file requires an upstream ContextPacket.");
  }

  const attachmentCount = node.data.attachments.length;

  return createContextPacket({
    displayText: [
      inputPacket.displayText,
      attachmentCount
        ? `File node attached ${attachmentCount} artifact reference${attachmentCount === 1 ? "" : "s"}.`
        : "File node passed through with no attachment references.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    metadata: {
      ...inputPacket.metadata,
      attachmentCompiler: {
        compilerId: node.data.compilerId,
        compilerVersion: node.data.compilerVersion,
        mode: "noop",
      },
      attachments: node.data.attachments,
      nodeType: node.type,
      upstreamPacketId: inputPacket.id,
    },
    rawText: inputPacket.rawText,
    runId,
    sourceNodeId: node.id,
  });
}

export async function executeImageModel({
  callImage,
  inputPacket,
  node,
  runId,
  signal,
  workflowId,
}: WorkflowRuntimeExecutorInput<"model.image">) {
  if (!inputPacket) {
    throw new Error("model.image requires an upstream ContextPacket.");
  }

  if (!callImage) {
    throw new Error("model.image requires an image generation boundary.");
  }

  const prompt = buildImagePrompt({
    node,
    upstream: inputPacket,
  });

  if (!prompt) {
    throw new Error("model.image requires an upstream prompt.");
  }

  let result: Awaited<ReturnType<WorkflowRuntimeImageCall>>;

  try {
    result = await callImage({
      node,
      prompt,
      runId,
      signal,
      upstream: inputPacket,
      workflowId,
    });
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      throw new Error("model.image was aborted before image generation completed.");
    }

    throw error;
  }

  const rawText = result.text?.trim() || buildImagePacketText({
    artifactId: result.media.artifactId,
    aspectRatio: node.data.aspectRatio,
    imageUrl: result.media.url,
    modelId: node.data.modelId,
    prompt,
    quality: node.data.quality,
    revisedPrompt: result.revisedPrompt,
  });

  return createContextPacket({
    displayText: [
      "Image generated.",
      `Prompt: ${prompt}`,
      `Model: ${node.data.modelId}`,
      `Quality: ${node.data.quality}`,
      `Aspect ratio: ${node.data.aspectRatio}`,
      result.media.artifactId ? `Artifact: ${result.media.artifactId}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    metadata: {
      ...(result.metadata ?? {}),
      artifactId: result.media.artifactId ?? null,
      aspectRatio: node.data.aspectRatio,
      imageUrl: result.media.url,
      mediaType: result.media.type,
      modelId: node.data.modelId,
      nodeType: node.type,
      prompt,
      quality: node.data.quality,
      revisedPrompt: result.revisedPrompt ?? null,
      upstreamPacketId: inputPacket.id,
    },
    rawText,
    runId,
    sourceNodeId: node.id,
  });
}

function isAbortError(error: unknown) {
  return (
    error !== null &&
    typeof error === "object" &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

export async function executeOutputText({
  inputPacket,
}: WorkflowRuntimeExecutorInput<"output.text">) {
  if (!inputPacket) {
    throw new Error("output.text is waiting for an upstream ContextPacket.");
  }

  return inputPacket;
}

export const workflowRuntimeExecutorMap = {
  "input.text": executeInputText,
  "node.file": executeFileNode,
  "model.llm": executeLLM,
  "model.image": executeImageModel,
  "output.text": executeOutputText,
} satisfies {
  [TType in WorkflowRuntimeNodeType]: WorkflowRuntimeExecutor<TType>;
};

function buildImagePrompt({
  node,
  upstream,
}: {
  node: WorkflowNodeInstance<"model.image">;
  upstream: ContextPacket;
}) {
  return [node.data.prompt, upstream.rawText]
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join("\n\n");
}

function buildImagePacketText({
  artifactId,
  aspectRatio,
  imageUrl,
  modelId,
  prompt,
  quality,
  revisedPrompt,
}: {
  artifactId?: string;
  aspectRatio: string;
  imageUrl: string;
  modelId: string;
  prompt: string;
  quality: string;
  revisedPrompt?: string;
}) {
  return [
    "Image generated.",
    `Prompt: ${prompt}`,
    revisedPrompt ? `Revised prompt: ${revisedPrompt}` : "",
    `Model: ${modelId}`,
    `Quality: ${quality}`,
    `Aspect ratio: ${aspectRatio}`,
    artifactId ? `Artifact: ${artifactId}` : "",
    `Image URL: ${imageUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}
