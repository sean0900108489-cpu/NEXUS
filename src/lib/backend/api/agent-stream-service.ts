import type { AgentStreamRequest } from "@/lib/nexus-types";
import { buildMockReply } from "@/lib/mock-stream";

import { getApiErrorDescriptor, type ApiErrorCode } from "./api-errors";
import { getBearerToken } from "./memory-compress-service";
import { createAgentRuntimeService } from "../runtime/agent-runtime-service";
import {
  buildOpenAICompatibleChatBody,
  getCompatibleBaseUrl,
  OpenAICompatibleAdapter,
  getRuntimeString,
} from "../runtime/provider-adapter";

export type AgentStreamEvent =
  | {
      type: "meta";
      requestId: string;
      traceId: string;
      agentId: string;
      taskId?: string;
      sessionId?: string | null;
      workspaceId?: string;
    }
  | {
      type: "token";
      delta: string;
      token?: string;
    }
  | {
      type: "reasoning";
      delta: string;
    }
  | {
      type: "done";
      data?: unknown;
    }
  | {
      type: "error";
      error: {
        code: string;
        message: string;
        retryable: boolean;
      };
    };

type LegacyStreamEvent =
  | { type: "meta"; mode: "mock" | "openai"; detail: string }
  | { type: "token"; token: string }
  | { type: "done" };

type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AgentStreamResponseOptions = {
  agentId: string;
  eventShape: "v1" | "legacy";
  request: Request;
  requestId: string;
  traceId: string;
  workspaceId?: string;
};

const encoder = new TextEncoder();
const SAFE_DEFAULT_CHAT_MODEL = "gpt-4o-mini";

export function createStreamId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}_${random}`;
}

export async function createAgentStreamResponse({
  agentId,
  eventShape,
  request,
  requestId,
  traceId,
  workspaceId,
}: AgentStreamResponseOptions) {
  const payload = (await request.json()) as AgentStreamRequest;
  const apiKey = getBearerToken(request.headers.get("authorization"));
  const rawBaseUrl =
    request.headers.get("x-nexus-base-url") ||
    request.headers.get("x-openai-base-url") ||
    process.env.OPENAI_BASE_URL ||
    undefined;
  const legacyBaseUrl = getCompatibleBaseUrl(rawBaseUrl);
  const requestedProvider =
    getRuntimeString(request.headers.get("x-nexus-provider-id")) || payload.agent.provider;
  const isWorkflowRuntimeLite =
    request.headers.get("X-Nexus-Workflow-Runtime")?.toLowerCase() === "lite";

  if (eventShape === "legacy") {
    return createLegacyAgentStreamResponse({
      apiKey,
      baseUrl: legacyBaseUrl,
      eventShape,
      payload,
      request,
      requestId,
      traceId,
    });
  }

  const userId = request.headers.get("X-User-Id") ?? undefined;
  const resolvedWorkspaceId = payload.workspaceId ?? workspaceId ?? "__global__";
  const runtimeService = createAgentRuntimeService();
  const taskScope = await runtimeService.prepareStreamTask(
    {
      agentId,
      metadata: {
        messageCount: payload.messages.length,
        workflowRuntime: isWorkflowRuntimeLite ? "lite" : undefined,
      },
      model: payload.model?.trim() || payload.agent.model,
      outputMessageId: payload.outputMessageId,
      provider: payload.agent.provider,
      sessionId: payload.sessionId,
      taskId: payload.taskId,
      workspaceId: resolvedWorkspaceId,
    },
    {
      requestId,
      traceId,
      userId,
    },
    {
      skipPermissionCheck: isWorkflowRuntimeLite && Boolean(apiKey),
    },
  );
  const providerAdapter = new OpenAICompatibleAdapter();
  let providerStream;
  const streamModel = payload.model?.trim() || payload.agent.model;

  try {
    providerStream = await providerAdapter.createChatStream({
      apiKey,
      baseUrl: rawBaseUrl,
      model: streamModel,
      payload,
      provider: requestedProvider,
      signal: request.signal,
      userId,
      workspaceId: resolvedWorkspaceId,
    });
  } catch (error) {
    const descriptor = getApiErrorDescriptor(
      error && typeof error === "object" && "code" in error && typeof error.code === "string"
        ? (error.code as ApiErrorCode)
        : "PROVIDER_TIMEOUT",
    );

    await runtimeService.failTask(
      taskScope.task.id,
      descriptor.code,
      {
        requestId,
        traceId,
        userId,
      },
      {
        message: descriptor.message,
        model: streamModel,
        provider: requestedProvider,
        retryable: descriptor.retryable,
      },
    );

    return createImmediateV1StreamErrorResponse({
      agentId,
      error: {
        code: descriptor.code,
        message: descriptor.message,
        retryable: descriptor.retryable,
      },
      requestId,
      sessionId: taskScope.task.sessionId,
      taskId: taskScope.task.id,
      traceId,
      workspaceId: resolvedWorkspaceId,
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      let firstTokenSeen = false;
      const startedAt = Date.now();

      const emit = (event: AgentStreamEvent | LegacyStreamEvent) => {
        controller.enqueue(encodeEvent(event));
      };

      try {
        emit({
          agentId,
          requestId,
          sessionId: taskScope.task.sessionId,
          taskId: taskScope.task.id,
          traceId,
          type: "meta",
          workspaceId: resolvedWorkspaceId,
        });

        if (providerStream.fallbackUsed) {
          await runtimeService.markFallbackUsed(taskScope.task.id, {
            reasonCode: providerStream.fallbackReasonCode,
          });
        }

        heartbeat = setInterval(() => {
          controller.enqueue(encodeComment("keep-alive"));
        }, 15000);

        for await (const chunk of providerStream.stream) {
          if (request.signal.aborted) {
            return;
          }

          if (!firstTokenSeen) {
            firstTokenSeen = true;
            await runtimeService.markFirstToken(taskScope.task.id, {
              model: providerStream.model,
              provider: providerStream.provider,
            });
          }

          if (chunk.type === "reasoning") {
            emit({
              delta: chunk.delta,
              type: "reasoning",
            });
            continue;
          }

          emit({
            delta: chunk.delta,
            token: chunk.delta,
            type: "token",
          });
        }

        await runtimeService.completeTask(
          taskScope.task.id,
          {
            requestId,
            traceId,
            userId,
          },
          {
            latencyMs: Date.now() - startedAt,
            model: providerStream.model,
            provider: providerStream.provider,
          },
        );
        emit({ type: "done" });
      } catch (error) {
        if (
          request.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          await runtimeService.cancelTask(
            {
              agentId,
              taskId: taskScope.task.id,
              workspaceId: resolvedWorkspaceId,
            },
            {
              requestId,
              traceId,
              userId,
            },
          );
          return;
        }

        const descriptor = getApiErrorDescriptor(
          error && typeof error === "object" && "code" in error && typeof error.code === "string"
            ? (error.code as ApiErrorCode)
            : "PROVIDER_TIMEOUT",
        );
        await runtimeService.failTask(
          taskScope.task.id,
          descriptor.code,
          {
            requestId,
            traceId,
            userId,
          },
          {
            latencyMs: Date.now() - startedAt,
            message: descriptor.message,
            model: providerStream.model,
            provider: providerStream.provider,
            retryable: descriptor.retryable,
          },
        );
        emit({
          error: {
            code: descriptor.code,
            message: descriptor.message,
            retryable: descriptor.retryable,
          },
          type: "error",
        });

        emit({ type: "done" });
      } finally {
        if (heartbeat) {
          clearInterval(heartbeat);
        }

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
      "X-Request-Id": requestId,
      "X-Trace-Id": traceId,
      "X-Agent-Task-Id": taskScope.task.id,
    },
  });
}

function createImmediateV1StreamErrorResponse({
  agentId,
  error,
  requestId,
  sessionId,
  taskId,
  traceId,
  workspaceId,
}: {
  agentId: string;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
  requestId: string;
  sessionId?: string | null;
  taskId: string;
  traceId: string;
  workspaceId: string;
}) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encodeEvent({
          agentId,
          requestId,
          sessionId,
          taskId,
          traceId,
          type: "meta",
          workspaceId,
        }),
      );
      controller.enqueue(
        encodeEvent({
          error,
          type: "error",
        }),
      );
      controller.enqueue(encodeEvent({ type: "done" }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
      "X-Agent-Task-Id": taskId,
      "X-Request-Id": requestId,
      "X-Trace-Id": traceId,
    },
  });
}

function createLegacyAgentStreamResponse({
  apiKey,
  baseUrl,
  eventShape,
  payload,
  request,
}: {
  apiKey: string;
  baseUrl: string;
  eventShape: "legacy";
  payload: AgentStreamRequest;
  request: Request;
  requestId: string;
  traceId: string;
}) {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let heartbeat: ReturnType<typeof setInterval> | undefined;

      const emit = (event: AgentStreamEvent | LegacyStreamEvent) => {
        controller.enqueue(encodeEvent(event));
      };

      try {
        if (!apiKey) {
          await streamMock(controller, payload, request.signal, eventShape);
          emit({ type: "done" });
          return;
        }

        emitLegacyMeta(
          controller,
          eventShape,
          "openai",
          "Live stream connected. Waiting for first token; high-reasoning models may take several minutes.",
        );
        heartbeat = setInterval(() => {
          controller.enqueue(encodeComment("keep-alive"));
        }, 15000);

        await streamOpenAI(controller, payload, apiKey, baseUrl, request.signal, eventShape);
        emit({ type: "done" });
      } catch (error) {
        if (
          request.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          return;
        }

        emit({
          token:
            error instanceof Error
              ? `\n\n[stream fault] ${error.message}`
              : "\n\n[stream fault] OpenAI stream failed.",
          type: "token",
        });
        emit({ type: "done" });
      } finally {
        if (heartbeat) {
          clearInterval(heartbeat);
        }

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}

function encodeEvent(event: AgentStreamEvent | LegacyStreamEvent) {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function encodeComment(comment: string) {
  return encoder.encode(`: ${comment}\n\n`);
}

function buildSystemPrompt(payload: AgentStreamRequest) {
  const executionPrompt = payload.agent.executionPrompt?.trim();
  const memory = payload.agent.memory
    .map((block) => `- ${block.label}: ${block.content}`)
    .join("\n");
  const context = payload.agent.contextNotes
    .map((item) => `- ${item.title}: ${item.value}`)
    .join("\n");

  return [
    payload.agent.identity
      ? `You are ${payload.agent.identity}, callsign ${payload.agent.callsign}.`
      : `Callsign: ${payload.agent.callsign}.`,
    payload.agent.title ? `Title: ${payload.agent.title}.` : "",
    payload.agent.mission ? `Mission: ${payload.agent.mission}.` : "",
    executionPrompt ? `Execution prompt:\n${executionPrompt}` : "",
    "Operate like an independent AI workstation inside NEXUS // AI OPS.",
    "Be concise, tactical, and specific. Prefer operator-ready output.",
    memory ? `Memory:\n${memory}` : "",
    context ? `Context:\n${context}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function injectTemporalAnchor(messages: LlmMessage[]) {
  const anchor = `[SYSTEM TELEMETRY] Current real-world time: ${new Date().toISOString()}`;
  const firstSystemIndex = messages.findIndex((message) => message.role === "system");
  const nextMessages = [...messages];

  if (firstSystemIndex >= 0) {
    const systemMessage = nextMessages[firstSystemIndex];

    nextMessages[firstSystemIndex] = {
      ...systemMessage,
      content: `${systemMessage.content}\n\n${anchor}`,
    };

    return nextMessages;
  }

  return [
    {
      content: anchor,
      role: "system" as const,
    },
    ...nextMessages,
  ];
}

function mapAgentMessageForLlm(message: AgentStreamRequest["messages"][number]): LlmMessage {
  if (message.role === "assistant") {
    return {
      content: message.content,
      role: "assistant",
    };
  }

  if (message.role === "tool") {
    return {
      content: `[TOOL OUTPUT]\n${message.content}`,
      role: "user",
    };
  }

  return {
    content: message.content,
    role: "user",
  };
}

async function streamMock(
  controller: ReadableStreamDefaultController<Uint8Array>,
  payload: AgentStreamRequest,
  signal: AbortSignal,
  eventShape: "v1" | "legacy",
) {
  emitLegacyMeta(
    controller,
    eventShape,
    "mock",
    "Mock stream active. Global API Vault key is missing or locked.",
  );

  for (const token of buildMockReply(payload).split(/(\s+)/)) {
    if (signal.aborted) {
      return;
    }

    controller.enqueue(encodeEvent({ token, type: "token" }));
    await wait(18);
  }
}

async function streamOpenAI(
  controller: ReadableStreamDefaultController<Uint8Array>,
  payload: AgentStreamRequest,
  apiKey: string,
  baseUrl: string,
  signal: AbortSignal,
  eventShape: "v1" | "legacy",
) {
  const model =
    payload.model?.trim() ||
    payload.agent.model ||
    process.env.OPENAI_MODEL ||
    SAFE_DEFAULT_CHAT_MODEL;
  const messages = injectTemporalAnchor([
    {
      content: buildSystemPrompt(payload),
      role: "system",
    },
    ...payload.messages.map(mapAgentMessageForLlm),
  ]);
  const fetchChatCompletion = (nextModel: string) =>
    fetch(`${baseUrl}/chat/completions`, {
      body: JSON.stringify(buildOpenAICompatibleChatBody({
        messages,
        model: nextModel,
        modelSettings: payload.modelSettings,
        reasoningEffort: payload.modelSettings?.reasoningEffort ?? payload.reasoningEffort,
      })),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal,
    });

  let response = await fetchChatCompletion(model);

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => response.statusText);

    if (shouldFallbackToSafeModel({ baseUrl, detail, model })) {
      emitLegacyMeta(
        controller,
        eventShape,
        "openai",
        `Selected model ${model} was rejected by the default endpoint. Falling back to ${SAFE_DEFAULT_CHAT_MODEL}.`,
      );
      response = await fetchChatCompletion(SAFE_DEFAULT_CHAT_MODEL);

      if (response.ok && response.body) {
        return streamOpenAIResponse(controller, response, baseUrl, eventShape);
      }

      const fallbackDetail = await response.text().catch(() => response.statusText);

      throw new Error(
        fallbackDetail ||
          detail ||
          `OpenAI-compatible endpoint returned ${response.status}.`,
      );
    }

    throw new Error(detail || `OpenAI-compatible endpoint returned ${response.status}.`);
  }

  await streamOpenAIResponse(controller, response, baseUrl, eventShape);
}

async function streamOpenAIResponse(
  controller: ReadableStreamDefaultController<Uint8Array>,
  response: Response,
  baseUrl: string,
  eventShape: "v1" | "legacy",
) {
  emitLegacyMeta(controller, eventShape, "openai", `Streaming through ${baseUrl}`);

  if (!response.body) {
    throw new Error("OpenAI-compatible endpoint returned an empty stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed.startsWith("data:")) {
        continue;
      }

      const raw = trimmed.slice(5).trim();

      if (!raw || raw === "[DONE]") {
        continue;
      }

      const chunk = JSON.parse(raw) as {
        choices?: { delta?: { content?: string; reasoning_content?: string } }[];
      };
      const reasoning = chunk.choices?.[0]?.delta?.reasoning_content;
      const token = chunk.choices?.[0]?.delta?.content;

      if (reasoning && eventShape === "v1") {
        controller.enqueue(encodeEvent({ delta: reasoning, type: "reasoning" }));
      }
      if (token) {
        controller.enqueue(encodeEvent({ token, type: "token" }));
      }
    }
  }
}

function emitLegacyMeta(
  controller: ReadableStreamDefaultController<Uint8Array>,
  eventShape: "v1" | "legacy",
  mode: "mock" | "openai",
  detail: string,
) {
  if (eventShape !== "legacy") {
    return;
  }

  controller.enqueue(encodeEvent({ detail, mode, type: "meta" }));
}

function shouldFallbackToSafeModel({
  baseUrl,
  detail,
  model,
}: {
  baseUrl: string;
  detail: string;
  model: string;
}) {
  if (model === SAFE_DEFAULT_CHAT_MODEL || !isDefaultOpenAIBaseUrl(baseUrl)) {
    return false;
  }

  const lowerDetail = detail.toLowerCase();

  return (
    model.startsWith("gpt-5.5") ||
    lowerDetail.includes("model") ||
    lowerDetail.includes("does not exist") ||
    lowerDetail.includes("not found") ||
    lowerDetail.includes("invalid")
  );
}

function isDefaultOpenAIBaseUrl(baseUrl: string) {
  try {
    const url = new URL(baseUrl);

    return url.hostname === "api.openai.com";
  } catch {
    return true;
  }
}
