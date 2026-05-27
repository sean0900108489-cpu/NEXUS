import type {
  ContextPacket,
  WorkflowNodeInstance,
  WorkflowRuntimeNodeType,
} from "@/lib/nexus-types";

import { createContextPacket } from "./state";

export type WorkflowRuntimeLlmCallInput = {
  node: WorkflowNodeInstance<"model.llm">;
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
  runId,
  workflowId,
}: WorkflowRuntimeExecutorInput<"model.llm">) {
  if (!inputPacket) {
    throw new Error("model.llm requires an upstream ContextPacket.");
  }

  const prompt = node.data.prompt.trim() || "Continue from the upstream context.";
  const result = await callLlm({
    node,
    prompt,
    runId,
    upstream: inputPacket,
    workflowId,
  });

  return createContextPacket({
    metadata: {
      ...(result.metadata ?? {}),
      model: node.data.model,
      nodeType: node.type,
      upstreamPacketId: inputPacket.id,
    },
    rawText: result.text,
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
