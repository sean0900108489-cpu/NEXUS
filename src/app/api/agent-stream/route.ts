import type { AgentStreamRequest } from "@/lib/nexus-types";
import { buildMockReply } from "@/lib/mock-stream";

export const runtime = "edge";
export const maxDuration = 300;

type StreamEvent =
  | { type: "meta"; mode: "mock" | "openai"; detail: string }
  | { type: "token"; token: string }
  | { type: "done" };

type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const encoder = new TextEncoder();
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const SAFE_DEFAULT_CHAT_MODEL = "gpt-4o-mini";

function encodeEvent(event: StreamEvent) {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function encodeComment(comment: string) {
  return encoder.encode(`: ${comment}\n\n`);
}

function buildSystemPrompt(payload: AgentStreamRequest) {
  const memory = payload.agent.memory
    .map((block) => `- ${block.label}: ${block.content}`)
    .join("\n");
  const context = payload.agent.contextNotes
    .map((item) => `- ${item.title}: ${item.value}`)
    .join("\n");

  return [
    `You are ${payload.agent.identity}, callsign ${payload.agent.callsign}.`,
    `Title: ${payload.agent.title}.`,
    `Mission: ${payload.agent.mission}.`,
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
      role: "system" as const,
      content: anchor,
    },
    ...nextMessages,
  ];
}

function mapAgentMessageForLlm(message: AgentStreamRequest["messages"][number]): LlmMessage {
  if (message.role === "assistant") {
    return {
      role: "assistant",
      content: message.content,
    };
  }

  if (message.role === "tool") {
    return {
      role: "user",
      content: `[TOOL OUTPUT]\n${message.content}`,
    };
  }

  return {
    role: "user",
    content: message.content,
  };
}

function supportsTemperature(model: string) {
  const normalized = model.toLowerCase();

  return !normalized.startsWith("o") && !normalized.startsWith("gpt-5");
}

async function streamMock(
  controller: ReadableStreamDefaultController<Uint8Array>,
  payload: AgentStreamRequest,
  signal: AbortSignal,
) {
  controller.enqueue(
    encodeEvent({
      type: "meta",
      mode: "mock",
      detail: "Mock stream active. Global API Vault key is missing or locked.",
    }),
  );

  for (const token of buildMockReply(payload).split(/(\s+)/)) {
    if (signal.aborted) {
      return;
    }

    controller.enqueue(encodeEvent({ type: "token", token }));
    await wait(18);
  }
}

async function streamOpenAI(
  controller: ReadableStreamDefaultController<Uint8Array>,
  payload: AgentStreamRequest,
  apiKey: string,
  baseUrl: string,
  signal: AbortSignal,
) {
  const model =
    payload.model?.trim() ||
    payload.agent.model ||
    process.env.OPENAI_MODEL ||
    SAFE_DEFAULT_CHAT_MODEL;
  const messages = injectTemporalAnchor([
    {
      role: "system",
      content: buildSystemPrompt(payload),
    },
    ...payload.messages.map(mapAgentMessageForLlm),
  ]);
  const fetchChatCompletion = (nextModel: string) =>
    fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: nextModel,
        stream: true,
        ...(supportsTemperature(nextModel) ? { temperature: 0.65 } : {}),
        messages,
      }),
      signal,
    });

  let response = await fetchChatCompletion(model);

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => response.statusText);

    if (shouldFallbackToSafeModel({ baseUrl, detail, model })) {
      controller.enqueue(
        encodeEvent({
          type: "meta",
          mode: "openai",
          detail: `Selected model ${model} was rejected by the default endpoint. Falling back to ${SAFE_DEFAULT_CHAT_MODEL}.`,
        }),
      );
      response = await fetchChatCompletion(SAFE_DEFAULT_CHAT_MODEL);

      if (response.ok && response.body) {
        return streamOpenAIResponse(controller, response, baseUrl);
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

  await streamOpenAIResponse(controller, response, baseUrl);
}

async function streamOpenAIResponse(
  controller: ReadableStreamDefaultController<Uint8Array>,
  response: Response,
  baseUrl: string,
) {
  controller.enqueue(
    encodeEvent({
      type: "meta",
      mode: "openai",
      detail: `Streaming through ${baseUrl}`,
    }),
  );

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
        choices?: { delta?: { content?: string } }[];
      };
      const token = chunk.choices?.[0]?.delta?.content;

      if (token) {
        controller.enqueue(encodeEvent({ type: "token", token }));
      }
    }
  }
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

function getBearerToken(header: string | null) {
  if (!header) {
    return "";
  }

  const [scheme, token] = header.split(/\s+/, 2);

  return scheme?.toLowerCase() === "bearer"
    ? token?.replace(/[^\x20-\x7E]/g, "").trim() ?? ""
    : "";
}

function getRuntimeString(value: unknown) {
  return typeof value === "string" ? value.replace(/[^\x20-\x7E]/g, "").trim() : "";
}

function getCompatibleBaseUrl(value: string | null | undefined) {
  const candidate = value?.replace(/[^\x20-\x7E]/g, "").trim() || DEFAULT_BASE_URL;

  try {
    const url = new URL(candidate);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return DEFAULT_BASE_URL;
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_BASE_URL;
  }
}

export async function POST(request: Request) {
  const payload = (await request.json()) as AgentStreamRequest;
  const apiKey =
    getRuntimeString(payload.globalApiKey) ||
    getBearerToken(request.headers.get("authorization"));
  const baseUrl = getCompatibleBaseUrl(
    request.headers.get("x-openai-base-url") || process.env.OPENAI_BASE_URL,
  );

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let heartbeat: ReturnType<typeof setInterval> | undefined;

      try {
        if (!apiKey) {
          await streamMock(controller, payload, request.signal);
          controller.enqueue(encodeEvent({ type: "done" }));
          return;
        }

        controller.enqueue(
          encodeEvent({
            type: "meta",
            mode: "openai",
            detail:
              "Live stream connected. Waiting for first token; high-reasoning models may take several minutes.",
          }),
        );
        heartbeat = setInterval(() => {
          controller.enqueue(encodeComment("keep-alive"));
        }, 15000);

        await streamOpenAI(controller, payload, apiKey, baseUrl, request.signal);

        controller.enqueue(encodeEvent({ type: "done" }));
      } catch (error) {
        if (
          request.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          return;
        }

        controller.enqueue(
          encodeEvent({
            type: "token",
            token:
              error instanceof Error
                ? `\n\n[stream fault] ${error.message}`
                : "\n\n[stream fault] OpenAI stream failed.",
          }),
        );
        controller.enqueue(encodeEvent({ type: "done" }));
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
