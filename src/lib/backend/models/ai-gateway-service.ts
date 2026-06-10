import { resolveApiActor } from "@/lib/backend/api/api-auth";
import { ApiError, toApiError } from "@/lib/backend/api/api-errors";
import { getUserNewApiToken } from "@/lib/backend/new-api-token/user-new-api-token-service";
import type { AgentMessageRole } from "@/lib/nexus-types";

import {
  assertModelAllowedForPlan,
  assertRequestedFeaturesAllowed,
  getCatalogModel,
} from "./model-catalog";
import { callNewApiChatCompletion } from "./new-api-chat-service";
import {
  estimateModelPoints,
  getUserPlan,
  isModelAllowedByPlan,
} from "./plan-config";
import { assertMonthlyQuotaAvailable } from "./quota-gate";
import {
  createUsageLedgerRepository,
  type UsageLedgerRepository,
} from "./usage-ledger";

export type AiGatewayChatMessage = {
  role: Extract<AgentMessageRole, "system" | "user" | "assistant">;
  content: string;
};

export type AiGatewayChatBody = {
  conversationId?: string;
  messages?: AiGatewayChatMessage[];
  modelId?: string;
  operatorId?: string;
  requestedFeatures?: {
    longContext?: boolean;
    reasoning?: boolean;
    tools?: boolean;
    vision?: boolean;
  };
};

export type AiGatewayChatResult = {
  content: string;
  modelId: string;
  requestId: string;
  usage: {
    chargedPoints: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

export async function executeAiGatewayChatRequest(input: {
  body: AiGatewayChatBody;
  fetcher?: typeof fetch;
  ledger?: UsageLedgerRepository;
  request: Request;
  requestId: string;
}): Promise<AiGatewayChatResult> {
  const ledger = input.ledger ?? createUsageLedgerRepository();
  let userId: string | undefined;
  let operatorId: string | undefined;
  let conversationId: string | undefined;
  let modelId: string | undefined;

  try {
    const actor = await resolveApiActor(input.request, {
      declaredUserId: input.request.headers.get("X-User-Id"),
      required: true,
    });
    userId = requireString(actor.actorUserId, "authenticated user");
    operatorId = requireString(input.body.operatorId, "operatorId");
    conversationId =
      typeof input.body.conversationId === "string" && input.body.conversationId.trim()
        ? input.body.conversationId.trim()
        : undefined;
    modelId = requireString(input.body.modelId, "modelId");

    if (!Array.isArray(input.body.messages) || input.body.messages.length === 0) {
      throw new ApiError("VALIDATION_FAILED", "messages is required.", 400);
    }

    const plan = getUserPlan({ request: input.request, userId });
    const model = assertModelAllowedForPlan(modelId, plan);

    if (!isModelAllowedByPlan(model.id, plan)) {
      throw new ApiError(
        "PERMISSION_DENIED",
        "Requested model is not allowed for this plan.",
        403,
        {
          modelId: model.id,
          plan,
        },
      );
    }

    assertRequestedFeaturesAllowed({
      model,
      requestedFeatures: input.body.requestedFeatures,
    });
    await assertMonthlyQuotaAvailable({
      estimatedPoints: estimateModelPoints(
        model.id,
        estimateMessageTokens(input.body.messages),
      ),
      ledger,
      plan,
      userId,
    });

    const userNewApiToken = await getUserNewApiToken({ userId });
    const result = await callNewApiChatCompletion(
      {
        apiKey: userNewApiToken.token,
        messages: input.body.messages.map((message) => ({
          content: String(message.content ?? ""),
          role: message.role,
        })),
        modelId,
        signal: input.request.signal,
      },
      input.fetcher ? { fetcher: input.fetcher } : undefined,
    );
    const chargedPoints = estimateModelPoints(model.id, result.totalTokens);

    await ledger.insert({
      chargedPoints,
      conversationId,
      errorCode: null,
      inputTokens: result.inputTokens,
      modelId: model.id,
      newApiModel: model.new_api_model,
      operatorId,
      outputTokens: result.outputTokens,
      providerFamily: model.provider_family,
      requestId: input.requestId,
      sourceType: "operator_chat",
      status: "succeeded",
      totalTokens: result.totalTokens,
      userId,
    });

    return {
      content: result.content,
      modelId: model.id,
      requestId: input.requestId,
      usage: {
        chargedPoints,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.totalTokens,
      },
    };
  } catch (error) {
    const apiError = toApiError(error);

    if (userId && operatorId && modelId) {
      const model = getCatalogModel(modelId);

      await ledger.insert({
        chargedPoints: 0,
        conversationId,
        errorCode: apiError.code,
        inputTokens: 0,
        modelId,
        newApiModel: model?.new_api_model ?? modelId,
        operatorId,
        outputTokens: 0,
        providerFamily: model?.provider_family ?? "unknown",
        requestId: input.requestId,
        sourceType: "operator_chat",
        status: "failed",
        totalTokens: 0,
        userId,
      }).catch(() => undefined);
    }

    throw apiError;
  }
}

function requireString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError("VALIDATION_FAILED", `${label} is required.`, 400);
  }

  return value.trim();
}

function estimateMessageTokens(messages: AiGatewayChatMessage[]) {
  const characters = messages.reduce((total, message) => {
    return total + String(message.content ?? "").length + message.role.length;
  }, 0);

  return Math.max(1, Math.ceil(characters / 4));
}
