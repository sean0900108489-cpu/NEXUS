import {
  buildMockPredictiveIntelSuggestions,
  normalizePredictiveIntelSuggestions,
} from "@/lib/predictive-intel";

export const runtime = "edge";
export const maxDuration = 60;

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

type PredictiveIntelRequest = {
  model?: string;
  agent?: {
    callsign?: string;
    title?: string;
    mission?: string;
    capabilityType?: string;
  };
  lastAssistantMessage?: string;
};

function getBearerToken(header: string | null) {
  if (!header) {
    return "";
  }

  const [scheme, token] = header.split(/\s+/, 2);

  return scheme?.toLowerCase() === "bearer"
    ? token?.replace(/[^\x20-\x7E]/g, "").trim() ?? ""
    : "";
}

function getCompatibleBaseUrl(value: string | null | undefined) {
  const candidate = value?.trim() || DEFAULT_BASE_URL;

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

export async function POST(request: Request) {
  const payload = (await request.json()) as PredictiveIntelRequest;
  const fallback = buildMockPredictiveIntelSuggestions({
    agent: payload.agent,
    lastAssistantMessage: payload.lastAssistantMessage,
  });
  const apiKey = getBearerToken(request.headers.get("authorization"));

  if (!apiKey) {
    return Response.json({ mode: "mock", suggestions: fallback });
  }

  const baseUrl = getCompatibleBaseUrl(
    request.headers.get("x-openai-base-url") || process.env.OPENAI_BASE_URL,
  );
  const model = payload.model?.trim() || process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are a tactical UI assistant for NEXUS // AI OPS.\nBased on the last assistant message and current agent context, generate exactly 3 short, actionable follow-up questions or commands.\nReturn ONLY a valid JSON array of 3 strings.\nDo not include markdown.\nDo not include explanations.",
          },
          {
            role: "user",
            content: JSON.stringify({
              agent: payload.agent,
              currentTime: new Date().toISOString(),
              lastAssistantMessage: payload.lastAssistantMessage ?? "",
            }),
          },
        ],
      }),
      signal: request.signal,
    });

    if (!response.ok) {
      return Response.json({ mode: "mock", suggestions: fallback });
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const suggestions = parseSuggestions(content);

    return Response.json({
      mode: suggestions.length === 3 ? "openai" : "mock",
      suggestions: suggestions.length === 3 ? suggestions : fallback,
    });
  } catch {
    return Response.json({ mode: "mock", suggestions: fallback });
  }
}
