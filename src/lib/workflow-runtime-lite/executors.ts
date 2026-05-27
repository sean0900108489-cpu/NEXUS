import type {
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
  upstream: ContextPacket;
  workflowId: string;
};

export type WorkflowRuntimeLlmCall = (
  input: WorkflowRuntimeLlmCallInput,
) => Promise<{
  metadata?: Record<string, unknown>;
  text: string;
}>;

export type WorkflowRuntimeExecutorInput<TType extends WorkflowRuntimeNodeType> = {
  callLlm: WorkflowRuntimeLlmCall;
  inputPacket?: ContextPacket | null;
  node: WorkflowNodeInstance<TType>;
  onPartialOutput?: (packet: ContextPacket) => void;
  runId: string;
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
  "model.llm": executeLLM,
  "output.text": executeOutputText,
} satisfies {
  [TType in WorkflowRuntimeNodeType]: WorkflowRuntimeExecutor<TType>;
};
