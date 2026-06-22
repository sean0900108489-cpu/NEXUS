import type { AgentMessageRole } from "@/lib/nexus-types";
import type { ChatContentPart } from "@/features/composer-attachments/shared/build-multimodal-content-parts";

import { ApiError } from "../api/api-errors";

import { getCatalogModel } from "./model-catalog";

type ChatMessage = {
  role: Extract<AgentMessageRole, "system" | "user" | "assistant">;
  content: string | ChatContentPart[];
};

export type NewApiChatCompletionInput = {
  apiKey: string;
  messages: ChatMessage[];
  modelId: string;
  maxTokens?: number;
  signal?: AbortSignal;
};

export type NewApiChatCompletionResult = {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export async function callNewApiChatCompletion(
  input: NewApiChatCompletionInput,
  dependencies: {
    fetcher?: typeof fetch;
  } = {},
): Promise<NewApiChatCompletionResult> {
  const model = getCatalogModel(input.modelId);

  if (!model) {
    throw new ApiError("VALIDATION_FAILED", "Model id is not in the server-side catalog.", 400);
  }

  const apiKey = input.apiKey.replace(/[^\x20-\x7E]/g, "").trim();
  const baseUrl = normalizeNewApiBaseUrl(process.env.NEW_API_BASE_URL);

  if (!apiKey) {
    throw new ApiError("PROVIDER_NOT_CONFIGURED", "New API token is not configured.", 503);
  }

  // Build messages — pass content parts as-is for multimodal support
  const messages = input.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const fetcher = dependencies.fetcher ?? fetch;
  const response = await fetcher(`${baseUrl}/chat/completions`, {
    body: JSON.stringify({
      max_tokens: Math.min(
        input.maxTokens ?? model.default_max_tokens,
        model.max_output_tokens,
      ),
      messages,
      model: model.new_api_model,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: input.signal,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
    usage?: {
      completion_tokens?: number;
      prompt_tokens?: number;
      total_tokens?: number;
    };
  };

  if (!response.ok) {
    throw new ApiError(
      response.status === 429 ? "PROVIDER_RATE_LIMITED" : "PROVIDER_TIMEOUT",
      payload.error?.message ?? `New API request failed with status ${response.status}.`,
      response.status === 429 ? 429 : 504,
    );
  }

  return {
    content: payload.choices?.[0]?.message?.content ?? "",
    inputTokens: payload.usage?.prompt_tokens ?? 0,
    outputTokens: payload.usage?.completion_tokens ?? 0,
    totalTokens: payload.usage?.total_tokens ?? 0,
  };
}

export function normalizeNewApiBaseUrl(value: string | undefined) {
  const candidate = value?.replace(/[^\x20-\x7E]/g, "").trim() || "https://api.openai.com/v1";

  try {
    const url = new URL(candidate);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("invalid protocol");
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    throw new ApiError("PROVIDER_NOT_CONFIGURED", "NEW_API_BASE_URL is invalid.", 503);
  }
}
