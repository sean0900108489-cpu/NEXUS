import type { AgentStreamRequest } from "@/lib/nexus-types";
import { buildMockReply } from "@/lib/mock-stream";
import { NEXUS_MODEL_CATALOG } from "@/lib/nexus-registry";

import { ApiError } from "../api/api-errors";
import { FeatureFlagService } from "../deployment/feature-flag-service";
import { EnvironmentValidator } from "../deployment/environment-validator";

export type ProviderStreamInput = {
  payload: AgentStreamRequest;
  apiKey?: string;
  baseUrl: string;
  provider?: string;
  model: string;
  workspaceId?: string;
  userId?: string;
  signal: AbortSignal;
};

export type ProviderStreamResult = {
  provider: string;
  model: string;
  fallbackUsed: boolean;
  fallbackReasonCode?: string;
  stream: AsyncIterable<string>;
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
    const baseUrl = getCompatibleBaseUrl(input.baseUrl);
    const provider = input.provider || "openai-compatible";
    const environmentValidator =
      this.dependencies.environmentValidator ?? new EnvironmentValidator();
    const environment = environmentValidator.getEnvironment();
    const runtime = environmentValidator.validate(environment).runtimeMode;
    const featureFlagService =
      this.dependencies.featureFlagService ?? new FeatureFlagService();
    const fallbackEnabled =
      runtime !== "live" ||
      environment === "local" ||
      (await featureFlagService.isEnabled("agent.provider_mock_fallback_enabled", {
        userId: input.userId,
        workspaceId: input.workspaceId,
      }));

    if (!input.apiKey) {
      if (!fallbackEnabled) {
        throw new ApiError(
          "PROVIDER_NOT_CONFIGURED",
          "Provider credentials are not configured for live runtime.",
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
        baseUrl,
        model,
      });

      return {
        fallbackUsed: false,
        model,
        provider,
        stream: decodeOpenAIStream(response),
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
    const messages = injectTemporalAnchor([
      {
        content: buildSystemPrompt(input.payload),
        role: "system" as const,
      },
      ...input.payload.messages.map(mapAgentMessageForLlm),
    ]);
    const response = await fetcher(`${input.baseUrl}/chat/completions`, {
      body: JSON.stringify({
        messages,
        model: input.model,
        stream: true,
        ...(supportsTemperature(input.model) ? { temperature: 0.65 } : {}),
      }),
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

export function getCompatibleBaseUrl(value: string | null | undefined) {
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

export function getRuntimeString(value: unknown) {
  return typeof value === "string" ? value.replace(/[^\x20-\x7E]/g, "").trim() : "";
}

function normalizeModel(model: string) {
  const candidate = model.trim() || SAFE_DEFAULT_CHAT_MODEL;
  const known = NEXUS_MODEL_CATALOG.some((entry) => entry.id === candidate);

  if (!known) {
    throw new ApiError("VALIDATION_FAILED", "Model is not registered in NEXUS_MODEL_CATALOG.", 400, {
      issues: [
        {
          code: "invalid_model",
          message: "Model is not registered in NEXUS_MODEL_CATALOG.",
          path: ["model"],
        },
      ],
    });
  }

  return candidate;
}

async function* createMockTokenStream(payload: AgentStreamRequest, signal: AbortSignal) {
  for (const token of buildMockReply(payload).split(/(\s+)/)) {
    if (signal.aborted) {
      return;
    }

    yield token;
    await wait(18);
  }
}

async function* decodeOpenAIStream(response: Response) {
  if (!response.body) {
    throw new ApiError("PROVIDER_TIMEOUT", "Provider returned an empty stream.", 504);
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
        yield token;
      }
    }
  }
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

function supportsTemperature(model: string) {
  const normalized = model.toLowerCase();

  return !normalized.startsWith("o") && !normalized.startsWith("gpt-5");
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
