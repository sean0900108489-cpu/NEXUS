import { blockLegacyToolRouteInProduction } from "@/lib/backend/security/legacy-tool-route-boundary";
import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { ApiError, getApiErrorDescriptor, toApiError } from "@/lib/backend/api/api-errors";
import {
  assertModelAllowedForPlan,
  getCatalogModel,
  type ProductModelCatalogEntry,
} from "@/lib/backend/models/model-catalog";
import {
  estimateModelPoints,
  getUserPlan,
  isModelAllowedByPlan,
} from "@/lib/backend/models/plan-config";
import { assertMonthlyQuotaAvailable } from "@/lib/backend/models/quota-gate";
import { createUsageLedgerRepository } from "@/lib/backend/models/usage-ledger";
import { getUserNewApiToken } from "@/lib/backend/new-api-token/user-new-api-token-service";
import { normalizePredictiveIntelSuggestions } from "@/lib/predictive-intel";
import {
  getModelCapabilityProfile,
  getProviderOption,
  mapReasoningEffortForModel,
} from "@/lib/nexus-registry";

export const runtime = "nodejs";
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
  const model = payload.model?.trim() || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const requestId =
    sanitizeHeaderValue(request.headers.get("x-request-id")) || crypto.randomUUID();
  const actor = await resolvePredictiveIntelActor(request);

  if (actor instanceof Response) {
    return actor;
  }

  const productGate = await assertPredictiveIntelProductGate({
    lastMessage,
    modelId: model,
    request,
    requestId,
    userId: actor.userId,
  }).catch((error) => toPredictiveIntelErrorResponse(error));

  if (productGate instanceof Response) {
    return productGate;
  }

  const userNewApiToken = await getPredictiveIntelNewApiToken({
    model: productGate.model,
    requestId,
    userId: actor.userId,
  }).catch((error) => toPredictiveIntelErrorResponse(error));

  if (userNewApiToken instanceof Response) {
    return userNewApiToken;
  }

  const providerId =
    sanitizeHeaderValue(request.headers.get("x-nexus-provider-id")) ||
    getModelCapabilityProfile(model)?.providerId ||
    "openai-compatible";
  const baseUrl = getCompatibleBaseUrl(
    process.env.NEW_API_BASE_URL ||
      process.env.OPENAI_BASE_URL,
    getProviderOption(providerId)?.defaultBaseUrl ?? DEFAULT_BASE_URL,
  );
  const body = buildPredictiveIntelBody(model, lastMessage);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userNewApiToken.token}`,
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
    const finalSuggestions =
      suggestions.length === 3 ? suggestions : [...FALLBACK_SUGGESTIONS];

    await recordPredictiveIntelUsage({
      chargedPoints:
        suggestions.length === 3
          ? estimateModelPoints(
              productGate.model.id,
              estimatePredictiveIntelTokens(lastMessage, finalSuggestions.join("\n")),
            )
          : 0,
      errorCode: null,
      model: productGate.model,
      requestId,
      status: "succeeded",
      userId: actor.userId,
    }).catch(() => undefined);

    return Response.json({
      mode: suggestions.length === 3 ? "openai" : "mock",
      suggestions: finalSuggestions,
    });
  } catch {
    await recordPredictiveIntelUsage({
      chargedPoints: 0,
      errorCode: "PROVIDER_TIMEOUT",
      model: productGate.model,
      requestId,
      status: "failed",
      userId: actor.userId,
    }).catch(() => undefined);

    return Response.json({ mode: "mock", suggestions: [...FALLBACK_SUGGESTIONS] });
  }
}

async function getPredictiveIntelNewApiToken({
  model,
  requestId,
  userId,
}: {
  model: ProductModelCatalogEntry;
  requestId: string;
  userId: string;
}) {
  try {
    return await getUserNewApiToken({ userId });
  } catch (error) {
    const apiError = toApiError(error);

    await recordPredictiveIntelUsage({
      chargedPoints: 0,
      errorCode: apiError.code,
      model,
      requestId,
      status: "failed",
      userId,
    }).catch(() => undefined);

    throw apiError;
  }
}

async function resolvePredictiveIntelActor(request: Request) {
  try {
    const { actorUserId } = await resolveApiActor(request, {
      declaredUserId: request.headers.get("x-user-id"),
      required: true,
    });

    if (!actorUserId) {
      throw new ApiError("AUTH_REQUIRED", "Authentication is required.", 401);
    }

    return {
      userId: actorUserId,
    };
  } catch (error) {
    return toPredictiveIntelErrorResponse(error);
  }
}

async function assertPredictiveIntelProductGate({
  lastMessage,
  modelId,
  request,
  requestId,
  userId,
}: {
  lastMessage: string;
  modelId: string;
  request: Request;
  requestId: string;
  userId: string;
}) {
  try {
    const plan = getUserPlan({ request, userId });
    const model = assertModelAllowedForPlan(modelId, plan);

    if (model.modality !== "chat") {
      throw new ApiError(
        "VALIDATION_FAILED",
        "Predictive intel requires a chat model.",
        400,
        { modelId },
      );
    }

    if (!isModelAllowedByPlan(model.id, plan)) {
      throw new ApiError(
        "PERMISSION_DENIED",
        "Requested model is not allowed for this plan.",
        403,
        { modelId: model.id, plan },
      );
    }

    await assertMonthlyQuotaAvailable({
      estimatedPoints: estimateModelPoints(
        model.id,
        estimatePredictiveIntelTokens(lastMessage, ""),
      ),
      ledger: createUsageLedgerRepository(),
      plan,
      userId,
    });

    return {
      model,
    };
  } catch (error) {
    const apiError = toApiError(error);
    const model = getCatalogModel(modelId);

    await recordPredictiveIntelUsage({
      chargedPoints: 0,
      errorCode: apiError.code,
      model,
      modelId,
      requestId,
      status: "failed",
      userId,
    }).catch(() => undefined);

    throw apiError;
  }
}

function toPredictiveIntelErrorResponse(error: unknown) {
  const apiError = toApiError(error);
  const descriptor = getApiErrorDescriptor(apiError.code);

  return Response.json(
    {
      error: {
        code: apiError.code,
        message: apiError.message || descriptor.message,
        retryable: descriptor.retryable,
      },
    },
    { status: apiError.statusCode },
  );
}

async function recordPredictiveIntelUsage({
  chargedPoints,
  errorCode,
  model,
  modelId,
  requestId,
  status,
  userId,
}: {
  chargedPoints: number;
  errorCode: string | null;
  model?: ProductModelCatalogEntry;
  modelId?: string;
  requestId: string;
  status: "failed" | "succeeded";
  userId: string;
}) {
  await createUsageLedgerRepository().insert({
    chargedPoints,
    conversationId: null,
    errorCode,
    inputTokens: 0,
    modelId: model?.id ?? modelId ?? "unknown-predictive-model",
    newApiModel: model?.new_api_model ?? modelId ?? "unknown-predictive-model",
    operatorId: "predictive-intel",
    outputTokens: 0,
    providerFamily: model?.provider_family ?? "unknown",
    requestId,
    sourceType: "predictive_intel",
    status,
    totalTokens: 0,
    userId,
  });
}

function estimatePredictiveIntelTokens(input: string, output: string) {
  return Math.max(1, Math.ceil(`${input}\n${output}`.length / 4));
}
