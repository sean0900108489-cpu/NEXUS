import type { AgentStreamRequest } from "@/lib/nexus-types";
import { buildMockReply } from "@/lib/mock-stream";
import {
  getModelCapabilityProfile,
  mapReasoningDetailForModel,
  mapReasoningEffortForModel,
} from "@/lib/nexus-registry";
import {
  SERVER_MODEL_CATALOG,
  getCatalogModel,
} from "@/lib/backend/models/model-catalog";

import { ApiError } from "../api/api-errors";
import { FeatureFlagService } from "../deployment/feature-flag-service";
import { EnvironmentValidator } from "../deployment/environment-validator";

export type ProviderStreamInput = {
  payload: AgentStreamRequest;
  apiKey?: string;
  baseUrl?: string;
  provider?: string;
  model: string;
  workspaceId?: string;
  userId?: string;
  signal: AbortSignal;
  allowMockFallback?: boolean;
};

export type ProviderStreamDelta = {
  type: "content" | "reasoning";
  delta: string;
};

export type ProviderStreamResult = {
  provider: string;
  model: string;
  fallbackUsed: boolean;
  fallbackReasonCode?: string;
  stream: AsyncIterable<ProviderStreamDelta>;
};

export interface ProviderAdapter {
  createChatStream(input: ProviderStreamInput): Promise<ProviderStreamResult>;
}

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const SAFE_DEFAULT_CHAT_MODEL = "gpt-4o-mini";

export class OpenAICompatibleAdapter implements ProviderAdapter {
  constructor(private readonly dependencies: {
    featureFlagService?: FeatureFlagService;
    environmentValidator?: EnvironmentValidator;
    fetcher?: typeof fetch;
  } = {}) {}

  async createChatStream(input: ProviderStreamInput): Promise<ProviderStreamResult> {
    const model = normalizeModel(input.model);
    const catalogModel = getCatalogModel(model);
    const provider = catalogModel?.provider_family ?? input.provider ?? "OpenAI";
    const baseUrl = getCompatibleBaseUrl(process.env.NEW_API_BASE_URL, DEFAULT_BASE_URL);
    const environmentValidator =
      this.dependencies.environmentValidator ?? new EnvironmentValidator();
    const environment = environmentValidator.getEnvironment();
    const runtime = environmentValidator.validate(environment).runtimeMode;
    const featureFlagService =
      this.dependencies.featureFlagService ?? new FeatureFlagService();
    const fallbackEnabled =
      input.allowMockFallback !== false &&
      (runtime !== "live" ||
        environment === "local" ||
        (await featureFlagService.isEnabled("agent.provider_mock_fallback_enabled", {
          userId: input.userId,
          workspaceId: input.workspaceId,
        })));

    const apiKey = input.apiKey?.replace(/[^\x20-\x7E]/g, "").trim() ?? "";

    if (!apiKey) {
      if (!fallbackEnabled) {
        throw new ApiError(
          "PROVIDER_NOT_CONFIGURED",
          "New API token is not configured for live runtime.",
          503,
        );
      }

      return {
        fallbackReasonCode: "PROVIDER_NOT_CONFIGURED",
        fallbackUsed: true,
        model,
        provider: "mock",
        stream: createMockTokenStream(input.payload, input.signal),
      };
    }

    try {
      const response = await this.openOpenAIResponse({
        ...input,
        apiKey,
        baseUrl,
        model: catalogModel?.new_api_model ?? model,
      });

      return {
        fallbackUsed: false,
        model,
        provider,
        stream: decodeOpenAIStream(response, input.signal),
      };
    } catch (error) {
      if (!fallbackEnabled) {
        throw sanitizeProviderError(error);
      }

      return {
        fallbackReasonCode:
          error instanceof ApiError ? error.code : "PROVIDER_REQUEST_FAILED",
        fallbackUsed: true,
        model,
        provider: "mock",
        stream: createMockTokenStream(input.payload, input.signal),
      };
    }
  }

  private async openOpenAIResponse(input: ProviderStreamInput) {
    const fetcher = this.dependencies.fetcher ?? fetch;
    const capability = getModelCapabilityProfile(input.model);
    const messages = injectTemporalAnchor([
      {
        content: buildSystemPrompt(input.payload),
        role: "system" as const,
      },
      ...input.payload.messages.map(mapAgentMessageForLlm),
    ]);

    if (capability?.apiFamily === "responses") {
      const body = buildOpenAIResponsesBody({
        messages,
        model: input.model,
        modelSettings: input.payload.modelSettings,
        reasoningEffort:
          input.payload.modelSettings?.reasoningEffort ?? input.payload.reasoningEffort,
      });

      const response = await fetcher(`${input.baseUrl}/responses`, {
        body: JSON.stringify(body),
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: input.signal,
      });

      if (!response.ok || !response.body) {
        throw new ApiError(
          response.status === 429 ? "PROVIDER_RATE_LIMITED" : "PROVIDER_TIMEOUT",
          `Provider request failed with status ${response.status}.`,
          response.status === 429 ? 429 : 504,
        );
      }

      return response;
    }

    const body = buildOpenAICompatibleChatBody({
      messages,
      model: input.model,
      modelSettings: input.payload.modelSettings,
      reasoningEffort:
        input.payload.modelSettings?.reasoningEffort ?? input.payload.reasoningEffort,
    });
    const response = await fetcher(`${input.baseUrl}/chat/completions`, {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: input.signal,
    });

    if (!response.ok || !response.body) {
      throw new ApiError(
        response.status === 429 ? "PROVIDER_RATE_LIMITED" : "PROVIDER_TIMEOUT",
        `Provider request failed with status ${response.status}.`,
        response.status === 429 ? 429 : 504,
      );
    }

    return response;
  }
}

export function getCompatibleBaseUrl(
  value: string | null | undefined,
  fallback = DEFAULT_BASE_URL,
) {
  const candidate = value?.replace(/[^\x20-\x7E]/g, "").trim() || fallback;

  try {
    const url = new URL(candidate);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return fallback;
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

export function getRuntimeString(value: unknown) {
  return typeof value === "string" ? value.replace(/[^\x20-\x7E]/g, "").trim() : "";
}

function normalizeModel(model: string) {
  const candidate = model.trim() || SAFE_DEFAULT_CHAT_MODEL;
  const known = SERVER_MODEL_CATALOG.some((entry) => entry.id === candidate);

  if (!known) {
    throw new ApiError("VALIDATION_FAILED", "Model is not registered in the server-side model catalog.", 400, {
      issues: [
        {
          code: "invalid_model",
          message: "Model is not registered in the server-side model catalog.",
          path: ["model"],
        },
      ],
    });
  }

  return candidate;
}

async function* createMockTokenStream(
  payload: AgentStreamRequest,
  signal: AbortSignal,
): AsyncIterable<ProviderStreamDelta> {
  for (const token of buildMockReply(payload).split(/(\s+)/)) {
    if (signal.aborted) {
      return;
    }

    yield { type: "content", delta: token };
    await wait(18);
  }
}

async function* decodeOpenAIStream(
  response: Response,
  signal?: AbortSignal,
): AsyncIterable<ProviderStreamDelta> {
  if (!response.body) {
    throw new ApiError("PROVIDER_TIMEOUT", "Provider returned an empty stream.", 504);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      if (signal?.aborted) {
        reader.cancel("aborted").catch(() => {});
        return;
      }

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
          delta?: string;
          type?: string;
        };
        const eventType = chunk.type;
        const reasoning =
          chunk.choices?.[0]?.delta?.reasoning_content ||
          (eventType === "response.reasoning_summary_text.delta" ||
          eventType === "response.reasoning_text.delta"
            ? chunk.delta
            : undefined);
        const token =
          chunk.choices?.[0]?.delta?.content ||
          (eventType === "response.output_text.delta" ? chunk.delta : undefined);

        if (reasoning) {
          yield { type: "reasoning", delta: reasoning };
        }
        if (token) {
          yield { type: "content", delta: token };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
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

function injectTemporalAnchor(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
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

function mapAgentMessageForLlm(message: AgentStreamRequest["messages"][number]) {
  if (message.role === "assistant") {
    return {
      content: message.content,
      role: "assistant" as const,
    };
  }

  if (message.role === "tool") {
    return {
      content: `[TOOL OUTPUT]\n${message.content}`,
      role: "user" as const,
    };
  }

  return {
    content: message.content,
    role: "user" as const,
  };
}

export function buildOpenAICompatibleChatBody({
  messages,
  model,
  reasoningEffort,
  modelSettings,
  stream = true,
  temperature,
}: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  model: string;
  modelSettings?: AgentStreamRequest["modelSettings"];
  reasoningEffort?: AgentStreamRequest["reasoningEffort"];
  stream?: boolean;
  temperature?: number;
}) {
  const capability = getModelCapabilityProfile(model);
  const thinking = capability?.thinking;
  const thinkingEnabled = Boolean(thinking?.supported && thinking.defaultEnabled);
  const body: Record<string, unknown> = {
    messages,
    model,
    stream,
  };

  if (thinkingEnabled) {
    if (thinking?.requestToggleParam === "thinking") {
      body.thinking = { type: "enabled" };
    }

    if (thinking?.requestReasoningEffortParam === "reasoning_effort") {
      body.reasoning_effort = mapReasoningEffortForModel(
        model,
        modelSettings?.reasoningEffort ?? reasoningEffort,
      );
    }

    return body;
  }

  if (capability?.supportsTemperature) {
    body.temperature =
      modelSettings?.temperature ?? temperature ?? capability.defaultTemperature ?? 0.65;
  }

  return body;
}

export function buildOpenAIResponsesBody({
  messages,
  model,
  modelSettings,
  reasoningEffort,
  stream = true,
}: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  model: string;
  modelSettings?: AgentStreamRequest["modelSettings"];
  reasoningEffort?: AgentStreamRequest["reasoningEffort"];
  stream?: boolean;
}) {
  const systemMessages = messages.filter((message) => message.role === "system");
  const inputMessages = messages.filter((message) => message.role !== "system");
  const capability = getModelCapabilityProfile(model);
  const body: Record<string, unknown> = {
    input: inputMessages.map((message) => ({
      content: message.content,
      role: message.role,
    })),
    instructions: systemMessages.map((message) => message.content).join("\n\n"),
    model,
    stream,
  };
  const effort = mapReasoningEffortForModel(
    model,
    modelSettings?.reasoningEffort ?? reasoningEffort,
  );
  const summary = mapReasoningDetailForModel(model, modelSettings?.reasoningDetail);

  if (effort || summary) {
    body.reasoning = {
      ...(effort ? { effort } : {}),
      ...(summary ? { summary } : {}),
    };
  }

  if (capability?.verbosity.supported) {
    body.text = {
      verbosity:
        modelSettings?.verbosity ??
        capability.verbosity.defaultVerbosity ??
        capability.verbosity.supportedVerbosity[0],
    };
  }

  return body;
}

function sanitizeProviderError(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError("PROVIDER_TIMEOUT", "Provider request failed.", 504);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
