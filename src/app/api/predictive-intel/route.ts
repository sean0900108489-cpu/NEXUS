import { blockLegacyToolRouteInProduction } from "@/lib/backend/security/legacy-tool-route-boundary";
import { normalizePredictiveIntelSuggestions } from "@/lib/predictive-intel";
import {
  getModelCapabilityProfile,
  getProviderOption,
  mapReasoningEffortForModel,
} from "@/lib/nexus-registry";

export const runtime = "edge";
export const maxDuration = 60;

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const FALLBACK_SUGGESTIONS = [
  "Explain further.",
  "Summarize this.",
  "What are the next steps?",
] as const;
const SYSTEM_PROMPT =
  "You are a tactical UI assistant for NEXUS // AI OPS. Based on the last assistant message, generate exactly 3 short, actionable follow-up questions or commands. Return ONLY a valid JSON array of 3 strings. Do not include markdown, code blocks, or explanations.";

type PredictiveIntelRequest = {
  lastMessage?: string;
  model?: string;
  agent?: {
    callsign?: string;
    title?: string;
    mission?: string;
    capabilityType?: string;
  };
  lastAssistantMessage?: string;
};

function sanitizeHeaderValue(value: string | null | undefined) {
  return value?.replace(/[^\x20-\x7E]/g, "").trim() ?? "";
}

function getBearerToken(header: string | null) {
  if (!header) {
    return "";
  }

  const [scheme, token] = header.split(/\s+/, 2);

  return scheme?.toLowerCase() === "bearer"
    ? sanitizeHeaderValue(token)
    : "";
}

function getCompatibleBaseUrl(value: string | null | undefined, fallback = DEFAULT_BASE_URL) {
  const candidate = value?.trim() || fallback;

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

function parseSuggestions(content: string) {
  try {
    return normalizePredictiveIntelSuggestions(JSON.parse(content));
  } catch {
    const match = content.match(/\[[\s\S]*\]/);

    if (!match) {
      return [];
    }

    try {
      return normalizePredictiveIntelSuggestions(JSON.parse(match[0]));
    } catch {
      return [];
    }
  }
}

function buildPredictiveIntelBody(model: string, lastMessage: string) {
  const capability = getModelCapabilityProfile(model);
  const thinking = capability?.thinking;
  const thinkingEnabled = Boolean(thinking?.supported && thinking.defaultEnabled);
  const body: Record<string, unknown> = {
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: lastMessage,
      },
    ],
    model,
  };

  if (thinkingEnabled) {
    if (thinking?.requestToggleParam === "thinking") {
      body.thinking = { type: "enabled" };
    }

    if (thinking?.requestReasoningEffortParam === "reasoning_effort") {
      body.reasoning_effort = mapReasoningEffortForModel(model);
    }

    return body;
  }

  if (capability?.supportsTemperature) {
    body.temperature = 0.3;
  }

  return body;
}

export async function POST(request: Request) {
  const blocked = blockLegacyToolRouteInProduction();

  if (blocked) {
    return blocked;
  }

  let payload: PredictiveIntelRequest;

  try {
    payload = (await request.json()) as PredictiveIntelRequest;
  } catch {
    payload = {};
  }

  const lastMessage = (payload.lastMessage ?? payload.lastAssistantMessage ?? "").trim();
  const apiKey = getBearerToken(request.headers.get("authorization"));

  if (!apiKey) {
    return Response.json({ mode: "mock", suggestions: [...FALLBACK_SUGGESTIONS] });
  }

  const model = payload.model?.trim() || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const providerId =
    sanitizeHeaderValue(request.headers.get("x-nexus-provider-id")) ||
    getModelCapabilityProfile(model)?.providerId ||
    "openai-compatible";
  const baseUrl = getCompatibleBaseUrl(
    request.headers.get("x-nexus-base-url") ||
      request.headers.get("x-openai-base-url") ||
      process.env.OPENAI_BASE_URL,
    getProviderOption(providerId)?.defaultBaseUrl ?? DEFAULT_BASE_URL,
  );
  const body = buildPredictiveIntelBody(model, lastMessage);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: request.signal,
    });

    if (!response.ok) {
      return Response.json({ mode: "mock", suggestions: [...FALLBACK_SUGGESTIONS] });
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const suggestions = parseSuggestions(content);

    return Response.json({
      mode: suggestions.length === 3 ? "openai" : "mock",
      suggestions:
        suggestions.length === 3 ? suggestions : [...FALLBACK_SUGGESTIONS],
    });
  } catch {
    return Response.json({ mode: "mock", suggestions: [...FALLBACK_SUGGESTIONS] });
  }
}
